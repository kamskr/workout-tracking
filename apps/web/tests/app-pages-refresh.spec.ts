import { test, expect } from "@playwright/test";
import { classifyAuthBlocker } from "./helpers/authBlockers";

type RefreshRoute = {
  path: string;
  route: string;
  sections: string[];
  hooks?: string[];
};

const ROUTES: RefreshRoute[] = [
  {
    path: "/templates",
    route: "templates",
    sections: ["templates-overview", "templates-list"],
  },
  {
    path: "/profile/setup",
    route: "profile-setup",
    sections: ["profile-setup-overview", "profile-setup-form"],
  },
  {
    path: "/profile/test-user",
    route: "profile-view",
    sections: ["profile-overview", "profile-badges", "profile-stats"],
  },
  {
    path: "/workouts/active",
    route: "workouts-active",
    sections: ["workout-active-overview", "workout-active-flow"],
  },
  {
    path: "/challenges",
    route: "challenges",
    sections: ["challenges-overview", "challenges-controls", "challenges-list-card"],
    hooks: ['[data-challenge-page]', '[data-challenge-list]'],
  },
  {
    path: "/workouts/session/test-session",
    route: "session-workout",
    sections: ["session-overview"],
    hooks: ['[data-session-page]'],
  },
];

test.describe("authenticated page refresh surfaces", () => {
  for (const route of ROUTES) {
    test(`${route.path} refresh surfaces expose durable selectors or report an auth/env blocker`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "networkidle" });

      const blocker = await classifyAuthBlocker(page);
      if (blocker.blocked) {
        test.info().annotations.push({
          type: "auth-env-blocker",
          description: blocker.message,
        });
        test.skip(true, `Auth/env blocker before page render: ${blocker.message}`);
      }

      await expect(page.locator('[data-ui="app-shell"]')).toBeVisible();
      await expect(page.locator(`[data-route="${route.route}"]`)).toBeVisible();

      for (const section of route.sections) {
        await expect(page.locator(`[data-route-section="${section}"]`).first()).toBeVisible();
      }

      for (const hook of route.hooks ?? []) {
        await expect(page.locator(hook).first()).toBeVisible();
      }
    });
  }

  test("/workouts/session/test-session classifies auth/env blocker HTML before session selector assertions", async ({ page }) => {
    await page.goto("/workouts/session/test-session", { waitUntil: "networkidle" });
    const blocker = await classifyAuthBlocker(page);

    if (blocker.blocked) {
      test.info().annotations.push({
        type: "auth-env-blocker",
        description: blocker.message,
      });
      test.skip(true, `Auth/env blocker before page render: ${blocker.message}`);
    }

    await expect(page.locator('[data-route="session-workout"]')).toBeVisible();
  });
});
