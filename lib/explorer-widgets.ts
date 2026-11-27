export const KNOWN_WIDGET_TYPES = [
  "context",
  "constraints",
  "steps",
  "metrics",
  "beforeAfter",
  "compare",
  "stack",
] as const;

export type WidgetType = (typeof KNOWN_WIDGET_TYPES)[number];

export function isKnownWidgetType(type: unknown): type is WidgetType {
  return typeof type === "string" && (KNOWN_WIDGET_TYPES as readonly string[]).includes(type);
}

export type ContextItem = { value: string; label: string };
export type StepItem = { tag: string; title: string; detail: string };
export type MetricItem = { value: string; label: string };
export type BeforeAfterItem = { label: string; before: string; after: string; delta: string };
export type CompareItem = { ok: boolean; what: string; detail: string };
export type StackItem = { tool: string; why: string };

export function itemList(data: unknown): unknown[] {
  if (data && typeof data === "object") {
    const items = (data as { items?: unknown }).items;
    if (Array.isArray(items)) return items;
  }
  return [];
}
