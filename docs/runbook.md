# Runbook

Operational steps for the site and the Notion sync.

## Environment variables

Vercel project:

| Variable | Used by | Meaning |
| --- | --- | --- |
| `NOTION_WEBHOOK_VERIFICATION_TOKEN` | webhook route | HMAC key for `X-Notion-Signature`. Returned by Notion when the subscription is created. |
| `GITHUB_DISPATCH_TOKEN` | webhook route | Fine-grained GitHub token with **Contents: read and write** on the repo. Write is required to create a `repository_dispatch`. A classic PAT with the `repo` scope also works. |
| `GITHUB_REPO` | webhook route | `owner/repo`, the dispatch target. |

GitHub Actions secrets:

| Secret | Used by | Meaning |
| --- | --- | --- |
| `NOTION_TOKEN` | sync worker | Internal integration secret. The Case Studies database must be shared with this integration. |
| `NOTION_DATABASE_ID` | sync worker | The database the sync reads. |

## Notion schema

The sync reads property names, case-sensitively. Two are required; everything else is optional.

| Property | Type | Notes |
| --- | --- | --- |
| `Slug` | Text | Required. Lowercase kebab-case. Becomes the URL. |
| `Status` | Select | Required. Only `Published` syncs. |
| `Title` or `Project` | Title | Row title. Either name works. |
| `Summary` or `Short Description` | Text | Card and meta description. |
| `Date` | Date | Optional; falls back to the row's creation time. |
| `Tags` | Multi-select | Card chips and the `/work` filter. |
| `Featured` | Checkbox | Pins the row on the home page. |
| `Role` | Text | Shown under the case study title. |
| `Timeline` | Text | Shown under the case study title. |
| `Cover` | Files | Downloaded into `public/content/case-studies/<slug>/`. |

A `Status` property of type *Status* (the Notion status kind) does not work — the query filters a Select. Use Select.

## Figure out a database id

Open the database as a full page. In the URL, the 32-character hex in the path is the database id; the `?v=` value is only the view id.

```
https://app.notion.com/p/37181055e1ee4d809b8f8067a2ee7343?v=33d6ac96...
                         └────────── database id ──────────┘   └─ view, ignore ─┘
```

If that id returns `object_not_found`, list every database the connection can see:

```bash
curl -s https://api.notion.com/v1/search \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"filter":{"property":"object","value":"database"},"page_size":100}'
```

## Go-live checklist

1. **Create the Notion integration.** Share the Case Studies database with it. Copy the internal integration secret.
2. **Create the GitHub repository and push.** Merge the work to `main`.
3. **Add GitHub secrets.** `NOTION_TOKEN` and `NOTION_DATABASE_ID` under Settings → Secrets and variables → Actions.
4. **Import the repo in Vercel.** Add the three Vercel variables above. Capture the production URL.
5. **Create the Notion webhook.** Point it at `https://<production-url>/api/notion/webhook`. Notion sends a one-time handshake and shows a `verification_token`.
6. **Paste the token into Vercel** as `NOTION_WEBHOOK_VERIFICATION_TOKEN`, redeploy, then click Verify in Notion. The handshake also logs the token in the Vercel function log if you need to read it again.
7. **Run the acceptance test.** Trigger the sync manually. Confirm a commit touching `content/` appears and Vercel redeploys. Then edit a page title in Notion, wait two minutes, and confirm both the commit and the live page changed.

Steps 7 is the proof that S2 works. Do not call the sync done until a real Notion edit reaches production.

## Manual sync

GitHub → Actions → **Sync content** → Run workflow. Or locally:

```bash
npm run sync -- --dry-run
npm run sync
```

The run writes `.last-sync.json` with `written`, `removed`, `unchanged`, and `warnings`. The file is gitignored; the workflow also prints it to the job summary.

## Recovering from a bad sync

The content is a git commit, so roll it back like any other change.

```bash
git log --oneline -- content public/content
git revert <commit-sha>
git push
```

Vercel redeploys the previous content. The next sync compares against `notionLastEdited`, so it will re-fetch the reverted pages and restore them. If the page itself is wrong in Notion, fix it there first.

## Rotating the webhook token

1. Delete the webhook subscription in Notion and create it again, or regenerate its token.
2. Copy the new `verification_token` from the handshake.
3. Update `NOTION_WEBHOOK_VERIFICATION_TOKEN` in Vercel and redeploy.
4. Click Verify in Notion.

Until step 3 completes, every real event returns `401`. Notion retries, so no edit is lost.

## When something fails

**Sync exits with `duplicate slug across published pages: <slug>`**
Two published rows share a slug. Rename one `Slug` property. The run refuses to guess which wins.

**Sync warns `skipped page with invalid slug`**
The slug is not lowercase kebab-case. Fix the `Slug` property in Notion. The page is skipped, the rest of the run continues.

**`missing environment variable: NOTION_TOKEN`**
The local run has no `.env`, or the GitHub secret is not set. Locally, copy `.env.example` to `.env`.

**Webhook returns `401`**
Signature mismatch. The raw body must reach the verifier unmodified, and the token must match the one Notion issued. Check for a proxy that rewrites the body, then rotate the token.

**Webhook returns `502`**
GitHub rejected the dispatch. Check that `GITHUB_DISPATCH_TOKEN` has `actions: write` and that `GITHUB_REPO` is `owner/repo`.

**Images disappear after a page edit**
An image failed to download, so the sync aborted before pruning. Check the failed URL in the Action log. Notion image URLs expire, so the sync must download them during the same run that reads the page.

**Content is stale**
Run the manual sync. If it reports no changes, check the row's `Status` is `Published` and that `Last edited time` is newer than `notionLastEdited` in the file's frontmatter.