"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CHARACTERS, type Character, getCharacter } from "@/lib/characters";
import { loadSession, type SavedSession, type Turn } from "@/lib/sessions";
import { AXIS_LABEL, AXIS_COLOR } from "@/lib/factions";

export default function StoryView({ character }: { character: Character }) {
  const [session, setSession] = useState<SavedSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(loadSession(character.id));
    setHydrated(true);
  }, [character.id]);

  const turns: Turn[] = session?.turns ?? [];
  const userTurns = turns.filter((t) => t.kind === "user").length;
  const startedAt = session?.startedAt
    ? new Date(session.startedAt).toLocaleString()
    : null;

  const ended = session?.endingFired;

  return (
    <div className="relative">
      <section className="relative border-b border-line/60">
        <div className={`absolute inset-0 bg-gradient-to-b ${character.portraitGradient} opacity-25`} />
        <div className="absolute inset-0 scanlines opacity-30" />
        <div className="relative mx-auto max-w-4xl px-6 lg:px-10 pt-16 pb-12 text-center">
          <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-amber mb-4">
            A Story · Book I · {character.openingScene.chapter}
          </div>
          <h1 className="font-display text-5xl md:text-7xl text-parchment leading-[1.05] tracking-tight">
            <span className="italic text-eto-glow">A conversation</span> with<br />
            {character.name}
          </h1>
          <div className="mt-3 font-display italic text-2xl text-amber-soft">
            {character.nameOriginal}
          </div>
          <div className="mt-6 hairline mx-auto max-w-md" />
          <div className="mt-5 flex items-center justify-center gap-6 font-mono text-[11px] tracking-[0.32em] uppercase text-mute flex-wrap">
            <span>Recorded by · You</span>
            {startedAt && <span>·</span>}
            {startedAt && <span>{startedAt}</span>}
            <span>·</span>
            <span className="text-amber-soft">{userTurns} turn{userTurns === 1 ? "" : "s"}</span>
            {ended && (
              <>
                <span>·</span>
                <span className={AXIS_COLOR[ended.axis].fg}>
                  Ended · {AXIS_LABEL[ended.axis]}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 lg:px-10 py-16">
        {!hydrated ? (
          <div className="text-mute font-mono text-sm">Loading transcript…</div>
        ) : turns.length <= 3 ? (
          <EmptyStory character={character} />
        ) : (
          <article className="space-y-7 font-display text-[19px] leading-[1.75] text-parchment">
            {turns.map((t, i) => {
              if (t.kind === "scene") {
                return (
                  <div key={`s-${i}`} className="my-10 text-center">
                    <div className="font-mono text-[10px] tracking-[0.36em] uppercase text-amber-soft">
                      ⸻ {t.chapter} ⸻
                    </div>
                    <p className="mt-3 italic text-parchment-dim leading-relaxed max-w-2xl mx-auto">
                      {t.setting}
                    </p>
                  </div>
                );
              }
              if (t.kind === "guest_enter") {
                const g = getCharacter(t.characterId);
                return (
                  <div key={`ge-${i}`} className="my-6 text-center">
                    <div className="font-mono text-[10px] tracking-[0.36em] uppercase text-eto-glow">
                      ⸻ {g?.name ?? "A figure"} enters ⸻
                    </div>
                    <p className="mt-2 italic text-parchment-dim text-base">{t.reason}</p>
                  </div>
                );
              }
              if (t.kind === "guest_exit") {
                const g = getCharacter(t.characterId);
                return (
                  <div key={`gx-${i}`} className="my-6 text-center">
                    <div className="font-mono text-[10px] tracking-[0.36em] uppercase text-mute">
                      ⸻ {g?.name ?? "They"} steps out ⸻
                    </div>
                    <p className="mt-2 italic text-parchment-dim text-base">{t.reason}</p>
                  </div>
                );
              }
              if (t.kind === "char") {
                const charDef = CHARACTERS.find((c) => c.id === t.characterId) ?? character;
                return (
                  <div key={`c-${i}`}>
                    {t.stage && t.stage !== "Opening" && (
                      <p className="text-parchment-dim italic text-[16px] leading-relaxed mb-1.5">
                        {t.stage}
                      </p>
                    )}
                    <p>
                      <span className="text-amber-soft font-mono text-[11px] tracking-[0.28em] uppercase mr-3 align-middle">
                        {charDef.name.split(" ")[0]}:
                      </span>
                      <span className="italic">&ldquo;{t.speech}&rdquo;</span>
                    </p>
                  </div>
                );
              }
              if (t.kind === "user") {
                return (
                  <div key={`u-${i}`}>
                    <p>
                      <span className="text-eto-glow font-mono text-[11px] tracking-[0.28em] uppercase mr-3 align-middle">
                        You:
                      </span>
                      <span>&ldquo;{t.text}&rdquo;</span>
                    </p>
                  </div>
                );
              }
              return null;
            })}
            <div className="pt-12 text-center">
              <div className="hairline mx-auto max-w-md mb-5" />
              <div className="font-mono text-[10px] tracking-[0.36em] uppercase text-mute">
                ⸻ {ended ? "End of this path" : "End of recorded transmission"} ⸻
              </div>
            </div>
          </article>
        )}
      </section>

      <section className="mx-auto max-w-4xl px-6 lg:px-10 pb-20 flex flex-wrap gap-4 items-center justify-center">
        {ended ? (
          <Link
            href={`/play/${character.id}/end?axis=${ended.axis}`}
            className="px-6 py-3 bg-eto text-parchment font-mono text-xs tracking-[0.28em] uppercase hover:bg-eto-glow transition-colors"
          >
            ▶ Re-watch the ending
          </Link>
        ) : (
          <Link
            href={`/play/${character.id}`}
            className="px-6 py-3 bg-eto text-parchment font-mono text-xs tracking-[0.28em] uppercase hover:bg-eto-glow transition-colors"
          >
            ▶ Continue the story
          </Link>
        )}
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
          Talk to someone else
        </Link>
        <button
          onClick={() => window.print()}
          className="px-6 py-3 border border-line text-parchment-dim hover:border-amber hover:text-amber font-mono text-xs tracking-[0.28em] uppercase transition-colors"
        >
          ⎙ Print / save PDF
        </button>
      </section>
    </div>
  );
}

function EmptyStory({ character }: { character: Character }) {
  return (
    <div className="text-center py-10">
      <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute mb-3">
        No recorded conversation yet
      </div>
      <h3 className="font-display text-3xl text-parchment">
        Your story with {character.name} hasn&apos;t begun.
      </h3>
      <p className="text-parchment-dim mt-3 max-w-lg mx-auto">
        Take at least one turn in the dialogue surface and the system will
        archive every line spoken on both sides into a continuous narrative.
      </p>
      <Link
        href={`/play/${character.id}`}
        className="mt-7 inline-flex items-center gap-3 px-6 py-3 bg-eto text-parchment font-mono text-xs tracking-[0.28em] uppercase hover:bg-eto-glow transition-colors"
      >
        Begin with {character.name} →
      </Link>
    </div>
  );
}
