import {
  itemList,
  type BeforeAfterItem,
  type CompareItem,
  type ContextItem,
  type MetricItem,
  type StackItem,
  type StepItem,
} from "@/lib/explorer-widgets";

const TILE =
  "rounded-[8px] border border-rule bg-surface px-5 py-4";
const VALUE = "text-[clamp(26px,3vw,34px)] leading-none font-semibold tracking-[-0.02em]";
const MONO_LABEL = "font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase";

/** Renders one explorer widget. Unknown types render nothing; validation fails the build first. */
export function Widget({ type, data }: { type: string; data: unknown }) {
  const items = itemList(data);

  switch (type) {
    case "context":
      return <ContextWidget items={items as ContextItem[]} />;
    case "constraints":
      return <ConstraintsWidget items={items as string[]} />;
    case "steps":
      return <StepsWidget items={items as StepItem[]} />;
    case "metrics":
      return <MetricsWidget items={items as MetricItem[]} />;
    case "beforeAfter":
      return <BeforeAfterWidget items={items as BeforeAfterItem[]} />;
    case "compare":
      return <CompareWidget items={items as CompareItem[]} />;
    case "stack":
      return <StackWidget items={items as StackItem[]} />;
    default:
      return null;
  }
}

function ContextWidget({ items }: { items: ContextItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className={TILE}>
          <p className={VALUE}>{item.value}</p>
          <p className={`mt-3 ${MONO_LABEL}`}>{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function ConstraintsWidget({ items }: { items: string[] }) {
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {items.map((item, index) => (
        <li key={item} className="flex gap-4 py-3">
          <span className="font-mono text-[11px] tracking-[0.14em] text-ink-faint">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-[16px]">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function StepsWidget({ items }: { items: StepItem[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <li
            key={item.tag}
            className={`${TILE} ${last ? "border-accent" : ""} flex flex-col`}
          >
            <span className="font-mono text-[11px] tracking-[0.14em] text-ink-faint">
              {item.tag}
              {last ? <span className="ml-2 text-accent-ink">✓</span> : null}
            </span>
            <p className="mt-3 text-[17px] font-semibold tracking-[-0.01em]">{item.title}</p>
            <p className="mt-1 text-[15px] text-ink-muted">{item.detail}</p>
          </li>
        );
      })}
    </ol>
  );
}

function MetricsWidget({ items }: { items: MetricItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className={TILE}>
          <p className={`${VALUE} text-accent-ink`}>{item.value}</p>
          <p className={`mt-3 ${MONO_LABEL}`}>{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function percent(after: string, before: string): number {
  const a = Number(after);
  const b = Number(before);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 100;
  return Math.max(0, Math.min(100, (a / b) * 100));
}

function BeforeAfterWidget({ items }: { items: BeforeAfterItem[] }) {
  return (
    <ul className="space-y-5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-4">
            <span className={MONO_LABEL}>{item.label}</span>
            <span className="font-mono text-[12px] text-accent-ink">{item.delta}</span>
          </div>
          <div
            className="mt-2 h-2 rounded-[2px] bg-rule"
            role="img"
            aria-label={`${item.label}: ${item.before} before, ${item.after} after, ${item.delta}`}
          >
            <div
              className="h-full rounded-[2px] bg-accent"
              style={{ width: `${percent(item.after, item.before)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CompareWidget({ items }: { items: CompareItem[] }) {
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {items.map((item) => (
        <li key={item.what} className="flex gap-4 py-3">
          <span
            aria-hidden="true"
            className={`mt-[3px] font-mono text-[13px] ${
              item.ok ? "text-verified" : "text-ink-faint"
            }`}
          >
            {item.ok ? "✓" : "✗"}
          </span>
          <span className="text-[16px]">
            <span className="font-semibold">{item.what}</span>
            <span className="text-ink-muted"> — {item.detail}</span>
            <span className="sr-only">{item.ok ? " (good)" : " (problem)"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function StackWidget({ items }: { items: StackItem[] }) {
  return (
    <dl className="border-t border-rule">
      {items.map((item) => (
        <div key={item.tool} className="border-b border-rule py-3 md:flex md:gap-8">
          <dt className="font-mono text-[12px] tracking-[0.06em] uppercase md:w-56 md:shrink-0">
            {item.tool}
          </dt>
          <dd className="mt-1 text-[16px] text-ink-muted md:mt-0">{item.why}</dd>
        </div>
      ))}
    </dl>
  );
}
