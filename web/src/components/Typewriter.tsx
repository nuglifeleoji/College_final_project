"use client";

import { useEffect, useState } from "react";

export default function Typewriter({
  text,
  speed = 18,
  onDone,
  className = "",
}: {
  text: string;
  speed?: number;
  onDone?: () => void;
  className?: string;
}) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    if (!text) {
      onDone?.();
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const done = shown.length >= text.length;
  return (
    <span className={className}>
      {shown}
      {!done && <span className="inline-block w-[2px] h-[1.1em] -mb-0.5 ml-1 bg-eto-glow align-middle animate-pulse" />}
    </span>
  );
}
