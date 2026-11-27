# Hafiz Pambudi — portfolio

Personal portfolio site plus the pipeline that publishes case studies from Notion.

Two systems share one Next.js repo:

1. **The site.** Public pages at `/`, `/work`, `/work/[slug]`, `/about`, `/contact`.
2. **The sync.** A Notion database row becomes a Markdown file, a git commit, and a deploy.

## How publishing works

```
Notion page edit
  → webhook to /api/notion/webhook (HMAC verified)
  → repository_dispatch
  → GitHub Action runs `npm run sync`
  → commit under content/ and public/content/
  → Vercel rebuilds
```

A weekly cron (Sunday 03:00 WIB) and a manual trigger cover missed webhooks.

Only rows whose `Status` is `Published` sync. Unpublishing a row deletes its folder on the next run.

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The site reads from committed files, so it renders without any Notion credentials.

### Sync locally

Copy `.env.example` to `.env` and fill in the Notion values, then:

```bash
npm run sync -- --dry-run   # report what would change, write nothing
npm run sync                # write files, images and index.json
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (prerenders every case study) |
| `npm run check` | Lint, typecheck, unit tests, build |
| `npm run test:e2e` | Playwright smoke suite (starts its own dev server) |
| `npm run sync` | Notion → files |
| `npm run index` | Rebuild `index.json` from frontmatter on disk |

## Where content lives

```
content/
  site.json                      name, role, email, links, stack
  explorer.json                  hand-authored explorer questions and widgets
  case-studies/
    index.json                   generated; drives lists, order and featured
    <slug>/index.md              generated; frontmatter + body
public/content/case-studies/     downloaded images, one folder per slug
```

`content/case-studies/` and `public/content/case-studies/` are machine-written. Edit case studies in Notion, not in the repo. `content/site.json` and `content/explorer.json` are yours to edit by hand.

Images are downloaded and committed rather than hotlinked. Notion image URLs expire after about an hour, so a hotlinked page would lose its screenshots.

## Deploy

See [docs/runbook.md](docs/runbook.md) for the go-live checklist, environment variables, and recovery steps.