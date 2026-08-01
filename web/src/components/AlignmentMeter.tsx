"use client";

import {
  AXES,
  AXIS_COLOR,
  AXIS_LABEL,
  AXIS_TAGLINE,
  AXIS_METER_SCALE,
  type Alignment,
  type Axis,
} from "@/lib/factions";
import { motion } from "framer-motion";

type Props = {
  alignment: Alignment;
  variant?: "compact" | "full";
  className?: string;
};

export default function AlignmentMeter({
  alignment,
  variant = "compact",
  className = "",
}: Props) {
  const max = Math.max(AXIS_METER_SCALE, ...AXES.map((a) => alignment[a]));
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {AXES.map((ax) => {
          const v = alignment[ax];
          const pct = Math.min(100, (v / max) * 100);
          const c = AXIS_COLOR[ax];
          return (
            <div key={ax} className="flex flex-col min-w-[60px]" title={AXIS_TAGLINE[ax]}>
              <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.24em] uppercase">
                <span className={c.fg}>{AXIS_LABEL[ax].slice(0, 4)}</span>
                <span className="text-parchment tabular-nums">
                  {String(v).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-1 h-[3px] bg-line/70 relative overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`absolute inset-y-0 left-0 ${c.bg}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`grid gap-3 ${className}`}>
      {AXES.map((ax) => {
        const v = alignment[ax];
        const pct = Math.min(100, (v / max) * 100);
        const c = AXIS_COLOR[ax];
        return (
          <div key={ax}>
            <div className="flex items-baseline justify-between font-mono text-[10px] tracking-[0.28em] uppercase">
              <span className={c.fg}>{AXIS_LABEL[ax]}</span>
              <span className="text-parchment tabular-nums">
                {v} / {AXIS_METER_SCALE}
              </span>
            </div>
            <div className="mt-1.5 h-[6px] bg-line/70 relative overflow-hidden">
              <motion.div
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className={`absolute inset-y-0 left-0 ${c.bg}`}
              />
              <div
                className={`absolute inset-y-0 w-px bg-parchment/40`}
                style={{ left: `${(AXIS_METER_SCALE / max) * 100}%` }}
                aria-hidden
              />
            </div>
            <div className="mt-1 text-[11px] text-mute italic">
              {AXIS_TAGLINE[ax]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
