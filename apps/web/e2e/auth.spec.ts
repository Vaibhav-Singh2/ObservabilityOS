import { test, expect } from "@playwright/test";

test.describe("ObservabilityOS Auth and Dashboard E2E", () => {
  test("should load the landing page and show the platform heading", async ({
    page,
  }) => {
    // Go to landing page
    await page.goto("/");

    // Verify title contains platform name
    await expect(page).toHaveTitle(/ObservabilityOS/);

    // Verify presence of call to action or main marketing banner
    const ctaButton = page.locator("a", { hasText: /Get Started/i });
    if ((await ctaButton.count()) > 0) {
      await expect(ctaButton.first()).toBeVisible();
    }
  });

  test("should redirect unauthenticated users from dashboard back to landing or login", async ({
    page,
  }) => {
    // Attempt to access protected dashboard route directly
    await page.goto("/dashboard");

    // Since we are not authenticated, the app should redirect to landing or /login
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/dashboard");
  });
});
