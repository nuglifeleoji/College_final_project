export type WorldEntry = {
  id: string;
  title: string;
  category: "Faction" | "Phenomenon" | "Place" | "Concept" | "Object";
  era: string;
  summary: string;
  body: string[];
  related?: string[];
  // How many TIMELINE events must have fired before this entry is in-world
  // knowledge. Characters are never shown entries above the current story
  // index, so nobody can reference an event the story has not reached.
  // A character may still know an entry early via `baselineKnowledge`.
  revealAfter: number;
};

export const WORLD_ENTRIES: WorldEntry[] = [
  {
    id: "trisolaris",
    title: "Trisolaris",
    category: "Place",
    era: "≈ 4 lightyears",
    summary:
      "A planet locked in chaotic three-body orbit around α Centauri's stars. Civilization rebooted 200+ times.",
    body: [
      "Trisolaris orbits three stars whose mutual gravitation cannot be solved analytically. The planet is captured, cast away, scorched, or frozen at intervals impossible to predict.",
      "Civilization has risen and been destroyed at least two hundred times. Survival took the form of dehydration: a Trisolaran can desiccate, be filed in a stack, and rehydrated when a stable era resumes.",
      "Their solution to chaos is to leave. They intend to find a stable sun and take it.",
    ],
    related: ["red-coast", "eto", "sophon"],
    // Known once Earth has heard back from Trisolaris (the 1979 warning,
    // TIMELINE index 3 — so 4 events must have fired).
    revealAfter: 4,
  },
  {
    id: "red-coast",
    title: "Red Coast Base",
    category: "Place",
    era: "1968 — 1987",
    summary:
      "Top-secret PRC SETI installation in the Greater Khingan Range. The site of humanity's first transmission, and its first reply.",
    body: [
      "Officially a missile-warning radar. Actually, a project to make and break first contact under Cold War cover.",
      "Ye Wenjie discovered the solar amplification effect here: the Sun could be used as a superantenna by tuning carriers to its energy mirror layers.",
      "In 1971 she transmitted through the Sun without authorization — not aimed at anyone, broadcast at everyone. Eight years later a listener on Trisolaris answered: 'Do not answer. Do not answer. Do not answer.' She answered.",
    ],
    related: ["ye-wenjie", "trisolaris"],
    // Body mentions the reply arriving "eight years later", so it cannot
    // surface before 1979.
    revealAfter: 4,
  },
  {
    id: "eto",
    title: "Earth-Trisolaris Organization",
    category: "Faction",
    era: "1980s — present",
    summary:
      "Underground human movement loyal to the Trisolaran fleet. Splintered into Adventists, Redemptionists, and Survivors.",
    body: [
      "Founded by Mike Evans and Ye Wenjie. Funded through Evans's petroleum trust and the 'Pan-Species Communism' movement.",
      "Adventists (Evans): humanity is irredeemable; the Lord must purge it.",
      "Redemptionists (Shen Yufei et al.): the Trisolarans are a god to be served and the three-body problem is to be solved for them.",
      "Survivors: the smallest faction. They want personal favor in the new order; they will hand over their species in exchange for a clan's survival.",
    ],
    related: ["adventist", "redemptionist", "judgment-day"],
    revealAfter: 5,
  },
  {
    id: "judgment-day",
    title: "Judgment Day",
    category: "Place",
    era: "Present",
    summary:
      "A Panamax oil tanker repurposed as the ETO's mobile command and the only channel to the Trisolaran fleet.",
    body: [
      "Owned by Mike Evans's petroleum trust. Houses the Second Red Coast: the only known transmitter still in two-way contact with the fleet.",
      "It moves constantly and answers to no flag. Everything the ETO knows about the Lord passes through its server decks.",
    ],
    related: ["eto", "guzheng"],
    revealAfter: 5,
  },
  {
    id: "guzheng",
    title: "Operation Guzheng",
    category: "Concept",
    era: "Present",
    summary:
      "Plan to bisect Judgment Day with monomolecular nanofilaments without alerting the ETO.",
    body: [
      "Named for the zither — strings strung tight across the canal's narrowest point.",
      "The filaments were Wang Miao's nanomaterial: cross-sections measured in nanometers, tensile strength sufficient to slice steel.",
      "Took less than three minutes. The Judgment Day was sliced through every deck and the Trisolaran archives recovered intact.",
      "The intercepted hard drives revealed the contents of the Trisolaran communications and the existence of the Sophons.",
    ],
    related: ["judgment-day", "wang-miao"],
    revealAfter: 10,
  },
  {
    id: "sophon",
    title: "Sophon",
    category: "Object",
    era: "Present",
    summary:
      "A proton unfolded into a many-dimensional supercomputer, then refolded and sent across light-years to lock physics on Earth.",
    body: [
      "Trisolaris cannot reach Earth in time with ships. So it sends sophons — protons engineered into intelligent observers traveling at near light speed.",
      "Two sophons are presently on Earth. They contaminate every high-energy physics experiment, faking results so that fundamental physics appears to be lying.",
      "They also relay every photon of light, every word, every keystroke back to Trisolaris in real time. Earth has no privacy.",
    ],
    related: ["trisolaris"],
    revealAfter: 7,
  },
  {
    id: "three-body-game",
    title: "The Three-Body VR",
    category: "Object",
    era: "Present",
    summary:
      "An ETO recruitment game that lets players relive the rise and fall of Trisolaran civilizations.",
    body: [
      "Distributed via the Frontiers of Science. Worn as a V-suit, it simulates each Trisolaran civilization's death by chaos and rebirth.",
      "Players who 'solve' the three-body problem to a sufficient depth are invited to ETO meetings.",
      "Wang Miao played as 'Hai Ren' and met King Wen, von Neumann, Newton, Einstein, Copernicus.",
    ],
    related: ["eto"],
    revealAfter: 9,
  },
  {
    id: "dark-forest",
    title: "Cosmic Sociology · Two Axioms",
    category: "Concept",
    era: "Drafted by Ye Wenjie",
    summary:
      "Survival is the first need of civilization. Civilization grows but matter does not. Therefore: silence.",
    body: [
      "Ye Wenjie sketched two axioms to Luo Ji on a hilltop. From them, an unspoken rule: announcing your position to the universe is suicide.",
      "She did not name the conclusion. She did not need to. The rest of the trilogy is its echo.",
    ],
    // Coda only (TIMELINE index 10, so all 11 events must have fired).
    // Keeping this gated is also what holds the project to Book I scope —
    // it must never sit in a character's context by default.
    revealAfter: 11,
  },
];

export type TimelineEvent = {
  id: string;
  date: string;
  title: string;
  detail: string;
  axis: "earth" | "trisolaris" | "eto";
};

export const TIMELINE: TimelineEvent[] = [
  {
    id: "ev-1967",
    date: "1967",
    title: "Ye Zhetai is killed",
    detail:
      "Ye Wenjie's father, a theoretical physicist, is beaten to death by Red Guards at a denouncement rally. His own wife denounces him.",
    axis: "earth",
  },
  {
    id: "ev-1969",
    date: "1969",
    title: "Greater Khingan Range",
    detail:
      "Ye Wenjie is sent to the Inner Mongolia Production and Construction Corps, felling forest. Bai Mulin, a journalist she trusts, uses her handwritten copy of Silent Spring to denounce her. Facing prison, she is offered Red Coast instead.",
    axis: "earth",
  },
  {
    id: "ev-1971",
    date: "1971",
    title: "First transmission",
    detail:
      "Ye Wenjie works out the solar amplification effect and, without authorization, beams a message at the Sun. Amplified, it goes out in every direction at once. She tells no one and waits.",
    axis: "earth",
  },
  {
    id: "ev-1979",
    date: "1979",
    title: "Pacifist warning received",
    detail:
      "Eight years on, the listener at Trisolaran Monitoring Post 1379 breaks protocol and warns Earth: 'Do not answer! Do not answer!! Do not answer!!!' Ye answers anyway — inviting them to come, and fixing the Sun's position for the fleet.",
    axis: "trisolaris",
  },
  {
    id: "ev-eto-found",
    date: "1980s",
    title: "ETO founded",
    detail:
      "Ye Wenjie and Mike Evans formalize the Earth-Trisolaris Organization. Adventist and Redemptionist factions diverge.",
    axis: "eto",
  },
  {
    id: "ev-fleet",
    date: "After 1983",
    title: "First Trisolaran Fleet launched",
    detail:
      "Ye's reply reaches Trisolaris four years after she sends it, and the decision is made. A thousand ships set out for the Solar System at a fraction of light speed. Estimated time of arrival: roughly 450 years.",
    axis: "trisolaris",
  },
  {
    id: "ev-sophon",
    date: "Present",
    title: "Sophons online on Earth",
    detail:
      "Two intelligent protons enter Earth's atmosphere. Fundamental physics begins reporting impossible results.",
    axis: "trisolaris",
  },
  {
    id: "ev-suicides",
    date: "Present",
    title: "Scientist suicides",
    detail:
      "Yang Dong and others take their lives. The Frontiers of Science accelerates its recruitment.",
    axis: "earth",
  },
  {
    id: "ev-game",
    date: "Present",
    title: "Wang Miao enters Three-Body",
    detail:
      "Da Shi drags Wang Miao into the Battle Command Center, then back out to infiltrate the Frontiers of Science. A countdown burns itself into his photographs, and he puts on the V-suit.",
    axis: "earth",
  },
  {
    id: "ev-guzheng",
    date: "Present",
    title: "Operation Guzheng",
    detail:
      "The Judgment Day is bisected. The ETO archives are captured. The truth becomes a state secret.",
    axis: "earth",
  },
  {
    id: "ev-darkforest",
    date: "Coda",
    title: "Two axioms",
    detail:
      "On a hill, Ye Wenjie sketches the founding postulates of cosmic sociology. The Dark Forest is named, but only later.",
    axis: "earth",
  },
];

// ---------------------------------------------------------------- story clock

/** The story index is simply how many TIMELINE events have fired so far. */
export function currentStoryEvent(triggeredCount: number): TimelineEvent | null {
  if (triggeredCount <= 0) return null;
  return TIMELINE[Math.min(triggeredCount, TIMELINE.length) - 1] ?? null;
}

/** Human-readable "where are we" label used in the character prompt. */
export function storyPositionLabel(triggeredCount: number): string {
  const event = currentStoryEvent(triggeredCount);
  if (!event) return "Before the first recorded event on the timeline";
  return `${event.date} · ${event.title}`;
}

/**
 * The World Book slice a character may know right now: everything the timeline
 * has already reached, plus whatever this character personally knows from the
 * start (Evans knows the ETO before the player ever hears of it).
 */
export function worldEntriesKnownAt(
  triggeredCount: number,
  baselineKnowledge: readonly string[] = []
): WorldEntry[] {
  const baseline = new Set(baselineKnowledge);
  return WORLD_ENTRIES.filter(
    (entry) => entry.revealAfter <= triggeredCount || baseline.has(entry.id)
  );
}

/** Titles the story has NOT reached — never sent to the model, used by the UI. */
export function unreachedTimelineEvents(triggeredCount: number): TimelineEvent[] {
  return TIMELINE.slice(Math.max(0, triggeredCount));
}

export function isTimelineExhausted(triggeredCount: number): boolean {
  return triggeredCount >= TIMELINE.length;
}
