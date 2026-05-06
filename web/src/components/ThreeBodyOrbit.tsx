"use client";

type Props = {
  size?: number;
  className?: string;
};

export default function ThreeBodyOrbit({ size = 360, className = "" }: Props) {
  const s = size;
  return (
    <div
      className={`relative ${className}`}
      style={{ width: s, height: s }}
      aria-hidden
    >
      {/* Outermost ring */}
      <div className="absolute inset-0 rounded-full border border-eto/30" />
      {/* Mid ring */}
      <div
        className="absolute rounded-full border border-amber/25"
        style={{
          inset: s * 0.13,
        }}
      />
      {/* Inner ring */}
      <div
        className="absolute rounded-full border border-trisolaran/20"
        style={{
          inset: s * 0.28,
        }}
      />

      {/* Three orbiting points */}
      <div className="absolute inset-0 orbit-spin">
        <span
          className="absolute left-1/2 -translate-x-1/2 -top-[6px] w-3 h-3 rounded-full bg-eto-glow shadow-[0_0_18px_rgba(255,45,79,0.9)]"
        />
      </div>
      <div className="absolute inset-0 orbit-spin-rev" style={{ inset: s * 0.13 }}>
        <span className="absolute left-1/2 -translate-x-1/2 -top-[5px] w-2.5 h-2.5 rounded-full bg-amber shadow-[0_0_14px_rgba(212,168,87,0.9)]" />
      </div>
      <div className="absolute orbit-spin-fast" style={{ inset: s * 0.28 }}>
        <span className="absolute left-1/2 -translate-x-1/2 -top-[4px] w-2 h-2 rounded-full bg-trisolaran shadow-[0_0_10px_rgba(78,163,255,0.9)]" />
      </div>

      {/* Core */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-parchment shadow-[0_0_18px_rgba(231,230,221,0.7)]" />

      {/* Crosshair */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-line/60 -translate-x-1/2" />
      <div className="absolute top-1/2 left-0 right-0 h-px bg-line/60 -translate-y-1/2" />

      {/* Tick marks */}
      {[0, 90, 180, 270].map((deg) => (
        <div
          key={deg}
          className="absolute left-1/2 top-1/2 origin-left"
          style={{
            transform: `translate(-50%, -50%) rotate(${deg}deg) translateX(${s * 0.5 - 8}px)`,
          }}
        >
          <div className="w-2 h-px bg-mute" />
        </div>
      ))}
    </div>
  );
}
