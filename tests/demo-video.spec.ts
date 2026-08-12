import { test, type Page } from "@playwright/test";
import {
  pause,
  scrollToBottom,
  scrollToTop,
  hoverElements,
} from "./demo-helpers";

const EMAIL = process.env.DEMO_EMAIL || "admin@example.com";
const PASSWORD = process.env.DEMO_PASSWORD || "Password123!";

async function tryLogin(page: Page): Promise<boolean> {
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  await pause(2000);

  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await pause(500);
  await page.click('button[type="submit"]');

  // Wait for either navigation away from /sign-in, or an error alert
  try {
    await page.waitForFunction(
      () => !window.location.pathname.includes("sign-in"),
      { timeout: 12_000 }
    );
    await pause(2000);
    return true;
  } catch {
    // Login failed — stay on sign-in page for the video
    await pause(1000);
    return false;
  }
}

async function visitPage(
  page: Page,
  label: string,
  opts?: { scroll?: boolean; hover?: boolean }
) {
  const link = page.locator("nav a, aside a").filter({ hasText: label }).first();
  if (await link.isVisible()) {
    await link.click();
  } else {
    // Fallback: navigate directly by known routes
    const routes: Record<string, string> = {
      الشقق: "/apartments",
      المستأجرون: "/tenants",
      المدفوعات: "/payments",
      الفواتير: "/invoices",
      الصيانة: "/maintenance",
      المستندات: "/documents",
      الملخصات: "/summaries",
      "لوحة التحكم": "/",
    };
    const path = routes[label];
    if (path) await page.goto(path);
  }
  await page.waitForLoadState("networkidle");
  await pause(1500);

  if (opts?.hover !== false) {
    await hoverElements(page, "table tbody tr, [class*='card']", 3);
  }
  if (opts?.scroll !== false) {
    await scrollToBottom(page);
    await pause(800);
    await scrollToTop(page);
  }
}

test.describe("Building Management Dashboard — Demo Video", () => {
  test("full walkthrough", async ({ page }) => {
    // ── 1-2. Sign-in + Login ─────────────────────────────────────
    const loggedIn = await tryLogin(page);

    // ── 3. Dashboard ─────────────────────────────────────────────
    if (!loggedIn) {
      // If login failed, just show the sign-in page for a moment
      await pause(3000);
      return;
    }

    // KPI cards
    await hoverElements(
      page,
      '[class*="rounded-lg"][class*="border"], [class*="Card"]',
      4
    );
    await pause(1000);

    // Building grid
    await scrollToBottom(page);
    await pause(1000);
    await scrollToTop(page);
    await pause(1000);

    // ── 4. Apartments ────────────────────────────────────────────
    await visitPage(page, "الشقق");

    // ── 5. Tenants ───────────────────────────────────────────────
    await visitPage(page, "المستأجرون");

    // ── 6. Payments ──────────────────────────────────────────────
    await visitPage(page, "المدفوعات");

    // ── 7. Invoices ──────────────────────────────────────────────
    await visitPage(page, "الفواتير");

    // ── 8. Maintenance ───────────────────────────────────────────
    await visitPage(page, "الصيانة");

    // ── 9. Documents ─────────────────────────────────────────────
    await visitPage(page, "المستندات");

    // ── 10. Summaries ────────────────────────────────────────────
    await visitPage(page, "الملخصات");

    // ── 11. Return to Dashboard ──────────────────────────────────
    await visitPage(page, "لوحة التحكم");
    await pause(2000);
  });
});
