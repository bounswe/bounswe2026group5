import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  console.log('Authenticating as Admin...');
  await page.goto('http://localhost:3000/login');
  await page.fill('#email', 'admin@test.com');
  await page.fill('#password', 'AdminPass123!');
  await page.click('button[form="login-form"]');

  // Wait for the dashboard to confirm login
  await page.waitForURL('**/dashboard', { timeout: 20000 });
  
  // End of authentication steps.
  await page.context().storageState({ path: authFile });
  console.log('Admin authentication state saved.');
});
