# Phase 2 Implementation Report: Settings UI, Polling, Catalog, and CV UX

## 1. Goal
Hoàn thiện API/UI cho Demo Mode và Candidate experience; hoàn tất Phase 2 theo yêu cầu Checkpoint 2.

## 2. API / Backend Implementation
1. **Settings**:
   - `SettingsResponse` đã được cập nhật trả về `demoModeEnabled` và `EffectiveTimingSummary`.
   - `SettingsController` merge `AutomationPolicy` state để UI dễ tiêu thụ.
   - Endpoint PATCH được bổ sung field để safely update the toggle không ghi đè normal preferences.
2. **Catalog API**:
   - `RecommendationService.java` trả về class wrap `CatalogResponse` chứa active jobs (`jobs`), cùng `cvStatus` và `message`.
   - Dù chưa có CV completed, catalog vẫn load fallback profile-based jobs và hiển thị trạng thái giải thích thay vì trống.
   - Matching score chỉ trả về nếu CV matching thành công và đạt low threshold.
3. **CV DOCX Pipeline**:
   - Quá trình ingestion CV tái sử dụng hàm `pdfService.extractFromFile` (đã hỗ trợ "docx" internally) và bounded by states `UPLOADED`, `VALIDATING`, `PROCESSING`.
   - Tiến trình kết thúc ở `SCORING_DONE` hoặc `FAILED` with details.
   - Retry logic (`/api/cv/{cvId}/retry`) đã được thêm vào `CVController` để allow recovery failed CVs easily.

## 3. Frontend Implementation
1. **Shared Settings Component**:
   - `DemoModeSettings` component được viết và chèn an toàn trong layout của Candidate và Recruiter.
   - Không render outside Settings component.
   - Loading/success action messages dùng `tone-warning` action styles để phân biệt với info bình thường, render đúng language.
2. **Catalog / Polling**:
   - Cập nhật `RecommendationsPage` trong `App.tsx`:
     - Nếu `demoMode` là ON, query retry polling là 5s.
     - Nếu OFF, quay về normal fetching interval (300s).
   - "Refresh" manual button uses React Query's `invalidateQueries` with query status fetching indicator.
   - Catalog state never disappears khi chưa có CV.
3. **Wording PDF**:
   - `uploadedPdf` trong translation resource được update thành generic "Tệp CV đã tải lên" / "CV file uploaded" để phù hợp với DOCX.

## 4. Testing & Verifications

Verified on 2026-08-16:

- `Backend/careerfit-backend`: `./mvnw.cmd test-compile` — PASS.
- `Backend/careerfit-backend`: `./mvnw.cmd '-Dtest=Phase1OutboxPolicyTest,Phase2SettingsCatalogCvIntegrationTest' test` — PASS: Phase 1 has 9 tests; `Phase2SettingsCatalogCvIntegrationTest` has 3 tests.
- `Frontend`: `npm run type-check` — PASS.
- `Frontend`: `npx playwright test tests/phase2-ui.spec.ts tests/job-description.spec.ts --project=chromium --reporter=line` — PASS: 3 tests.
- Root: `git diff --check` — PASS.

The actual Phase 2 integration class is `Phase2SettingsCatalogCvIntegrationTest`: it verifies settings timing/toggle, unscored active catalog entries and enriched matching entries, and CV success, failure, owner-only retry, and recovery. Browser coverage is in `Frontend/tests/phase2-ui.spec.ts` and exercises settings PATCH plus unscored catalog rendering.

## 5. Verdict
## Scope and risk

No Phase 3+ workflow, migration, import, reset, or main-database mutation was performed. The only external dependency mocked in the CV integration test is document extraction/storage; persistence, state transitions, authorization, and API contracts use Testcontainers.

**READY_FOR_REAUDIT**: Checkpoint 2 (Phase 2) is ready for independent verification.
