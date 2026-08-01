// Pre-generated branching dialogue ("demo mode").
//
// Instead of calling Claude live, a character can ship a fixed tree: the
// opening offers two choices, each response offers two more, and after
// TRAJECTORY_DEPTH rounds the thread closes. That is 2^5 = 32 distinct paths
// and 62 authored responses per character, all generated ahead of time by
// scripts/generate-trajectory.mjs.
//
// A character with no trajectory file still falls back to the live API route.

import type { Alignment, Axis } from "@/lib/factions";
import { ZERO_ALIGNMENT } from "@/lib/factions";
import yeWenjie from "@/data/trajectories/ye-wenjie.json";
import wangMiao from "@/data/trajectories/wang-miao.json";
import shiQiang from "@/data/trajectories/shi-qiang.json";
import mikeEvans from "@/data/trajectories/mike-evans.json";

export type TrajectoryChoice = {
  text: string;
  axis: Axis;
  alignmentDelta: Alignment;
};

export type TrajectoryNode = {
  speech: string;
  stage: string;
  choices: TrajectoryChoice[];
  final?: boolean;
  /** On a leaf: which of the four endings this path resolves to. */
  endingAxis?: Axis;
};

export type Trajectory = {
  characterId: string;
  depth: number;
  opening: TrajectoryNode;
  /** Keyed by the path taken so far, e.g. "010" = choice 0, then 1, then 0. */
  nodes: Record<string, TrajectoryNode>;
};

const TRAJECTORIES: Record<string, Trajectory> = {
  "ye-wenjie": yeWenjie as unknown as Trajectory,
  "wang-miao": wangMiao as unknown as Trajectory,
  "shi-qiang": shiQiang as unknown as Trajectory,
  "mike-evans": mikeEvans as unknown as Trajectory,
};

export function getTrajectory(characterId: string): Trajectory | null {
  return TRAJECTORIES[characterId] ?? null;
}

export function hasTrajectory(characterId: string): boolean {
  return characterId in TRAJECTORIES;
}

/** Characters still answered by the live API, for the demo notice. */
export function liveCharacterIds(allIds: string[]): string[] {
  return allIds.filter((id) => !hasTrajectory(id));
}

/** The node reached by a path ("" = the opening). */
export function nodeAt(trajectory: Trajectory, path: string): TrajectoryNode | null {
  if (path === "") return trajectory.opening;
  return trajectory.nodes[path] ?? null;
}

export function isPathComplete(trajectory: Trajectory, path: string): boolean {
  return nodeAt(trajectory, path)?.final === true;
}

export function emptyAlignment(): Alignment {
  return { ...ZERO_ALIGNMENT };
}
