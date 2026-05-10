import Anthropic from "@anthropic-ai/sdk";
import { getCharacter } from "@/lib/characters";
import { WORLD_ENTRIES } from "@/lib/world-book";
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

type CharacterEvent =
  | null
  | { type: "scene_shift"; chapter: string; setting: string }
  | { type: "guest_enter"; characterId: string; reason: string }
  | { type: "guest_exit"; reason: string };

type CharacterReply = {
  speech: string;
  stage: string;
  choices: string[];
  event: CharacterEvent;
  alignmentDelta: Alignment;
};

const MAIN_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const CLASSIFIER_MODEL =
  process.env.ANTHROPIC_CLASSIFIER_MODEL ?? "claude-haiku-4-5-20251001";

function buildWorldBookContext() {
  return WORLD_ENTRIES.map(
    (e) => `### ${e.title} (${e.category} · ${e.era})\n${e.body.join(" ")}`
  ).join("\n\n");
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
  event: CharacterEvent;
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
      event: null,
    };
  }
  // Validate event
  let event: CharacterEvent = null;
  if (obj.event && typeof obj.event === "object") {
    const e = obj.event as Record<string, unknown>;
    if (
      e.type === "scene_shift" &&
      typeof e.chapter === "string" &&
      typeof e.setting === "string"
    ) {
      event = { type: "scene_shift", chapter: e.chapter, setting: e.setting };
    } else if (
      e.type === "guest_enter" &&
      typeof e.characterId === "string" &&
      typeof e.reason === "string"
    ) {
      event = {
        type: "guest_enter",
        characterId: e.characterId,
        reason: e.reason,
      };
    } else if (e.type === "guest_exit" && typeof e.reason === "string") {
      event = { type: "guest_exit", reason: e.reason };
    }
  }
  return {
    speech: obj.speech as string,
    stage: obj.stage as string,
    choices: (obj.choices as unknown[])
      .slice(0, 3)
      .map((c) => String(c)),
    event,
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
    event: null,
    alignmentDelta: { ...ZERO_ALIGNMENT },
  };
}

export async function POST(req: Request) {
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

  const messages = (body.messages ?? []).slice(-20).map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const lastUser =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      mockReply(active.name, lastUser, body.forcedTimelineEvent)
    );
  }

  const client = new Anthropic({ apiKey });

  const systemBlocks = [
    {
      type: "text" as const,
      text: active.systemPrompt,
      cache_control: { type: "ephemeral" as const },
    },
    {
      type: "text" as const,
      text:
        "You may rely on this in-universe reference when answering. Do not quote it back; integrate naturally:\n\n" +
        buildWorldBookContext(),
      cache_control: { type: "ephemeral" as const },
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
      text: `Opening scene context: ${active.openingScene.setting}

Turn state:
- Global player turn: ${body.sharedMemory?.globalTurn ?? "unknown"}
- This character conversation turn: ${body.playerTurnCount ?? "unknown"}
- A context compaction occurs every 5 player turns and is not itself a story turn.`,
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
              event: null,
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

    // Validate event references against the active character's allow-lists
    if (parsed.event?.type === "guest_enter") {
      if (!active.guests.includes(parsed.event.characterId)) {
        parsed.event = null;
      }
    }
    if (parsed.event?.type === "scene_shift") {
      // We let scene_shift through even if the slug isn't in the allow-list;
      // the UI just displays the supplied chapter/setting text.
    }

    const reply: CharacterReply = {
      speech: parsed.speech,
      stage: parsed.stage,
      choices: parsed.choices,
      event: parsed.event,
      alignmentDelta,
    };

    return Response.json(reply);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    return Response.json({
      speech: `[transmission failure] ${msg}`,
      stage: `${active.name} flickers out of frame for a moment.`,
      choices: ["Retry", "Open the World Book", "Pick a different character"],
      event: null,
      alignmentDelta: { ...ZERO_ALIGNMENT },
    } satisfies CharacterReply);
  }
}

// keep TS happy (axes import side-effect)
void AXES;
