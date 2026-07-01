import { test, expect } from '@playwright/test';


test.describe.configure({ mode: 'serial' });

test.describe('P0 Flows', () => {

  test('Guest search and job detail', async ({ page }) => {
    await page.goto('/jobs');
    
    // Strict wait for body
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    const searchInput = page.getByPlaceholder(/search|tìm/i).first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('Software');
    
    const searchPromise = page.waitForResponse(response => response.url().includes('/api/jobs') && response.status() === 200);
    await searchInput.press('Enter');
    await searchPromise;

    // Strict locator for job card
    const firstJobCard = page.locator('.job-card:not(.skeleton-card)').first();
    await expect(firstJobCard).toBeVisible({ timeout: 15000 });
    
    // Navigate to detail
    await firstJobCard.click();
    await page.waitForURL(/\/jobs\/.+/);
    
    const applyBtn = page.locator('.jd-detail-page button').filter({ hasText: /login to apply|apply|ứng tuyển/i }).first();
    await expect(applyBtn).toBeVisible({ timeout: 10000 });
  });

  test('Candidate login, apply and withdraw', async ({ page }) => {
    page.on('response', response => {
      console.log(`[NETWORK] ${response.status()} ${response.url()}`);
    });
    await page.goto('/login');
    
    const usernameInput = page.getByPlaceholder('ca / re / ad');
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await usernameInput.fill('ca');
    await page.locator('input[type="password"]').fill('1');
    const loginPromise = page.waitForResponse(response => response.url().includes('/api/auth/login') && response.status() === 200);
    await page.locator('button[type="submit"]').click();
    await loginPromise;
    
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    
    // Find a job to apply
    await page.goto('/candidate/jobs');
    
    const firstJobCard = page.locator('.job-card:not(.skeleton-card)').first();
    await expect(firstJobCard).toBeVisible({ timeout: 15000 });
    const jobTitle = await firstJobCard.locator('h3').textContent();
    if (!jobTitle) throw new Error("Job title not found");
    
    await firstJobCard.click();
    await page.waitForURL(/\/candidate\/jobs\/.+/);

    const applyBtn = page.locator('.jd-detail-page button.primary-action').filter({ hasText: /apply|ứng tuyển/i }).first();
    await expect(applyBtn).toBeVisible({ timeout: 10000 });
    
    const applyPromise = page.waitForResponse(response => response.url().includes('/api/applications') && response.status() === 201);
    await applyBtn.click();
    await applyPromise;
    
    await expect(page).toHaveURL(/\/candidate\/applications/, { timeout: 15000 });
    
    // Withdraw the specific application
    // Locate the application row or card that contains the jobTitle
    const applicationItem = page.locator('.application-card, tr').filter({ hasText: jobTitle }).first();
    await expect(applicationItem).toBeVisible({ timeout: 10000 });
    
    const withdrawBtn = applicationItem.getByRole('button', { name: /withdraw|rút|bỏ qua/i });
    await expect(withdrawBtn).toBeVisible({ timeout: 10000 });
    
    const withdrawPromise = page.waitForResponse(response => response.request().method() === 'DELETE' && response.url().includes('/api/applications/') && response.status() === 200);
    await withdrawBtn.click();
    await withdrawPromise;
    
    await expect(applicationItem.locator('text=/withdrawn|đã rút|not_interested/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('Recruiter create JD and verify', async ({ page }) => {
    await page.goto('/login');
    
    const usernameInput = page.getByPlaceholder('ca / re / ad');
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await usernameInput.fill('re');
    await page.locator('input[type="password"]').fill('1');
    const loginPromise = page.waitForResponse(response => response.url().includes('/api/auth/login') && response.status() === 200);
    await page.locator('button[type="submit"]').click();
    await loginPromise;
    
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    
    await page.goto('/recruiter/jobs?create=1');
    await expect(page.locator('text=Demo Fullstack Engineer').first()).toBeVisible({ timeout: 10000 });
    
    const modal = page.locator('.create-job-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });
    
    const uniqueTitle = "Test Job " + Date.now();
    await modal.locator('input[name="title"]').first().fill(uniqueTitle);
    await modal.locator('input[name="company"]').first().fill('Test Company');
    await modal.locator('input[name="requiredSkills"]').first().fill('Java, Playwright');
    await modal.locator('textarea[name="originalText"]').first().fill('We are looking for a software engineer to join our team.');
    await modal.locator('input[name="salaryMin"]').first().fill('15000000');
    await modal.locator('input[name="salaryMax"]').first().fill('25000000');
    
    const createPromise = page.waitForResponse(response => response.url().includes('/api/recruiter/jobs') && response.status() === 200);
    await modal.locator('button.primary-action').first().click();
    await createPromise;
    
    await expect(page.locator("text=" + uniqueTitle).first()).toBeVisible({ timeout: 10000 });
  });

  test('Admin suspend and activate user', async ({ page }) => {
    await page.goto('/login');
    
    const usernameInput = page.getByPlaceholder('ca / re / ad');
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await usernameInput.fill('ad');
    await page.locator('input[type="password"]').fill('1');
    const loginPromise = page.waitForResponse(response => response.url().includes('/api/auth/login') && response.status() === 200);
    await page.locator('button[type="submit"]').click();
    await loginPromise;
    
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    
    await page.goto('/admin/users');
    
    const userRow = page.locator('tr, [data-testid="user-row"]').filter({ hasText: 'candidate1@careerfit.dev' }).first();
    await expect(userRow).toBeVisible({ timeout: 10000 });
    
    const suspendBtn = userRow.locator('button.destructive').first();
    await expect(suspendBtn).toBeVisible({ timeout: 10000 });
    
    const suspendPromise = page.waitForResponse(response => response.url().includes('/api/admin/users/') && response.url().includes('/suspend') && response.status() === 200);
    await suspendBtn.click();
    await suspendPromise;
    
    const activeBtn = userRow.locator('button.primary-action').first();
    await expect(activeBtn).toBeVisible({ timeout: 10000 });
    
    const activatePromise = page.waitForResponse(response => response.url().includes('/api/admin/users/') && response.url().includes('/activate') && response.status() === 200);
    await activeBtn.click();
    await activatePromise;
    
    await expect(suspendBtn).toBeVisible({ timeout: 10000 });
  });
});
