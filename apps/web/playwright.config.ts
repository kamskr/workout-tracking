import { defineConfig, devices } from "@playwright/test";

const PORT = 3001;
const hasExternalBaseUrl = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  grepInvert: /@manual-only/,
  ...(hasExternalBaseUrl
    ? {}
    : {
        webServer: {
          command: `pnpm exec next dev --port ${PORT}`,
          url: baseURL,
          reuseExistingServer: true,
          cwd: __dirname,
          stdout: "pipe",
          stderr: "pipe",
          timeout: 120_000,
        },
      }),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
