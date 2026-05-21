"use client";

import { BookOpen, GitBranch, RadioTower, Route } from "lucide-react";
import { getCharacter, type Character } from "@/lib/characters";
import type { Turn } from "@/lib/sessions";
import {
  AXES,
  AXIS_COLOR,
  AXIS_LABEL,
  ENDING_AXIS_THRESHOLD,
  ENDING_MIN_TURNS,
  dominantAxis,
  type Alignment,
} from "@/lib/factions";
import type { ContextCompact } from "@/lib/context-compact";

type Props = {
  turns: Turn[];
  alignment: Alignment;
  activeCharacter: Character;
  storyCharacter: Character;
  contextCompact?: ContextCompact;
  loading: boolean;
};

type StoryBeat = {
  label: string;
  text: string;
};

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function truncate(text: string, max = 150) {
  const cleaned = clean(text);
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}...`;
}

function userTurnCount(turns: Turn[]) {
  return turns.filter((turn) => turn.kind === "user").length;
}

function latestScene(turns: Turn[]) {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.kind === "scene") return turn;
  }
  return null;
}

function latestUserLine(turns: Turn[]) {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.kind === "user") return turn.text;
  }
  return null;
}

function latestCharacterLine(turns: Turn[]) {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.kind === "char") {
      const character = getCharacter(turn.characterId);
      return {
        speaker: character?.name ?? turn.characterId,
        stage: turn.stage,
        speech: turn.speech,
      };
    }
  }
  return null;
}

function latestChoices(turns: Turn[]) {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.kind === "choices") return turn.choices;
  }
  return [];
}

function collectBeats(turns: Turn[]) {
  const beats: StoryBeat[] = [];
  let playerTurn = 0;

  for (const turn of turns) {
    if (turn.kind === "scene") {
      beats.push({
        label: turn.chapter,
        text: turn.setting,
      });
    } else if (turn.kind === "timeline") {
      beats.push({
        label: `Timeline · Turn ${turn.event.triggeredAtTurn}`,
        text: `${turn.event.date} · ${turn.event.title}`,
      });
    } else if (turn.kind === "guest_enter") {
      const guest = getCharacter(turn.characterId);
      beats.push({
        label: `${guest?.name ?? "Guest"} enters`,
        text: turn.reason,
      });
    } else if (turn.kind === "guest_exit") {
      const guest = getCharacter(turn.characterId);
      beats.push({
        label: `${guest?.name ?? "Guest"} exits`,
        text: turn.reason,
      });
    } else if (turn.kind === "user") {
      playerTurn += 1;
      beats.push({
        label: `Your turn ${String(playerTurn).padStart(2, "0")}`,
        text: turn.text,
      });
    } else if (turn.kind === "char") {
      const character = getCharacter(turn.characterId);
      beats.push({
        label: character?.name ?? turn.characterId,
        text: turn.stage === "Opening" ? turn.speech : `${turn.stage}: ${turn.speech}`,
      });
    }
  }

  return beats.slice(-7);
}

export default function StoryProgressPanel({
  turns,
  alignment,
  activeCharacter,
  storyCharacter,
  contextCompact,
  loading,
}: Props) {
  const scene = latestScene(turns);
  const lastUser = latestUserLine(turns);
  const lastCharacter = latestCharacterLine(turns);
  const choices = latestChoices(turns);
  const beats = collectBeats(turns);
  const turnCount = userTurnCount(turns);
  const dominant = dominantAxis(alignment);
  const dominantScore = alignment[dominant];
  const endingPressure = Math.max(
    0,
    Math.min(
      100,
      Math.round((dominantScore / ENDING_AXIS_THRESHOLD) * 100)
    )
  );
  const turnGate = Math.max(
    0,
    Math.min(100, Math.round((turnCount / ENDING_MIN_TURNS) * 100))
  );

  return (
    <aside className="lg:sticky lg:top-28 space-y-4">
      <section className="border border-line bg-panel/45 backdrop-blur-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-eto-glow">
            Story progress
          </div>
          <BookOpen size={15} strokeWidth={1.8} className="text-eto-glow" aria-hidden />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="border border-line bg-void-2/50 p-3">
            <div className="font-mono text-[9px] tracking-[0.24em] uppercase text-mute">
              Turn
            </div>
            <div className="mt-1 font-mono text-2xl text-parchment tabular-nums">
              {String(turnCount).padStart(2, "0")}
            </div>
          </div>
          <div className="border border-line bg-void-2/50 p-3">
            <div className="font-mono text-[9px] tracking-[0.24em] uppercase text-mute">
              Speaker
            </div>
            <div className="mt-1 font-display text-xl text-parchment truncate">
              {activeCharacter.name}
            </div>
          </div>
        </div>

        <div className="mt-4 border border-line bg-void-2/50 p-4">
          <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.28em] uppercase text-amber-soft">
            <RadioTower size={13} strokeWidth={1.8} aria-hidden />
            Now
          </div>
          <div className="mt-2 font-display text-lg text-parchment">
            {scene?.chapter ?? storyCharacter.openingScene.chapter}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-parchment-dim">
            {truncate(scene?.setting ?? storyCharacter.openingScene.setting, 190)}
          </p>
        </div>

        <div className="mt-4 grid gap-3">
          {lastUser && (
            <div>
              <div className="font-mono text-[9px] tracking-[0.28em] uppercase text-eto-glow">
                Last choice
              </div>
              <p className="mt-1 text-sm text-parchment leading-relaxed">
                {truncate(lastUser, 140)}
              </p>
            </div>
          )}
          {lastCharacter && (
            <div>
              <div className="font-mono text-[9px] tracking-[0.28em] uppercase text-amber-soft">
                Latest reply · {lastCharacter.speaker}
              </div>
              <p className="mt-1 text-sm text-parchment-dim leading-relaxed">
                {truncate(lastCharacter.speech, 160)}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="border border-line bg-panel/45 backdrop-blur-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
            Recent beats
          </div>
          <Route size={15} strokeWidth={1.8} className="text-mute" aria-hidden />
        </div>
        <ol className="mt-4 space-y-3">
          {beats.map((beat, index) => (
            <li key={`${beat.label}-${index}`} className="grid grid-cols-[18px_1fr] gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-amber/80 shadow-[0_0_8px_rgba(212,168,87,0.5)]" />
              <div className="min-w-0">
                <div className="font-mono text-[9px] tracking-[0.24em] uppercase text-mute truncate">
                  {beat.label}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-parchment-dim">
                  {truncate(beat.text, 150)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border border-line bg-panel/45 backdrop-blur-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
            Branch pressure
          </div>
          <GitBranch size={15} strokeWidth={1.8} className="text-mute" aria-hidden />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 font-mono text-[9px] tracking-[0.24em] uppercase">
            <span className={AXIS_COLOR[dominant].fg}>
              {AXIS_LABEL[dominant]}
            </span>
            <span className="text-mute tabular-nums">
              {dominantScore}/{ENDING_AXIS_THRESHOLD}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-line/80 overflow-hidden">
            <div
              className={AXIS_COLOR[dominant].bg}
              style={{ width: `${endingPressure}%`, height: "100%" }}
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 font-mono text-[9px] tracking-[0.24em] uppercase">
            <span className="text-mute">Ending gate</span>
            <span className="text-parchment-dim tabular-nums">
              {turnCount}/{ENDING_MIN_TURNS} turns
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-line/80 overflow-hidden">
            <div
              className="h-full bg-parchment/70"
              style={{ width: `${turnGate}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {AXES.map((axis) => (
            <div key={axis} className="border border-line bg-void-2/50 p-2">
              <div className={`font-mono text-[8px] tracking-[0.18em] uppercase ${AXIS_COLOR[axis].fg}`}>
                {AXIS_LABEL[axis]}
              </div>
              <div className="mt-1 font-mono text-lg text-parchment tabular-nums">
                {alignment[axis]}
              </div>
            </div>
          ))}
        </div>

        {contextCompact && (
          <div className="mt-4 border-t border-line pt-4">
            <div className="font-mono text-[9px] tracking-[0.28em] uppercase text-mute">
              Long-run memory · turn {contextCompact.compactedThroughTurn}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-parchment-dim whitespace-pre-line">
              {truncate(contextCompact.summary, 360)}
            </p>
          </div>
        )}
      </section>

      <section className="border border-line bg-panel/45 backdrop-blur-sm p-5">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
          Current branches
        </div>
        <div className="mt-3 grid gap-2">
          {loading ? (
            <p className="text-sm text-parchment-dim">Waiting for the next reply...</p>
          ) : choices.length ? (
            choices.map((choice) => (
              <div
                key={choice}
                className="border border-line bg-void-2/50 px-3 py-2 text-sm leading-snug text-parchment-dim"
              >
                {choice}
              </div>
            ))
          ) : (
            <p className="text-sm text-parchment-dim">No branch choices on screen.</p>
          )}
        </div>
      </section>
    </aside>
  );
}
