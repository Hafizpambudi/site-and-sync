export type FrontmatterValue = string | number | boolean | string[] | null | undefined;
export type FrontmatterData = Record<string, FrontmatterValue>;

function scalar(value: string | number | boolean): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

/**
 * Emits the narrow YAML subset `parseFrontmatter` reads back: flat keys,
 * scalars, and string arrays. Anything richer belongs in the article body.
 */
export function toFrontmatter(data: FrontmatterData): string {
  const lines: string[] = ["---"];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${scalar(item)}`);
      continue;
    }

    lines.push(`${key}: ${scalar(value)}`);
  }

  lines.push("---", "");
  return lines.join("\n");
}

function parseScalar(raw: string): string | number | boolean {
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
    try {
      return JSON.parse(raw) as string;
    } catch {
      return raw;
    }
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

export function parseFrontmatter(raw: string): { data: FrontmatterData; body: string } {
  if (!raw.startsWith("---\n")) return { data: {}, body: raw };

  const close = raw.indexOf("\n---", 3);
  if (close === -1) return { data: {}, body: raw };

  const header = raw.slice(4, close);
  const rest = raw.slice(close + 4);
  const body = rest.startsWith("\n") ? rest.slice(1) : rest;

  const data: FrontmatterData = {};
  let currentKey: string | null = null;

  for (const line of header.split("\n")) {
    if (line.startsWith("  - ")) {
      if (currentKey === null) continue;
      const list = (data[currentKey] as string[] | undefined) ?? [];
      list.push(String(parseScalar(line.slice(4).trim())));
      data[currentKey] = list;
      continue;
    }

    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (key === "") continue;

    if (value === "") {
      currentKey = key;
      data[key] = [];
      continue;
    }

    currentKey = null;
    data[key] = parseScalar(value);
  }

  return { data, body };
}