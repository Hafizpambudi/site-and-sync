"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades a block in once it reaches the viewport. Blocks already on screen at
 * mount stay visible, so first paint never depends on hydration.
 */
export function Reveal({
  children,
  index = 0,
  className = "",
}: {
  children: React.ReactNode;
  /** Position in a group; the delay is capped at four items. */
  index?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (node.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setHidden(true);
  }, []);

  useEffect(() => {
    if (!hidden) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setHidden(false);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hidden]);

  return (
    <div
      ref={ref}
      className={`${className} transition-[opacity,transform] duration-[400ms] ease-[var(--ease-editorial)] ${
        hidden ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
      }`}
      style={{ transitionDelay: `${Math.min(index, 3) * 60}ms` }}
    >
      {children}
    </div>
  );
}