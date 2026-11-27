import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadCover, downloadImages, imageFilename, pruneImages } from "./images";
import type { NotionBlock } from "./types";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("imageFilename", () => {
  it("hashes the path and keeps the extension, ignoring the signature", () => {
    const a = imageFilename("https://s3.amazonaws.com/x/Cover.PNG?X-Amz-Expires=3600");
    const b = imageFilename("https://s3.amazonaws.com/x/Cover.PNG?X-Amz-Expires=7200");
    expect(a.endsWith(".png")).toBe(true);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{12}\.png$/);
  });

  it("falls back to .png when there is no extension", () => {
    expect(imageFilename("https://s3/x/file")).toMatch(/^[a-f0-9]{12}\.png$/);
  });

  it("rejects a nonsense extension instead of trusting it", () => {
    expect(imageFilename("https://s3/x/file.php?exec=1")).toMatch(/\.png$/);
  });

  it("is stable for the same path", () => {
    expect(imageFilename("https://s3/a/b.jpg")).toBe(imageFilename("https://s3/a/b.jpg"));
  });

  it("differs for different paths", () => {
    expect(imageFilename("https://s3/a.jpg")).not.toBe(imageFilename("https://s3/b.jpg"));
  });
});

const imageBlock = (id: string, url: string, children: NotionBlock[] = []): NotionBlock => ({
  id,
  type: "image",
  has_children: children.length > 0,
  image: { type: "file", file: { url }, __children: children },
});

describe("downloadImages", () => {
  it("writes the bytes under public/content and returns public paths", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sync-images-"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 })),
    );

    const map = await downloadImages([imageBlock("img1", "https://s3/a.png?sig=1")], "slug", root);

    const publicPath = map.get("img1");
    expect(publicPath).toMatch(/^\/content\/case-studies\/slug\/[a-f0-9]{12}\.png$/);

    const filename = publicPath!.split("/").pop()!;
    const bytes = await readFile(
      path.join(root, "public", "content", "case-studies", "slug", filename),
    );
    expect([...bytes]).toEqual([1, 2, 3]);

    await rm(root, { recursive: true, force: true });
  });

  it("downloads a repeated url once", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sync-images-"));
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const map = await downloadImages(
      [imageBlock("a", "https://s3/a.png"), imageBlock("b", "https://s3/a.png")],
      "slug",
      root,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(map.get("a")).toBe(map.get("b"));

    await rm(root, { recursive: true, force: true });
  });

  it("walks nested children", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sync-images-"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array([1]), { status: 200 })),
    );

    const nested = imageBlock("inner", "https://s3/b.png");
    const parent: NotionBlock = {
      id: "p",
      type: "toggle",
      has_children: true,
      toggle: { rich_text: [], __children: [nested] },
    };

    const map = await downloadImages([parent], "slug", root);
    expect(map.has("inner")).toBe(true);

    await rm(root, { recursive: true, force: true });
  });

  it("retries once then succeeds", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sync-images-"));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([7]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const map = await downloadImages([imageBlock("a", "https://s3/a.png")], "slug", root);
    expect(map.size).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await rm(root, { recursive: true, force: true });
  });

  it("throws when the image never downloads", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sync-images-"));
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));

    await expect(downloadImages([imageBlock("a", "https://s3/a.png")], "slug", root)).rejects.toThrow(
      /404/,
    );

    await rm(root, { recursive: true, force: true });
  });
});

describe("downloadCover", () => {
  it("stores the cover under a stable, prefixed name", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sync-cover-"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array([9]), { status: 200 })),
    );

    const publicPath = await downloadCover("https://s3/cover.png?sig=1", "slug", root);

    expect(publicPath).toMatch(/^\/content\/case-studies\/slug\/cover-[a-f0-9]{12}\.png$/);
    expect(await readFile(path.join(root, "public", publicPath))).toEqual(Buffer.from([9]));

    await rm(root, { recursive: true, force: true });
  });
});

describe("pruneImages", () => {
  it("deletes files that the current sync did not produce", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sync-prune-"));
    const directory = path.join(root, "public", "content", "case-studies", "slug");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "keep.png"), "a");
    await writeFile(path.join(directory, "stale.png"), "b");

    const removed = await pruneImages("slug", new Set(["keep.png"]), root);

    expect(removed).toEqual(["stale.png"]);
    expect(await readdir(directory)).toEqual(["keep.png"]);

    await rm(root, { recursive: true, force: true });
  });

  it("is a no-op when the directory does not exist", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sync-prune-"));
    expect(await pruneImages("missing", new Set(), root)).toEqual([]);
    await rm(root, { recursive: true, force: true });
  });
});