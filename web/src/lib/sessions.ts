// Per-character saved play session, persisted to localStorage.

import { ZERO_ALIGNMENT, type Alignment, type Axis } from "@/lib/factions";

export type Turn =
  | { kind: "scene"; chapter: string; setting: string }
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
  endingFired?: { axis: Axis; turn: number; resolvedAt: number };
  startedAt: number;
  updatedAt: number;
};

const KEY_PREFIX = "tb_session_v2_";
const INTRO_KEY = "tb_seen_intro_v1";

export function sessionKey(characterId: string) {
  return `${KEY_PREFIX}${characterId}`;
}

export function loadSession(characterId: string): SavedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(sessionKey(characterId));
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
  endingFired?: SavedSession["endingFired"]
) {
  if (typeof window === "undefined") return;
  const existing = loadSession(characterId);
  const session: SavedSession = {
    characterId,
    activeCharacterId,
    turns,
    alignment,
    endingFired: endingFired ?? existing?.endingFired,
    startedAt: existing?.startedAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(sessionKey(characterId), JSON.stringify(session));
}

export function deleteSession(characterId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(sessionKey(characterId));
}

export function listSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  const out: SavedSession[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k || !k.startsWith(KEY_PREFIX)) continue;
    const raw = window.localStorage.getItem(k);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as SavedSession;
      if (!parsed.alignment) parsed.alignment = { ...ZERO_ALIGNMENT };
      if (!parsed.activeCharacterId) parsed.activeCharacterId = parsed.characterId;
      out.push(parsed);
    } catch {
      // skip
    }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
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
  return window.localStorage.getItem(INTRO_KEY) === "1";
}

export function markIntroSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INTRO_KEY, "1");
}
