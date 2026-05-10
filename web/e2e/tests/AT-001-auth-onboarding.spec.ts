import { expect, test } from '@playwright/test';
import { AuthApi } from '../api/AuthApi';
import { AdminModerationPage } from '../pages/AdminModerationPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { RegisterPage } from '../pages/RegisterPage';

test.describe('AT-001: Authentication & Onboarding', () => {
  test.use({ actionTimeout: 5000 });

  // Use a unique email per test run so it can run repeatedly on the dev database
  const uniqueId = Date.now();
  const TEST_EMAIL = `alice.newuser.${uniqueId}@university.edu`;
  const TEST_PASSWORD = 'SecurePass123!';
  const TEST_USERNAME = `alice_newuser_${uniqueId}`;

  test('New User Registers, Completes Profile Onboarding, and Accesses the Platform', async ({ page, request }) => {
    const landingPage = new LandingPage(page);
    const registerPage = new RegisterPage(page);
    const onboardingPage = new OnboardingPage(page);
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const authApi = new AuthApi(request).withPage(page);

    // ==========================================
    // Part A — Registration (Guest → Authenticated User)
    // ==========================================
    await test.step('Part A: Registration Flow', async () => {
      // Step 1: Open landing page
      await landingPage.goto();
      await landingPage.expectUnauthorizedHeader();

      // Step 2: Click Register
      await landingPage.clickRegister();
      await registerPage.expectLoaded();

      // Step 3: Empty fields submission
      await registerPage.submit();
      // Because of how the Zod schema and form state are structured, 
      // empty submits actually trigger the secondary validation messages for email and password
      await registerPage.expectInlineError(/Please enter a valid email address/i);
      await registerPage.expectInlineError(/must be at least 8 characters/i);
      await registerPage.expectInlineError(/Please confirm your password/i);

      // Step 4: Short passwords
      await registerPage.fillEmail(TEST_EMAIL);
      await registerPage.fillPassword('short');
      await registerPage.fillConfirmPassword('short');
      await registerPage.checkTerms();
      await registerPage.submit();
      await registerPage.expectInlineError(/must be at least 8 characters/i);

      // Step 5: Mismatched passwords
      await registerPage.fillPassword(TEST_PASSWORD);
      await registerPage.fillConfirmPassword('DifferentPass456!');
      await registerPage.submit();
      await registerPage.expectInlineError(/Passwords do not match/i);

      // Step 6: Valid registration
      await registerPage.fillConfirmPassword(TEST_PASSWORD);
      await registerPage.submit();
      // Should redirect to onboarding
      await onboardingPage.expectLoaded();

      // Step 7: Duplicate registration attempt (in a new tab/context, but here we just navigate back to test the API response)
      const newContext = await page.context().browser()!.newContext();
      const newPage = await newContext.newPage();
      const duplicateRegister = new RegisterPage(newPage);
      await duplicateRegister.goto();
      await duplicateRegister.fillEmail(TEST_EMAIL);
      await duplicateRegister.fillPassword(TEST_PASSWORD);
      await duplicateRegister.fillConfirmPassword(TEST_PASSWORD);
      await duplicateRegister.checkTerms();
      await duplicateRegister.submit();
      await duplicateRegister.expectInlineError(/A user with this email already exists/i);
      await newPage.close();
    });

    // ==========================================
    // Part B — Onboarding Wizard (Profile Setup)
    // ==========================================
    await test.step('Part B: Onboarding Flow', async () => {
      // Step 8: Verify loaded
      await onboardingPage.expectLoaded();
      await onboardingPage.expectQuestion(/What's your first name\?/i);

      // Step 9: Empty first name
      await onboardingPage.clickContinue();
      await onboardingPage.expectInlineError(/First name must be at least 2 characters/i);

      // Step 10: Valid first name
      await onboardingPage.fillInput('Alice');
      await onboardingPage.clickContinue();
      await onboardingPage.expectQuestion(/What's your last name\?/i);

      // Step 11: Valid last name
      await onboardingPage.fillInput('Newuser');
      await onboardingPage.clickContinue();
      await onboardingPage.expectQuestion(/How will you use Neighborship/i);

      // Step 12: Empty role
      await onboardingPage.clickContinue();
      await onboardingPage.expectInlineError(/Please select an option/i);

      // Step 13 & 14: Select Mentee
      await onboardingPage.selectRole('mentee');
      await onboardingPage.clickContinue();
      await onboardingPage.expectQuestion(/Tell us a bit about yourself/i);

      // Step 15: Short bio
      await onboardingPage.fillTextarea('Short');
      await onboardingPage.clickContinue();
      await onboardingPage.expectInlineError(/Bio must be at least 10 characters/i);

      // Step 16: Valid bio
      await onboardingPage.fillTextarea('I am a computer science student looking for mentorship in Python and algorithms.');
      await onboardingPage.clickContinue();
      await onboardingPage.expectQuestion(/What topics do you want to learn\?/i);

      // Step 17: Empty skills
      await onboardingPage.clickContinue();
      await onboardingPage.expectInlineError(/Please select at least one topic/i);

      // Step 18: Select skill (assuming the UI displays 'Python' as an option)
      await onboardingPage.selectSkill('React');
      await onboardingPage.clickContinue();
      await onboardingPage.expectQuestion(/Choose a username/i);

      // Step 19: Short username
      await onboardingPage.fillInput('a');
      await onboardingPage.clickFinish();
      await onboardingPage.expectInlineError(/Username must be at least 3 characters/i);

      // Step 20: Invalid username
      await onboardingPage.fillInput('alice@invalid!');
      await onboardingPage.clickFinish();
      await onboardingPage.expectInlineError(/Username can only contain letters, numbers, underscores, and hyphens/i);

      // Step 21 & 22: Valid username and finish
      await onboardingPage.fillInput(TEST_USERNAME);
      await onboardingPage.clickFinish();
      await dashboardPage.expectLoaded();
    });

    // ==========================================
    // Part C — Login & Session Management
    // ==========================================
    await test.step('Part C: Login Flow', async () => {
      // Step 23: Logout
      await dashboardPage.logout();
      await loginPage.expectLoaded();

      // Step 24: Direct navigate to dashboard
      await dashboardPage.page.goto('/dashboard');
      await loginPage.expectLoaded(); // Expect redirect to login

      // Step 26: Wrong email
      await loginPage.fillEmail(`wrong${uniqueId}@university.edu`);
      await loginPage.fillPassword(TEST_PASSWORD);
      await loginPage.submit();
      await loginPage.expectInlineError(/Incorrect email or password. Please try again./i);

      // Step 27: Wrong password
      await loginPage.fillEmail(TEST_EMAIL);
      await loginPage.fillPassword('WrongPassword!');
      await loginPage.submit();
      await loginPage.expectInlineError(/Incorrect email or password. Please try again./i);

      // Step 28: Valid login
      await loginPage.fillPassword(TEST_PASSWORD);
      await loginPage.submit();
      await dashboardPage.expectLoaded();

      // Step 29: API Check
      const response = await authApi.getMe();
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.email).toBe(TEST_EMAIL);
      expect(data.username).toBe(TEST_USERNAME);
      expect(data.app_usage_mode).toBe('MENTEE');
    });

    // ==========================================
    // Part D — Role Immutability
    // ==========================================
    await test.step('Part D: Role Immutability', async () => {
      // Step 30: Change role to MENTOR
      const responseMentor = await authApi.updateRole('MENTOR');
      expect(responseMentor.status()).toBe(400);
      
      // Step 31: Change role to MENTEE (idempotent)
      const responseMentee = await authApi.updateRole('MENTEE');
      expect(responseMentee.status()).toBe(200);
    });

    // ==========================================
    // Part E — Admin Management & User Moderation
    // ==========================================
    await test.step('Part E: Admin Moderation', async () => {
      const adminPage = new AdminModerationPage(page);

      // --- Setup: Report another user so we have something in the reports tab ---
      // Dynamically find a user to report instead of guessing usernames
      const accessToken = await page.evaluate(() => window.localStorage.getItem('access_token'));
      const profilesRes = await request.get('http://localhost:8000/api/profiles/', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      expect(profilesRes.ok()).toBe(true);
      const profilesData = await profilesRes.json();
      const targetUser = profilesData.results?.find(u => u.username !== TEST_USERNAME);
      const targetUsername = targetUser?.username || 'mentor_demo'; // fallback just in case
      
      const reportRes = await request.post('http://localhost:8000/api/auth/reports/', {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          reported_username: targetUsername,
          reason: 'SPAM',
          description: 'Test report for E2E'
        }
      });
      if (!reportRes.ok()) {
        const errorBody = await reportRes.json().catch(() => ({}));
        console.error('Report Creation Failed:', errorBody);
      }
      expect(reportRes.ok()).toBe(true);

      // Step 32: Admin login & navigate
      await dashboardPage.logout();
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@test.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
      
      await loginPage.fillEmail(adminEmail);
      await loginPage.fillPassword(adminPassword);
      await loginPage.submit();
      
      // Wait for navigation to complete (e.g. to dashboard) before going to admin page
      await page.waitForURL(/.*dashboard|.*admin-moderation/);
      
      await adminPage.goto();
      await adminPage.expectLoaded();

      // Step 33: Ban Alice via UI
      await adminPage.searchUser(TEST_USERNAME);
      await adminPage.banUser(TEST_USERNAME);
      await adminPage.expectToast(new RegExp(`${TEST_USERNAME} has been banned`, 'i'));
      await adminPage.expectUserBanned(TEST_USERNAME);

      // Step 34: UI Login should be blocked for banned user
      await dashboardPage.logout();
      await loginPage.fillEmail(TEST_EMAIL);
      await loginPage.fillPassword(TEST_PASSWORD);
      await loginPage.submit();
      await loginPage.expectInlineError('This account is banned.');

      // Step 35: Resolve Report
      await loginPage.fillEmail(process.env.ADMIN_EMAIL || 'admin@test.com');
      await loginPage.fillPassword(process.env.ADMIN_PASSWORD || 'AdminPass123!');
      await loginPage.submit();
      
      // Wait for navigation
      await page.waitForURL(/.*dashboard|.*admin-moderation/);
      
      await adminPage.goto();
      await adminPage.switchToReports();
      await adminPage.reviewReport(targetUsername);
      await adminPage.resolveReport('Resolved in E2E test');
      await adminPage.expectToast(/Report resolved/i);
    });

  });
});
