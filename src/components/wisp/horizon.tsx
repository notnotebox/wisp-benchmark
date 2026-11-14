/**
 * The slanted break between the off-white top and the black bottom. Its height follows the
 * viewport width as well as its height, so the slope stays gentle on narrow screens.
 */
export function BrokenHorizon({ top }: { top: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col" style={{ top }}>
      <svg viewBox="0 0 1000 120" preserveAspectRatio="none" className="h-[min(11svh,12vw)] w-full">
        <polygon points="0,42 126,0 1000,104 1000,120 0,120" fill="#000" />
        <polygon points="0,42 126,0 126,9 0,54" fill="#1c1c1c" />
      </svg>
      <div className="-mt-px flex-1 bg-black" />
    </div>
  );
}
