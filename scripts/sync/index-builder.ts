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

/**
 * Newest first. Featured breaks a same-date tie, slug breaks the rest, so the
 * order never depends on filesystem iteration.
 */
export function buildIndex(entries: CaseStudyMeta[]): CaseStudyMeta[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.slug.localeCompare(b.slug);
  });
}