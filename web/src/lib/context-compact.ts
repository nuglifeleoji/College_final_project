import { getCharacter } from "@/lib/characters";
import type { Turn } from "@/lib/sessions";

export const CONTEXT_COMPACT_INTERVAL = 5;
export const RECENT_CONTEXT_MESSAGES = 8;

export type ContextCompact = {
  compactedThroughTurn: number;
  summary: string;
  timestamp: number;
};

type SpeakerLine = {
  speaker: string;
  text: string;
  turn: number;
};

function truncate(text: string, max = 180) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

function collectLines(turns: Turn[]) {
  const lines: SpeakerLine[] = [];
  let userTurn = 0;

  for (const turn of turns) {
    if (turn.kind === "user") {
      userTurn++;
      lines.push({ speaker: "Player", text: turn.text, turn: userTurn });
    } else if (turn.kind === "char") {
      const char = getCharacter(turn.characterId);
      lines.push({
        speaker: char?.name ?? turn.characterId,
        text: turn.speech,
        turn: userTurn,
      });
    } else if (turn.kind === "timeline") {
      lines.push({
        speaker: "Timeline",
        text: `${turn.event.date} · ${turn.event.title}: ${turn.event.detail}`,
        turn: userTurn,
      });
    } else if (turn.kind === "scene") {
      lines.push({
        speaker: "Scene",
        text: `${turn.chapter}: ${turn.setting}`,
        turn: userTurn,
      });
    }
  }

  return lines;
}

export function userTurnCountFromTurns(turns: Turn[]) {
  return turns.filter((turn) => turn.kind === "user").length;
}

export function maybeCompactContext(
  turns: Turn[],
  existing?: ContextCompact
): ContextCompact | undefined {
  const userTurns = userTurnCountFromTurns(turns);
  if (userTurns === 0 || userTurns % CONTEXT_COMPACT_INTERVAL !== 0) {
    return existing;
  }
  if (existing?.compactedThroughTurn === userTurns) return existing;

  const lines = collectLines(turns)
    .filter((line) => line.turn <= userTurns)
    .slice(-18);
  const summary = lines
    .map((line) => `- Turn ${line.turn} · ${line.speaker}: ${truncate(line.text)}`)
    .join("\n");

  return {
    compactedThroughTurn: userTurns,
    summary:
      summary ||
      `Conversation reached turn ${userTurns}; no dialogue was available to summarize.`,
    timestamp: Date.now(),
  };
}

export function buildCompactPrompt(compact?: ContextCompact) {
  if (!compact) return "No compacted conversation context yet.";
  return `Auto-compacted conversation context. This was generated after player turn ${compact.compactedThroughTurn}; compacting does not count as a story turn. Use it as continuity, then rely on the recent visible messages for exact wording.

${compact.summary}`;
}

export function compactedMessages(turns: Turn[], compact?: ContextCompact) {
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  let userTurn = 0;

  for (const turn of turns) {
    if (turn.kind === "char") {
      if (!compact || userTurn >= compact.compactedThroughTurn) {
        messages.push({
          role: "assistant",
          content: JSON.stringify({
            speech: turn.speech,
            stage: turn.stage,
            choices: [],
            event: null,
          }),
        });
      }
    } else if (turn.kind === "user") {
      userTurn++;
      if (!compact || userTurn > compact.compactedThroughTurn) {
        messages.push({ role: "user", content: turn.text });
      }
    }
  }

  return messages.slice(-RECENT_CONTEXT_MESSAGES);
}
