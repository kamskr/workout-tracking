import { test, expect } from "@playwright/test";
import { classifyAuthBlocker } from "./helpers/authBlockers";

const ROUTES = [
  {
    path: "/workouts",
    route: "workouts",
    hook: '[data-route-content="workouts-history"]',
  },
  {
    path: "/exercises",
    route: "exercises",
    hook: '[data-route-content="exercise-library"]',
  },
  {
    path: "/analytics",
    route: "analytics",
    hook: '[data-route-section="analytics-overview"]',
  },
  {
    path: "/feed",
    route: "feed",
    hook: '[data-feed-discovery]',
  },
  {
    path: "/leaderboards",
    route: "leaderboards",
    hook: '[data-leaderboard-controls]',
  },
] as const;

test.describe("authenticated app shell", () => {
  for (const route of ROUTES) {
    test(`${route.path} renders the shared shell or reports an auth/env blocker`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "networkidle" });

      const blocker = await classifyAuthBlocker(page);
      test.info().annotations.push({
        type: "route",
        description: route.path,
      });

      if (blocker.blocked) {
        test.info().annotations.push({
          type: "auth-env-blocker",
          description: blocker.message,
        });
        test.skip(true, `Auth/env blocker before page render: ${blocker.message}`);
      }

      await expect(page.locator('[data-ui="app-shell"]')).toBeVisible();
      await expect(page.locator('[data-ui="app-shell-sidebar"]')).toBeVisible();
      await expect(page.locator('[data-ui="app-shell-content"]')).toBeVisible();
      await expect(page.locator(`[data-route="${route.route}"]`)).toBeVisible();
      await expect(page.locator(route.hook).first()).toBeVisible();
    });
  }
});
