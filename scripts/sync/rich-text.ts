export type RichTextItem = {
  type?: string;
  plain_text?: string;
  href?: string | null;
  text?: { content: string };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    code?: boolean;
  };
};

const MARKDOWN_CONTROL = /([*_`[\]])/g;

// Backslashes run first, or the ones this adds would be escaped again.
function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(MARKDOWN_CONTROL, "\\$1");
}

function renderCode(raw: string): string {
  if (raw.includes("`")) return `\`\`${raw}\`\``;
  return `\`${raw}\``;
}

function render(item: RichTextItem): string {
  const raw = item.plain_text ?? item.text?.content ?? "";
  if (raw === "") return "";

  const annotations = item.annotations ?? {};
  let out = annotations.code ? renderCode(raw) : escapeText(raw);

  if (annotations.bold) out = `**${out}**`;
  if (annotations.italic) out = `*${out}*`;
  if (annotations.strikethrough) out = `~~${out}~~`;
  if (item.href) out = `[${out}](${item.href})`;

  return out;
}

export function flattenRichText(items: RichTextItem[]): string {
  return items.map(render).join("");
}