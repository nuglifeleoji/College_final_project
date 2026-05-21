"use client";

import { useEffect, useState } from "react";

const TARGET_ISO = "2407-01-01T00:00:00Z";

function diff(now: number, target: number) {
  let s = Math.max(0, Math.floor((target - now) / 1000));
  const days = Math.floor(s / 86400);
  s -= days * 86400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  s -= minutes * 60;
  return { days, hours, minutes, seconds: s };
}

export default function Countdown({
  compact = false,
  initialNow,
}: {
  compact?: boolean;
  initialNow: number;
}) {
  const [now, setNow] = useState<number>(initialNow);
  const target = new Date(TARGET_ISO).getTime();

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { days, hours, minutes, seconds } = diff(now, target);

  const Segment = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-start">
      <span
        className={`font-mono ${
          compact ? "text-2xl" : "text-3xl sm:text-4xl md:text-6xl"
        } text-parchment text-glow-eto tabular-nums`}
      >
        {String(value).padStart(label === "DAYS" ? 5 : 2, "0")}
      </span>
      <span className="font-mono text-[10px] tracking-[0.36em] uppercase text-mute mt-1">
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex items-end gap-2 sm:gap-5">
      <Segment value={days} label="DAYS" />
      <span className="text-eto/60 text-2xl sm:text-3xl pb-3">:</span>
      <Segment value={hours} label="HRS" />
      <span className="text-eto/60 text-2xl sm:text-3xl pb-3">:</span>
      <Segment value={minutes} label="MIN" />
      <span className="text-eto/60 text-2xl sm:text-3xl pb-3">:</span>
      <Segment value={seconds} label="SEC" />
    </div>
  );
}
