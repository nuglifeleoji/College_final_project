"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CHARACTERS, getCharacter, type Character } from "@/lib/characters";
import { appendDecision } from "@/lib/plot-tree";
import {
  type Turn,
  loadSession,
  saveSession,
  deleteSession,
  turnCount,
  lastCharLine,
} from "@/lib/sessions";
import {
  ZERO_ALIGNMENT,
  add as addAlignment,
  checkEndingTrigger,
  type Alignment,
} from "@/lib/factions";
import Typewriter from "@/components/Typewriter";
import AlignmentMeter from "@/components/AlignmentMeter";

type CharacterEvent =
  | null
  | { type: "scene_shift"; chapter: string; setting: string }
  | { type: "guest_enter"; characterId: string; reason: string }
  | { type: "guest_exit"; reason: string };

type ApiReply = {
  speech: string;
  stage: string;
  choices: string[];
  event: CharacterEvent;
  alignmentDelta: Alignment;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function freshTurns(character: Character): Turn[] {
  return [
    {
      kind: "scene",
      chapter: character.openingScene.chapter,
      setting: character.openingScene.setting,
    },
    {
      kind: "char",
      characterId: character.id,
      speech: character.openingScene.seedMessage,
      stage: "Opening",
      id: uid(),
    },
    {
      kind: "choices",
      choices: character.openingScene.starterChoices,
      id: uid(),
    },
  ];
}

export default function PlaySurface({ character }: { character: Character }) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>(() => freshTurns(character));
  const [activeId, setActiveId] = useState<string>(character.id);
  const [alignment, setAlignment] = useState<Alignment>({ ...ZERO_ALIGNMENT });
  const [resumePrompt, setResumePrompt] = useState<{
    show: boolean;
    turnsCount: number;
    lastLine: string | null;
  }>({ show: false, turnsCount: 0, lastLine: null });
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [activeChoiceSet, setActiveChoiceSet] = useState<string[]>(
    character.openingScene.starterChoices
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const active = useMemo(() => getCharacter(activeId) ?? character, [activeId, character]);

  // Load session on mount
  useEffect(() => {
    const saved = loadSession(character.id);
    if (saved && saved.turns.length > 3) {
      // If the save already has an ending fired, jump to ending screen
      if (saved.endingFired) {
        router.replace(`/play/${character.id}/end?axis=${saved.endingFired.axis}`);
        return;
      }
      setResumePrompt({
        show: true,
        turnsCount: turnCount(saved),
        lastLine: lastCharLine(saved),
      });
    } else {
      setHydrated(true);
    }
  }, [character.id, router]);

  // Auto-save (only after a real user turn)
  useEffect(() => {
    if (!hydrated) return;
    const hasUserTurn = turns.some((t) => t.kind === "user");
    if (!hasUserTurn) return;
    saveSession(character.id, turns, alignment, activeId);
    setSavedAt(Date.now());
  }, [turns, alignment, activeId, character.id, hydrated]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns, loading]);

  const apiMessages = useMemo(() => {
    const msgs: { role: "user" | "assistant"; content: string }[] = [];
    for (const t of turns) {
      if (t.kind === "char") {
        msgs.push({
          role: "assistant",
          content: JSON.stringify({
            speech: t.speech,
            stage: t.stage,
            choices: [],
            event: null,
          }),
        });
      } else if (t.kind === "user") {
        msgs.push({ role: "user", content: t.text });
      }
    }
    return msgs;
  }, [turns]);

  const resumeWith = (resume: boolean) => {
    if (resume) {
      const saved = loadSession(character.id);
      if (saved) {
        setTurns(saved.turns);
        setAlignment(saved.alignment);
        setActiveId(saved.activeCharacterId ?? saved.characterId);
        const lastChoices = [...saved.turns]
          .reverse()
          .find((t) => t.kind === "choices");
        if (lastChoices && lastChoices.kind === "choices") {
          setActiveChoiceSet(lastChoices.choices);
        }
      }
    } else {
      deleteSession(character.id);
      setTurns(freshTurns(character));
      setAlignment({ ...ZERO_ALIGNMENT });
      setActiveId(character.id);
      setActiveChoiceSet(character.openingScene.starterChoices);
    }
    setResumePrompt({ show: false, turnsCount: 0, lastLine: null });
    setHydrated(true);
  };

  const send = async (text: string, fromChoices: string[]) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setDraft("");

    setTurns((prev) => [...prev.filter((t) => t.kind !== "choices"), { kind: "user", text }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          activeCharacterId: activeId,
          messages: [...apiMessages, { role: "user", content: text }],
        }),
      });
      const data = (await res.json()) as ApiReply;

      // Apply alignment first (so ending checks see the new totals)
      const nextAlignment = addAlignment(alignment, data.alignmentDelta ?? ZERO_ALIGNMENT);
      setAlignment(nextAlignment);

      // Build new turns. Order: any pre-event scene/guest banner, then char line, then choices.
      const newTurns: Turn[] = [];
      let nextActiveId = activeId;

      if (data.event?.type === "scene_shift") {
        newTurns.push({
          kind: "scene",
          chapter: data.event.chapter,
          setting: data.event.setting,
        });
      } else if (data.event?.type === "guest_enter") {
        const guest = getCharacter(data.event.characterId);
        if (guest && active.guests.includes(guest.id)) {
          newTurns.push({
            kind: "guest_enter",
            characterId: guest.id,
            reason: data.event.reason,
          });
          nextActiveId = guest.id;
        }
      } else if (data.event?.type === "guest_exit") {
        if (activeId !== character.id) {
          newTurns.push({
            kind: "guest_exit",
            characterId: activeId,
            reason: data.event.reason,
          });
          nextActiveId = character.id;
        }
      }

      newTurns.push({
        kind: "char",
        characterId: nextActiveId,
        speech: data.speech,
        stage: data.stage,
        id: uid(),
      });
      newTurns.push({ kind: "choices", choices: data.choices, id: uid() });

      setTurns((prev) => [...prev, ...newTurns]);
      setActiveChoiceSet(data.choices);
      setActiveId(nextActiveId);

      appendDecision({
        id: uid(),
        characterId: character.id,
        chapter: character.openingScene.chapter,
        prompt: "(your line)",
        chosen: text,
        alternatives: fromChoices.filter((c) => c !== text),
        timestamp: Date.now(),
      });

      // Ending check (only on the perspective character's saves)
      const userTurns = turns.filter((t) => t.kind === "user").length + 1; // +1 because we just added one
      const trigger = checkEndingTrigger(nextAlignment, userTurns);
      if (trigger) {
        const finalSession = loadSession(character.id);
        const finalTurns = finalSession ? finalSession.turns : turns;
        saveSession(
          character.id,
          [...finalTurns, ...newTurns, { kind: "user", text }],
          nextAlignment,
          nextActiveId,
          {
            axis: trigger.axis,
            turn: trigger.reachedAt,
            resolvedAt: Date.now(),
          }
        );
        // small delay so the typewriter has a chance to finish
        setTimeout(() => {
          router.push(`/play/${character.id}/end?axis=${trigger.axis}`);
        }, 1800);
      }
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        {
          kind: "char",
          characterId: activeId,
          speech:
            "[The signal drops. " +
            (err instanceof Error ? err.message : "Unknown error") +
            "]",
          stage: `${active.name} is gone from the frame.`,
          id: uid(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const userTurnCount = turns.filter((t) => t.kind === "user").length;
  const isGuestActive = activeId !== character.id;

  return (
    <div className="relative">
      {/* Resume modal */}
      <AnimatePresence>
        {resumePrompt.show && (
          <motion.div
            key="resume-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-void/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="border border-line bg-panel/90 max-w-xl w-full"
            >
              <div className="px-6 py-4 border-b border-line flex items-center justify-between font-mono text-[11px] tracking-[0.32em] uppercase">
                <span className="text-amber">Saved story · resume?</span>
                <span className="text-mute">{character.name}</span>
              </div>
              <div className="p-7">
                <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute mb-3">
                  Last said by {character.name}, turn {resumePrompt.turnsCount}
                </div>
                <p className="font-display italic text-xl text-parchment leading-snug">
                  &ldquo;{resumePrompt.lastLine?.slice(0, 240)}
                  {(resumePrompt.lastLine?.length ?? 0) > 240 ? "…" : ""}&rdquo;
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    onClick={() => resumeWith(true)}
                    className="flex-1 min-w-[140px] px-5 py-3 bg-eto text-parchment font-mono text-xs tracking-[0.28em] uppercase hover:bg-eto-glow transition-colors"
                  >
                    ▶ Resume story
                  </button>
                  <button
                    onClick={() => resumeWith(false)}
                    className="flex-1 min-w-[140px] px-5 py-3 border border-line text-parchment-dim hover:border-amber hover:text-amber font-mono text-xs tracking-[0.28em] uppercase transition-colors"
                  >
                    ⟲ Start over
                  </button>
                </div>
                <div className="mt-4 font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
                  Starting over erases this character&apos;s save.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header band */}
      <section className="relative border-b border-line/60">
        <div className={`absolute inset-0 bg-gradient-to-b ${active.portraitGradient} opacity-30`} />
        <div className="absolute inset-0 scanlines opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-10 py-10 grid grid-cols-12 gap-8 items-end">
          <div className="col-span-12 md:col-span-3 relative">
            <div className={`relative aspect-square w-44 md:w-52 border border-line overflow-hidden bg-gradient-to-br ${active.portraitGradient}`}>
              <div className="absolute inset-0 scanlines opacity-50" />
              <div className="absolute -right-4 -bottom-4 font-display text-[15rem] leading-none text-parchment/15 select-none">
                {active.glyph}
              </div>
              <div className="absolute top-2 left-2 font-mono text-[9px] tracking-[0.32em] uppercase text-parchment/80">
                {isGuestActive ? "Guest · " : "ID · "}{active.id}
              </div>
            </div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-amber/90">
              {active.faction}
              {isGuestActive && (
                <span className="ml-3 text-eto-glow">· {character.name}&apos;s story</span>
              )}
            </div>
            <h1 className="font-display text-4xl md:text-5xl text-parchment leading-tight mt-2">
              {active.name}
              <span className="ml-3 font-display italic text-amber-soft text-3xl md:text-4xl">
                {active.nameOriginal}
              </span>
            </h1>
            <div className="mt-2 font-mono text-[11px] tracking-[0.32em] uppercase text-mute">
              {active.role} · {active.era}
            </div>
            <div className="mt-5 hairline" />
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.24em] uppercase">
              <span className="text-eto-glow">{character.openingScene.chapter}</span>
              <span className="text-mute">
                Turn <span className="text-parchment tabular-nums">{String(userTurnCount).padStart(2, "0")}</span>
              </span>
              <span className={`flex items-center gap-1.5 ${savedAt ? "text-amber-soft" : "text-mute"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${savedAt ? "bg-amber shadow-[0_0_8px_rgba(212,168,87,0.9)]" : "bg-mute"}`} />
                {savedAt ? "Saved" : "Not saved"}
              </span>
              <Link href={`/story/${character.id}`} className="text-mute hover:text-amber transition-colors">
                ▭ Read as story
              </Link>
              <Link href="/decisions" className="text-mute hover:text-amber transition-colors">
                ⤺ Rewind
              </Link>
              <Link href="/characters" className="text-mute hover:text-amber transition-colors ml-auto">
                Switch character →
              </Link>
            </div>
            <div className="mt-5">
              <AlignmentMeter alignment={alignment} variant="compact" />
            </div>
          </div>
        </div>
      </section>

      {/* Conversation */}
      <section className="mx-auto max-w-4xl px-6 lg:px-10 py-12">
        <div ref={scrollerRef} className="space-y-7 max-h-[60vh] overflow-y-auto pr-3">
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
              if (t.kind === "guest_enter") {
                const g = getCharacter(t.characterId);
                if (!g) return null;
                return (
                  <motion.div
                    key={`ge-${idx}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="border border-eto/40 bg-eto/5 p-4 flex items-center gap-3"
                  >
                    <div className={`shrink-0 w-10 h-10 border border-line bg-gradient-to-br ${g.portraitGradient} flex items-center justify-center font-display text-xl text-parchment/80`}>
                      {g.glyph}
                    </div>
                    <div>
                      <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-eto-glow">
                        {g.name} enters
                      </div>
                      <div className="font-display italic text-parchment-dim text-sm">
                        {t.reason}
                      </div>
                    </div>
                  </motion.div>
                );
              }
              if (t.kind === "guest_exit") {
                const g = getCharacter(t.characterId);
                return (
                  <motion.div
                    key={`gx-${idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="border border-line/60 bg-panel/30 p-3 text-center font-display italic text-parchment-dim"
                  >
                    {g?.name ?? "They"} steps out · {t.reason}
                  </motion.div>
                );
              }
              if (t.kind === "char") {
                const charDef =
                  CHARACTERS.find((c) => c.id === t.characterId) ?? character;
                const isLast =
                  idx === turns.length - 1 ||
                  (idx === turns.length - 2 && turns[turns.length - 1].kind === "choices");
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
                        {charDef.name} · <span className="text-mute italic normal-case tracking-normal">{t.stage}</span>
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
                    className="grid grid-cols-1 md:grid-cols-3 gap-3"
                  >
                    {t.choices.map((c) => (
                      <button
                        key={c}
                        disabled={loading}
                        onClick={() => send(c, t.choices)}
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
                  {active.name} is composing a reply...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft, activeChoiceSet);
          }}
          className="mt-8 border border-line bg-panel/40 backdrop-blur-sm flex items-stretch"
        >
          <span className="px-4 py-4 font-mono text-[11px] tracking-[0.32em] uppercase text-eto-glow border-r border-line self-stretch flex items-center">
            Speak
          </span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Or write your own line..."
            className="flex-1 bg-transparent px-4 py-4 outline-none text-parchment placeholder:text-mute font-display text-lg"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !draft.trim()}
            className="px-6 font-mono text-xs tracking-[0.28em] uppercase bg-eto text-parchment hover:bg-eto-glow disabled:bg-line disabled:text-mute transition-colors"
          >
            Send →
          </button>
        </form>
      </section>
    </div>
  );
}
