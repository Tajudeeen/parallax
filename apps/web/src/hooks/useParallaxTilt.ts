import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Tracks pointer position relative to an element's center and returns a
 * small offset. Used once, on the task result card, to literally show two
 * layers of the same content displaced by viewing angle: parallax.
 * Disabled entirely when the user has reduced motion set.
 */
export function useParallaxTilt(maxOffset = 6) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const el = ref.current;
    if (!el) return;

    function handleMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = ((e.clientX - cx) / (rect.width / 2)) * maxOffset;
      const dy = ((e.clientY - cy) / (rect.height / 2)) * maxOffset;
      setOffset({ x: dx, y: dy });
    }

    function handleLeave() {
      setOffset({ x: 0, y: 0 });
    }

    window.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [maxOffset]);

  return { ref, offset };
}
