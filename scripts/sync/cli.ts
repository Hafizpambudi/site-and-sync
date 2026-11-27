import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { CASE_STUDY_ROOT, syncContent } from "./run";
import {
  extractMeta,
  fetchPageTree,
  notionClient,
  queryPublished,
  type PublishedRow,
} from "./notion";
import { downloadCover, downloadImages, pruneImages } from "./images";
import { transformBlocks } from "./blocks";
import { parseFrontmatter, type FrontmatterData } from "./frontmatter";
import type { CaseStudyMeta } from "./index-builder";
import type { LocalEntry, RemoteRow } from "./plan";

const dryRun = process.argv.includes("--dry-run");

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing environment variable: ${name}`);
  return value;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function metaFromFrontmatter(slug: string, data: FrontmatterData): CaseStudyMeta {
  return {
    slug,
    title: asString(data.title) ?? "",
    summary: asString(data.summary) ?? "",
    date: asString(data.date) ?? "",
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    cover: asString(data.cover),
    featured: data.featured === true,
    role: asString(data.role) ?? "",
    timeline: asString(data.timeline),
  };
}

type Scanned = { entry: LocalEntry; meta: CaseStudyMeta };

async function scanContent(): Promise<Scanned[]> {
  let directories: string[];

  try {
    const entries = await readdir(CASE_STUDY_ROOT, { withFileTypes: true });
    directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }

  const scanned: Scanned[] = [];

  for (const slug of directories) {
    const file = path.join(CASE_STUDY_ROOT, slug, "index.md");

    let raw: string;
    try {
      raw = await readFile(file, "utf8");
    } catch {
      continue;
    }

    const { data } = parseFrontmatter(raw);
    const notionId = asString(data.notionId);
    const notionLastEdited = asString(data.notionLastEdited);

    // Hand-written pages have no notion id; leave them alone.
    if (!notionId || !notionLastEdited) continue;

    scanned.push({
      entry: { notionId, slug, notionLastEdited },
      meta: metaFromFrontmatter(slug, data),
    });
  }

  return scanned;
}

function filenameOf(publicPath: string): string {
  return publicPath.split("/").pop() ?? publicPath;
}

async function main(): Promise<void> {
  const token = env("NOTION_TOKEN");
  const databaseId = env("NOTION_DATABASE_ID");
  const notion = notionClient(token);

  const fetchPage = async (row: RemoteRow) => {
    const properties = (row as PublishedRow).properties;
    if (!properties) throw new Error(`notion returned no properties for ${row.notionId}`);

    const { meta, coverSource } = extractMeta(properties, row.slug);
    const blocks = await fetchPageTree(notion, row.notionId);

    const images = dryRun ? new Map<string, string>() : await downloadImages(blocks, row.slug);
    const cover =
      !dryRun && coverSource ? await downloadCover(coverSource, row.slug) : null;

    const result = transformBlocks(blocks, {
      resolveImage: (blockId) => images.get(blockId) ?? "",
    });

    if (!dryRun) {
      const keep = new Set([...images.values()].map(filenameOf));
      if (cover) keep.add(filenameOf(cover));
      await pruneImages(row.slug, keep);
    }

    return { markdown: result.markdown, meta: { ...meta, cover }, warnings: result.warnings };
  };

  const report = await syncContent(
    {
      listRemote: () => queryPublished(notion, databaseId),
      readLocal: async () => (await scanContent()).map((item) => item.entry),
      readAllMeta: async () => (await scanContent()).map((item) => item.meta),
      fetchPage,
      writeFile: async (file, contents) => {
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, contents, "utf8");
      },
      removeDir: async (directory) => {
        await rm(directory, { recursive: true, force: true });
        // Mirrors content/case-studies/<slug> under public/.
        await rm(path.join("public", directory), { recursive: true, force: true });
      },
    },
    { dryRun },
  );

  const log = { at: new Date().toISOString(), dryRun, ...report };
  await writeFile(".last-sync.json", `${JSON.stringify(log, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(log, null, 2));

  if (report.written.length === 0 && report.removed.length === 0) {
    console.log("no content changes");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});