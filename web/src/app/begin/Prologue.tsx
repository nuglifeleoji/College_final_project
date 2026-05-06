"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { markIntroSeen } from "@/lib/sessions";

type Beat =
  | { kind: "lore"; lines: string[]; sub?: string; hold: number }
  | { kind: "warning"; hold: number }
  | { kind: "tutorial"; hold: number }
  | { kind: "begin" };

const BEATS: Beat[] = [
  { kind: "lore", lines: ["Some signals", "do not begin.", "They are answered."], hold: 5200 },
  {
    kind: "lore",
    lines: ["1971."],
    sub: "Greater Khingan Range · Red Coast Base",
    hold: 4800,
  },
  {
    kind: "lore",
    lines: ["She found the dish.", "She found a way to send to the stars."],
    hold: 5800,
  },
  {
    kind: "lore",
    lines: [
      "Four lightyears away,",
      "a pacifist on a different world",
      "heard the signal — and wept.",
    ],
    hold: 6400,
  },
  { kind: "warning", hold: 6500 },
  { kind: "lore", lines: ["She answered."], hold: 4200 },
  {
    kind: "lore",
    lines: ["She told them where we live."],
    sub: "The fleet was launched within the year.",
    hold: 5600,
  },
  { kind: "tutorial", hold: 0 },
  { kind: "begin" },
];

export default function Prologue() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    markIntroSeen();
  }, []);

  // Advance through timed beats
  useEffect(() => {
    const beat = BEATS[idx];
    if (!beat || beat.kind === "tutorial" || beat.kind === "begin") return;
    const id = setTimeout(() => setIdx((i) => Math.min(i + 1, BEATS.length - 1)), beat.hold);
    return () => clearTimeout(id);
  }, [idx]);

  // Allow skipping any time
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") jumpToEnd();
      else if (e.key === "Enter" || e.key === " ") {
        const beat = BEATS[idx];
        if (beat?.kind === "begin") begin();
        else setIdx((i) => Math.min(i + 1, BEATS.length - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx]);

  const jumpToEnd = () => {
    setSkip(true);
    setIdx(BEATS.length - 1);
  };

  const begin = () => {
    router.push("/characters");
  };

  const beat = BEATS[idx];

  return (
    <div className="fixed inset-0 z-40 bg-void overflow-hidden">
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:
          "radial-gradient(900px 600px at 50% 40%, rgba(255,45,79,0.06), transparent 60%), radial-gradient(1400px 800px at 50% 110%, rgba(0,0,0,0.9), transparent 60%)",
      }} />
      <div className="absolute inset-0 scanlines opacity-25 pointer-events-none" />

      {/* Skip / progress */}
      <div className="absolute top-5 right-6 z-50 flex items-center gap-4">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
          {String(Math.min(idx + 1, BEATS.length)).padStart(2, "0")} / {String(BEATS.length).padStart(2, "0")}
        </div>
        <button
          onClick={jumpToEnd}
          className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute hover:text-eto-glow transition-colors"
        >
          Skip ✕
        </button>
      </div>

      {/* Beat surface */}
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {beat?.kind === "lore" && (
            <motion.div
              key={`lore-${idx}`}
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ duration: 1.2, ease: [0.22, 0.8, 0.36, 1] }}
              className="text-center max-w-4xl"
            >
              {beat.lines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.55, duration: 1.0 }}
                  className="font-display text-4xl md:text-6xl lg:text-7xl text-parchment leading-[1.05] tracking-tight"
                >
                  {line}
                </motion.div>
              ))}
              {beat.sub && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: beat.lines.length * 0.55 + 0.2, duration: 1.0 }}
                  className="mt-7 font-mono text-[11px] tracking-[0.36em] uppercase text-amber-soft"
                >
                  {beat.sub}
                </motion.div>
              )}
            </motion.div>
          )}

          {beat?.kind === "warning" && (
            <motion.div
              key="warning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-3xl"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.8 }}
                className="font-mono text-[10px] tracking-[0.36em] uppercase text-mute mb-6"
              >
                Intercept · 1379
              </motion.div>
              {[
                "Do not answer.",
                "Do not answer.",
                "Do not answer.",
              ].map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.85, duration: 0.7 }}
                  className="font-display italic text-5xl md:text-7xl text-eto-glow text-glow-eto leading-[1.1]"
                >
                  {line}
                </motion.div>
              ))}
            </motion.div>
          )}

          {beat?.kind === "tutorial" && (
            <motion.div
              key="tutorial"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className="w-full max-w-5xl"
            >
              <div className="text-center mb-10">
                <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-amber mb-3">
                  How to play
                </div>
                <h2 className="font-display text-4xl md:text-5xl text-parchment leading-tight">
                  You will speak. <span className="italic text-amber">They will answer.</span>
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {[
                  {
                    n: "I",
                    title: "Speak",
                    body: "Pick one of three offered lines, or type your own. Every turn changes how they see you.",
                  },
                  {
                    n: "II",
                    title: "Branch",
                    body: "Each character remembers what you said and responds in voice. Push them, soften them, change subjects — they will react.",
                  },
                  {
                    n: "III",
                    title: "Rewind",
                    body: "If a path leads somewhere you can't live with, walk back. Your decisions are saved; the past is editable.",
                  },
                ].map((c, i) => (
                  <motion.div
                    key={c.n}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.25, duration: 0.7 }}
                    className="border border-line bg-panel/60 backdrop-blur-md p-6"
                  >
                    <div className="font-display italic text-4xl text-eto-glow/70 mb-3">
                      {c.n}.
                    </div>
                    <div className="font-display text-2xl text-parchment mb-2">
                      {c.title}
                    </div>
                    <p className="text-parchment-dim text-sm leading-relaxed">{c.body}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.8 }}
                className="mt-10 text-center"
              >
                <button
                  onClick={() => setIdx((i) => i + 1)}
                  className="inline-flex items-center gap-3 px-7 py-4 bg-eto text-parchment font-mono text-xs tracking-[0.28em] uppercase hover:bg-eto-glow transition-colors shadow-[0_0_28px_rgba(200,16,46,0.35)]"
                >
                  Continue
                  <span aria-hidden>→</span>
                </button>
                <div className="mt-4 font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
                  Press Enter
                </div>
              </motion.div>
            </motion.div>
          )}

          {beat?.kind === "begin" && (
            <motion.div
              key="begin"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.4 }}
              className="text-center max-w-3xl"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 1.2 }}
                className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute mb-5"
              >
                You are the next pair of hands at the key.
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 1.0 }}
                className="font-display text-5xl md:text-7xl text-parchment leading-[1.05] tracking-tight"
              >
                Pick your seat <span className="italic text-eto-glow">in the dark forest.</span>
              </motion.h2>
              <motion.button
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6, duration: 0.8 }}
                onClick={begin}
                className="mt-12 inline-flex items-center gap-4 px-10 py-5 bg-eto text-parchment font-mono text-sm tracking-[0.36em] uppercase hover:bg-eto-glow transition-colors shadow-[0_0_40px_rgba(200,16,46,0.45)]"
              >
                <span className="w-2 h-2 rounded-full bg-parchment shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
                Begin
                <span aria-hidden>→</span>
              </motion.button>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.1, duration: 0.8 }}
                className="mt-4 font-mono text-[10px] tracking-[0.32em] uppercase text-mute"
              >
                Press Enter
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center font-mono text-[10px] tracking-[0.36em] uppercase text-mute/70">
        ESC to skip · Enter to advance{skip ? " · skipped" : ""}
      </div>
    </div>
  );
}
