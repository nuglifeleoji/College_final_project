type RateRecord = {
  count: number;
  resetAt: number;
};

declare global {
  // Basic per-instance guard. Hosted serverless platforms may run several
  // instances, so pair this with platform limits for a public launch.
  var __threeBodyChatRate: Map<string, RateRecord> | undefined;
}

const DEFAULT_MAX_BODY_BYTES = 32_000;
const DEFAULT_RATE_LIMIT = 12;
const DEFAULT_RATE_WINDOW_MS = 60_000;

function jsonError(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status });
}

function positiveIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clientId(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip =
    forwarded ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "local";
  const agent = req.headers.get("user-agent") ?? "unknown-agent";
  return `${ip}:${agent.slice(0, 80)}`;
}

function accessCodeFrom(req: Request) {
  const direct = req.headers.get("x-demo-access-code")?.trim();
  if (direct) return direct;

  const auth = req.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice("bearer ".length).trim();
  }
  return "";
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function rejectOversizedChatRequest(req: Request) {
  const maxBytes = positiveIntEnv(
    "THREE_BODY_MAX_REQUEST_BYTES",
    DEFAULT_MAX_BODY_BYTES
  );
  const length = Number.parseInt(req.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(length) && length > maxBytes) {
    return jsonError(
      "request_too_large",
      `Chat requests are limited to ${maxBytes} bytes.`,
      413
    );
  }
  return null;
}

export function verifyDemoAccess(req: Request, hasApiKey: boolean) {
  const publicDemo = process.env.THREE_BODY_PUBLIC_DEMO === "true";
  const accessCode = process.env.THREE_BODY_DEMO_ACCESS_CODE?.trim() ?? "";
  const requireCode =
    process.env.THREE_BODY_REQUIRE_ACCESS_CODE === "true" ||
    Boolean(accessCode) ||
    (process.env.NODE_ENV === "production" && hasApiKey && !publicDemo);

  if (!hasApiKey || publicDemo || !requireCode) return null;

  if (!accessCode) {
    return jsonError(
      "demo_access_not_configured",
      "Production chat is disabled until THREE_BODY_DEMO_ACCESS_CODE is set.",
      503
    );
  }

  if (!safeEqual(accessCodeFrom(req), accessCode)) {
    return jsonError(
      "demo_access_required",
      "Enter the demo access code before sending a live Claude message.",
      401
    );
  }

  return null;
}

export function applyChatRateLimit(req: Request) {
  const limit = positiveIntEnv("THREE_BODY_RATE_LIMIT", DEFAULT_RATE_LIMIT);
  const windowMs = positiveIntEnv(
    "THREE_BODY_RATE_WINDOW_MS",
    DEFAULT_RATE_WINDOW_MS
  );
  const now = Date.now();
  const key = clientId(req);
  const store = (globalThis.__threeBodyChatRate ??= new Map());
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= limit) {
    const seconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return Response.json(
      {
        error: "rate_limited",
        message: `Too many chat requests. Try again in ${seconds} seconds.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(seconds) },
      }
    );
  }

  current.count += 1;
  return null;
}

export function validateChatMessages(
  messages: Array<{ role: string; content: string }>
) {
  if (messages.length > 30) {
    return jsonError(
      "too_many_messages",
      "Chat requests may include at most 30 messages.",
      400
    );
  }

  const oversized = messages.find((message) => message.content.length > 2_000);
  if (oversized) {
    return jsonError(
      "message_too_long",
      "Each chat message is limited to 2000 characters.",
      400
    );
  }

  return null;
}
