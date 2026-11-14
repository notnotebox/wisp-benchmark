import { z } from "zod";

import packageJson from "../../../../package.json";
import { isNewer } from "@/lib/version";

const MANIFEST_URL =
  process.env.WISP_BENCH_UPDATE_URL ?? "https://raw.githubusercontent.com/notnotebox/wisp-benchmark/main/latest.json";
const CACHE_MS = 60 * 60 * 1000;

const link = z.string().url().refine((url) => url.startsWith("https://"), "https only");
const manifestSchema = z.object({
  benchmark: z.object({ version: z.string().max(40), url: link }).optional(),
  wisp: z.object({ version: z.string().max(40), label: z.string().max(60), url: link }).optional(),
});

export type UpdateInfo = {
  benchmark?: { latest: string; url: string };
  wisp?: { latest: string; label: string; url: string };
};

let cached: { at: number; info: UpdateInfo } | null = null;

async function load(): Promise<UpdateInfo> {
  if (process.env.WISP_BENCH_UPDATE_CHECK === "off") return {};
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.info;
  let info: UpdateInfo = {};
  try {
    const response = await fetch(MANIFEST_URL, { signal: AbortSignal.timeout(3_000), cache: "no-store" });
    const parsed = response.ok ? manifestSchema.safeParse(await response.json().catch(() => null)) : null;
    if (parsed?.success) {
      const { benchmark, wisp } = parsed.data;
      // Only a newer benchmark version is worth showing; the Wisp version is compared in the browser.
      if (benchmark && isNewer(benchmark.version, packageJson.version)) {
        info.benchmark = { latest: benchmark.version, url: benchmark.url };
      }
      if (wisp) info.wisp = { latest: wisp.version, label: wisp.label, url: wisp.url };
    }
  } catch {
    info = {};
  }
  cached = { at: Date.now(), info };
  return info;
}

/** What is newer than this installation, read from a small public manifest. Sends no user data. */
export async function GET() {
  return Response.json(await load(), { headers: { "cache-control": "no-store" } });
}
