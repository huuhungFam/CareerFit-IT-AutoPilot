## 5.1 Evaluation Objectives

The evaluation was designed to answer four questions. First, does the lexical scoring and Rocchio feedback pipeline behave deterministically and change holdout rankings in the intended direction under a controlled causal scenario? Second, do the backend modules and database migrations satisfy their automated unit, integration, security, and contract tests? Third, can the main Guest, Candidate, Recruiter, and Administrator workflows execute through the integrated browser application? Fourth, what can be observed about local API latency, authorization boundaries, health, and monitoring without overstating the evidence as production validation?

The evaluation separates algorithmic effectiveness, software correctness, browser workflow acceptance, security checks, and operational health. A pass in one category does not imply a pass in another. In particular, the controlled Rocchio benchmark is not a measurement of hiring quality on organic production data, and a successful backend test suite does not prove that browser, monitoring, or deployment behavior is complete.

All results in this chapter were refreshed on July 3, 2026 (ICT). The observed Git commit was `e92e3d847992d7b628bcfbbcef9a57ab32677547`, but the worktree already contained modifications and untracked files. Therefore, the results describe the evaluated working tree and are not reproducible from the commit hash alone unless the complete working-tree changes are also preserved.

## 5.2 Evaluation Environment

Table 5.1. Evaluation environment

| Component | Observed version or configuration |
|---|---|
| Host operating environment | Windows, PowerShell |
| Java | 21.0.1 |
| Backend framework | Spring Boot 3.2.5 |
| Maven | Repository Maven Wrapper |
| Node.js / npm | 20.16.0 / 10.8.1 |
| Frontend build | Vite 5.4.21, React 18.3, TypeScript 5.9 |
| Docker / Compose | Docker Desktop server 29.5.3 / Compose v5.1.4 |
| Test database | PostgreSQL 16.14 through Testcontainers or Compose |
| Testcontainers | 1.21.4 |
| Browser E2E | Playwright 1.61, Chromium project |
| Local backend | Host process on port 8080 connected to Compose PostgreSQL at localhost:5433 |
| Local frontend | Vite development server on 127.0.0.1:5173 |

Docker Desktop was initially unavailable and was started before database-dependent verification. Testcontainers created isolated PostgreSQL containers for backend integration tests. Browser E2E used the existing local CareerFit database, which contained imported and seeded data. The public Job API reported 991 Jobs during the runtime check. This database is not the same dataset as the controlled algorithm benchmark.

The detailed commands and raw-result pointers are recorded in `evidence/CHAPTER5_EVIDENCE_20260703.md`. Surefire XML reports, Playwright output, backend runtime logs, benchmark logs, and `evaluation/result.json` provide the underlying artifacts.

NOTE: [Figure 5.1 – Evaluation environment showing isolated Testcontainers tests, controlled benchmark data, and the local Compose/E2E runtime – to be created later.]

## 5.3 Dataset and Evaluation Design

### 5.3.1 Controlled Algorithm Dataset

`AlgorithmEvaluatorTest` loads `evaluation/controlled-dataset.json`. The dataset contains 50 Jobs and 100 unique CVs across IT domains. It defines 300 training pairs and 300 holdout pairs. The file hash observed during every repeated run was `6e935639ba6d3290dca8ad91a35d714c5e30c7e69a59af23ddbcf89fcc5cc2f2`.

The benchmark is intentionally synthetic. Each Job is associated with a training-positive CV and a separate holdout-positive CV sharing a latent skill that is not emphasized in the original JD. The baseline ranks candidates using the original lexical representation. A positive feedback event supplies evidence from the training CV; Rocchio updates the Job vector; and the system reranks candidates. Metrics are then computed on holdout relevance rather than using the same CV that generated feedback as the only success case.

This design tests causal behavior: whether a defined relevance signal can move a related holdout item upward. It does not reproduce organic recruiter behavior, naturally imbalanced applicant pools, demographic variation, adversarial CV writing, or changing labor-market terminology. The deliberately planted latent feature also makes a large improvement possible and should not be interpreted as the expected effect size in production.

### 5.3.2 Local Runtime Data

The integrated runtime used Flyway seed data and previously imported Job records. It supports realistic API volume and complete application workflows, but it is not a labeled relevance dataset. Consequently, it is suitable for functional/E2E and small latency checks, not for calculating ranking precision or fairness. E2E uses demo Candidate, Recruiter, and Administrator accounts and changes local database state.

## 5.4 Backend Automated Testing

The complete backend suite was executed through the Maven Wrapper using `.\mvnw.cmd test`. It compiled 125 application source files and 17 test source files, started Testcontainers, validated and applied 14 Flyway migrations, and executed 15 Surefire test suites.

Table 5.2. Backend automated test results

| Measure | Result |
|---|---:|
| Test suites | 15 |
| Tests | 63 |
| Failures | 0 |
| Errors | 0 |
| Skipped | 0 |
| Aggregated Surefire test time | 81.564 s |
| End-to-end command wall time | 111.9 s |

The suites covered application context startup, API contracts, auto-apply, candidate profile, Job service, matching batch behavior, PDF/document extraction, quality validation, Rocchio, scoring, settings, TF-IDF, production configuration, and security hardening. `AlgorithmEvaluatorTest` was also included in the complete suite.

The zero-failure result means the registered JUnit assertions passed in this environment. It does not mean the output was warning-free. Flyway 9.22.3 warned that PostgreSQL 16.14 is newer than the highest version it reported as tested. Some tests intentionally log exceptions while verifying failure isolation. More importantly, isolated benchmark runs produced a background optimistic-lock exception that was not counted by Surefire, as discussed in Section 5.6.

## 5.5 Controlled Algorithm Results

The benchmark used Rocchio parameters α=1.0, β=0.75, and γ=0.15. Coverage remained 1.0 before and after feedback. Table 5.3 reports the fresh artifact values.

Table 5.3. Baseline and Rocchio results on the synthetic holdout scenario

| Metric | Baseline | After Rocchio | Delta |
|---|---:|---:|---:|
| Precision@5 | 0.012000 | 0.168000 | +0.156000 |
| Recall@5 | 0.060000 | 0.840000 | +0.780000 |
| nDCG@3 | 0.030000 | 0.810000 | +0.780000 |
| nDCG@5 | 0.037737 | 0.817737 | +0.780000 |
| nDCG@10 | 0.050424 | 0.830424 | +0.780000 |
| MRR | 0.058755 | 0.823617 | +0.764862 |
| HitRate@5 | 0.060000 | 0.840000 | +0.780000 |
| Coverage | 1.000000 | 1.000000 | 0 |

The increase across position-sensitive metrics shows that the controlled positive feedback moved relevant holdout CVs toward the top of the ranking. Precision@5 remains 0.168 after feedback, which means the top-five lists are not composed entirely of labeled relevant items. Recall@5 and HitRate@5 reach 0.84 in the designed scenario, while 16 percent of query cases still do not place the expected holdout item within the first five results.

Three additional executions used the same dataset without modifying data or labels. All returned exit code zero and exactly the same dataset hash, baseline nDCG@5 (0.037737056145), Rocchio nDCG@5 (0.817737056145), and delta (0.78). Their wall times were 62.67, 66.80, and 68.66 seconds. Metric equality supports deterministic benchmark output for the observed code and dataset.

NOTE: [Figure 5.2 – Baseline versus Rocchio Precision@5, Recall@5, nDCG@5, MRR, and HitRate@5 – to be created later from `evaluation/result.json`.]

## 5.6 Concurrency Observation in Benchmark Runs

Every one of the three isolated benchmark logs contains `StaleObjectStateException` for a Matching row. The exception originates from background scheduled or asynchronous behavior updating an entity version concurrently. JUnit still reports success because the benchmark assertion thread completes and the exception does not propagate as a test failure.

This result creates two separate conclusions. The ranking metrics are reproducible, because the recorded dataset and metric values are identical across runs. The benchmark runtime is not operationally clean, because a background persistence conflict occurs in every observed repetition. Reporting only the green test status would hide this reliability problem.

The required correction is to isolate scheduling from algorithm tests or control it explicitly, ensure asynchronous work starts after the initiating transaction commits, and define retry or conflict handling for optimistic locking. A future acceptance criterion should fail the evaluation when uncaught background exceptions appear, even if all foreground JUnit assertions pass.

## 5.7 Frontend Build Evaluation

`npm run build` performs TypeScript checking with no output emission and then builds the production assets with Vite. The command completed successfully and transformed 2,475 modules.

Table 5.4. Frontend build artifacts

| Artifact | Uncompressed size | Gzip size |
|---|---:|---:|
| `index.html` | 1.07 kB | 0.60 kB |
| Main CSS | 61.91 kB | 12.27 kB |
| Main JavaScript | 802.15 kB | 238.38 kB |

Vite emitted a warning because the JavaScript chunk exceeded 500 kB after minification. The build is valid, but the warning indicates that route-based dynamic imports or manual chunking should be evaluated. No browser performance profile was collected in this pass, so bundle size must not be translated directly into page-load time.

## 5.8 Browser End-to-End Evaluation

The Playwright Chromium project ran against the Vite frontend, host backend, and Compose PostgreSQL. Four P0 scenarios passed in 33.9 seconds.

Table 5.5. Chromium P0 workflow results

| Scenario | Main verification | Result |
|---|---|---|
| Guest search and Job detail | Public search API, Job cards, detail navigation, login-to-apply control | Passed |
| Candidate apply and withdraw | Login, personalized Jobs, application creation, history, withdrawal | Passed |
| Recruiter creates a JD | Recruiter login, creation form, API response, new Job visible | Passed |
| Administrator suspends/reactivates a user | Admin login, user operation, state transition and restoration | Passed |

The result demonstrates integration for the four scripted paths in Chromium. It is not a full UAT study: no independent participants performed tasks, no usability scale or task time was collected, and seeded credentials were used. Firefox and WebKit projects were not run in this evidence snapshot. The Recruiter scenario creates a timestamped test Job but does not automatically remove it; repeated E2E therefore changes local database contents and requires an explicit cleanup policy.

NOTE: [Figure 5.3 – P0 E2E workflow matrix with screenshots or Playwright evidence links – to be added later.]

## 5.9 Security-Oriented API Checks

Small negative checks were executed against the integrated backend to verify public access, missing authentication, invalid authorization scheme, valid Candidate authentication, and role denial.

Table 5.6. API authorization observations

| Request | Expected | Observed | Result |
|---|---:|---:|---|
| Public Job search without token | 200 | 200 | Passed |
| Candidate CV endpoint without token | 401 | 401 | Passed |
| Current-account endpoint with invalid Basic scheme | 401 | 401 | Passed |
| Current-account endpoint with valid Candidate bearer token | 200 | 200 | Passed |
| Administrator dashboard with Candidate bearer token | 403 | 403 | Passed |

These checks confirm selected URL-layer outcomes, not a complete penetration test. They do not evaluate token theft, cross-site scripting, CV malware, rate limiting, secret rotation, SQL injection tooling, or every ownership boundary. The state-changing email GET and raw token storage identified in Chapters 3 and 4 remain unresolved security findings.

## 5.10 Runtime Health, Monitoring, and Local Latency

The public Job API returned HTTP 200, and both liveness and readiness health groups returned `UP`. The Prometheus endpoint returned HTTP 200 with approximately 349 kB of metrics in the observed request. However, the aggregate `/actuator/health` endpoint returned HTTP 503 with status `DOWN`, while component details were hidden by configuration. The aggregate failure was not root-caused during this pass.

Table 5.7. Runtime observations

| Endpoint or check | Observation |
|---|---|
| `/api/jobs/search?page=0&size=20` | 200 |
| `/actuator/health` | 503, `DOWN` |
| `/actuator/health/liveness` | 200, `UP` |
| `/actuator/health/readiness` | 200, `UP` |
| `/actuator/prometheus` | 200 |

This mixed state must not be summarized as monitoring health passing. Core APIs and health groups were available, but the aggregate health indicator shows an unresolved dependency or component failure. A production readiness decision requires the failing component to be identified and corrected or explicitly excluded with justification.

Thirty sequential warm requests to the public Job search endpoint produced a mean of 61.79 ms, p50 of 55.20 ms, p95 of 85.11 ms, minimum of 44.99 ms, and maximum of 99.32 ms. This was a single-client localhost sample without concurrent load, controlled warm-up, network latency, repeated batches, or resource monitoring. It demonstrates only that the observed local endpoint responded consistently in this small sample; it is not a throughput or capacity benchmark.

NOTE: [Figure 5.4 – Local Job-search latency distribution for the 30-request sample – to be created later.]

## 5.11 Evaluation Summary by Research Question

Table 5.8. Answers supported by current evidence

| Question | Evidence-supported answer |
|---|---|
| Does Rocchio change holdout ranking in the intended direction? | Yes for the controlled synthetic causal dataset; the same large metric delta was reproduced across three runs. |
| Is the backend automated suite passing? | Yes: 63/63 registered tests passed, but background optimistic-lock exceptions remain visible in isolated benchmark logs. |
| Do the main browser workflows execute? | Four Chromium P0 scenarios passed; cross-browser coverage and participant UAT remain incomplete. |
| Are selected authorization boundaries enforced? | The five observed public/authentication/role checks returned expected statuses; this is not comprehensive security validation. |
| Is the runtime fully healthy? | No such conclusion is supported: liveness/readiness and core APIs were up, but aggregate health was 503 DOWN. |
| Is performance production-ready? | Not evaluated. Only a small sequential localhost latency sample was collected. |

## 5.12 Threats to Validity

### 5.12.1 Construct Validity

The synthetic benchmark measures retrieval behavior for planted relevance relationships, not hiring success, candidate quality, fairness, or recruiter satisfaction. Matching metrics cannot establish whether a person should be employed. Scripted E2E success measures workflow execution, not usability or user trust.

### 5.12.2 Internal Validity

The benchmark test runs within a Spring context where schedulers and asynchronous behavior can interfere with persisted Matching rows. The observed optimistic-lock exceptions demonstrate this threat. Local E2E shares a mutable database, so prior data and tests can affect the selected first Job or existing application state. Network and external font/image requests may also affect browser timing.

### 5.12.3 External Validity

The controlled data lacks organic recruiter judgments, evolving terminology, demographic diversity, adversarial behavior, and production class imbalance. The runtime is one Windows workstation with Docker Desktop, one local PostgreSQL instance, and one Chromium browser. Results cannot be generalized to enterprise load, different browsers, cloud deployment, or a population of real users.

### 5.12.4 Reproducibility

The benchmark dataset hash and generated JSON support algorithm reproduction. Maven Wrapper, Flyway, Testcontainers, package lock, and recorded commands support environment reconstruction. Reproducibility is weakened by the dirty working tree, mutable local database, timestamped E2E records, external web assets, and missing automatic cleanup. The final thesis release should be associated with a clean commit or archive and immutable evidence bundle.

## 5.13 Chapter Summary

Fresh evaluation showed that all 63 registered backend tests passed, the frontend production build succeeded, and four Chromium P0 workflows executed end to end. The controlled Rocchio scenario produced a deterministic improvement in holdout ranking metrics across repeated runs, but the result is limited to a deliberately constructed synthetic dataset. The same runs exposed a recurring background optimistic-lock exception that the JUnit status did not capture. Security spot checks behaved as expected, while runtime health remained mixed because the aggregate actuator endpoint was down despite operational core APIs, liveness, readiness, and Prometheus output. These results support a technically functioning academic prototype with demonstrable feedback behavior; they do not support a claim of production readiness, broad recruitment effectiveness, or completed usability validation.
