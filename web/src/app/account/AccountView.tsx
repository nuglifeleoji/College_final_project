"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Plus, UserRound } from "lucide-react";
import { loadDecisions, type Decision } from "@/lib/plot-tree";
import { listSessions, type SavedSession } from "@/lib/sessions";
import {
  createUser,
  getCurrentUserId,
  loadUsers,
  setCurrentUser,
  subscribeUsers,
  updateUser,
  type UserProfile,
} from "@/lib/users";

const ACCENT_CLASS: Record<UserProfile["accent"], string> = {
  eto: "from-eto via-eto-deep to-panel",
  amber: "from-amber via-panel-2 to-void",
  trisolaran: "from-trisolaran via-panel-2 to-void",
  parchment: "from-parchment/70 via-panel-2 to-void",
};

function formatRelative(ts: number) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function AccountView() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [newName, setNewName] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftGlyph, setDraftGlyph] = useState("");
  const [draftAccent, setDraftAccent] = useState<UserProfile["accent"]>("eto");

  const refresh = () => {
    const nextUsers = loadUsers();
    const nextCurrentId = getCurrentUserId();
    const current = nextUsers.find((u) => u.id === nextCurrentId) ?? nextUsers[0];
    setUsers(nextUsers);
    setCurrentId(current.id);
    setDraftName(current.name);
    setDraftGlyph(current.glyph);
    setDraftAccent(current.accent);
    setSessions(listSessions());
    setDecisions(loadDecisions());
  };

  useEffect(() => {
    refresh();
    return subscribeUsers(refresh);
  }, []);

  const current = users.find((u) => u.id === currentId) ?? users[0];

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    if (!current) return;
    updateUser(current.id, {
      name: draftName,
      glyph: draftGlyph,
      accent: draftAccent,
    });
    refresh();
  };

  const addProfile = (event: FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;
    createUser(newName);
    setNewName("");
    refresh();
  };

  const switchProfile = (id: string) => {
    setCurrentUser(id);
    refresh();
  };

  if (!current) {
    return <div className="px-6 py-16 text-mute">Loading account…</div>;
  }

  return (
    <div className="relative">
      <section className="mx-auto max-w-7xl px-6 lg:px-10 pt-16 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-eto-glow shadow-[0_0_10px_rgba(255,45,79,0.9)]" />
          <span className="font-mono text-[11px] tracking-[0.36em] uppercase text-eto-glow">
            Reader · Local Demo
          </span>
          <span className="hairline flex-1 max-w-[180px]" />
        </div>
        <h1 className="font-display text-5xl md:text-6xl text-parchment leading-tight">
          Your seat at the console.
        </h1>
        <p className="mt-5 text-parchment-dim text-lg max-w-2xl">
          Switch readers, keep separate saves, and return to the branch line
          that belongs to you.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 lg:px-10 pb-24 grid lg:grid-cols-12 gap-8">
        <article className="lg:col-span-5 border border-line bg-panel/40 backdrop-blur-sm overflow-hidden">
          <div className={`p-7 bg-gradient-to-br ${ACCENT_CLASS[current.accent]}`}>
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 border border-parchment/30 bg-void/30 flex items-center justify-center font-display text-4xl text-parchment">
                {current.glyph}
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-parchment/70">
                  Active reader
                </div>
                <h2 className="mt-2 font-display text-4xl text-parchment leading-tight">
                  {current.name}
                </h2>
                <div className="mt-2 font-mono text-[10px] tracking-[0.24em] uppercase text-parchment/60 break-all">
                  {current.id}
                </div>
              </div>
            </div>
          </div>

          <div className="p-7 grid grid-cols-2 gap-4 border-t border-line">
            <div className="border border-line bg-void-2/50 p-4">
              <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
                Saved stories
              </div>
              <div className="mt-2 font-mono text-4xl text-parchment tabular-nums">
                {String(sessions.length).padStart(2, "0")}
              </div>
            </div>
            <div className="border border-line bg-void-2/50 p-4">
              <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
                Branches
              </div>
              <div className="mt-2 font-mono text-4xl text-parchment tabular-nums">
                {String(decisions.length).padStart(2, "0")}
              </div>
            </div>
          </div>

          <div className="px-7 pb-7 flex flex-wrap gap-3">
            <Link
              href="/characters"
              className="inline-flex items-center gap-2 px-5 py-3 bg-eto text-parchment font-mono text-xs tracking-[0.24em] uppercase hover:bg-eto-glow transition-colors"
            >
              <UserRound size={15} strokeWidth={1.8} aria-hidden />
              Enter story
            </Link>
            <Link
              href="/decisions"
              className="px-5 py-3 border border-line text-parchment-dim hover:border-amber hover:text-amber font-mono text-xs tracking-[0.24em] uppercase transition-colors"
            >
              Open archive
            </Link>
          </div>
        </article>

        <div className="lg:col-span-7 grid gap-6">
          <form
            onSubmit={saveProfile}
            className="border border-line bg-panel/40 backdrop-blur-sm p-6"
          >
            <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute mb-5">
              Profile
            </div>
            <div className="grid md:grid-cols-[1fr_96px_160px] gap-3">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="border border-line bg-void-2/70 px-4 py-3 outline-none text-parchment placeholder:text-mute font-display text-lg"
                placeholder="Reader name"
              />
              <input
                value={draftGlyph}
                onChange={(e) => setDraftGlyph(e.target.value)}
                className="border border-line bg-void-2/70 px-4 py-3 outline-none text-parchment placeholder:text-mute font-display text-lg"
                placeholder="Glyph"
                maxLength={2}
              />
              <select
                value={draftAccent}
                onChange={(e) =>
                  setDraftAccent(e.target.value as UserProfile["accent"])
                }
                className="border border-line bg-void-2/70 px-4 py-3 outline-none text-parchment font-mono text-xs tracking-[0.2em] uppercase"
              >
                <option value="eto">eto</option>
                <option value="amber">amber</option>
                <option value="trisolaran">trisolaran</option>
                <option value="parchment">parchment</option>
              </select>
            </div>
            <button
              type="submit"
              className="mt-4 inline-flex items-center gap-2 px-5 py-3 border border-eto/60 text-eto-glow hover:border-eto-glow hover:bg-eto/10 font-mono text-xs tracking-[0.24em] uppercase transition-colors"
            >
              <Check size={15} strokeWidth={1.8} aria-hidden />
              Save profile
            </button>
          </form>

          <form
            onSubmit={addProfile}
            className="border border-line bg-panel/40 backdrop-blur-sm p-6"
          >
            <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute mb-5">
              New reader
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="min-w-0 flex-1 border border-line bg-void-2/70 px-4 py-3 outline-none text-parchment placeholder:text-mute font-display text-lg"
                placeholder="Name this reader"
              />
              <button
                type="submit"
                disabled={!newName.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-eto text-parchment disabled:bg-line disabled:text-mute font-mono text-xs tracking-[0.24em] uppercase hover:bg-eto-glow transition-colors"
              >
                <Plus size={15} strokeWidth={1.8} aria-hidden />
                Create
              </button>
            </div>
          </form>

          <section className="border border-line bg-panel/40 backdrop-blur-sm p-6">
            <div className="font-mono text-[11px] tracking-[0.36em] uppercase text-mute mb-5">
              Readers
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {users.map((user) => {
                const active = user.id === current.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => switchProfile(user.id)}
                    className={`text-left border p-4 transition-colors ${
                      active
                        ? "border-eto/60 bg-eto/10"
                        : "border-line bg-void-2/50 hover:border-amber/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 bg-gradient-to-br ${ACCENT_CLASS[user.accent]} border border-line flex items-center justify-center font-display text-xl text-parchment`}>
                        {user.glyph}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-lg text-parchment truncate">
                          {user.name}
                        </div>
                        <div className="font-mono text-[9px] tracking-[0.24em] uppercase text-mute">
                          {formatRelative(user.lastSeenAt)}
                        </div>
                      </div>
                      {active && (
                        <Check
                          size={16}
                          strokeWidth={1.8}
                          className="text-eto-glow"
                          aria-hidden
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
