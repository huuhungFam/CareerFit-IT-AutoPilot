import { expect, test, type Page } from '@playwright/test';

const candidate = { username: 'candidate@example.test', password: '', role: 'candidate', displayName: 'Candidate Test' };

async function authenticateCandidate(page: Page) {
  await page.addInitScript((account) => {
    sessionStorage.setItem('careerfit.accessToken', 'phase2-test-token');
    sessionStorage.setItem('careerfit.account', JSON.stringify(account));
  }, candidate);
  await page.route('**/api/auth/me', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { id: 'candidate-id', email: candidate.username, fullName: candidate.displayName, role: 'CANDIDATE' } }),
  }));
}

test.describe('Phase 2 settings and catalog UI', () => {
  test('candidate controls Demo Mode and sees the effective timing', async ({ page }) => {
    await authenticateCandidate(page);
    let demoModeEnabled = true;
    await page.route('**/api/settings/me', (route) => {
      if (route.request().method() === 'PATCH') demoModeEnabled = Boolean(route.request().postDataJSON()?.demoModeEnabled);
      const effectiveTiming = demoModeEnabled
        ? { candidatePollIntervalSeconds: 5, firstSuggestionDelaySeconds: 12, subsequentSpacingSeconds: 30 }
        : { candidatePollIntervalSeconds: 300, firstSuggestionDelaySeconds: 300, subsequentSpacingSeconds: 900 };
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { role: 'CANDIDATE', values: {}, demoModeEnabled, effectiveTiming } }) });
    });

    await page.goto('/candidate/settings');
    const demoToggle = page.locator('label.setting-toggle', { hasText: /bật chế độ demo|enable demo mode/i }).getByRole('checkbox');
    await expect(demoToggle).toBeChecked();
    const update = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().includes('/api/settings/me'));
    await demoToggle.click({ force: true });
    await update;
    await expect(demoToggle).not.toBeChecked();
    const reenable = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().includes('/api/settings/me'));
    await demoToggle.click({ force: true });
    await reenable;
    await expect(page.getByText(/demo.*5s.*12s.*30s/i)).toBeVisible();
  });

  test('unscored catalog entries remain visible without a fabricated matching badge', async ({ page }) => {
    await authenticateCandidate(page);
    await page.route('**/api/settings/me', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: {
      role: 'CANDIDATE', values: {}, demoModeEnabled: false,
      effectiveTiming: { candidatePollIntervalSeconds: 300, firstSuggestionDelaySeconds: 300, subsequentSpacingSeconds: 900 },
    } }) }));
    await page.route('**/api/recommendations/jobs?limit=20', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: {
      cvStatus: 'NO_CV', message: 'Upload a CV for personalized scores.', jobs: [{
        jobId: 'catalog-job', title: 'Catalog Engineer', company: 'CareerFit', location: 'Ha Noi', seniorityLevel: 'MID',
        salaryDisplay: 'Negotiable', language: 'en', hasMatching: false, isPotential: false,
        requiredSkills: ['Java'], matchingSkills: [], postedAt: '2026-08-01T00:00:00Z',
      }],
    } }) }));

    await page.goto('/candidate/recommendations');
    await expect(page.getByRole('heading', { name: 'Catalog Engineer' })).toBeVisible();
    await expect(page.locator('.job-card .badge-stack')).toHaveCount(0);
    await expect(page.getByText('Upload a CV for personalized scores.')).toBeVisible();
  });
});
