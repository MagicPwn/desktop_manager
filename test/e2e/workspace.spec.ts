import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
});

test("completes onboarding and manages workspace visibility", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "整理方式由你决定" })).toBeVisible();
  await page.getByRole("button", { name: /保持现状/ }).click();
  await expect(page.locator(".container-card")).toHaveCount(4);

  await page.getByTitle("新建普通容器").click();
  await expect(page.locator(".container-card")).toHaveCount(5);

  await page.getByTitle("隐藏所有容器").click();
  await expect(page.getByText("容器已隐藏", { exact: true })).toBeVisible();
  await page.getByTitle("显示所有容器").click();
  await expect(page.locator(".container-card")).toHaveCount(5);
});

test("opens settings and changes accessibility options", async ({ page }) => {
  await page.getByRole("button", { name: /保持现状/ }).click();
  await page.getByTitle("设置").click();
  await expect(page.getByRole("heading", { name: "设置" })).toBeVisible();
  await page.getByText("高对比度", { exact: true }).locator("..").getByRole("checkbox").check();
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
});
