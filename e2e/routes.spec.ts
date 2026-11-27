import { expect, test } from "@playwright/test";

const routes = ["/", "/work", "/about", "/contact"];

test("all routes respond", async ({ page }) => {
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
  }
});

test("unknown case study returns 404", async ({ page }) => {
  const response = await page.goto("/work/does-not-exist");
  expect(response?.status()).toBe(404);
});

test("each page has exactly one h1", async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("h1"), route).toHaveCount(1);
  }
});

test("the work index links to a case study", async ({ page }) => {
  await page.goto("/work");
  await page.getByRole("link", { name: /28,000 documents/i }).click();
  await expect(page).toHaveURL(/\/work\/legal-rag-archive$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("28,000 documents");
});

test("explorer is static under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const explorer = page.getByRole("region", { name: /explorer/i });
  await expect(explorer).toBeVisible();
  await expect(explorer.getByText("What did they hand you?")).toBeVisible();
});

test("explorer autoplays once it is in view", async ({ page }) => {
  await page.goto("/");
  const explorer = page.getByRole("region", { name: /explorer/i });
  await explorer.getByText("What did they hand you?").scrollIntoViewIfNeeded();
  await expect(explorer.getByText(/Two lawyers and 28,000 documents/)).toBeVisible({
    timeout: 15_000,
  });
});

test("stage buttons jump the explorer", async ({ page }) => {
  await page.goto("/");
  const explorer = page.getByRole("region", { name: /explorer/i });

  // Poll a pause click until hydration wires the handler, then the jump is real.
  await expect
    .poll(
      async () => {
        await explorer.getByRole("button", { name: "Pause" }).click();
        return explorer.getByRole("button", { name: "Play" }).count();
      },
      { timeout: 15_000 },
    )
    .toBe(1);

  await explorer.getByRole("button", { name: /what's under the hood/i }).click();
  await expect(explorer.getByText("What's under the hood?")).toBeVisible();
});

test("no horizontal overflow on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const route of routes) {
    await page.goto(route);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, route).toBeLessThanOrEqual(1);
  }
});