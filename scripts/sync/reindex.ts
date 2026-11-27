import { writeFile } from "node:fs/promises";
import path from "node:path";
import { buildIndex } from "./index-builder";
import { scanContent } from "./local";
import { CASE_STUDY_ROOT } from "./run";

/**
 * Rebuilds content/case-studies/index.json from the frontmatter on disk.
 * The sync calls the same builder, so this is only for local repair.
 */
async function main(): Promise<void> {
  const scanned = await scanContent();
  const index = buildIndex(scanned.map((item) => item.meta));
  const target = path.join(CASE_STUDY_ROOT, "index.json");

  await writeFile(target, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  console.log(`wrote ${target} with ${index.length} case studies`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});