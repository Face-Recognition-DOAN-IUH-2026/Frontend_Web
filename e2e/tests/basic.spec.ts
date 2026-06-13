import { test, expect } from "@playwright/test";

test.describe("Basic App Tests", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
  });
});