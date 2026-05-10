# CONTINUITY.md

## Snapshot
- Goal: Upgrade to 3D Three.js simulation, source-informed ideology prompts, shared memory/timeline, player goal, compact context, and polished UI.
- Now: 2026-05-10T14:06:48-07:00 [CODE]: World Book timeline/goal and UI polish complete; build and route checks pass.
- Next: 2026-05-10 [USER]: Try the updated app locally at `http://localhost:3000`.
- Open questions: None.

## Invariants / Constraints
- 2026-05-10 [USER]: Character agents must share memory across conversations.
- 2026-05-10 [USER]: Front-page three-body model should be a real simulation, not fixed decorative orbits.
- 2026-05-10 [USER]: Timeline events should be forced every example 10 turns.
- 2026-05-10 [USER]: Context should auto-compact every 5 turns and compaction must not count as a turn.
- 2026-05-10 [USER]: Ye Wenjie should be represented as more complicated than a pure Adventist, with transition defined by turns.
- 2026-05-10 [USER]: Three-body balls should be smaller, trajectories removed, and motion kept inside the visible area.
- 2026-05-10 [USER]: World Book must connect to the turn timeline; player goal is to stop destruction of the human world.
- 2026-05-10 [USER]: Play header Rewind/Switch controls should fit cleanly on one line; character picker Begin arrow position should be fixed.
- 2026-05-10 [CODE]: Preserve Next.js App Router structure and localStorage-only persistence unless user asks for backend storage.

## Decisions
- D001 ACTIVE 2026-05-10 [CODE]: Use browser localStorage for shared memory because the existing app stores sessions/decision history locally.
- D002 ACTIVE 2026-05-10 [CODE]: Treat one player message as one global turn for forced timeline cadence.
- D003 ACTIVE 2026-05-10 [CODE]: Forced timeline events advance through `TIMELINE` every 10 global player turns and are injected into the next character reply.
- D004 ACTIVE 2026-05-10 [CODE]: Use Three.js directly for the front-page 3D scene; keep gravitational integration in `three-body-physics.ts`.
- D005 ACTIVE 2026-05-10 [CODE]: Auto context compaction is deterministic/client-side every 5 user turns and sent as a separate API context block.

## State
### Done (recent)
- 2026-05-10 [TOOL]: Read `web/AGENTS.md` and relevant local Next docs for client/server components and route handlers.
- 2026-05-10 [CODE]: Added `shared-memory.ts` localStorage store for cross-character memory and forced timeline cadence.
- 2026-05-10 [CODE]: Added `TimelineBar.tsx` and timeline transcript turns in play/story views.
- 2026-05-10 [CODE]: Replaced decorative `ThreeBodyOrbit.tsx` with velocity-Verlet Newtonian equal-mass simulation.
- 2026-05-10 [CODE]: Extracted `TurnRows.tsx` so `PlaySurface.tsx` is smaller than before this task.
- 2026-05-10 [TOOL]: Added `three`, `@types/three`, and `playwright` packages.
- 2026-05-10 [CODE]: Replaced 2D canvas orbit with interactive Three.js 3D gravity scene and 3D trails.
- 2026-05-10 [CODE]: Added `context-compact.ts` and API support for compacted context every 5 player turns.
- 2026-05-10 [CODE]: Updated character prompts with explicit ideology frames and Ye's turn-based transition.
- 2026-05-10 [CODE]: Enlarged Rewind and Switch Character controls in the play header.
- 2026-05-10 [CODE]: Made 3D balls smaller, removed trajectory lines, and added damped bounds to keep bodies in view.
- 2026-05-10 [CODE]: Connected World Book page to shared global turn/timeline state and added explicit player goal.
- 2026-05-10 [CODE]: Resized play header Rewind/Switch controls and fixed character picker Begin arrow alignment.

### Now
- 2026-05-10 [CODE]: No active implementation.

### Next
- 2026-05-10 [USER]: Review behavior in browser.

## Working set
- `web/src/app/api/chat/route.ts`
- `web/src/app/play/[character]/PlaySurface.tsx`
- `web/src/app/play/[character]/TurnRows.tsx`
- `web/src/app/story/[character]/StoryView.tsx`
- `web/src/app/world/WorldBookView.tsx`
- `web/src/app/characters/page.tsx`
- `web/src/app/decisions/DecisionsView.tsx`
- `web/src/components/TimelineBar.tsx`
- `web/src/components/ThreeBodyOrbit.tsx`
- `web/src/lib/three-body-physics.ts`
- `web/src/lib/context-compact.ts`
- `web/src/lib/shared-memory.ts`
- `web/src/lib/sessions.ts`
- `web/src/lib/characters.ts`
- `web/package.json`
- `web/package-lock.json`
- `web/README.md`
- `CONTINUITY.md`

## Open questions
- None.

## Incidents
- None.

## Receipts
- 2026-05-10 [TOOL]: `Get-Date -Format o` -> `2026-05-10T13:10:32.3644874-07:00`.
- 2026-05-10 [TOOL]: `npm.cmd run build` -> passed after allowing font fetch; routes generated successfully.
- 2026-05-10 [TOOL]: `Invoke-WebRequest http://localhost:3000` -> HTTP 200.
- 2026-05-10 [TOOL]: `Invoke-WebRequest http://localhost:3000/api/chat` POST -> HTTP 200 in mock mode.
- 2026-05-10 [TOOL]: `npm.cmd run build` -> passed after Three.js/context compaction changes.
- 2026-05-10 [TOOL]: Playwright desktop/mobile screenshots in `web/.playwright-verify`; WebGL colored pixels desktop=10514, mobile=7194.
- 2026-05-10 [TOOL]: Playwright WebGL checksum changed over time (`122425870` -> `868150188`), confirming motion.
- 2026-05-10 [TOOL]: `npm.cmd audit --audit-level=moderate` -> 2 moderate advisories via Next.js transitive `postcss`; available fix would force a breaking Next downgrade.
- 2026-05-10 [TOOL]: `npm.cmd run build` -> passed after smaller bounded no-trail simulation change.
- 2026-05-10 [TOOL]: `Invoke-WebRequest http://localhost:3000` -> HTTP 200 after latest change.
- 2026-05-10 [TOOL]: `npm.cmd run build` -> passed after World Book/controls/character picker UI changes.
- 2026-05-10 [TOOL]: `Invoke-WebRequest` for `/world`, `/characters`, `/play/ye-wenjie` -> HTTP 200.
