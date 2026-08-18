const baseUrl = process.env.CAREERFIT_API_URL ?? 'http://localhost:8080';
const email = process.env.CAREERFIT_ADMIN_EMAIL ?? 'ad';
const password = process.env.CAREERFIT_ADMIN_PASSWORD ?? '12345678';
const pageSize = Math.min(200, Math.max(1, Number(process.env.MATCHING_BATCH_SIZE ?? 100)));

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed (${response.status}): ${payload?.error?.message ?? 'unknown error'}`);
  }
  return payload.data;
}

const login = await request('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const headers = { Authorization: `Bearer ${login.accessToken}` };

let page = 0;
let totals = { jobsProcessed: 0, jobsVectorized: 0, matchingsScored: 0, failures: 0 };
while (true) {
  const result = await request(`/api/admin/matching/rebuild-batch?page=${page}&size=${pageSize}`, {
    method: 'POST',
    headers,
  });
  for (const key of Object.keys(totals)) totals[key] += Number(result[key] ?? 0);
  console.log(JSON.stringify(result));
  if (result.lastPage) break;
  page += 1;
}

console.log(`Batch matching complete: ${JSON.stringify(totals)}`);
