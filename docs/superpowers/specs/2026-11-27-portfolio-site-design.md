# Portfolio Site and Notion Sync — Design

**Date:** 2026-11-27
**Status:** approved by owner, pending spec review
**Owner:** Hafiz Pambudi

## Goal

Replace the Notion-hosted portfolio with an owned site, and keep writing case studies in Notion. Editing a Notion row updates the site automatically.

## Problem

The current portfolio lives at a Notion public URL. It cannot carry custom design, custom motion, or a credible technical presentation. Case studies are also written in Notion, and the owner does not want to write them twice.

## Systems

Two systems, one repository, one deploy.

- **S1 — Site.** Public Next.js app. Reads content from git at build time. Static.
- **S2 — Sync.** Moves content from Notion into git. Three triggers, one worker.

The contract between them is the `content/` directory. S2 writes it, S1 reads it, nothing else couples them.

```
Notion (Case Studies DB)
   │ page.content_updated (~1 min, batched)
   ▼
S2a Receiver   POST /api/notion/webhook   (Vercel route)
   verify HMAC → repository_dispatch
   ▼
S2b Worker     GitHub Action
   fetch → transform → download images → write → commit → push
   ▼
content/       committed Markdown, JSON, images
   ▼
S1 Site        Next.js, static build, deployed on push
```

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Content store | Git-committed files | Versioned, free, instant rollback, no database |
| Trigger | Notion webhook + weekly cron + manual | Fast path, safety net, escape hatch |
| Worker host | GitHub Action | Git credentials stay in GitHub; no serverless timeout; sync is a commit |
| Receiver host | Vercel route | Notion needs a public SSL endpoint |
| Stack | Next.js 16 + React 19 + TypeScript | Static pages, one language for both systems |
| Styling | Tailwind 4, tokens as CSS variables | No component library |
| Content rendering | `react-markdown` + `remark-gfm` | Sync emits plain Markdown, no MDX compile |
| Repo layout | One repo, one Vercel project | S2 is a folder, not a second deploy |
| Explorer content | Hand-authored `content/explorer.json` | Widgets need structure Notion blocks cannot express |

Pinned versions at design time: `next@16.4.6`, `react@19.3.1`, `tailwindcss@4.3.5`, `@notionhq/client@5.32.0`, `vitest@5.1.2`, `@playwright/test@1.65.1`.

## S1 — Site

### Routes

| Route | Rendering | Content |
|---|---|---|
| `/` | Static | Hero, explorer, featured work, stack, contact |
| `/work` | Static | All published case studies, newest first, tag filter |
| `/work/[slug]` | SSG via `generateStaticParams` | Full case study |
| `/about` | Static | Bio, how I work, stack, links |
| `/contact` | Static | Email, LinkedIn, availability |
| `not-found` | Static | Plain |

Nav: Work, About, Contact.

### Home order

1. Hero — thesis line, name, one supporting sentence, two links.
2. Explorer — the animated panel.
3. Proof — three featured case-study cards, each carrying its number.
4. Stack — short, factual, links into `/about`.
5. Contact — email and LinkedIn.

### Case study page

Title → role / timeline / date (mono, muted) → tags → summary as lede (serif) → cover → article body → previous / next → back to work.

### Content layer

- `lib/content.ts` reads `content/` with `fs`. Server components only.
- `content/case-studies/index.json` is a generated index so list pages never parse every file.
- `generateStaticParams` reads slugs from the index.
- `generateMetadata` reads frontmatter. No generated OG images.
- Build fails if a case study is missing `title`, `slug`, or `summary`.

## S2 — Sync

### Notion database: Case Studies

| Property | Type | Required | Field |
|---|---|---|---|
| `Title` | Title | yes | `title` |
| `Slug` | Text | yes | `slug`, folder, URL |
| `Summary` | Text | yes | `summary` |
| `Status` | Select: `Draft`, `Published` | yes | only `Published` syncs |
| `Date` | Date | yes | `date` |
| `Role` | Text | yes | `role` |
| `Timeline` | Text | no | `timeline` |
| `Tags` | Multi-select | no | `tags` |
| `Cover` | Files | no | `cover` |
| `Featured` | Checkbox | no | `featured` |

### Output

```
content/case-studies/<slug>/index.md        frontmatter + body
public/content/case-studies/<slug>/*.png    downloaded images
content/case-studies/index.json             generated index
.last-sync.json                             gitignored; run log, not state
```

Frontmatter: `title`, `slug`, `summary`, `date`, `role`, `timeline`, `tags`, `cover`, `featured`, `notionId`, `notionLastEdited`.

`notionLastEdited` lives in the committed file, so the diff baseline survives ephemeral CI runners. No separate state file is needed, and an unchanged sync produces no commit. `.last-sync.json` is a written log for humans and CI summaries only.

Images live under `public/` so URLs are stable and `next/image` can optimise them. Notion file URLs expire in about an hour and are never emitted into content.

### Block support

Supported: heading 1-3, paragraph, bulleted list, numbered list, to-do, quote, callout (→ blockquote), code, divider, image, bookmark, table, toggle (→ details), nested children.

Not supported: synced blocks, inline databases, embeds, equations. These emit a `<!-- unsupported: <type> -->` comment and a warning. Content is never silently dropped.

Rich text flattens to: bold, italic, inline code, links. Notion colours are dropped.

### Receiver

`app/api/notion/webhook/route.ts`:

1. Read the raw body before parsing. HMAC fails on re-serialised bytes.
2. First request carries `verification_token` → store it, return 200.
3. Verify `X-Notion-Signature` with `verifyWebhookSignature()` from `@notionhq/client`.
4. On `page.content_updated` → `repository_dispatch("notion-sync")`, return 200.

Every other case returns 200 as a no-op. Failed signature returns 401 and dispatches nothing. Duplicate dispatches are harmless because the worker is idempotent.

### Worker

`scripts/sync/`, run as `npm run sync` (add `--dry-run` to print the diff without writing):

1. Read `content/` into a `notionId → { slug, notionLastEdited }` map.
2. Query the Notion database filtered to `Status = Published`.
3. Diff: new row or newer `last_edited_time` → fetch. Otherwise skip. Local folder absent from the published set → delete.
4. Per changed page: fetch blocks recursively, transform, download images.
5. Write files, delete removed folders, rebuild `index.json`, write `.last-sync.json`.
6. Commit and push. Message names the changed slugs.
7. No diff → exit 0, no commit, no Vercel build.

### Failure rules

| Situation | Behaviour |
|---|---|
| Notion 429 / 5xx | Backoff, 4 attempts, then the Action fails |
| One unsupported block | Warning, placeholder, page still syncs |
| Invalid slug | Row skipped, warning, Action succeeds |
| Duplicate slug | Hard fail, no commit |
| Image download fails | Retry once, keep the old image if present, else warn |
| Network dies mid-sync | Nothing committed; next run starts clean |

Partial success commits with warnings. Only duplicate slugs block a commit. Warnings go to `.last-sync.json` and the Action summary.

### Triggers

| Trigger | When |
|---|---|
| Webhook | On Notion edit, ~1 min |
| Weekly cron | Sunday 03:00 WIB |
| Manual | `workflow_dispatch` or `npm run sync` |

Accepted tradeoff: a missed webhook can leave content stale for up to a week. The manual trigger is the mitigation; moving the cron to daily is a one-line change.

## Explorer

The only hand-curated content on the site. `content/explorer.json`.

### Narrative arc

Question order is fixed: **business problem → constraint → what shipped → proof → validation → technology last.**

| # | Stage | Question | Widget |
|---|---|---|---|
| 01 | `problem` | What did they hand you? | `context` |
| 02 | `constraint` | What made it hard? | `constraints` |
| 03 | `move` | What did you build? | `steps` |
| 04 | `proof` | What changed by the numbers? | `metrics` + `beforeAfter` |
| 05 | `validation` | How do you know it worked? | `compare` |
| 06 | `stack` | What's under the hood? | `stack` |

Answer copy follows the same arc: business situation first, number at the end, tooling only when asked.

### State machine

```
idle ──(30% visible)──► typing ──(900ms)──► answer ──(dwell)──► typing
                            ▲                                     │
                            └──────── tap any stage ──────────────┘
                                                       (last → done)
```

`useReducer`. State: `{ current, asked: Set, playing, phase }`. No animation library, no XState.

| Behaviour | Rule |
|---|---|
| Start | IntersectionObserver, 30%, once |
| Pause | Off-screen > 50% or tab hidden |
| Dwell | 5.5s plain, 7.5s with widgets |
| Tap a stage | Jump, mark asked, keep playing |
| Last answered | Stop, reveal CTA |
| Restart | Visible only after stop |

### Layout

Conversation panel left, stage card right. The card doubles as navigation and progress. On mobile the card becomes a chip row above the panel.

Widgets: `context`, `constraints`, `steps`, `metrics`, `beforeAfter`, `compare`, `stack`. Seven, hand-rendered, no charting library.

### Motion and a11y

- Animate `opacity` and `translateY(8px)` only.
- 200-320ms, `cubic-bezier(0.2, 0, 0, 1)`.
- No bounce, glow, gradient, parallax, or cursor-follow.
- `prefers-reduced-motion: reduce` → no autoplay, no typing dots, all six stages render as a static expanded list.
- Stages are real buttons with visible focus and 44px targets.
- Answer region is `aria-live="polite"`.
- ✓/✗ always paired with text.
- Contrast AA.

## Design tokens

### Colour

| Token | Hex | Use |
|---|---|---|
| `paper` | `#FAFAF8` | page background |
| `surface` | `#FFFFFF` | panels |
| `ink` | `#17160F` | primary text, solid buttons |
| `ink-muted` | `#5C5A50` | secondary text |
| `ink-faint` | `#8A877B` | tertiary |
| `rule` | `#E4E1D8` | 1px borders |
| `accent` | `#D4500F` | fills, marks, underlines — never small text |
| `accent-ink` | `#A83B06` | accent as text |
| `verified` | `#1D6B45` | passing / done states only |

Two oranges on purpose: `#D4500F` fails AA as small text on paper, `#A83B06` passes. Green means verified and nothing else.

### Type

| Role | Family | Size | Weight | Detail |
|---|---|---|---|---|
| Hero | Archivo | `clamp(40px, 6vw, 76px)` | 600 | `0.98` / `-0.03em` |
| Section h2 | Archivo | `clamp(28px, 3.4vw, 44px)` | 600 | `-0.02em` |
| h3 | Archivo | 20px | 600 | `1.3` |
| UI | Archivo | 16px | 400 | `1.55` |
| Prose | Newsreader | 19px | 400 | `1.65`, `66ch` |
| Label | JetBrains Mono | 11px | 500 | `0.14em`, uppercase |
| Code | JetBrains Mono | 14px | 400 | `surface` background |

Serif appears only inside case-study prose. Three families, self-hosted via `next/font`, no fourth.

### Space, shape, motion

- 4px base, `1120px` max width, `24px` / `40px` gutters, `128px` / `72px` section rhythm.
- Prose column `66ch`, left-aligned. Body text never centred.
- Borders are 1px `rule`. Radius `8px` controls, `16px` panels.
- One shadow total: explorer panel, `0 1px 2px rgba(23,22,15,0.04)`.

### Banned

Gradient blobs, glassmorphism, purple gradients, emoji bullets, logo walls, icon-in-rounded-square above headings, three equal cards everywhere, centred everything, `rounded-3xl` on every container, fake terminal windows, animated counters everywhere.

## Testing

| Layer | Test |
|---|---|
| Block → Markdown | Vitest golden fixtures per block type |
| Slug rules, index builder, diff planner | Vitest, table-driven |
| Image downloader | Vitest, `fetch` stubbed |
| Explorer reducer | Vitest, pure transitions incl. reduced-motion branch |
| Routes | Playwright: six routes 200, markdown renders, 404 works |
| Animation | Manual, plus one reduced-motion pass |

No live Notion calls in CI. `npm run check` = lint + typecheck + unit + build.

## Deployment

Vercel (site + webhook), GitHub Action (worker), git (content), `@vercel/analytics`.

Vercel env: `NOTION_WEBHOOK_VERIFICATION_TOKEN`, `GITHUB_DISPATCH_TOKEN`.
GitHub secrets: `NOTION_TOKEN`, `NOTION_DATABASE_ID`.

### Go-live

1. Create the Notion integration, share the Case Studies DB with it.
2. Add both GitHub secrets.
3. Deploy to Vercel, capture the production URL.
4. Create the Notion webhook subscription pointing at `/api/notion/webhook`.
5. Paste `verification_token` into Vercel env, verify in Notion.
6. Run a manual sync, confirm commit and deploy.
7. Edit a page, confirm the webhook path fires within ~2 minutes.

Steps 6 and 7 are the acceptance test for S2. Both must pass.

## Risks

| Risk | Mitigation |
|---|---|
| Notion API version drift (2025 data-source change moved query endpoints) | Pin `Notion-Version`; verify the query call against current docs in Phase 2, not memory |
| Notion rate limit ~3 req/s | Sequential with backoff; `last_edited_time` diff keeps request volume tiny |
| Large images bloat the repo | Warn above 2 MB, commit anyway, no resize in v1 |
| Missed webhook leaves stale content | Weekly cron plus manual trigger |
| Explorer copy drifts from case studies | `caseStudy` slug validated at build; a bad link fails the build |

## Out of scope

Contact form and email delivery, dark mode, RSS, newsletter, generated OG images, comments, search, i18n.

## Build order

```
0  Scaffold        Next app, fonts, tokens, layout shell
1  Transformer     TDD: blocks → markdown, slug rules, index builder
2  Notion client   page + children fetch, image download, CLI
3  Receiver        webhook route, HMAC, dispatch, Action workflows
4  Content layer   lib/content.ts, /work, /work/[slug], Prose
5  Static pages    /, /about, /contact, 404, meta
6  Explorer        explorer.json, reducer, widgets, a11y
7  Polish          reduced motion, focus, analytics, a11y sweep
8  Deploy          Vercel, secrets, webhook verify, acceptance tests
```