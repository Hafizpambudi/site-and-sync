import { describe, expect, it } from "vitest";
import { isValidSlug } from "./slug";

describe("isValidSlug", () => {
  it("accepts lowercase words joined by single hyphens", () => {
    expect(isValidSlug("legal-rag-archive")).toBe(true);
  });

  it("accepts digits", () => {
    expect(isValidSlug("rag-v2")).toBe(true);
  });

  it("rejects uppercase", () => {
    expect(isValidSlug("Legal-RAG")).toBe(false);
  });

  it("rejects leading and trailing hyphens", () => {
    expect(isValidSlug("-legal")).toBe(false);
    expect(isValidSlug("legal-")).toBe(false);
  });

  it("rejects double hyphens and spaces", () => {
    expect(isValidSlug("legal--rag")).toBe(false);
    expect(isValidSlug("legal rag")).toBe(false);
  });

  it("rejects empty and over-long slugs", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("a".repeat(65))).toBe(false);
  });

  it("rejects path separators and dots", () => {
    expect(isValidSlug("../etc")).toBe(false);
    expect(isValidSlug("a/b")).toBe(false);
  });
});