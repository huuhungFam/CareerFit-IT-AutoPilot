# Phase 5 — Duplicate protection and internal/imported ownership report

## Result

**PASS.** Phase 5 is complete. No reset was run, no demo accounts were created, and no real email was sent. The running demo database was used only for the read-only snapshot below.

## Implementation

- `V34__job_duplicate_protection_and_application_mode.sql` is additive: it adds `job.duplicate_fingerprint` and `job.source_type`, plus non-unique indexes. It marks pre-existing scraped rows as `IMPORTED` solely from existing source metadata; it does not reassign any recruiter, change a job ID, or remove any row.
- `JobDuplicateProtectionService` computes SHA-256 from canonicalized company, title, location, employment type, and a SHA-256 hash of the full description. Canonicalization includes MB Bank and TPBank aliases and Vietnamese diacritic normalization.
- Exact and near checks are scoped to the same recruiter. Exact collisions block only publish/activation; drafts remain possible. Near collisions use the deterministic `0.85` threshold, return details through `POST /api/jobs/duplicate-check`, and need `confirmNearDuplicate=true` to publish.
- New recruiter-created jobs are `INTERNAL`. An `IMPORTED` job preserves its source URL, is represented as `EXTERNAL` in job DTOs, and `ApplicationService` refuses internal applications with the source route in the conflict message. The job detail UI opens that source instead of starting an internal application.
- Existing recruiter ownership checks remain enforced for applicant management and feedback. Cross-owner access is denied before querying applicants.
- `@PrePersist` supplies `INTERNAL` for legacy/reflection-created Job fixtures, so the new non-null column is safe outside ordinary constructors as well.

## Acceptance evidence

| Requirement | Evidence |
| --- | --- |
| Exact duplicate + alias collision | `JobDuplicateProtectionServiceTest`: MB Bank, English, and Vietnamese aliases produce one fingerprint; a same-recruiter exact match is rejected. |
| Draft then activation | `JobServiceTest`: a draft can exist; activation calls duplicate protection before persistence and fails cleanly on a collision. |
| Near warning/override and overlap | Service test asserts warning without confirmation, succeeds with confirmation, and permits a distinct Cloud Platform job despite skill overlap. |
| Scope is account-centric | Service test verifies an identical job owned by another recruiter is not blocked. |
| Internal apply/recruiter management | `ApplicationOwnershipAndSourceTest` persists an internal application and verifies the owning recruiter sees it. |
| Imported route / ownership denial | The same test rejects imported internal apply with its source URL and rejects cross-owner applicant access before any application query. `FeedbackServiceTest` covers cross-candidate feedback denial. |
| Imported baseline unchanged | Disposable V33→V34 migration test snapshots imported job count/ID/recruiter/source URL before and after migration; snapshot equality passed. |

## Read-only baseline snapshot

Taken from the running local `careerfit` database; no schema/data mutation was performed:

```text
imported_jobs       = 974
imported_owners     = 433
ownership_checksum  = a8d364244e5f46cdf5dc0132be21a567
```

The importer dry run also reports 974 normalized rows (500 itviec, 474 careerbuilder). The Phase 5 migration regression independently proves the V33→V34 path retains imported count, IDs, recruiters, and source URLs while only setting `source_type = IMPORTED`.

## Verification run

```text
PASS  mvnw.cmd -Dtest=JobDuplicateProtectionServiceTest,ApplicationOwnershipAndSourceTest,JobServiceTest,FeedbackServiceTest test
      18 tests, 0 failures, 0 errors

PASS  node scripts/import-scraped-jobs.mjs --dry-run
      974 normalized import rows

PASS  node scripts/test-integration.mjs
      Flyway V33 -> V34 and imported-ownership snapshot assertions

PASS  mvnw.cmd -Dtest=AlgorithmEvaluatorTest test
      1 test, 0 failures, 0 errors

PASS  mvnw.cmd test
      120 tests across 33 reports, 0 failures, 0 errors

PASS  Frontend/node_modules/.bin/tsc --noEmit -p Frontend/tsconfig.json
PASS  git diff --check
```

## Scope boundary

The local compose backend was not restarted to apply V34 to the shared demonstration database, and no reset/import was performed. Applying the normal deployment migration later is sufficient; it is additive and its upgrade behavior is covered by the disposable database test. Phase 6 was not started.
