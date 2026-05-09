import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHtmlReport } from 'axe-html-reporter';
import fs from 'fs';
import path from 'path';

test.setTimeout(60000);

const ROUTES = [
  '/', '/login', '/register', '/about', '/dashboard', 
  '/discover', '/schedule', '/messages', '/communities', 
  '/connections', '/admin-moderation', '/forgot-password',
  '/gettingToKnowYou'
];

test.describe('Site-wide Accessibility Audit', () => {

  for (const route of ROUTES) {
    test(`Audit ${route}`, async ({ page }) => {
      const routeName = route.replace(/\//g, '-') || 'home';
      
      await page.goto(`http://localhost:3000${route}`, { waitUntil: 'commit' });
      await page.waitForTimeout(5000);

      let results;
      try {
        results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'section508', 'best-practice'])
          .analyze();
      } catch (e) {
        await page.waitForTimeout(3000);
        results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
            .analyze();
      }

      const htmlDir = 'accessibility-reports/html';
      if (!fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true });

      createHtmlReport({
        results: results,
        options: {
          projectKey: `Page Audit`,
          outputDir: htmlDir,
          reportFileName: `report-${routeName}.html`
        }
      });
    });
  }
});
