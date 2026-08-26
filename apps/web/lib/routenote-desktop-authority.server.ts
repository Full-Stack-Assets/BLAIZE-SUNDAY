import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { requireRouteNoteControlAuthority } from "./routenote-authority.server.ts";

export const ROUTENOTE_DESKTOP_COOKIE = "songforge_routenote_desktop";
export type RouteNoteDesktopMode = "INTERACTIVE" | "VIEW_ONLY";

const DESKTOP_CONTEXT = "songforge:routenote-desktop:v1";
const DEFAULT_MAX_AGE_SECONDS = 15 * 60;

export class RouteNoteDesktopAuthorityError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "RouteNoteDesktopAuthorityError";
    this.code = code;
  }
}

function configuredSecret(env: NodeJS.ProcessEnv): string {
  const secret = env.ROUTENOTE_CONTROL_PASSPHRASE?.trim();
  if (!secret) {
    throw new RouteNoteDesktopAuthorityError("ROUTENOTE_CONTROL_AUTH_NOT_CONFIGURED");
  }
  return secret;
}

function cookieValue(cookieHeader: string, name: string): string | null {
  for (const segment of cookieHeader.split(";")) {
    const [rawName, ...rest] = segment.trim().split("=");
    if (rawName === name) return rest.join("=") || null;
  }
  return null;
}

function signature(
  secret: string,
  mode: RouteNoteDesktopMode,
  expiresAtSeconds: number,
  nonce: string
): string {
  return createHmac("sha256", secret)
    .update(`${DESKTOP_CONTEXT}:${mode}:${expiresAtSeconds}:${nonce}`)
    .digest("hex");
}

export function createRouteNoteDesktopCookie(
  mode: RouteNoteDesktopMode,
  env: NodeJS.ProcessEnv,
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  nonce: string = randomBytes(16).toString("hex")
): string {
  const secret = configuredSecret(env);
  const maxAge = Math.min(
    DEFAULT_MAX_AGE_SECONDS,
    Math.max(1, Math.floor(maxAgeSeconds))
  );
  const expiresAtSeconds = Math.floor(nowSeconds) + maxAge;
  if (!/^[a-f0-9]{32}$/.test(nonce)) {
    throw new RouteNoteDesktopAuthorityError("ROUTENOTE_DESKTOP_SESSION_INVALID");
  }
  const token = `${mode}.${expiresAtSeconds}.${nonce}.${signature(
    secret,
    mode,
    expiresAtSeconds,
    nonce
  )}`;
  const secure = env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ROUTENOTE_DESKTOP_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function clearRouteNoteDesktopCookie(env: NodeJS.ProcessEnv): string {
  const secure = env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ROUTENOTE_DESKTOP_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function verifyRouteNoteDesktopAuthority(
  cookieHeader: string,
  expectedMode: RouteNoteDesktopMode,
  env: NodeJS.ProcessEnv,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  let secret: string;
  try {
    secret = configuredSecret(env);
  } catch {
    return false;
  }
  const supplied = cookieValue(cookieHeader, ROUTENOTE_DESKTOP_COOKIE);
  if (!supplied) return false;
  const [mode, expiryText, nonce, suppliedSignature, ...extra] = supplied.split(".");
  if (
    extra.length > 0 ||
    mode !== expectedMode ||
    !/^\d+$/.test(expiryText ?? "") ||
    !/^[a-f0-9]{32}$/.test(nonce ?? "") ||
    !/^[a-f0-9]{64}$/.test(suppliedSignature ?? "")
  ) {
    return false;
  }
  const expiresAtSeconds = Number(expiryText);
  if (!Number.isSafeInteger(expiresAtSeconds) || expiresAtSeconds <= Math.floor(nowSeconds)) {
    return false;
  }
  if (expiresAtSeconds - Math.floor(nowSeconds) > DEFAULT_MAX_AGE_SECONDS) return false;
  const expected = signature(secret, expectedMode, expiresAtSeconds, nonce);
  return timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expected));
}

export function requireRouteNoteDesktopAuthority(
  request: Request,
  expectedMode: RouteNoteDesktopMode,
  env: NodeJS.ProcessEnv = process.env
): void {
  requireRouteNoteControlAuthority(request, env);
  if (
    !verifyRouteNoteDesktopAuthority(
      request.headers.get("cookie") ?? "",
      expectedMode,
      env
    )
  ) {
    throw new RouteNoteDesktopAuthorityError("ROUTENOTE_DESKTOP_SESSION_INVALID");
  }
}
