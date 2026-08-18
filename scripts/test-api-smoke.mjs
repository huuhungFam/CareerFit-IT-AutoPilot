import { spawnSync } from "node:child_process";

const baseUrl = (process.argv.find((arg) => arg.startsWith("--base-url="))?.slice("--base-url=".length)
  ?? "http://localhost:8080").replace(/\/$/, "");
const suppliedNonOwnedJobId = process.argv.find((arg) => arg.startsWith("--non-owned-job-id="))?.slice("--non-owned-job-id=".length);

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, options);
  } catch (error) {
    fail(`${options.method ?? "GET"} ${path} could not connect: ${error.message}`);
  }
  const body = await response.text();
  let json = null;
  try { json = body ? JSON.parse(body) : null; } catch { /* asserted below */ }
  return { response, json, body };
}

function assertSuccess(result, label) {
  if (!result.response.ok || result.json?.success !== true) {
    fail(`${label} returned HTTP ${result.response.status}; response was not a successful API envelope`);
  }
  console.log(`PASS: ${label}`);
  return result.json.data;
}

async function login(identifier, expectedRole) {
  const result = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: identifier, password: "1" }),
  });
  const data = assertSuccess(result, `login ${identifier}`);
  if (data?.user?.role !== expectedRole || !data?.accessToken) {
    fail(`login ${identifier} did not return ${expectedRole} with an access token`);
  }
  return data.accessToken;
}

async function authorized(path, token, label) {
  return assertSuccess(await request(path, {
    headers: { authorization: `Bearer ${token}` },
  }), label);
}

function queryNonOwnedJobId() {
  if (suppliedNonOwnedJobId) return suppliedNonOwnedJobId;
  const sql = `SELECT j.id FROM job j JOIN user_account u ON u.id = j.recruiter_id WHERE u.email <> 're' ORDER BY j.created_at LIMIT 1;`;
  const result = spawnSync("docker", ["compose", "exec", "-T", "postgres", "psql", "-U", "careerfit", "-d", "careerfit", "-t", "-A", "-v", "ON_ERROR_STOP=1"], {
    input: sql,
    encoding: "utf8",
  });
  if (result.status !== 0) fail("could not query an independently owned job for the ownership smoke check");
  const id = result.stdout.trim();
  if (!id) fail("database has no job owned by a recruiter other than quick-login re");
  return id;
}

function assertNonOwnedJob(jobId) {
  const sql = `SELECT COUNT(*) FROM job j JOIN user_account u ON u.id = j.recruiter_id WHERE j.id = '${jobId.replace(/'/g, "''")}'::uuid AND u.email <> 're';`;
  const result = spawnSync("docker", ["compose", "exec", "-T", "postgres", "psql", "-U", "careerfit", "-d", "careerfit", "-t", "-A", "-v", "ON_ERROR_STOP=1"], {
    input: sql,
    encoding: "utf8",
  });
  if (result.status !== 0 || result.stdout.trim() !== "1") {
    fail("ownership smoke job must exist and belong to a recruiter other than re");
  }
}

async function main() {
  const health = await request("/actuator/health");
  if (!health.response.ok || health.json?.status !== "UP") fail("backend health endpoint is not UP");
  console.log("PASS: backend health");

  const candidateToken = await login("ca", "CANDIDATE");
  const recruiterToken = await login("re", "RECRUITER");
  await authorized("/api/auth/me", candidateToken, "candidate auth/me");
  const candidateSettings = await authorized("/api/settings/me", candidateToken, "candidate settings");
  if (candidateSettings?.demoModeEnabled !== true) fail("quick-login ca must have Demo Mode enabled after reset");
  await authorized("/api/candidate/analytics/overview", candidateToken, "candidate analytics");
  await assertSuccess(await request("/api/jobs?size=5"), "public job catalog");

  await authorized("/api/auth/me", recruiterToken, "recruiter auth/me");
  const recruiterSettings = await authorized("/api/settings/me", recruiterToken, "recruiter settings");
  if (recruiterSettings?.demoModeEnabled !== true) fail("quick-login re must have Demo Mode enabled after reset");
  await authorized("/api/recruiter/dashboard", recruiterToken, "recruiter dashboard");
  await authorized("/api/recruiter/analytics/overview", recruiterToken, "recruiter analytics");
  const recruiterJobs = await authorized("/api/recruiter/jobs", recruiterToken, "recruiter job management");
  if (!Array.isArray(recruiterJobs) || recruiterJobs.length === 0) fail("quick-login re has no job for ranking/applicant smoke checks");
  const ownJobId = recruiterJobs[0].id;
  await authorized(`/api/recruiter/jobs/${ownJobId}/ranking`, recruiterToken, "recruiter ranking");
  await authorized(`/api/recruiter/jobs/${ownJobId}/applicants`, recruiterToken, "recruiter applicants");
  await authorized(`/api/recruiter/talent/jobs/${ownJobId}/bookmarks`, recruiterToken, "recruiter bookmarks");

  const otherJobId = queryNonOwnedJobId();
  assertNonOwnedJob(otherJobId);
  const denied = await request(`/api/recruiter/jobs/${otherJobId}/applicants`, {
    headers: { authorization: `Bearer ${recruiterToken}` },
  });
  if (denied.response.status !== 403 || denied.json?.error?.code !== "FORBIDDEN") {
    fail("cross-owner recruiter applicant access must return 403 FORBIDDEN");
  }
  console.log("PASS: recruiter ownership denial");
  console.log("API smoke passed without logging tokens or secrets.");
}

await main();
