import Link from "next/link";
import type { CaseStudyMeta } from "@/lib/content";

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-rule px-2 py-[3px] font-mono text-[11px] tracking-[0.12em] text-ink-muted uppercase">
      {children}
    </span>
  );
}

export function CaseCard({ item }: { item: CaseStudyMeta }) {
  return (
    <Link
      href={`/work/${item.slug}`}
      className="flex h-full flex-col border border-rule bg-surface p-6 transition-colors duration-200 hover:border-ink-faint"
    >
      <p className="font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">{item.date}</p>
      <h3 className="mt-3 text-[20px] leading-[1.3] font-semibold tracking-[-0.01em]">
        {item.title}
      </h3>
      <p className="mt-2 text-[15px] text-ink-muted">{item.summary}</p>
      {item.tags.length > 0 ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          {item.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      ) : null}
    </Link>
  );
}