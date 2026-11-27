import Link from "next/link";
import { getSite } from "@/lib/content";

const NAV = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const site = getSite();

  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-[1120px] items-baseline justify-between gap-6 px-6 py-5 md:px-10">
        <Link href="/" className="text-[15px] font-semibold tracking-[-0.01em]">
          {site.name}
        </Link>
        <nav aria-label="Main" className="flex gap-6">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase transition-colors duration-200 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}