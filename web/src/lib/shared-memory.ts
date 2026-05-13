import { TIMELINE, type TimelineEvent } from "@/lib/world-book";
import {
  CURRENT_USER_KEY,
  DEFAULT_USER_ID,
  USER_UPDATED_EVENT,
  getCurrentUserId,
  legacyStorageKey,
  scopedStorageKey,
} from "@/lib/users";

export const SHARED_MEMORY_KEY = "tb_shared_memory_v1";
export const SHARED_MEMORY_UPDATED_EVENT = "tb_shared_memory_updated";
export const TIMELINE_TURN_INTERVAL = 10;

const MAX_RECENT_ENTRIES = 48;
const MAX_PROMPT_ENTRIES = 18;
const MAX_PROMPT_EVENTS = 6;

export type MemorySpeaker = "player" | "character" | "system";

export type SharedMemoryEntry = {
  id: string;
  characterId: string;
  activeCharacterId: string;
  speaker: MemorySpeaker;
  text: string;
  timestamp: number;
  globalTurn: number;
};

export type ForcedTimelineEvent = TimelineEvent & {
  triggeredAtTurn: number;
  timestamp: number;
};

export type SharedMemoryState = {
  globalTurn: number;
  entries: SharedMemoryEntry[];
  timelineEvents: ForcedTimelineEvent[];
};

export type SharedMemorySnapshot = {
  globalTurn: number;
  interval: number;
  turnsUntilNextEvent: number | null;
  nextTimelineEvent: TimelineEvent | null;
  recentEntries: SharedMemoryEntry[];
  recentTimelineEvents: ForcedTimelineEvent[];
};

type RecordTurnArgs = {
  characterId: string;
  activeCharacterId: string;
  text: string;
};

type RecordCharacterArgs = RecordTurnArgs & {
  memory: SharedMemoryState;
  globalTurn: number;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function freshSharedMemory(): SharedMemoryState {
  return { globalTurn: 0, entries: [], timelineEvents: [] };
}

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeMemory(raw: Partial<SharedMemoryState>): SharedMemoryState {
  return {
    globalTurn:
      typeof raw.globalTurn === "number" && Number.isFinite(raw.globalTurn)
        ? Math.max(0, Math.floor(raw.globalTurn))
        : 0,
    entries: Array.isArray(raw.entries)
      ? raw.entries.slice(-MAX_RECENT_ENTRIES)
      : [],
    timelineEvents: Array.isArray(raw.timelineEvents)
      ? raw.timelineEvents
      : [],
  };
}

function emitUpdate() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(SHARED_MEMORY_UPDATED_EVENT));
}

function sharedMemoryStorageKey() {
  return scopedStorageKey(SHARED_MEMORY_KEY);
}

export function loadSharedMemory(): SharedMemoryState {
  if (!isBrowser()) return freshSharedMemory();
  try {
    const raw =
      window.localStorage.getItem(sharedMemoryStorageKey()) ??
      (getCurrentUserId() === DEFAULT_USER_ID
        ? window.localStorage.getItem(legacyStorageKey(SHARED_MEMORY_KEY))
        : null);
    if (!raw) return freshSharedMemory();
    return normalizeMemory(JSON.parse(raw) as Partial<SharedMemoryState>);
  } catch {
    return freshSharedMemory();
  }
}

export function saveSharedMemory(memory: SharedMemoryState): SharedMemoryState {
  const normalized = normalizeMemory(memory);
  if (!isBrowser()) return normalized;
  window.localStorage.setItem(sharedMemoryStorageKey(), JSON.stringify(normalized));
  emitUpdate();
  return normalized;
}

export function clearSharedMemory() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(sharedMemoryStorageKey());
  if (getCurrentUserId() === DEFAULT_USER_ID) {
    window.localStorage.removeItem(legacyStorageKey(SHARED_MEMORY_KEY));
  }
  emitUpdate();
}

export function subscribeSharedMemory(listener: () => void) {
  if (!isBrowser()) return () => {};
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === sharedMemoryStorageKey() ||
      event.key === legacyStorageKey(SHARED_MEMORY_KEY) ||
      event.key === CURRENT_USER_KEY
    ) {
      listener();
    }
  };
  window.addEventListener(SHARED_MEMORY_UPDATED_EVENT, listener);
  window.addEventListener(USER_UPDATED_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SHARED_MEMORY_UPDATED_EVENT, listener);
    window.removeEventListener(USER_UPDATED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

function maybeTriggerTimeline(globalTurn: number, existingEvents: number) {
  if (globalTurn % TIMELINE_TURN_INTERVAL !== 0) return null;
  const event = TIMELINE[existingEvents];
  if (!event) return null;
  return {
    ...event,
    triggeredAtTurn: globalTurn,
    timestamp: Date.now(),
  } satisfies ForcedTimelineEvent;
}

export function recordPlayerTurn({
  characterId,
  activeCharacterId,
  text,
}: RecordTurnArgs): {
  memory: SharedMemoryState;
  globalTurn: number;
  timestamp: number;
  forcedEvent: ForcedTimelineEvent | null;
} {
  const current = loadSharedMemory();
  const globalTurn = current.globalTurn + 1;
  const timestamp = Date.now();
  const forcedEvent = maybeTriggerTimeline(
    globalTurn,
    current.timelineEvents.length
  );
  const entries: SharedMemoryEntry[] = [
    ...current.entries,
    {
      id: uid(),
      characterId,
      activeCharacterId,
      speaker: "player",
      text,
      timestamp,
      globalTurn,
    },
  ];

  if (forcedEvent) {
    entries.push({
      id: uid(),
      characterId,
      activeCharacterId,
      speaker: "system",
      text: `Forced timeline event: ${forcedEvent.date} — ${forcedEvent.title}. ${forcedEvent.detail}`,
      timestamp: forcedEvent.timestamp,
      globalTurn,
    });
  }

  const memory = saveSharedMemory({
    globalTurn,
    entries,
    timelineEvents: forcedEvent
      ? [...current.timelineEvents, forcedEvent]
      : current.timelineEvents,
  });

  return { memory, globalTurn, timestamp, forcedEvent };
}

export function recordCharacterMemory({
  memory,
  characterId,
  activeCharacterId,
  text,
  globalTurn,
}: RecordCharacterArgs): SharedMemoryState {
  return saveSharedMemory({
    ...memory,
    entries: [
      ...memory.entries,
      {
        id: uid(),
        characterId,
        activeCharacterId,
        speaker: "character",
        text,
        timestamp: Date.now(),
        globalTurn,
      },
    ],
  });
}

export function rewindSharedMemoryBefore(timestamp: number): SharedMemoryState {
  const current = loadSharedMemory();
  const entries = current.entries.filter((entry) => entry.timestamp < timestamp);
  const globalTurn = entries.reduce(
    (best, entry) => Math.max(best, entry.globalTurn),
    0
  );
  const timelineEvents = current.timelineEvents.filter(
    (event) => event.timestamp < timestamp && event.triggeredAtTurn <= globalTurn
  );
  return saveSharedMemory({ globalTurn, entries, timelineEvents });
}

export function getNextTimelineEvent(memory: SharedMemoryState) {
  return TIMELINE[memory.timelineEvents.length] ?? null;
}

export function turnsUntilNextTimelineEvent(memory: SharedMemoryState) {
  if (!getNextTimelineEvent(memory)) return null;
  const remainder = memory.globalTurn % TIMELINE_TURN_INTERVAL;
  return remainder === 0
    ? TIMELINE_TURN_INTERVAL
    : TIMELINE_TURN_INTERVAL - remainder;
}

export function toSharedMemorySnapshot(
  memory: SharedMemoryState
): SharedMemorySnapshot {
  return {
    globalTurn: memory.globalTurn,
    interval: TIMELINE_TURN_INTERVAL,
    turnsUntilNextEvent: turnsUntilNextTimelineEvent(memory),
    nextTimelineEvent: getNextTimelineEvent(memory),
    recentEntries: memory.entries.slice(-MAX_PROMPT_ENTRIES),
    recentTimelineEvents: memory.timelineEvents.slice(-MAX_PROMPT_EVENTS),
  };
}

export function buildSharedMemoryPrompt(snapshot?: SharedMemorySnapshot) {
  if (!snapshot || snapshot.globalTurn === 0) {
    return "Shared cross-character memory: no player decisions have been recorded yet.";
  }

  const timeline = snapshot.recentTimelineEvents.length
    ? snapshot.recentTimelineEvents
        .map(
          (event) =>
            `- Turn ${event.triggeredAtTurn}: ${event.date} · ${event.title} — ${event.detail}`
        )
        .join("\n")
    : "- No forced timeline events have happened yet.";

  const entries = snapshot.recentEntries.length
    ? snapshot.recentEntries
        .map((entry) => {
          const who =
            entry.speaker === "player"
              ? "Player"
              : entry.speaker === "system"
                ? "Timeline"
                : entry.activeCharacterId;
          return `- Turn ${entry.globalTurn} · ${who} in ${entry.characterId}: ${entry.text}`;
        })
        .join("\n")
    : "- No recent conversation lines.";

  const next = snapshot.nextTimelineEvent
    ? `Next forced event in ${snapshot.turnsUntilNextEvent} turn(s): ${snapshot.nextTimelineEvent.date} · ${snapshot.nextTimelineEvent.title}.`
    : "No further forced timeline events are queued.";

  return `Shared cross-character memory. Treat this as private continuity all character personas know. Do not quote it mechanically, but let it affect what you know, suspect, and remember.

Global player turn: ${snapshot.globalTurn}
Forced event cadence: every ${snapshot.interval} player turns.
${next}

Forced timeline events already triggered:
${timeline}

Recent shared memory:
${entries}`;
}
