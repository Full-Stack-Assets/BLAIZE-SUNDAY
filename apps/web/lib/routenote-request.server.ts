export class RouteNoteRequestError extends Error {
  readonly code = "ROUTENOTE_CONTROL_ORIGIN_REJECTED";

  constructor() {
    super("ROUTENOTE_CONTROL_ORIGIN_REJECTED");
    this.name = "RouteNoteRequestError";
  }
}

function firstForwarded(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first || null;
}

export function requireSameOriginMutation(request: Request): void {
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new RouteNoteRequestError();
  }

  const origin = request.headers.get("origin");
  if (!origin) return;

  let source: URL;
  try {
    source = new URL(origin);
  } catch {
    throw new RouteNoteRequestError();
  }

  const host =
    firstForwarded(request.headers.get("x-forwarded-host")) ??
    request.headers.get("host")?.trim() ??
    "";
  const protocol =
    firstForwarded(request.headers.get("x-forwarded-proto")) ??
    new URL(request.url).protocol.replace(":", "");

  if (!host || source.host !== host || source.protocol !== `${protocol}:`) {
    throw new RouteNoteRequestError();
  }
}
