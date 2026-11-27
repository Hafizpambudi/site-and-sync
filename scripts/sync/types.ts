import type { RichTextItem } from "./rich-text";

export type NotionBlock = {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
};

export type BlockPayload = {
  rich_text?: RichTextItem[];
  checked?: boolean;
  language?: string;
  caption?: RichTextItem[];
  type?: string;
  file?: { url: string };
  external?: { url: string };
  url?: string;
  table_width?: number;
  cells?: RichTextItem[][];
  __children?: NotionBlock[];
};

export type TransformContext = {
  /** Returns the public path an image block should point at. */
  resolveImage(blockId: string): string;
};

export type TransformResult = {
  markdown: string;
  warnings: string[];
};

export function payloadOf(block: NotionBlock): BlockPayload {
  return (block[block.type] ?? {}) as BlockPayload;
}

export function childBlocksOf(block: NotionBlock): NotionBlock[] {
  const children = payloadOf(block).__children;
  return Array.isArray(children) ? children : [];
}