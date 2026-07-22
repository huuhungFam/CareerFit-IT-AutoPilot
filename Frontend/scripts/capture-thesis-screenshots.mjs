import { chromium } from '@playwright/test';
import path from 'node:path';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const outputDir = path.resolve(process.cwd(), '..', 'Doc', 'screenshots');

async function settle(page) {
  await page.locator('body').waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(1_000);
}

async function login(page, username) {
  await page.goto(`${baseURL}/login`);
  await page.getByPlaceholder('ca / re / ad').fill(username);
  await page.locator('input[type="password"]').fill('1');
  const response = page.waitForResponse((item) => item.url().includes('/api/auth/login'));
  await page.locator('button[type="submit"]').click();
  const loginResponse = await response;
  if (loginResponse.status() !== 200) {
    throw new Error(`Login failed for ${username}: HTTP ${loginResponse.status()}`);
  }
  await page.locator('nav').waitFor({ state: 'visible', timeout: 15_000 });
}

async function capture(page, route, filename) {
  await page.goto(`${baseURL}${route}`);
  await settle(page);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outputDir, filename),
    fullPage: false,
    animations: 'disabled',
  });
}

const browser = await chromium.launch({ headless: true });
try {
  const publicContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const publicPage = await publicContext.newPage();
  await capture(publicPage, '/jobs', 'screen-4-1-public-jobs.png');
  await publicContext.close();

  const candidateContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const candidatePage = await candidateContext.newPage();
  await login(candidatePage, 'ca');
  await capture(candidatePage, '/candidate/jobs', 'screen-4-2-candidate-matching.png');
  await capture(candidatePage, '/candidate/upload', 'screen-4-3-cv-upload.png');
  await capture(candidatePage, '/candidate/automation', 'screen-4-5-autofit-settings.png');
  await candidateContext.close();

  const recruiterContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const recruiterPage = await recruiterContext.newPage();
  await login(recruiterPage, 're');
  await capture(recruiterPage, '/recruiter/jobs?q=Demo', 'screen-4-4-recruiter-workspace.png');
  await recruiterContext.close();

  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const adminPage = await adminContext.newPage();
  await login(adminPage, 'ad');
  await capture(adminPage, '/admin/audit-logs', 'screen-4-6-admin-audit.png');
  await adminContext.close();
} finally {
  await browser.close();
}

console.log(`Screenshots written to ${outputDir}`);
