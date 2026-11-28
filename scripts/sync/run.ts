import { isValidSlug } from "./slug";
import { toFrontmatter } from "./frontmatter";
import { buildIndex, type CaseStudyMeta } from "./index-builder";
import { planSync, type LocalEntry, type RemoteRow } from "./plan";

export type SyncDeps = {
  listRemote(): Promise<RemoteRow[]>;
  fetchPage(row: RemoteRow): Promise<{ markdown: string; meta: CaseStudyMeta; warnings: string[] }>;
  readLocal(): Promise<LocalEntry[]>;
  /** Reads every committed case study, so unchanged pages survive an index rebuild. */
  readAllMeta(): Promise<CaseStudyMeta[]>;
  writeFile(path: string, contents: string): Promise<void>;
  removeDir(path: string): Promise<void>;
};

export type SyncReport = {
  written: string[];
  removed: string[];
  unchanged: string[];
  warnings: string[];
};

export const CASE_STUDY_ROOT = "content/case-studies";

function assertNoDuplicateSlugs(rows: RemoteRow[]): void {
  const seen = new Set<string>();

  for (const row of rows) {
    if (!row.slug) continue;
    if (seen.has(row.slug)) {
      throw new Error(`duplicate slug across published pages: ${row.slug}`);
    }
    seen.add(row.slug);
  }
}

function documentFor(
  markdown: string,
  meta: CaseStudyMeta,
  row: RemoteRow,
): string {
  const header = toFrontmatter({
    title: meta.title,
    slug: meta.slug,
    summary: meta.summary,
    date: meta.date,
    role: meta.role,
    timeline: meta.timeline,
    tags: meta.tags,
    cover: meta.cover,
    demo: meta.demo,
    featured: meta.featured,
    notionId: row.notionId,
    notionLastEdited: row.lastEdited,
  });

  return `${header}\n${markdown}\n`;
}

export async function syncContent(
  deps: SyncDeps,
  options: { dryRun: boolean },
): Promise<SyncReport> {
  const [local, remote] = await Promise.all([deps.readLocal(), deps.listRemote()]);

  assertNoDuplicateSlugs(remote);

  const plan = planSync(local, remote);

  const written: string[] = [];
  const warnings: string[] = [...plan.remove.map((slug) => `removing unpublished: ${slug}`)];

  for (const row of plan.fetch) {
    if (!isValidSlug(row.slug)) {
      warnings.push(
        `skipped page with invalid slug: ${JSON.stringify(row.slug)} (${row.notionId})`,
      );
      continue;
    }

    const page = await deps.fetchPage(row);
    warnings.push(...page.warnings);

    if (!isValidSlug(page.meta.slug)) {
      warnings.push(`skipped page whose transformed slug is invalid: ${page.meta.slug}`);
      continue;
    }

    written.push(row.slug);

    if (options.dryRun) continue;

    await deps.writeFile(
      `${CASE_STUDY_ROOT}/${row.slug}/index.md`,
      documentFor(page.markdown, page.meta, row),
    );
  }

  if (!options.dryRun) {
    for (const slug of plan.remove) {
      await deps.removeDir(`${CASE_STUDY_ROOT}/${slug}`);
    }

    const index = buildIndex(await deps.readAllMeta());
    await deps.writeFile(`${CASE_STUDY_ROOT}/index.json`, `${JSON.stringify(index, null, 2)}\n`);
  }

  return {
    written,
    removed: plan.remove,
    unchanged: plan.unchanged,
    warnings,
  };
}