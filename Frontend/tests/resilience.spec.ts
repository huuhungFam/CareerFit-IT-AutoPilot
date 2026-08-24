import { expect, test } from '@playwright/test';

test('Public jobs API failure shows a retryable error state', async ({ page }) => {
  await page.route('**/api/jobs/search?**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { message: 'Service unavailable' } }),
    });
  });

  await page.goto('/jobs');

  const alert = page.getByRole('alert');
  await expect(alert).toContainText(/không thể tải danh sách việc làm|could not load jobs/i, { timeout: 15_000 });
  await expect(alert.getByRole('button', { name: /thử lại|retry/i })).toBeVisible();
  await expect(page.getByText(/không có việc làm phù hợp|no matching jobs/i)).toHaveCount(0);
});

test('Candidate can save a job from the catalog', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('careerfit.accessToken', 'candidate-contract-token');
    window.sessionStorage.setItem('careerfit.account', JSON.stringify({
      username: 'candidate@example.com',
      password: '',
      role: 'candidate',
      displayName: 'Candidate Contract Test',
    }));
  });
  await page.route('**/api/auth/me', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: { id: 'candidate-1', email: 'candidate@example.com', fullName: 'Candidate Contract Test', role: 'CANDIDATE', emailVerified: true, preferredLanguage: 'vi' },
    }),
  }));
  await page.route('**/api/candidates/me/job-catalog?**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: {
        jobs: [{
          id: 'job-1', title: 'Backend Engineer', company: 'CareerFit',
          location: 'Can Tho', seniorityLevel: 'Junior', requiredSkills: ['Java'],
          status: 'ACTIVE', createdAt: '2026-07-18T00:00:00Z', isSaved: false,
          isPotential: false, applicationStatus: null, feedbackStatus: null, matchReasons: [],
        }],
        total: 1, page: 0, size: 20, totalPages: 1,
      },
    }),
  }));
  await page.route('**/api/candidates/me/saved-jobs', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: [] }),
  }));
  await page.route('**/api/candidates/me/saved-jobs/job-1', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: null }),
  }));

  await page.goto('/candidate/jobs');
  await expect(page).toHaveURL('/candidate/jobs');
  const saveRequest = page.waitForRequest((request) =>
    request.method() === 'PUT' && request.url().includes('/api/candidates/me/saved-jobs/job-1'),
  );
  await page.getByRole('button', { name: /^lưu$|^save$/i }).click();

  await saveRequest;
});

test('Admin dashboard API failure does not stay in loading state', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('careerfit.accessToken', 'e2e-admin-token');
    window.sessionStorage.setItem('careerfit.account', JSON.stringify({
      id: 'e2e-admin',
      name: 'E2E Admin',
      email: 'admin@example.com',
      role: 'admin',
    }));
  });
  await page.route('**/api/auth/me', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: { id: 'e2e-admin', email: 'admin@example.com', fullName: 'E2E Admin', role: 'ADMIN', emailVerified: true, preferredLanguage: 'vi' },
    }),
  }));
  await page.route('**/api/admin/dashboard', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { message: 'Service unavailable' } }),
    });
  });

  await page.goto('/admin');

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText(/đang tải bảng điều khiển|loading dashboard/i)).toHaveCount(0);
});

test('Header navigation does not overlap the brand at desktop widths', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/jobs');

  const brand = page.locator('.brand');
  const navigation = page.locator('.top-nav');
  await expect(brand).toBeVisible();
  await expect(navigation).toBeVisible();

  const [brandBox, navigationBox] = await Promise.all([brand.boundingBox(), navigation.boundingBox()]);
  expect(brandBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(navigationBox!.x).toBeGreaterThanOrEqual(brandBox!.x + brandBox!.width - 2);
  expect(navigationBox!.y).toBeGreaterThanOrEqual(brandBox!.y - 2);
  expect(navigationBox!.y + navigationBox!.height).toBeLessThanOrEqual(brandBox!.y + brandBox!.height + 2);
});

test('Featured employer cards load real company details and jobs', async ({ page }) => {
  await page.route('**/api/employers/featured', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: [{
        id: 'company-1', companyName: 'Acme Technology', slug: 'acme-technology',
        summary: 'Product engineering company', industry: 'Software', companySize: '100-200',
        location: 'Ho Chi Minh City', isFeatured: true, jobCount: 1,
      }],
    }),
  }));
  await page.route('**/api/employers/acme-technology', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: {
        id: 'company-1', companyName: 'Acme Technology', slug: 'acme-technology',
        summary: 'Product engineering company', description: 'Builds reliable software products.',
        industry: 'Software', companySize: '100-200', location: 'Ho Chi Minh City',
        websiteUrl: 'https://example.com', benefits: ['Healthcare'], isFeatured: true, jobCount: 1,
      },
    }),
  }));
  await page.route('**/api/employers/acme-technology/jobs?**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: {
        jobs: [{
          id: 'job-1', title: 'Frontend Engineer', company: 'Acme Technology',
          location: 'Ho Chi Minh City', requiredSkills: ['React'], status: 'ACTIVE',
        }],
        total: 1, page: 0, size: 20, totalPages: 1,
      },
    }),
  }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Acme Technology' }).click();

  await expect(page).toHaveURL(/\/candidate\/employers\/acme-technology$/);
  await expect(page.getByRole('heading', { name: 'Acme Technology' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Frontend Engineer' })).toBeVisible();
});

test('Job detail loads similar jobs from the recommendation API', async ({ page }) => {
  await page.route('**/api/jobs/job-1', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: {
        id: 'job-1', title: 'Frontend Engineer', company: 'Acme Technology',
        location: 'Ho Chi Minh City', seniorityLevel: 'Senior', requiredSkills: ['React'],
        niceToHaveSkills: ['TypeScript'], originalText: 'Build accessible product interfaces.\n'.repeat(80),
        status: 'ACTIVE', createdAt: '2026-07-18T00:00:00Z',
      },
    }),
  }));
  await page.route('**/api/recommendations/jobs/job-1/similar?limit=5', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: [{
        jobId: 'job-2', title: 'React Platform Engineer', company: 'Product Labs',
        location: 'Remote Vietnam', seniorityLevel: 'Senior', salaryDisplay: 'Negotiable',
        finalScore: 75, matchLabel: 'SIMILAR', requiredSkills: ['React', 'TypeScript'],
        postedAt: '2026-07-17T00:00:00Z',
      }],
    }),
  }));

  await page.goto('/jobs/job-1');
  await expect(page.getByRole('heading', { name: 'Frontend Engineer' })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 700));
  const similarButton = page.getByRole('button', { name: /việc làm tương tự|similar jobs/i });
  await expect(similarButton).toBeVisible();
  await similarButton.click();

  await expect(page.getByRole('heading', { name: 'React Platform Engineer' })).toBeVisible();
});
