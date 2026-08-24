import { test, expect } from '@playwright/test';

/**
 * Console hygiene guard: no page may emit React script-tag warnings,
 * hydration errors, or uncaught exceptions. This exists because the
 * "Scripts inside React components" warning regressed three times via
 * different code paths (next-themes, inline head script).
 */

const FORBIDDEN = [
  /script tag while rendering/i,
  /Scripts inside React components/i,
  /Hydration failed|hydrat/i,
  /Minified React error #418|#423|#425/,
];

const PAGES = ['/signin', '/chat'];

test.describe('console cleanliness', () => {
  for (const path of PAGES) {
    test(`no console errors on ${path}`, async ({ page }) => {
      const bad: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (FORBIDDEN.some((re) => re.test(text))) bad.push(text);
      });
      page.on('pageerror', (err) => bad.push(`pageerror: ${err.message}`));

      await page.goto(path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      expect(bad, `forbidden console output on ${path}:\n${bad.join('\n---\n')}`).toEqual([]);
    });
  }
});
