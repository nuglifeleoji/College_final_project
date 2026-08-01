"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { History, UsersRound } from "lucide-react";
import { getCharacter, type Character } from "@/lib/characters";
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
  resolveEnding,
  type Alignment,
  type Axis,
} from "@/lib/factions";
import { isTimelineExhausted } from "@/lib/world-book";
import { getTrajectory, nodeAt } from "@/lib/trajectories";
import {
  compactedMessages,
  maybeCompactContext,
  type ContextCompact,
} from "@/lib/context-compact";
import {
  recordCharacterMemory,
  recordPlayerTurn,
  toSharedMemorySnapshot,
  type ForcedTimelineEvent,
} from "@/lib/shared-memory";
import AlignmentMeter from "@/components/AlignmentMeter";
import DemoAccessCode, {
  demoAccessHeaders,
  emitDemoAccessError,
} from "@/components/DemoAccessCode";
import TurnRows from "./TurnRows";
import StoryProgressPanel from "./StoryProgressPanel";

type ApiReply = {
  speech: string;
  stage: string;
  choices: string[];
  alignmentDelta: Alignment;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function openingChoicesFor(character: Character): string[] {
  // In demo mode the opening must offer exactly the two branches the
  // pre-generated tree actually has.
  const trajectory = getTrajectory(character.id);
  return trajectory
    ? trajectory.opening.choices.map((c) => c.text)
    : character.openingScene.starterChoices;
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
      choices: openingChoicesFor(character),
      id: uid(),
    },
  ];
}

function timelineTurn(event: ForcedTimelineEvent): Turn {
  return { kind: "timeline", event };
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
  const [activeChoiceSet, setActiveChoiceSet] = useState<string[]>(() =>
    openingChoicesFor(character)
  );
  // Demo mode only: which branch of the pre-generated tree we are on.
  const trajectory = useMemo(() => getTrajectory(character.id), [character.id]);
  const [path, setPath] = useState("");
  const [contextCompact, setContextCompact] = useState<
    ContextCompact | undefined
  >(undefined);
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
    saveSession(character.id, turns, alignment, activeId, contextCompact, undefined, path);
    setSavedAt(Date.now());
  }, [turns, alignment, activeId, character.id, contextCompact, hydrated]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns, loading]);

  const apiMessages = useMemo(() => {
    return compactedMessages(turns, contextCompact);
  }, [turns, contextCompact]);

  const resumeWith = (resume: boolean) => {
    if (resume) {
      const saved = loadSession(character.id);
      if (saved) {
        setTurns(saved.turns);
        setAlignment(saved.alignment);
        setContextCompact(saved.contextCompact);
        setPath(saved.demoPath ?? "");
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
      setContextCompact(undefined);
      setPath("");
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

    const sharedTurn = recordPlayerTurn({
      characterId: character.id,
      activeCharacterId: activeId,
      text,
    });
    const preReplyTurns: Turn[] = [
      ...turns.filter((t) => t.kind !== "choices"),
      { kind: "user", text },
      ...(sharedTurn.forcedEvent ? [timelineTurn(sharedTurn.forcedEvent)] : []),
    ];
    setTurns(preReplyTurns);

    try {
      let data: ApiReply;
      let nextPath = path;
      let reachedEnd = false;
      let bakedEndingAxis: Axis | undefined;

      if (trajectory) {
        // --- demo mode: read the next beat out of the pre-generated tree ---
        const current = nodeAt(trajectory, path);
        const index = Math.max(0, fromChoices.indexOf(text));
        nextPath = path + String(index);
        const next = nodeAt(trajectory, nextPath);
        if (!current || !next) {
          throw new Error("This branch is not part of the demo trajectory.");
        }
        data = {
          speech: next.speech,
          stage: next.stage,
          choices: next.choices.map((c) => c.text),
          // The score belongs to the choice the player just made, which is
          // recorded on the node they made it from.
          alignmentDelta:
            current.choices[index]?.alignmentDelta ?? ZERO_ALIGNMENT,
        };
        reachedEnd = next.final === true;
        // The tree decides which ending a path resolves to, so the spread
        // across the 32 paths stays even (7/7/9/9) instead of collapsing.
        bakedEndingAxis = next.endingAxis;
        setPath(nextPath);
      } else {
        data = await fetchLiveReply();
      }

      async function fetchLiveReply(): Promise<ApiReply> {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...demoAccessHeaders(),
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          characterId: character.id,
          activeCharacterId: activeId,
          messages: [...apiMessages, { role: "user", content: text }],
          sharedMemory: toSharedMemorySnapshot(sharedTurn.memory),
          forcedTimelineEvent: sharedTurn.forcedEvent,
          contextCompact,
          playerTurnCount: preReplyTurns.filter((t) => t.kind === "user").length,
        }),
      });
      const raw = (await res.json()) as Partial<ApiReply> & {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        if (
          raw.error === "demo_access_required" ||
          raw.error === "demo_access_not_configured"
        ) {
          emitDemoAccessError(raw.message ?? "Demo access is required.");
        }
        throw new Error(raw.message ?? raw.error ?? `Request failed with ${res.status}`);
      }
      if (
        typeof raw.speech !== "string" ||
        typeof raw.stage !== "string" ||
        !Array.isArray(raw.choices)
      ) {
        throw new Error("Malformed character reply");
      }
        return {
          speech: raw.speech,
          stage: raw.stage,
          choices: raw.choices,
          alignmentDelta: raw.alignmentDelta ?? ZERO_ALIGNMENT,
        };
      }

      // Apply alignment first (so ending checks see the new totals)
      const nextAlignment = addAlignment(alignment, data.alignmentDelta ?? ZERO_ALIGNMENT);
      setAlignment(nextAlignment);

      // Build new turns. Character scene/guest events are disabled; forced timeline
      // events are inserted before the reply via sharedTurn.forcedEvent.
      const newTurns: Turn[] = [];
      let nextActiveId = activeId;

      newTurns.push({
        kind: "char",
        characterId: nextActiveId,
        speech: data.speech,
        stage: data.stage,
        id: uid(),
      });
      newTurns.push({ kind: "choices", choices: data.choices, id: uid() });

      const fullTurns = [...preReplyTurns, ...newTurns];
      const nextCompact = maybeCompactContext(fullTurns, contextCompact);
      setTurns(fullTurns);
      setContextCompact(nextCompact);
      setActiveChoiceSet(data.choices);
      setActiveId(nextActiveId);
      recordCharacterMemory({
        memory: sharedTurn.memory,
        characterId: character.id,
        activeCharacterId: nextActiveId,
        text: data.speech,
        globalTurn: sharedTurn.globalTurn,
      });

      appendDecision({
        id: uid(),
        characterId: character.id,
        chapter: character.openingScene.chapter,
        prompt: "(your line)",
        chosen: text,
        alternatives: fromChoices.filter((c) => c !== text),
        timestamp: sharedTurn.timestamp,
        snapshot: {
          characterId: character.id,
          activeCharacterId: activeId,
          turns,
          alignment,
          contextCompact,
        },
      });

      // Ending check. Alignment no longer decides *when* the story ends — it
      // only selects which of the four endings you get. The story ends when
      // the timeline runs out of Book I, or when this thread hits its cap.
      const userTurns = preReplyTurns.filter((t) => t.kind === "user").length;
      const trigger = resolveEnding({
        alignment: nextAlignment,
        userTurns,
        timelineExhausted: isTimelineExhausted(
          sharedTurn.memory.timelineEvents.length
        ),
        trajectoryComplete: reachedEnd,
      });
      if (trigger) {
        const endingAxis = bakedEndingAxis ?? trigger.axis;
        saveSession(
          character.id,
          fullTurns,
          nextAlignment,
          nextActiveId,
          nextCompact,
          {
            axis: endingAxis,
            reason: trigger.reason,
            turn: trigger.reachedAt,
            resolvedAt: Date.now(),
          },
          nextPath
        );
        // small delay so the typewriter has a chance to finish
        setTimeout(() => {
          router.push(`/play/${character.id}/end?axis=${endingAxis}`);
        }, 1800);
      }
    } catch (err) {
      setTurns([
        ...preReplyTurns,
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
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] tracking-[0.24em] uppercase">
              <span className="text-eto-glow">{character.openingScene.chapter}</span>
              <span className="text-mute">
                Turn <span className="text-parchment tabular-nums">{String(userTurnCount).padStart(2, "0")}</span>
              </span>
              <span className={`flex items-center gap-1.5 ${savedAt ? "text-amber-soft" : "text-mute"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${savedAt ? "bg-amber shadow-[0_0_8px_rgba(212,168,87,0.9)]" : "bg-mute"}`} />
                {savedAt ? "Saved" : "Not saved"}
              </span>
              {contextCompact && (
                <span className="text-mute">
                  Context compacted · turn{" "}
                  <span className="text-parchment tabular-nums">
                    {String(contextCompact.compactedThroughTurn).padStart(2, "0")}
                  </span>
                </span>
              )}
              <Link href={`/story/${character.id}`} className="text-mute hover:text-amber transition-colors">
                ▭ Read as story
              </Link>
              <Link
                href="/decisions"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-line text-mute hover:border-amber/60 hover:text-amber transition-colors"
              >
                <History size={14} strokeWidth={1.8} aria-hidden />
                Rewind
              </Link>
              <Link
                href="/characters"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-eto/60 text-eto-glow hover:border-eto-glow hover:bg-eto/10 transition-colors md:ml-auto"
              >
                <UsersRound size={14} strokeWidth={1.8} aria-hidden />
                Switch
              </Link>
            </div>
            <div className="mt-5">
              <AlignmentMeter alignment={alignment} variant="compact" />
            </div>
          </div>
        </div>
      </section>

      {/* Conversation */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10 py-12 grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
        <div className="min-w-0">
          <div ref={scrollerRef} className="space-y-7 max-h-[60vh] overflow-y-auto pr-3">
            <TurnRows
              turns={turns}
              loading={loading}
              activeName={active.name}
              character={character}
              onChoice={send}
            />
          </div>

          {trajectory ? (
            /* Demo mode: every reply is pre-written, so free text has nowhere
               to go. Say so plainly rather than leaving a dead input. */
            <div className="mt-8 border border-amber/40 bg-amber/5 backdrop-blur-sm p-5">
              <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-amber">
                Demo version
              </div>
              <p className="mt-2 text-sm leading-relaxed text-parchment-dim">
                This is a fixed demo. Every line {character.name} speaks was
                written ahead of time, so you can only follow the branches
                offered above — {2 ** trajectory.depth} paths through this
                scene, ending after {trajectory.depth + 1} beats. Free
                conversation and the full cast are part of the complete
                version.{" "}
                <a
                  href="mailto:cpwei@stanford.edu?subject=Three-Body%20—%20full%20version"
                  className="text-eto-glow underline underline-offset-2 hover:text-amber"
                >
                  Get in touch for access
                </a>
                .
              </p>
            </div>
          ) : (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(draft, activeChoiceSet);
                }}
                className="mt-8 border border-line bg-panel/40 backdrop-blur-sm flex flex-col sm:flex-row sm:items-stretch overflow-hidden"
              >
                <span className="px-4 py-3 sm:py-4 font-mono text-[11px] tracking-[0.32em] uppercase text-eto-glow border-b sm:border-b-0 sm:border-r border-line self-stretch flex items-center">
                  Speak
                </span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Or write your own line..."
                  className="min-w-0 flex-1 bg-transparent px-4 py-4 outline-none text-parchment placeholder:text-mute font-display text-lg"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !draft.trim()}
                  className="px-6 py-4 sm:py-0 font-mono text-xs tracking-[0.28em] uppercase bg-eto text-parchment hover:bg-eto-glow disabled:bg-line disabled:text-mute transition-colors"
                >
                  Send →
                </button>
              </form>
              <DemoAccessCode disabled={loading} />
            </>
          )}
        </div>

        <StoryProgressPanel
          turns={turns}
          alignment={alignment}
          activeCharacter={active}
          storyCharacter={character}
          contextCompact={contextCompact}
          loading={loading}
        />
      </section>
    </div>
  );
}
