import { getSite } from "@/lib/content";

export function SiteFooter() {
  const site = getSite();

  return (
    <footer className="mt-32 border-t border-rule">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-10">
        <p className="text-[14px] text-ink-muted">
          {site.name} · {site.role}
        </p>
        <nav aria-label="Elsewhere" className="flex flex-wrap gap-x-6 gap-y-2">
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
          {site.email ? (
            <a
              href={`mailto:${site.email}`}
              className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase underline underline-offset-3 transition-colors duration-200 hover:text-ink"
            >
              Email
            </a>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}