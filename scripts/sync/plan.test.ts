import { describe, expect, it } from "vitest";
import { planSync, type LocalEntry, type RemoteRow } from "./plan";

const local = (notionId: string, slug: string, notionLastEdited: string): LocalEntry => ({
  notionId,
  slug,
  notionLastEdited,
});

const remote = (notionId: string, slug: string, lastEdited: string): RemoteRow => ({
  notionId,
  slug,
  lastEdited,
});

describe("planSync", () => {
  it("fetches new rows", () => {
    const plan = planSync([], [remote("1", "a", "2026-01-01T00:00:00.000Z")]);
    expect(plan.fetch.map((row) => row.slug)).toEqual(["a"]);
    expect(plan.remove).toEqual([]);
    expect(plan.unchanged).toEqual([]);
  });

  it("skips rows whose timestamp and slug both match", () => {
    const plan = planSync(
      [local("1", "a", "2026-01-01T00:00:00.000Z")],
      [remote("1", "a", "2026-01-01T00:00:00.000Z")],
    );
    expect(plan.fetch).toEqual([]);
    expect(plan.unchanged).toEqual(["a"]);
  });

  it("fetches rows edited since the last sync", () => {
    const plan = planSync(
      [local("1", "a", "2026-01-01T00:00:00.000Z")],
      [remote("1", "a", "2026-02-01T00:00:00.000Z")],
    );
    expect(plan.fetch.map((row) => row.slug)).toEqual(["a"]);
  });

  it("fetches when the slug changed even if the timestamp did not", () => {
    const plan = planSync(
      [local("1", "old-slug", "2026-01-01T00:00:00.000Z")],
      [remote("1", "new-slug", "2026-01-01T00:00:00.000Z")],
    );
    expect(plan.fetch.map((row) => row.slug)).toEqual(["new-slug"]);
    expect(plan.remove).toEqual(["old-slug"]);
  });

  it("removes local folders that are no longer published", () => {
    const plan = planSync([local("1", "gone", "2026-01-01T00:00:00.000Z")], []);
    expect(plan.remove).toEqual(["gone"]);
  });

  it("treats an unparsable timestamp as changed rather than silently skipping", () => {
    const plan = planSync([local("1", "a", "not-a-date")], [remote("1", "a", "2026-01-01T00:00:00.000Z")]);
    expect(plan.fetch.map((row) => row.slug)).toEqual(["a"]);
  });
});