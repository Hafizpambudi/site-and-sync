import { flattenRichText, type RichTextItem } from "./rich-text";
import {
  childBlocksOf,
  payloadOf,
  type NotionBlock,
  type TransformContext,
  type TransformResult,
} from "./types";

type ListType = "bulleted_list_item" | "numbered_list_item" | "to_do";

const LIST_TYPES = new Set<string>(["bulleted_list_item", "numbered_list_item", "to_do"]);

/** Hidden blocks carry no prose; skipping them is not content loss. */
const SKIPPED = new Set<string>(["unsupported", "breadcrumb", "table_of_contents"]);

const LANGUAGE_MAP: Record<string, string> = {
  "plain text": "",
  "c++": "cpp",
  "c#": "csharp",
  "objective-c": "objc",
  shell: "bash",
  "shell script": "bash",
  sql: "sql",
  json: "json",
  typescript: "typescript",
  javascript: "javascript",
  python: "python",
};

const SUPPORTED = new Set<string>([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "quote",
  "callout",
  "code",
  "divider",
  "image",
  "bookmark",
  "table",
  "table_row",
  "toggle",
  "column_list",
  "column",
  ...LIST_TYPES,
]);

function richText(block: NotionBlock): RichTextItem[] {
  return payloadOf(block).rich_text ?? [];
}

function textOf(block: NotionBlock): string {
  return flattenRichText(richText(block));
}

function indentLines(value: string, indent: string): string {
  return value
    .split("\n")
    .map((line) => (line.length > 0 ? indent + line : line))
    .join("\n");
}

function joinChunks(chunks: string[]): string {
  return chunks.filter((chunk) => chunk.length > 0).join("\n\n");
}

function imageUrl(block: NotionBlock): string {
  const payload = payloadOf(block);
  return payload.file?.url ?? payload.external?.url ?? payload.url ?? "";
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function renderTable(block: NotionBlock): string {
  const rows = childBlocksOf(block)
    .filter((row) => row.type === "table_row")
    .map((row) =>
      (payloadOf(row).cells ?? []).map((cell) => flattenRichText(cell).replace(/\|/g, "\\|")),
    );

  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (width === 0) return "";

  const pad = (row: string[]): string[] => {
    const copy = [...row];
    while (copy.length < width) copy.push("");
    return copy;
  };

  const line = (row: string[]) => `| ${row.join(" | ")} |`;
  const divider = `| ${new Array(width).fill("---").join(" | ")} |`;
  const [head, ...body] = rows.map(pad);
  if (!head) return "";

  return [line(head), divider, ...body.map(line)].join("\n");
}

function renderList(
  blocks: NotionBlock[],
  start: number,
  kind: ListType,
  ctx: TransformContext,
  warnings: string[],
  depth: number,
): { markdown: string; next: number } {
  const indent = "  ".repeat(depth);
  const lines: string[] = [];
  let index = start;
  let position = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    if (!block || block.type !== kind) break;

    const payload = payloadOf(block);
    position += 1;
    const marker =
      kind === "numbered_list_item"
        ? `${position}.`
        : kind === "to_do"
          ? `- [${payload.checked ? "x" : " "}]`
          : "-";

    lines.push(`${indent}${marker} ${flattenRichText(payload.rich_text ?? [])}`);
    index += 1;

    const nested = renderBlocks(childBlocksOf(block), ctx, warnings, depth + 1);
    nested.forEach((chunk, chunkIndex) => {
      if (chunkIndex > 0) lines.push("");
      // Already indented for `depth + 1`; re-indenting here would double it.
      lines.push(chunk);
    });
  }

  return { markdown: lines.join("\n"), next: index };
}

function renderBlock(
  block: NotionBlock,
  ctx: TransformContext,
  warnings: string[],
  depth: number,
): string {
  const payload = payloadOf(block);

  switch (block.type) {
    case "paragraph":
      return textOf(block);

    case "heading_1":
      return `# ${textOf(block)}`;
    case "heading_2":
      return `## ${textOf(block)}`;
    case "heading_3":
      return `### ${textOf(block)}`;

    case "quote": {
      const body = textOf(block);
      const children = joinChunks(renderBlocks(childBlocksOf(block), ctx, warnings, 0));
      return children ? `> ${body}\n>\n> ${children.replace(/\n/g, "\n> ")}` : `> ${body}`;
    }

    case "callout": {
      const body = textOf(block);
      const children = joinChunks(renderBlocks(childBlocksOf(block), ctx, warnings, 0));
      const quoted = body ? `> ${body}` : "";
      return joinChunks([quoted, children]);
    }

    case "code": {
      const raw = richText(block)
        .map((item) => item.plain_text ?? item.text?.content ?? "")
        .join("");
      const language = LANGUAGE_MAP[payload.language ?? ""] ?? payload.language ?? "";
      return `\`\`\`${language}\n${raw}\n\`\`\``;
    }

    case "divider":
      return "---";

    case "image": {
      const caption = flattenRichText(payload.caption ?? []);
      return `![${caption}](${ctx.resolveImage(block.id)})`;
    }

    case "bookmark": {
      const url = payload.url ?? "";
      const caption = flattenRichText(payload.caption ?? []);
      return `[${caption || hostnameOf(url)}](${url})`;
    }

    case "table":
      return renderTable(block);

    case "table_row":
      return (payload.cells ?? [])
        .map((cell) => flattenRichText(cell).replace(/\|/g, "\\|"))
        .join(" | ");

    case "toggle": {
      const children = joinChunks(renderBlocks(childBlocksOf(block), ctx, warnings, 0));
      return joinChunks([`**${textOf(block)}**`, children]);
    }

    case "column_list":
    case "column":
      return joinChunks(renderBlocks(childBlocksOf(block), ctx, warnings, 0));

    default:
      warnings.push(`unsupported block type: ${block.type}`);
      return `<!-- unsupported: ${block.type} -->`;
  }
}

function renderBlocks(
  blocks: NotionBlock[],
  ctx: TransformContext,
  warnings: string[],
  depth: number,
): string[] {
  const chunks: string[] = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    if (!block) break;

    if (LIST_TYPES.has(block.type)) {
      const group = renderList(blocks, index, block.type as ListType, ctx, warnings, depth);
      if (group.markdown) chunks.push(group.markdown);
      index = group.next;
      continue;
    }

    index += 1;

    if (SKIPPED.has(block.type)) continue;

    if (!SUPPORTED.has(block.type)) {
      warnings.push(`unsupported block type: ${block.type}`);
      chunks.push(`<!-- unsupported: ${block.type} -->`);
      continue;
    }

    const rendered = renderBlock(block, ctx, warnings, depth);
    if (!rendered) continue;
    chunks.push(depth > 0 ? indentLines(rendered, "  ".repeat(depth)) : rendered);
  }

  return chunks;
}

export function transformBlocks(blocks: NotionBlock[], ctx: TransformContext): TransformResult {
  const warnings: string[] = [];
  const chunks = renderBlocks(blocks, ctx, warnings, 0);

  const markdown = joinChunks(chunks)
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { markdown, warnings };
}