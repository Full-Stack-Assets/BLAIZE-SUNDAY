import {
  createHash,
  createHmac,
  timingSafeEqual
} from "node:crypto";

export const ROUTENOTE_CONTROL_COOKIE = "songforge_routenote_control";
const AUTHORITY_CONTEXT = "songforge:routenote-control:v1";

export class RouteNoteAuthorityError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "RouteNoteAuthorityError";
    this.code = code;
  }
}

function configuredSecret(env: NodeJS.ProcessEnv): string | null {
  const secret = env.ROUTENOTE_CONTROL_PASSPHRASE?.trim();
  return secret ? secret : null;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function authoritySignature(secret: string, expiresAtSeconds: number): string {
  return createHmac("sha256", secret)
    .update(`${AUTHORITY_CONTEXT}:${expiresAtSeconds}`)
    .digest("hex");
}

function authorityToken(secret: string, expiresAtSeconds: number): string {
  return `${expiresAtSeconds}.${authoritySignature(secret, expiresAtSeconds)}`;
}

function cookieValue(cookieHeader: string, name: string): string | null {
  for (const segment of cookieHeader.split(";")) {
    const [rawName, ...rest] = segment.trim().split("=");
    if (rawName === name) return rest.join("=") || null;
  }
  return null;
}

export function routeNoteAuthorityRequired(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === "production" || configuredSecret(env) !== null;
}

export function verifyRouteNotePassphrase(
  candidate: string,
  env: NodeJS.ProcessEnv
): boolean {
  const secret = configuredSecret(env);
  if (!secret || !candidate) return false;
  return timingSafeEqual(digest(candidate), digest(secret));
}

export function createRouteNoteAuthorityCookie(
  env: NodeJS.ProcessEnv,
  maxAgeSeconds: number = 12 * 60 * 60,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string {
  const secret = configuredSecret(env);
  if (!secret) {
    throw new RouteNoteAuthorityError("ROUTENOTE_CONTROL_AUTH_NOT_CONFIGURED");
  }

  const maxAge = Math.max(1, Math.floor(maxAgeSeconds));
  const expiresAtSeconds = Math.floor(nowSeconds) + maxAge;
  const secure = env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ROUTENOTE_CONTROL_COOKIE}=${authorityToken(secret, expiresAtSeconds)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function verifyRouteNoteAuthority(
  cookieHeader: string,
  env: NodeJS.ProcessEnv,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!routeNoteAuthorityRequired(env)) return true;
  const secret = configuredSecret(env);
  if (!secret) return false;

  const supplied = cookieValue(cookieHeader, ROUTENOTE_CONTROL_COOKIE);
  if (!supplied) return false;

  const [expiryText, suppliedSignature, ...extra] = supplied.split(".");
  if (extra.length > 0 || !expiryText || !suppliedSignature) return false;
  if (!/^\d+$/.test(expiryText) || !/^[a-f0-9]{64}$/.test(suppliedSignature)) {
    return false;
  }

  const expiresAtSeconds = Number(expiryText);
  if (!Number.isSafeInteger(expiresAtSeconds)) return false;
  if (expiresAtSeconds <= Math.floor(nowSeconds)) return false;

  const expectedSignature = authoritySignature(secret, expiresAtSeconds);
  return timingSafeEqual(
    Buffer.from(suppliedSignature),
    Buffer.from(expectedSignature)
  );
}

export function requireRouteNoteControlAuthority(
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): void {
  if (!routeNoteAuthorityRequired(env)) return;
  if (!configuredSecret(env)) {
    throw new RouteNoteAuthorityError("ROUTENOTE_CONTROL_AUTH_NOT_CONFIGURED");
  }
  if (!verifyRouteNoteAuthority(request.headers.get("cookie") ?? "", env)) {
    throw new RouteNoteAuthorityError("ROUTENOTE_CONTROL_LOCKED");
  }
}
