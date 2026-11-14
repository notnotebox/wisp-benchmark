/** True on a hosted deployment: the server then holds no provider key and models are reached from the browser. */
export function isHostedRequest(request: Request) {
  if (process.env.WISP_BENCH_MODE === "hosted") return true;
  if (process.env.WISP_BENCH_MODE === "local" || process.env.NODE_ENV !== "production") return false;
  const host = new URL(request.url).hostname;
  return !["localhost", "127.0.0.1", "::1"].includes(host);
}
