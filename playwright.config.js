// Tests de parcours (Playwright). Ils tournent sur GitHub Actions à chaque envoi
// (.github/workflows/e2e.yml) ; l'application elle-même n'utilise aucune dépendance.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  retries: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173/', bypassCSP: true, trace: 'retain-on-failure', locale: 'fr-BE', timezoneId: 'Europe/Brussels' },
  webServer: { command: 'python3 -m http.server 4173', url: 'http://localhost:4173/', reuseExistingServer: true },
  projects: [
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
  ],
});
