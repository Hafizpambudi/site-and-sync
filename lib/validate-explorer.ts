import type { ExplorerData } from "./content";
import { isKnownWidgetType } from "./explorer-widgets";

/**
 * Runs at build time from the home page. A bad explorer must fail the build
 * rather than ship a section that renders half-blank.
 */
export function validateExplorer(data: ExplorerData, slugs: string[]): string[] {
  const errors: string[] = [];
  const known = new Set(slugs);
  const widgetKeys = new Set(Object.keys(data.widgets ?? {}));
  const stages = data.stages ?? [];
  const rank = new Map(stages.map((stage, index) => [stage, index]));
  const ids = new Set<string>();
  let previous = -1;

  for (const [key, widget] of Object.entries(data.widgets ?? {})) {
    if (!isKnownWidgetType(widget.type)) {
      errors.push(`widget ${key} has unknown type: ${widget.type}`);
    }
  }

  for (const question of data.questions ?? []) {
    if (ids.has(question.id)) {
      errors.push(`duplicate question id: ${question.id}`);
    }
    ids.add(question.id);

    if (!known.has(question.caseStudy)) {
      errors.push(`question ${question.id} references unknown case study: ${question.caseStudy}`);
    }

    for (const widget of question.widgets ?? []) {
      if (!widgetKeys.has(widget)) {
        errors.push(`question ${question.id} references unknown widget: ${widget}`);
      }
    }

    const position = rank.get(question.stage);
    if (position === undefined) {
      errors.push(`question ${question.id} has unknown stage: ${question.stage}`);
      continue;
    }

    if (position < previous) errors.push("stages are out of arc order");
    previous = position;
  }

  return errors;
}
