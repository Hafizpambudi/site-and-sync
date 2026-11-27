import Link from "next/link";
import { CaseCard } from "@/components/CaseCard";
import { getAllSlugs, getExplorer, getFeatured, getSite } from "@/lib/content";
import { validateExplorer } from "@/lib/validate-explorer";

export default function Home() {
  const site = getSite();
  const featured = getFeatured(3);

  const explorer = getExplorer();
  const errors = validateExplorer(explorer, getAllSlugs());
  if (errors.length > 0) throw new Error(`explorer.json invalid:\n${errors.join("\n")}`);

  return (
    <main>
      <section className="mx-auto max-w-[1120px] px-6 pt-24 pb-20 md:px-10 md:pt-32 md:pb-28">
        <p className="font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">
          {site.name} · {site.role}
        </p>
        <h1 className="mt-6 max-w-[20ch] text-[clamp(40px,6vw,76px)] leading-[0.98] font-semibold tracking-[-0.03em]">
          {site.thesis}
        </h1>
        <p className="mt-8 max-w-[58ch] text-[17px] text-ink-muted">{site.supporting}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/work"
            className="border border-ink bg-ink px-5 py-3 font-mono text-[11px] tracking-[0.14em] text-paper uppercase transition-colors duration-200 hover:border-accent-ink hover:bg-accent-ink"
          >
            View work
          </Link>
          <Link
            href="/about"
            className="border border-rule px-5 py-3 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors duration-200 hover:border-ink-faint"
          >
            About
          </Link>
        </div>
      </section>

      <section id="explorer" aria-label="Case study explorer" className="border-t border-rule">
        <div className="mx-auto max-w-[1120px] px-6 py-20 md:px-10 md:py-28">
          <p className="font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">
            01 — Explorer
          </p>
          <h2 className="mt-4 max-w-[26ch] text-[clamp(28px,3.4vw,44px)] leading-[1.06] font-semibold tracking-[-0.02em]">
            Ask the work, not the résumé.
          </h2>
        </div>
      </section>

      <section className="border-t border-rule">
        <div className="mx-auto max-w-[1120px] px-6 py-20 md:px-10 md:py-28">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">
                02 — Selected work
              </p>
              <h2 className="mt-4 text-[clamp(28px,3.4vw,44px)] leading-[1.06] font-semibold tracking-[-0.02em]">
                Three systems, three numbers.
              </h2>
            </div>
            <Link
              href="/work"
              className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase underline underline-offset-3 transition-colors duration-200 hover:text-ink"
            >
              All work
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {featured.map((item) => (
                <CaseCard key={item.slug} item={item} />
              ))}
            </div>
          ) : (
            <p className="mt-10 text-[15px] text-ink-muted">
              No case studies published yet.
            </p>
          )}
        </div>
      </section>

      <section className="border-t border-rule">
        <div className="mx-auto max-w-[1120px] px-6 py-20 md:px-10 md:py-28">
          <p className="font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">
            03 — Stack
          </p>
          <p className="mt-5 max-w-[62ch] text-[17px]">
            {site.stack.join(" · ")}
          </p>
          <p className="mt-3 max-w-[62ch] text-[15px] text-ink-muted">
            Chosen for the job, not for the logo. The full reasoning is on the{" "}
            <Link
              href="/about"
              className="underline underline-offset-3 transition-colors duration-200 hover:text-accent-ink"
            >
              about page
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="border-t border-rule">
        <div className="mx-auto max-w-[1120px] px-6 py-20 md:px-10 md:py-28">
          <p className="font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">
            04 — Contact
          </p>
          <h2 className="mt-4 max-w-[24ch] text-[clamp(28px,3.4vw,44px)] leading-[1.06] font-semibold tracking-[-0.02em]">
            {site.availability}
          </h2>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {site.email ? (
              <a
                href={`mailto:${site.email}`}
                className="border border-ink bg-ink px-5 py-3 font-mono text-[11px] tracking-[0.14em] text-paper uppercase transition-colors duration-200 hover:border-accent-ink hover:bg-accent-ink"
              >
                {site.email}
              </a>
            ) : null}
            {site.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                rel="noreferrer noopener"
                target="_blank"
                className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase underline underline-offset-3 transition-colors duration-200 hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}