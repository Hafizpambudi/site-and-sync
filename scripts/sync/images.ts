import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { withRetry } from "./retry";
import { childBlocksOf, payloadOf, type NotionBlock } from "./types";

const MAX_BYTES = 2 * 1024 * 1024;

// An allowlist, not a shape check: the file is served from our own origin, so
// `.php` or `.html` must never survive the round trip.
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"]);

/**
 * Notion file URLs are signed and expire within the hour, so the signature
 * must not influence the filename: re-signing the same image would otherwise
 * rewrite every file on every sync.
 */
export function imageFilename(url: string): string {
  const withoutQuery = url.split("?")[0] ?? url;
  const rawExtension = path.extname(withoutQuery).toLowerCase();
  const extension = IMAGE_EXTENSIONS.has(rawExtension) ? rawExtension : ".png";
  const hash = createHash("sha1").update(withoutQuery).digest("hex").slice(0, 12);
  return `${hash}${extension}`;
}

function imageUrlOf(block: NotionBlock): string | null {
  const payload = payloadOf(block);
  return payload.file?.url ?? payload.external?.url ?? payload.url ?? null;
}

function collectImages(blocks: NotionBlock[], found: NotionBlock[] = []): NotionBlock[] {
  for (const block of blocks) {
    if (block.type === "image" && imageUrlOf(block)) found.push(block);
    const children = childBlocksOf(block);
    if (children.length > 0) collectImages(children, found);
  }
  return found;
}

export async function downloadImage(
  url: string,
  slug: string,
  filename: string,
  root = process.cwd(),
): Promise<void> {
  const directory = path.join(root, "public", "content", "case-studies", slug);
  await mkdir(directory, { recursive: true });

  const bytes = await withRetry(async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw Object.assign(new Error(`image download failed: ${response.status}`), {
        status: response.status,
      });
    }
    return new Uint8Array(await response.arrayBuffer());
  });

  if (bytes.byteLength > MAX_BYTES) {
    console.warn(
      `warning: image over 2MB (${bytes.byteLength} bytes) for ${slug}/${filename}`,
    );
  }

  await writeFile(path.join(directory, filename), bytes);
}

/** Maps image block id to its committed public path. */
export async function downloadImages(
  blocks: NotionBlock[],
  slug: string,
  root = process.cwd(),
): Promise<Map<string, string>> {
  const byBlock = new Map<string, string>();
  const byUrl = new Map<string, string>();

  for (const block of collectImages(blocks)) {
    const url = imageUrlOf(block);
    if (!url) continue;

    let publicPath = byUrl.get(url);
    if (!publicPath) {
      const filename = imageFilename(url);
      await downloadImage(url, slug, filename, root);
      publicPath = `/content/case-studies/${slug}/${filename}`;
      byUrl.set(url, publicPath);
    }

    byBlock.set(block.id, publicPath);
  }

  return byBlock;
}