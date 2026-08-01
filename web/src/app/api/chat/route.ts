import Anthropic from "@anthropic-ai/sdk";
import { getCharacter } from "@/lib/characters";
import {
  TIMELINE,
  storyPositionLabel,
  worldEntriesKnownAt,
  type WorldEntry,
} from "@/lib/world-book";
import {
  AXES,
  CLASSIFIER_SYSTEM,
  ZERO_ALIGNMENT,
  type Alignment,
} from "@/lib/factions";
import {
  buildSharedMemoryPrompt,
  type ForcedTimelineEvent,
  type SharedMemorySnapshot,
} from "@/lib/shared-memory";
import { buildCompactPrompt, type ContextCompact } from "@/lib/context-compact";
import {
  applyChatRateLimit,
  rejectOversizedChatRequest,
  validateChatMessages,
  verifyDemoAccess,
} from "@/lib/chat-safety";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  // The player's chosen character (the perspective).
  characterId: string;
  // The currently active speaker (might be a guest).
  activeCharacterId?: string;
  messages: ChatMessage[];
  // Cross-character continuity stored by the browser.
  sharedMemory?: SharedMemorySnapshot;
  // Timeline events are forced by global player-turn cadence.
  forcedTimelineEvent?: ForcedTimelineEvent | null;
  // Auto-generated every 5 player turns; does not count as a turn.
  contextCompact?: ContextCompact;
  playerTurnCount?: number;
};

type CharacterReply = {
  speech: string;
  stage: string;
  choices: string[];
  alignmentDelta: Alignment;
};

const MAIN_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const CLASSIFIER_MODEL =
  process.env.ANTHROPIC_CLASSIFIER_MODEL ?? "claude-haiku-4-5-20251001";

/**
 * Ye Wenjie's arc is defined by how far into a conversation she is (a user
 * invariant). She used to read that off a raw turn counter in the prompt, but
 * exposing counters made characters talk about game mechanics. This hands her
 * the same signal as an unquotable label instead.
 */
function narrativeStage(playerTurnCount: number): string {
  if (playerTurnCount <= 4) return "opening";
  if (playerTurnCount <= 9) return "divergence";
  if (playerTurnCount <= 14) return "consequence";
  return "reckoning";
}

function buildWorldBookContext(entries: WorldEntry[]) {
  if (entries.length === 0) {
    return "No reference entries are available to this character yet. Rely only on your own memory and the scene in front of you.";
  }
  return entries
    .map((e) => `### ${e.title} (${e.category} · ${e.era})\n${e.body.join(" ")}`)
    .join("\n\n");
}

function safeJsonExtract(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : 0;
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(3, Math.round(v)));
}

function parseAlignmentJson(raw: string): Alignment {
  const obj = safeJsonExtract(raw);
  if (!obj) return { ...ZERO_ALIGNMENT };
  return {
    adventist: clampScore(obj.adventist),
    redemptionist: clampScore(obj.redemptionist),
    survivor: clampScore(obj.survivor),
    frontier: clampScore(obj.frontier),
  };
}

function parseCharacterReply(
  raw: string,
  fallback: { name: string; choices: string[] }
): {
  speech: string;
  stage: string;
  choices: string[];
} {
  const obj = safeJsonExtract(raw);
  if (
    !obj ||
    typeof obj.speech !== "string" ||
    typeof obj.stage !== "string" ||
    !Array.isArray(obj.choices)
  ) {
    return {
      speech: raw.slice(0, 600),
      stage: `${fallback.name} replies, but the signal is unclean.`,
      choices: fallback.choices,
    };
  }
  return {
    speech: obj.speech as string,
    stage: obj.stage as string,
    choices: (obj.choices as unknown[])
      .slice(0, 3)
      .map((c) => String(c)),
  };
}

function mockReply(
  name: string,
  lastUser: string,
  forcedEvent?: ForcedTimelineEvent | null
): CharacterReply {
  const forcedNote = forcedEvent
    ? ` A forced timeline event also fired: ${forcedEvent.date} — ${forcedEvent.title}.`
    : "";
  return {
    speech: `[${name}] You said: "${lastUser.slice(0, 60)}".${forcedNote} This is a mock reply because no ANTHROPIC_API_KEY is configured. Set it in .env.local and restart to talk to me for real.`,
    stage: `${name} watches you steadily, waiting for the credentials to come online.`,
    choices: [
      "Open .env.local and set ANTHROPIC_API_KEY",
      "Fall back to the World Book for now",
      "Restart the dev server",
    ],
    alignmentDelta: { ...ZERO_ALIGNMENT },
  };
}

export async function POST(req: Request) {
  const oversized = rejectOversizedChatRequest(req);
  if (oversized) return oversized;

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const perspective = getCharacter(body.characterId);
  if (!perspective) {
    return Response.json({ error: "unknown_character" }, { status: 404 });
  }

  // Active speaker may be a guest; default to the perspective itself.
  const activeId = body.activeCharacterId ?? perspective.id;
  const active = getCharacter(activeId) ?? perspective;

  const normalizedMessages: ChatMessage[] = (
    Array.isArray(body.messages) ? body.messages : []
  ).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content ?? ""),
  }));
  const invalidMessages = validateChatMessages(normalizedMessages);
  if (invalidMessages) return invalidMessages;

  const messages = normalizedMessages.slice(-20);
  const lastUser =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      mockReply(active.name, lastUser, body.forcedTimelineEvent)
    );
  }

  const accessError = verifyDemoAccess(req, Boolean(apiKey));
  if (accessError) return accessError;

  const rateLimitError = applyChatRateLimit(req);
  if (rateLimitError) return rateLimitError;

  const client = new Anthropic({ apiKey });

  // How far the story has actually advanced. Everything past this point is
  // withheld from the model, which is what keeps characters from spoiling or
  // contradicting the timeline.
  const firedCount = Math.max(
    0,
    Math.min(TIMELINE.length, body.sharedMemory?.triggeredCount ?? 0)
  );
  // A present-day character is never dragged back to 1967 just because the
  // global timeline has not advanced yet.
  const triggeredCount = Math.min(
    TIMELINE.length,
    Math.max(firedCount, active.timelineFloor)
  );
  const knownEntries = worldEntriesKnownAt(triggeredCount, active.baselineKnowledge);

  const systemBlocks = [
    // --- cached prefix: byte-stable per character, always a cache hit ---
    {
      type: "text" as const,
      text: active.systemPrompt,
      cache_control: { type: "ephemeral" as const },
    },
    // Still cached, but the text now grows as the timeline advances, so it
    // re-writes at most once per fired event (11 times over a full run) rather
    // than every turn. The block above it keeps hitting either way.
    {
      type: "text" as const,
      text:
        "You may rely on this in-universe reference when answering. Do not quote it back; integrate naturally. It has already been filtered to what you could plausibly know right now — if something is absent, you do not know it:\n\n" +
        buildWorldBookContext(knownEntries),
      cache_control: { type: "ephemeral" as const },
    },
    // --- volatile suffix: changes every turn, deliberately uncached ---
    {
      type: "text" as const,
      text: `STORY POSITION (this is "now"): ${storyPositionLabel(triggeredCount)}

Nothing after this point on the timeline has happened. You cannot know it, predict it, or imply it. If the player asserts a later event, treat it as an unverified claim and stay in character.

NARRATIVE STAGE: ${narrativeStage(body.playerTurnCount ?? 0)}
This is private staging for how far into this conversation you are. It shapes your tone and how much you concede. Never mention it, quantify it, or refer to turns.`,
    },
    {
      type: "text" as const,
      text: buildSharedMemoryPrompt(body.sharedMemory),
    },
    {
      type: "text" as const,
      text: buildCompactPrompt(body.contextCompact),
    },
    {
      type: "text" as const,
      // Turn counters used to be exposed here. They are game mechanics, not
      // in-world facts, and characters were repeating them back at the player.
      text: `Opening scene context: ${active.openingScene.setting}`,
    },
  ];

  if (body.forcedTimelineEvent) {
    systemBlocks.push({
      type: "text" as const,
      text: `A forced timeline event has just occurred on this player turn. You must let it affect this reply while staying in character. Event: ${body.forcedTimelineEvent.date} · ${body.forcedTimelineEvent.title}. ${body.forcedTimelineEvent.detail}`,
    });
  }

  // Seed an opening turn for empty conversations
  const seeded =
    messages.length === 0
      ? [
          {
            role: "assistant" as const,
            content: JSON.stringify({
              speech: active.openingScene.seedMessage,
              stage: `Opening · ${active.openingScene.chapter}`,
              choices: active.openingScene.starterChoices,
            }),
          },
          { role: "user" as const, content: "(begin)" },
        ]
      : messages;

  // Two parallel calls: main reply + alignment classifier on the player's last line
  const mainCall = client.messages.create({
    model: MAIN_MODEL,
    max_tokens: 800,
    system: systemBlocks,
    messages: seeded,
  });

  const classifierCall = lastUser
    ? client.messages.create({
        model: CLASSIFIER_MODEL,
        max_tokens: 80,
        system: CLASSIFIER_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Speaker on stage: ${active.name}\nPlayer line: "${lastUser}"\n\nReturn JSON only.`,
          },
        ],
      })
    : Promise.resolve(null);

  try {
    const [mainResult, classResult] = await Promise.all([
      mainCall,
      classifierCall,
    ]);

    const mainText =
      mainResult.content.find((b) => b.type === "text") &&
      "text" in (mainResult.content.find((b) => b.type === "text") as object)
        ? (mainResult.content.find((b) => b.type === "text") as {
            text: string;
          }).text
        : "";

    const parsed = parseCharacterReply(mainText, {
      name: active.name,
      choices: active.openingScene.starterChoices,
    });

    let alignmentDelta: Alignment = { ...ZERO_ALIGNMENT };
    if (classResult) {
      const classText =
        classResult.content.find((b) => b.type === "text") &&
        "text" in
          (classResult.content.find((b) => b.type === "text") as object)
          ? (classResult.content.find((b) => b.type === "text") as {
              text: string;
            }).text
          : "";
      alignmentDelta = parseAlignmentJson(classText);
    }

    const reply: CharacterReply = {
      speech: parsed.speech,
      stage: parsed.stage,
      choices: parsed.choices,
      alignmentDelta,
    };

    return Response.json(reply);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    return Response.json({
      speech: `[transmission failure] ${msg}`,
      stage: `${active.name} flickers out of frame for a moment.`,
      choices: ["Retry", "Open the World Book", "Pick a different character"],
      alignmentDelta: { ...ZERO_ALIGNMENT },
    } satisfies CharacterReply);
  }
}

// keep TS happy (axes import side-effect)
void AXES;
