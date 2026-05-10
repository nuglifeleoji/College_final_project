import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CHARACTERS } from "@/lib/characters";

export const metadata = { title: "Characters · Three-Body" };

export default function CharactersPage() {
  return (
    <div className="relative">
      <section className="mx-auto max-w-7xl px-6 lg:px-10 pt-16 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-amber shadow-[0_0_10px_rgba(212,168,87,0.9)]" />
          <span className="font-mono text-[11px] tracking-[0.36em] uppercase text-amber">
            Dossier · Book I
          </span>
          <span className="hairline flex-1 max-w-[180px]" />
        </div>
        <h1 className="font-display text-5xl md:text-6xl text-parchment leading-tight">
          Pick the <span className="italic text-eto-glow text-glow-eto">perspective</span><br />
          that frightens you most.
        </h1>
        <p className="mt-5 text-parchment-dim text-lg max-w-2xl">
          Each character runs on their own Claude persona, anchored to their
          chapter in the first novel. They begin where the book begins for them.
          You begin wherever you are willing to.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 lg:px-10 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {CHARACTERS.map((c) => (
          <Link
            key={c.id}
            href={`/play/${c.id}`}
            className="group relative overflow-hidden border border-line hover:border-eto/60 transition-all bg-panel/40 backdrop-blur-sm"
          >
            <div className="grid grid-cols-5 min-h-[360px]">
              {/* Portrait */}
              <div className="col-span-2 relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${c.portraitGradient} opacity-90`} />
                <div className="absolute inset-0 scanlines opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-panel/80" />
                <div className="absolute -left-4 bottom-0 font-display text-[22rem] leading-[0.8] text-parchment/15 select-none">
                  {c.glyph}
                </div>
                <div className="relative z-10 p-5 flex flex-col justify-between h-full">
                  <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-parchment/80">
                    {c.faction}
                  </div>
                  <div>
                    <div className="font-display italic text-amber-soft text-base">
                      {c.nameOriginal}
                    </div>
                    <div className="font-display text-3xl text-parchment leading-tight mt-1">
                      {c.name}
                    </div>
                    <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-amber/80 mt-2">
                      {c.era}
                    </div>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="col-span-3 p-7 flex flex-col">
                <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
                  {c.role}
                </div>
                <p className="font-display italic text-xl text-parchment-dim mt-3 leading-snug">
                  &ldquo;{c.hook}&rdquo;
                </p>

                <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3">
                  {c.stats.map((s) => (
                    <div key={s.label} className="flex flex-col">
                      <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.24em]">
                        <span className="text-mute">{s.label}</span>
                        <span className="text-parchment tabular-nums">
                          {String(s.value).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="mt-1 h-px bg-line relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-eto/80 to-amber/80"
                          style={{ width: `${s.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-6 flex items-end justify-between gap-4">
                  <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-amber-soft leading-relaxed">
                    {c.openingScene.chapter}
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1.5 font-mono text-xs tracking-[0.24em] uppercase text-eto-glow group-hover:text-amber transition-colors">
                    <span>Begin {c.name.split(" ")[0]}</span>
                    <ArrowRight
                      size={15}
                      strokeWidth={1.8}
                      className="translate-y-px transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none border border-eto-glow/0 group-hover:border-eto-glow/30 transition-colors" />
          </Link>
        ))}
      </section>
    </div>
  );
}
