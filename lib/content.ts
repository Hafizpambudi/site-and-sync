import { readFileSync } from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "@/scripts/sync/frontmatter";
import type { CaseStudyMeta } from "@/scripts/sync/index-builder";

export type { CaseStudyMeta };

export type ExplorerQuestion = {
  id: string;
  stage: string;
  label: string;
  question: string;
  answer: string;
  widgets: string[];
  caseStudy: string;
};

export type ExplorerWidget = {
  type: string;
  items: unknown[];
};

export type ExplorerData = {
  stages: string[];
  questions: ExplorerQuestion[];
  widgets: Record<string, ExplorerWidget>;
};

export type CaseStudy = {
  meta: CaseStudyMeta;
  markdown: string;
};

export type SiteLink = {
  label: string;
  href: string;
};

export type SiteInfo = {
  name: string;
  role: string;
  thesis: string;
  supporting: string;
  email: string;
  availability: string;
  links: SiteLink[];
};

const CONTENT_ROOT = path.join(process.cwd(), "content");
const CASE_STUDY_ROOT = path.join(CONTENT_ROOT, "case-studies");
const INDEX_FILE = path.join(CASE_STUDY_ROOT, "index.json");
const EXPLORER_FILE = path.join(CONTENT_ROOT, "explorer.json");

/**
 * A broken build beats a page that renders with an empty title. Every field
 * here is required by the card, the meta tags, and the explorer link.
 */
export function validateMeta(meta: Partial<CaseStudyMeta>): void {
  for (const field of ["title", "slug", "summary"] as const) {
    if (!meta[field]) {
      throw new Error(`case study is missing required field: ${field} (slug: ${meta.slug ?? "?"})`);
    }
  }
}

export function getIndex(): CaseStudyMeta[] {
  const raw = JSON.parse(readFileSync(INDEX_FILE, "utf8")) as CaseStudyMeta[];
  raw.forEach(validateMeta);
  return raw;
}

export function getAllSlugs(): string[] {
  return getIndex().map((entry) => entry.slug);
}

export function getCaseStudy(slug: string): CaseStudy {
  const meta = getIndex().find((entry) => entry.slug === slug);
  if (!meta) throw new Error(`unknown case study: ${slug}`);

  const raw = readFileSync(path.join(CASE_STUDY_ROOT, slug, "index.md"), "utf8");
  return { meta, markdown: parseFrontmatter(raw).body };
}

export function getExplorer(): ExplorerData {
  try {
    return JSON.parse(readFileSync(EXPLORER_FILE, "utf8")) as ExplorerData;
  } catch {
    return { stages: [], questions: [], widgets: {} };
  }
}

export function getFeatured(limit = 3): CaseStudyMeta[] {
  const featured = getIndex().filter((entry) => entry.featured);
  const fallback = getIndex();
  return (featured.length > 0 ? featured : fallback).slice(0, limit);
}

export function getAllTags(): string[] {
  return [...new Set(getIndex().flatMap((entry) => entry.tags))].sort((a, b) => a.localeCompare(b));
}

export function getNeighbours(slug: string): { previous: CaseStudyMeta | null; next: CaseStudyMeta | null } {
  const index = getIndex();
  const position = index.findIndex((entry) => entry.slug === slug);
  if (position === -1) return { previous: null, next: null };

  // The index is newest first, so the previous item in the list is more recent.
  return {
    previous: index[position - 1] ?? null,
    next: index[position + 1] ?? null,
  };
}

const SITE_FILE = path.join(CONTENT_ROOT, "site.json");

const SITE_FALLBACK: SiteInfo = {
  name: "Hafiz Pambudi",
  role: "Full-stack AI Engineer",
  thesis: "Most of my work starts as a vague request and ends as a shipped system with a number attached.",
  supporting: "",
  email: "",
  availability: "",
  links: [],
};

export function getSite(): SiteInfo {
  try {
    const raw = JSON.parse(readFileSync(SITE_FILE, "utf8")) as Partial<SiteInfo>;
    return { ...SITE_FALLBACK, ...raw };
  } catch {
    return SITE_FALLBACK;
  }
}