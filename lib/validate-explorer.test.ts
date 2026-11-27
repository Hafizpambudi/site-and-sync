import { describe, expect, it } from "vitest";
import { validateExplorer } from "./validate-explorer";
import type { ExplorerData } from "./content";

const base: ExplorerData = {
  stages: ["problem", "proof", "stack"],
  questions: [
    {
      id: "a",
      stage: "problem",
      label: "l",
      question: "q",
      answer: "a",
      widgets: [],
      caseStudy: "legal",
    },
    {
      id: "b",
      stage: "proof",
      label: "l",
      question: "q",
      answer: "a",
      widgets: [],
      caseStudy: "legal",
    },
    {
      id: "c",
      stage: "stack",
      label: "l",
      question: "q",
      answer: "a",
      widgets: [],
      caseStudy: "legal",
    },
  ],
  widgets: {},
};

describe("validateExplorer", () => {
  it("accepts a valid document", () => {
    expect(validateExplorer(base, ["legal"])).toEqual([]);
  });

  it("rejects an unknown case study slug", () => {
    expect(validateExplorer(base, ["other"])).toContain(
      "question a references unknown case study: legal",
    );
  });

  it("rejects out-of-order stages", () => {
    const bad = { ...base, questions: [base.questions[2]!, base.questions[0]!, base.questions[1]!] };
    expect(validateExplorer(bad, ["legal"])).toContain("stages are out of arc order");
  });

  it("rejects a question with an unknown stage", () => {
    const bad = {
      ...base,
      questions: [{ ...base.questions[0]!, stage: "nope" }, base.questions[1]!, base.questions[2]!],
    };
    expect(validateExplorer(bad, ["legal"]).some((error) => error.includes("unknown stage"))).toBe(
      true,
    );
  });

  it("rejects a question that points at a widget that does not exist", () => {
    const bad = {
      ...base,
      questions: [{ ...base.questions[0]!, widgets: ["ghost"] }, base.questions[1]!, base.questions[2]!],
    };
    expect(validateExplorer(bad, ["legal"])).toContain("question a references unknown widget: ghost");
  });

  it("rejects duplicate question ids", () => {
    const bad = {
      ...base,
      questions: [base.questions[0]!, { ...base.questions[1]!, id: "a" }, base.questions[2]!],
    };
    expect(validateExplorer(bad, ["legal"]).some((error) => error.includes("duplicate question id"))).toBe(
      true,
    );
  });

  it("accepts an empty document", () => {
    expect(validateExplorer({ stages: [], questions: [], widgets: {} }, [])).toEqual([]);
  });

  it("accepts a widget a question actually points at", () => {
    const good = {
      ...base,
      questions: [{ ...base.questions[0]!, widgets: ["metrics"] }, base.questions[1]!, base.questions[2]!],
      widgets: { metrics: { type: "metrics", items: [] } },
    };
    expect(validateExplorer(good, ["legal"])).toEqual([]);
  });

  it("rejects a widget with an unknown type", () => {
    const bad = { ...base, widgets: { ghost: { type: "nope", items: [] } } };
    expect(validateExplorer(bad, ["legal"])).toContain("widget ghost has unknown type: nope");
  });
});
