import { expect, test } from '@playwright/test';

async function loginRecruiter(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByPlaceholder('ca / re / ad').fill('re');
  await page.locator('input[type="password"]').fill('12345678');
  const loginResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/login') && response.status() === 200,
  );
  await page.locator('button[type="submit"]').click();
  await loginResponse;
}

async function completeRecruiterCompanyProfile(page: import('@playwright/test').Page) {
  const token = await page.evaluate(() => sessionStorage.getItem('careerfit.accessToken'));
  if (!token) throw new Error('Recruiter token was not available');
  const response = await page.request.put('http://localhost:8080/api/employers/me', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      companyName: 'CareerFit Demo Lab', slug: 'careerfit-demo-lab',
      summary: 'Demo recruiter workspace for frontend integration testing.',
      description: 'Demo recruiter workspace for frontend integration testing.',
      industry: 'HR Tech', companySize: '11-50', location: 'Can Tho, Viet Nam',
      websiteUrl: 'https://careerfit.dev', benefits: ['Flexible hours'],
    },
  });
  expect(response.ok()).toBeTruthy();
}

test('JD form suggests and applies canonical job fields and skills', async ({ page }) => {
  await loginRecruiter(page);
  await completeRecruiterCompanyProfile(page);

  await page.route('**/api/jobs/search/suggestions**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          titles: ['Engineering Manager'],
          companies: ['CareerFit Labs'],
          skills: ['Java'],
          locations: ['Can Tho'],
          domains: ['Software Engineering'],
        },
      }),
    });
  });
  await page.route('**/api/skills/suggestions**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: ['Java'] }),
    });
  });
  await page.route('**/api/jobs/quality-preview', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          qualitySignals: [{
            severity: 'WARNING',
            code: 'JD_FRESHER_EXPERIENCE_MISMATCH',
            field: 'originalText',
            message: 'Fresher job description appears to require 3+ years of experience.',
          }],
        },
      }),
    });
  });

  await page.goto('/recruiter/jobs?create=1');
  const modal = page.locator('.create-job-modal');
  await expect(modal).toBeVisible();

  const title = modal.locator('input[name="title"]');
  await title.fill('En');
  await expect(modal.getByRole('option', { name: 'Engineering Manager' })).toBeVisible();
  await modal.getByRole('option', { name: 'Engineering Manager' }).click();
  await expect(title).toHaveValue('Engineering Manager');

  const skills = modal.locator('input[name="requiredSkills"]');
  await skills.fill('Ja');
  await expect(modal.getByRole('option', { name: 'Java', exact: true })).toBeVisible();
  await modal.getByRole('option', { name: 'Java', exact: true }).click();
  await expect(skills).toHaveValue('Java');

  await expect(modal.getByLabel(/công ty|company/i)).toHaveAttribute('readonly', '');
  await modal.locator('select[name="seniorityLevel"]').selectOption('FRESHER');
  await modal.locator('textarea[name="originalText"]').fill('Fresher engineer role requiring 10 years of Java experience.');
  await modal.locator('input[name="salaryMin"]').fill('10000000');
  await modal.locator('input[name="salaryMax"]').fill('15000000');
  await modal.getByRole('button', { name: /xem lại trước khi đăng|review before publishing/i }).click();
  const reviewModal = page.locator('.quality-review-modal');
  await expect(reviewModal).toBeVisible();
  await expect(reviewModal).toContainText(/Fresher job description/i);
  await expect(reviewModal).toContainText(/giảm yêu cầu xuống tối đa 2 năm/i);
});
