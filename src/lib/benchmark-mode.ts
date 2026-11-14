/** A local installation must never invent results for an unavailable runtime. */
export function isHostedBenchmark() {
  if (typeof window === "undefined") return false;
  return !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}
