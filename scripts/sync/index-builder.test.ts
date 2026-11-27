import { describe, expect, it } from "vitest";
import { buildIndex, type CaseStudyMeta } from "./index-builder";

const meta = (slug: string, date: string, featured = false): CaseStudyMeta => ({
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

  it("puts featured first within the same date", () => {
    expect(
      buildIndex([meta("a", "2026-01-01"), meta("b", "2026-01-01", true)]).map((m) => m.slug),
    ).toEqual(["b", "a"]);
  });

  it("breaks ties by slug so the order is stable", () => {
    expect(buildIndex([meta("b", "2026-01-01"), meta("a", "2026-01-01")]).map((m) => m.slug)).toEqual([
      "a",
      "b",
    ]);
  });

  it("does not mutate its input", () => {
    const input = [meta("b", "2025-01-01"), meta("a", "2026-01-01")];
    const snapshot = input.map((m) => m.slug);
    buildIndex(input);
    expect(input.map((m) => m.slug)).toEqual(snapshot);
  });

  it("handles an empty list", () => {
    expect(buildIndex([])).toEqual([]);
  });
});