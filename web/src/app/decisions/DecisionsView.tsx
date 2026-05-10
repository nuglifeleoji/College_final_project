"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadDecisions,
  rewindTo,
  clearDecisions,
  type Decision,
} from "@/lib/plot-tree";
import {
  listSessions,
  deleteSession,
  turnCount,
  lastCharLine,
  type SavedSession,
} from "@/lib/sessions";
import {
  clearSharedMemory,
  rewindSharedMemoryBefore,
} from "@/lib/shared-memory";
import { CHARACTERS, getCharacter } from "@/lib/characters";
import {
  AXIS_COLOR,
  AXIS_LABEL,
  AXES,
  ENDING_AXIS_THRESHOLD,
  dominantAxis,
} from "@/lib/factions";

function formatRelative(ts: number): string {
  const ago = Date.now() - ts;
  const min = Math.round(ago / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export default function DecisionsView() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  const refresh = () => {
    setDecisions(loadDecisions());
    setSessions(listSessions());
  };

  useEffect(() => {
    refresh();
  }, []);

  const onRewind = (id: string) => {
    if (typeof window === "undefined") return;
    const decision = decisions.find((d) => d.id === id);
    const ok = window.confirm(
      "Rewind to this point? Everything after this decision will be erased from the timeline. (Your characters' canonical knowledge stays the same.)"
    );
    if (!ok) return;
    rewindTo(id);
    if (decision) rewindSharedMemoryBefore(decision.timestamp);
    refresh();
  };

  const onClearDecisions = () => {
    if (!window.confirm("Erase the entire decision history?")) return;
    clearDecisions();
    clearSharedMemory();
    refresh();
  };

  const onDeleteSession = (cid: string, name: string) => {
    if (!window.confirm(`Delete your saved story with ${name}? This cannot be undone.`))
      return;
    deleteSession(cid);
    refresh();
  };

  return (
    <div className="relative">
      <section className="mx-auto max-w-7xl px-6 lg:px-10 pt-16 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-amber shadow-[0_0_10px_rgba(212,168,87,0.9)]" />
          <span className="font-mono text-[11px] tracking-[0.36em] uppercase text-amber">
            Archive · Your stories
          </span>
          <span className="hairline flex-1 max-w-[180px]" />
        </div>
        <h1 className="font-display text-5xl md:text-6xl text-parchment leading-tight">
          Every story you started.<br />
          <span className="italic text-eto-glow">Every path you didn&apos;t take.</span>
        </h1>
        <p className="mt-5 text-parchment-dim text-lg max-w-2xl">
          Your conversations are saved per character. Continue where you left
          off, read the whole thing as a finished story, or rewind any single
          decision to branch differently.
        </p>
      </section>

      {/* SAVED STORIES */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10 pb-14">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute">
              Stories in progress
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-parchment mt-2">
              {sessions.length === 0 ? "No story yet." : `${sessions.length} saved`}
            </h2>
          </div>
          <Link
            href="/characters"
            className="font-mono text-xs tracking-[0.28em] uppercase text-eto-glow hover:text-amber transition-colors"
          >
            + Begin a new story
          </Link>
        </div>

        {sessions.length === 0 ? (
          <SessionsEmpty />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {sessions.map((s) => {
              const c = getCharacter(s.characterId);
              if (!c) return null;
              const turns = turnCount(s);
              const last = lastCharLine(s);
              return (
                <article
                  key={s.characterId}
                  className="group relative border border-line bg-panel/40 backdrop-blur-sm overflow-hidden hover:border-eto/60 transition-colors"
                >
                  <div className="grid grid-cols-5 min-h-[220px]">
                    <div className="col-span-2 relative">
                      <div className={`absolute inset-0 bg-gradient-to-br ${c.portraitGradient} opacity-90`} />
                      <div className="absolute inset-0 scanlines opacity-50" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-panel/80" />
                      <div className="absolute -left-3 bottom-0 font-display text-[14rem] leading-[0.8] text-parchment/15 select-none">
                        {c.glyph}
                      </div>
                      <div className="relative p-4 flex flex-col h-full justify-between">
                        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-parchment/80">
                          {c.faction}
                        </div>
                        <div>
                          <div className="font-display italic text-amber-soft text-sm">
                            {c.nameOriginal}
                          </div>
                          <div className="font-display text-2xl text-parchment leading-tight">
                            {c.name}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-3 p-5 flex flex-col">
                      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.32em] uppercase">
                        <span className="text-amber">Turn {String(turns).padStart(2, "0")}</span>
                        <span className="text-mute">{formatRelative(s.updatedAt)}</span>
                      </div>

                      {s.endingFired ? (
                        <div className={`mt-2 font-mono text-[10px] tracking-[0.32em] uppercase ${AXIS_COLOR[s.endingFired.axis].fg}`}>
                          ● Ended · {AXIS_LABEL[s.endingFired.axis]}
                        </div>
                      ) : (
                        <div className={`mt-2 font-mono text-[10px] tracking-[0.32em] uppercase ${AXIS_COLOR[dominantAxis(s.alignment)].fg}`}>
                          Drift · {AXIS_LABEL[dominantAxis(s.alignment)]}
                        </div>
                      )}

                      <p className="mt-3 font-display italic text-base text-parchment-dim leading-snug line-clamp-3">
                        {last ? `"${last}"` : "(scene set, awaiting your line)"}
                      </p>

                      <div className="mt-3 grid grid-cols-4 gap-1.5">
                        {AXES.map((ax) => {
                          const v = s.alignment[ax];
                          const pct = Math.min(100, (v / ENDING_AXIS_THRESHOLD) * 100);
                          return (
                            <div key={ax} className="flex flex-col">
                              <div className={`font-mono text-[8px] tracking-[0.24em] uppercase ${AXIS_COLOR[ax].fg}`}>
                                {AXIS_LABEL[ax].slice(0, 3)}
                              </div>
                              <div className="mt-1 h-[3px] bg-line/70 relative overflow-hidden">
                                <div className={`absolute inset-y-0 left-0 ${AXIS_COLOR[ax].bg}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-auto pt-4 grid grid-cols-3 gap-2">
                        <Link
                          href={s.endingFired ? `/play/${c.id}/end?axis=${s.endingFired.axis}` : `/play/${c.id}`}
                          className="text-center px-2 py-2 bg-eto text-parchment font-mono text-[10px] tracking-[0.24em] uppercase hover:bg-eto-glow transition-colors"
                        >
                          {s.endingFired ? "▶ Replay" : "▶ Resume"}
                        </Link>
                        <Link
                          href={`/story/${c.id}`}
                          className="text-center px-2 py-2 border border-line text-parchment-dim hover:border-amber hover:text-amber font-mono text-[10px] tracking-[0.24em] uppercase transition-colors"
                        >
                          ▭ Read
                        </Link>
                        <button
                          onClick={() => onDeleteSession(c.id, c.name)}
                          className="px-2 py-2 border border-line text-mute hover:border-eto-glow hover:text-eto-glow font-mono text-[10px] tracking-[0.24em] uppercase transition-colors"
                        >
                          ✕ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* DECISIONS */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10 pb-24">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute">
              Branch log
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-parchment mt-2">
              The path you took. <span className="italic text-eto-glow">The paths you didn&apos;t.</span>
            </h2>
          </div>
          {decisions.length > 0 && (
            <button
              onClick={onClearDecisions}
              className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute hover:text-eto-glow transition-colors"
            >
              Erase log ✕
            </button>
          )}
        </div>

        {decisions.length === 0 ? (
          <DecisionsEmpty />
        ) : (
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 border border-line bg-panel/40 backdrop-blur-sm p-6">
              <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute mb-5">
                {decisions.length} decision{decisions.length === 1 ? "" : "s"} recorded
              </div>
              <ol className="space-y-4">
                {decisions.map((d, i) => {
                  const character = CHARACTERS.find((c) => c.id === d.characterId);
                  return (
                    <li key={d.id} className="relative">
                      {i > 0 && (
                        <div className="absolute left-[15px] -top-4 w-px h-4 bg-line" />
                      )}
                      <div className="flex gap-4">
                        <div className="shrink-0 w-8 h-8 rounded-full border border-eto/60 bg-eto/10 flex items-center justify-center font-mono text-[10px] text-eto-glow">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0 border border-line bg-void-2/60 p-4 hover:border-amber/40 transition-colors">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-amber-soft">
                              {character?.name ?? d.characterId} · {d.chapter}
                            </div>
                            <button
                              onClick={() => onRewind(d.id)}
                              className="font-mono text-[10px] tracking-[0.32em] uppercase text-eto-glow hover:text-amber transition-colors"
                            >
                              ⤺ Rewind here
                            </button>
                          </div>
                          <div className="mt-3 font-display text-lg text-parchment leading-snug">
                            &ldquo;{d.chosen}&rdquo;
                          </div>
                          {d.alternatives.length > 0 && (
                            <div className="mt-3 pl-4 border-l border-line space-y-1">
                              <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
                                Branches not taken
                              </div>
                              {d.alternatives.map((a, j) => (
                                <div
                                  key={j}
                                  className="text-parchment-dim text-sm italic line-through decoration-mute/40"
                                >
                                  {a}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <aside className="lg:col-span-5 space-y-5">
              <div className="border border-line bg-panel/40 p-6">
                <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute mb-3">
                  Per-character lines
                </div>
                <ul className="space-y-3">
                  {CHARACTERS.map((c) => {
                    const count = decisions.filter((d) => d.characterId === c.id).length;
                    return (
                      <li key={c.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 border border-line bg-gradient-to-br ${c.portraitGradient} flex items-center justify-center font-display text-base text-parchment/80`}>
                          {c.glyph}
                        </div>
                        <div className="flex-1">
                          <div className="font-display text-sm text-parchment">{c.name}</div>
                          <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-mute">
                            {c.faction}
                          </div>
                        </div>
                        <div className="font-mono text-2xl text-parchment tabular-nums">
                          {String(count).padStart(2, "0")}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="border border-amber/40 bg-amber/5 p-6">
                <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-amber mb-2">
                  Reading the rewind
                </div>
                <p className="text-parchment-dim leading-relaxed text-sm">
                  Rewinding does not erase the canon — it erases your turns.
                  Ye Wenjie still saw the dish, and the fleet is still on its
                  way. The thing that changes is what you said when she asked.
                </p>
              </div>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}

function SessionsEmpty() {
  return (
    <div className="border border-dashed border-line bg-panel/30 p-10 text-center">
      <h3 className="font-display text-2xl text-parchment">
        You haven&apos;t spoken to anyone yet.
      </h3>
      <p className="text-parchment-dim mt-2 max-w-lg mx-auto">
        Pick a character and take at least one turn — the system will save your
        conversation here automatically.
      </p>
      <Link
        href="/characters"
        className="mt-5 inline-flex items-center gap-3 px-6 py-3 bg-eto text-parchment font-mono text-xs tracking-[0.28em] uppercase hover:bg-eto-glow transition-colors"
      >
        Pick a character →
      </Link>
    </div>
  );
}

function DecisionsEmpty() {
  return (
    <div className="border border-dashed border-line/60 bg-panel/20 p-8 text-center">
      <p className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute">
        No decisions logged yet · the branch log will appear here once you start
        making choices.
      </p>
    </div>
  );
}
