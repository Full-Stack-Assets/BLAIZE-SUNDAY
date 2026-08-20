const DEFAULT_TRUSTED_VIDEO_HOSTS = new Set(["sider-pub.s3.amazonaws.com"]);

function configuredHosts(): string[] {
  return (process.env.VIDEO_FFPROBE_ALLOWED_HOSTS ?? "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

export function trustedVideoMediaHosts(extraHosts: string[] = []): Set<string> {
  return new Set([
    ...DEFAULT_TRUSTED_VIDEO_HOSTS,
    ...configuredHosts(),
    ...extraHosts.map(value => value.trim().toLowerCase()).filter(Boolean)
  ]);
}

export function isTrustedVideoMediaUrl(
  input: string,
  extraHosts: string[] = []
): boolean {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    trustedVideoMediaHosts(extraHosts).has(url.hostname.toLowerCase())
  );
}
