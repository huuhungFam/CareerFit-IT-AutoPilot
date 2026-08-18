import { expect, test, type Page } from '@playwright/test';

const candidateAccount = {
  username: 'candidate@example.com',
  password: '',
  role: 'candidate',
  displayName: 'Candidate Contract Test',
};

async function useCandidateSession(page: Page) {
  await page.addInitScript((account) => {
    window.sessionStorage.setItem('careerfit.accessToken', 'candidate-contract-token');
    window.sessionStorage.setItem('careerfit.account', JSON.stringify(account));
  }, candidateAccount);
  await page.route('**/api/auth/me', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: {
        id: 'candidate-1', email: 'candidate@example.com', fullName: 'Candidate Contract Test',
        role: 'CANDIDATE', emailVerified: true, preferredLanguage: 'vi',
      },
    }),
  }));
}

test('CV upload polls status until SCORING_DONE', async ({ page }) => {
  await useCandidateSession(page);
  let statusRequests = 0;

  await page.route('**/api/candidates/me', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { userId: 'candidate-1', fullName: 'Candidate Contract Test' } }),
  }));
  await page.route('**/api/matches/me/cards?**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { jobs: [], total: 0, page: 0, size: 20, totalPages: 0 } }),
  }));
  await page.route('**/api/cv/upload', (route) => route.fulfill({
    status: 202,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: { id: 'cv-poll-1', displayName: 'Regression CV', status: 'UPLOADED', message: 'Accepted', qualitySignals: [] },
    }),
  }));
  await page.route('**/api/cv/cv-poll-1/status', (route) => {
    statusRequests += 1;
    if (statusRequests === 1) {
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { message: 'Temporary scoring outage' } }),
      });
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { id: 'cv-poll-1', status: statusRequests === 2 ? 'PROCESSING' : 'SCORING_DONE', failureReason: null },
      }),
    });
  });

  await page.goto('/candidate/upload');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'regression-cv.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 regression CV'),
  });

  await expect(page.getByText(/CV đã chấm điểm xong|CV scoring is complete/i)).toBeVisible({ timeout: 10_000 });
  expect(statusRequests).toBeGreaterThanOrEqual(3);
});

test('recommendations page uses the recommendation API instead of matching feed', async ({ page }) => {
  await useCandidateSession(page);
  let recommendationRequests = 0;
  let matchingFeedRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/matches/me/cards')) matchingFeedRequests += 1;
  });
  await page.route('**/api/recommendations/jobs?limit=20', (route) => {
    recommendationRequests += 1;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [{
          jobId: 'recommended-job-1', title: 'Recommendation API Job', company: 'CareerFit Labs',
          location: 'Remote Vietnam', seniorityLevel: 'Senior', employmentType: 'FULL_TIME',
          salaryDisplay: 'Negotiable', language: 'en', matchScore: 91, finalScore: 94,
          matchLabel: 'HIGH', isPotential: false, requiredSkills: ['React'], matchingSkills: ['React'],
          postedAt: '2026-07-18T00:00:00Z',
        }],
      }),
    });
  });

  await page.goto('/candidate/recommendations');
  await expect(page.getByRole('heading', { name: 'Recommendation API Job' })).toBeVisible();
  expect(recommendationRequests).toBe(1);
  expect(matchingFeedRequests).toBe(0);
});

test('candidate jobs route redirects to the paginated catalog instead of the matching feed', async ({ page }) => {
  await useCandidateSession(page);
  let catalogRequests = 0;
  let matchingRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/matches/me/cards')) matchingRequests += 1;
  });
  await page.route('**/api/jobs/search?**', (route) => {
    catalogRequests += 1;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      success: true,
      data: { jobs: [], total: 990, page: 0, size: 20, totalPages: 50 },
    }) });
  });

  await page.goto('/candidate/jobs?keyword=React');
  await expect(page).toHaveURL(/\/jobs\?keyword=React$/);
  await expect(page.getByText(/Đang hiển thị 0 \/ 990|Showing 0 \/ 990/)).toBeVisible();
  expect(catalogRequests).toBe(1);
  expect(matchingRequests).toBe(0);
});

test('reload validates and restores the current user with auth me', async ({ page }) => {
  await useCandidateSession(page);
  let meRequests = 0;
  await page.unroute('**/api/auth/me');
  await page.route('**/api/auth/me', (route) => {
    meRequests += 1;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { id: 'candidate-1', email: 'candidate@example.com', fullName: 'Restored Candidate', role: 'CANDIDATE', emailVerified: true, preferredLanguage: 'vi' },
      }),
    });
  });

  await page.goto('/candidate/settings');
  await expect.poll(() => meRequests).toBeGreaterThan(0);
  await page.reload();
  await expect.poll(() => meRequests).toBeGreaterThan(1);
  await expect(page).toHaveURL(/\/candidate\/settings$/);
});
