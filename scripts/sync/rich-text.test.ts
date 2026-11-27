import { describe, expect, it } from "vitest";
import { flattenRichText, type RichTextItem } from "./rich-text";

const text = (content: string, annotations: RichTextItem["annotations"] = {}): RichTextItem => ({
  type: "text",
  plain_text: content,
  href: null,
  text: { content },
  annotations,
});

describe("flattenRichText", () => {
  it("returns an empty string for empty input", () => {
    expect(flattenRichText([])).toBe("");
  });

  it("joins plain segments without separators", () => {
    expect(flattenRichText([text("Hello "), text("world")])).toBe("Hello world");
  });

  it("applies bold, italic, code and strikethrough", () => {
    expect(flattenRichText([text("a", { bold: true })])).toBe("**a**");
    expect(flattenRichText([text("a", { italic: true })])).toBe("*a*");
    expect(flattenRichText([text("a", { code: true })])).toBe("`a`");
    expect(flattenRichText([text("a", { strikethrough: true })])).toBe("~~a~~");
  });

  it("stacks annotations in a markdown-safe order", () => {
    expect(flattenRichText([text("a", { bold: true, italic: true })])).toBe("***a***");
  });

  it("wraps links and keeps nested formatting", () => {
    expect(flattenRichText([{ ...text("docs"), href: "https://example.com" }])).toBe(
      "[docs](https://example.com)",
    );
    expect(flattenRichText([{ ...text("docs", { bold: true }), href: "https://example.com" }])).toBe(
      "[**docs**](https://example.com)",
    );
  });

  it("escapes markdown control characters in plain text", () => {
    expect(flattenRichText([text("2 * 3 _x_ [y]")])).toBe("2 \\* 3 \\_x\\_ \\[y\\]");
  });

  it("escapes a literal backslash before anything else", () => {
    expect(flattenRichText([text("c:\\path")])).toBe("c:\\\\path");
  });

  it("does not escape inside code", () => {
    expect(flattenRichText([text("a_b", { code: true })])).toBe("`a_b`");
  });

  it("uses a double fence when the code contains a backtick", () => {
    expect(flattenRichText([text("a`b", { code: true })])).toBe("``a`b``");
  });

  it("falls back to text.content when plain_text is missing", () => {
    expect(flattenRichText([{ text: { content: "hi" } }])).toBe("hi");
  });

  it("drops segments with no content", () => {
    expect(flattenRichText([text(""), text("x")])).toBe("x");
  });
});