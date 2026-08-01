"use client";

import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";

type Props = {
  disabled?: boolean;
};

const DEMO_ACCESS_KEY = "three_body_demo_access_code";
const DEMO_ACCESS_ERROR_EVENT = "three_body_demo_access_error";

export function demoAccessHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const code = window.localStorage.getItem(DEMO_ACCESS_KEY)?.trim();
  return code ? { "x-demo-access-code": code } : {};
}

export function emitDemoAccessError(message: string) {
  window.dispatchEvent(
    new CustomEvent(DEMO_ACCESS_ERROR_EVENT, { detail: message })
  );
}

export default function DemoAccessCode({ disabled }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(window.localStorage.getItem(DEMO_ACCESS_KEY) ?? "");
    const onError = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setError(detail || "Demo access is required.");
    };
    window.addEventListener(DEMO_ACCESS_ERROR_EVENT, onError);
    return () => window.removeEventListener(DEMO_ACCESS_ERROR_EVENT, onError);
  }, []);

  const updateValue = (nextValue: string) => {
    setValue(nextValue);
    setError(null);
    if (nextValue.trim()) {
      window.localStorage.setItem(DEMO_ACCESS_KEY, nextValue.trim());
    } else {
      window.localStorage.removeItem(DEMO_ACCESS_KEY);
    }
  };

  return (
    <div className="mt-4 border border-line bg-panel/35 backdrop-blur-sm p-3">
      <label className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.28em] uppercase text-mute">
          <LockKeyhole size={13} strokeWidth={1.8} aria-hidden />
          Demo access
        </span>
        <input
          value={value}
          onChange={(event) => updateValue(event.target.value)}
          type="password"
          autoComplete="off"
          placeholder="Access code"
          disabled={disabled}
          className="min-w-0 flex-1 border border-line bg-void-2/70 px-3 py-2 font-mono text-xs tracking-[0.12em] text-parchment outline-none placeholder:text-mute focus:border-eto/70 disabled:opacity-50"
        />
      </label>
      {error && (
        <p className="mt-2 text-xs leading-relaxed text-amber-soft">{error}</p>
      )}
    </div>
  );
}
