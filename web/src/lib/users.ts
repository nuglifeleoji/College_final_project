export type UserProfile = {
  id: string;
  name: string;
  glyph: string;
  accent: "eto" | "amber" | "trisolaran" | "parchment";
  createdAt: number;
  lastSeenAt: number;
};

export const USERS_KEY = "tb_users_v1";
export const CURRENT_USER_KEY = "tb_current_user_v1";
export const USER_UPDATED_EVENT = "tb_user_updated";
export const DEFAULT_USER_ID = "local-reader";

const ACCENTS: UserProfile["accent"][] = [
  "eto",
  "amber",
  "trisolaran",
  "parchment",
];

function isBrowser() {
  return typeof window !== "undefined";
}

function now() {
  return Date.now();
}

function uid() {
  return `reader-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultUser(): UserProfile {
  return {
    id: DEFAULT_USER_ID,
    name: "Guest Reader",
    glyph: "你",
    accent: "eto",
    createdAt: now(),
    lastSeenAt: now(),
  };
}

function normalizeUsers(raw: unknown): UserProfile[] {
  const parsed = Array.isArray(raw) ? raw : [];
  const users = parsed
    .map((u) => {
      if (!u || typeof u !== "object") return null;
      const x = u as Partial<UserProfile>;
      if (typeof x.id !== "string" || typeof x.name !== "string") return null;
      return {
        id: x.id,
        name: x.name.trim() || "Reader",
        glyph: typeof x.glyph === "string" && x.glyph ? x.glyph.slice(0, 2) : "你",
        accent: ACCENTS.includes(x.accent as UserProfile["accent"])
          ? (x.accent as UserProfile["accent"])
          : "eto",
        createdAt: typeof x.createdAt === "number" ? x.createdAt : now(),
        lastSeenAt: typeof x.lastSeenAt === "number" ? x.lastSeenAt : now(),
      } satisfies UserProfile;
    })
    .filter(Boolean) as UserProfile[];

  if (!users.some((u) => u.id === DEFAULT_USER_ID)) {
    users.unshift(defaultUser());
  }

  return users;
}

function emitUserUpdate() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(USER_UPDATED_EVENT));
}

export function subscribeUsers(listener: () => void) {
  if (!isBrowser()) return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === USERS_KEY || event.key === CURRENT_USER_KEY) listener();
  };
  window.addEventListener(USER_UPDATED_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(USER_UPDATED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function loadUsers(): UserProfile[] {
  if (!isBrowser()) return [defaultUser()];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    const users = normalizeUsers(raw ? JSON.parse(raw) : []);
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users;
  } catch {
    const users = [defaultUser()];
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users;
  }
}

export function saveUsers(users: UserProfile[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(normalizeUsers(users)));
  emitUserUpdate();
}

export function getCurrentUserId() {
  if (!isBrowser()) return DEFAULT_USER_ID;
  const users = loadUsers();
  const saved = window.localStorage.getItem(CURRENT_USER_KEY);
  if (saved && users.some((u) => u.id === saved)) return saved;
  window.localStorage.setItem(CURRENT_USER_KEY, DEFAULT_USER_ID);
  return DEFAULT_USER_ID;
}

export function getCurrentUser() {
  const id = getCurrentUserId();
  return loadUsers().find((u) => u.id === id) ?? defaultUser();
}

export function setCurrentUser(id: string) {
  if (!isBrowser()) return;
  const users = loadUsers();
  if (!users.some((u) => u.id === id)) return;
  window.localStorage.setItem(CURRENT_USER_KEY, id);
  saveUsers(
    users.map((u) => (u.id === id ? { ...u, lastSeenAt: now() } : u))
  );
  emitUserUpdate();
}

export function createUser(name: string) {
  const clean = name.trim() || "Reader";
  const users = loadUsers();
  const user: UserProfile = {
    id: uid(),
    name: clean,
    glyph: clean[0]?.toUpperCase() ?? "你",
    accent: ACCENTS[users.length % ACCENTS.length],
    createdAt: now(),
    lastSeenAt: now(),
  };
  saveUsers([...users, user]);
  setCurrentUser(user.id);
  return user;
}

export function updateUser(id: string, patch: Partial<Pick<UserProfile, "name" | "glyph" | "accent">>) {
  const users = loadUsers();
  saveUsers(
    users.map((u) =>
      u.id === id
        ? {
            ...u,
            name: patch.name?.trim() || u.name,
            glyph: patch.glyph?.trim().slice(0, 2) || u.glyph,
            accent: patch.accent ?? u.accent,
            lastSeenAt: now(),
          }
        : u
    )
  );
}

export function scopedStorageKey(baseKey: string, userId = getCurrentUserId()) {
  return `tb_user_${userId}__${baseKey}`;
}

export function legacyStorageKey(baseKey: string) {
  return baseKey;
}
