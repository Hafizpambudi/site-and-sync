import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prose } from "@/components/Prose";
import { Tag } from "@/components/CaseCard";
import { getAllSlugs, getCaseStudy, getNeighbours } from "@/lib/content";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { meta } = getCaseStudy(slug);
    return { title: `${meta.title} — Hafiz Pambudi`, description: meta.summary };
  } catch {
    return { title: "Not found — Hafiz Pambudi" };
  }
}

export default async function CaseStudyPage({ params }: Params) {
  const { slug } = await params;

  const study = (() => {
    try {
      return getCaseStudy(slug);
    } catch {
      notFound();
    }
  })();

  const { meta, markdown } = study;
  const { previous, next } = getNeighbours(slug);

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-20 md:px-10">
      <article>
        <header>
          <h1 className="max-w-[26ch] text-[clamp(32px,4.6vw,56px)] leading-[1.04] font-semibold tracking-[-0.03em]">
            {meta.title}
          </h1>
          <p className="mt-5 font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase">
            {[meta.role, meta.timeline, meta.date].filter(Boolean).join(" · ")}
          </p>
          {meta.tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {meta.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          ) : null}
        </header>

        <p className="mt-10 max-w-[66ch] font-serif text-[21px] leading-[1.6]">{meta.summary}</p>

        {meta.demo ? (
          <a
            href={meta.demo}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-8 inline-flex min-h-11 items-center rounded-[8px] border border-rule px-5 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors duration-200 hover:border-ink-faint"
          >
            Open demo
          </a>
        ) : null}

        {meta.cover ? (
          <Image
            src={meta.cover}
            alt=""
            width={0}
            height={0}
            sizes="100vw"
            className="mt-10 h-auto w-full border border-rule"
          />
        ) : null}

        <hr className="my-12 border-rule" />

        <Prose markdown={markdown} />
      </article>

      <nav
        aria-label="Case study navigation"
        className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6"
      >
        <div className="min-w-[12rem]">
          {previous ? (
            <Link
              href={`/work/${previous.slug}`}
              className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase transition-colors duration-200 hover:text-ink"
            >
              ← {previous.title}
            </Link>
          ) : null}
        </div>
        <Link
          href="/work"
          className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase transition-colors duration-200 hover:text-ink"
        >
          All work
        </Link>
        <div className="min-w-[12rem] text-right">
          {next ? (
            <Link
              href={`/work/${next.slug}`}
              className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase transition-colors duration-200 hover:text-ink"
            >
              {next.title} →
            </Link>
          ) : null}
        </div>
      </nav>
    </main>
  );
}