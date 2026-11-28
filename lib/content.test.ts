import { describe, expect, it } from "vitest";
import {
  getAllSlugs,
  getAllTags,
  getCaseStudy,
  getFeatured,
  getIndex,
  getNeighbours,
  validateMeta,
} from "./content";

describe("getIndex", () => {
  it("reads the committed index", () => {
    expect(getIndex().length).toBeGreaterThan(0);
  });

  it("returns entries in newest-first order", () => {
    const dates = getIndex().map((entry) => entry.date);
    expect([...dates].sort((a, b) => (a < b ? 1 : -1))).toEqual(dates);
  });
});

describe("getAllSlugs", () => {
  it("matches the index order", () => {
    expect(getAllSlugs()).toEqual(getIndex().map((entry) => entry.slug));
  });
});

describe("getCaseStudy", () => {
  it("returns frontmatter-stripped markdown", () => {
    const slug = getAllSlugs()[0]!;
    const { meta, markdown } = getCaseStudy(slug);

    expect(meta.title.length).toBeGreaterThan(0);
    expect(markdown.startsWith("---")).toBe(false);
    expect(markdown.length).toBeGreaterThan(0);
  });

  it("throws for an unknown slug", () => {
    expect(() => getCaseStudy("nope")).toThrow(/unknown case study/);
  });
});

describe("getAllTags", () => {
  it("returns unique sorted tags", () => {
    const tags = getAllTags();
    expect(new Set(tags).size).toBe(tags.length);
    expect([...tags].sort((a, b) => a.localeCompare(b))).toEqual(tags);
  });
});

describe("getFeatured", () => {
  it("caps the list", () => {
    expect(getFeatured(2)).toHaveLength(2);
  });
});

describe("getNeighbours", () => {
  it("finds the items either side in index order", () => {
    const slugs = getAllSlugs();
    const middle = slugs[1]!;
    const { previous, next } = getNeighbours(middle);
    expect(previous?.slug).toBe(slugs[0]);
    expect(next?.slug).toBe(slugs[2]);
  });

  it("returns null at the edges", () => {
    const first = getAllSlugs()[0]!;
    expect(getNeighbours(first).previous).toBeNull();
  });
});

describe("validateMeta", () => {
  it("throws naming the missing field", () => {
    expect(() => validateMeta({ slug: "a", title: "", summary: "s" })).toThrow(/title/);
  });

  it("accepts a complete entry", () => {
    expect(() => validateMeta({ slug: "a", title: "t", summary: "s" })).not.toThrow();
  });
});