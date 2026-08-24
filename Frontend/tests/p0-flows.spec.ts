import { test, expect } from '@playwright/test';


test.describe.configure({ mode: 'serial' });

test.describe('P0 Flows', () => {

  async function login(page: import('@playwright/test').Page, username: 'ca' | 're' | 'ad') {
    await page.goto('/login');
    let status = 0;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.getByPlaceholder('ca / re / ad').fill(username);
      await page.locator('input[type="password"]').fill('12345678');
      const loginPromise = page.waitForResponse(response => response.url().includes('/api/auth/login'));
      await page.locator('button[type="submit"]').click();
      status = (await loginPromise).status();
      if (status === 200) break;
      await page.waitForTimeout(500);
    }
    expect(status).toBe(200);
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
  }

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
    
    const applyBtn = page.locator('.jd-detail-page button').filter({ hasText: /login to apply|apply|ứng tuyển|open source|mở nguồn/i }).first();
    await expect(applyBtn).toBeVisible({ timeout: 10000 });
  });

  test('Login keeps guest access and Guest opens a login prompt for protected navigation', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('button', { name: /gửi magic-link|send magic-link/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /tiếp tục với tư cách khách|continue as guest/i })).toBeVisible();
    await page.getByRole('button', { name: /tiếp tục với tư cách khách|continue as guest/i }).click();
    await expect(page).toHaveURL(/\/$/);

    const header = page.locator('.site-header');
    await expect(header.getByRole('button', { name: /thông báo|notifications/i })).toHaveCount(0);
    await header.locator('.top-nav').getByRole('button', { name: /tải cv|upload cv/i }).click();
    await expect(page.getByRole('dialog', { name: /đăng nhập để sử dụng tính năng này|sign in to use this feature/i })).toBeVisible();
  });

  test('Candidate login and jobs workspace render', async ({ page }) => {
    await page.route('**/api/candidates/me/job-catalog?**', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          jobs: [{
            id: 'candidate-catalog-job', title: 'Candidate Catalog Engineer', company: 'CareerFit Labs',
            location: 'Remote Vietnam', remoteType: 'REMOTE', seniorityLevel: 'SENIOR', language: 'en',
            requiredSkills: ['React'], niceToHaveSkills: [], originalText: 'Build candidate catalog experiences.',
            isPotential: false, isSaved: false, applicationStatus: null, feedbackStatus: null, matchReasons: [],
            createdAt: '2026-08-01T00:00:00Z', applicationMode: 'INTERNAL', isUrgent: false,
          }], total: 1, page: 0, size: 20, totalPages: 1,
        },
      }),
    }));
    page.on('response', response => {
      console.log(`[NETWORK] ${response.status()} ${response.url()}`);
    });
    await page.goto('/login');
    
    const usernameInput = page.getByPlaceholder('ca / re / ad');
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await usernameInput.fill('ca');
    await page.locator('input[type="password"]').fill('12345678');
    const loginPromise = page.waitForResponse(response => response.url().includes('/api/auth/login') && response.status() === 200);
    await page.locator('button[type="submit"]').click();
    await loginPromise;
    
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    
    await page.goto('/candidate/jobs');
    const jobCards = page.locator('.job-card:not(.skeleton-card)');
    await expect(jobCards.first()).toBeVisible({ timeout: 15000 });
  });


  test('Candidate settings persist after reload', async ({ page }) => {
    await login(page, 'ca');
    await page.goto('/candidate/settings');

    const threshold = page.getByLabel(/ngưỡng cảnh báo|alert threshold/i);
    await expect(threshold).toBeVisible({ timeout: 10000 });
    const originalValue = await threshold.inputValue();
    const changedValue = originalValue === '89' ? '90' : '89';

    await threshold.fill(changedValue);
    const savePromise = page.waitForResponse(response =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/api/settings/me') &&
      response.status() === 200
    );
    await page.getByRole('button', { name: /lưu cài đặt|save settings/i }).click();
    await savePromise;
    await expect(page.locator('.action-message')).toContainText(/đã lưu|settings saved/i);

    await page.reload();
    await expect(threshold).toHaveValue(changedValue, { timeout: 10000 });

    await threshold.fill(originalValue);
    const restorePromise = page.waitForResponse(response =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/api/settings/me') &&
      response.status() === 200
    );
    await page.getByRole('button', { name: /lưu cài đặt|save settings/i }).click();
    await restorePromise;
  });

  test('Candidate recommendations use API jobs and open detail', async ({ page }) => {
    await login(page, 'ca');
    const jobsPromise = page.waitForResponse(response => response.url().includes('/api/recommendations/jobs?limit=20') && response.status() === 200);
    await page.goto('/candidate/recommendations');
    await jobsPromise;

    const firstJobCard = page.locator('.job-card:not(.skeleton-card)').first();
    await expect(firstJobCard).toBeVisible({ timeout: 10000 });
    await firstJobCard.click();
    await expect(page).toHaveURL(/\/candidate\/jobs\/.+/, { timeout: 10000 });
  });

  test('Recruiter create JD and verify', async ({ page, request }) => {
    await page.goto('/login');
    
    const usernameInput = page.getByPlaceholder('ca / re / ad');
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await usernameInput.fill('re');
    await page.locator('input[type="password"]').fill('12345678');
    const loginPromise = page.waitForResponse(response => response.url().includes('/api/auth/login') && response.status() === 200);
    await page.locator('button[type="submit"]').click();
    await loginPromise;
    const tokenForProfile = await page.evaluate(() => sessionStorage.getItem('careerfit.accessToken'));
    if (!tokenForProfile) throw new Error('Recruiter token was not available for company setup');
    const employerResponse = await request.put('http://localhost:8080/api/employers/me', {
      headers: { Authorization: `Bearer ${tokenForProfile}` },
      data: {
        companyName: 'CareerFit Demo Lab', slug: 'careerfit-demo-lab',
        summary: 'Demo recruiter workspace for frontend integration testing.',
        description: 'Demo recruiter workspace for frontend integration testing.',
        industry: 'HR Tech', companySize: '11-50', location: 'Can Tho, Viet Nam',
        websiteUrl: 'https://careerfit.dev', benefits: ['Flexible hours'],
      },
    });
    expect(employerResponse.status()).toBe(200);
    
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    
    await page.goto('/recruiter/jobs?create=1');
    await expect(page.locator('text=Demo Fullstack Engineer').first()).toBeVisible({ timeout: 10000 });
    
    const modal = page.locator('.create-job-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });
    
    const uniqueTitle = "Test Job " + Date.now();
    await modal.locator('input[name="title"]').first().fill(uniqueTitle);
    await modal.locator('input[name="requiredSkills"]').first().fill('Java, Playwright');
    await modal.locator('textarea[name="originalText"]').first().fill('We are looking for a software engineer to join our team.');
    await modal.locator('input[name="salaryMin"]').first().fill('15000000');
    await modal.locator('input[name="salaryMax"]').first().fill('25000000');
    
    await modal.locator('button.primary-action').first().click();
    const reviewModal = page.locator('.quality-review-modal');
    await expect(reviewModal).toBeVisible({ timeout: 10000 });

    const createPromise = page.waitForResponse(response =>
      response.request().method() === 'POST' &&
      response.url().includes('/api/jobs') &&
      response.status() === 201
    );
    await reviewModal.getByRole('button', { name: /đăng công việc|publish job/i }).click();
    const createResponse = await createPromise;
    const createdPayload = await createResponse.json();
    const createdJobId = createdPayload?.data?.id;
    if (!createdJobId) throw new Error('Created Job ID was not returned');
    
    await expect(page.locator("text=" + uniqueTitle).first()).toBeVisible({ timeout: 10000 });

    const token = await page.evaluate(() => sessionStorage.getItem('careerfit.accessToken'));
    if (!token) throw new Error('Recruiter token was not available for cleanup');
    const deleteResponse = await request.delete(`http://localhost:8080/api/jobs/${createdJobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteResponse.status()).toBe(200);
  });

  test('Recruiter Talent Pool loads independent matching, bookmark, and invitation tabs', async ({ page }) => {
    await login(page, 're');
    const talentPoolRequest = page.waitForResponse((response) =>
      response.url().includes('/api/recruiter/jobs/')
      && response.url().includes('/talent-pool?')
      && response.status() === 200,
    );
    const bookmarkRequest = page.waitForResponse((response) =>
      response.url().includes('/api/recruiter/talent/jobs/')
      && response.url().includes('/bookmarks')
      && response.status() === 200,
    );
    const invitationRequest = page.waitForResponse((response) =>
      response.url().includes('/api/recruiter/jobs/')
      && response.url().includes('/invitations')
      && response.status() === 200,
    );
    await page.goto('/recruiter/talent-pool');
    await Promise.all([talentPoolRequest, bookmarkRequest, invitationRequest]);
    await expect(page.getByRole('tablist', { name: /talent pool/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /danh sách cv|cv list/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /đã đánh dấu|bookmarked/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /đã gửi lời mời|invited/i })).toBeVisible();
    await page.getByRole('tab', { name: /đã đánh dấu|bookmarked/i }).click();
    await expect(page).toHaveURL(/tab=bookmarked/);
    await page.getByRole('tab', { name: /đã gửi lời mời|invited/i }).click();
    await expect(page).toHaveURL(/tab=invited/);
  });

  test('Admin suspend and activate user', async ({ page }) => {
    await page.goto('/login');
    
    const usernameInput = page.getByPlaceholder('ca / re / ad');
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await usernameInput.fill('ad');
    await page.locator('input[type="password"]').fill('12345678');
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

  test('Candidate routes render without runtime errors', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await login(page, 'ca');
    for (const route of [
      '/candidate', '/candidate/jobs', '/candidate/upload', '/candidate/profile',
      '/candidate/recommendations', '/candidate/advanced-analytics',
      '/candidate/applications', '/candidate/automation', '/candidate/settings',
    ]) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('main')).not.toBeEmpty();
    }
    expect(runtimeErrors).toEqual([]);
  });

  test('Recruiter routes render without runtime errors', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await login(page, 're');
    await page.goto('/recruiter');
    await expect(page.locator('.top-nav')).not.toContainText(/autofit/i);
    for (const route of [
      '/recruiter', '/recruiter/jobs', '/recruiter/talent-pool', '/recruiter/analytics',
      '/recruiter/advanced-analytics', '/recruiter/settings',
    ]) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('main')).not.toBeEmpty();
    }
    await page.goto('/recruiter/automation');
    await expect(page).toHaveURL(/\/recruiter$/);
    expect(runtimeErrors).toEqual([]);
  });

  test('Admin routes render without runtime errors', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await login(page, 'ad');
    for (const route of ['/admin', '/admin/users', '/admin/jobs', '/admin/audit-logs', '/admin/email-monitor', '/admin/settings']) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('main')).not.toBeEmpty();
    }
    await page.getByRole('button', { name: /đăng xuất|log out/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('careerfit.accessToken'))).toBeNull();
    expect(runtimeErrors).toEqual([]);
  });
});
