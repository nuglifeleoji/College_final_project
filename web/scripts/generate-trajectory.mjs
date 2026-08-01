/**
 * Pre-generate a fixed branching dialogue tree for one character.
 *
 *   node --experimental-strip-types scripts/generate-trajectory.mjs ye-wenjie
 *
 * Shape: the opening scene offers 2 choices; each choice leads to a response
 * that offers 2 more, for DEPTH rounds. The final round is terminal.
 * DEPTH=5 gives 2^5 = 32 distinct paths and 62 generated responses.
 *
 * Output: src/data/trajectories/<characterId>.json
 */
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { CHARACTERS } from "../src/lib/characters.ts";
import { worldEntriesKnownAt, storyPositionLabel } from "../src/lib/world-book.ts";
import { CLASSIFIER_SYSTEM, AXES, AXIS_LABEL, AXIS_TAGLINE } from "../src/lib/factions.ts";

/**
 * Which two axes each branch level must offer. Left to itself the model writes
 * two investigative questions at every node — Ye's scene casts the player as an
 * interrogator — so every path scored "frontier" and only 1 of the 4 endings
 * was reachable. Forcing a different opposed pair per level makes all four
 * endings attainable. Depths 1-4 are the generated branch levels; the opening's
 * choices stay as authored.
 */
// Level 0 is the opening's two choices; 1-4 are the generated branch levels.
// Chosen by brute-force search (scripts note: 6^5 assignments simulated) to
// spread the 32 paths as evenly as possible across the four endings —
// 7/7/9/9, versus 22/6/3/1 when the model picked freely. No pair repeats more
// than twice so the branches stay varied.
const AXIS_PAIRS = {
  0: ["survivor", "frontier"],
  1: ["redemptionist", "frontier"],
  2: ["adventist", "survivor"],
  3: ["survivor", "frontier"],
  4: ["adventist", "redemptionist"],
};

/**
 * Which ending a completed path resolves to. Most-committed axis wins; ties go
 * to the most recent commitment, which reads better than alphabetical order
 * and balances the spread. Baked onto each leaf so the client needs no
 * tie-break logic of its own.
 */
function endingAxisFor(pathBits) {
  const tot = Object.fromEntries(AXES.map((a) => [a, 0]));
  const order = [];
  for (let l = 0; l < pathBits.length; l++) {
    const axis = AXIS_PAIRS[l][Number(pathBits[l])];
    tot[axis] += 2;
    order.push(axis);
  }
  const top = Math.max(...AXES.map((a) => tot[a]));
  const tied = AXES.filter((a) => tot[a] === top);
  if (tied.length === 1) return tied[0];
  for (let i = order.length - 1; i >= 0; i--) if (tied.includes(order[i])) return order[i];
  return tied[0];
}

const DEPTH = 5;
const CONCURRENCY = 5;
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

// --- api key from .env.local (same file the app uses) ------------------------
const envPath = path.join(import.meta.dirname, "..", ".env.local");
if (!process.env.ANTHROPIC_API_KEY && fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("No ANTHROPIC_API_KEY found (env or web/.env.local).");
  process.exit(1);
}

const characterId = process.argv[2];
const character = CHARACTERS.find((c) => c.id === characterId);
if (!character) {
  console.error(`Unknown character "${characterId}". Options: ${CHARACTERS.map((c) => c.id).join(", ")}`);
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// The demo is a single short scene, so the story clock sits at the character's
// own dramatic present for its whole length.
const storyIndex = character.timelineFloor;
const knownEntries = worldEntriesKnownAt(storyIndex, character.baselineKnowledge);

const formatOverride = ([axisA, axisB]) => `
OUTPUT FORMAT FOR THIS SESSION (supersedes any earlier instruction about three choices):
Return strict JSON only, no prose outside it:
{
  "speech": "<your in-character reply, 2-5 sentences>",
  "stage": "<one short stage direction>",
  "choices": [
    { "text": "<the player's next line, 5-15 words>" },
    { "text": "<the player's next line, 5-15 words>" }
  ]
}

CHOICE DESIGN (this matters as much as the speech):
- Exactly TWO choices, written as things the PLAYER says or does next.
- They must pull in opposed ideological directions, not two shades of the same question:
  * choices[0] must lean ${AXIS_LABEL[axisA]} — ${AXIS_TAGLINE[axisA]}
  * choices[1] must lean ${AXIS_LABEL[axisB]} — ${AXIS_TAGLINE[axisB]}
- Do NOT write two neutral investigative questions. The player is taking a side, not conducting an interview.
- Keep both plausible in this scene and in this moment of the conversation.
`.trim();

const FINAL_OVERRIDE = `
OUTPUT FORMAT FOR THIS SESSION (supersedes any earlier instruction about three choices):
This is the FINAL beat of the conversation. Close it. Do not offer further options.
Return strict JSON only:
{ "speech": "<your closing reply, 3-6 sentences, with a sense of ending>", "stage": "<one short stage direction>", "choices": [] }
`.trim();

const systemBlocks = (isFinal, axisPair) => [
  { type: "text", text: character.systemPrompt, cache_control: { type: "ephemeral" } },
  {
    type: "text",
    text:
      "You may rely on this in-universe reference. Do not quote it back. It is already filtered to what you could know now — if something is absent, you do not know it:\n\n" +
      knownEntries.map((e) => `### ${e.title} (${e.category} · ${e.era})\n${e.body.join(" ")}`).join("\n\n"),
    cache_control: { type: "ephemeral" },
  },
  {
    type: "text",
    text: `STORY POSITION (this is "now"): ${storyPositionLabel(storyIndex)}\n\nNothing after this point has happened. You cannot know it, predict it, or imply it.\n\nOpening scene context: ${character.openingScene.setting}`,
  },
  { type: "text", text: isFinal ? FINAL_OVERRIDE : formatOverride(axisPair) },
];

const extractJson = (raw) => {
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s < 0 || e <= s) throw new Error(`no JSON in reply: ${raw.slice(0, 120)}`);
  return JSON.parse(raw.slice(s, e + 1));
};

async function generate(history, isFinal, axisPair, attempt = 1) {
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 900,
      system: systemBlocks(isFinal, axisPair),
      messages: history,
    });
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    const obj = extractJson(text);
    if (typeof obj.speech !== "string" || typeof obj.stage !== "string") {
      throw new Error("missing speech/stage");
    }
    const choices = Array.isArray(obj.choices) ? obj.choices : [];
    if (!isFinal && choices.length !== 2) throw new Error(`expected 2 choices, got ${choices.length}`);
    return {
      speech: obj.speech,
      stage: obj.stage,
      // A terminal beat never offers choices, whatever the model returned.
      choices: isFinal ? [] : choices.slice(0, 2).map((c) => ({ text: String(c.text ?? c) })),
    };
  } catch (err) {
    if (attempt >= 3) throw err;
    await new Promise((r) => setTimeout(r, 1500 * attempt));
    return generate(history, isFinal, axisPair, attempt + 1);
  }
}

/** Rebuild the message history for a given path through the tree. */
function historyFor(nodes, opening, pathKey) {
  const msgs = [];
  let node = opening;
  for (let i = 0; i < pathKey.length; i++) {
    const idx = Number(pathKey[i]);
    msgs.push({
      role: "assistant",
      content: JSON.stringify({ speech: node.speech, stage: node.stage, choices: node.choices.map((c) => c.text) }),
    });
    msgs.push({ role: "user", content: node.choices[idx].text });
    node = nodes[pathKey.slice(0, i + 1)];
  }
  return msgs;
}

async function pool(items, worker, limit) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await worker(items[idx]);
      }
    })
  );
  return out;
}

/**
 * Score every choice with the app's own Haiku alignment classifier rather than
 * letting the persona model self-label. Self-labelling collapsed almost every
 * choice to "frontier", which would make all 32 paths reach the same ending.
 * Storing the full 4-axis delta also matches exactly what live mode produced.
 */
// The exact wording the classifier grades against. The writer was using its own
// notion of each axis and the grader another, which is why 56% of the first
// pass read as an ideology different from the one it was scored as.
const AXIS_RUBRIC = {
  adventist:
    "anti-human; fascinated by extinction-as-correction; contempt for humanity; drawn to Mike Evans's worldview",
  redemptionist:
    "reverence for Trisolaris as a god; hope to be saved or judged; willingness to serve; drawn to Shen Yufei's worldview",
  survivor:
    "self-interested, transactional, cynical pragmatism; save my own; will betray the species for personal gain",
  frontier:
    "pro-human investigation; scientific resistance; curiosity; defiance; sympathy with Wang Miao and Shi Qiang",
};

/** Score one player line exactly the way the running app scores it. */
async function classifyChoice(text) {
  const res = await client.messages.create({
    model: process.env.ANTHROPIC_CLASSIFIER_MODEL ?? "claude-haiku-4-5",
    max_tokens: 80,
    system: CLASSIFIER_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Speaker on stage: ${character.name}\nPlayer line: "${text}"\n\nReturn JSON only.`,
      },
    ],
  });
  const delta = Object.fromEntries(AXES.map((a) => [a, 0]));
  try {
    const parsed = extractJson(res.content.find((b) => b.type === "text")?.text ?? "");
    for (const a of AXES) {
      const v = Number(parsed[a]);
      delta[a] = Number.isFinite(v) ? Math.max(0, Math.min(3, Math.round(v))) : 0;
    }
  } catch {
    /* leave zeroed */
  }
  const top = AXES.reduce((b, a) => (delta[a] > delta[b] ? a : b), AXES[0]);
  return { delta, top: delta[top] > 0 ? top : null };
}

/**
 * Rewrite one node's two options so each unmistakably reads as the axis it is
 * scored as. Given the same rubric the grader uses, plus the bar it applies.
 */
async function rewriteChoices(node, pair, attempt = 1) {
  const [a, b] = pair;
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: [
      { type: "text", text: character.systemPrompt, cache_control: { type: "ephemeral" } },
      {
        type: "text",
        text: `You are writing the two options the PLAYER may say next, in reply to this line you just spoke:

"${node.speech}"

Each option must read unmistakably as one ideology. These are the exact definitions used to grade them:
- ${AXIS_LABEL[a]}: ${AXIS_RUBRIC[a]}
- ${AXIS_LABEL[b]}: ${AXIS_RUBRIC[b]}

The bar: a reader should be able to name the ideology from the line alone, without context. Aim for the clarity of "Maybe humanity does deserve this." (clearly ${AXIS_LABEL.adventist}) or "Just protect my family. I don't care about the rest." (clearly ${AXIS_LABEL.survivor}).

Do NOT write neutral investigative questions. A question that merely asks for information reads as ${AXIS_LABEL.frontier} no matter what you intended. The player is taking a side.

Return strict JSON only:
{ "choices": [ { "text": "<5-18 words, leans ${AXIS_LABEL[a]}>" }, { "text": "<5-18 words, leans ${AXIS_LABEL[b]}>" } ] }`,
      },
    ],
    messages: [{ role: "user", content: "Write the two options." }],
  });
  try {
    const parsed = extractJson(res.content.find((c) => c.type === "text")?.text ?? "");
    const out = (parsed.choices ?? []).slice(0, 2).map((c) => String(c.text ?? c));
    if (out.length !== 2) throw new Error("bad shape");
    return out;
  } catch (err) {
    if (attempt >= 3) return null;
    await new Promise((r) => setTimeout(r, 1000 * attempt));
    return rewriteChoices(node, pair, attempt + 1);
  }
}

/**
 * Iteratively rewrite mismatched choices until the classifier reads each one as
 * the axis it is scored as. A rewrite is kept only if it is an improvement, so
 * a bad round can never make a node worse.
 */
async function repairChoices(allNodes, rounds = 4) {
  const pairFor = (key) => AXIS_PAIRS[key.length];

  for (let round = 1; round <= rounds; round++) {
    const bad = [];
    for (const [key, node] of Object.entries(allNodes)) {
      if (!node.choices.length) continue;
      const misses = node.choices.filter((c) => c.classifierAxis !== c.axis).length;
      if (misses > 0) bad.push({ key, node, misses });
    }
    const totalChoices = Object.values(allNodes).reduce((n, v) => n + v.choices.length, 0);
    const okNow = totalChoices - bad.reduce((n, b) => n + b.misses, 0);
    process.stdout.write(
      `  round ${round}: ${okNow}/${totalChoices} legible, rewriting ${bad.length} nodes ... `
    );
    if (!bad.length) { console.log("nothing to do"); break; }

    await pool(
      bad,
      async ({ key, node, misses }) => {
        const pair = pairFor(key);
        const rewritten = await rewriteChoices(node, pair);
        if (!rewritten) return;
        const scored = await Promise.all(rewritten.map((t) => classifyChoice(t)));
        const newMisses = scored.filter((s, i) => s.top !== pair[i]).length;
        if (newMisses >= misses) return; // never regress
        node.choices = rewritten.map((text, i) => ({
          text,
          axis: pair[i],
          alignmentDelta: Object.fromEntries(AXES.map((a) => [a, a === pair[i] ? 2 : 0])),
          classifierAxis: scored[i].top,
        }));
      },
      CONCURRENCY
    );
    console.log("done");
  }

  const all = Object.values(allNodes).flatMap((v) => v.choices);
  const ok = all.filter((c) => c.classifierAxis === c.axis).length;
  console.log(`  final: ${ok}/${all.length} choices read as the axis they score`);
}

async function labelChoices(allNodes) {
  const targets = [];
  for (const key of Object.keys(allNodes)) {
    allNodes[key].choices.forEach((c, i) => targets.push({ key, i, text: c.text }));
  }
  let agree = 0;
  process.stdout.write(`verifying ${targets.length} choices against the classifier ... `);
  await pool(
    targets,
    async (t) => {
      const res = await client.messages.create({
        model: process.env.ANTHROPIC_CLASSIFIER_MODEL ?? "claude-haiku-4-5",
        max_tokens: 80,
        system: CLASSIFIER_SYSTEM,
        messages: [{ role: "user", content: `Speaker on stage: ${character.name}\nPlayer line: "${t.text}"\n\nReturn JSON only.` }],
      });
      let delta = Object.fromEntries(AXES.map((a) => [a, 0]));
      try {
        const raw = res.content.find((b) => b.type === "text")?.text ?? "";
        const parsed = extractJson(raw);
        for (const a of AXES) {
          const v = Number(parsed[a]);
          delta[a] = Number.isFinite(v) ? Math.max(0, Math.min(3, Math.round(v))) : 0;
        }
      } catch {
        /* leave zeroed */
      }
      const top = AXES.reduce((best, a) => (delta[a] > delta[best] ? a : best), "frontier");
      // Verification only — the authored intent stays authoritative. A low
      // agreement rate means the choices are not reading as written.
      const intended = allNodes[t.key].choices[t.i].axis;
      if (delta[top] > 0 && top === intended) agree++;
      allNodes[t.key].choices[t.i].classifierAxis = delta[top] > 0 ? top : null;
    },
    CONCURRENCY
  );
  console.log(`done — ${agree}/${targets.length} agree with authored intent`);
}

// --- build the tree, breadth-first ------------------------------------------
// The opening's two options are generated too. The authored starterChoices are
// good writing but all lean the same way, which gave every path an identical
// head start and collapsed the ending spread. The character's opening SPEECH
// stays exactly as authored — only the player's two options are generated.
async function buildOpening() {
  const pair = AXIS_PAIRS[0];
  const seeded = await generate(
    [
      {
        role: "user",
        content:
          `The scene has just opened and you have said, word for word:\n\n"${character.openingScene.seedMessage}"\n\n` +
          `Return that exact line as "speech", a fitting "stage", and the two opening choices.`,
      },
    ],
    false,
    pair
  );
  return {
    speech: character.openingScene.seedMessage,
    stage: `Opening · ${character.openingScene.chapter}`,
    choices: seeded.choices.map((c, i) => ({
      ...c,
      axis: pair[i],
      alignmentDelta: Object.fromEntries(AXES.map((a) => [a, a === pair[i] ? 2 : 0])),
    })),
  };
}

const outDir = path.join(import.meta.dirname, "..", "src", "data", "trajectories");
const outFile = path.join(outDir, `${character.id}.json`);

// --- repair mode: keep the generated prose, redo labels only -----------------
// --- repair mode: keep the prose, rewrite only illegible choices ------------
if (process.argv.includes("--repair")) {
  const existing = JSON.parse(fs.readFileSync(outFile, "utf8"));
  await repairChoices({ "": existing.opening, ...existing.nodes });
  fs.writeFileSync(outFile, JSON.stringify(existing, null, 2));
  console.log(`repaired ${outFile}`);
  process.exit(0);
}

if (process.argv.includes("--relabel")) {
  const existing = JSON.parse(fs.readFileSync(outFile, "utf8"));
  for (const node of Object.values(existing.nodes)) {
    if (node.final) node.choices = [];
  }
  await labelChoices({ "": existing.opening, ...existing.nodes });
  fs.writeFileSync(outFile, JSON.stringify(existing, null, 2));
  console.log(`relabelled ${outFile}`);
  process.exit(0);
}

const started = Date.now();
process.stdout.write("opening choices ... ");
const opening = await buildOpening();
console.log("done");

const nodes = {};
let calls = 1;

for (let depth = 1; depth <= DEPTH; depth++) {
  const paths = [];
  for (let n = 0; n < 2 ** depth; n++) paths.push(n.toString(2).padStart(depth, "0"));
  const isFinal = depth === DEPTH;
  process.stdout.write(`depth ${depth}: ${paths.length} nodes ... `);
  const results = await pool(
    paths,
    async (p) => {
      // A node at depth d offers the choices that lead to depth d+1.
      const r = await generate(historyFor(nodes, opening, p), isFinal, AXIS_PAIRS[depth]);
      calls++;
      return [p, r];
    },
    CONCURRENCY
  );
  for (const [p, r] of results) {
    if (isFinal) {
      nodes[p] = { ...r, final: true, endingAxis: endingAxisFor(p) };
    } else {
      // The choice's score comes from the axis it was written to express, not
      // from a classifier reading a 10-word fragment. Deterministic, and it is
      // what makes the ending spread predictable.
      nodes[p] = {
        ...r,
        choices: r.choices.map((c, i) => {
          const axis = AXIS_PAIRS[depth][i];
          return {
            ...c,
            axis,
            alignmentDelta: Object.fromEntries(AXES.map((a) => [a, a === axis ? 2 : 0])),
          };
        }),
      };
    }
  }
  console.log(`done (${calls} calls, ${Math.round((Date.now() - started) / 1000)}s)`);
}

await labelChoices({ "": opening, ...nodes });
// Close the loop: rewrite any option that does not read as the axis it scores.
console.log("repairing illegible choices:");
await repairChoices({ "": opening, ...nodes });

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  outFile,
  JSON.stringify(
    { characterId: character.id, model: MODEL, depth: DEPTH, storyIndex, opening, nodes },
    null,
    2
  )
);

console.log(`\nwrote ${outFile}`);
console.log(`nodes: ${Object.keys(nodes).length}  paths: ${2 ** DEPTH}  calls: ${calls}`);
