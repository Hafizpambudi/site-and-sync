"use client";

import { useMemo, useState } from "react";
import { CaseCard } from "@/components/CaseCard";
import { Reveal } from "@/components/Reveal";
import type { CaseStudyMeta } from "@/lib/content";

export function WorkList({ items, tags }: { items: CaseStudyMeta[]; tags: string[] }) {
  const [active, setActive] = useState<string | null>(null);

  const visible = useMemo(
    () => (active ? items.filter((item) => item.tags.includes(active)) : items),
    [active, items],
  );

  return (
    <div>
      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
        <Chip label="All" pressed={active === null} onClick={() => setActive(null)} />
        {tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            pressed={active === tag}
            onClick={() => setActive(active === tag ? null : tag)}
          />
        ))}
      </div>

      <p className="mt-6 font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">
        {visible.length} {visible.length === 1 ? "case study" : "case studies"}
      </p>

      {visible.length > 0 ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {visible.map((item, index) => (
            <Reveal key={item.slug} index={index} className="h-full">
              <CaseCard item={item} />
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-[15px] text-ink-muted">Nothing tagged {active} yet.</p>
      )}
    </div>
  );
}

function Chip({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`min-h-11 border px-3 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors duration-200 ${
        pressed
          ? "border-ink bg-ink text-paper"
          : "border-rule text-ink-muted hover:border-ink-faint hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}