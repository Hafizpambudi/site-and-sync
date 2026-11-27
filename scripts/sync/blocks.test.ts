import { describe, expect, it } from "vitest";
import { transformBlocks } from "./blocks";
import type { NotionBlock } from "./types";

type Payload = Record<string, unknown>;

const rich = (content: string) => [
  { plain_text: content, href: null, text: { content }, annotations: {} },
];

let counter = 0;

function block(type: string, payload: Payload = {}): NotionBlock {
  counter += 1;
  return {
    id: `${type}-${counter}`,
    type,
    has_children: false,
    [type]: { rich_text: rich("x"), ...payload },
  } as NotionBlock;
}

const ctx = { resolveImage: () => "/content/x.png" };

const md = (blocks: NotionBlock[]) => transformBlocks(blocks, ctx).markdown;

describe("transformBlocks — text blocks", () => {
  it("renders headings at the right depth", () => {
    expect(md([block("heading_1", { rich_text: rich("A") })])).toBe("# A");
    expect(md([block("heading_2", { rich_text: rich("B") })])).toBe("## B");
    expect(md([block("heading_3", { rich_text: rich("C") })])).toBe("### C");
  });

  it("separates paragraphs with a blank line", () => {
    expect(
      md([block("paragraph", { rich_text: rich("one") }), block("paragraph", { rich_text: rich("two") })]),
    ).toBe("one\n\ntwo");
  });

  it("drops empty paragraphs", () => {
    expect(
      md([block("paragraph", { rich_text: rich("one") }), block("paragraph", { rich_text: [] })]),
    ).toBe("one");
  });

  it("renders quotes as blockquotes", () => {
    expect(md([block("quote", { rich_text: rich("q") })])).toBe("> q");
  });

  it("renders a callout as a blockquote", () => {
    expect(md([block("callout", { rich_text: rich("c"), icon: { emoji: "!" } })])).toBe("> c");
  });

  it("renders dividers", () => {
    expect(md([block("divider")])).toBe("---");
  });

  it("keeps inline formatting from rich text", () => {
    const bold = [{ plain_text: "bold", href: null, text: { content: "bold" }, annotations: { bold: true } }];
    expect(md([block("paragraph", { rich_text: bold })])).toBe("**bold**");
  });
});

describe("transformBlocks — lists", () => {
  it("renders bulleted items", () => {
    expect(md([block("bulleted_list_item", { rich_text: rich("a") })])).toBe("- a");
  });

  it("numbers consecutive items and restarts after a break", () => {
    expect(
      md([
        block("numbered_list_item", { rich_text: rich("first") }),
        block("numbered_list_item", { rich_text: rich("second") }),
        block("paragraph", { rich_text: rich("break") }),
        block("numbered_list_item", { rich_text: rich("again") }),
      ]),
    ).toBe("1. first\n2. second\n\nbreak\n\n1. again");
  });

  it("indents nested list children by two spaces", () => {
    const parent = block("bulleted_list_item", {
      rich_text: rich("parent"),
      __children: [block("bulleted_list_item", { rich_text: rich("child") })],
    });
    expect(md([parent])).toBe("- parent\n  - child");
  });

  it("renders to-do checkboxes", () => {
    expect(md([block("to_do", { rich_text: rich("done"), checked: true })])).toBe("- [x] done");
    expect(md([block("to_do", { rich_text: rich("todo"), checked: false })])).toBe("- [ ] todo");
  });
});

describe("transformBlocks — media and structure", () => {
  it("renders images through the resolver with the caption as alt text", () => {
    const image = block("image", {
      type: "file",
      caption: rich("shot"),
      file: { url: "https://s3/x.png?X-Amz-Expires=3600" },
    });
    expect(md([image])).toBe("![shot](/content/x.png)");
  });

  it("renders external images", () => {
    const image = block("image", { type: "external", external: { url: "https://cdn/x.png" } });
    expect(md([image])).toBe("![](/content/x.png)");
  });

  it("renders fenced code with the language", () => {
    const code = block("code", {
      rich_text: [{ plain_text: "const a = 1;", text: { content: "const a = 1;" }, annotations: {} }],
      language: "typescript",
    });
    expect(md([code])).toBe("```typescript\nconst a = 1;\n```");
  });

  it("omits the fence language for plain text", () => {
    const code = block("code", {
      rich_text: [{ plain_text: "x", text: { content: "x" }, annotations: {} }],
      language: "plain text",
    });
    expect(md([code])).toBe("```\nx\n```");
  });

  it("does not escape code content", () => {
    const code = block("code", {
      rich_text: [{ plain_text: "a * b _c_", text: { content: "a * b _c_" }, annotations: {} }],
      language: "plain text",
    });
    expect(md([code])).toBe("```\na * b _c_\n```");
  });

  it("renders a toggle as a bold summary followed by its children", () => {
    const toggle = block("toggle", {
      rich_text: rich("More"),
      __children: [block("paragraph", { rich_text: rich("inner") })],
    });
    toggle.has_children = true;
    expect(md([toggle])).toBe("**More**\n\ninner");
  });

  it("renders a table with a header row", () => {
    const table = block("table", {
      table_width: 2,
      __children: [
        block("table_row", { cells: [rich("Metric"), rich("Value")] }),
        block("table_row", { cells: [rich("Accuracy"), rich("90%")] }),
      ],
    });
    expect(md([table])).toBe("| Metric | Value |\n| --- | --- |\n| Accuracy | 90% |");
  });

  it("escapes pipes inside table cells", () => {
    const table = block("table", {
      __children: [
        block("table_row", { cells: [rich("a|b"), rich("c")] }),
        block("table_row", { cells: [rich("1"), rich("2")] }),
      ],
    });
    expect(md([table])).toBe("| a\\|b | c |\n| --- | --- |\n| 1 | 2 |");
  });

  it("pads short table rows so the grid stays aligned", () => {
    const table = block("table", {
      __children: [
        block("table_row", { cells: [rich("a"), rich("b")] }),
        block("table_row", { cells: [rich("1")] }),
      ],
    });
    expect(md([table])).toBe("| a | b |\n| --- | --- |\n| 1 |  |");
  });

  it("renders bookmarks as links", () => {
    expect(md([block("bookmark", { url: "https://example.com" })])).toBe(
      "[example.com](https://example.com)",
    );
  });

  it("passes through column layout instead of dropping the content", () => {
    const columns = block("column_list", {
      __children: [
        block("column", { __children: [block("paragraph", { rich_text: rich("left") })] }),
        block("column", { __children: [block("paragraph", { rich_text: rich("right") })] }),
      ],
    });
    expect(md([columns])).toBe("left\n\nright");
  });
});

describe("transformBlocks — unsupported types", () => {
  it("emits a placeholder comment and a warning", () => {
    const result = transformBlocks([block("synced_block")], ctx);
    expect(result.markdown).toBe("<!-- unsupported: synced_block -->");
    expect(result.warnings).toEqual(["unsupported block type: synced_block"]);
  });

  it("keeps the surrounding content", () => {
    const result = transformBlocks(
      [
        block("paragraph", { rich_text: rich("before") }),
        block("embed", { url: "https://youtube.com/x" }),
        block("paragraph", { rich_text: rich("after") }),
      ],
      ctx,
    );
    expect(result.markdown).toBe(
      "before\n\n<!-- unsupported: embed -->\n\nafter",
    );
  });
});