import { type Page, type Locator } from "@playwright/test";

export const DEMO_EMAIL = process.env.DEMO_EMAIL || "admin@example.com";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Password123!";

export async function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function login(page: Page, email = DEMO_EMAIL, password = DEMO_PASSWORD) {
  await page.goto("/sign-in");
  await page.waitForSelector("#email", { state: "visible" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 15_000 });
  await pause(1500);
}

export async function waitForDashboard(page: Page) {
  await page.waitForLoadState("networkidle");
  await pause(2000);
}

export async function navigateTo(page: Page, label: string) {
  const link = page.locator(`nav a, aside a`).filter({ hasText: label }).first();
  if (await link.isVisible()) {
    await link.click();
    await page.waitForLoadState("networkidle");
    await pause(1500);
  }
}

export async function scrollToBottom(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  await pause(800);
}

export async function scrollToTop(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pause(500);
}

export async function hoverElements(page: Page, selector: string, limit = 3) {
  const elements = page.locator(selector);
  const count = await elements.count();
  for (let i = 0; i < Math.min(count, limit); i++) {
    await elements.nth(i).hover();
    await pause(400);
  }
}
