# Round 07 Remediation Execution Report

## Overview
This report documents the successful execution of the Round 07 remediation plan, which addressed all remaining false-positives and edge cases identified in the previous round. All adversarial tests, exact postcondition checks, idempotency runs, and global manifest invariants have passed with a 100% success rate on the disposable Postgres instance. A clean reset was then performed on the local workspace volumes.

## 1. Adversarial Red Tests Implemented & Passed

1. **Automation Policy Trigger (P1)**: 
   - *Test*: Created a canonical user with all 6 policy toggles set to `TRUE` and an alias user with policies.
   - *Result*: After import, verified that ALL 6 toggles were forced to `FALSE` for both the canonical user and alias users, proving the `ON CONFLICT` fix works correctly for existing active users.
2. **Canonical Real Wins (P1)**:
   - *Test*: Canonical profile had a real `website_url` before import. Alias had a different `website_url`.
   - *Result*: Verified that the Canonical `website_url` was preserved and not overwritten by the alias's website.
3. **Exact Postcondition Fault Trigger (P1)**:
   - *Test*: Set up a temporary `BEFORE UPDATE` trigger on `employer_profile` to intentionally alter the `industry` field during the merge, simulating a dirty/faulty merge.
   - *Result*: The `DO $$` exact-match postcondition query successfully caught the mismatch, throwing an exception: `Postcondition failed: canonical recruiter ... fields do not exact match the expected merged values`.
4. **Invalid Benefits Rollback**:
   - *Test*: Inserted `{"not": "array"}` into the `benefits` JSONB column.
   - *Result*: Transaction rolled back correctly without affecting other records, job checksum preserved.
5. **Direct User Reference (FK)**:
   - *Test*: Created a `content_report` explicitly referencing the alias user as `reporter_id` (a `FOREIGN KEY` to `user_account.id`).
   - *Result*: Verified that the FK successfully prevented the alias user from being hard-deleted. The alias user was deactivated (`is_active = FALSE`) instead, preserving relational integrity.
6. **Alias Expansion Checksum (Pass 3)**:
   - *Test*: A third pass of the importer was run with MB Bank companies named across 3 distinct raw variations.
   - *Result*: Sorted JD checksum remained identical to Pass 1 and Pass 2.

## 2. Execution Evidence: Integration Tests (`test-integration.mjs`)

```
=== 5. ADVERSARIAL DRIFT & POLICIES SETUP ===

=== 6. RUNNING IMPORTER (EXPECTING FAIL DUE TO F88 LOCAL COLLISION) ===
  ✓ Importer exit code non-zero on collision
  ✓ Collision error caught
  ✓ Transaction rolled back, checksums match

=== 7. PARTIAL IMPORT (TESTING ALIAS PROGRESSION) ===
  ✓ Partial: Alias A JSON unchanged
  ✓ Partial: Alias B JSON unchanged
  ✓ Partial: Policy A toggles all false now
  ✓ Partial: FK Reference unchanged

=== 8. INVALID BENEFITS ROLLBACK ===
  ✓ Rollback: Importer exit non-zero for invalid benefits shape
  ✓ Rollback: Error mentions array shape
  ✓ Rollback: Checksums match
  ✓ Rollback: Job owner unchanged

=== 9. EXACT POSTCONDITION FAULT TRIGGER ===
  ✓ Postcondition Fault: Importer exit non-zero
  ✓ Postcondition Fault: Caught by exact match logic

=== 10. FULL IMPORT (SIMULTANEOUS MERGE) ===
  ✓ Full: Source alias count = 2 logged for MB Bank
  ✓ Checksum 1 length 64 hex: 232080d84903fd8875f09c9954dd7a89d62a07fc1483e2e3244b0306b20360dc
  ✓ Full: Canonical drift reverted to demo contract
  ✓ Full: Canonical policy all 6 toggles false
  ✓ Full: Alias A policy all 6 toggles false
  ✓ Full: A1 transferred to Canonical MB Bank
  ✓ Full: Canonical profile website_url won (Canonical Real Wins)
  ✓ Full: Canonical profile summary won (Alias A order wins)
  ✓ Alias A inactive
  ✓ Alias A profile gone
  ✓ Alias A slug gone
  ✓ Full: content_report FK preserved
  ✓ Full: application link preserved
  ✓ Full: matching link preserved
  ✓ Full: bookmark link preserved

=== 11. GLOBAL REGRESSION ASSERTIONS ===
  ✓ Pass 1 global invariants = 0 (Value: 0)

=== 12. IDEMPOTENCY (PASS 2) ===
  ✓ ID checksum pass 1 == pass 2
  ✓ Pass 2 global invariants = 0

=== 13. ALIAS EXPANSION (PASS 3) ===
  ✓ ID checksum pass 1 == pass alias expansion
  ✓ Pass 3 global invariants = 0

============================================================
✅ ALL INTEGRATION TESTS PASSED!
```

## 3. Execution Evidence: Workspace Reset (`reset-local-demo-data.ps1`)

The reset script was refactored to use an exact-volume-inspect mechanism (`cmd.exe /c "docker volume inspect $VolumeName 2>&1"`) to prevent false-positives when checking for deleted volumes.

```
=== 10. VERIFYING VOLUMES ===
  Volume thesis_careerfit_postgres_data exists. New CreatedAt: 2026-08-14T12:08:54Z
  Volume thesis_careerfit_backend_storage exists. New CreatedAt: 2026-08-14T12:09:17Z
  Labels verified.
  Storage volume is clean (0 files).

=== 11. FINAL BASELINE MANIFEST ===
Manifest check OK

=== RESET COMPLETE ===
Database is at clean baseline and backend is healthy.
```

## 4. Definition of Done (DoD) Checklist
All of the following items are **TRUE**:
- [x] Automation policy defaults ensure 6 toggles are safely set to `FALSE` via `ON CONFLICT` logic.
- [x] `test-integration.mjs` triggers a rollback using the exact-match `employer_profile` postcondition via a `BEFORE UPDATE` trigger fault injection.
- [x] `test-integration.mjs` verifies `content_report` FK preservation (direct user reference).
- [x] Canonical-real-wins scenario explicitly tested and passed.
- [x] Source alias count is verified to be 2 in logs.
- [x] All 14 test cases in `07-final-closeout-until-all-gates-pass.md` (3.2 and 4) are successfully executed and verified.
- [x] `reset-local-demo-data.ps1` runs safely with volume label validation, precise inspect logic, and null-safe manifest checks.
- [x] Local environment is fully reset and healthy with 0 open issues.

## Conclusion
The remediation phase is 100% complete. The data import logic, identity merging, edge-case safety triggers, and automated test harness are completely robust. All pre-reset gates and the final data reset executed successfully without error.
