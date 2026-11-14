import Link from "next/link";
import { FaGithub } from "react-icons/fa6";
import { SiHuggingface } from "react-icons/si";

import { ModeText } from "@/components/wisp/mode-text";
import { repoUrl, site } from "@/lib/site";

const link = "inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-white";

/** Small labels pinned to the bottom corners of the viewport. */
export function CornerLinks() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex h-12 items-center justify-between px-5 font-mono text-[13px] leading-4 text-white/55 sm:px-8 [&_svg]:size-3.5">
      <nav className="pointer-events-auto flex items-center gap-5">
        <a className={link} href={repoUrl} target="_blank" rel="noreferrer">
          <FaGithub />
          <span>
            <span className="max-sm:hidden">{site.repo.owner}/</span>
            {site.repo.name}
          </span>
        </a>
        <a className={link} href={site.huggingFace} target="_blank" rel="noreferrer" aria-label="Hugging Face">
          <SiHuggingface />
          <span className="max-sm:hidden">Hugging Face</span>
        </a>
      </nav>

      <nav className="pointer-events-auto flex items-center gap-4">
        <Link className={link} href="/privacy">
          <ModeText hosted="Privacy" local="Local privacy" />
        </Link>
        <a className={link} href={site.author.github} target="_blank" rel="noreferrer">
          <span className="max-sm:hidden">made by</span> {site.author.name}
        </a>
      </nav>
    </div>
  );
}
