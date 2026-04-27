import { expect, test } from "@playwright/test";

test.describe("Docs Search", () => {
  test("search button is visible", async ({ page }) => {
    await page.goto("/guide/getting-started");
    const searchButton = page.locator(
      ".VPNavBarSearch button, .DocSearch-Button, button[aria-label*='Search'], .VPNavBarSearchButton button",
    );
    await expect(searchButton.first()).toBeVisible();
  });

  test("clicking search opens search dialog", async ({ page }) => {
    await page.goto("/guide/getting-started");
    const searchButton = page.locator(
      ".VPNavBarSearch button, .DocSearch-Button, button[aria-label*='Search'], .VPNavBarSearchButton button",
    );
    await searchButton.first().click();
    await expect(
      page.locator(".VPLocalSearchBox, .DocSearch-Modal, [role='dialog']").first(),
    ).toBeVisible();
  });

  test("typing in search shows results", async ({ page }) => {
    await page.goto("/guide/getting-started");
    const searchButton = page.locator(
      ".VPNavBarSearch button, .DocSearch-Button, button[aria-label*='Search'], .VPNavBarSearchButton button",
    );
    await searchButton.first().click();
    const searchInput = page.locator(
      ".VPLocalSearchBox input, .DocSearch-Input, [role='dialog'] input",
    ).first();
    await searchInput.fill("docker");
    const results = page.locator(
      ".VPLocalSearchBox .result, .DocSearch-Hits, [role='dialog'] .result, [role='listbox'] [role='option']",
    );
    await expect(results.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Theme Toggle", () => {
  test("theme toggle button is visible", async ({ page }) => {
    await page.goto("/guide/getting-started");
    const toggle = page.locator(
      ".VPSwitchAppearance, button[aria-label*='Switch'], .VPSwitch",
    );
    await expect(toggle.first()).toBeVisible();
  });

  test("clicking theme toggle changes appearance", async ({ page }) => {
    await page.goto("/guide/getting-started");
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");

    const toggle = page.locator(
      ".VPSwitchAppearance, button[aria-label*='Switch'], .VPSwitch",
    ).first();
    await toggle.click();
    await page.waitForTimeout(300);

    const newClass = await html.getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });
});

test.describe("GitHub Stars Component", () => {
  test("GitHub star button is visible in navbar", async ({ page }) => {
    await page.goto("/");
    const githubBtn = page.locator(".github-btn, .github-btn-wrapper").first();
    await expect(githubBtn).toBeVisible();
  });

  test("GitHub star button links to correct repo", async ({ page }) => {
    await page.goto("/");
    const starLink = page.locator('a[title="Star on GitHub"]').first();
    await expect(starLink).toHaveAttribute(
      "href",
      "https://github.com/snapotter-hq/snapotter",
    );
    await expect(starLink).toHaveAttribute("target", "_blank");
  });
});
