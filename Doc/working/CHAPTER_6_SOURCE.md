## 6.1 Summary of Results

This thesis designed, implemented, and evaluated CareerFit IT AutoPilot as a Human-in-the-Loop recruitment automation platform for the information technology domain. The implemented system combines public Job discovery, Candidate profile and CV management, Recruiter vacancy and candidate workflows, TF-IDF and cosine-based matching, profile-oriented recommendation, Rocchio relevance feedback, application management, AutoFit policy and scheduling, actionable email, analytics, and administrative monitoring in one modular-monolith backend and React frontend.

The fresh evaluation provides evidence for several technical outcomes. The complete backend suite executed 63 registered tests across 15 suites with no reported JUnit failures, errors, or skips. The frontend passed TypeScript checking and Vite production compilation. Four Chromium P0 workflows passed end to end: public Job search and detail, Candidate application and withdrawal, Recruiter JD creation, and Administrator user suspension/reactivation. Selected authorization checks returned the expected public, unauthenticated, authenticated, and role-denied HTTP statuses.

The controlled Rocchio benchmark demonstrated the intended causal behavior on its synthetic dataset. With 50 Jobs, 100 unique CVs, 300 training pairs, and 300 holdout pairs, nDCG@5 increased from 0.037737 to 0.817737, Recall@5 and HitRate@5 increased from 0.06 to 0.84, and MRR increased from 0.058755 to 0.823617. Three repeated runs returned the same dataset hash and the same observed metric values. These results demonstrate deterministic adaptation in the constructed latent-skill scenario; they do not estimate effectiveness on organic recruitment data.

The evaluation also identified non-green evidence. All three repeated benchmark logs contained a background `StaleObjectStateException`, even though the foreground JUnit result passed. The aggregate Actuator health endpoint returned HTTP 503 and `DOWN`, while liveness, readiness, Prometheus, and the core Job API remained available. The frontend build emitted a warning for an 802.15 kB main JavaScript chunk. These findings prevent a defensible production-readiness claim.

Table 6.1. Consolidated result status

| Evaluation area | Supported result | Qualification |
|---|---|---|
| Backend automated tests | 63/63 registered tests passed | Background exceptions require separate detection |
| Controlled feedback benchmark | Large, deterministic improvement after Rocchio | Synthetic causal design; not production effectiveness |
| Frontend build | TypeScript and Vite build passed | Main JavaScript chunk exceeded warning threshold |
| Browser workflows | 4/4 Chromium P0 scenarios passed | No Firefox/WebKit or independent participant UAT |
| Authorization spot checks | Observed 200/401/403 outcomes matched expectations | Not a complete security assessment |
| Runtime APIs | Core Job API, liveness, readiness, and Prometheus responded | Aggregate health remained 503 DOWN |
| Local latency sample | Mean 61.79 ms and p95 85.11 ms for 30 sequential Job queries | No concurrency, controlled load, or production network |

## 6.2 Achievement of Thesis Objectives

### 6.2.1 Role-Based Recruitment Platform

The objective of providing role-specific workflows was achieved at prototype level. Guests can browse public Jobs and employer information. Candidates can maintain profiles, CVs, and portfolios; inspect matching and recommendation results; apply or withdraw; submit feedback; and configure automation. Recruiters can manage Jobs, inspect applicants and discovered candidates, invite candidates, and update application status. Administrators can monitor users, Jobs, audit records, and email/token state. The Chromium P0 suite confirms representative workflows for all four interface roles, although it does not cover every route or browser.

### 6.2.2 CV and Job-Description Processing

The project implements uploaded and manually created CVs, explicit processing statuses, file-type and magic-byte validation, PDF and DOCX extraction, image and scanned-PDF OCR fallback, sparse-text warning, failure reason persistence, and structured quality signals. Job creation includes structured fields and conditional validation. This objective is supported by source inspection and automated tests for extraction, validation, Job service behavior, and integration contracts.

The implementation remains bounded by local storage, external Tesseract availability, page and timeout limits, and a deterministic but simple tokenizer. It should be described as a functioning ingestion pipeline rather than a universal document-understanding system.

### 6.2.3 Matching and Recommendation

CareerFit implements a static-corpus TF-IDF vectorizer, cosine similarity, normalized score, LOW/MEDIUM/HIGH labels, potential heuristics, and shared-term reasons. CV–JD matching and profile-oriented recommendation remain separate workflows, and Matching state remains separate from Application state. Scoring, TF-IDF, batch isolation, and API contract tests passed.

The objective was achieved as an interpretable lexical baseline. It was not achieved as a semantic equivalence model: punctuation-sensitive technology names, synonyms, Vietnamese phrases, career transitions, and context beyond term overlap remain limitations. The displayed percentage is a normalized similarity value, not a calibrated probability of recruitment success.

### 6.2.4 Feedback Learning

The system records GOOD_MATCH, POTENTIAL, BAD_MATCH, and NOT_INTERESTED feedback with actor and channel information. Positive and negative learning signals update the Job representation using Rocchio with α=1.0, β=0.75, and γ=0.15. Recalculation begins from the original Job vector and current feedback history, which supports idempotent metric output. Affected Matchings are marked stale and rescored asynchronously.

The controlled benchmark strongly supports mathematical behavior in the planted latent-skill scenario. However, the repeated optimistic-lock exception shows that algorithm correctness and reliable background execution are not equivalent. This objective is therefore achieved for controlled feedback behavior but only partially achieved for clean concurrent operation.

### 6.2.5 Policy-Driven Automation and Email Action

AutoFit policies store thresholds, enablement, notification preferences, cooldown, quota, quiet-hour, timezone, digest, and pause settings. Scheduled services recompute stale results, send digests and high-match notifications, clean expired email actions, and execute auto-apply. Auto-apply validates the default CV, Job status, threshold, and duplicate state and limits creation to three applications per run.

This objective is achieved as configurable prototype automation, but control coverage is not uniform. Notification policy and application authorization are separate paths, scheduler annotations and configuration keys are not one authoritative source, and the current email feedback mechanism changes state through a public GET using a raw stored token. Confirmation-before-execution and token hashing are required before the action channel can be considered production-safe.

### 6.2.6 Auditability and Evaluation

Major application, feedback, automation, and administrative actions create structured audit rows. Notification delivery and email-action statuses add operational evidence. The project includes unit, integration, security, algorithm, and E2E tests and produces a dataset-hashed benchmark artifact.

Audit coverage is not yet formally proven for every state-changing endpoint, and direct audit repository calls can produce inconsistent metadata conventions. The evaluation successfully exposed contradictions that a pass-only report would miss, particularly background concurrency exceptions and aggregate health failure. This transparency is an important result of the thesis methodology.

Table 6.2. Objective assessment

| Objective | Assessment | Primary evidence |
|---|---|---|
| Role-based web platform | Achieved for prototype scope | API contracts and four Chromium P0 workflows |
| CV/JD ingestion and validation | Achieved for supported formats and configured OCR | Extraction, validation, Job, and integration tests |
| Explainable lexical matching/recommendation | Achieved as baseline | TF-IDF/scoring tests and implemented reasons |
| Rocchio feedback adaptation | Achieved algorithmically; partial operational reliability | Repeated deterministic benchmark and concurrency finding |
| AutoFit and actionable communication | Partially achieved | Auto-apply tests and implemented scheduler; email GET/token gap |
| Security and auditability | Partially verified | Security tests and spot checks; incomplete penetration/audit coverage |
| Production readiness | Not demonstrated | Aggregate health failure and missing scale/user/security evidence |

## 6.3 Discussion

### 6.3.1 Value of an Interpretable Baseline

CareerFit deliberately uses a lexical vector-space baseline rather than presenting a dense or generative model as inherently superior. This choice makes the input tokens, weights, shared terms, feedback centroids, and score calculation inspectable. For an academic system, that transparency supports explanation, debugging, boundary testing, and defense of the implementation.

The cost is reduced semantic capability. A model that cannot reliably equate related technologies or interpret career context may under-rank suitable candidates and over-rank documents containing repeated keywords. The correct conclusion is not that TF-IDF is sufficient for all recruitment, but that it provides a reproducible baseline against which future semantic or hybrid retrieval can be compared.

### 6.3.2 Human-in-the-Loop as System Structure

Human-in-the-Loop in CareerFit is expressed through multiple control points: users supply and validate data, inspect reasons, configure policy, apply or invite, provide feedback, pause automation, and review audit history. The system distinguishes score evidence from Application state and policy action. This is more meaningful than adding a generic approval button after an otherwise opaque automated decision.

Human oversight nevertheless does not automatically make a system fair or safe. Users may accept misleading explanations, policies may contain inappropriate thresholds, and feedback can reproduce individual or institutional bias. HITL must therefore be accompanied by measured error analysis, access control, contestability, audit review, and representative evaluation.

### 6.3.3 Meaning of the Rocchio Improvement

The large benchmark delta is expected from the experimental design: a latent skill is deliberately shared between a training-positive CV and a holdout-positive CV but omitted from the initial JD emphasis. Rocchio moves the Job vector toward the training example, making the holdout example easier to retrieve. Repeated equality of the metrics shows implementation determinism under this scenario.

The result does not show that every real recruiter feedback event improves ranking by 0.78 nDCG@5. Organic feedback may be inconsistent, sparse, biased, delayed, or based on salary and location rather than technical relevance. Production evaluation would require independently labeled data, time-based splits, multiple recruiters, disagreement analysis, and online or offline comparison against a baseline without feedback.

### 6.3.4 Green Assertions versus Operational Cleanliness

The background `StaleObjectStateException` demonstrates why test counts cannot be the only release criterion. JUnit assertions can pass while asynchronous tasks log failures outside the foreground test lifecycle. Similarly, liveness and readiness can be UP while aggregate health is DOWN. A credible system report must examine logs, health components, artifacts, and side effects in addition to process exit codes.

Future CI should fail on uncaught background exceptions, disable or control unrelated schedulers during algorithm tests, wait for asynchronous tasks explicitly, and archive logs as first-class test results. Operational health should expose the failing component in a protected environment so that a 503 response can be root-caused without publishing sensitive details.

### 6.3.5 Product Positioning

CareerFit should be positioned as an IT-focused, explainable, policy-controlled academic recruitment prototype. It demonstrates how Job portal functions, ranking, recommendation, feedback, automation, email actions, and audit can be connected. It should not be positioned as having better general-purpose AI than commercial recruiter platforms or as replacing professional recruitment judgment.

The defensible differentiation is workflow control: matching and recommendation are separate, policy is explicit, users retain control points, feedback has a visible mathematical effect, and actions can be audited. This differentiation is narrower but better supported by the implementation.

## 6.4 Limitations

### 6.4.1 Data and Algorithm Limitations

The controlled dataset is synthetic and intentionally structured to demonstrate causal learning. It lacks natural language variation, recruiter disagreement, demographic analysis, adversarial CVs, and changing labor-market distributions. The runtime database contains seed and scraped Jobs but no validated relevance ground truth. TF-IDF uses a hand-curated static IT corpus, whitespace tokenization, and maximum IDF for unknown terms. Potential detection uses fixed shared-term and seniority heuristics.

### 6.4.2 Evaluation Limitations

The backend suite contains 63 tests but does not prove exhaustive path coverage. Only four browser P0 cases were run, only with Chromium, and no independent users participated. The security checks were targeted status-code observations rather than penetration testing. Local latency used 30 sequential warm requests on one workstation and provides no concurrency or capacity evidence. Aggregate health remained unresolved.

### 6.4.3 Security and Privacy Limitations

The notification email action stores a raw token and executes state changes through GET. Access tokens are stored in frontend localStorage. Local CV storage lacks documented malware scanning, encryption, retention enforcement, and recovery testing. Public Swagger and Prometheus access are suitable for local demonstration but should be restricted in production. Privacy, fairness, and data-subject governance have not been validated with a real deployment population.

### 6.4.4 Reliability and Maintainability Limitations

Repeated optimistic-lock exceptions indicate an unresolved concurrency boundary. Effective scheduler timings are embedded in annotations while related configuration keys also exist. Audit records are written directly by multiple services. Some frontend API mappers retain mock fallback values, and the main JavaScript bundle exceeds Vite's warning threshold. The evaluated worktree was dirty, weakening exact source-to-evidence reproducibility.

Table 6.3. Principal limitations and impact

| Limitation | Impact on conclusions |
|---|---|
| Synthetic benchmark | Supports causal behavior only, not real hiring effectiveness |
| Lexical representation | Limits synonym, semantic, and context understanding |
| Background optimistic-lock exception | Prevents clean reliability conclusion |
| Aggregate health DOWN | Prevents system-wide health or production-readiness claim |
| Chromium-only scripted E2E | Limits cross-browser and usability conclusions |
| State-changing email GET/raw token | Prevents production-safe actionable-email claim |
| Small localhost latency sample | Cannot establish scale, throughput, or cloud performance |
| Dirty worktree and mutable E2E database | Weakens exact experiment reproduction |

## 6.5 Future Work

The first priority is correctness and security hardening. Email actions should store token hashes, bind tokens to a single purpose and target, display a non-mutating confirmation page on GET, execute through POST, and protect against replay and link scanners. Asynchronous Rocchio and scheduler work should run after commit with explicit retry/conflict handling, and tests should fail on background exceptions. Aggregate health must be diagnosed, while management endpoints should be protected outside local development.

The matching baseline can then be extended using a hybrid approach. Domain-aware tokenization and aliases should first address punctuation-sensitive technologies and Vietnamese phrases. Sparse lexical scores can be combined with sentence or skill embeddings and structured constraints. Any new model should be evaluated against the current baseline on a frozen, independently labeled dataset rather than assumed superior because it is more complex.

Evaluation should expand to recruiter-labeled CV–JD pairs, temporal holdout sets, inter-rater agreement, hard-negative analysis, subgroup/fairness checks, and calibration of labels. A controlled user study should measure task completion, time, comprehension of explanations, trust calibration, and ability to override automation. Cross-browser E2E, load testing, failure injection, backup/restore, email delivery, and security testing should be included in release evidence.

Operational development should move CVs to protected object storage, define encryption and retention policy, centralize audit generation and redaction, externalize scheduler configuration, add automatic E2E cleanup, split frontend bundles by route, and associate each release with a clean commit and immutable evidence archive. Integration with external ATS or Job boards should occur only after consent, ownership, error recovery, and audit contracts are defined.

## 6.6 Conclusion

CareerFit IT AutoPilot demonstrates an end-to-end approach to controlled recruitment automation in the IT domain. It combines an accessible Job portal with interpretable CV–JD matching, profile-based recommendation, explicit relevance feedback, policy-driven AutoFit actions, role-specific workflows, and audit-oriented state management. The implementation makes the relationship between data, score, feedback, policy, action, and audit visible rather than presenting recruitment automation as a single opaque prediction.

Fresh evaluation supports the operation of the academic prototype: registered backend tests passed, the frontend built successfully, selected browser workflows completed, authorization spot checks behaved as expected, and the synthetic Rocchio scenario produced deterministic holdout-ranking improvement. The same evidence also exposed unresolved concurrency, health, security, bundle, and evaluation limitations. Accordingly, the thesis concludes that CareerFit is a functioning and technically defensible prototype for studying explainable Human-in-the-Loop recruitment automation, not a validated production hiring system.

The most important contribution is therefore not a claim of universal model superiority. It is the implementation and critical evaluation of a workflow in which lexical evidence can be inspected, feedback can update ranking reproducibly, automation is represented by explicit policy and state, and limitations remain visible. This foundation supports future work on semantic matching, stronger governance, representative evaluation, and production-grade reliability without sacrificing human oversight or traceability.
