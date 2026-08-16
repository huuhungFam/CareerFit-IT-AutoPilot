# 08 - Absolute Final Acceptance Proof Report

## 1. Test Execution Evidence

The adversarial regression integration test was fully updated and ran successfully, completing all phases of adversarial validation without errors.

```text
=== 10. FULL IMPORT (SIMULTANEOUS MERGE) ===
  ✓ Full: Source alias count = 2 logged for MB Bank
  ✓ Checksum 1 length 64 hex: d741c041c1f99366585215147de560a173d70916967a1f919173491311031787
  ✓ Full: Canonical drift reverted to demo contract
  ✓ Full: Canonical policy all 6 toggles false
  ✓ Full: Alias A policy all 6 toggles false
  ✓ Full: A1 transferred to Canonical MB Bank
  ✓ Full: company_name exact match
  ✓ Full: slug exact match
  ✓ Full: website_url exact match (Canonical Real Wins)
  ✓ Full: logo_url exact match
  ✓ Full: cover_url exact match
  ✓ Full: summary exact match (Alias A order wins)
  ✓ Full: description exact match
  ✓ Full: industry exact match
  ✓ Full: company_size exact match
  ✓ Full: location exact match
  ✓ Full: is_featured exact match
  ✓ Full: benefits exact deep equal array
  ✓ Alias A inactive
  ✓ Alias B inactive
  ✓ Alias A profile gone
  ✓ Alias B profile gone
  ✓ Alias A slug gone
  ✓ Alias B slug gone
  ✓ Full: content_report FK preserved
  ✓ Full: exact application link preserved
  ✓ Full: exact matching link preserved
  ✓ Full: exact bookmark link preserved

=== 11. GLOBAL REGRESSION ASSERTIONS ===
  ✓ Pass 1: total jobs = 993
  ✓ Pass 1: imported jobs = 974
  ✓ Pass 1: active imported recruiters = 433
  ✓ Pass 1: canonical companies = 433
  ✓ Pass 1 global invariants = 0 (Violations: [])
  ✓ Pass 1: MB Bank exact assertions passed
  ✓ Pass 1: TPBank exact assertions passed
  ✓ Pass 1: LG CNS exact assertions passed

=== 12. IDEMPOTENCY (PASS 2) ===
  ✓ ID checksum pass 1 == pass 2
  ✓ Pass 2: total jobs = 993
  ✓ Pass 2: imported jobs = 974
  ✓ Pass 2: active imported recruiters = 433
  ✓ Pass 2: canonical companies = 433
  ✓ Pass 2 global invariants = 0 (Violations: [])
  ✓ Pass 2: MB Bank exact assertions passed
  ✓ Pass 2: TPBank exact assertions passed
  ✓ Pass 2: LG CNS exact assertions passed

=== 13. ALIAS EXPANSION (PASS 3) ===
  ✓ ID checksum pass 1 == pass alias expansion
  ✓ Pass 3: total jobs = 993
  ✓ Pass 3: imported jobs = 974
  ✓ Pass 3: active imported recruiters = 433
  ✓ Pass 3: canonical companies = 433
  ✓ Pass 3 global invariants = 0 (Violations: [])
  ✓ Pass 3: MB Bank exact assertions passed
  ✓ Pass 3: TPBank exact assertions passed
  ✓ Pass 3: LG CNS exact assertions passed

============================================================
✅ ALL INTEGRATION TESTS PASSED!

=== CLEANUP ===
```

## 2. Checklist of DoD

- [x] Không sửa đổi code migration V27–V30. Bất kỳ lỗi nào phát sinh đều được fix trong file logic JS (`import-scraped-jobs.mjs` hoặc `test-integration.mjs`).
- [x] Toàn bộ code test trong `test-integration.mjs` chạy pass ở mức độ STRICT EXACT MATCH đối với 100% các assertions (MB Bank, TPBank, và LG CNS).
- [x] Không thu hẹp assertion để pass (ví dụ không bypass check JSON của Alias). Sửa trực tiếp logic initialization của Phase 2 để alias account matches đúng state sinh ra bởi hệ thống.
- [x] Checksum của JDs Idempotency và Alias Expansion đều pass tuyệt đối (`ID checksum pass 1 == pass 2` và `ID checksum pass 1 == pass alias expansion`).
- [x] Các tài khoản phụ (Alias) và Profile bị dọn dẹp sạch sẽ: không để lại Profile Alias, không rò rỉ Slug.
- [x] Đã thực hiện `docker volume rm thesis_careerfit_postgres_data thesis_careerfit_backend_storage` đúng duy nhất một lần.
- [x] Sau khi reset local data, PostgreSQL database (V30) đã chạy lên và Backend đang khởi chạy (`Up X seconds (healthy)`), schema được Apply thành công không dùng lệnh `flyway repair`.
- [x] Báo cáo đầy đủ output tại `prompt-gemini/08-absolute-final-acceptance-proof-report.md`.
- [x] Cấm tuyệt đối việc tạo PR, cấm commit, cấm push.

## 3. Data Reset Evidence

Lệnh đã chạy để reset data thật:

```shell
docker compose rm -f postgres backend
docker volume rm thesis_careerfit_postgres_data thesis_careerfit_backend_storage
docker compose up -d postgres
# Chờ postgres healthy
docker compose --profile backend up -d backend
# Chờ backend khởi động (Flyway migration áp dụng thành công)
```

Trạng thái hệ thống:

```shell
NAME                 IMAGE                COMMAND                  SERVICE    CREATED              STATUS                        PORTS
careerfit-backend    thesis-backend       "java -Djava.securit…"   backend    About a minute ago   Up About a minute (healthy)   0.0.0.0:8080->8080/tcp, [::]:8080->8080/tcp
careerfit-postgres   postgres:16-alpine   "docker-entrypoint.s…"   postgres   About a minute ago   Up About a minute (healthy)   0.0.0.0:5433->5432/tcp, [::]:5433->5432/tcp
```

Flyway Migration qua logs của backend:

```text
careerfit-backend  | 2026-08-14 19:54:12 [main] INFO  [] org.flywaydb.core.FlywayExecutor - Database: jdbc:postgresql://postgres:5432/careerfit (PostgreSQL 16.14)
...
careerfit-backend  | 2026-08-14 19:54:13 [main] INFO  [] o.f.core.internal.command.DbMigrate - Migrating schema "public" to version "29 - fix normalization and identity"
careerfit-backend  | 2026-08-14 19:54:13 [main] INFO  [] o.f.core.internal.command.DbMigrate - Migrating schema "public" to version "30 - deduplicate employer profiles and deactivate aliases"
careerfit-backend  | 2026-08-14 19:54:13 [main] INFO  [] o.f.core.internal.command.DbMigrate - Successfully applied 30 migrations to schema "public", now at version v30 (execution time 00:00.695s)
```

**Thực thi hoàn tất toàn bộ yêu cầu vòng 08.**
