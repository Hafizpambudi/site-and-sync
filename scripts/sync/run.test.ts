import { describe, expect, it, vi } from "vitest";
import { syncContent, type SyncDeps } from "./run";
import type { CaseStudyMeta } from "./index-builder";

const meta = (slug: string): CaseStudyMeta => ({
  slug,
  title: slug,
  summary: slug,
  date: "2026-01-01",
  tags: [],
  cover: null,
  featured: false,
  role: "role",
  timeline: null,
});

function deps(overrides: Partial<SyncDeps> = {}): SyncDeps {
  const writeFile = vi.fn().mockResolvedValue(undefined);
  const removeDir = vi.fn().mockResolvedValue(undefined);

  return {
    listRemote: async () => [{ notionId: "1", slug: "a", lastEdited: "2026-01-02T00:00:00.000Z" }],
    fetchPage: async () => ({ markdown: "body", meta: meta("a"), warnings: [] }),
    readLocal: async () => [],
    readAllMeta: async () => [meta("a")],
    writeFile,
    removeDir,
    ...overrides,
  };
}

describe("syncContent", () => {
  it("writes the page and rebuilds the index", async () => {
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const report = await syncContent(deps({ writeFile }), { dryRun: false });

    expect(report.written).toEqual(["a"]);
    expect(writeFile).toHaveBeenCalledWith(
      "content/case-studies/a/index.md",
      expect.stringContaining("body"),
    );
    expect(writeFile).toHaveBeenCalledWith(
      "content/case-studies/index.json",
      expect.stringContaining('"slug": "a"'),
    );
  });

  it("records the notion id and timestamp so the next sync can diff", async () => {
    const writeFile = vi.fn().mockResolvedValue(undefined);
    await syncContent(deps({ writeFile }), { dryRun: false });

    const document = writeFile.mock.calls.find(([path]) => String(path).endsWith("index.md"))?.[1];
    expect(document).toContain('notionId: "1"');
    expect(document).toContain('notionLastEdited: "2026-01-02T00:00:00.000Z"');
  });

  it("writes nothing on a dry run but still reports the plan", async () => {
    const writeFile = vi.fn();
    const report = await syncContent(deps({ writeFile }), { dryRun: true });

    expect(report.written).toEqual(["a"]);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("removes folders that are no longer published", async () => {
    const removeDir = vi.fn().mockResolvedValue(undefined);
    const report = await syncContent(
      deps({
        listRemote: async () => [],
        readLocal: async () => [
          { notionId: "1", slug: "gone", notionLastEdited: "2026-01-01T00:00:00.000Z" },
        ],
        readAllMeta: async () => [],
        removeDir,
      }),
      { dryRun: false },
    );

    expect(report.removed).toEqual(["gone"]);
    expect(removeDir).toHaveBeenCalledWith("content/case-studies/gone");
  });

  it("does not remove folders on a dry run", async () => {
    const removeDir = vi.fn();
    await syncContent(
      deps({
        listRemote: async () => [],
        readLocal: async () => [{ notionId: "1", slug: "gone", notionLastEdited: "x" }],
        removeDir,
      }),
      { dryRun: true },
    );

    expect(removeDir).not.toHaveBeenCalled();
  });

  it("skips an invalid slug with a warning instead of failing the run", async () => {
    const report = await syncContent(
      deps({
        listRemote: async () => [{ notionId: "9", slug: "Bad Slug", lastEdited: "2026-01-02T00:00:00.000Z" }],
      }),
      { dryRun: false },
    );

    expect(report.written).toEqual([]);
    expect(report.warnings.join("\n")).toMatch(/invalid slug/i);
  });

  it("does not fetch a page with an invalid slug", async () => {
    const fetchPage = vi.fn();
    await syncContent(
      deps({
        listRemote: async () => [{ notionId: "9", slug: "Bad Slug", lastEdited: "2026-01-02T00:00:00.000Z" }],
        fetchPage,
      }),
      { dryRun: false },
    );

    expect(fetchPage).not.toHaveBeenCalled();
  });

  it("fails loudly on a duplicate slug", async () => {
    await expect(
      syncContent(
        deps({
          listRemote: async () => [
            { notionId: "1", slug: "same", lastEdited: "2026-01-02T00:00:00.000Z" },
            { notionId: "2", slug: "same", lastEdited: "2026-01-03T00:00:00.000Z" },
          ],
        }),
        { dryRun: false },
      ),
    ).rejects.toThrow(/duplicate slug/);
  });

  it("collects warnings from each page", async () => {
    const report = await syncContent(
      deps({
        fetchPage: async () => ({
          markdown: "body",
          meta: meta("a"),
          warnings: ["unsupported block type: embed"],
        }),
      }),
      { dryRun: false },
    );

    expect(report.warnings).toEqual(["unsupported block type: embed"]);
  });

  it("reports unchanged slugs", async () => {
    const report = await syncContent(
      deps({
        readLocal: async () => [
          { notionId: "1", slug: "a", notionLastEdited: "2026-01-02T00:00:00.000Z" },
        ],
      }),
      { dryRun: false },
    );

    expect(report.unchanged).toEqual(["a"]);
    expect(report.written).toEqual([]);
  });
});