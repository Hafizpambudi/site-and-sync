import { describe, expect, it } from "vitest";
import { extractMeta, propertyFiles, propertyText } from "./notion";

const rich = (content: string) => [{ plain_text: content, text: { content }, annotations: {} }];

const properties = (overrides: Record<string, unknown> = {}) => ({
  Title: { type: "title", title: rich("Agentic RAG over 28,000 documents") },
  Slug: { type: "rich_text", rich_text: rich("legal-rag-archive") },
  Summary: { type: "rich_text", rich_text: rich("Two lawyers, no searchable archive.") },
  Status: { type: "select", select: { name: "Published" } },
  Date: { type: "date", date: { start: "2026-03-14T00:00:00.000Z" } },
  Role: { type: "rich_text", rich_text: rich("Solo full-stack AI engineer") },
  Timeline: { type: "rich_text", rich_text: rich("9 weeks") },
  Tags: { type: "multi_select", multi_select: [{ name: "RAG" }, { name: "Evals" }] },
  Featured: { type: "checkbox", checkbox: true },
  Cover: {
    type: "files",
    files: [{ type: "file", name: "cover.png", file: { url: "https://s3/cover.png?sig=1" } }],
  },
  ...overrides,
});

describe("propertyText", () => {
  it("reads title, rich text, select and date", () => {
    expect(propertyText(properties(), "Title")).toBe("Agentic RAG over 28,000 documents");
    expect(propertyText(properties(), "Slug")).toBe("legal-rag-archive");
    expect(propertyText(properties(), "Status")).toBe("Published");
    expect(propertyText(properties(), "Date")).toBe("2026-03-14T00:00:00.000Z");
  });

  it("returns an empty string for a missing property", () => {
    expect(propertyText(properties(), "Nope")).toBe("");
  });

  it("returns an empty string for an empty select", () => {
    expect(propertyText(properties({ Status: { type: "select", select: null } }), "Status")).toBe("");
  });
});

describe("propertyFiles", () => {
  it("reads file urls and external urls", () => {
    expect(propertyFiles(properties(), "Cover")).toEqual(["https://s3/cover.png?sig=1"]);
    expect(
      propertyFiles(
        properties({
          Cover: { type: "files", files: [{ type: "external", external: { url: "https://cdn/x.png" } }] },
        }),
        "Cover",
      ),
    ).toEqual(["https://cdn/x.png"]);
  });

  it("returns an empty list when there is no cover", () => {
    expect(propertyFiles(properties({ Cover: { type: "files", files: [] } }), "Cover")).toEqual([]);
  });
});

describe("extractMeta", () => {
  it("maps notion properties onto the case study schema", () => {
    const { meta, coverSource } = extractMeta(properties(), "legal-rag-archive");

    expect(meta).toEqual({
      slug: "legal-rag-archive",
      title: "Agentic RAG over 28,000 documents",
      summary: "Two lawyers, no searchable archive.",
      date: "2026-03-14",
      tags: ["RAG", "Evals"],
      cover: null,
      featured: true,
      role: "Solo full-stack AI engineer",
      timeline: "9 weeks",
    });
    expect(coverSource).toBe("https://s3/cover.png?sig=1");
  });

  it("truncates the date to a day", () => {
    expect(extractMeta(properties(), "a").meta.date).toBe("2026-03-14");
  });

  it("turns an empty timeline into null", () => {
    const { meta } = extractMeta(
      properties({ Timeline: { type: "rich_text", rich_text: [] } }),
      "a",
    );
    expect(meta.timeline).toBeNull();
  });

  it("keeps the slug it was given, not the one in the property", () => {
    expect(extractMeta(properties(), "already-normalised").meta.slug).toBe("already-normalised");
  });

  it("defaults missing optional fields", () => {
    const { meta, coverSource } = extractMeta(
      {
        Title: { type: "title", title: rich("T") },
        Slug: { type: "rich_text", rich_text: rich("t") },
        Summary: { type: "rich_text", rich_text: rich("S") },
        Date: { type: "date", date: { start: "2026-01-02" } },
      },
      "t",
    );
    expect(meta.tags).toEqual([]);
    expect(meta.cover).toBeNull();
    expect(meta.featured).toBe(false);
    expect(meta.timeline).toBeNull();
    expect(coverSource).toBeNull();
  });
});