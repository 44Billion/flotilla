import {defineConfig, devices} from "@playwright/test"

// E2E tests live in ./e2e and run against the dev server (port 1847 from vite.config.ts).
// Run with `pnpm test:e2e` (after `pnpm exec playwright install` to fetch browsers).
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:1847",
    trace: "on-first-retry",
  },
  // Boots the SvelteKit dev server before the suite and reuses one if already running locally.
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:1847",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {name: "chromium", use: {...devices["Desktop Chrome"]}},
    {name: "firefox", use: {...devices["Desktop Firefox"]}},
    {name: "webkit", use: {...devices["Desktop Safari"]}},
  ],
})
