import type { Page } from "@playwright/test";

const AUTH_BLOCKER_PATTERNS = [
  /clerk/i,
  /publishable key/i,
  /missing required environment variable/i,
  /authentication/i,
  /invalid .*key/i,
  /build error/i,
  /you cannot have two parallel pages that resolve to the same path/i,
  /latest available version is detected/i,
] as const;

export async function classifyAuthBlocker(page: Page) {
  const pageText = await page.locator("body").innerText().catch(() => "");
  const content = pageText.trim();
  if (AUTH_BLOCKER_PATTERNS.some((pattern) => pattern.test(content))) {
    return { blocked: true as const, message: content.slice(0, 500) };
  }

  const html = await page.content().catch(() => "");
  if (AUTH_BLOCKER_PATTERNS.some((pattern) => pattern.test(html))) {
    return { blocked: true as const, message: html.slice(0, 500) };
  }

  return { blocked: false as const, message: "" };
}
