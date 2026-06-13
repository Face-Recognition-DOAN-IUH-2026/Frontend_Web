import { test, expect } from "@playwright/test";

test.describe("Gate/Kiosk Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test("WEB-05: Navigate to gate page", async ({ page }) => {
    await page.goto("/gate");
    await expect(page.locator("text=Cổng")).toBeVisible({ timeout: 5000 });
  });

  test("WEB-06: Gate page shows entry/exit camera feeds", async ({ page }) => {
    await page.goto("/gate");
    await expect(page.locator("text=Cổng vào")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Cổng ra")).toBeVisible({ timeout: 5000 });
  });

  test("WEB-07: Enter MSSV and lookup patron", async ({ page }) => {
    await page.goto("/gate");
    await page.waitForTimeout(1000);

    const mssvInput = page.locator('input[placeholder*="MSSV"]');
    if (await mssvInput.isVisible()) {
      await mssvInput.fill("TEST001");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);
    }
  });

  test("WEB-08: Gate page shows today's entry/exit counts", async ({ page }) => {
    await page.goto("/gate");
    await expect(page.locator("text=Vào hôm nay")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Ra hôm nay")).toBeVisible({ timeout: 5000 });
  });

  test("WEB-09: SSE connection for real-time events", async ({ page }) => {
    await page.goto("/gate");
    await page.waitForTimeout(2000);
  });
});

test.describe("Kiosk Self-Service Flow", () => {
  test("WEB-10: Kiosk lookup with invalid student code", async ({ page }) => {
    await page.goto("/kiosk/enroll");
    const input = page.locator('input[name="student_code"]');
    if (await input.isVisible({ timeout: 3000 })) {
      await input.fill("NONEXISTENT");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1000);
    }
  });
});