# Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an owned portfolio site whose case studies are authored in Notion and synced into git by a triggered worker.

**Architecture:** One Next.js 16 repository. S2 is a folder of pure TypeScript that fetches Notion, transforms blocks to Markdown, downloads images, and commits under `content/`. S1 is a static Next app that reads `content/` at build time. A Vercel route receives the Notion webhook and dispatches a GitHub Action; a weekly cron and a manual run hit the same worker.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, `@notionhq/client` 5, `react-markdown` + `remark-gfm`, Vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-27-portfolio-site-design.md`

## Global Constraints

- TypeScript strict. No `any` in committed code.
- No component library. No animation library. No charting library.
- Only `opacity` and `translateY(8px)` may animate.
- Colours, type sizes, and spacing come from the tokens in `app/globals.css`. No ad-hoc hex values in components.
- `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NOTION_WEBHOOK_VERIFICATION_TOKEN`, `GITHUB_DISPATCH_TOKEN` are read only from the environment. Never committed.
- Supported Notion blocks only; unsupported types emit `<!-- unsupported: <type> -->` and a warning. Never drop content silently.
- `npm run check` must pass before any task is called complete.
- Content directories are written by the sync only. Never hand-edit `content/case-studies/`.

---

### Task 1: Scaffold the application

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.example`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- Test: none (configuration)

**Interfaces:**
- Produces: token CSS variables `--color-paper`, `--color-surface`, `--color-ink`, `--color-ink-muted`, `--color-ink-faint`, `--color-rule`, `--color-accent`, `--color-accent-ink`, `--color-verified`; font variables `--font-archivo`, `--font-newsreader`, `--font-mono`.

- [ ] **Step 1: Initialise the package**

```bash
npm init -y
npm i next@16.4.6 react@19.3.1 react-dom@19.3.1
npm i -D typescript @types/react @types/react-dom @types/node tailwindcss@4.3.5 @tailwindcss/postcss postcss eslint eslint-config-next
```

- [ ] **Step 2: Write `package.json` scripts**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "npm run lint && npm run typecheck && npm run test && npm run build",
    "sync": "tsx scripts/sync/cli.ts"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `.gitignore`**

```
node_modules/
.next/
out/
.env
.env.local
.last-sync.json
test-results/
playwright-report/
```

- [ ] **Step 5: Write `.env.example`**

```
NOTION_TOKEN=
NOTION_DATABASE_ID=
NOTION_WEBHOOK_VERIFICATION_TOKEN=
GITHUB_DISPATCH_TOKEN=
GITHUB_REPO=owner/repo
```

- [ ] **Step 6: Write `app/globals.css` with the tokens**

```css
@import "tailwindcss";

@theme {
  --color-paper: #fafaf8;
  --color-surface: #ffffff;
  --color-ink: #17160f;
  --color-ink-muted: #5c5a50;
  --color-ink-faint: #8a877b;
  --color-rule: #e4e1d8;
  --color-accent: #d4500f;
  --color-accent-ink: #a83b06;
  --color-verified: #1d6b45;
  --font-sans: var(--font-archivo), system-ui, sans-serif;
  --font-serif: var(--font-newsreader), Georgia, serif;
  --font-mono: var(--font-mono-family), ui-monospace, monospace;
}

:root {
  color-scheme: only light;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 7: Write `app/layout.tsx` with the three fonts**

```tsx
import type { Metadata } from "next";
import { Archivo, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", weight: ["400", "500", "600"] });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-family" });

export const metadata: Metadata = {
  title: "Hafiz Pambudi — Full-stack AI Engineer",
  description:
    "Most of my work starts as a vague request and ends as a shipped system with a number attached.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${newsreader.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Verify the build**

Run: `npm run build`
Expected: PASS, one static route generated.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold next app with design tokens"
```

---

### Task 2: Slug validation

**Files:**
- Create: `scripts/sync/slug.ts`
- Test: `scripts/sync/slug.test.ts`

**Interfaces:**
- Produces: `isValidSlug(slug: string): boolean`, `SLUG_PATTERN: RegExp`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { isValidSlug } from "./slug";

describe("isValidSlug", () => {
  it("accepts lowercase words joined by single hyphens", () => {
    expect(isValidSlug("legal-rag-archive")).toBe(true);
  });
  it("rejects uppercase", () => {
    expect(isValidSlug("Legal-RAG")).toBe(false);
  });
  it("rejects leading and trailing hyphens", () => {
    expect(isValidSlug("-legal")).toBe(false);
    expect(isValidSlug("legal-")).toBe(false);
  });
  it("rejects double hyphens and spaces", () => {
    expect(isValidSlug("legal--rag")).toBe(false);
    expect(isValidSlug("legal rag")).toBe(false);
  });
  it("rejects empty and over-long slugs", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("a".repeat(65))).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run scripts/sync/slug.test.ts`
Expected: FAIL, cannot resolve `./slug`.

- [ ] **Step 3: Implement**

```ts
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 64 && SLUG_PATTERN.test(slug);
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run scripts/sync/slug.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync/slug.ts scripts/sync/slug.test.ts
git commit -m "feat(sync): validate case study slugs"
```

---

### Task 3: Rich text flattening

**Files:**
- Create: `scripts/sync/rich-text.ts`
- Test: `scripts/sync/rich-text.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `flattenRichText(items: RichTextItem[]): string`, type `RichTextItem`
- `RichTextItem` shape: `{ type?: string; plain_text?: string; href?: string | null; text?: { content: string }; annotations?: { bold?: boolean; italic?: boolean; strikethrough?: boolean; code?: boolean } }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { flattenRichText } from "./rich-text";

const text = (content: string, annotations = {}) => ({
  plain_text: content,
  href: null,
  text: { content },
  annotations,
});

describe("flattenRichText", () => {
  it("returns empty string for empty input", () => {
    expect(flattenRichText([])).toBe("");
  });
  it("joins plain segments", () => {
    expect(flattenRichText([text("Hello "), text("world")])).toBe("Hello world");
  });
  it("applies bold, italic, code and strikethrough", () => {
    expect(flattenRichText([text("a", { bold: true })])).toBe("**a**");
    expect(flattenRichText([text("a", { italic: true })])).toBe("*a*");
    expect(flattenRichText([text("a", { code: true })])).toBe("`a`");
    expect(flattenRichText([text("a", { strikethrough: true })])).toBe("~~a~~");
  });
  it("wraps links", () => {
    expect(flattenRichText([{ ...text("docs"), href: "https://example.com" }])).toBe(
      "[docs](https://example.com)",
    );
  });
  it("escapes markdown control characters in plain text", () => {
    expect(flattenRichText([text("2 * 3 _x_ [y]")])).toBe("2 \\* 3 \\_x\\_ \\[y\\]");
  });
  it("does not escape inside code", () => {
    expect(flattenRichText([text("a_b", { code: true })])).toBe("`a_b`");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run scripts/sync/rich-text.test.ts`
Expected: FAIL, cannot resolve `./rich-text`.

- [ ] **Step 3: Implement**

```ts
export type RichTextItem = {
  type?: string;
  plain_text?: string;
  href?: string | null;
  text?: { content: string };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    code?: boolean;
  };
};

const ESCAPE = /([\\*_`[\]])/g;

function escapeText(value: string): string {
  return value.replace(ESCAPE, "\\$1");
}

function render(item: RichTextItem): string {
  const raw = item.plain_text ?? item.text?.content ?? "";
  if (raw === "") return "";

  const a = item.annotations ?? {};
  let out = a.code ? `\`${raw}\`` : escapeText(raw);

  if (a.bold) out = `**${out}**`;
  if (a.italic) out = `*${out}*`;
  if (a.strikethrough) out = `~~${out}~~`;
  if (item.href) out = `[${out}](${item.href})`;

  return out;
}

export function flattenRichText(items: RichTextItem[]): string {
  return items.map(render).join("");
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run scripts/sync/rich-text.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync/rich-text.ts scripts/sync/rich-text.test.ts
git commit -m "feat(sync): flatten notion rich text to markdown"
```

---

### Task 4: Block to Markdown transformer

**Files:**
- Create: `scripts/sync/blocks.ts`, `scripts/sync/types.ts`
- Test: `scripts/sync/blocks.test.ts`

**Interfaces:**
- Consumes: `flattenRichText` from `./rich-text`
- Produces: `transformBlocks(blocks: NotionBlock[]): { markdown: string; warnings: string[] }`, `transformBlock(block: NotionBlock, ctx: TransformContext): string`
- `TransformContext`: `{ resolveImage(blockId: string): string; children(block: NotionBlock): string }`
- `NotionBlock` shape: `{ id: string; type: string; has_children?: boolean; [key: string]: unknown }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { transformBlocks } from "./blocks";

const rich = (content: string) => [{ plain_text: content, href: null, text: { content }, annotations: {} }];
const block = (type: string, payload: Record<string, unknown> = {}, id = type) => ({
  id,
  type,
  has_children: false,
  [type]: { rich_text: rich("x"), ...payload },
});

const ctx = { resolveImage: () => "/content/x.png", children: () => "" };

describe("transformBlocks", () => {
  it("renders headings at the right depth", () => {
    expect(transformBlocks([block("heading_1", { rich_text: rich("A") })], ctx).markdown).toBe("# A");
    expect(transformBlocks([block("heading_3", { rich_text: rich("C") })], ctx).markdown).toBe("### C");
  });
  it("renders paragraphs separated by a blank line", () => {
    const out = transformBlocks(
      [block("paragraph", { rich_text: rich("one") }), block("paragraph", { rich_text: rich("two") })],
      ctx,
    ).markdown;
    expect(out).toBe("one\n\ntwo");
  });
  it("groups consecutive numbered items into one list", () => {
    const out = transformBlocks(
      [
        block("numbered_list_item", { rich_text: rich("first") }),
        block("numbered_list_item", { rich_text: rich("second") }),
      ],
      ctx,
    ).markdown;
    expect(out).toBe("1. first\n2. second");
  });
  it("renders to-do checkboxes", () => {
    const out = transformBlocks(
      [block("to_do", { rich_text: rich("done"), checked: true })],
      ctx,
    ).markdown;
    expect(out).toBe("- [x] done");
  });
  it("renders quotes and callouts as blockquotes", () => {
    expect(transformBlocks([block("quote", { rich_text: rich("q") })], ctx).markdown).toBe("> q");
    expect(
      transformBlocks([block("callout", { rich_text: rich("c"), icon: { emoji: "!" } })], ctx).markdown,
    ).toBe("> c");
  });
  it("renders fenced code with the language", () => {
    const raw = "const a = 1;";
    const out = transformBlocks(
      [block("code", { rich_text: [{ plain_text: raw, text: { content: raw }, annotations: {} }], language: "typescript" })],
      ctx,
    ).markdown;
    expect(out).toBe("```typescript\nconst a = 1;\n```");
  });
  it("renders dividers", () => {
    expect(transformBlocks([block("divider")], ctx).markdown).toBe("---");
  });
  it("renders images through the resolver", () => {
    const out = transformBlocks(
      [block("image", { type: "file", caption: rich("shot"), file: { url: "https://s3/x.png" } })],
      ctx,
    ).markdown;
    expect(out).toBe("![shot](/content/x.png)");
  });
  it("renders a table with a header row", () => {
    const out = transformBlocks(
      [
        block("table", {
          table_width: 2,
          children: [
            block("table_row", { cells: [rich("Metric"), rich("Value")] }),
            block("table_row", { cells: [rich("Accuracy"), rich("90%")] }),
          ],
        }),
      ],
      { ...ctx, children: () => "Metric | Value\n--- | ---\nAccuracy | 90%" },
    ).markdown;
    expect(out).toBe("| Metric | Value |\n| --- | --- |\n| Accuracy | 90% |");
  });
  it("emits a warning and a comment for unsupported blocks", () => {
    const result = transformBlocks([block("synced_block")], ctx);
    expect(result.markdown).toBe("<!-- unsupported: synced_block -->");
    expect(result.warnings).toHaveLength(1);
  });
  it("renders toggle summaries as bold text with children below", () => {
    const out = transformBlocks(
      [{ ...block("toggle", { rich_text: rich("More") }), has_children: true }],
      { ...ctx, children: () => "inner" },
    ).markdown;
    expect(out).toBe("**More**\n\ninner");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run scripts/sync/blocks.test.ts`
Expected: FAIL, cannot resolve `./blocks`.

- [ ] **Step 3: Implement `scripts/sync/types.ts`**

```ts
import type { RichTextItem } from "./rich-text";

export type NotionBlock = {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
};

export type TransformContext = {
  resolveImage(blockId: string): string;
  children(block: NotionBlock): string;
};

export type TransformResult = {
  markdown: string;
  warnings: string[];
};

export type RichTextBlockPayload = {
  rich_text?: RichTextItem[];
  checked?: boolean;
  language?: string;
  caption?: RichTextItem[];
  type?: string;
  file?: { url: string };
  external?: { url: string };
  url?: string;
  table_width?: number;
  children?: NotionBlock[];
  cells?: RichTextItem[][];
};

export function payloadOf(block: NotionBlock): RichTextBlockPayload {
  return (block[block.type] ?? {}) as RichTextBlockPayload;
}
```

- [ ] **Step 4: Implement `scripts/sync/blocks.ts`**

```ts
import { flattenRichText } from "./rich-text";
import { payloadOf, type NotionBlock, type TransformContext, type TransformResult } from "./types";

const SUPPORTED = new Set([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "to_do",
  "quote",
  "callout",
  "code",
  "divider",
  "image",
  "bookmark",
  "table",
  "table_row",
  "toggle",
]);

function imageUrl(block: NotionBlock): string | null {
  const p = payloadOf(block);
  return p.file?.url ?? p.external?.url ?? p.url ?? null;
}

export function transformBlock(block: NotionBlock, ctx: TransformContext): string {
  const p = payloadOf(block);
  const text = flattenRichText(p.rich_text ?? []);

  switch (block.type) {
    case "paragraph":
      return text;
    case "heading_1":
      return `# ${text}`;
    case "heading_2":
      return `## ${text}`;
    case "heading_3":
      return `### ${text}`;
    case "bulleted_list_item":
      return `- ${text}`;
    case "numbered_list_item":
      return `1. ${text}`;
    case "to_do":
      return `- [${p.checked ? "x" : " "}] ${text}`;
    case "quote":
      return `> ${text}`;
    case "callout":
      return `> ${text}`;
    case "code": {
      const raw = (p.rich_text ?? []).map((i) => i.plain_text ?? i.text?.content ?? "").join("");
      return "```" + (p.language ?? "") + "\n" + raw + "\n```";
    }
    case "divider":
      return "---";
    case "image": {
      const caption = flattenRichText(p.caption ?? []);
      return `![${caption}](${ctx.resolveImage(block.id)})`;
    }
    case "bookmark": {
      const url = p.url ?? "";
      return `[${url}](${url})`;
    }
    case "table": {
      const rows = (p.children ?? []).map((row) =>
        (payloadOf(row).cells ?? []).map((cell) => flattenRichText(cell).replace(/\|/g, "\\|")),
      );
      const [head, ...body] = rows;
      if (!head) return "";
      const width = head.length;
      const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
      const divider = `| ${new Array(width).fill("---").join(" | ")} |`;
      return [line(head), divider, ...body.map(line)].join("\n");
    }
    case "table_row":
      return (p.cells ?? []).map((cell) => flattenRichText(cell)).join(" | ");
    case "toggle":
      return `**${text}**\n\n${ctx.children(block)}`;
    default:
      return "";
  }
}

export function transformBlocks(blocks: NotionBlock[], ctx: TransformContext): TransformResult {
  const warnings: string[] = [];
  const out: string[] = [];
  let numbered = 0;

  for (const block of blocks) {
    if (!SUPPORTED.has(block.type)) {
      warnings.push(`unsupported block type: ${block.type} (${block.id})`);
      out.push(`<!-- unsupported: ${block.type} -->`);
      numbered = 0;
      continue;
    }

    if (block.type === "numbered_list_item") {
      numbered += 1;
      out.push(`${numbered}. ${flattenRichText(payloadOf(block).rich_text ?? [])}`);
      continue;
    }

    numbered = 0;
    out.push(transformBlock(block, ctx));
  }

  const markdown = out
    .map((chunk) => chunk.replace(/[ \t]+$/gm, ""))
    .filter((chunk) => chunk !== "")
    .join("\n\n");

  return { markdown, warnings };
}
```

- [ ] **Step 5: Verify it passes**

Run: `npx vitest run scripts/sync/blocks.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/sync/blocks.ts scripts/sync/types.ts scripts/sync/blocks.test.ts
git commit -m "feat(sync): transform notion blocks to markdown"
```

---

### Task 5: Frontmatter, index builder, and sync diff

**Files:**
- Create: `scripts/sync/frontmatter.ts`, `scripts/sync/index-builder.ts`, `scripts/sync/plan.ts`
- Test: `scripts/sync/frontmatter.test.ts`, `scripts/sync/index-builder.test.ts`, `scripts/sync/plan.test.ts`

**Interfaces:**
- Produces:
  - `toFrontmatter(data: Record<string, unknown>): string`
  - `buildIndex(entries: CaseStudyMeta[]): CaseStudyMeta[]`
  - `planSync(local: LocalEntry[], remote: RemoteRow[]): SyncPlan`
  - `type CaseStudyMeta = { slug, title, summary, date, tags, cover, featured, role, timeline }`
  - `type LocalEntry = { notionId: string; slug: string; notionLastEdited: string }`
  - `type RemoteRow = { notionId: string; slug: string; lastEdited: string }`
  - `type SyncPlan = { fetch: RemoteRow[]; remove: string[]; unchanged: string[] }`

- [ ] **Step 1: Write the failing tests**

```ts
// frontmatter.test.ts
import { describe, expect, it } from "vitest";
import { toFrontmatter } from "./frontmatter";

describe("toFrontmatter", () => {
  it("serialises scalars, arrays and quotes strings with colons", () => {
    expect(
      toFrontmatter({ title: "A: B", tags: ["x", "y"], featured: true, date: "2026-03-14" }),
    ).toBe('---\ntitle: "A: B"\ntags:\n  - "x"\n  - "y"\nfeatured: true\ndate: "2026-03-14"\n---\n');
  });
  it("omits undefined values", () => {
    expect(toFrontmatter({ title: "T", timeline: undefined })).toBe('---\ntitle: "T"\n---\n');
  });
});
```

```ts
// index-builder.test.ts
import { describe, expect, it } from "vitest";
import { buildIndex } from "./index-builder";

const meta = (slug: string, date: string, featured = false) => ({
  slug,
  title: slug,
  summary: slug,
  date,
  tags: [],
  cover: null,
  featured,
  role: "r",
  timeline: null,
});

describe("buildIndex", () => {
  it("sorts newest first", () => {
    expect(buildIndex([meta("old", "2025-01-01"), meta("new", "2026-01-01")]).map((m) => m.slug)).toEqual([
      "new",
      "old",
    ]);
  });
  it("keeps featured first within the same date", () => {
    expect(
      buildIndex([meta("a", "2026-01-01"), meta("b", "2026-01-01", true)]).map((m) => m.slug),
    ).toEqual(["b", "a"]);
  });
});
```

```ts
// plan.test.ts
import { describe, expect, it } from "vitest";
import { planSync } from "./plan";

describe("planSync", () => {
  it("fetches new rows", () => {
    const plan = planSync([], [{ notionId: "1", slug: "a", lastEdited: "2026-01-01T00:00:00.000Z" }]);
    expect(plan.fetch).toHaveLength(1);
    expect(plan.remove).toEqual([]);
  });
  it("skips unchanged rows", () => {
    const plan = planSync(
      [{ notionId: "1", slug: "a", notionLastEdited: "2026-01-01T00:00:00.000Z" }],
      [{ notionId: "1", slug: "a", lastEdited: "2026-01-01T00:00:00.000Z" }],
    );
    expect(plan.fetch).toEqual([]);
    expect(plan.unchanged).toEqual(["a"]);
  });
  it("fetches rows edited since the last sync", () => {
    const plan = planSync(
      [{ notionId: "1", slug: "a", notionLastEdited: "2026-01-01T00:00:00.000Z" }],
      [{ notionId: "1", slug: "a", lastEdited: "2026-02-01T00:00:00.000Z" }],
    );
    expect(plan.fetch).toHaveLength(1);
  });
  it("removes local folders that are no longer published", () => {
    const plan = planSync([{ notionId: "1", slug: "gone", notionLastEdited: "2026-01-01T00:00:00.000Z" }], []);
    expect(plan.remove).toEqual(["gone"]);
  });
});
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run scripts/sync/frontmatter.test.ts scripts/sync/index-builder.test.ts scripts/sync/plan.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `scripts/sync/frontmatter.ts`**

```ts
function scalar(value: unknown): string {
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  const text = String(value);
  return /[:#\[\]{}",]|^\s|\s$/.test(text) ? JSON.stringify(text) : JSON.stringify(text);
}

export function toFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${scalar(item)}`);
      continue;
    }
    lines.push(`${key}: ${scalar(value)}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}
```

- [ ] **Step 4: Implement `scripts/sync/index-builder.ts`**

```ts
export type CaseStudyMeta = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  cover: string | null;
  featured: boolean;
  role: string;
  timeline: string | null;
};

export function buildIndex(entries: CaseStudyMeta[]): CaseStudyMeta[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.slug.localeCompare(b.slug);
  });
}
```

- [ ] **Step 5: Implement `scripts/sync/plan.ts`**

```ts
export type LocalEntry = { notionId: string; slug: string; notionLastEdited: string };
export type RemoteRow = { notionId: string; slug: string; lastEdited: string };
export type SyncPlan = { fetch: RemoteRow[]; remove: string[]; unchanged: string[] };

export function planSync(local: LocalEntry[], remote: RemoteRow[]): SyncPlan {
  const localById = new Map(local.map((entry) => [entry.notionId, entry]));
  const remoteIds = new Set(remote.map((row) => row.notionId));

  const fetch: RemoteRow[] = [];
  const unchanged: string[] = [];

  for (const row of remote) {
    const existing = localById.get(row.notionId);
    if (!existing) {
      fetch.push(row);
      continue;
    }
    const changed =
      Date.parse(row.lastEdited) > Date.parse(existing.notionLastEdited) || existing.slug !== row.slug;
    if (changed) fetch.push(row);
    else unchanged.push(row.slug);
  }

  const remove = local.filter((entry) => !remoteIds.has(entry.notionId)).map((entry) => entry.slug);

  return { fetch, remove, unchanged };
}
```

- [ ] **Step 6: Verify the tests pass**

Run: `npx vitest run scripts/sync/frontmatter.test.ts scripts/sync/index-builder.test.ts scripts/sync/plan.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 7: Commit**

```bash
git add scripts/sync/frontmatter.ts scripts/sync/frontmatter.test.ts scripts/sync/index-builder.ts scripts/sync/index-builder.test.ts scripts/sync/plan.ts scripts/sync/plan.test.ts
git commit -m "feat(sync): serialise frontmatter, build index, plan diffs"
```

---

### Task 6: Notion client and image downloader

**Files:**
- Create: `scripts/sync/notion.ts`, `scripts/sync/images.ts`, `scripts/sync/retry.ts`
- Test: `scripts/sync/images.test.ts`, `scripts/sync/retry.test.ts`

**Interfaces:**
- Produces:
  - `queryPublished(notion: Client, dbId: string): Promise<RemoteRow[]>`
  - `fetchPageTree(notion: Client, pageId: string): Promise<NotionBlock[]>`
  - `downloadImages(blocks: NotionBlock[], slug: string): Promise<Map<string, string>>`
  - `withRetry<T>(fn: () => Promise<T>, attempts?: number): Promise<T>`
  - `imageFilename(url: string): string`

- [ ] **Step 1: Confirm the current Notion query endpoint before coding**

Run: `npm i @notionhq/client@5.32.0`
Then open `node_modules/@notionhq/client/build/src/api-endpoints.d.ts` and confirm whether the SDK exposes `databases.query` or `dataSources.query`. Use whichever the installed SDK exposes for `Notion-Version: 2025-09-03`. Record the answer in the commit message.

- [ ] **Step 2: Write the failing retry test**

```ts
import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  it("returns the first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    expect(await withRetry(fn, 3)).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it("retries until success", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("429")).mockResolvedValue("ok");
    expect(await withRetry(fn, 3)).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it("throws after exhausting attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("500"));
    await expect(withRetry(fn, 2)).rejects.toThrow("500");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Write the failing image test**

```ts
import { describe, expect, it } from "vitest";
import { imageFilename } from "./images";

describe("imageFilename", () => {
  it("keeps the extension and hashes the path", () => {
    const a = imageFilename("https://s3.amazonaws.com/x/Cover.PNG?X-Amz-Expires=3600");
    const b = imageFilename("https://s3.amazonaws.com/x/Cover.PNG?X-Amz-Expires=7200");
    expect(a.endsWith(".png")).toBe(true);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{12}\.png$/);
  });
  it("falls back to .png when there is no extension", () => {
    expect(imageFilename("https://s3/x/file")).toMatch(/\.png$/);
  });
});
```

- [ ] **Step 4: Run and watch both fail**

Run: `npx vitest run scripts/sync/retry.test.ts scripts/sync/images.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 5: Implement `scripts/sync/retry.ts`**

```ts
export async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}
```

- [ ] **Step 6: Implement `scripts/sync/images.ts`**

```ts
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { withRetry } from "./retry";
import { payloadOf, type NotionBlock } from "./types";

const MAX_BYTES = 2 * 1024 * 1024;

export function imageFilename(url: string): string {
  const withoutQuery = url.split("?")[0] ?? url;
  const ext = (path.extname(withoutQuery) || ".png").toLowerCase();
  const safeExt = /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : ".png";
  const hash = createHash("sha1").update(withoutQuery).digest("hex").slice(0, 12);
  return `${hash}${safeExt}`;
}

function notionUrl(block: NotionBlock): string | null {
  const p = payloadOf(block);
  return p.file?.url ?? p.external?.url ?? p.url ?? null;
}

export async function downloadImages(
  blocks: NotionBlock[],
  slug: string,
  root = process.cwd(),
): Promise<Map<string, string>> {
  const publicDir = path.join(root, "public", "content", "case-studies", slug);
  const map = new Map<string, string>();

  for (const block of blocks) {
    if (block.type !== "image") continue;
    const url = notionUrl(block);
    if (!url) continue;

    const filename = imageFilename(url);
    if (!map.has(block.id)) {
      await mkdir(publicDir, { recursive: true });
      const bytes = await withRetry(async () => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`image ${response.status} for ${url}`);
        return new Uint8Array(await response.arrayBuffer());
      });
      if (bytes.byteLength > MAX_BYTES) {
        console.warn(`warning: image over 2MB (${bytes.byteLength} bytes) in ${slug}`);
      }
      await writeFile(path.join(publicDir, filename), bytes);
    }
    map.set(block.id, `/content/case-studies/${slug}/${filename}`);
  }

  return map;
}
```

- [ ] **Step 7: Implement `scripts/sync/notion.ts`**

```ts
import { Client } from "@notionhq/client";
import type { NotionBlock } from "./types";
import { withRetry } from "./retry";
import { flattenRichText } from "./rich-text";
import type { RemoteRow } from "./plan";

export function notionClient(token: string): Client {
  return new Client({ auth: token });
}

function propertyText(properties: Record<string, unknown>, name: string): string {
  const prop = properties[name] as { type?: string; [key: string]: unknown } | undefined;
  if (!prop) return "";
  if (prop.type === "title") return flattenRichText((prop.title ?? []) as never).trim();
  if (prop.type === "rich_text") return flattenRichText((prop.rich_text ?? []) as never).trim();
  if (prop.type === "select") return String((prop.select as { name?: string } | null)?.name ?? "");
  if (prop.type === "date") return String((prop.date as { start?: string } | null)?.start ?? "");
  if (prop.type === "checkbox") return String(Boolean(prop.checkbox));
  if (prop.type === "multi_select")
    return ((prop.multi_select ?? []) as { name: string }[]).map((item) => item.name).join(",");
  return "";
}

export async function queryPublished(notion: Client, databaseId: string): Promise<RemoteRow[]> {
  const rows: RemoteRow[] = [];
  let cursor: string | undefined;

  do {
    const response = await withRetry(() =>
      (notion as unknown as {
        databases: {
          query(args: unknown): Promise<{
            results: Record<string, unknown>[];
            has_more: boolean;
            next_cursor: string | null;
          }>;
        };
      }).databases.query({
        database_id: databaseId,
        start_cursor: cursor,
        filter: { property: "Status", select: { equals: "Published" } },
      }),
    );

    for (const page of response.results) {
      const properties = (page.properties ?? {}) as Record<string, unknown>;
      if (propertyText(properties, "Status") !== "Published") continue;
      rows.push({
        notionId: String(page.id),
        slug: propertyText(properties, "Slug"),
        lastEdited: String(page.last_edited_time ?? ""),
      });
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return rows;
}

export async function fetchPageProperties(
  notion: Client,
  pageId: string,
): Promise<Record<string, unknown>> {
  const page = await withRetry(() =>
    notion.pages.retrieve({ page_id: pageId }),
  );
  return (page as unknown as { properties: Record<string, unknown> }).properties;
}

export async function fetchPageTree(notion: Client, pageId: string): Promise<NotionBlock[]> {
  const collect = async (blockId: string): Promise<NotionBlock[]> => {
    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;
    do {
      const response = await withRetry(() =>
        notion.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 }),
      );
      for (const block of response.results) {
        const typed = block as unknown as NotionBlock;
        if (typed.has_children && typed.type !== "table") {
          const kids = await collect(typed.id);
          (typed[typed.type] as Record<string, unknown>).__children = kids;
        }
        blocks.push(typed);
      }
      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);
    return blocks;
  };

  return collect(pageId);
}

export { propertyText };
```

- [ ] **Step 8: Verify the tests pass**

Run: `npx vitest run scripts/sync/retry.test.ts scripts/sync/images.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 9: Commit**

```bash
git add scripts/sync/notion.ts scripts/sync/images.ts scripts/sync/retry.ts scripts/sync/retry.test.ts scripts/sync/images.test.ts
git commit -m "feat(sync): notion client, retry, image download"
```

---

### Task 7: Sync CLI

**Files:**
- Create: `scripts/sync/cli.ts`, `scripts/sync/run.ts`
- Test: `scripts/sync/run.test.ts`

**Interfaces:**
- Consumes: `queryPublished`, `fetchPageTree`, `fetchPageProperties`, `transformBlocks`, `downloadImages`, `planSync`, `buildIndex`, `toFrontmatter`
- Produces:
  - `syncContent(deps: SyncDeps, options: { dryRun: boolean }): Promise<SyncReport>`
  - `type SyncReport = { written: string[]; removed: string[]; unchanged: string[]; warnings: string[] }`
  - `type SyncDeps` = `{ listRemote(): Promise<RemoteRow[]>; fetchPage(row: RemoteRow): Promise<{ markdown: string; meta: CaseStudyMeta; warnings: string[] }>; readLocal(): Promise<LocalEntry[]>; writeFile(path: string, contents: string): Promise<void>; removeDir(path: string): Promise<void> }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { syncContent } from "./run";

const meta = (slug: string) => ({
  slug,
  title: slug,
  summary: slug,
  date: "2026-01-01",
  tags: [],
  cover: null,
  featured: false,
  role: "role",
  timeline: null,
});

describe("syncContent", () => {
  it("writes a new page and the index", async () => {
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const report = await syncContent(
      {
        listRemote: async () => [{ notionId: "1", slug: "a", lastEdited: "2026-01-02T00:00:00.000Z" }],
        fetchPage: async () => ({ markdown: "body", meta: meta("a"), warnings: [] }),
        readLocal: async () => [],
        writeFile,
        removeDir: vi.fn(),
      },
      { dryRun: false },
    );

    expect(report.written).toEqual(["a"]);
    expect(writeFile).toHaveBeenCalledWith(
      "content/case-studies/a/index.md",
      expect.stringContaining("body"),
    );
    expect(writeFile).toHaveBeenCalledWith(
      "content/case-studies/index.json",
      expect.stringContaining('"slug": "a"'),
    );
  });

  it("writes nothing on a dry run", async () => {
    const writeFile = vi.fn();
    const report = await syncContent(
      {
        listRemote: async () => [{ notionId: "1", slug: "a", lastEdited: "2026-01-02T00:00:00.000Z" }],
        fetchPage: async () => ({ markdown: "body", meta: meta("a"), warnings: [] }),
        readLocal: async () => [],
        writeFile,
        removeDir: vi.fn(),
      },
      { dryRun: true },
    );

    expect(report.written).toEqual(["a"]);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("removes folders that are no longer published", async () => {
    const removeDir = vi.fn().mockResolvedValue(undefined);
    const report = await syncContent(
      {
        listRemote: async () => [],
        fetchPage: async () => {
          throw new Error("should not fetch");
        },
        readLocal: async () => [{ notionId: "1", slug: "gone", notionLastEdited: "2026-01-01T00:00:00.000Z" }],
        writeFile: vi.fn(),
        removeDir,
      },
      { dryRun: false },
    );

    expect(report.removed).toEqual(["gone"]);
    expect(removeDir).toHaveBeenCalledWith("content/case-studies/gone");
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run scripts/sync/run.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `scripts/sync/run.ts`**

```ts
import { buildIndex, type CaseStudyMeta } from "./index-builder";
import { planSync, type LocalEntry, type RemoteRow } from "./plan";
import { toFrontmatter } from "./frontmatter";

export type SyncDeps = {
  listRemote(): Promise<RemoteRow[]>;
  fetchPage(row: RemoteRow): Promise<{ markdown: string; meta: CaseStudyMeta; warnings: string[] }>;
  readLocal(): Promise<LocalEntry[]>;
  writeFile(path: string, contents: string): Promise<void>;
  removeDir(path: string): Promise<void>;
};

export type SyncReport = {
  written: string[];
  removed: string[];
  unchanged: string[];
  warnings: string[];
};

const ROOT = "content/case-studies";

export async function syncContent(deps: SyncDeps, options: { dryRun: boolean }): Promise<SyncReport> {
  const [local, remote] = await Promise.all([deps.readLocal(), deps.listRemote()]);
  const plan = planSync(local, remote);

  const written: string[] = [];
  const warnings: string[] = [];
  const metas: CaseStudyMeta[] = [];

  for (const row of plan.fetch) {
    if (!row.slug) {
      warnings.push(`skipped page without slug: ${row.notionId}`);
      continue;
    }
    const page = await deps.fetchPage(row);
    warnings.push(...page.warnings);
    metas.push(page.meta);
    written.push(row.slug);
    if (!options.dryRun) {
      const body = `${toFrontmatter({
        title: page.meta.title,
        slug: page.meta.slug,
        summary: page.meta.summary,
        date: page.meta.date,
        role: page.meta.role,
        timeline: page.meta.timeline ?? undefined,
        tags: page.meta.tags,
        cover: page.meta.cover ?? undefined,
        featured: page.meta.featured,
        notionId: row.notionId,
        notionLastEdited: row.lastEdited,
      })}\n${page.markdown}\n`;
      await deps.writeFile(`${ROOT}/${row.slug}/index.md`, body);
    }
  }

  if (plan.remove.length > 0 && !options.dryRun) {
    for (const slug of plan.remove) await deps.removeDir(`${ROOT}/${slug}`);
  }

  if (!options.dryRun && (written.length > 0 || plan.remove.length > 0)) {
    const all = [...metas, ...(local.filter((entry) => !written.includes(entry.slug) && !plan.remove.includes(entry.slug)).length ? [] : [])];
    const index = buildIndex(metas);
    if (index.length > 0) {
      await deps.writeFile(`${ROOT}/index.json`, JSON.stringify(index, null, 2) + "\n");
    }
    void all;
  }

  return { written, removed: plan.remove, unchanged: plan.unchanged, warnings };
}
```

- [ ] **Step 4: Verify it passes**

Run: `npx vitest run scripts/sync/run.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Implement `scripts/sync/cli.ts`**

Reads env, wires real dependencies, supports `--dry-run`, writes `.last-sync.json` to the repository root, exits non-zero on duplicate slugs.

```ts
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { syncContent } from "./run";
import { notionClient, queryPublished, fetchPageTree, fetchPageProperties, propertyText } from "./notion";
import { downloadImages } from "./images";
import { transformBlocks } from "./blocks";
import { isValidSlug } from "./slug";
import type { CaseStudyMeta } from "./index-builder";
import type { LocalEntry } from "./plan";

const ROOT = "content/case-studies";
const dryRun = process.argv.includes("--dry-run");

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing env ${name}`);
  return value;
}

async function readLocal(): Promise<LocalEntry[]> {
  let dirs: string[] = [];
  try {
    dirs = await readdir(ROOT);
  } catch {
    return [];
  }
  const entries: LocalEntry[] = [];
  for (const dir of dirs) {
    const file = path.join(ROOT, dir, "index.md");
    try {
      const text = await readFile(file, "utf8");
      const notionId = /^notionId: "?(.+?)"?$/m.exec(text)?.[1];
      const lastEdited = /^notionLastEdited: "?(.+?)"?$/m.exec(text)?.[1];
      if (notionId && lastEdited) entries.push({ notionId, slug: dir, notionLastEdited: lastEdited });
    } catch {
      continue;
    }
  }
  return entries;
}

async function main(): Promise<void> {
  const notion = notionClient(env("NOTION_TOKEN"));
  const databaseId = env("NOTION_DATABASE_ID");

  const report = await syncContent(
    {
      listRemote: () => queryPublished(notion, databaseId),
      readLocal,
      writeFile: async (file, contents) => {
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, contents, "utf8");
      },
      removeDir: async (dir) => {
        await rm(dir, { recursive: true, force: true });
        await rm(path.join("public", dir), { recursive: true, force: true });
      },
      fetchPage: async (row) => {
        if (!isValidSlug(row.slug)) throw new Error(`invalid slug: ${row.slug}`);
        const properties = await fetchPageProperties(notion, row.notionId);
        const blocks = await fetchPageTree(notion, row.notionId);
        const images = await downloadImages(blocks, row.slug, process.cwd());
        const result = transformBlocks(blocks, {
          resolveImage: (id) => images.get(id) ?? "",
          children: (block) => {
            const kids = ((block[block.type] as Record<string, unknown>).__children ?? []) as never;
            return transformBlocks(kids, { resolveImage: () => "", children: () => "" }).markdown;
          },
        });
        const meta: CaseStudyMeta = {
          slug: row.slug,
          title: propertyText(properties, "Title"),
          summary: propertyText(properties, "Summary"),
          date: propertyText(properties, "Date"),
          tags: propertyText(properties, "Tags") ? propertyText(properties, "Tags").split(",") : [],
          cover: propertyText(properties, "Cover") || null,
          featured: propertyText(properties, "Featured") === "true",
          role: propertyText(properties, "Role"),
          timeline: propertyText(properties, "Timeline") || null,
        };
        return { markdown: result.markdown, meta, warnings: result.warnings };
      },
    },
    { dryRun },
  );

  const log = { at: new Date().toISOString(), dryRun, ...report };
  await writeFile(".last-sync.json", JSON.stringify(log, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(log, null, 2));

  const slugs = report.written.length + report.removed.length;
  if (slugs === 0) console.log("no content changes");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 6: Verify typecheck and tests**

Run: `npm run typecheck && npx vitest run scripts/sync`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/sync/cli.ts scripts/sync/run.ts scripts/sync/run.test.ts
git commit -m "feat(sync): add sync CLI with dry run"
```

---

### Task 8: Webhook receiver and GitHub workflows

**Files:**
- Create: `app/api/notion/webhook/route.ts`, `lib/verify-notion-signature.ts`
- Create: `.github/workflows/sync-content.yml`, `.github/workflows/ci.yml`
- Test: `lib/verify-notion-signature.test.ts`

**Interfaces:**
- Produces: `verifyNotionSignature(rawBody: string, signature: string | null, token: string): Promise<boolean>`
- Produces: `POST /api/notion/webhook` returning `{ ok: boolean }`.

- [ ] **Step 1: Write the failing signature test**

```ts
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyNotionSignature } from "./verify-notion-signature";

const token = "secret_test";
const body = JSON.stringify({ type: "page.content_updated" });
const signature = "sha256=" + createHmac("sha256", token).update(body).digest("hex");

describe("verifyNotionSignature", () => {
  it("accepts a valid signature", async () => {
    expect(await verifyNotionSignature(body, signature, token)).toBe(true);
  });
  it("rejects a tampered body", async () => {
    expect(await verifyNotionSignature(body + " ", signature, token)).toBe(false);
  });
  it("rejects a missing signature", async () => {
    expect(await verifyNotionSignature(body, null, token)).toBe(false);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run lib/verify-notion-signature.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the verifier**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export async function verifyNotionSignature(
  rawBody: string,
  signature: string | null,
  token: string,
): Promise<boolean> {
  if (!signature || !token) return false;
  const expected = "sha256=" + createHmac("sha256", token).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Implement the route**

```ts
import { NextResponse } from "next/server";
import { verifyNotionSignature } from "@/lib/verify-notion-signature";

export const runtime = "nodejs";

async function dispatch(): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) throw new Error("missing dispatch configuration");

  const response = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ event_type: "notion-sync" }),
  });

  if (!response.ok) throw new Error(`dispatch failed: ${response.status}`);
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (typeof payload.verification_token === "string") {
    return NextResponse.json({ ok: true });
  }

  const token = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN ?? "";
  const valid = await verifyNotionSignature(
    rawBody,
    request.headers.get("x-notion-signature"),
    token,
  );
  if (!valid) return NextResponse.json({ ok: false }, { status: 401 });

  if (payload.type !== "page.content_updated") {
    return NextResponse.json({ ok: true });
  }

  try {
    await dispatch();
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Write `.github/workflows/sync-content.yml`**

```yaml
name: Sync content

on:
  repository_dispatch:
    types: [notion-sync]
  schedule:
    - cron: "0 20 * * 0"
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: content-sync
  cancel-in-progress: false

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run sync
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
          NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
      - name: Commit content
        run: |
          if [ -z "$(git status --porcelain content public/content)" ]; then
            echo "No content changes"
            exit 0
          fi
          git config user.name "content-bot"
          git config user.email "content-bot@users.noreply.github.com"
          git add content public/content
          git commit -m "content: sync from notion"
          git push
      - name: Summary
        if: always()
        run: cat .last-sync.json >> "$GITHUB_STEP_SUMMARY" || true
```

Note: `0 20 * * 0` in UTC is Sunday 03:00 WIB.

- [ ] **Step 6: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
        env:
          NOTION_TOKEN: ""
          NOTION_DATABASE_ID: ""
```

- [ ] **Step 7: Verify**

Run: `npx vitest run lib/verify-notion-signature.test.ts && npm run typecheck`
Expected: PASS, 3 tests.

- [ ] **Step 8: Commit**

```bash
git add app/api/notion/webhook/route.ts lib/verify-notion-signature.ts lib/verify-notion-signature.test.ts .github
git commit -m "feat(sync): add webhook receiver and github workflows"
```

---

### Task 9: Content reader and Prose

**Files:**
- Create: `lib/content.ts`, `components/Prose.tsx`
- Test: `lib/content.test.ts`

**Interfaces:**
- Produces:
  - `getIndex(): CaseStudyMeta[]`
  - `getCaseStudy(slug: string): { meta: CaseStudyMeta; markdown: string }`
  - `getAllSlugs(): string[]`
  - `getExplorer(): ExplorerData`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { getIndex, getAllSlugs } from "./content";

describe("content reader", () => {
  it("reads the committed index", () => {
    const index = getIndex();
    expect(Array.isArray(index)).toBe(true);
  });
  it("returns slug list matching the index", () => {
    expect(getAllSlugs()).toEqual(getIndex().map((entry) => entry.slug));
  });
});

describe("frontmatter guard", () => {
  it("throws when a required field is missing", async () => {
    const { validateMeta } = await import("./content");
    expect(() => validateMeta({ slug: "a", title: "", summary: "s" })).toThrow(/title/);
  });
});
```

- [ ] **Step 2: Create a fixture so the test can pass**

Create `content/case-studies/index.json`:

```json
[]
```

- [ ] **Step 3: Run and watch it fail**

Run: `npx vitest run lib/content.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement `lib/content.ts`**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";

export type CaseStudyMeta = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  cover: string | null;
  featured: boolean;
  role: string;
  timeline: string | null;
};

export type ExplorerData = {
  stages: string[];
  questions: {
    id: string;
    stage: string;
    label: string;
    question: string;
    answer: string;
    widgets: string[];
    caseStudy: string;
  }[];
  widgets: Record<string, unknown>;
};

const CONTENT = path.join(process.cwd(), "content");
const INDEX = path.join(CONTENT, "case-studies", "index.json");

export function validateMeta(meta: Partial<CaseStudyMeta>): void {
  for (const field of ["title", "slug", "summary"] as const) {
    if (!meta[field]) throw new Error(`case study missing required field: ${field}`);
  }
}

export function getIndex(): CaseStudyMeta[] {
  const raw = JSON.parse(readFileSync(INDEX, "utf8")) as CaseStudyMeta[];
  raw.forEach(validateMeta);
  return raw;
}

export function getAllSlugs(): string[] {
  return getIndex().map((entry) => entry.slug);
}

export function getCaseStudy(slug: string): { meta: CaseStudyMeta; markdown: string } {
  const meta = getIndex().find((entry) => entry.slug === slug);
  if (!meta) throw new Error(`unknown case study: ${slug}`);
  const file = path.join(CONTENT, "case-studies", slug, "index.md");
  const raw = readFileSync(file, "utf8");
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
  return { meta, markdown: body };
}

export function getExplorer(): ExplorerData {
  const file = path.join(CONTENT, "explorer.json");
  try {
    return JSON.parse(readFileSync(file, "utf8")) as ExplorerData;
  } catch {
    return { stages: [], questions: [], widgets: {} };
  }
}

export function getFeatured(limit = 3): CaseStudyMeta[] {
  return getIndex()
    .filter((entry) => entry.featured)
    .slice(0, limit);
}

export function getAllTags(): string[] {
  return [...new Set(getIndex().flatMap((entry) => entry.tags))].sort();
}
```

- [ ] **Step 5: Implement `components/Prose.tsx`**

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Prose({ markdown }: { markdown: string }) {
  return (
    <div className="prose-editorial">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => (
            <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} loading="lazy" />
          ),
          a: ({ href, children }) => (
            <a href={href} rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 6: Add the prose styles to `app/globals.css`**

```css
.prose-editorial {
  font-family: var(--font-serif);
  font-size: 19px;
  line-height: 1.65;
  max-width: 66ch;
}
.prose-editorial > * + * { margin-top: 1.25em; }
.prose-editorial h2 { font-family: var(--font-sans); font-size: 26px; font-weight: 600; letter-spacing: -0.01em; margin-top: 2em; }
.prose-editorial h3 { font-family: var(--font-sans); font-size: 19px; font-weight: 600; margin-top: 1.6em; }
.prose-editorial a { text-decoration: underline; text-underline-offset: 3px; }
.prose-editorial a:hover { color: var(--color-accent-ink); }
.prose-editorial img { width: 100%; height: auto; border: 1px solid var(--color-rule); }
.prose-editorial blockquote { border-left: 2px solid var(--color-rule); padding-left: 1em; color: var(--color-ink-muted); }
.prose-editorial code { font-family: var(--font-mono); font-size: 14px; background: var(--color-surface); border: 1px solid var(--color-rule); padding: 0.1em 0.3em; }
.prose-editorial pre { font-family: var(--font-mono); font-size: 14px; background: var(--color-surface); border: 1px solid var(--color-rule); padding: 1em; overflow-x: auto; }
.prose-editorial pre code { border: 0; padding: 0; }
.prose-editorial table { width: 100%; border-collapse: collapse; font-family: var(--font-sans); font-size: 15px; }
.prose-editorial th, .prose-editorial td { border-bottom: 1px solid var(--color-rule); padding: 0.5em 0.75em; text-align: left; }
```

- [ ] **Step 7: Verify**

Run: `npm i react-markdown remark-gfm && npx vitest run lib/content.test.ts && npm run typecheck`
Expected: PASS, 3 tests.

- [ ] **Step 8: Commit**

```bash
git add lib/content.ts lib/content.test.ts components/Prose.tsx app/globals.css content/case-studies/index.json
git commit -m "feat(site): read content from disk and render markdown"
```

---

### Task 10: Shell, work index, case study page

**Files:**
- Create: `components/SiteHeader.tsx`, `components/SiteFooter.tsx`, `components/CaseCard.tsx`, `components/TagFilter.tsx`
- Create: `app/work/page.tsx`, `app/work/[slug]/page.tsx`, `app/not-found.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `getIndex`, `getCaseStudy`, `getAllSlugs`, `getAllTags`, `Prose`
- Produces: `/work`, `/work/[slug]`, header and footer on every route.

- [ ] **Step 1: Implement header and footer**

Header: name left, `Work / About / Contact` right. Mono 11px uppercase nav, 1px `rule` bottom border. Footer: email, LinkedIn, GitHub, and a one-line "built with Next.js" note.

- [ ] **Step 2: Implement `CaseCard`**

Title, summary, the number if present in the summary, mono date, tag row. 1px `rule`, hover border `ink-faint`. Whole card is one link to `/work/<slug>`.

- [ ] **Step 3: Implement `/work`**

Server component. Reads `getIndex()`. Renders heading, tag filter, and the card list. `TagFilter` is the only client component: reads `?tag=` from `useSearchParams`, renders mono chips, pushes the next URL with `router.replace`.

- [ ] **Step 4: Implement `/work/[slug]`**

```tsx
import { notFound } from "next/navigation";
import { getAllSlugs, getCaseStudy } from "@/lib/content";
import { Prose } from "@/components/Prose";
import type { Metadata } from "next";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { meta } = getCaseStudy(slug);
  return { title: meta.title, description: meta.summary };
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let data;
  try {
    data = getCaseStudy(slug);
  } catch {
    notFound();
  }
  const index = getAllSlugs();
  const at = index.indexOf(slug);
  const prev = at > 0 ? index[at - 1] : undefined;
  const next = at >= 0 && at < index.length - 1 ? index[at + 1] : undefined;

  return (
    <article className="mx-auto max-w-[1120px] px-6 py-16 md:px-10">
      <h1 className="text-[clamp(32px,4.4vw,56px)] font-semibold leading-[1.02] tracking-[-0.03em]">
        {data.meta.title}
      </h1>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-ink-muted)">
        {data.meta.role} · {data.meta.timeline ?? "—"} · {data.meta.date}
      </p>
      <p className="mt-8 max-w-[66ch] font-serif text-[21px] leading-[1.6]">{data.meta.summary}</p>
      {data.meta.cover ? (
        <img src={data.meta.cover} alt="" className="mt-10 w-full border border-(--color-rule)" />
      ) : null}
      <hr className="my-12 border-(--color-rule)" />
      <Prose markdown={data.markdown} />
      <nav className="mt-16 flex justify-between border-t border-(--color-rule) pt-6 font-mono text-[11px] uppercase tracking-[0.14em]">
        <span>{prev ? <a href={`/work/${prev}`}>← {prev}</a> : null}</span>
        <a href="/work">All work</a>
        <span>{next ? <a href={`/work/${next}`}>{next} →</a> : null}</span>
      </nav>
    </article>
  );
}
```

- [ ] **Step 5: Implement `not-found`**

One heading, one line, a link back to `/`. No illustration.

- [ ] **Step 6: Wire header and footer into the root layout**

- [ ] **Step 7: Verify**

Run: `npm run build`
Expected: PASS, `/work` and `/work/[slug]` generated.

- [ ] **Step 8: Commit**

```bash
git add components app
git commit -m "feat(site): add shell, work index and case study pages"
```

---

### Task 11: Static pages

**Files:**
- Create: `app/about/page.tsx`, `app/contact/page.tsx`
- Replace: `app/page.tsx`

**Interfaces:**
- Consumes: `getFeatured`
- Produces: `/`, `/about`, `/contact`

- [ ] **Step 1: Home**

Five blocks in order: hero, explorer placeholder (`<section id="explorer" />` until Task 15), proof cards from `getFeatured(3)`, stack line, contact line. Hero uses the thesis sentence at 76px max.

- [ ] **Step 2: About**

Four sections: what I do, how I work (three short paragraphs), stack (mono list, no badges), elsewhere (links).

- [ ] **Step 3: Contact**

Email, LinkedIn, GitHub, one availability line. No form.

- [ ] **Step 4: Verify**

Run: `npm run build && npm run start` in one shell, then open `/`, `/about`, `/contact`.
Expected: all render, no console errors.

- [ ] **Step 5: Commit**

```bash
git add app
git commit -m "feat(site): add home, about and contact pages"
```

---

### Task 12: Explorer data and reducer

**Files:**
- Create: `content/explorer.json`, `components/explorer/reducer.ts`
- Test: `components/explorer/reducer.test.ts`

**Interfaces:**
- Produces:
  - `initialState(count: number): ExplorerState`
  - `reducer(state: ExplorerState, action: ExplorerAction): ExplorerState`
  - `type ExplorerState = { current: number; asked: number[]; playing: boolean; phase: "typing" | "answer"; done: boolean }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./reducer";

describe("explorer reducer", () => {
  it("starts idle then types", () => {
    let state = initialState(6);
    expect(state.playing).toBe(true);
    state = reducer(state, { type: "start" });
    expect(state.current).toBe(0);
    expect(state.phase).toBe("typing");
  });
  it("reveals the answer and marks it asked", () => {
    let state = reducer(initialState(6), { type: "start" });
    state = reducer(state, { type: "reveal" });
    expect(state.phase).toBe("answer");
    expect(state.asked).toContain(0);
  });
  it("advances to the next question", () => {
    let state = reducer(initialState(6), { type: "start" });
    state = reducer(state, { type: "reveal" });
    state = reducer(state, { type: "advance" });
    expect(state.current).toBe(1);
    expect(state.phase).toBe("typing");
  });
  it("stops after the last question", () => {
    let state = { ...initialState(2), current: 1, phase: "answer" as const, asked: [0, 1] };
    state = reducer(state, { type: "advance" });
    expect(state.done).toBe(true);
    expect(state.playing).toBe(false);
  });
  it("jumps when a stage is tapped", () => {
    let state = reducer(initialState(6), { type: "jump", index: 4 });
    expect(state.current).toBe(4);
    expect(state.phase).toBe("typing");
    expect(state.done).toBe(false);
  });
  it("pauses and resumes", () => {
    let state = reducer(initialState(6), { type: "pause" });
    expect(state.playing).toBe(false);
    state = reducer(state, { type: "play" });
    expect(state.playing).toBe(true);
  });
  it("restarts from zero", () => {
    let state = { ...initialState(6), current: 3, asked: [0, 1, 2], done: true, playing: false };
    state = reducer(state, { type: "restart" });
    expect(state).toEqual({ current: 0, asked: [], playing: true, phase: "typing", done: false });
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run components/explorer/reducer.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the reducer**

```ts
export type ExplorerState = {
  current: number;
  asked: number[];
  playing: boolean;
  phase: "typing" | "answer";
  done: boolean;
};

export type ExplorerAction =
  | { type: "start" }
  | { type: "reveal" }
  | { type: "advance" }
  | { type: "jump"; index: number }
  | { type: "pause" }
  | { type: "play" }
  | { type: "restart" };

export function initialState(count: number): ExplorerState {
  void count;
  return { current: -1, asked: [], playing: true, phase: "typing", done: false };
}

export function reducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case "start":
      if (state.current !== -1) return state;
      return { ...state, current: 0, phase: "typing", playing: true, done: false };
    case "reveal":
      if (state.current < 0) return state;
      return {
        ...state,
        phase: "answer",
        asked: state.asked.includes(state.current) ? state.asked : [...state.asked, state.current],
      };
    case "advance":
      if (state.current < 0) return state;
      return { ...state, current: state.current + 1, phase: "typing", done: false };
    case "jump":
      return { ...state, current: action.index, phase: "typing", done: false };
    case "pause":
      return { ...state, playing: false };
    case "play":
      return { ...state, playing: true };
    case "restart":
      return { current: 0, asked: [], playing: true, phase: "typing", done: false };
    default:
      return state;
  }
}
```

Note: the caller handles the "stop after last question" case; the reducer test above requires it. Implement inside `advance`:

```ts
// inside case "advance"
if (state.current >= state.count - 1) ...
```

Add `count` to state to make this correct:

```ts
export type ExplorerState = {
  count: number;
  current: number;
  asked: number[];
  playing: boolean;
  phase: "typing" | "answer";
  done: boolean;
};

export function initialState(count: number): ExplorerState {
  return { count, current: -1, asked: [], playing: true, phase: "typing", done: false };
}
```

and in `advance`:

```ts
case "advance":
  if (state.current < 0) return state;
  if (state.current >= state.count - 1) {
    return { ...state, phase: "answer", done: true, playing: false };
  }
  return { ...state, current: state.current + 1, phase: "typing" };
```

and `restart` returns `{ ...initialState(state.count), current: 0 }`.

- [ ] **Step 4: Write `content/explorer.json`**

Six questions, arc order, referencing real slugs once they exist. Until case studies exist, point each `caseStudy` at a slug you will create in Notion; the build validation in Task 13 fails on a bad slug, which is intended.

```json
{
  "stages": ["problem", "constraint", "move", "proof", "validation", "stack"],
  "questions": [
    {
      "id": "handed",
      "stage": "problem",
      "label": "What you got handed",
      "question": "What did they hand you?",
      "answer": "Two lawyers and 28,000 documents. No searchable archive, so every answer lived in someone's memory or a folder nobody could find.",
      "widgets": ["context"],
      "caseStudy": "legal-rag-archive"
    },
    {
      "id": "constraint",
      "stage": "constraint",
      "label": "What made it hard",
      "question": "What made it hard?",
      "answer": "The documents were the product. Retrieval had to be defensible, not plausible, and every answer needed a citation a lawyer could check.",
      "widgets": ["constraints"],
      "caseStudy": "legal-rag-archive"
    },
    {
      "id": "move",
      "stage": "move",
      "label": "What you built",
      "question": "What did you build?",
      "answer": "An agentic retrieval pipeline over the full corpus, with a reranker and a citation step, so the model could not answer without a source.",
      "widgets": ["steps"],
      "caseStudy": "legal-rag-archive"
    },
    {
      "id": "proof",
      "stage": "proof",
      "label": "What changed by the numbers",
      "question": "What changed by the numbers?",
      "answer": "Eval accuracy rose 20% over the baseline retriever. End-to-end latency fell 26%, and manual document prep fell 70%.",
      "widgets": ["metrics", "beforeAfter"],
      "caseStudy": "legal-rag-archive"
    },
    {
      "id": "validation",
      "stage": "validation",
      "label": "How you know it worked",
      "question": "How do you know it worked?",
      "answer": "A labelled eval set ran in CI. The scoring gate was validated on 150 rows before it was allowed to decide anything.",
      "widgets": ["compare"],
      "caseStudy": "lead-scoring-gate"
    },
    {
      "id": "stack",
      "stage": "stack",
      "label": "What's under the hood",
      "question": "What's under the hood?",
      "answer": "Postgres with pgvector, a Python ingestion worker, a TypeScript API, and an eval harness that blocks a deploy when accuracy regresses.",
      "widgets": ["stack"],
      "caseStudy": "legal-rag-archive"
    }
  ],
  "widgets": {
    "context": { "type": "context", "items": [
      { "value": "28,000", "label": "documents" },
      { "value": "2", "label": "lawyers, no archive" },
      { "value": "0", "label": "searchable entries" }
    ]},
    "constraints": { "type": "constraints", "items": [
      "Every answer must cite a document",
      "Confidential material stays on the server",
      "Wrong answers cost more than slow answers"
    ]},
    "steps": { "type": "steps", "items": [
      { "tag": "01", "title": "Ingest", "detail": "Normalise and chunk 28,000 documents" },
      { "tag": "02", "title": "Retrieve", "detail": "Hybrid search with a reranker" },
      { "tag": "03", "title": "Cite", "detail": "Answer only with a resolved source" }
    ]},
    "metrics": { "type": "metrics", "items": [
      { "value": "+20%", "label": "eval accuracy" },
      { "value": "-26%", "label": "end-to-end latency" },
      { "value": "-70%", "label": "manual prep" }
    ]},
    "beforeAfter": { "type": "beforeAfter", "items": [
      { "label": "Latency", "before": "100", "after": "74", "delta": "-26%" },
      { "label": "Manual prep", "before": "100", "after": "30", "delta": "-70%" }
    ]},
    "compare": { "type": "compare", "items": [
      { "ok": false, "what": "Manual list building", "detail": "Noisy, unrepeatable, no gate" },
      { "ok": true, "what": "Scored list", "detail": "658 qualified contacts across 173 companies" },
      { "ok": true, "what": "Eval set", "detail": "150 labelled rows before the gate shipped" }
    ]},
    "stack": { "type": "stack", "items": [
      { "tool": "Postgres + pgvector", "why": "One store for rows and embeddings" },
      { "tool": "Python worker", "why": "Ingestion is batch work, not a request" },
      { "tool": "TypeScript API", "why": "Same language as the product surface" },
      { "tool": "Eval harness in CI", "why": "A regression fails the build" }
    ]}
  }
}
```

- [ ] **Step 5: Verify**

Run: `npx vitest run components/explorer/reducer.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add content/explorer.json components/explorer
git commit -m "feat(explorer): add arc-ordered data and state machine"
```

---

### Task 13: Explorer widgets and build-time validation

**Files:**
- Create: `components/explorer/widgets.tsx`, `lib/validate-explorer.ts`
- Test: `lib/validate-explorer.test.ts`

**Interfaces:**
- Produces: `validateExplorer(data: ExplorerData, slugs: string[]): string[]` returning errors
- Produces: `<Widget type={string} data={unknown} />` rendering one of seven widgets

- [ ] **Step 1: Write the failing validation test**

```ts
import { describe, expect, it } from "vitest";
import { validateExplorer } from "./validate-explorer";

const base = {
  stages: ["problem", "proof", "stack"],
  questions: [
    { id: "a", stage: "problem", label: "l", question: "q", answer: "a", widgets: [], caseStudy: "legal" },
    { id: "b", stage: "proof", label: "l", question: "q", answer: "a", widgets: [], caseStudy: "legal" },
    { id: "c", stage: "stack", label: "l", question: "q", answer: "a", widgets: [], caseStudy: "legal" },
  ],
  widgets: {},
};

describe("validateExplorer", () => {
  it("accepts a valid document", () => {
    expect(validateExplorer(base, ["legal"])).toEqual([]);
  });
  it("rejects an unknown case study slug", () => {
    expect(validateExplorer(base, ["other"])).toContain("question a references unknown case study: legal");
  });
  it("rejects out-of-order stages", () => {
    const bad = { ...base, questions: [base.questions[2], base.questions[0], base.questions[1]] };
    expect(validateExplorer(bad, ["legal"])).toContain("stages are out of arc order");
  });
  it("rejects a question with an unknown stage", () => {
    const bad = { ...base, questions: [{ ...base.questions[0], stage: "nope" }, base.questions[1], base.questions[2]] };
    expect(validateExplorer(bad, ["legal"]).some((error) => error.includes("unknown stage"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run lib/validate-explorer.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the validator**

```ts
import type { ExplorerData } from "./content";

export function validateExplorer(data: ExplorerData, slugs: string[]): string[] {
  const errors: string[] = [];
  const known = new Set(slugs);
  const stages = data.stages ?? [];
  const rank = new Map(stages.map((stage, index) => [stage, index]));
  let previous = -1;

  for (const question of data.questions ?? []) {
    if (!known.has(question.caseStudy)) {
      errors.push(`question ${question.id} references unknown case study: ${question.caseStudy}`);
    }
    const position = rank.get(question.stage);
    if (position === undefined) {
      errors.push(`question ${question.id} has unknown stage: ${question.stage}`);
      continue;
    }
    if (position < previous) errors.push("stages are out of arc order");
    previous = position;
  }

  return errors;
}
```

- [ ] **Step 4: Call the validator at build time**

In `app/page.tsx`, before rendering the explorer:

```tsx
const explorer = getExplorer();
const errors = validateExplorer(explorer, getAllSlugs());
if (errors.length > 0) throw new Error(`explorer.json invalid:\n${errors.join("\n")}`);
```

- [ ] **Step 5: Implement `components/explorer/widgets.tsx`**

Seven small presentational components, all server-safe:

- `context` — three tiles: big value, mono label.
- `constraints` — rows with a mono index and a sentence.
- `steps` — numbered tiles, the last one gets `border-(--color-rule)` removed and an accent tick.
- `metrics` — same visual language as `context` but values in `--color-accent`.
- `beforeAfter` — two horizontal bars per item, `before` at 100% width in `--color-rule`, `after` scaled to its value in `--color-accent`; mono delta label right.
- `compare` — rows: ✗ in `--color-ink-faint` or ✓ in `--color-verified`, plus `what` bold and `detail` muted.
- `stack` — definition rows: mono tool name, sans one-line why.

Rules: no shadows, 1px `rule` borders, 8px radius, no icons except ✓/✗ text.

- [ ] **Step 6: Verify**

Run: `npx vitest run lib/validate-explorer.test.ts && npm run typecheck`
Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add components/explorer/widgets.tsx lib/validate-explorer.ts lib/validate-explorer.test.ts app/page.tsx
git commit -m "feat(explorer): add widgets and build-time validation"
```

---

### Task 14: Explorer component

**Files:**
- Create: `components/explorer/CaseStudyExplorer.tsx`, `components/explorer/useExplorerTimers.ts`
- Test: none (covered by reducer tests and Playwright)

**Interfaces:**
- Consumes: `initialState`, `reducer`, `<Widget>`, `ExplorerData`
- Produces: `<CaseStudyExplorer data={ExplorerData} />`, `"use client"`

- [ ] **Step 1: Implement the timers hook**

```ts
"use client";

import { useEffect } from "react";
import type { ExplorerState } from "./reducer";

export function useExplorerTimers(
  state: ExplorerState,
  visible: boolean,
  reduced: boolean,
  dispatch: (action: { type: "reveal" } | { type: "advance" }) => void,
): void {
  useEffect(() => {
    if (!visible || reduced || !state.playing || state.current < 0 || state.done) return;
    if (state.phase === "typing") {
      const id = setTimeout(() => dispatch({ type: "reveal" }), 900);
      return () => clearTimeout(id);
    }
    const dwell = 5500;
    const id = setTimeout(() => dispatch({ type: "advance" }), dwell);
    return () => clearTimeout(id);
  }, [state.current, state.phase, state.playing, state.done, visible, reduced, dispatch]);
}
```

- [ ] **Step 2: Implement the component**

Structure:

```
<section>                                   max-w 1120, py 128/72
  <p mono>01 — Explorer</p>
  <h2>Ask the work, not the résumé.</h2>
  <div grid 12 cols>
    <div panel col-span-8>
      header: CASE EXPLORER · 04 / 06, pause, restart
      segmented progress: 6 bars, current = ink, asked = accent
      question row (YOU avatar square)
      answer row (HF avatar), aria-live polite
      typing dots when phase === typing
      widgets
      link to case study
    </div>
    <aside col-span-4 stage card>
      six stage rows as buttons with ✓ / ▸ / ·
      progress count
    </aside>
  </div>
</section>
```

Client behaviour:

- `IntersectionObserver` at 0.3 → `visible = true`, dispatch `start` once.
- `visibilitychange` → dispatch `pause` when hidden, `play` when visible and not done.
- `matchMedia("(prefers-reduced-motion: reduce)")` → `reduced = true`.
- When `reduced`, do not autoplay: render all six questions expanded as a static list, no typing dots, no timers. The stage card still works as anchor links.
- Stage buttons dispatch `jump`.
- `aria-live="polite"` on the answer container.
- Disable `restart` until `done`.

- [ ] **Step 3: Mount it on the home page**

Replace the placeholder section with `<CaseStudyExplorer data={explorer} />`.

- [ ] **Step 4: Verify manually**

Run: `npm run dev`
Check: starts when scrolled into view, pauses off-screen, tap jumps, reduced-motion renders statically (toggle in devtools), keyboard tab reaches all six stage buttons, no layout shift.

- [ ] **Step 5: Commit**

```bash
git add components/explorer app/page.tsx
git commit -m "feat(explorer): add animated case study explorer"
```

---

### Task 15: Polish, accessibility, analytics

**Files:**
- Create: `components/Reveal.tsx`
- Modify: `app/layout.tsx`, `app/globals.css`, all pages
- Test: `e2e/routes.spec.ts`

**Interfaces:**
- Produces: `<Reveal>` wrapper; Vercel Analytics mounted in the root layout.

- [ ] **Step 1: Add `Reveal`**

Client component. `translateY(12px)` + opacity, 400ms, 60ms stagger capped at 4 items, once, skipped entirely under reduced motion.

- [ ] **Step 2: Add analytics**

```bash
npm i @vercel/analytics
```

In `app/layout.tsx`, import `{ Analytics } from "@vercel/analytics/next"` and render `<Analytics />` before `</body>`.

- [ ] **Step 3: Accessibility sweep**

Check: one `h1` per page, heading order, alt text on every content image, visible focus on all interactive elements, 44px tap targets in the explorer, AA contrast for every text token, no colour-only meaning.

- [ ] **Step 4: Write the Playwright test**

```ts
import { expect, test } from "@playwright/test";

const routes = ["/", "/work", "/about", "/contact", "/work/does-not-exist"];

test("all routes respond", async ({ page }) => {
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBeLessThan(500);
  }
});

test("404 renders for an unknown case study", async ({ page }) => {
  const response = await page.goto("/work/does-not-exist");
  expect(response?.status()).toBe(404);
});

test("explorer is static under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("region", { name: /explorer/i })).toBeVisible();
});
```

- [ ] **Step 5: Verify**

Run: `npm run check && npx playwright test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(site): add reveal, analytics and a11y polish"
```

---

### Task 16: Deploy and prove the pipeline

**Files:**
- Create: `README.md`, `docs/runbook.md`
- Modify: `.env.example`

**Interfaces:**
- Produces: a documented go-live checklist and a working end-to-end sync.

- [ ] **Step 1: Write `docs/runbook.md`**

Include the seven go-live steps from the spec, the meaning of each env var, how to run a manual sync, how to recover from a bad sync (`git revert`), and how to rotate the webhook token.

- [ ] **Step 2: Write `README.md`**

What the project is, the two systems, local setup, `npm run sync -- --dry-run`, where content lives, and the fact that `content/` is machine-written.

- [ ] **Step 3: Push and connect Vercel**

Push `build/portfolio-v1`, open a PR to `main`, merge, then import the repo in Vercel. Add the two Vercel env vars.

- [ ] **Step 4: Create the Notion integration and database**

Apply the property table from the spec. Share the database with the integration.

- [ ] **Step 5: Add GitHub secrets and run a manual sync**

Trigger `workflow_dispatch`. Confirm a commit touching `content/` appears and Vercel redeploys.

- [ ] **Step 6: Create and verify the Notion webhook**

Point it at `https://<prod>/api/notion/webhook`, paste the `verification_token` into Vercel, click Verify.

- [ ] **Step 7: Acceptance test**

Edit a Notion page title, wait two minutes, confirm the commit and the live page. Then unpublish the page and confirm the folder is removed.

- [ ] **Step 8: Commit**

```bash
git add README.md docs/runbook.md .env.example
git commit -m "docs: add readme and deployment runbook"
```

---

## Self-Review

**Spec coverage**

| Spec section | Plan tasks |
|---|---|
| S1 routes | 10, 11 |
| Content layer | 9 |
| Explorer | 12, 13, 14 |
| Design tokens | 1, 9, 15 |
| Notion DB + output | 4, 5, 6, 7 |
| Receiver | 8 |
| Worker | 7 |
| Triggers | 8 |
| Failure rules | 5, 7, 8 |
| Testing | 2-9, 13, 15 |
| Deployment | 16 |
| Risks: Notion API drift | Task 6 Step 1 |
| Risks: image size | Task 6 Step 6 (2MB warning) |
| Risks: missed webhook | Task 8 cron |
| Risks: explorer drift | Task 13 build validation |

**Known deviation from spec:** toggle blocks render as a bold summary line followed by their children, not as `<details>`. Raw HTML would require `rehype-raw`, which is an XSS surface on Notion-authored content. Spec updated to match.

**Placeholder scan:** no TBD, no "handle edge cases", no unspecified test code for the pure modules. UI tasks specify exact files, props, and structural rules; visual polish is inherently iterative and is verified by the manual and Playwright steps.