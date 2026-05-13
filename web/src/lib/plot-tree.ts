// In-memory state for the player's path. The decision tree page reads this.
// Persisted to localStorage on the client.

import type { SessionSnapshot } from "@/lib/sessions";

export type Decision = {
  id: string;
  characterId: string;
  chapter: string;
  prompt: string;
  chosen: string;
  alternatives: string[];
  timestamp: number;
  snapshot?: SessionSnapshot;
};

export const STORAGE_KEY = "tb_decisions_v1";

export function loadDecisions(): Decision[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Decision[];
  } catch {
    return [];
  }
}

export function saveDecisions(decisions: Decision[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
}

export function appendDecision(d: Decision) {
  const all = loadDecisions();
  all.push(d);
  saveDecisions(all);
}

export function rewindTo(decisionId: string): Decision[] {
  const all = loadDecisions();
  const idx = all.findIndex((d) => d.id === decisionId);
  if (idx < 0) return all;
  const trimmed = all.slice(0, idx);
  saveDecisions(trimmed);
  return trimmed;
}

export function clearDecisions() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
