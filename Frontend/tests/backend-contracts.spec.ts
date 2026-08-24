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

test('CV upload opens review, saves edits, then confirms scoring', async ({ page }) => {
  await useCandidateSession(page);
  let patchRequests = 0;
  let confirmRequests = 0;
  const reviewCv = {
    id: 'cv-review-1', displayName: 'Regression CV', source: 'UPLOAD', isDefault: false,
    status: 'REVIEW_REQUIRED', language: 'vi', topSkills: [], parsedSummary: null,
    rawText: 'Senior React engineer', reviewSections: { headline: 'Senior React engineer', skills: 'React, TypeScript' },
    reviewIssues: [{ id: 'issue-1', sectionKey: 'skills', category: 'SPELLING', severity: 'WARNING', targetText: 'TypeScript', replacementText: 'TypeScript', messageVi: 'Kiểm tra tên kỹ năng.', messageEn: 'Review this skill name.' }],
    failureReason: null, lastScoredAt: null, createdAt: '2026-08-18T00:00:00Z', updatedAt: '2026-08-18T00:00:00Z',
  };

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
      data: { id: 'cv-review-1', displayName: 'Regression CV', status: 'REVIEW_REQUIRED', message: 'Ready for review', qualitySignals: [] },
    }),
  }));
  await page.route('**/api/cv/me', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { cvs: [{ ...reviewCv, status: 'PROCESSING' }], total: 1, defaultCvId: null } }),
  }));
  await page.route('**/api/cv/cv-review-1', (route) => {
    if (route.request().method() === 'PATCH') {
      patchRequests += 1;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: reviewCv }) });
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: reviewCv }) });
  });
  await page.route('**/api/cv/cv-review-1/confirm', (route) => {
    confirmRequests += 1;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { ...reviewCv, status: 'PROCESSING' } }) });
  });

  await page.goto('/candidate/upload');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'regression-cv.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 regression CV'),
  });

  await expect(page).toHaveURL(/\/candidate\/profile\/cvs\/cv-review-1\/review$/);
  await expect(page.getByRole('heading', { name: /Xem lại CV trước khi chấm điểm|Review your CV before scoring/i })).toBeVisible();
  await page.getByLabel(/Kỹ năng|Skills/i).fill('React, TypeScript, Testing');
  await page.getByRole('button', { name: /Xác nhận và chấm điểm|Confirm and score/i }).click();
  await expect(page).toHaveURL(/\/candidate\/profile\?tab=cvs&cv=cv-review-1$/);
  expect(patchRequests).toBe(1);
  expect(confirmRequests).toBe(1);
});

test('failed CV retry uses the retry API and opens the review screen', async ({ page }) => {
  await useCandidateSession(page);
  let retryRequests = 0;
  const failedCv = {
    id: 'cv-failed-1', displayName: 'Unreadable CV', source: 'UPLOAD', isDefault: false,
    status: 'FAILED', language: 'vi', topSkills: [], parsedSummary: null,
    failureReason: 'Could not extract text', lastScoredAt: null, createdAt: '2026-08-18T00:00:00Z',
  };

  await page.route('**/api/candidates/me', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { userId: 'candidate-1', fullName: 'Candidate Contract Test' } }),
  }));
  await page.route('**/api/cv/me', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { cvs: [failedCv], total: 1, defaultCvId: null } }),
  }));
  await page.route('**/api/cv/cv-failed-1/retry', (route) => {
    retryRequests += 1;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { ...failedCv, status: 'REVIEW_REQUIRED' } }) });
  });
  await page.route('**/api/cv/cv-failed-1', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { ...failedCv, status: 'REVIEW_REQUIRED', rawText: 'React engineer', reviewSections: { headline: 'React engineer' }, reviewIssues: [] } }),
  }));

  await page.goto('/candidate/profile?tab=cvs');
  await page.getByRole('button', { name: /Thử lại|Retry/i }).click();
  await expect(page).toHaveURL(/\/candidate\/profile\/cvs\/cv-failed-1\/review$/);
  expect(retryRequests).toBe(1);
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

test('candidate jobs uses the personalized catalog contract without falling back to the matching feed', async ({ page }) => {
  await useCandidateSession(page);
  let catalogRequests = 0;
  let matchingRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/matches/me/cards')) matchingRequests += 1;
  });
  await page.route('**/api/candidates/me/job-catalog?**', (route) => {
    catalogRequests += 1;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      success: true,
      data: {
        jobs: [{
          id: 'catalog-job-1', title: 'Personalized Catalog Job', company: 'CareerFit Labs',
          location: 'Remote Vietnam', remoteType: 'REMOTE', seniorityLevel: 'SENIOR', language: 'en',
          salary: { mode: 'NEGOTIABLE', isVisible: true }, requiredSkills: ['React'], niceToHaveSkills: [],
          originalText: 'Build job search experiences.', domain: 'frontend', createdAt: '2026-08-01T00:00:00Z',
          applicationMode: 'INTERNAL', isUrgent: false, matchingId: 'match-1', matchScore: 92,
          matchLabel: 'HIGH', isPotential: true, isSaved: true, applicationStatus: null,
          feedbackStatus: 'GOOD_MATCH', matchReasons: ['React'],
        }],
        total: 990, page: 0, size: 20, totalPages: 50,
      },
    }) });
  });

  await page.goto('/candidate/jobs?keyword=React');
  await expect(page).toHaveURL(/\/candidate\/jobs\?keyword=React$/);
  await expect(page.getByRole('heading', { name: 'Personalized Catalog Job' })).toBeVisible();
  expect(catalogRequests).toBe(1);
  expect(matchingRequests).toBe(0);
});

test('saved jobs tab reads saved catalog cards instead of loading matching cards', async ({ page }) => {
  await useCandidateSession(page);
  let savedCardRequests = 0;
  await page.route('**/api/applications/me**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { content: [] } }),
  }));
  await page.route('**/api/candidates/me/saved-jobs/cards?**', (route) => {
    savedCardRequests += 1;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          jobs: [{
            id: 'saved-catalog-job', title: 'Saved Catalog Job', company: 'CareerFit Labs',
            location: 'Remote Vietnam', seniorityLevel: 'SENIOR', language: 'en',
            salary: { mode: 'NEGOTIABLE', isVisible: true }, requiredSkills: ['React'], niceToHaveSkills: [],
            originalText: 'Saved catalog role.', applicationMode: 'INTERNAL', isUrgent: false,
            matchingId: null, matchScore: null, matchLabel: null, isPotential: false,
            isSaved: true, applicationStatus: null, feedbackStatus: null, matchReasons: [],
          }],
          total: 1, page: 0, size: 20, totalPages: 1,
        },
      }),
    });
  });

  await page.goto('/candidate/applications?tab=saved');
  await expect(page.getByRole('heading', { name: 'Saved Catalog Job' })).toBeVisible();
  expect(savedCardRequests).toBe(1);
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
