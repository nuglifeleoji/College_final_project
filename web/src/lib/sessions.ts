// Per-character saved play session, persisted to localStorage.

import { ZERO_ALIGNMENT, type Alignment, type Axis } from "@/lib/factions";
import type { ContextCompact } from "@/lib/context-compact";
import type { ForcedTimelineEvent } from "@/lib/shared-memory";
import {
  DEFAULT_USER_ID,
  getCurrentUserId,
  legacyStorageKey,
  scopedStorageKey,
} from "@/lib/users";

export type Turn =
  | { kind: "scene"; chapter: string; setting: string }
  | { kind: "timeline"; event: ForcedTimelineEvent }
  | { kind: "char"; characterId: string; speech: string; stage: string; id: string }
  | { kind: "user"; text: string }
  | { kind: "choices"; choices: string[]; id: string }
  | { kind: "guest_enter"; characterId: string; reason: string }
  | { kind: "guest_exit"; characterId: string; reason: string };

export type SavedSession = {
  // The character that started this story (the canonical perspective).
  characterId: string;
  // The character currently speaking (may differ when a guest is on stage).
  activeCharacterId?: string;
  turns: Turn[];
  alignment: Alignment;
  contextCompact?: ContextCompact;
  endingFired?: { axis: Axis; turn: number; resolvedAt: number };
  startedAt: number;
  updatedAt: number;
};

export type SessionSnapshot = {
  characterId: string;
  activeCharacterId: string;
  turns: Turn[];
  alignment: Alignment;
  contextCompact?: ContextCompact;
};

const KEY_PREFIX = "tb_session_v2_";
const INTRO_KEY = "tb_seen_intro_v1";

function baseSessionKey(characterId: string) {
  return `${KEY_PREFIX}${characterId}`;
}

export function sessionKey(characterId: string) {
  return scopedStorageKey(baseSessionKey(characterId));
}

export function loadSession(characterId: string): SavedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(sessionKey(characterId)) ??
      (getCurrentUserId() === DEFAULT_USER_ID
        ? window.localStorage.getItem(legacyStorageKey(baseSessionKey(characterId)))
        : null);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedSession;
    // back-compat: ensure alignment exists
    if (!parsed.alignment) parsed.alignment = { ...ZERO_ALIGNMENT };
    if (!parsed.activeCharacterId) parsed.activeCharacterId = parsed.characterId;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(
  characterId: string,
  turns: Turn[],
  alignment: Alignment,
  activeCharacterId: string,
  contextCompact?: ContextCompact,
  endingFired?: SavedSession["endingFired"]
) {
  if (typeof window === "undefined") return;
  const existing = loadSession(characterId);
  const session: SavedSession = {
    characterId,
    activeCharacterId,
    turns,
    alignment,
    contextCompact: contextCompact ?? existing?.contextCompact,
    endingFired: endingFired ?? existing?.endingFired,
    startedAt: existing?.startedAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(sessionKey(characterId), JSON.stringify(session));
}

export function restoreSessionSnapshot(snapshot: SessionSnapshot) {
  if (typeof window === "undefined") return;
  const existing = loadSession(snapshot.characterId);
  const session: SavedSession = {
    characterId: snapshot.characterId,
    activeCharacterId: snapshot.activeCharacterId,
    turns: snapshot.turns,
    alignment: snapshot.alignment,
    contextCompact: snapshot.contextCompact,
    startedAt: existing?.startedAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(
    sessionKey(snapshot.characterId),
    JSON.stringify(session)
  );
}

export function deleteSession(characterId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(sessionKey(characterId));
  if (getCurrentUserId() === DEFAULT_USER_ID) {
    window.localStorage.removeItem(legacyStorageKey(baseSessionKey(characterId)));
  }
}

export function listSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  const byCharacter = new Map<string, SavedSession>();
  const currentId = getCurrentUserId();
  const scopedPrefix = scopedStorageKey(KEY_PREFIX, currentId);

  const collect = (raw: string | null, prefer = true) => {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as SavedSession;
      if (!parsed.alignment) parsed.alignment = { ...ZERO_ALIGNMENT };
      if (!parsed.activeCharacterId) parsed.activeCharacterId = parsed.characterId;
      if (prefer || !byCharacter.has(parsed.characterId)) {
        byCharacter.set(parsed.characterId, parsed);
      }
    } catch {
      // skip
    }
  };

  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k) continue;
    if (k.startsWith(scopedPrefix)) {
      collect(window.localStorage.getItem(k));
    } else if (currentId === DEFAULT_USER_ID && k.startsWith(KEY_PREFIX)) {
      collect(window.localStorage.getItem(k), false);
    }
  }

  return [...byCharacter.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function turnCount(s: SavedSession): number {
  return s.turns.filter((t) => t.kind === "user").length;
}

export function lastCharLine(s: SavedSession): string | null {
  for (let i = s.turns.length - 1; i >= 0; i--) {
    const t = s.turns[i];
    if (t.kind === "char") return t.speech;
  }
  return null;
}

export function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(scopedStorageKey(INTRO_KEY)) === "1" ||
    (getCurrentUserId() === DEFAULT_USER_ID &&
      window.localStorage.getItem(legacyStorageKey(INTRO_KEY)) === "1")
  );
}

export function markIntroSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(scopedStorageKey(INTRO_KEY), "1");
}
