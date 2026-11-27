import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { CASE_STUDY_ROOT } from "./run";
import { parseFrontmatter, type FrontmatterData } from "./frontmatter";
import type { CaseStudyMeta } from "./index-builder";
import type { LocalEntry } from "./plan";

export type ScannedCaseStudy = {
  /** Absent for hand-written case studies, which the sync must leave alone. */
  entry: LocalEntry | null;
  meta: CaseStudyMeta;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function metaFromFrontmatter(slug: string, data: FrontmatterData): CaseStudyMeta {
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

export async function scanContent(root = CASE_STUDY_ROOT): Promise<ScannedCaseStudy[]> {
  let directories: string[];

  try {
    const entries = await readdir(root, { withFileTypes: true });
    directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }

  const scanned: ScannedCaseStudy[] = [];

  for (const slug of directories) {
    let raw: string;
    try {
      raw = await readFile(path.join(root, slug, "index.md"), "utf8");
    } catch {
      continue;
    }

    const { data } = parseFrontmatter(raw);
    const notionId = asString(data.notionId);
    const notionLastEdited = asString(data.notionLastEdited);

    scanned.push({
      entry:
        notionId && notionLastEdited ? { notionId, slug, notionLastEdited } : null,
      meta: metaFromFrontmatter(slug, data),
    });
  }

  return scanned;
}