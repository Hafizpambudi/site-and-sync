import type { Metadata } from "next";
import { WorkList } from "@/components/WorkList";
import { getAllTags, getIndex, getSite } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work — Hafiz Pambudi",
  description: "Case studies: the problem, what shipped, and the number that moved.",
};

export default function WorkPage() {
  const items = getIndex();
  const tags = getAllTags();
  const site = getSite();

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-20 md:px-10">
      <p className="font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">Work</p>
      <h1 className="mt-4 max-w-[24ch] text-[clamp(32px,4.6vw,56px)] leading-[1.02] font-semibold tracking-[-0.03em]">
        Systems that shipped, and what they changed.
      </h1>
      <p className="mt-5 max-w-[62ch] text-[17px] text-ink-muted">{site.supporting}</p>

      {items.length > 0 ? (
        <WorkList items={items} tags={tags} />
      ) : (
        <p className="mt-10 text-[15px] text-ink-muted">
          No case studies published yet. Write one in Notion and it appears here after the next sync.
        </p>
      )}
    </main>
  );
}