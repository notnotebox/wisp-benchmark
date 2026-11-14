/** "1.2.3" or "v1.2.3" as a comparable triple; null when it is not a version. */
export function parseVersion(raw: string): [number, number, number] | null {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(raw);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** True when `latest` is strictly newer than `current`. */
export function isNewer(latest: string, current: string) {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
