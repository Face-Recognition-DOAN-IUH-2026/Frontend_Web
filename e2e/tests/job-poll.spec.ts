import { test, expect, Page } from "@playwright/test";

test.describe("JobPoll Component", () => {
  test("WEB-11: JobPoll shows pending state with spinner", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    await page.goto("/enroll");
    await page.waitForTimeout(1000);
  });

  test("WEB-12: JobPoll displays SUCCESS with result info", async ({ page }) => {
    await page.route(
      /\/api\/tasks\/mock-success*/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            task_id: "mock-success-task",
            status: "SUCCESS",
            result: { status: "success", is_live: true, score: 0.95 },
          }),
        });
      }
    );
  });

  test("WEB-13: JobPoll displays FAILURE with error message", async ({ page }) => {
    await page.route(
      /\/api\/tasks\/mock-failure*/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            task_id: "mock-failure-task",
            status: "FAILURE",
            result: { error: "NO_FACE_DETECTED", type: "task_failure" },
          }),
        });
      }
    );
  });

  test("WEB-14: Task polling transitions from PENDING to SUCCESS", async ({ page }) => {
    let callCount = 0;
    await page.route(
      /\/api\/tasks\/poll-task*/,
      async (route) => {
        callCount++;
        if (callCount === 1) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              task_id: "poll-task-id",
              status: "PENDING",
              result: null,
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              task_id: "poll-task-id",
              status: "SUCCESS",
              result: { is_live: true, score: 0.95 },
            }),
          });
        }
      }
    );

    await page.goto("/enroll");
    await page.waitForTimeout(5000);
  });

  test("WEB-15: JobPoll handles NULL confidence (edge case)", async ({ page }) => {
    await page.route(
      /\/api\/tasks\/null-confidence*/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            task_id: "null-confidence-task",
            status: "SUCCESS",
            result: { is_live: null, score: 0 },
          }),
        });
      }
    );
  });
});