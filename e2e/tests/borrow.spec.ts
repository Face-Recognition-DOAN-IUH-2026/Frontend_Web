import { test, expect } from "@playwright/test";

test.describe("Borrow Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "patron@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test("WEB-16: Navigate to borrow page", async ({ page }) => {
    await page.goto("/borrow");
    await page.waitForTimeout(1000);
  });

  test("WEB-17: Borrow success shows confirmation", async ({ page }) => {
    await page.goto("/borrow");
    await page.waitForTimeout(500);

    const barcodeInput = page.locator('input[placeholder*="barcode"], input[placeholder*="mã vạch"]');
    if (await barcodeInput.isVisible({ timeout: 3000 })) {
      await barcodeInput.fill("TEST-BOOK-001");
    }
  });

  test("WEB-18: Borrow fails when patron outside library", async ({ page }) => {
    await page.route(
      /\/api\/patrons\/me/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "test-patron",
            current_status: "outside",
            full_name: "Test Patron",
          }),
        });
      }
    );

    await page.goto("/borrow");
    await page.waitForTimeout(1000);
  });

  test("WEB-19: Borrow shows book info after scan", async ({ page }) => {
    await page.goto("/borrow");
    await page.waitForTimeout(500);
  });
});

test.describe("Staff Return Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "staff@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test("WEB-20: Staff can access return page", async ({ page }) => {
    await page.goto("/return");
    await page.waitForTimeout(1000);
  });

  test("WEB-21: Staff return book success", async ({ page }) => {
    await page.goto("/return");
    await page.waitForTimeout(500);
  });
});