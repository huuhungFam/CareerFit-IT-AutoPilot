import { expect, test, type Page } from '@playwright/test';

const recruiterAccount = { username: 'recruiter@example.com', password: '', role: 'recruiter', displayName: 'Recruiter Contract Test' };

async function useRecruiterSession(page: Page) {
  await page.addInitScript((account) => {
    window.sessionStorage.setItem('careerfit.accessToken', 'recruiter-contract-token');
    window.sessionStorage.setItem('careerfit.account', JSON.stringify(account));
  }, recruiterAccount);
  await page.route('**/api/auth/me', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: {
    id: 'recruiter-1', email: 'recruiter@example.com', fullName: 'Recruiter Contract Test', role: 'RECRUITER', emailVerified: true, preferredLanguage: 'vi',
  } }) }));
}

test('recruiter jobs uses employer company and moves an applicant between status tabs', async ({ page }) => {
  await useRecruiterSession(page);
  let updateRequests = 0;
  const applicant = {
    applicationId: 'application-1', candidateId: 'candidate-1', cvId: 'cv-1', fullName: 'Nguyen Van A', email: 'candidate@example.com',
    desiredTitle: 'Frontend Engineer', desiredSeniority: 'MID', location: 'Ho Chi Minh City', yearsOfExperience: 4, aboutMe: 'Builds reliable React products.',
    topSkills: ['React', 'TypeScript'], parsedSummary: 'Frontend engineer', matchScore: 91, matchLabel: 'HIGH', isPotential: true,
    matchReasons: ['React'], potentialReason: 'Strong transferable experience.', applicationStatus: 'PENDING', autoApplied: false,
    coverLetter: null, appliedAt: '2026-08-18T00:00:00Z', portfolioVisible: false, portfolio: null, portfolioHiddenReason: 'Portfolio is visible after applying.',
  };
  await page.route('**/api/recruiter/jobs', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [{
    id: 'job-1', title: 'Senior Frontend Engineer', company: 'Northstar HealthTech', location: 'Ho Chi Minh City', seniorityLevel: 'SENIOR', status: 'ACTIVE',
    applicantCount: 1, matchCount: 4, requiredSkills: ['React'], niceToHaveSkills: [], originalText: 'Build accessible candidate experiences.',
    salaryMode: 'RANGE', salaryMin: 25000000, salaryMax: 40000000, salaryCurrency: 'VND', salaryIsVisible: true, language: 'vi', createdAt: '2026-08-18T00:00:00Z',
  }] }) }));
  await page.route('**/api/employers/me', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: {
    id: 'employer-1', companyName: 'Northstar HealthTech', slug: 'northstar', logoUrl: null, coverUrl: null, summary: null, description: null,
    industry: 'Software', companySize: '50-199', location: 'Ho Chi Minh City', websiteUrl: null, benefits: [], isFeatured: false, jobCount: 1,
  } }) }));
  await page.route('**/api/recruiter/jobs/job-1/applicants?**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: {
    jobId: 'job-1', jobTitle: 'Senior Frontend Engineer', applicants: [applicant], total: 1, page: 0, size: 50, totalPages: 1,
  } }) }));
  await page.route('**/api/recruiter/applications/application-1/status', (route) => {
    updateRequests += 1;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: null }) });
  });

  await page.goto('/recruiter/jobs/job-1/applicants');
  await expect(page.getByRole('heading', { name: 'Nguyen Van A' })).toBeVisible();
  await expect(page.getByRole('button', { name: /chờ xử lý|pending/i })).toContainText('(1)');
  await page.getByRole('button', { name: /duyệt|approve/i }).click();
  await expect(page.getByRole('heading', { name: /không có hồ sơ chờ xử lý|no pending applications/i })).toBeVisible();
  await page.getByRole('button', { name: /đã chấp nhận|approved/i }).click();
  await expect(page.getByRole('heading', { name: 'Nguyen Van A' })).toBeVisible();
  expect(updateRequests).toBe(1);
});
