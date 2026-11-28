import { Client } from "@notionhq/client";
import { flattenRichText, type RichTextItem } from "./rich-text";
import { withRetry } from "./retry";
import type { CaseStudyMeta } from "./index-builder";
import type { RemoteRow } from "./plan";
import type { NotionBlock } from "./types";

/**
 * Pinned so a Notion API revision cannot silently change response shapes.
 * 2025-09-03 moved database queries onto data sources.
 */
export const NOTION_VERSION = "2025-09-03";

export type PublishedRow = RemoteRow & {
  properties: Record<string, unknown>;
  /** Fallback date for databases that do not carry a Date property. */
  createdTime: string;
};

type NotionProperty = {
  type?: string;
  title?: RichTextItem[];
  rich_text?: RichTextItem[];
  select?: { name?: string } | null;
  date?: { start?: string } | null;
  checkbox?: boolean;
  multi_select?: { name?: string }[];
  files?: { type?: string; file?: { url?: string }; external?: { url?: string } }[];
  number?: number | null;
  url?: string | null;
};

function property(properties: Record<string, unknown>, name: string): NotionProperty | undefined {
  return properties[name] as NotionProperty | undefined;
}

export function propertyText(properties: Record<string, unknown>, name: string): string {
  const value = property(properties, name);
  if (!value) return "";

  switch (value.type) {
    case "title":
      return flattenRichText(value.title ?? []).trim();
    case "rich_text":
      return flattenRichText(value.rich_text ?? []).trim();
    case "select":
      return value.select?.name ?? "";
    case "date":
      return value.date?.start ?? "";
    case "url":
      return value.url ?? "";
    case "number":
      return value.number === null || value.number === undefined ? "" : String(value.number);
    case "checkbox":
      return String(Boolean(value.checkbox));
    default:
      return "";
  }
}

export function propertyTags(properties: Record<string, unknown>, name: string): string[] {
  return (property(properties, name)?.multi_select ?? [])
    .map((item) => item.name ?? "")
    .filter((name) => name.length > 0);
}

export function propertyFiles(properties: Record<string, unknown>, name: string): string[] {
  return (property(properties, name)?.files ?? [])
    .map((file) => file.file?.url ?? file.external?.url ?? "")
    .filter((url) => url.length > 0);
}

/**
 * A Notion database names its own properties, so the sync accepts the names
 * people actually use instead of forcing a rename that breaks their views.
 */
function firstText(properties: Record<string, unknown>, names: string[]): string {
  for (const name of names) {
    const value = propertyText(properties, name);
    if (value) return value;
  }
  return "";
}

export function extractMeta(
  properties: Record<string, unknown>,
  slug: string,
  createdTime: string | null = null,
): { meta: CaseStudyMeta; coverSource: string | null } {
  const timeline = firstText(properties, ["Timeline"]);
  const date = firstText(properties, ["Date"]) || (createdTime ?? "");

  return {
    meta: {
      slug,
      title: firstText(properties, ["Title", "Project", "Name"]),
      summary: firstText(properties, ["Summary", "Short Description", "Description"]),
      date: date.slice(0, 10),
      tags: propertyTags(properties, "Tags"),
      cover: null,
      featured: propertyText(properties, "Featured") === "true",
      role: firstText(properties, ["Role"]),
      timeline: timeline || null,
    },
    coverSource: propertyFiles(properties, "Cover")[0] ?? null,
  };
}

export function notionClient(token: string): Client {
  return new Client({ auth: token, notionVersion: NOTION_VERSION });
}

async function resolveDataSourceId(notion: Client, databaseId: string): Promise<string> {
  const database = await withRetry(() => notion.databases.retrieve({ database_id: databaseId }));
  const sources = (database as { data_sources?: { id: string }[] }).data_sources;

  if (!sources || sources.length === 0) {
    throw new Error(
      `database ${databaseId} exposes no data source. Check that the integration has access to it.`,
    );
  }

  const first = sources[0];
  if (!first) throw new Error(`database ${databaseId} has an empty data source list`);
  return first.id;
}

export async function queryPublished(notion: Client, databaseId: string): Promise<PublishedRow[]> {
  const dataSourceId = await resolveDataSourceId(notion, databaseId);
  const rows: PublishedRow[] = [];
  let cursor: string | undefined;

  do {
    const response = await withRetry(() =>
      notion.dataSources.query({
        data_source_id: dataSourceId,
        page_size: 100,
        start_cursor: cursor,
        filter: { property: "Status", select: { equals: "Published" } },
      }),
    );

    for (const result of response.results) {
      if (result.object !== "page") continue;

      const properties =
        ((result as { properties?: Record<string, unknown> }).properties ?? {}) as Record<
          string,
          unknown
        >;

      if (propertyText(properties, "Status") !== "Published") continue;

      rows.push({
        notionId: String(result.id),
        slug: propertyText(properties, "Slug"),
        lastEdited: String((result as { last_edited_time?: string }).last_edited_time ?? ""),
        createdTime: String((result as { created_time?: string }).created_time ?? ""),
        properties,
      });
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return rows;
}

/**
 * Fetches the page body depth-first and attaches children under
 * `<type>.__children`, the shape the block transformer reads.
 */
export async function fetchPageTree(notion: Client, pageId: string): Promise<NotionBlock[]> {
  const listChildren = async (blockId: string): Promise<NotionBlock[]> => {
    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;

    do {
      const response = await withRetry(() =>
        notion.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 }),
      );

      for (const result of response.results) {
        if (!("type" in result)) continue;

        const block = result as unknown as NotionBlock;

        if (block.has_children) {
          const children = await listChildren(block.id);
          const payload = (block[block.type] ?? {}) as Record<string, unknown>;
          payload.__children = children;
          block[block.type] = payload;
        }

        blocks.push(block);
      }

      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return blocks;
  };

  return listChildren(pageId);
}