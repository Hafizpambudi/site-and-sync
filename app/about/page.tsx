import type { Metadata } from "next";
import Link from "next/link";
import { getSite } from "@/lib/content";

export const metadata: Metadata = {
  title: "About — Hafiz Pambudi",
  description:
    "Full-stack AI engineer. I take a vague request and return a working system with a measurable result.",
};

const HOW = [
  "I start by finding out what the business actually needs, which is rarely what the ticket says. The first deliverable is a sentence that names the outcome and the number that would prove it.",
  "Then I build the smallest version that can be measured. If I cannot measure it, I cannot tell whether it improved anything, and neither can you.",
  "Evals run in CI. A change that regresses accuracy fails the build, because a model that is quietly worse is more expensive than a build that is red.",
];

const STACK = [
  {
    tool: "TypeScript + Next.js",
    why: "The product surface and the content pipeline share one language, so a schema change is one edit.",
  },
  {
    tool: "Python + FastAPI",
    why: "Ingestion and evaluation are batch work with real libraries. Keeping them out of the request path keeps latency honest.",
  },
  {
    tool: "Postgres + pgvector",
    why: "One store for rows and embeddings. Fewer moving parts than a dedicated vector database at this scale.",
  },
  {
    tool: "Evals in CI",
    why: "An accuracy regression fails the build. This is the only way I trust a model change.",
  },
  {
    tool: "Notion as the CMS",
    why: "Writing happens where it is comfortable. A webhook turns a page edit into a git commit and a deploy.",
  },
];

export default function AboutPage() {
  const site = getSite();

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-20 md:px-10">
      <p className="font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">About</p>
      <h1 className="mt-4 max-w-[24ch] text-[clamp(32px,4.6vw,56px)] leading-[1.02] font-semibold tracking-[-0.03em]">
        {site.role}, end to end.
      </h1>
      <p className="mt-6 max-w-[62ch] text-[18px] text-ink-muted">{site.thesis}</p>

      <section className="mt-16 border-t border-rule pt-10">
        <h2 className="text-[20px] font-semibold tracking-[-0.01em]">What I do</h2>
        <p className="mt-4 max-w-[66ch] text-[17px]">
          I build AI systems that ship: the retrieval, the interface, the evaluation, and the
          plumbing that keeps them running. Most of my work sits where a model has to be correct
          enough to act on, and slow enough to be worthless — so the job is usually as much
          engineering as it is modelling.
        </p>
      </section>

      <section className="mt-12 border-t border-rule pt-10">
        <h2 className="text-[20px] font-semibold tracking-[-0.01em]">How I work</h2>
        <ol className="mt-5 max-w-[66ch] space-y-4">
          {HOW.map((paragraph, index) => (
            <li key={paragraph} className="flex gap-4">
              <span className="mt-[3px] font-mono text-[11px] tracking-[0.14em] text-accent-ink">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="text-[17px]">{paragraph}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 border-t border-rule pt-10">
        <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Stack</h2>
        <p className="mt-3 text-[15px] text-ink-muted">
          No badges. Each line is a reason.
        </p>
        <dl className="mt-6 max-w-[66ch]">
          {STACK.map((item) => (
            <div key={item.tool} className="border-b border-rule py-3 md:flex md:gap-8">
              <dt className="font-mono text-[12px] tracking-[0.06em] uppercase md:w-56 md:shrink-0">
                {item.tool}
              </dt>
              <dd className="mt-1 text-[16px] text-ink-muted md:mt-0">{item.why}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 border-t border-rule pt-10">
        <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Elsewhere</h2>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
          {site.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              rel="noreferrer noopener"
              target="_blank"
              className="font-mono text-[11px] tracking-[0.14em] uppercase underline underline-offset-3 transition-colors duration-200 hover:text-accent-ink"
            >
              {link.label}
            </a>
          ))}
          {site.email ? (
            <a
              href={`mailto:${site.email}`}
              className="font-mono text-[11px] tracking-[0.14em] uppercase underline underline-offset-3 transition-colors duration-200 hover:text-accent-ink"
            >
              {site.email}
            </a>
          ) : null}
        </div>
        <p className="mt-10 text-[15px] text-ink-muted">
          <Link href="/work" className="underline underline-offset-3 hover:text-accent-ink">
            Read the case studies
          </Link>{" "}
          for the long version of any of this.
        </p>
      </section>
    </main>
  );
}