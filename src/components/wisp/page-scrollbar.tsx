"use client";

import { useEffect, useRef } from "react";

const MIN_THUMB = 40;
const INSET = 6;

/**
 * Floating page scrollbar with no track: the native one is hidden in globals.css. The thumb uses
 * the same off-white as the top of the page.
 */
export function PageScrollbar() {
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const thumb = thumbRef.current;
    if (!thumb) return;
    const root = document.documentElement;

    const metrics = () => {
      const view = window.innerHeight;
      const total = root.scrollHeight;
      const track = view - INSET * 2;
      const height = Math.max(MIN_THUMB, (view / total) * track);
      return { view, total, track, height };
    };

    const update = () => {
      const { view, total, track, height } = metrics();
      if (total <= view + 1) {
        thumb.style.opacity = "0";
        return;
      }
      const top = INSET + (window.scrollY / (total - view)) * (track - height);
      thumb.style.opacity = "1";
      thumb.style.height = `${height}px`;
      thumb.style.transform = `translateY(${top}px)`;
    };

    let dragStart: { y: number; scroll: number } | null = null;
    const onDown = (e: PointerEvent) => {
      dragStart = { y: e.clientY, scroll: window.scrollY };
      thumb.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragStart) return;
      const { view, total, track, height } = metrics();
      const ratio = (total - view) / (track - height);
      window.scrollTo(0, dragStart.scroll + (e.clientY - dragStart.y) * ratio);
    };
    const onUp = () => {
      dragStart = null;
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    thumb.addEventListener("pointerdown", onDown);
    thumb.addEventListener("pointermove", onMove);
    thumb.addEventListener("pointerup", onUp);
    thumb.addEventListener("pointercancel", onUp);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      thumb.removeEventListener("pointerdown", onDown);
      thumb.removeEventListener("pointermove", onMove);
      thumb.removeEventListener("pointerup", onUp);
      thumb.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div
      ref={thumbRef}
      aria-hidden
      className="fixed top-0 right-1 z-50 w-1.5 cursor-grab touch-none rounded-full bg-[#f2f1ec] opacity-0 transition-[width,opacity,background-color] duration-150 select-none hover:w-2 hover:bg-white active:cursor-grabbing max-md:hidden"
    />
  );
}
