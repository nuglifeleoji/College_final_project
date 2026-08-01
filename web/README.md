# Three-Body · An Interactive Platform

> "An interactive entry into Liu Cixin's *The Three-Body Problem*. Speak with Ye Wenjie. Sit across from Mike Evans on the deck of the Judgment Day. Bend the timeline — and roll it back."

Final project · Leo & Michael · Book I only.

## Demo build vs. full version

The public build ships in **demo mode**. Every character reply is
pre-generated into `src/data/trajectories/<character>.json` — the opening plus
five rounds of two branching choices, giving 32 distinct paths through a
six-beat scene and one of four endings, spread 7/7/9/9 across them. Nothing
calls the Claude API at runtime, so the site costs nothing to host and works
with no API key at all. Free-text input is disabled, because there is no model
listening.

The **full version** answers freely through `/api/chat`, runs the whole Book I
timeline with progressive World Book reveals, and carries shared memory across
all four characters. Contact cpwei@stanford.edu for access.

Regenerate a character's tree (needs `ANTHROPIC_API_KEY` in `.env.local`,
~63 calls and about a minute and a half per character):

```bash
node --experimental-strip-types scripts/generate-trajectory.mjs ye-wenjie
```

Delete a character's JSON and that character silently falls back to the live
API route.

## Stack

- **Next.js 16 / App Router**, TypeScript, Tailwind v4
- **Three.js** for the 3D gravitational model on the front page
- **Framer Motion** for transitions
- **Anthropic SDK** — Claude as character agents (Sonnet 4.6 by default)
- All character voices, World Book, and timeline are versioned in `src/lib/`

## Run it

```bash
npm install
cp .env.example .env.local
# add your ANTHROPIC_API_KEY (without it the app runs in mock mode — UI works, characters reply with placeholder text)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Public deployment safety

If you deploy the app with a real `ANTHROPIC_API_KEY`, set
`THREE_BODY_DEMO_ACCESS_CODE` in the host environment. The `/api/chat` route
fails closed in production when a Claude key is present but no access code is
configured. Visitors can browse the static pages, but live character replies
require the access code in the play screen.

The chat route also enforces a small request-size limit and per-instance rate
limit:

```bash
THREE_BODY_RATE_LIMIT=12
THREE_BODY_RATE_WINDOW_MS=60000
THREE_BODY_MAX_REQUEST_BYTES=32000
```

For a truly public launch, keep this in mock mode or add platform-level rate
limits/authentication as well; the built-in rate limit is intentionally
lightweight and only protects each running server instance.

## The four pages

| Path | What it does |
|---|---|
| `/` | Hero · countdown to the Trisolaran fleet · live three-body simulation · cast preview |
| `/characters` | Dossier-style picker for Ye Wenjie / Wang Miao / Shi Qiang / Mike Evans |
| `/play/[character]` | The dialogue surface · Claude-driven persona · 3 branching choices + free text |
| `/world` | World Book + Timeline · everything the system pulls into character context |
| `/decisions` | Decision tree of every line you took, with rewind |

## How a turn works

1. Player picks one of the three offered choices (or types their own line).
2. The browser records the line in shared localStorage memory, increments the global turn counter, and triggers the next forced timeline event every 10 player turns.
3. Browser POSTs to `/api/chat` with `{ characterId, activeCharacterId, messages, sharedMemory, forcedTimelineEvent }`.
4. Every 5 player turns, the client compacts older conversation context into a summary. This compaction does not increment the story turn.
5. The route assembles a system prompt (per-character voice + the World Book + shared cross-character memory + compacted conversation context) and calls Claude with **prompt caching** on the heavy canon blocks.
6. Claude returns strict JSON: `{ speech, stage, choices, event }`.
7. The UI renders `speech` as a typewriter, `stage` as a small italic direction, timeline events as global event cards, and the three new choices as branch cards.
8. The player's line is appended to `localStorage` so `/decisions` can rewind to any earlier node.

## Files worth knowing

```
src/
├── app/
│   ├── page.tsx                 — landing
│   ├── characters/page.tsx      — picker
│   ├── play/[character]/        — dialogue surface
│   ├── world/                   — World Book + timeline
│   ├── decisions/               — rewind / branch view
│   └── api/chat/route.ts        — Claude API endpoint
├── components/
│   ├── Starfield.tsx            — canvas particle field, parallax + twinkle
│   ├── Nav.tsx
│   ├── ThreeBodyOrbit.tsx       — interactive 3D Newtonian three-body simulation
│   ├── TimelineBar.tsx          — global forced-timeline progress
│   ├── Countdown.tsx            — fleet ETA countdown
│   └── Typewriter.tsx
└── lib/
    ├── characters.ts            — roster + per-character system prompts
    ├── context-compact.ts       — 5-turn auto context compaction
    ├── three-body-physics.ts    — 3D n-body integration
    ├── shared-memory.ts         — shared cross-character memory + forced timeline cadence
    ├── sessions.ts              — per-character localStorage sessions
    ├── world-book.ts            — entries + timeline events
    └── plot-tree.ts             — localStorage-backed decision history
```

## Adding a character

Append to `CHARACTERS` in `src/lib/characters.ts`. Required fields include
`systemPrompt` (the voice contract — keep the strict JSON output instruction)
and `openingScene` (chapter, setting, seed line, three starter choices).

## Notes on the voice contract

Every character system prompt requires Claude to reply only with:

```json
{
  "speech": "<2-5 sentences in voice>",
  "stage": "<one short stage direction>",
  "choices": ["<choice 1>", "<choice 2>", "<choice 3>"]
}
```

If Claude breaks the contract the route falls back to surfacing the raw text
under the character's voice with three generic recovery choices, so the UI
never deadlocks.

## Spoilers

The system prompts and the World Book are scoped to **Book I**. They will
not volunteer Dark Forest deterrence, the Wallfacers, droplets, or anything
post-novel-1 unless the player explicitly references them.

## License of the source material

All characters, factions, and concepts © Liu Cixin / 刘慈欣. This is an academic
interactive reading and is not affiliated with the rights holders.
