// Playwright configuration. See tests/README.md for a plain-English walkthrough
// of what this file does and why — this comment only covers the choices that
// are specific to this project.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './tests',

  // The game keeps state in module-scoped variables and localStorage, and a
  // few things (the boot screen, audio unlock) only happen once per page
  // load. Running specs in parallel is fine because each test gets its own
  // fresh browser context (and therefore its own localStorage) — but keep
  // fullyParallel off if you ever add tests that share a server-side
  // resource, which this suite currently does not.
  fullyParallel: true,

  // Fail the build if someone accidentally leaves a `.only` in a commit.
  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 1 : 0,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Boots the static file server in tests/server.js before the suite starts,
  // and reuses it locally across repeated `npx playwright test` runs instead
  // of relaunching every time. CI always gets a clean instance.
  webServer: {
    command: `node tests/server.js`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT) },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
