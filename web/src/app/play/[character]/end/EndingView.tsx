"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Character } from "@/lib/characters";
import { AXES, AXIS_COLOR, AXIS_LABEL, AXIS_TAGLINE, type Axis } from "@/lib/factions";

export default function EndingView({
  character,
}: {
  character: Character;
}) {
  const [axis, setAxis] = useState<Axis>("frontier");
  const ending = character.endings[axis];
  const c = AXIS_COLOR[axis];
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const axisParam = new URLSearchParams(window.location.search).get("axis");
    if ((AXES as readonly string[]).includes(axisParam ?? "")) {
      setAxis(axisParam as Axis);
    }
  }, []);

  useEffect(() => {
    setRevealed(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setRevealed(i);
      if (i >= ending.body.length + 2) clearInterval(id);
    }, 1100);
    return () => clearInterval(id);
  }, [axis, ending.body.length]);

  return (
    <div className="relative min-h-[100vh]">
      <div className={`absolute inset-0 bg-gradient-to-b ${character.portraitGradient} opacity-30`} />
      <div className="absolute inset-0 scanlines opacity-25 pointer-events-none" />

      <section className="relative mx-auto max-w-3xl px-6 lg:px-10 pt-20 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="text-center"
        >
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 border border-current ${c.fg} font-mono text-[10px] tracking-[0.36em] uppercase`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.bg}`} />
            Alignment · {AXIS_LABEL[axis]}
          </div>
          <div className="mt-4 font-mono text-[11px] tracking-[0.36em] uppercase text-mute">
            {character.openingScene.chapter} · The end of this path
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.2, delay: 0.4 }}
          className="mt-10 font-display text-5xl md:text-7xl text-parchment leading-[1.05] tracking-tight text-center"
        >
          {ending.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 1.2 }}
          className={`mt-6 font-mono text-[11px] tracking-[0.36em] uppercase ${c.fg} text-center`}
        >
          {ending.caption}
        </motion.p>

        <div className="mt-12 hairline mx-auto max-w-md" />

        <article className="mt-10 space-y-5 font-display text-xl text-parchment leading-[1.7]">
          {ending.body.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: revealed > i ? 1 : 0, y: revealed > i ? 0 : 8 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            >
              {p}
            </motion.p>
          ))}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: revealed > ending.body.length ? 1 : 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="pt-8 text-center"
          >
            <div className="hairline mx-auto max-w-xs mb-5" />
            <div className="font-mono text-[10px] tracking-[0.36em] uppercase text-mute italic">
              ⸻ {AXIS_TAGLINE[axis]} ⸻
            </div>
          </motion.div>
        </article>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: revealed > ending.body.length + 1 ? 1 : 0, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href={`/story/${character.id}`}
            className="px-6 py-3 bg-eto text-parchment font-mono text-xs tracking-[0.28em] uppercase hover:bg-eto-glow transition-colors"
          >
            ▭ Read the whole story
          </Link>
          <Link
            href="/decisions"
            className="px-6 py-3 border border-line text-parchment-dim hover:border-amber hover:text-amber font-mono text-xs tracking-[0.28em] uppercase transition-colors"
          >
            ⤺ Rewind a decision
          </Link>
          <Link
            href="/characters"
            className="px-6 py-3 border border-line text-parchment-dim hover:border-amber hover:text-amber font-mono text-xs tracking-[0.28em] uppercase transition-colors"
          >
            Try another seat
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
