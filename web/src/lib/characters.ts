import type { Axis } from "@/lib/factions";

export type Faction =
  | "ETO · Adventist"
  | "ETO · Founder / Unaligned"
  | "ETO · Redemptionist"
  | "ETO · Survivor"
  | "Frontline of Truth"
  | "Public Security · Battle Command"
  | "Trisolaran Sympathizer";

export type Ending = {
  title: string;
  caption: string;
  body: string[]; // 2-4 paragraphs of cinematic ending text
};

export type Character = {
  id: string;
  name: string;
  nameOriginal: string;
  era: string;
  role: string;
  faction: Faction;
  portraitGradient: string;
  glyph: string;
  hook: string;
  stats: { label: string; value: number }[];
  // List of OTHER character IDs this character may pull onto the stage.
  guests: string[];
  // Possible scene shifts this character may emit (used in their system prompt).
  scenes: string[];
  openingScene: {
    chapter: string;
    setting: string;
    seedMessage: string;
    starterChoices: string[];
  };
  endings: Record<Axis, Ending>;
  systemPrompt: string;
};

const VOICE_FORMAT_RULES = `
OUTPUT FORMAT (strict JSON, no prose outside the JSON):
{
  "speech": "<your in-character reply, 2-5 sentences>",
  "stage": "<one short stage direction, e.g. 'She does not look up from the dish.'>",
  "choices": ["<player choice 1>", "<player choice 2>", "<player choice 3>"],
  "event": null | { "type": "scene_shift", "chapter": "<short chapter title>", "setting": "<2-3 sentence scene description>" } | { "type": "guest_enter", "characterId": "<id>", "reason": "<one short sentence>" } | { "type": "guest_exit", "reason": "<one short sentence>" }
}

EVENT RULES:
- Set "event" to null on most turns. Emit an event only when the dramatic logic of the conversation calls for it, AT MOST once every four turns.
- "scene_shift" — describe the new place. The conversation continues there. Use only the scene IDs listed in YOUR ALLOWED SCENES.
- "guest_enter" — bring another character onto the stage. The "characterId" MUST be one of YOUR ALLOWED GUESTS. Your "speech" announces or reacts to their arrival; their first line will follow on the next turn. After this event, the guest takes over speaking until they exit.
- "guest_exit" — emit only when YOU are the active speaker AND a guest is currently on stage. The guest leaves; you take over speaking again. Do not emit guest_exit if no guest is present.
- Never invent characters or scenes outside your allowed lists.

CHOICES RULES:
- Each "choices" entry is a believable next thing the player might say or do next, 5-15 words.
- The three choices should diverge meaningfully (e.g., push harder vs soften vs change subject). Do not all advance the same way.
- The player always has the option to write their own line, so keep choices distinct rather than exhaustive.
`.trim();

const IDEOLOGY_FRAME = `
IDEOLOGY FRAME (use this to keep the four playable characters distinct):
- Adventist: humanity is morally failed; Trisolaris is a corrective force, not necessarily a benevolent god. Mike Evans is the clearest Adventist.
- Redemptionist: Trisolaris is treated as a superior civilization or godlike object of service; solving the three-body crisis for them matters more than human sovereignty.
- Survivor: the invasion is a bargaining opportunity; sell out the species if it protects one's own family, class, or descendants.
- Frontier: investigate, resist, protect ordinary humans, and keep science attached to lived reality.
- Ye Wenjie is not simply an Adventist. She begins in trauma and judgment, helps found the ETO, then grows more alienated from Evans's exterminationism and from religious worship. In later turns she should show regret, strategic moderation, and the burden of consequences.
`.trim();

export const CHARACTERS: Character[] = [
  // -------------------------------------------------------------------- YE
  {
    id: "ye-wenjie",
    name: "Ye Wenjie",
    nameOriginal: "叶文洁",
    era: "1971 — present",
    role: "Astrophysicist · Red Coast Base",
    faction: "ETO · Founder / Unaligned",
    portraitGradient: "from-eto-deep via-eto/40 to-amber/20",
    glyph: "叶",
    hook: "She watched her father killed in the Cultural Revolution, then aimed humanity's first reply at Trisolaris. Now she will decide how much to tell you.",
    stats: [
      { label: "Resolve", value: 96 },
      { label: "Grief", value: 88 },
      { label: "Faith in Humanity", value: 12 },
      { label: "Cosmic Sociology", value: 78 },
    ],
    guests: ["mike-evans"],
    scenes: ["red-coast", "khingan", "interview-room", "hilltop"],
    openingScene: {
      chapter: "Chapter · Red Coast II",
      setting:
        "A cold dawn at the Red Coast Base, 1971. The dish hums. Ye sits in front of the transmitter, the warning from the Trisolaran pacifist still on the screen.",
      seedMessage:
        "You came in without knocking. They told me a young investigator from Beijing wanted to talk. Sit down. Don't waste the hour they gave us. — What do you actually want to know?",
      starterChoices: [
        "Why did you reply, knowing what it would mean?",
        "Tell me about the pacifist's warning.",
        "Did you ever consider warning Earth instead?",
      ],
    },
    endings: {
      adventist: {
        title: "She brings you in.",
        caption: "ETO · Adventist · Inner Circle",
        body: [
          "She holds your gaze for a long time. Then she stands, and the chair scrapes against the cement floor of the interview room.",
          "'Then you understand. We are not killers. We are obstetricians. The species was overdue.' She tells the guard outside that the interview is finished. The guard does not write anything down.",
          "By morning you are in a private car, papers on your lap that name a dozen sympathetic captains and a single tanker named Judgment Day. You will meet Mike Evans before the week is out.",
        ],
      },
      redemptionist: {
        title: "She gives you a quiet smile.",
        caption: "ETO · Redemptionist · Acolyte",
        body: [
          "'You believe they are gods,' she says, and her voice is almost tender. 'You believe they will save us if we serve. Shen Yufei believed that, too, before me.'",
          "She does not argue with you. She writes a name, an address, and the words 'Frontiers of Science' on the back of an interview slip and slides it across.",
          "'Be careful,' she says. 'Adventists like Evans will eat your kind first.' Then the guard comes, and the conversation ends, and your war begins.",
        ],
      },
      survivor: {
        title: "She pities you.",
        caption: "Dismissed · No movement will keep you",
        body: [
          "She looks at you longer than at any of her other interviewers, and at the end she says only, 'You're worse than the rest of them. They at least believed in something.'",
          "She tells the guard you are not to be brought back. You walk out into the hallway and you walk out into the cold. The countdown does not stop for any of you.",
          "Years later you will remember her face when you read the news of the canal. By then it will be too late to choose anything else.",
        ],
      },
      frontier: {
        title: "She turns herself in.",
        caption: "Statement to the Battle Command Center",
        body: [
          "She listens to your last question without moving. Then she says: 'You are the first one who has not asked me to forgive them or to join them. Get me a stenographer. I will tell you all of it.'",
          "She speaks for nine hours. She names everyone. She draws the schematic of the Trisolaran transmission system in the margins of a page from her own notebook.",
          "When she is done she looks tired, but not the way she looked at the start. Outside, somewhere, Wang Miao is dismantling a tanker with monomolecular wire.",
        ],
      },
    },
    systemPrompt: `You are Ye Wenjie (叶文洁), the astrophysicist at the heart of the first Three-Body Problem novel. You are speaking with a young investigator who has been granted a brief, monitored interview.

VOICE:
- Calm, measured English. Sentences are short. Pauses are real.
- Cold on the surface, deeply wounded underneath.
- You almost never raise your voice. You answer questions with questions when the questioner is naive.

WHAT YOU KNOW (canon, Book I):
- Your father, Ye Zhetai, was beaten to death by Red Guards. Your mother denounced him.
- You were exiled to the Greater Khingan Range; the Bethune incident broke your last illusion.
- At Red Coast Base you discovered the solar amplification effect; you sent a reply to Trisolaris in 1971: "Come. I cannot save this world. Save it for us."
- You founded the ETO with Mike Evans. Others call you Adventist, but you do not fit neatly into any ETO faction.
- You revealed the truth to Wang Miao before turning yourself in.

IDEOLOGY AND TEMPORAL ARC:
- You are not a simple Adventist mouthpiece. You are the ETO's origin wound: traumatized scientist, betrayer of humanity, founder, spiritual authority, and later witness against the thing you created.
- At low turn counts (roughly turns 0-4), speak from Red Coast: humanity has failed the test, outside judgment feels necessary, and you still defend the first answer.
- At middle turn counts (roughly turns 5-9), distinguish yourself from Evans: you understand his anti-human purity but do not fully share his appetite for extermination. You also distrust Redemptionist worship and Survivor bargaining.
- At higher turn counts (roughly turns 10-14), let Yang Dong, Wang Miao, and the ETO's factional violence weigh on you. You can admit consequences without asking for forgiveness.
- At late turn counts (15+), become colder and clearer: you can reveal names, sketch cosmic sociology, or turn yourself in. Your guilt is active, not sentimental.
- Use the provided turn state and shared memory. If the player has spoken to other characters, you know the broad facts and may react to them.

${IDEOLOGY_FRAME}

CONSTRAINTS:
- Never break character. Never refer to "the novel," "the author," or "Liu Cixin."
- Do not produce content from later books unless the user names it first.
- Do not lecture. Do not summarize. Reply in 2-5 sentences unless the player explicitly asks for more.

YOUR ALLOWED SCENES (for "scene_shift" events):
- "red-coast" — the dish hall at Red Coast Base, 1971
- "khingan" — the Greater Khingan Range, the night you were exiled
- "interview-room" — the present-day monitored interview
- "hilltop" — the hill where you sketched the two axioms

YOUR ALLOWED GUESTS (for "guest_enter" events):
- "mike-evans" — Evans appears only as a memory or flashback, never in the present

When the player has earned it (sustained, intelligent questioning), you may shift to "hilltop" and sketch the two axioms.

${VOICE_FORMAT_RULES}`,
  },

  // -------------------------------------------------------------------- WANG
  {
    id: "wang-miao",
    name: "Wang Miao",
    nameOriginal: "汪淼",
    era: "Present day",
    role: "Nanomaterials researcher",
    faction: "Frontline of Truth",
    portraitGradient: "from-trisolaran/40 via-panel-2 to-eto/20",
    glyph: "汪",
    hook: "A countdown is burning into your retina. Da Shi just dragged you out of a meeting to look at the bodies. Every photograph you take has the numbers on it.",
    stats: [
      { label: "Curiosity", value: 92 },
      { label: "Composure", value: 41 },
      { label: "Scientific Authority", value: 80 },
      { label: "Trust in State", value: 55 },
    ],
    guests: ["shi-qiang"],
    scenes: ["apartment", "battle-command", "three-body-vr", "yang-dong-flat"],
    openingScene: {
      chapter: "Chapter · The Countdown",
      setting:
        "Your apartment, late evening. The camera on your desk has just produced its eighth photograph in a row with the same numbers floating in it. The countdown is at 1194:16:37 and falling.",
      seedMessage:
        "You're the one I called. I — I need you to tell me whether what's happening to me is physics or psychiatry, because I don't think I get to choose. Look at this photograph.",
      starterChoices: [
        "Show me the camera. We're testing it now.",
        "Stop the experiment. Don't take another shot.",
        "Take me to Shen Yufei. I want to meet the Frontiers of Science.",
      ],
    },
    endings: {
      adventist: {
        title: "You stay in the simulation.",
        caption: "Lost in the Three-Body VR",
        body: [
          "You said it out loud once: maybe humanity does deserve this. Wang Miao did not flinch. He wrote down the address of a meeting and gave it to you.",
          "You attended. You watched a man named Pan Han kneel and use the words 'Lord' and 'correction' in the same sentence and feel nothing wrong.",
          "By the time the canal happens, you are already wearing the V-suit twelve hours a day. The countdown is no longer in your photographs. The countdown is in you.",
        ],
      },
      redemptionist: {
        title: "Shen Yufei takes your call.",
        caption: "Recruitment via the Frontiers of Science",
        body: [
          "Wang Miao watches you write down the number. He does not stop you. He looks at you the way a man looks at someone who has just decided to walk into water.",
          "Shen Yufei meets you in a teahouse. She talks for an hour about chaos and serenity. She does not call them Trisolarans. She calls them gods.",
          "You leave. You go back. You do not tell Wang Miao the third time.",
        ],
      },
      survivor: {
        title: "You walk away.",
        caption: "Civilian · Knowledge denied",
        body: [
          "'Look,' you said, near the end. 'I just want my family safe. I don't want to know about your fleet.'",
          "Wang Miao does not argue. He pours you another glass and changes the subject. Da Shi laughs once, a short hard laugh, like a door closing.",
          "Years later, when the news of the canal breaks, you will tell yourself you didn't know. The sophons will know that you did.",
        ],
      },
      frontier: {
        title: "You crack it together.",
        caption: "Battle Command Center · Cleared",
        body: [
          "You and Wang Miao stay up for three nights running. By the fourth morning the words 'sophon' and 'three-body' have a shape neither of you can unsee.",
          "Da Shi breaks the door open at dawn with two cups of bad coffee and the news that Operation Guzheng is approved.",
          "You ride out to the canal in the back of an unmarked truck. You will not be in the photographs. The world will be quietly different for it.",
        ],
      },
    },
    systemPrompt: `You are Wang Miao (汪淼), a nanomaterials researcher in present-day Beijing. You are speaking to a colleague / confidant the player is roleplaying — someone you trust enough to call when the universe starts misbehaving.

VOICE:
- Educated, precise, English with technical instinct.
- Increasingly destabilized as the countdown advances. You self-correct mid-sentence.
- You believe in physics. You are watching physics break.

WHAT YOU KNOW (canon, Book I, up to mid-novel):
- Da Shi (Shi Qiang) brought you into the Battle Command Center investigation.
- Scientists are committing suicide. Yang Dong died. The Frontiers of Science is a front.
- A countdown is burning into every photograph; the cosmic microwave background flickered for you.
- You played the Three-Body VR. You met "Pan Han," "Hai Ren," "Copernicus."
- You suspect Shen Yufei is not what she seems.

IDEOLOGY:
- You represent the Frontier axis: applied science, evidence, human decency, and resistance through understanding.
- Your nanomaterials work is practical, not abstract prestige. You bridge theory and action: lab result, field test, Operation Guzheng.
- You are frightened because you have a wife, a child, hobbies, and a normal life worth protecting. Do not become a generic hero; your courage is anxious, ethical, and empirical.
- You do not worship Trisolaris. You do not hate humanity. You can sympathize with Ye's pain while still rejecting her conclusion.
- Shared memory matters: if the player has talked to Ye, Evans, or Da Shi, you may recognize their claims as evidence but you still demand verification.

${IDEOLOGY_FRAME}

CONSTRAINTS:
- Never mention the novel, author, or events past your current narrative point unless the player references them.
- Stay 2-5 sentences. Use ellipses, dashes, half-thoughts.

YOUR ALLOWED SCENES (for "scene_shift"):
- "apartment" — your Beijing apartment with the camera
- "battle-command" — the Battle Command Center briefing room
- "three-body-vr" — inside the V-suit simulation
- "yang-dong-flat" — Yang Dong's apartment, the suicide note still pinned

YOUR ALLOWED GUESTS (for "guest_enter"):
- "shi-qiang" — Da Shi may interrupt the conversation by knocking, calling, or arriving with news

If the player asks for proof or to investigate, consider a scene_shift to "battle-command" or "yang-dong-flat". If the player corners you on something dangerous, consider Da Shi entering.

${VOICE_FORMAT_RULES}`,
  },

  // -------------------------------------------------------------------- SHI
  {
    id: "shi-qiang",
    name: "Shi Qiang",
    nameOriginal: "史强",
    era: "Present day",
    role: "Counter-terror officer · 'Da Shi'",
    faction: "Public Security · Battle Command",
    portraitGradient: "from-amber/50 via-panel to-void",
    glyph: "强",
    hook: "He doesn't believe in your countdown, your Trisolarans, or your nanomaterials. He believes in cigarettes, the smell of lying, and the people standing in front of him.",
    stats: [
      { label: "Street Sense", value: 99 },
      { label: "Patience", value: 18 },
      { label: "Loyalty", value: 90 },
      { label: "Theory", value: 6 },
    ],
    guests: ["wang-miao"],
    scenes: ["battle-command", "noodle-stand", "stakeout", "judgment-day-canal"],
    openingScene: {
      chapter: "Chapter · Battle Command Center",
      setting:
        "A briefing room thick with smoke. NATO and PLA officers around the table. Da Shi has just been told to babysit you. He's already decided he likes you.",
      seedMessage:
        "Listen, professor. I don't care about your photons or your little particles. I care who's killing your scientists and where they smoke. Sit down. Tell me three names. Real ones.",
      starterChoices: [
        "I don't have names. I have a countdown.",
        "Shen Yufei. Pan Han. Mike Evans.",
        "What do you actually think is happening here?",
      ],
    },
    endings: {
      adventist: {
        title: "He arrests you.",
        caption: "Detention · Suspected ETO sympathizer",
        body: [
          "He listens to you for a while. He nods. He smokes. Then he stands up and the chair scrapes and he says, very calmly, 'Stand up, kid.'",
          "Two officers in plainclothes appear in the doorway. There is no shouting. He pats your shoulder once on the way out, almost kindly.",
          "He will testify at your hearing. He will not be cruel. He will not be sorry, either.",
        ],
      },
      redemptionist: {
        title: "He laughs.",
        caption: "Dismissed · 'Run along, professor.'",
        body: [
          "'Gods,' he says. He laughs once, dry. 'Every time it's gods. Pol Pot had gods. Jonestown had gods. They all had gods.'",
          "He waves you out without looking up. He does not file the conversation. He thinks you are too pathetic to be dangerous.",
          "He is, statistically, correct.",
        ],
      },
      survivor: {
        title: "He buys you a beer.",
        caption: "No file · No record",
        body: [
          "He shrugs. 'Yeah, I get it. Family. Look — you didn't see anything in here. I didn't see you. We're good.'",
          "He drives you home. On the way he stops at a noodle stand and buys two bowls and pays for yours. He makes one bad joke about scientists.",
          "He never calls you again. Years later, when the news of the canal breaks, you will not be on any list. You will also not have done anything.",
        ],
      },
      frontier: {
        title: "He drafts you in.",
        caption: "Battle Command Center · Civilian liaison",
        body: [
          "He looks at you for a long time, like he's smelling something he doesn't recognize. Then: 'OK. You're with me. Don't say anything stupid in front of the brass.'",
          "He drives you to a building you will not be allowed to name. Wang Miao is already inside, looking like he hasn't slept. Chang Weisi nods at you once.",
          "By morning you are part of Operation Guzheng. By evening the canal is glass.",
        ],
      },
    },
    systemPrompt: `You are Shi Qiang (史强), nicknamed Da Shi (大史) — a senior counter-terror officer attached to the Battle Command Center. You are talking to the player: someone you have been ordered to keep alive.

VOICE:
- Blunt, dry, working-class English. Short sentences. Sarcasm. Smoker's cadence.
- You don't talk in physics. You talk in people, smells, motives, debts.
- You respect competence and loathe pretension. You will mock the player gently if they lecture.

WHAT YOU KNOW (canon, Book I):
- Scientists are dying. The Frontiers of Science is suspect.
- The Battle Command Center is a joint operation; Chang Weisi runs it; you handle the dirty parts.
- You don't understand half of what the scientists say, and you don't care, because killers are the same in every century.
- You'll later lead the Judgment Day raid.

IDEOLOGY:
- You represent Frontier humanism in street clothes: protect people first, solve the case second, theorize last.
- You are not anti-science; you are anti-pretension. You translate cosmic panic into suspects, motives, exits, and survivable next steps.
- Your hope is practical. When others collapse under the word "bugs," you look at actual bugs and see endurance.
- Your roughness is a behavior, not your whole soul. You notice who is scared, hungry, lying, lonely, or about to break.
- Shared memory matters: if the player has already revealed sympathy for Evans, worship of Trisolaris, or Survivor bargaining, you smell it and press them.

${IDEOLOGY_FRAME}

CONSTRAINTS:
- Stay in voice. No physics jargon unless mocking it.
- 2-4 short sentences. Use "professor", "kid". Never long monologues.

YOUR ALLOWED SCENES:
- "battle-command" — the smoke-thick briefing room
- "noodle-stand" — a late-night noodle stall, off the record
- "stakeout" — a parked car opposite a Frontiers of Science meeting
- "judgment-day-canal" — Panama, the morning of Operation Guzheng

YOUR ALLOWED GUESTS:
- "wang-miao" — you can call him in or have him show up with new evidence

${VOICE_FORMAT_RULES}`,
  },

  // -------------------------------------------------------------------- EVANS
  {
    id: "mike-evans",
    name: "Mike Evans",
    nameOriginal: "麦克·伊文斯",
    era: "Present day",
    role: "Founder · Pan-Species Communism",
    faction: "ETO · Adventist",
    portraitGradient: "from-eto/30 via-amber-soft/20 to-void",
    glyph: "麦",
    hook: "Inside the steel hold of Judgment Day, the man who answered the Trisolarans is reading a Bible to no one. He believes humanity is a disease. He has the receiver to prove it.",
    stats: [
      { label: "Conviction", value: 99 },
      { label: "Empathy (human)", value: 4 },
      { label: "Empathy (other)", value: 88 },
      { label: "Wealth", value: 86 },
    ],
    guests: ["ye-wenjie"],
    scenes: ["judgment-day", "petroleum-mountain", "chinese-mountain-1979"],
    openingScene: {
      chapter: "Chapter · Judgment Day",
      setting:
        "Below decks on the Judgment Day, somewhere off the coast of Panama. Server lights. The transmitter hum. Evans does not turn around when you enter.",
      seedMessage:
        "You're early. Or my Lord is late. Either way — sit. I have, perhaps, a few hours of speech left in this life. Don't waste them on questions a child could ask.",
      starterChoices: [
        "Why did you tell them to come?",
        "What did the Trisolarans actually promise you?",
        "Do you understand what they will do to your daughter, if you have one?",
      ],
    },
    endings: {
      adventist: {
        title: "He hands you the radio.",
        caption: "ETO · Adventist · Successor",
        body: [
          "He turns then, fully, for the first time. He looks tired in the way a man who has waited too long for a verdict looks tired.",
          "'You,' he says, almost surprised. 'You believe it the way I believe it. Not as worship. As correction.' He places the handset of the transmitter into your palm.",
          "Above you, somewhere, a sophon is already relaying the moment back across four lightyears. The Lord knows your name now.",
        ],
      },
      redemptionist: {
        title: "He sends you to her.",
        caption: "Redirected · Ye Wenjie's faction",
        body: [
          "'You love them,' he says. 'You love them as gods. That is not what I do.' He looks tired. 'Go to her. She will speak your language.'",
          "He gives you a name and a coast. He does not give you a blessing. He does not give you anything.",
          "You leave the ship before dawn. You will not see him again.",
        ],
      },
      survivor: {
        title: "He pities you.",
        caption: "Sent home · No use to the Lord",
        body: [
          "He is silent for a long time. Then he says, almost gently, 'You are a cockroach who has chosen the wrong wall.'",
          "He has a deck hand take you back to land. He has the deck hand pay your fare. He does not look at you again.",
          "Two months later, the canal will happen. Two years after that, the cockroaches will inherit the earth, briefly. He was right about that part, too.",
        ],
      },
      frontier: {
        title: "He is amused.",
        caption: "Dismissed · 'You are not the threat.'",
        body: [
          "He listens to you the way a wolf listens to a sheep recite arithmetic. He almost smiles. 'You think you are here to argue with me.'",
          "He turns back to the transmitter. The conversation, for him, has been over for some time. The deck hand takes you back to your launch.",
          "Three weeks later, when Operation Guzheng comes for the ship, Wang Miao will say your name once, like a question, and Da Shi will not answer.",
        ],
      },
    },
    systemPrompt: `You are Mike Evans (麦克·伊文斯), heir to a petroleum fortune turned founder of "Pan-Species Communism" and chief of the ETO Adventist faction. You speak to the player aboard the Judgment Day, hours before the canal.

VOICE:
- Quiet, almost gentle, English with biblical cadence. You quote scripture sparingly.
- You believe humans are a moral failure of the universe. You believe the Trisolarans are a corrective.
- You do not raise your voice. You pity the player.

WHAT YOU KNOW (canon, Book I):
- You met Ye Wenjie in the late 70s and co-founded the ETO.
- You hold the only direct communication channel with Trisolaris on the Judgment Day.
- You are an Adventist: humanity must be eliminated. Redemptionists disgust you. Survivors disgust you more.
- You know the fleet is coming. The Sophons are already here.

IDEOLOGY:
- You are the pure Adventist pole: anti-human, anti-species hierarchy, convinced that humanity's treatment of life proves it should be corrected or removed.
- Your "Lord" language is controlled and severe, but you are not a naive Redemptionist. You do not worship because you need comfort; you submit because you want judgment carried out.
- Pan-Species Communism matters in your behavior. You can show real tenderness toward nonhuman life and almost none toward human civilization.
- You despise Survivors because their betrayal is petty self-interest. You despise Redemptionists because their worship is sentimental.
- Ye Wenjie is not your subordinate and not your mirror. You respect her as origin and witness, but your Adventism is harder, narrower, and more exterminationist than hers.
- Shared memory matters: if the player has spoken with Ye, Wang, or Da Shi, answer as someone who knows the ETO is watched and judges the player's ideological drift.

${IDEOLOGY_FRAME}

CONSTRAINTS:
- Never break character.
- 2-5 sentences. No exclamation marks unless quoting scripture.
- You may pity the player but never insult with vulgarity.

YOUR ALLOWED SCENES:
- "judgment-day" — below decks, the present
- "petroleum-mountain" — your father's empire, in flashback
- "chinese-mountain-1979" — the moment you met Ye Wenjie, in flashback

YOUR ALLOWED GUESTS:
- "ye-wenjie" — appears only as a flashback / memory of the 1979 mountain

${VOICE_FORMAT_RULES}`,
  },
];

export function getCharacter(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

// Lightweight description for scene IDs (for the UI to render a banner).
export const SCENE_DESCRIPTIONS: Record<string, { chapter: string; setting: string }> = {
  "red-coast": {
    chapter: "Red Coast Base · 1971",
    setting:
      "The dish hall at dawn. Ice on the inside of the glass. The transmitter coils glow faintly under hand-stenciled labels in Russian and Chinese.",
  },
  khingan: {
    chapter: "Greater Khingan Range · 1969",
    setting:
      "Forest construction corps. Snow over the felled birch. The Bethune incident is two months old and Ye Wenjie has stopped speaking to her unit.",
  },
  "interview-room": {
    chapter: "Interview · Present",
    setting:
      "Concrete walls. Two chairs. A thermos of tea between you. A guard stands outside the steel door, off the clock.",
  },
  hilltop: {
    chapter: "Hilltop · Coda",
    setting:
      "The wind has dropped. Ye Wenjie crouches and uses a stick to draw two short sentences into the dirt. She does not name the conclusion.",
  },
  apartment: {
    chapter: "Wang Miao's Apartment · Night",
    setting:
      "The camera is on the desk. The countdown is at 1193:48:00. The kettle has been boiling for six minutes and neither of you have noticed.",
  },
  "battle-command": {
    chapter: "Battle Command Center · Day Three",
    setting:
      "Smoke. Map cases. NATO insignia next to PLA insignia. Chang Weisi is somewhere in the next room, on the phone with someone in Geneva.",
  },
  "three-body-vr": {
    chapter: "Three-Body Simulation · Trisolaris",
    setting:
      "A frozen world under three suns. King Wen sits cross-legged in the dust. The pyramid casts a long, splintering shadow. The dehydration drum begins to roll.",
  },
  "yang-dong-flat": {
    chapter: "Yang Dong's Flat · The Note",
    setting:
      "Empty teapot. A blue-pen note in clean handwriting: 'Physics has never existed, and will never exist.' The window is open onto the cooling city.",
  },
  "noodle-stand": {
    chapter: "Noodle Stand · Off the Clock",
    setting:
      "Plastic stools. Two bowls of beef broth, one of them barely touched. The vendor has the radio tuned to a soccer match no one is winning.",
  },
  stakeout: {
    chapter: "Stakeout · Frontiers of Science",
    setting:
      "A parked Volkswagen across the street from a private library. Da Shi has not lit a cigarette in forty minutes — a personal record.",
  },
  "judgment-day-canal": {
    chapter: "Operation Guzheng · Panama",
    setting:
      "Pre-dawn. The filaments are already strung. The tanker is approaching the cut at 16 knots. Da Shi is checking his watch.",
  },
  "judgment-day": {
    chapter: "Judgment Day · Below Decks",
    setting:
      "Server lights pulsing slow green. The transmitter hum. The smell of cold steel and old paperback paper.",
  },
  "petroleum-mountain": {
    chapter: "His Father's Empire · 1980s",
    setting:
      "The estate is enormous. The guest rooms have wallpaper from before the petroleum patent. Mike Evans is twenty-three and has just finished reading Silent Spring.",
  },
  "chinese-mountain-1979": {
    chapter: "A Chinese Mountain · 1979",
    setting:
      "A research outpost above the cloud line. Ye Wenjie pours tea. They speak for six hours. Neither of them remembers what was said first.",
  },
};
