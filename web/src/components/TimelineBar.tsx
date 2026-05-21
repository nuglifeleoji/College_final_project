"use client";

import { usePathname } from "next/navigation";
import {
  getNextTimelineEvent,
  TIMELINE_TURN_INTERVAL,
  turnsUntilNextTimelineEvent,
} from "@/lib/shared-memory";
import { useSharedMemory } from "@/lib/use-shared-memory";

const AXIS_COLOR: Record<string, string> = {
  earth: "text-amber",
  trisolaris: "text-trisolaran",
  eto: "text-eto-glow",
};

export default function TimelineBar() {
  const pathname = usePathname();
  const memory = useSharedMemory();

  if (pathname === "/begin") return null;

  const next = getNextTimelineEvent(memory);
  const last = memory.timelineEvents.at(-1) ?? null;
  const until = turnsUntilNextTimelineEvent(memory);
  const progress =
    ((memory.globalTurn % TIMELINE_TURN_INTERVAL) / TIMELINE_TURN_INTERVAL) *
    100;

  return (
    <div className="relative z-20 border-b border-line/70 bg-void/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-2.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] tracking-[0.28em] uppercase">
          <span className="text-mute">
            Timeline · Turn{" "}
            <span className="text-parchment tabular-nums">
              {String(memory.globalTurn).padStart(2, "0")}
            </span>
          </span>
          <span className="hidden sm:inline h-3 w-px bg-line" />
          {last ? (
            <span className={AXIS_COLOR[last.axis]}>
              Active event · {last.date} · {last.title}
            </span>
          ) : (
            <span className="text-parchment-dim">No forced event yet</span>
          )}
          <span className="hidden md:inline h-3 w-px bg-line" />
          {next ? (
            <span className="text-mute">
              Next in{" "}
              <span className="text-amber-soft tabular-nums">
                {until}
              </span>{" "}
              turn{until === 1 ? "" : "s"} · {next.date} · {next.title}
            </span>
          ) : (
            <span className="text-mute">Timeline complete</span>
          )}
        </div>
        <div className="mt-2 h-px bg-line/70 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-eto-glow via-amber to-trisolaran transition-[width] duration-500"
            style={{ width: `${next ? progress : 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
