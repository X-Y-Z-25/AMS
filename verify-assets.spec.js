const { test, expect } = require("@playwright/test");

test("assets page loads", async ({ page }) => {
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.getByText("Assets").click();
  await expect(
    page.getByText("Deployed Assets & Assigned Laptops"),
  ).toBeVisible();
  await page.screenshot({ path: "assets-page.png", fullPage: true });
});
