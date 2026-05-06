# Three-Body · An Interactive Platform

> "An interactive entry into Liu Cixin's *The Three-Body Problem*. Speak with Ye Wenjie. Sit across from Mike Evans on the deck of the Judgment Day. Bend the timeline — and roll it back."

Final project · Leo & Michael · Book I only.

## Stack

- **Next.js 16 / App Router**, TypeScript, Tailwind v4
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

## The four pages

| Path | What it does |
|---|---|
| `/` | Hero · countdown to the Trisolaran fleet · cast preview |
| `/characters` | Dossier-style picker for Ye Wenjie / Wang Miao / Shi Qiang / Mike Evans |
| `/play/[character]` | The dialogue surface · Claude-driven persona · 3 branching choices + free text |
| `/world` | World Book + Timeline · everything the system pulls into character context |
| `/decisions` | Decision tree of every line you took, with rewind |

## How a turn works

1. Player picks one of the three offered choices (or types their own line).
2. Browser POSTs to `/api/chat` with `{ characterId, messages }`.
3. The route assembles a system prompt (per-character voice + the World Book) and calls Claude with **prompt caching** on the heavy blocks so the system message is cached between turns.
4. Claude returns strict JSON: `{ speech, stage, choices }`.
5. The UI renders `speech` as a typewriter, `stage` as a small italic direction, and the three new choices as branch cards.
6. The player's line is appended to `localStorage` so `/decisions` can rewind to any earlier node.

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
│   ├── ThreeBodyOrbit.tsx       — orbital motif used in the hero
│   ├── Countdown.tsx            — fleet ETA countdown
│   └── Typewriter.tsx
└── lib/
    ├── characters.ts            — roster + per-character system prompts
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
