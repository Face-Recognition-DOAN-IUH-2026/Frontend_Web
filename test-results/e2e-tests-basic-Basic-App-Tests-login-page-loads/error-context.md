# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\tests\basic.spec.ts >> Basic App Tests >> login page loads
- Location: e2e\tests\basic.spec.ts:4:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/login", waiting until "load"

```

# Test source

```ts
  1 | import { test, expect } from "@playwright/test";
  2 | 
  3 | test.describe("Basic App Tests", () => {
  4 |   test("login page loads", async ({ page }) => {
> 5 |     await page.goto("/login");
    |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6 |     await expect(page.locator("body")).toBeVisible();
  7 |   });
  8 | });
```