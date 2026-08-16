# Review Draft — Chapter 4 and Conclusion Compression

This file is a review draft only. `CareerFit-Thesis-Report.docx` has not been modified.

## CHAPTER 4. TESTING AND EVALUATION

### 4.1 Evaluation Objectives

The evaluation addressed four questions: (1) whether lexical scoring with Rocchio moves holdout items in the intended direction after feedback; (2) whether the backend modules, migrations, and selected contracts pass automated tests; (3) whether the main Guest, Candidate, Recruiter, and Administrator workflows execute through the integrated browser application; and (4) what the local environment shows about authorization, runtime health, monitoring, and API latency. Algorithm behavior, software correctness, browser workflows, security observations, and runtime evidence were assessed separately because success in one area does not establish success in the others. In particular, neither a controlled ranking improvement nor a passing software suite establishes production readiness or real-world hiring effectiveness.

### 4.2 Evaluation Environment

[Retain Table 4.1 unchanged.]

Backend integration tests used isolated PostgreSQL 16 Testcontainers with Flyway migrations, while browser tests exercised the local Docker-based CareerFit stack through desktop Chrome. The controlled algorithm dataset was evaluated separately from the mutable local database used for E2E and latency observations. Table 4.1 records the relevant versions and configurations; these values describe the evaluated environment rather than a production deployment.

This separation prevents seeded local runtime data from being interpreted as algorithm ground truth.

### 4.3 Dataset and Evaluation Design

#### 4.3.1 Controlled Algorithm Dataset

`AlgorithmEvaluatorTest` used a controlled synthetic dataset containing 50 Jobs, 100 CVs, 300 training pairs, and 300 holdout pairs. Training feedback and holdout evaluation were separated: feedback from a training CV updated the Job vector, while metrics were calculated from different holdout pairs. The scenario intentionally placed a shared latent skill in related training and holdout CVs so that the test could determine whether Rocchio moved a relevant unseen item upward.

Before feedback, the system ranked CVs with the original lexical Job vectors. Training-pair feedback then changed the learned vectors and triggered Matching recomputation; evaluation compared the resulting holdout order rather than reusing training pairs as the success cases.

This design evaluates a specific causal behavior of the feedback loop. It does not reproduce organic recruiter judgments, demographic variation, adversarial CVs, changing market language, or naturally unbalanced applicant pools. The designed relationship can produce a large improvement; therefore, the result must not be interpreted as expected performance on real recruitment data.

#### 4.3.2 Local Runtime Data

The integrated environment used Flyway seed data, imported Jobs, and records created by E2E tests. This data supports complete workflows and small local runtime observations but has no independent relevance labels. It was therefore not used to calculate ranking accuracy, fairness, or hiring quality.

### 4.4 Backend Automated Testing

The complete backend suite was executed with the Maven Wrapper using `clean verify`, including PostgreSQL Testcontainers and Flyway migrations.

[Retain Table 4.2 unchanged.]

The 35 suites cover authentication, CV and Job lifecycles, Matching, Recommendation, Feedback, AutoFit, Applications, Talent Pool, analytics, reporting, moderation, and the controlled algorithm experiment.

### 4.5 Controlled Algorithm Results

The benchmark applied Rocchio with α=1.0, β=0.75, and γ=0.15. Coverage remained 1.0 before and after feedback.

[Retain Table 4.3 unchanged.]

Position-sensitive metrics improved strongly after the designed feedback. nDCG@5 increased from approximately 0.038 to 0.838, while Recall@5 and HitRate@5 increased from 0.06 to 0.86. Precision@5 reached 0.172, so many top-five items were still not labeled relevant. The feedback loop therefore moved related holdout CVs upward without making every result relevant.

[Retain Figure 4.1 unchanged.]

The large delta is expected because the dataset contains a designed latent relationship. It supports the implemented Rocchio behavior but does not estimate real recruitment outcomes.

Coverage remaining 1.0 indicates that improvement was not obtained by excluding difficult queries or shrinking the evaluated result set. Repeated runs with fixed data and parameters reproduced the same metrics.

### 4.6 Concurrency Observation in Benchmark Runs

The final isolated benchmark completed without the background consistency conflict observed in earlier runs. Feedback learning begins after transaction commit and prior Matching state is cleared before recomputation, which made the evaluated run stable and deterministic. This does not establish production concurrency safety; concurrent-load recovery, retry, timeout, and conflict behavior remain unevaluated.

### 4.7 Frontend Build Evaluation

TypeScript checking, ESLint, the Vite production build, and bundle validation all passed. The build transformed 2,362 modules, and its largest JavaScript chunk remained below Vite's warning threshold. These results confirm build correctness for the evaluated source; they do not constitute browser performance or user-experience measurement.

[Remove current Table 4.4 because individual asset sizes do not add material research evidence.]

### 4.8 Browser End-to-End Evaluation

Playwright exercised the integrated frontend, backend, PostgreSQL database, and desktop Chrome. All 49 tests passed.

[Retain Table 4.5 unchanged.]

The 49 tests cover representative workflows across all four user contexts, including reporting and moderation. They provide automated workflow evidence rather than independent participant UAT; Firefox and WebKit were outside the evaluated scope.

### 4.9 Security-Oriented API Checks

Selected API checks covered public access, missing or invalid authentication, valid Candidate authentication, and denial of an Administrator route to a Candidate.

[Retain Table 4.6 unchanged.]

The observed 200, 401, and 403 responses support the tested authentication and role boundaries. These are authorization spot checks, not a penetration test, and do not cover every ownership, abuse, malware, rate-limit, or secret-management risk.

### 4.10 Runtime Health, Monitoring, and Local Latency

[Retain Table 4.7 unchanged.]

The core Job API, aggregate health, liveness, readiness, and Prometheus endpoints returned the observations shown in Table 4.7. Mail health was excluded when mail delivery was disabled, so an intentionally unavailable provider did not make the local aggregate status misleading.

Thirty sequential warm localhost requests to Job search produced a mean of 61.79 ms, p50 of 55.20 ms, p95 of 85.11 ms, minimum of 44.99 ms, and maximum of 99.32 ms. The small single-client sample contains no concurrent load, production network, repeated batches, or resource monitoring. It is a local consistency observation, not a throughput, capacity, or production-performance benchmark.

[Remove Figure 4.2 because it repeats the five latency statistics without adding another analytical relationship.]

### 4.11 Evaluation Summary by Research Question

[Retain Table 4.8 unchanged.]

### 4.12 Threats to Validity

#### 4.12.1 Construct Validity

The synthetic benchmark measures planted retrieval relationships, not hiring success, fairness, or recruiter satisfaction. Matching metrics cannot determine whether a person should be employed. Scripted E2E tests measure workflow execution rather than usability, explanation quality, or user trust. The selected measures therefore support technical behavior only.

#### 4.12.2 Internal Validity

Asynchronous learning and persisted Matching state could affect repeatability. The benchmark starts learning after commit, clears previous Matching state, and checks background outcomes. The final run also checked logs for background failures. Browser tests use explicit conditions and clean up created Jobs, although shared records and scheduler timing can still affect reruns.

The browser suite also avoided relying only on the first seeded Job and removed the Job created by the Recruiter workflow, reducing dependence on mutable catalogue order.

#### 4.12.3 External Validity

The controlled data lacks organic feedback, demographic diversity, adversarial behavior, and production class imbalance. Runtime evidence comes from one Windows workstation, local PostgreSQL, Docker Desktop, and desktop Chrome. No independent participant UAT was conducted. Results cannot be generalized to other browsers, cloud deployment, enterprise load, or real users.

#### 4.12.4 Reproducibility

The Maven Wrapper, Flyway migrations, Testcontainers, package lock, controlled dataset, result artifacts, and recorded commands support reproduction. Exact reproduction is nevertheless limited because the evaluated worktree and E2E database were not frozen as a clean release. A final reproducible release should preserve a clean source archive together with the corresponding evidence package.

### 4.13 Chapter Summary

The evaluation confirmed controlled Rocchio behavior and the tested software workflows. It supports a functioning academic prototype within the evaluated environment, not production readiness, hiring effectiveness, or production-scale performance.

## PART 3. CONCLUSION

### 1. Summary of Results

CareerFit IT AutoPilot integrates public Job discovery, role-based workflows, reviewed CV processing, separate Matching and Recommendation, Rocchio feedback, controlled AutoFit, actionable email, moderation, and audit records. Ranking evidence remains separate from application and policy decisions so that users retain visible control points.

Evaluation passed 141 backend tests across 35 suites and all 49 integrated Chrome tests. In the controlled synthetic benchmark, Rocchio moved related holdout CVs upward, including an nDCG@5 increase from approximately 0.038 to 0.838. This evidence supports an academic prototype, not production readiness or real-world hiring effectiveness.

[Remove Table Con.1 because it repeats Chapter 4 and currently contains stale 46/49 browser-test wording.]

### 2. Achievement of Thesis Objectives

#### 2.1 Role-Based Recruitment Platform

The prototype supports public Job exploration and distinct Candidate, Recruiter, and Administrator workflows. Integrated Chrome tests cover representative role paths, including reporting and moderation; complete route coverage, other browsers, and independent usability evaluation remain outside scope.

#### 2.2 CV and Job-Description Processing

The system supports uploaded and manual CVs, file validation, extraction, configured OCR fallback, review and confirmation, and structured Job validation. Tests support these workflows; hardened storage, OCR availability, and broader document variation remain unresolved.

#### 2.3 Matching and Recommendation

CareerFit provides an interpretable TF-IDF/cosine Matching baseline, reasons, a separate Potential assessment, and profile-oriented Recommendation. Tests support the scoring and contracts, but lexical matching remains limited for synonyms, career context, and multilingual terms; scores are not hiring probabilities.

#### 2.4 Feedback Learning

Typed feedback updates learned Job vectors through Rocchio and triggers Matching recomputation. The controlled training/holdout benchmark confirms the intended adaptation, but not ranking quality or concurrency safety under organic production feedback.

#### 2.5 Policy-Driven Automation and Email Action

AutoFit checks consent, CV, Job, threshold, duplicates, and per-run limits before creating Applications. Actionable email uses hashed expiring tokens and confirmation before execution. These controls support bounded automation, while rate limiting, provider testing, and deployment hardening remain incomplete.

#### 2.6 Auditability and Evaluation

Audit records cover major Application, Feedback, Automation, moderation, and administrative events. Evaluation supports the prototype scope, while complete audit coverage and production observability remain unverified.

[Retain Table Con.2 because it provides a concise objective-to-evidence mapping; its browser evidence already uses the verified 49-test value.]

### 3. Discussion

#### 3.1 Value of an Interpretable Baseline

The lexical baseline exposes tokens, weights, shared terms, and score construction, supporting explanation, debugging, and reproducible comparison. Its value is transparency rather than semantic completeness. Future semantic or hybrid methods should therefore be compared with this baseline rather than assumed superior.

#### 3.2 Human-in-the-Loop as System Structure

Users validate data, inspect reasons, choose actions, configure or pause automation, provide feedback, and review records. These control points make automation reviewable, but human involvement alone does not remove bias or unsafe thresholds; representative evaluation, appeals, access control, and audit review remain necessary.

#### 3.3 Meaning of the Rocchio Improvement

The large synthetic improvement follows from the designed latent relationship between training and holdout CVs. It confirms reranking in the intended direction under fixed conditions, not a comparable improvement from organic feedback, which may be sparse, inconsistent, delayed, or influenced by nontechnical factors.

#### 3.4 Test Results versus Background Errors

Asynchronous workflows require checking background logs and side effects in addition to foreground assertions. The corrected benchmark no longer reproduced the observed conflict, but production concurrency and recovery remain unevaluated.

#### 3.5 Product Positioning

CareerFit is an IT-focused, explainable, policy-controlled academic prototype integrating separate Matching and Recommendation, feedback learning, controlled actions, moderation, and auditability. It neither replaces professional judgment nor establishes superiority over commercial platforms.

### 4. Limitations

#### 4.1 Data and Algorithm Limitations

The synthetic dataset lacks organic language, recruiter disagreement, demographic analysis, adversarial CVs, and changing terminology. TF-IDF uses a static corpus and simple tokenization, while Potential assessment relies on a manually maintained skill-transfer knowledge base.

#### 4.2 Evaluation Limitations

Automated tests do not establish complete coverage or user acceptance. Evaluation used desktop Chrome and sequential local latency requests; concurrency, capacity, accessibility, other browsers, real moderation, fairness, and hiring outcomes remain unevaluated.

#### 4.3 Security and Privacy Limitations

Email-action controls reduce selected risks, but frontend tokens remain in `sessionStorage`, and local CV storage lacks demonstrated malware scanning, encryption, retention, and recovery. Rate limiting, privacy governance, and production security assessment remain necessary.

#### 4.4 Reliability and Maintainability Limitations

Audit generation is not fully centralized, production recovery is unverified, and moderation lacks appeal and restoration workflows. The evaluated dirty worktree also prevents the commit hash from identifying an exact release.

[Remove Table Con.3 because the revised four limitation subsections already state the same constraints without duplication.]

### 5. Future Work

Future work should prioritize:

1. building frozen, independently labeled datasets with temporal holdouts, reviewer agreement, hard negatives, and fairness analysis;
2. comparing lexical, semantic, and hybrid retrieval while preserving inspectable reasons;
3. strengthening sessions, rate limits, malware scanning, encrypted storage, retention, recovery, and email-provider testing;
4. evaluating concurrency, failure recovery, accessibility, other browsers, load, and user acceptance; and
5. completing moderation appeals, centralized audit redaction, protected object storage, and reproducible release archives.

These priorities address verified limitations and are not current features.

### 6. Closing Remarks

CareerFit demonstrates an auditable Human-in-the-Loop recruitment workflow using interpretable ranking, feedback learning, and controlled automation. It provides a tested academic prototype and reproducible baseline while keeping final recruitment decisions and real-world effectiveness outside the established evidence.
