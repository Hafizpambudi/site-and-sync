import type { Metadata } from "next";
import { getSite } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact — Hafiz Pambudi",
  description: "Email, GitHub, LinkedIn. Open to full-stack AI engineering work.",
};

export default function ContactPage() {
  const site = getSite();

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-20 md:px-10">
      <p className="font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">Contact</p>
      <h1 className="mt-4 max-w-[22ch] text-[clamp(32px,4.6vw,56px)] leading-[1.02] font-semibold tracking-[-0.03em]">
        {site.availability}
      </h1>
      <p className="mt-6 max-w-[58ch] text-[18px] text-ink-muted">
        The fastest way to reach me is email. If you have a problem that has been described
        vaguely for a while, that is usually the one worth sending.
      </p>

      <div className="mt-12 border-t border-rule pt-8">
        {site.email ? (
          <div className="border-b border-rule pb-6">
            <p className="font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">Email</p>
            <a
              href={`mailto:${site.email}`}
              className="mt-2 block text-[clamp(20px,2.4vw,28px)] font-semibold tracking-[-0.01em] underline underline-offset-4 transition-colors duration-200 hover:text-accent-ink"
            >
              {site.email}
            </a>
          </div>
        ) : null}

        {site.links.map((link) => (
          <div key={link.href} className="border-b border-rule py-6">
            <p className="font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">
              {link.label}
            </p>
            <a
              href={link.href}
              rel="noreferrer noopener"
              target="_blank"
              className="mt-2 block text-[16px] underline underline-offset-3 transition-colors duration-200 hover:text-accent-ink"
            >
              {link.href.replace(/^https?:\/\//, "")}
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}