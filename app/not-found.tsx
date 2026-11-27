import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-[1120px] flex-col items-start px-6 py-32 md:px-10">
      <p className="font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">404</p>
      <h1 className="mt-4 text-[clamp(28px,3.6vw,44px)] leading-[1.05] font-semibold tracking-[-0.02em]">
        Nothing here.
      </h1>
      <p className="mt-4 text-[16px] text-ink-muted">
        The page may have been renamed, or the link may be wrong.
      </p>
      <Link
        href="/work"
        className="mt-8 border border-rule px-4 py-3 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors duration-200 hover:border-ink-faint"
      >
        All work
      </Link>
    </main>
  );
}