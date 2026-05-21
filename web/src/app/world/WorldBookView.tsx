"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TIMELINE, WORLD_ENTRIES, type WorldEntry } from "@/lib/world-book";
import {
  TIMELINE_TURN_INTERVAL,
  turnsUntilNextTimelineEvent,
} from "@/lib/shared-memory";
import { useSharedMemory } from "@/lib/use-shared-memory";

const AXIS_LABEL: Record<string, string> = {
  earth: "Earth",
  trisolaris: "Trisolaris",
  eto: "ETO",
};

const AXIS_COLOR: Record<string, string> = {
  earth: "text-amber",
  trisolaris: "text-trisolaran",
  eto: "text-eto-glow",
};

const AXIS_DOT: Record<string, string> = {
  earth: "bg-amber shadow-[0_0_12px_rgba(212,168,87,0.9)]",
  trisolaris: "bg-trisolaran shadow-[0_0_12px_rgba(78,163,255,0.9)]",
  eto: "bg-eto-glow shadow-[0_0_12px_rgba(255,45,79,0.9)]",
};

export default function WorldBookView() {
  const [activeId, setActiveId] = useState<string>(WORLD_ENTRIES[0].id);
  const [filter, setFilter] = useState<string>("all");
  const memory = useSharedMemory();

  const filteredEntries = useMemo(() => {
    if (filter === "all") return WORLD_ENTRIES;
    return WORLD_ENTRIES.filter((e) => e.category === filter);
  }, [filter]);

  const active: WorldEntry | undefined =
    WORLD_ENTRIES.find((e) => e.id === activeId) ?? WORLD_ENTRIES[0];
  const activeTimelineIndex = memory.timelineEvents.length;
  const nextTimeline = TIMELINE[activeTimelineIndex] ?? null;
  const turnsUntilNext = turnsUntilNextTimelineEvent(memory);

  return (
    <div className="relative">
      <section className="mx-auto max-w-7xl px-6 lg:px-10 pt-16 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-trisolaran shadow-[0_0_10px_rgba(78,163,255,0.9)]" />
          <span className="font-mono text-[11px] tracking-[0.36em] uppercase text-trisolaran">
            Reference · World Book
          </span>
          <span className="hairline flex-1 max-w-[180px]" />
        </div>
        <h1 className="font-display text-5xl md:text-6xl text-parchment leading-tight">
          The book within the book.
        </h1>
        <p className="mt-5 text-parchment-dim text-lg max-w-2xl">
          Every concept the system pulls into a conversation lives here first.
          Browse the canon and the timeline; the characters draw on these
          entries when you speak with them.
        </p>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="border border-eto/50 bg-eto/10 p-4">
            <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-eto-glow">
              Goal
            </div>
            <div className="mt-2 font-display text-2xl text-parchment leading-tight">
              Stop the destruction of the human world.
            </div>
          </div>
          <div className="border border-line bg-panel/40 p-4">
            <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
              Turn clock
            </div>
            <div className="mt-2 font-mono text-3xl text-parchment tabular-nums">
              {String(memory.globalTurn).padStart(2, "0")}
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.28em] uppercase text-mute">
              Forced event every {TIMELINE_TURN_INTERVAL} turns
            </div>
          </div>
          <div className="border border-amber/40 bg-amber/5 p-4">
            <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-amber">
              Next timeline pressure
            </div>
            <div className="mt-2 font-display text-xl text-parchment leading-tight">
              {nextTimeline
                ? `${nextTimeline.date} · ${nextTimeline.title}`
                : "Timeline complete"}
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.28em] uppercase text-mute">
              {nextTimeline
                ? `${turnsUntilNext} turn${turnsUntilNext === 1 ? "" : "s"} remaining`
                : "No queued event"}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 lg:px-10 pb-24 grid lg:grid-cols-12 gap-8">
        {/* TIMELINE COL */}
        <aside className="lg:col-span-3 relative">
          <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute mb-4">
            Timeline · Book I
          </div>
          <ol className="relative border-l border-line pl-5 space-y-4">
            {TIMELINE.map((ev, index) => {
              const triggered = index < activeTimelineIndex;
              const current = index === activeTimelineIndex;
              return (
              <li
                key={ev.id}
                className={`relative border transition-colors ${
                  current
                    ? "border-amber/50 bg-amber/5 -ml-3 p-3"
                    : triggered
                      ? "border-transparent opacity-70"
                      : "border-transparent"
                }`}
              >
                <span
                  className={`absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full ${AXIS_DOT[ev.axis]}`}
                />
                <div className={`font-mono text-[10px] tracking-[0.32em] uppercase ${AXIS_COLOR[ev.axis]}`}>
                  {current
                    ? `Next in ${turnsUntilNext} turn${turnsUntilNext === 1 ? "" : "s"}`
                    : triggered
                      ? "Triggered"
                      : "Queued"} · {AXIS_LABEL[ev.axis]} · {ev.date}
                </div>
                <div className="font-display text-base text-parchment leading-snug mt-1">
                  {ev.title}
                </div>
                <p className="text-parchment-dim text-sm mt-1 leading-relaxed">
                  {ev.detail}
                </p>
              </li>
            );
            })}
          </ol>
        </aside>

        {/* INDEX COL */}
        <aside className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute">
              Index
            </span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-transparent border border-line text-parchment-dim font-mono text-[10px] tracking-[0.24em] uppercase px-2 py-1 outline-none hover:border-amber/60"
            >
              <option value="all">all</option>
              <option value="Faction">faction</option>
              <option value="Phenomenon">phenomenon</option>
              <option value="Place">place</option>
              <option value="Concept">concept</option>
              <option value="Object">object</option>
            </select>
          </div>
          <ul className="space-y-1.5">
            {filteredEntries.map((e) => {
              const on = e.id === activeId;
              return (
                <li key={e.id}>
                  <button
                    onClick={() => setActiveId(e.id)}
                    className={`group w-full text-left px-3 py-2.5 border transition-colors ${
                      on
                        ? "border-eto/60 bg-eto/10"
                        : "border-line hover:border-amber/50 bg-panel/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-display text-base text-parchment">
                        {e.title}
                      </div>
                      <div className={`font-mono text-[9px] tracking-[0.24em] uppercase ${
                        on ? "text-eto-glow" : "text-mute"
                      }`}>
                        {e.category}
                      </div>
                    </div>
                    <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-mute mt-0.5">
                      {e.era}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* DETAIL COL */}
        <article className="lg:col-span-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="border border-line bg-panel/40 backdrop-blur-sm"
            >
              <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                <div className="font-mono text-[11px] tracking-[0.32em] uppercase text-amber">
                  {active.category} · {active.era}
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
                  Entry · <span className="text-eto-glow">{active.id}</span>
                </div>
              </div>
              <div className="p-7">
                <h2 className="font-display text-4xl md:text-5xl text-parchment leading-tight">
                  {active.title}
                </h2>
                <p className="mt-3 font-display italic text-xl text-amber-soft leading-snug">
                  {active.summary}
                </p>
                <div className="mt-6 hairline" />
                <div className="mt-6 space-y-4 text-parchment leading-relaxed text-[17px]">
                  {active.body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                {active.related && active.related.length > 0 && (
                  <div className="mt-8">
                    <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute mb-3">
                      See also
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {active.related.map((rid) => {
                        const r = WORLD_ENTRIES.find((x) => x.id === rid);
                        if (!r) return null;
                        return (
                          <button
                            key={rid}
                            onClick={() => setActiveId(rid)}
                            className="px-3 py-1.5 border border-line hover:border-eto/60 hover:bg-eto/5 font-mono text-[10px] tracking-[0.24em] uppercase text-parchment-dim hover:text-parchment transition-colors"
                          >
                            ↗ {r.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </article>
      </section>
    </div>
  );
}
