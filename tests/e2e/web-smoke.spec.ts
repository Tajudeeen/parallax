import { test, expect } from "@playwright/test";

test("web SPA mounts without runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto("/");
  // React must have rendered real content into #root.
  await expect(page.locator("#root *")).toBeTruthy();
  const title = await page.title();
  expect(title).toContain("Parallax");
  expect(errors).toEqual([]);
});

test("authenticated-style routes do not crash the client", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  for (const path of ["/login", "/register", "/dashboard"]) {
    await page.goto(path);
  }
  expect(errors).toEqual([]);
});
