import { CornerLinks } from "@/components/wisp/corner-links";
import { Benchmark } from "@/components/wisp/demo";
import { PageScrollbar } from "@/components/wisp/page-scrollbar";
import { WispLogo } from "@/components/wisp/wisp-logo";

export default function Home() {
  return (
    <main className="relative min-h-svh overflow-x-clip bg-[#f2f1ec]">
      <PageScrollbar />
      <WispLogo className="pointer-events-none absolute left-1/2 top-[7svh] z-0 h-[min(22svh,200px)] -translate-x-1/2 text-black" />
      <CornerLinks />
      <Benchmark />
    </main>
  );
}
