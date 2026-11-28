import { describe, expect, it } from "vitest";
import { parseFrontmatter, toFrontmatter } from "./frontmatter";

describe("toFrontmatter", () => {
  it("serialises scalars, arrays and booleans", () => {
    expect(
      toFrontmatter({ title: "A: B", tags: ["x", "y"], featured: true, date: "2026-03-14" }),
    ).toBe('---\ntitle: "A: B"\ntags:\n  - "x"\n  - "y"\nfeatured: true\ndate: "2026-03-14"\n---\n');
  });

  it("omits undefined and null values", () => {
    expect(toFrontmatter({ title: "T", timeline: undefined, cover: null })).toBe(
      '---\ntitle: "T"\n---\n',
    );
  });

  it("keeps numbers raw", () => {
    expect(toFrontmatter({ order: 3 })).toBe("---\norder: 3\n---\n");
  });

  it("escapes quotes and backslashes through json encoding", () => {
    expect(toFrontmatter({ title: 'say "hi" \\ now' })).toBe(
      '---\ntitle: "say \\"hi\\" \\\\ now"\n---\n',
    );
  });
});

describe("parseFrontmatter", () => {
  it("round-trips what toFrontmatter writes", () => {
    const data = {
      title: "A: B",
      slug: "a-b",
      tags: ["x", "y"],
      featured: true,
      date: "2026-03-14",
    };
    const raw = `${toFrontmatter(data)}Body line one.\n\nBody line two.\n`;
    const parsed = parseFrontmatter(raw);

    expect(parsed.data).toEqual(data);
    expect(parsed.body).toBe("Body line one.\n\nBody line two.\n");
  });

  it("returns the input untouched when there is no frontmatter", () => {
    const parsed = parseFrontmatter("# Title\n\nbody");
    expect(parsed.data).toEqual({});
    expect(parsed.body).toBe("# Title\n\nbody");
  });

  it("parses an empty array", () => {
    const parsed = parseFrontmatter("---\ntags:\n---\nbody");
    expect(parsed.data).toEqual({ tags: [] });
  });

  it("parses an empty body", () => {
    const parsed = parseFrontmatter('---\ntitle: "T"\n---\n');
    expect(parsed.data).toEqual({ title: "T" });
    expect(parsed.body).toBe("");
  });

  it("parses frontmatter written with CRLF line endings", () => {
    const raw = '---\r\ntitle: "T"\r\ntags:\r\n  - "x"\r\nnotionId: "abc"\r\n---\r\nBody.\r\n';
    const parsed = parseFrontmatter(raw);

    expect(parsed.data).toEqual({ title: "T", tags: ["x"], notionId: "abc" });
    expect(parsed.body).toBe("Body.\n");
  });
});