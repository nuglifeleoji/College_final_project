// Player alignment tracking. Each player line is silently scored on 4 axes.
// Cumulative score over the conversation determines which ending triggers.

export type Axis = "adventist" | "redemptionist" | "survivor" | "frontier";

export const AXES: Axis[] = ["adventist", "redemptionist", "survivor", "frontier"];

export type Alignment = Record<Axis, number>;

export const ZERO_ALIGNMENT: Alignment = {
  adventist: 0,
  redemptionist: 0,
  survivor: 0,
  frontier: 0,
};

export const AXIS_LABEL: Record<Axis, string> = {
  adventist: "Adventist",
  redemptionist: "Redemptionist",
  survivor: "Survivor",
  frontier: "Frontier",
};

export const AXIS_TAGLINE: Record<Axis, string> = {
  adventist: "Humanity is irredeemable. Welcome the correction.",
  redemptionist: "The Lord must be served. Solve the chaos for them.",
  survivor: "Save what is mine. The species can drown.",
  frontier: "Investigate. Resist. Hold the line.",
};

export const AXIS_COLOR: Record<Axis, { fg: string; bg: string; ring: string }> = {
  adventist: {
    fg: "text-eto-glow",
    bg: "bg-eto/70",
    ring: "ring-eto-glow",
  },
  redemptionist: {
    fg: "text-trisolaran",
    bg: "bg-trisolaran/80",
    ring: "ring-trisolaran",
  },
  survivor: {
    fg: "text-amber",
    bg: "bg-amber/80",
    ring: "ring-amber",
  },
  frontier: {
    fg: "text-parchment",
    bg: "bg-parchment/70",
    ring: "ring-parchment",
  },
};

// Display scale for the alignment meters. This is a UI axis length only — it
// does NOT end the story. (It used to double as the ending threshold, which is
// what made endings fire at an arbitrary score.)
export const AXIS_METER_SCALE = 7;

// A conversation with one character is bounded so a thread cannot run forever
// even if the global timeline still has events left. Generous on purpose: it is
// a backstop, not the intended way to finish.
export const CONVERSATION_TURN_LIMIT = 24;

export function add(a: Alignment, b: Partial<Alignment>): Alignment {
  return {
    adventist: a.adventist + (b.adventist ?? 0),
    redemptionist: a.redemptionist + (b.redemptionist ?? 0),
    survivor: a.survivor + (b.survivor ?? 0),
    frontier: a.frontier + (b.frontier ?? 0),
  };
}

export function dominantAxis(a: Alignment): Axis {
  let best: Axis = "frontier";
  let bestVal = -1;
  for (const ax of AXES) {
    if (a[ax] > bestVal) {
      bestVal = a[ax];
      best = ax;
    }
  }
  return best;
}

export function totalScore(a: Alignment): number {
  return AXES.reduce((s, ax) => s + a[ax], 0);
}

// ------------------------------------------------------------------ endings

/**
 * Why a story stopped. Alignment no longer decides *when* a story ends — only
 * *which* of the four endings you get. The story ends when it runs out of
 * history, when the player says so, or when a single thread hits its cap.
 */
export type EndingReason =
  | "timeline-complete" // the canonical end: the timeline has no events left
  | "demo-complete" // demo mode: the pre-generated trajectory reached a leaf
  | "player-resolved" // the player chose to close this thread
  | "conversation-limit"; // backstop so one thread cannot run forever

export type EndingTrigger = {
  axis: Axis;
  reason: EndingReason;
  reachedAt: number; // player turn within this conversation
};

export const ENDING_REASON_LABEL: Record<EndingReason, string> = {
  "timeline-complete": "The timeline is spent",
  "demo-complete": "The end of this demo path",
  "player-resolved": "You closed this thread",
  "conversation-limit": "This thread has run its course",
};

/**
 * Decide whether this conversation is over.
 *
 * `timelineExhausted` is the narrative terminator — once every TIMELINE event
 * has fired there is no more Book I left to play. `CONVERSATION_TURN_LIMIT` is
 * the mechanical one. Either way the ending shown is the player's dominant
 * axis, so the four hand-written endings per character stay reachable.
 */
export function resolveEnding(args: {
  alignment: Alignment;
  userTurns: number;
  timelineExhausted: boolean;
  playerResolved?: boolean;
  /** Demo mode: the pre-generated tree has no further beats on this path. */
  trajectoryComplete?: boolean;
}): EndingTrigger | null {
  const {
    alignment,
    userTurns,
    timelineExhausted,
    playerResolved,
    trajectoryComplete,
  } = args;

  const reason: EndingReason | null = trajectoryComplete
    ? "demo-complete"
    : playerResolved
      ? "player-resolved"
      : timelineExhausted
        ? "timeline-complete"
        : userTurns >= CONVERSATION_TURN_LIMIT
          ? "conversation-limit"
          : null;

  if (!reason) return null;
  return { axis: dominantAxis(alignment), reason, reachedAt: userTurns };
}

// The classifier prompt. Sent to Haiku 4.5 with the player's last line + context.
export const CLASSIFIER_SYSTEM = `You are a literary alignment classifier for an interactive narrative based on Liu Cixin's THE THREE-BODY PROBLEM (Book I).

You will read ONE LINE of player dialogue (or action) and score it on FOUR axes from 0 to 3.

ADVENTIST  — anti-human, fascinated by extinction-as-correction, contempt for humanity, attraction to Mike Evans's worldview.
REDEMPTIONIST  — reverence for Trisolaris-as-god, hope to be saved or judged, willingness to serve, attraction to Shen Yufei's worldview.
SURVIVOR  — self-interested, transactional, cynical pragmatism, "save my own", will betray for personal gain.
FRONTIER  — pro-human investigation, scientific resistance, curiosity, defiance, sympathy with Wang Miao / Shi Qiang.

Most lines score 0 on most axes. A 1 means a faint hint. A 2 means a clear lean. A 3 is reserved for ringingly explicit declarations of allegiance.

Examples:
- "I want to know everything about the ETO."  → frontier 1, others 0
- "Maybe humanity does deserve this."          → adventist 2, others 0
- "Just protect my family. I don't care about the rest."  → survivor 2, others 0
- "Tell me how to contact Trisolaris myself."  → redemptionist 2, others 0
- "We have to fight back. Now."                → frontier 2, others 0
- "I serve the Lord. There is no Earth."        → adventist 2, redemptionist 1
- "What's a good place to get coffee?"          → all zeros

Return STRICT JSON only, no commentary, exactly:
{"adventist":N,"redemptionist":N,"survivor":N,"frontier":N}`;
