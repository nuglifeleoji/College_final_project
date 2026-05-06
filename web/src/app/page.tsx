import Link from "next/link";
import ThreeBodyOrbit from "@/components/ThreeBodyOrbit";
import Countdown from "@/components/Countdown";
import { CHARACTERS } from "@/lib/characters";

export default function Home() {
  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 scanlines pointer-events-none opacity-40" />
        <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-20 md:pt-28 pb-20 md:pb-32 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 relative z-10">
            <div className="flex items-center gap-3 mb-7">
              <span className="w-2 h-2 rounded-full bg-eto-glow shadow-[0_0_10px_rgba(255,45,79,0.9)]" />
              <span className="font-mono text-[11px] tracking-[0.36em] uppercase text-eto-glow">
                Transmission · Open
              </span>
              <span className="hairline flex-1 max-w-[180px]" />
            </div>

            <h1 className="font-display font-medium leading-[0.95] text-[3.6rem] md:text-[5.4rem] lg:text-[6.4rem] tracking-tight text-parchment">
              Do not <span className="italic text-eto-glow text-glow-eto">answer</span>.<br />
              <span className="text-parchment-dim">Do not answer.</span><br />
              <span className="text-parchment-dim/70">Do not answer.</span>
            </h1>

            <p className="mt-9 max-w-2xl text-parchment-dim text-lg md:text-xl leading-relaxed">
              An interactive entry into Liu Cixin&apos;s{" "}
              <span className="text-amber italic">The Three-Body Problem</span>.
              Choose your character. Speak with Ye Wenjie. Sit across from Mike Evans
              on the deck of the Judgment Day. Bend the timeline — and roll it back
              when the future you reach is one you can&apos;t live with.
            </p>

            <div className="mt-10 flex flex-wrap gap-4 items-center">
              <Link
                href="/begin"
                className="group relative inline-flex items-center gap-3 px-7 py-4 bg-eto text-parchment font-mono text-xs tracking-[0.28em] uppercase hover:bg-eto-glow transition-colors shadow-[0_0_28px_rgba(200,16,46,0.35)]"
              >
                <span>▶ Begin the story</span>
                <span aria-hidden className="text-base">→</span>
              </Link>
              <Link
                href="/characters"
                className="inline-flex items-center gap-3 px-6 py-4 border border-line hover:border-amber/60 text-parchment-dim hover:text-amber font-mono text-xs tracking-[0.28em] uppercase transition-colors"
              >
                Skip intro · pick character
              </Link>
            </div>

            <div className="mt-14 flex flex-col gap-2">
              <span className="font-mono text-[10px] tracking-[0.36em] uppercase text-mute">
                First Trisolaran Fleet · Estimated Arrival
              </span>
              <Countdown />
            </div>
          </div>

          <div className="lg:col-span-5 relative z-10 flex flex-col items-center lg:items-end gap-10">
            <div className="relative">
              <ThreeBodyOrbit size={420} className="hidden md:block" />
              <ThreeBodyOrbit size={280} className="md:hidden" />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.36em] text-mute uppercase">
                α Centauri · 4.243 ly
              </div>
            </div>

            <div className="w-full max-w-md border border-line bg-panel/60 backdrop-blur-sm">
              <div className="px-5 py-3 border-b border-line flex items-center justify-between font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
                <span>Intercept · 1379</span>
                <span className="text-eto-glow">●</span>
              </div>
              <div className="px-5 py-5 font-mono text-sm leading-relaxed text-parchment-dim">
                <p className="text-amber-soft">
                  &gt; This world has received your message.
                </p>
                <p>&gt; I am a pacifist of this world.</p>
                <p>&gt; It is the luck of your civilization that I am</p>
                <p>&gt;&nbsp;&nbsp;the first to receive your message.</p>
                <p className="mt-3 text-eto-glow">&gt; Do not answer.</p>
                <p className="text-eto-glow">&gt; Do not answer.</p>
                <p className="text-eto-glow caret">&gt; Do not answer</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="hairline" />
        </div>
      </section>

      {/* INTRO STRIP */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-20 md:py-28 grid md:grid-cols-3 gap-10">
          {[
            {
              n: "I",
              title: "Speak with the canon",
              body: "Every character runs on a Claude-powered persona — researched from Book I, prompted to stay in voice. Ye Wenjie answers in pauses. Da Shi answers in cigarettes.",
            },
            {
              n: "II",
              title: "Choose, branch, or refuse",
              body: "Each turn surfaces three plausible paths. Pick one or write your own. The system tracks your decisions in a private World Book that grows as you play.",
            },
            {
              n: "III",
              title: "Roll back the future",
              body: "Inspired by rewind-style interactive narratives. If a path leads to an ending you can't live with, walk back to any earlier node and choose differently.",
            },
          ].map((c) => (
            <div
              key={c.n}
              className="group relative border border-line bg-panel/40 backdrop-blur-sm p-7 hover:border-eto/50 transition-colors"
            >
              <div className="font-display italic text-5xl text-eto-glow/70 mb-4">
                {c.n}.
              </div>
              <h3 className="font-display text-2xl text-parchment mb-3">{c.title}</h3>
              <p className="text-parchment-dim leading-relaxed">{c.body}</p>
              <div className="absolute top-3 right-3 w-1 h-1 rounded-full bg-amber/70 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </section>

      {/* CHARACTER PREVIEW */}
      <section className="relative border-t border-line/60">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-20 md:py-28">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <div>
              <span className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute">
                Cast · Book I
              </span>
              <h2 className="font-display text-4xl md:text-5xl mt-3">
                Four lives. <span className="italic text-amber">One question.</span>
              </h2>
              <p className="text-parchment-dim mt-3 max-w-xl">
                Pick the perspective that frightens you the most. The novel will
                bend around you.
              </p>
            </div>
            <Link
              href="/characters"
              className="font-mono text-xs tracking-[0.28em] uppercase text-eto-glow hover:text-amber transition-colors flex items-center gap-2"
            >
              All four characters
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CHARACTERS.map((c) => (
              <Link
                key={c.id}
                href={`/play/${c.id}`}
                className="group relative aspect-[3/4] overflow-hidden border border-line hover:border-eto/60 transition-all"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${c.portraitGradient} opacity-70 group-hover:opacity-90 transition-opacity`} />
                <div className="absolute inset-0 scanlines opacity-50" />
                <div className="absolute -right-6 -bottom-2 font-display text-[18rem] leading-none text-parchment/10 select-none">
                  {c.glyph}
                </div>
                <div className="absolute inset-0 flex flex-col justify-between p-5">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-parchment/70">
                      {c.faction}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.32em] text-amber/80 uppercase">
                      {c.era}
                    </div>
                    <div className="font-display text-2xl text-parchment mt-1">
                      {c.name}
                    </div>
                    <div className="font-display italic text-amber-soft text-sm">
                      {c.nameOriginal}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative border-t border-line/60">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-12 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute">
              A college final project · Book I only
            </div>
            <div className="font-display text-lg text-parchment mt-1">
              Leo &nbsp;·&nbsp; Michael
            </div>
          </div>
          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute max-w-md text-right">
            All characters and concepts © Liu Cixin / 刘慈欣. <br />
            This is an academic interactive reading, not affiliated with the rights holders.
          </div>
        </div>
      </footer>
    </div>
  );
}
