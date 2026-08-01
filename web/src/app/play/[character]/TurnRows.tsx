"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CHARACTERS, getCharacter, type Character } from "@/lib/characters";
import type { Turn } from "@/lib/sessions";
import Typewriter from "@/components/Typewriter";

type Props = {
  turns: Turn[];
  loading: boolean;
  activeName: string;
  character: Character;
  onChoice: (text: string, fromChoices: string[]) => void;
};

export default function TurnRows({
  turns,
  loading,
  activeName,
  character,
  onChoice,
}: Props) {
  return (
    <AnimatePresence initial={false}>
      {turns.map((t, idx) => {
        if (t.kind === "scene") {
          return (
            <motion.div
              key={`scene-${idx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="border border-line bg-panel/40 backdrop-blur-sm p-5"
            >
              <div className="font-mono text-[10px] tracking-[0.36em] uppercase text-amber-soft">
                Scene · {t.chapter}
              </div>
              <p className="mt-2 text-parchment-dim font-display italic leading-relaxed">
                {t.setting}
              </p>
            </motion.div>
          );
        }
        if (t.kind === "timeline") {
          return (
            <motion.div
              key={`timeline-${idx}-${t.event.id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="border border-amber/50 bg-amber/5 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] tracking-[0.32em] uppercase">
                <span className="text-amber">
                  Forced timeline · Turn {t.event.triggeredAtTurn}
                </span>
                <span className="text-mute">
                  {t.event.date} · {t.event.axis}
                </span>
              </div>
              <div className="mt-2 font-display text-xl text-parchment">
                {t.event.title}
              </div>
              <p className="mt-2 text-parchment-dim leading-relaxed">
                {t.event.detail}
              </p>
            </motion.div>
          );
        }
        if (t.kind === "char") {
          const charDef =
            CHARACTERS.find((c) => c.id === t.characterId) ?? character;
          const isLast =
            idx === turns.length - 1 ||
            (idx === turns.length - 2 &&
              turns[turns.length - 1].kind === "choices");
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex items-start gap-4"
            >
              <div className={`shrink-0 w-12 h-12 border border-line bg-gradient-to-br ${charDef.portraitGradient} flex items-center justify-center font-display text-2xl text-parchment/80`}>
                {charDef.glyph}
              </div>
              <div className="flex-1">
                <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-amber/80">
                  {charDef.name} ·{" "}
                  <span className="text-mute italic normal-case tracking-normal">
                    {t.stage}
                  </span>
                </div>
                <div className="mt-2 font-display text-xl text-parchment leading-relaxed">
                  {isLast ? <Typewriter text={t.speech} speed={14} /> : t.speech}
                </div>
              </div>
            </motion.div>
          );
        }
        if (t.kind === "user") {
          return (
            <motion.div
              key={`u-${idx}`}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-4 flex-row-reverse"
            >
              <div className="shrink-0 w-12 h-12 border border-eto/60 bg-eto/10 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.24em] text-eto-glow">
                You
              </div>
              <div className="flex-1 max-w-[80%]">
                <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-eto-glow text-right">
                  Your line
                </div>
                <div className="mt-2 px-4 py-3 border border-eto/40 bg-eto/5 text-parchment text-right leading-relaxed">
                  {t.text}
                </div>
              </div>
            </motion.div>
          );
        }
        if (t.kind === "choices") {
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className={`grid grid-cols-1 gap-3 ${
                t.choices.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
              }`}
            >
              {t.choices.map((c) => (
                <button
                  key={c}
                  disabled={loading}
                  onClick={() => onChoice(c, t.choices)}
                  className="group text-left border border-line bg-panel/40 hover:border-eto/60 hover:bg-eto/5 transition-colors p-4 disabled:opacity-50"
                >
                  <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute group-hover:text-eto-glow">
                    Option
                  </div>
                  <div className="mt-2 font-display text-base text-parchment leading-snug">
                    {c}
                  </div>
                </button>
              ))}
            </motion.div>
          );
        }
        return null;
      })}
      {loading && (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-3 text-parchment-dim"
        >
          <span className="dot-pulse">
            <span />
            <span />
            <span />
          </span>
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-mute">
            {activeName} is composing a reply...
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
