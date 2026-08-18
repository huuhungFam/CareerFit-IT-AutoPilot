# Frontend UI History Log

> Generated at: 2026-06-04 14:40:23 +07:00  
> Scope: Frontend UI, UX, routing, API integration, and documentation-related frontend changes.  
> Note: This file reconstructs the conversation history from the current chat context. The chat does not expose exact timestamps for each message, so entries below use chronological order and the generation date as the audit anchor.

## Purpose

This log records what was requested, what was implemented or reviewed, and which frontend areas were affected. It is intended as a lightweight project history for reviewing UI/UX evolution without searching through the chat.

## Current Frontend State Summary

- App supports three access modes: Guest, Candidate, and Recruiter.
- Guest can view overview and public job search/list/detail, but protected features show login-required flows.
- Backend demo login is available:
  - Candidate: `ca` / `1`
  - Recruiter: `re` / `1`
- Candidate UI includes:
  - Dashboard/overview.
  - Job search with suggestions, filters, URL query state, job detail, hover JD preview, sticky apply bar.
  - Upload CV with Document Parser and Manual Creation tabs.
  - Profile & CV with CV management, fixed profile, and Portfolio tabs.
  - Recommendations, Applications, AutoFit, Settings, Advanced Analytics.
  - Rocchio feedback on matched job cards and job detail.
- Recruiter UI includes:
  - Dashboard/overview.
  - Jobs Management / HR Dashboard style page.
  - Applicant/potential match review với Invite/Review/Approve/Reject; Rocchio feedback web hiện Candidate-only.
  - Analytics, Advanced Analytics, AutoFit, Settings.
- URL state has been added for:
  - Public/Candidate jobs: `keyword`, `city`, `level`, `workModel`, `salary`, `domain`.
  - Candidate upload: `tab=manual`.
  - Candidate profile: `tab=cvs|fixed|portfolio`.
  - Advanced analytics: `rangeDays=7|30|90`.
  - Recruiter jobs: path subviews plus `q`, `status`, `sort`.

## Chronological Conversation Log

| Order | Request / Topic | Result / Notes |
|---:|---|---|
| 1 | Read files in `Frontend` and run the web UI. | Frontend project was inspected and run as a local Vite app. |
| 2 | Update frontend startup instructions in README first. | README/startup guidance was updated to explain frontend launch flow. |
| 3 | Summarize existing pages. | Existing pages/routes were reviewed and summarized. |
| 4 | Move left navigation to top navigation like normal websites. | App shell navigation was redesigned from left nav to top header navigation. |
| 5 | Ask where the login form is. | Login page/form was surfaced and integrated into the flow. |
| 6 | Make login card slightly larger. | Login card layout was enlarged and visually adjusted. |
| 7 | Connect to Stitch project `7596409748950063003`, inspect sample designs, and combine them with current UI while ignoring Stitch `DESIGN.md` and using `Frontend/main-design.md`. | Stitch design references were used as UI inspiration while preserving the local design direction. |
| 8 | Main/overview should show job portal style content, search jobs, filter modal, vertical job list, hover JD preview, detail page, sticky bottom bar. | Candidate/guest dashboard and jobs UX were expanded with search, filter modal, job list, hover preview, detail page, and sticky apply bar. |
| 9 | Clicking job card/name/detail should load a new job detail page; hover detail button should also navigate there. | Job cards and hover preview detail CTA were wired to job detail routes. |
| 10 | Hover detail content should scroll and include `Yêu cầu công việc` under `Mô tả công việc`. | Hover JD preview was made scrollable and expanded with job requirements. |
| 11 | Add top employers section to job list. | Featured employers strip was added to job list. |
| 12 | Clicking each featured employer should open a detail page like the provided recruiter/company PDF sample. | Employer detail page was added with company intro, benefits, open jobs, and company metadata. |
| 13 | Redesign top overview charts for both roles based on provided chart references, excluding crossed-out left area, keeping current style. | Overview chart section was redesigned for market/job statistics and IT job demand views. |
| 14 | Clarify that tooltip boxes in chart reference are hover tooltips, not static UI. | Chart UI adjusted to treat those boxes as hover tooltip behavior rather than always-visible elements. |
| 15 | Chart should show total jobs posted on the system, not CV-JD matching count. | Chart copy/data was adjusted toward posted job volume. |
| 16 | Ask what happens after pressing Search in hero search. | Search behavior was reviewed and then changed in later request. |
| 17 | When typing keyword, show suggestions; after Search, navigate to new results page with one-column list and filters on top. Dashboard should show only some new jobs plus View all. | Search suggestions, search results page, filter bar, and dashboard limited-job preview with View all were implemented. |
| 18 | Remove visible `Skill and Expertise` label in suggestions. | Suggestion display was cleaned up so the unwanted label no longer dominates the UI. |
| 19 | Center three statistic cards and decorate them slightly. | Candidate stat cards were centered and visually differentiated. |
| 20 | Review recruiter pages for shared/similar UI and synchronize them. | Recruiter UI components and shared sections were aligned with candidate/common visual language. |
| 21 | Review conversation and decide whether SRS/proposal/backend docs need updates. | Documentation impact was reviewed. |
| 22 | Update docs. | Related docs were updated to reflect UI changes at that time. |
| 23 | In Stitch project, make two pages for two roles: Recruiter Jobs page like `Recruiter: HR Dashboard`; Candidate Upload CV Manual Creation like `Candidate: Manual CV Builder Form`. | Recruiter Jobs Management and Candidate Manual CV Builder UI were created/adapted from Stitch references. |
| 24 | Restore old Document Parser tab; Manual Creation should be added beside it, not replace it. | Upload CV regained two tabs: Document Parser and Manual Creation. |
| 25 | Ask whether one user can upload many CVs and what Candidate Profile means. | Product interpretation clarified: candidates can have multiple CVs; profile is fixed candidate info/preferences. |
| 26 | Convert Candidate Profile into `Hồ sơ & CV`, managing uploaded/manual CVs plus fixed profile tab; add short descriptions. | Candidate Profile became Profile & CV with CV management and fixed profile sections. |
| 27 | Ask whether a Portfolio page is needed and where to put it. | Portfolio was recommended as part of Profile & CV rather than a top-level nav page. |
| 28 | Add Portfolio tab. | Portfolio / Projects tab was added under Profile & CV. |
| 29 | Adjust percentage match badges color from bright green to red by score high-to-low. | Match badge color scale was updated by score. |
| 30 | Remove unnecessary Document Parser card from Upload CV page. | Extra parser card was removed from Upload CV. |
| 31 | Recruiter overview top section should keep earlier version and be separate from Jobs Management. | Recruiter overview and Jobs Management were separated so each role/page has distinct layout. |
| 32 | Update files/docs to match current UI. | Frontend-related documentation was refreshed. |
| 33 | Connect to Stitch and create Settings pages for both roles. | Candidate and Recruiter Settings pages were created. |
| 34 | Ask where settings button is. | Settings entry point was reviewed and surfaced. |
| 35 | Remove settings tab label and make it a gear icon. | Settings became a compact icon button in the header. |
| 36 | Check language in both modes; Vietnamese had mixed English/Vietnamese. | i18n strings were reviewed and many mixed labels were normalized. |
| 37 | Define three frontend roles: Guest, Candidate, Recruiter. Guest has only overview/jobs and login/language actions; move logout into settings; add delete account; mock accounts default to guest. | Guest mode, mock login, settings logout/delete account behavior, and role-specific nav were implemented. |
| 38 | Guest should not show score/potential labels; Back to jobs returns dashboard; protected tabs show login-required; Apply opens login popup; improve Back button. | Guest job behavior, protected route messaging, apply prompt modal, and back button styling were updated. |
| 39 | Rename non-user to guest. | UI terminology was updated to Guest. |
| 40 | Make logged-in and guest UI slightly different, but not too different. | Guest and authenticated hero/shell visual states were differentiated subtly. |
| 41 | Review and upgrade UX if possible; update `srs.md`, `proposal.md`, `architecture.md`, `README.md`, backend guide and backend agent prompt. | UX pass and documentation updates were performed. |
| 42 | Check whether current UI fits backend and report. | Frontend/backend compatibility was reviewed and reported. |
| 43 | Ask whether fix is in backend. | Frontend/backend responsibility was clarified. |
| 44 | Backend was fixed; update frontend needed parts. | Frontend was adjusted to match backend changes. |
| 45 | Update files to match current UI. | Documentation/files were synchronized again. |
| 46 | Backend added Advanced Analytics; create a separate new UI while keeping old UI. | Advanced Analytics page/UI was added separately. |
| 47 | Upgrade UX to be very polished, smooth, and detailed. | Broad UX polish was applied across the frontend. |
| 48 | Update frontend documentation for what changed. | Frontend change documentation was updated. |
| 49 | Ask whether Path Params and Query Params preserve page/search state on reset/share links. | Current URL-state support was reviewed. |
| 50 | Ask what should be added/changed. | Recommended additions were proposed for URL state and shareable routes. |
| 51 | Implement all recommended `Nên làm` and `Nên làm sau`. | URL-backed state was implemented for jobs, upload tabs, profile tabs, advanced analytics range, recruiter jobs queries/subviews, plus mock session persistence. |
| 52 | Execute `Frontend/FEEDBACK_UI_PROMPT.md`. | Rocchio feedback API and UI were added for candidate matched jobs/detail and recruiter applicant/ranking cards. |
| 53 | Create frontend markdown log showing when what was executed, and list this chat if possible. | This `FRONTEND_UI_HISTORY_LOG.md` file was created as the reconstructed frontend history log. |
| 54 | Execute the three recommended supplement items and update logs/docs. | Recruiter candidate match filters, matching edge-case UI, and validation suggestions UI were implemented; supplement prompt and this log were updated. |
| 55 | Execute the 7-step list and prepare detailed real-test script. | Candidate application flow, recruiter status actions, Automation `Run now`, Auto-Apply backend contract docs, and E2E test script were completed. |
| 56 | Review documentation and update what changed. | README, SRS, proposal, architecture, backend guides, frontend guides and supplement prompt were aligned with current frontend/backend contracts. |

## Recent Implementation Log

### 2026-06-14 00:00 +07:00 - Header, Admin And Automation UI Polish

- Added language switch directly on the Login/Register screen.
- Kept Login submit label as `Đăng nhập` / `Sign in`.
- Added admin frontend fallback data for dashboard, users, jobs, audit logs and email monitor so `/admin` is usable during frontend-only testing when backend is offline.
- Made admin table actions update local demo state when backend calls fail.
- Restyled `/candidate/automation` policy controls with card-like settings rows, switch toggles, improved active policy cards and polished slider/input styling.
- Fixed recruiter jobs search icon alignment by centering the icon within `.recruiter-search-field`.
- Changed quick test login so `ca` / `1`, `re` / `1`, and `ad` / `1` require real backend-seeded accounts instead of creating a temporary mock session.
- Verification: `npm run build` passed; headless Chrome smoke confirmed login language switch, admin dashboard cards, admin user rows, automation controls and centered search icon.

### 2026-06-13 00:00 +07:00 - Frontend QA And Login UX Polish

- Ran `npm run build`; TypeScript and Vite production build passed.
- Smoke-tested Guest, Candidate and Recruiter routes with headless Chrome at desktop and mobile widths.
- Verified public search, protected-route login prompt, Candidate jobs/upload/profile/applications/automation/advanced analytics, Recruiter jobs/filter/analytics/automation/settings and mobile job list.
- Fixed demo login UX so `ca` / `1`, `re` / `1`, and `ad` / `1` use backend-seeded accounts for real JWT sessions.
- Converted the auth card to a real form with username/password autocomplete and submit semantics.
- Added an inline favicon to remove the browser favicon 404 during UI QA.
- Updated root `README.md` and `Frontend/FRONTEND_CODE_GUIDE_FOR_BACKEND.md` to describe the immediate demo-login behavior.
- Known note: when backend is offline, quick test accounts cannot log in because login no longer creates a temporary mock session.

### 2026-06-06 00:57 +07:00 - Documentation Sync

- Reviewed current frontend/backend documentation against code state.
- Updated root `README.md` with Rocchio feedback UI, recruiter match filters, matching edge-case UI, validation suggestions and current Automation policy controls.
- Updated `srs.md` with recruiter candidate filter requirements, tie-break metadata, validation signal structure and current `/api/matches/{matchingId}/feedback` endpoint.
- Updated `proposal.md` demo/MVP list with match filters, edge cases and validation suggestions.
- Updated `architecture.md` with recruiter candidate filtering flow, edge-case frontend behavior, feedback endpoint and Definition of Done additions.
- Updated `Backend/backend-implementation-guide.md` and `Backend/backend-agent-prompt.md` to remove stale `/api/matchings/...` feedback endpoint references and add recruiter candidate/tie-break/validation signal contract notes.
- Updated `Frontend/frontend-implementation-guide.md`, `Frontend/FRONTEND_CODE_GUIDE_FOR_BACKEND.md`, and `Frontend/frontend-supplement-prompt.md` to reflect the stateful Automation policy UI and remaining header/settings quick-toggle backlog.
- Updated `TEST_CASES.md` and `Backend/careerfit-backend/BACKEND_CODE_GUIDE.md` so feedback tests/docs use `type`, `channel`, and `role` query params, and corrected the frontend guide to note that Candidate Apply now calls `POST /api/applications`.
- Replaced stale Automation policy references `/api/automation/policies/me` with the current backend contract: `GET/PATCH /api/automation/policy`, `PATCH /api/automation/policy/email-notifications`, and `POST /api/automation/auto-apply/run-now`.
- Replaced stale `/api/automation/actions/...` email-action references with the current public `GET /api/email-action/redeem?token=...` contract and documented automation pause/resume endpoints.
- Corrected `Frontend/FRONTEND_CODE_GUIDE_FOR_BACKEND.md` implementation status so application flow, feedback UI, Automation policy, recruiter candidate discovery and Advanced Analytics are listed as connected backend contracts instead of mock/static backlog.
- Standardized the current UI summary in root `README.md` to Vietnamese with diacritics.

### 2026-06-05 22:50-23:20 +07:00 - Application Flow And Auto-Apply Run-Now

- Connected candidate apply from job cards/details to `POST /api/applications`.
- Connected `/candidate/applications` to `GET /api/applications/me`.
- Connected candidate withdraw/skip action to `DELETE /api/applications/{applicationId}`.
- Connected recruiter candidate Approve/Reject buttons to `PATCH /api/recruiter/applications/{applicationId}/status`.
- Extended Automation Policy UI with Auto-Apply enable/threshold controls backed by `GET/PATCH /api/automation/policy`.
- Added Automation page manual `Run now` action calling `POST /api/automation/auto-apply/run-now` so demo/test does not wait for the backend scheduler.
- Updated frontend/backend docs:
  - `README.md`;
  - `BACKEND_DOCUMENTATION.md`;
  - `Backend/careerfit-backend/README.md`;
  - `Frontend/FRONTEND_CODE_GUIDE_FOR_BACKEND.md`;
  - `CAREERFIT_E2E_TEST_SCRIPT.md`.
- Verification:
  - `npm run build` passed.
  - Backend `.\mvnw.cmd test` passed with 18 tests, 0 failures, 0 errors, 1 Testcontainers context test skipped because Docker environment was not visible in that shell.

### 2026-06-06 17:00 +07:00 - List Metadata API Type Sync

- Added optional `ListMetaDto` support in `Frontend/src/lib/api.ts`.
- Candidate application pages, candidate match pages, recruiter discovery/ranking, and applicant pages can now receive backend metadata with:
  - `generatedAt`;
  - `lastUpdatedAt`;
  - `resultState`;
  - `message`;
  - `suggestions`.
- Updated frontend/backend guide docs to tell UI work to prefer metadata for empty-state copy and refresh hints.
- Verification:
  - `npm run build` passed.

### 2026-06-05 22:10-22:25 +07:00 - Backend Policy And Recruiter Discovery Integration

- Connected Automation Policy UI to backend:
  - `GET /api/automation/policy`;
  - `PATCH /api/automation/policy`;
  - `PATCH /api/automation/policy/email-notifications`.
- Added real UI controls for:
  - global email notification toggle;
  - high-match email toggle;
  - high-match threshold;
  - daily digest toggle;
  - max email quota;
  - notification cooldown hours;
  - quiet hours;
  - replacement-after-skip delay.
- Connected recruiter candidate discovery to `GET /api/recruiter/jobs/{jobId}/candidates`.
- Kept mock recruiter candidates only as fallback when backend is down or using mock job ids.
- Updated recruiter candidate cards to use backend `applicationStatus`, `hasApplied`, and `tie` metadata.
- Connected Invite button to `POST /api/recruiter/jobs/{jobId}/candidates/{candidateId}/invite`.
- Added structured backend validation error support in `src/lib/api.ts` so `error.fieldErrors.fields[]` is preserved.
- Verification:
  - `npm run build` passed.

### 2026-06-05 01:37 +07:00 - Supplement UX Items

- Added recruiter candidate match filters for `HIGH`, `POTENTIAL`, `HIGH_OR_POTENTIAL`, `APPLIED`, and `NOT_APPLIED`.
- Kept existing `Applied CVs` / `AI Potential Matches` tabs and added filter chips as a separate layer.
- Added recruiter candidate empty state for filters with no matching candidates.
- Added candidate/job matching edge-case UI:
  - actionable no-match empty state with reset/clear/update/upload CTAs;
  - low-match-only warning with improvement CTAs;
  - stable tie-score ranking helper and tie-break note surface.
- Added validation suggestion UI for Manual CV Builder and Fixed Profile fields:
  - quality flags;
  - warnings;
  - field-level suggestion styling.
- Updated `Frontend/frontend-supplement-prompt.md` so completed items are no longer listed as missing work.
- Verification:
  - `npm run build` passed.
  - Browser DOM smoke check confirmed recruiter filter bar and `HIGH_OR_POTENTIAL` filtering on `/recruiter/jobs/job-01/applicants?match=HIGH_OR_POTENTIAL`.
  - Candidate validation route could not be visually smoke-tested in Browser because the current browser session was authenticated as recruiter and redirected protected candidate routes, but TypeScript build passed.

### 2026-06-04 14:40 +07:00 - Frontend History Log

- Created `Frontend/FRONTEND_UI_HISTORY_LOG.md`.
- Added a reconstructed chronological log of the current chat.
- Added current frontend state summary and route/query-state notes.

### 2026-06-04 - Rocchio Feedback UI

- Added `MatchFeedback` type.
- Added `matchingId?: string` and `feedback?: MatchFeedback` to `Job`.
- Preserved `matchingId` from candidate match cards.
- Added `careerfitApi.submitMatchFeedback(...)`.
- Added candidate feedback controls:
  - `GOOD_MATCH`
  - `POTENTIAL`
  - `BAD_MATCH`
  - `NOT_INTERESTED`
- Added recruiter feedback controls:
  - `GOOD_MATCH`
  - `POTENTIAL`
  - `BAD_MATCH`
- Added optimistic selected state, disabled submit state, rollback on failure, and inline error.
- Kept public job cards free of feedback controls.

### 2026-06-04 - URL State And Shareable Routes

- Jobs page now preserves search/filter state in query params.
- Candidate Upload CV preserves selected tab in query params.
- Candidate Profile & CV preserves selected tab in query params.
- Advanced Analytics preserves selected range in query params.
- Recruiter Jobs preserves search, status, sort, selected job, and subview in path/query params.
- Mock login session persistence was added so reloading protected links keeps the intended role.

### 2026-06-18 18:55 +07:00 - E2E Action Feedback And Contract Fixes

- Reviewed `ketqua_test.md` against the manual E2E runbook.
- Added visible success/error feedback for candidate apply/withdraw/skip, recruiter invite/approve/reject/potential feedback, and automation policy updates.
- Fixed login requests so an expired JWT stored from an older session is not attached to public `/api/auth/login`; this previously made valid demo credentials appear invalid.
- Invalidated the application query after apply so `/candidate/applications` reloads current backend data.
- Mapped backend `APPROVED`, `REJECTED`, and `NOT_INTERESTED` statuses instead of collapsing all of them into `Reviewing`.
- Connected recruiter `Review` and `View CV` buttons to a candidate detail modal using discovery DTO data.
- Connected `Mark potential` to recruiter Rocchio feedback (`POTENTIAL`).
- Corrected E2E PowerShell response paths: `applicationId` for applications and `data.content` for Admin Spring Page responses.
- Documented that Manual CV and recruiter JD forms remain UI prototypes; added direct API validation commands until those forms are wired.
- Verification:
  - `npm run build` passed.
  - Authenticated browser smoke passed for `re / 1`, recruiter jobs, backend discovery data, and the CV review modal.
  - Full frontend build passed.

### 2026-06-19 17:45 +07:00 - E2E Rerun Fixes And Real Candidate/Recruiter Forms

- Reviewed the completed `ketqua_test.md` rerun and separated expected conflicts from actual frontend gaps.
- Fixed E2E data selection so apply chooses an unapplied job, recruiter approve uses the invite response application ID, and Admin suspend targets the exact authenticated candidate ID.
- Replaced simulated Candidate PDF upload and Manual CV creation with `POST /api/cv/upload` and `POST /api/cv/manual`.
- Connected Candidate CV list/default selection and Fixed Profile read/update to backend APIs. Email is intentionally read-only in this profile form.
- Added real recruiter Create JD modal backed by `POST /api/jobs`, followed by recruiter-job refetch.
- Updated AutoFit range controls with visible values and local drag state so dragging does not trigger a PATCH on every pixel.
- Improved the application withdraw/skip action emphasis and alignment.
- Deduplicated repeated reason/skill chips to remove React duplicate-key warnings found during browser smoke testing.
- Verification:
  - `npm run build` passed.
  - Backend Maven tests: 20 passed, 0 failures, 0 errors, 0 skipped with Docker Desktop running.
  - Live browser smoke passed for candidate CV list, Fixed Profile save, recruiter Create JD modal, and 390px mobile overflow check.
  - Exact Admin suspend test returned `403 ACCOUNT_DISABLED` for the suspended candidate token; the account was activated again immediately.

### 2026-06-20 01:50 +07:00 - Candidate Seniority And Recruiter Salary Contract

- Bổ sung thứ tự seniority cho Manual CV: `Intern`, `Fresher`, `Junior`, `Mid`, `Senior`, `Lead`, `Principal`.
- Trường lương Create JD tự định dạng dấu phẩy hàng nghìn khi nhập; currency mặc định là `VND` và vẫn cho chọn `USD`.
- Recruiter job list không còn lấy lương, kỹ năng và mô tả giả từ mock fallback; frontend đọc các trường thật do `/api/recruiter/jobs` trả về.
- Xác minh API runtime: Candidate profile/CV trả `200`; job test đã tạo được đọc lại với salary currency `VND` và dữ liệu JD đúng database.
- `npm run build` thành công.

### 2026-06-20 11:40 +07:00 - Real Candidate Portfolio CRUD

- Thay dữ liệu Portfolio tĩnh bằng React Query đọc `GET /api/candidates/me/portfolio`.
- Thêm form/modal tạo và sửa link/project, link mở tab mới, xác nhận xóa và success/error feedback.
- Bổ sung loading, API error và empty state; không fallback sang portfolio mẫu khi backend lỗi hoặc danh sách rỗng.
- Chỉnh riêng breakpoint mobile để section heading và nút thêm xếp dọc, không ảnh hưởng desktop.
- Kiểm chứng browser: create/update/delete và cleanup link/project pass; viewport 390x844 không tràn ngang; console không có warning/error.
- `npm run build` thành công.

### 2026-07-18 12:20 +07:00 - Candidate Pagination, Automation Mapping, Recruiter Portfolio

- Candidate Jobs chuyển sang page size 20; UI giữ các page đã tải và nút `Xem thêm 20 việc làm` tự ẩn khi hết `totalPages`.
- `careerfitApi` map Automation Policy hai chiều để các control high-match email, threshold, quota/ngày và cooldown lưu đúng contract backend.
- Recruiter review modal hiển thị portfolio candidate khi backend trả `portfolioVisible=true`; nếu candidate tắt `showPortfolioAfterApply`, UI không render link/project.
- `npm run build` thành công sau thay đổi UI/API mapper.

### 2026-07-18 13:00 +07:00 - Frontend Debug, Resilience And Real Employer Integration

- Bổ sung script chuẩn `type-check`, `lint`, `test`; thêm ESLint flat config và cập nhật Vite 6 để xử lý advisory dependency mà không tắt rule.
- Sửa Admin Dashboard treo loading khi API lỗi, job list hiển thị empty state sai khi request thất bại và dependency React hooks có thể giữ query/filter cũ.
- Sửa header chồng nav ở desktop hẹp, kiểm tra trực quan ở 1280px và mobile 390x844.
- Thay nhà tuyển dụng/hồ sơ công ty tĩnh bằng endpoint employer thật; thêm loading, error, retry và logo/cover từ backend.
- Nối Việc làm tương tự với Recommendation API và sửa Export CSV recruiter từ file rỗng thành dữ liệu JD thật.
- Bổ sung Playwright regression cho error states, header, employer detail/jobs và similar jobs.
- `npm audit` còn 0 vulnerability. Type-check, lint và 5 regression Chromium test đều pass; E2E dùng database thật bị chặn do PostgreSQL local không chấp nhận credential project và Docker engine không phản hồi.

### 2026-07-18 13:30 +07:00 - Backend UI Coverage Audit

- Rà soát 22 Spring controller, 95 handler mapping annotations, toàn bộ React routes và hai API client frontend.
- Xác nhận frontend đã phủ phần lớn luồng MVP nhưng chưa phủ toàn bộ backend; không đánh đồng component tĩnh hoặc endpoint thay thế với UI hoàn chỉnh.
- Tạo `BACKEND_UI_COVERAGE.md` với ma trận theo domain và backlog P0/P1/P2.
- Ghi nhận P0: passwordless verify chưa consume token, CV async chưa polling status và homepage market dashboard còn dùng số liệu tĩnh.
- Cập nhật README, SRS, Frontend Implementation Guide và Advanced Analytics contract để phân biệt yêu cầu đích với trạng thái triển khai hiện tại.

## Verification Notes

- `npm run build` was run successfully after the URL-state work.
- `npm run build` was run successfully after the Rocchio feedback UI work.
- `npm run build` was run successfully after application flow and Auto-Apply run-now wiring.
- `npm run build` was run successfully after list metadata API type sync.
- Browser checks confirmed:
  - Public `/jobs` does not show feedback controls.
  - Candidate feedback gửi `type` và `channel` bằng query parameters.
  - Recruiter applicant cards không hiển thị Candidate-only feedback controls.
- Some Browser-plugin form-fill checks were limited by plugin/runtime interaction issues, but TypeScript build passed.

## Maintenance Rules For This Log

When future frontend work is completed, append a new section under `Recent Implementation Log` with:

```md
### YYYY-MM-DD HH:mm +07:00 - Short Change Title

- What changed.
- Important files touched.
- Verification run.
- Any known limitations.
```

Keep reconstructed chat entries concise. Use this file as a human-readable history, not as a replacement for Git history.
## 2026-06-21 - JD, Settings, multi-format CV và bỏ API mock fallback

- Recruiter Jobs dùng contract thật cho edit/status/delete/export CSV và hiển thị applicant/match count thật.
- Candidate/Recruiter Settings đọc, patch và reload dữ liệu `/api/settings/me` theo role.
- CV upload chấp nhận PDF, PNG, JPG/JPEG và DOCX; copy UI mô tả OCR đúng khả năng backend.
- Bỏ fallback mock khỏi jobs, job detail, applications, recruiter dashboard/jobs/discovery, search suggestions, analytics và toàn bộ Admin pages.
- Thêm trạng thái loading/API error/empty riêng cho recruiter candidate discovery; request lỗi không còn hiện `no candidates` sai.
- Frontend `npm run build` pass; browser smoke đã xác nhận login recruiter và `/recruiter/jobs` render JD/count/status thật từ backend.

### 2026-07-08 19:05 +07:00 - Full Frontend Functional Audit And Runtime Regression

- Rà soát chức năng với PostgreSQL, Spring Boot và Vite chạy đồng thời; không đánh giá chỉ dựa trên giao diện.
- Nối đăng ký, yêu cầu magic-link, Candidate/Recruiter Settings và trang Gợi ý với API thật; sửa body PATCH settings và endpoint cập nhật tên Candidate.
- Chuyển dashboard Candidate sang số liệu match/application/automation thật; nút Apply tại dashboard thực hiện application flow thật.
- Chuyển trang Thống kê recruiter cũ và danh sách job tại employer/upload result sang dữ liệu API hợp lệ thay vì job/trend mock có thể dẫn tới route 404.
- Sửa upload status `FAILED`, audit-log null crash và Automation policy thiếu `nextScanAt`; các trường hợp này nay hiển thị lỗi/fallback rõ ràng thay vì trắng trang hoặc báo thành công sai.
- Các action chưa có backend contract được disabled kèm tooltip: save job, follow company, similar/report job, notification inbox và delete account.
- Bổ sung toast portal nổi bật và hoàn thiện bản dịch tiếng Việt cho Admin, Automation, Settings, filter và metadata phổ biến.
- Mở rộng Playwright từ 4 lên 10 test: magic-link, settings persistence, recommendations và route-smoke Candidate/Recruiter/Admin.
- Verification: `npm run build` pass; Chromium E2E `10 passed`; candidate apply/withdraw, recruiter create/cleanup JD và admin suspend/activate đều quan sát được request ghi dữ liệu thật.

### 2026-07-18 - Đồng bộ contract feedback Candidate-only

- Đồng bộ frontend với backend cuối: `POST /api/matches/{matchingId}/feedback?type=...&channel=WEB`, không gửi JSON body hoặc `role=RECRUITER`.
- Khôi phục `matchingId` từ Candidate job-card DTO để feedback controls render đúng.
- Gỡ Recruiter feedback controls và Mark Potential vì `/api/matches/**` yêu cầu role Candidate; Recruiter tiếp tục dùng Invite/Review/Approve/Reject.
- Bổ sung Playwright regression test kiểm tra method, query parameters và body rỗng.
- Verification: `npm run type-check`, `npm run lint`, Chromium `16/16`, `npm run build` và `npm run check-bundle` đều pass; runtime auth trả đúng `401/404/403` cho Guest/Candidate-nonexistent/Recruiter.

### 2026-07-18 - Hoàn thiện Candidate P0 Backend Contracts

- CV upload và Manual Creation poll `GET /api/cv/{cvId}/status` đến `SCORING_DONE`/`FAILED`, tự retry lỗi tạm thời, có timeout, error state và nút kiểm tra lại.
- Tab Hồ sơ & CV chuyển sang `GET /api/cv/me`, bổ sung CV detail/raw text và delete confirmation; CV mặc định bị khóa xóa, không thêm edit khi backend chưa có update endpoint.
- Thêm `/auth/magic-link/verify` với GET inspect, POST consume, lưu JWT, `/api/auth/me` và redirect đúng role; reload session cũng revalidate bằng `/api/auth/me`.
- Job Market Dashboard bỏ ngày/số liệu/chart tĩnh, đọc stats/trend/roles/salary analytics với loading/error/empty state.
- Candidate Recommendations dùng `GET /api/recommendations/jobs`, không tự suy ra recommendation từ matching feed.
- Thêm `tests/backend-contracts.spec.ts` cho CV polling/retry, magic-link, Recommendation API và session restore.
- QA browser với backend/database thật: market analytics render hoặc empty state đúng dữ liệu, CV detail/default-delete guard hoạt động, console sạch; sửa modal fixed bị lệch do page animation và tên CV dài gây tràn ngang mobile.
- Verification cuối: `npm run type-check`, `npm run lint`, Chromium Playwright `20/20` và `npm run build` đều pass.
- Integration note: backend email-link builder hiện vẫn cần cấu hình/sửa URL đích để mở `/auth/magic-link/verify?token=...`; frontend consume flow đã hoàn chỉnh và có regression test.

### 2026-08-18 +07:00 - Phase 2 UI Regression Review

- Rà soát UI sau đợt cập nhật catalog/Phase 2. Giữ kiến trúc mới: `/candidate/jobs` chuyển về catalog phân trang `/jobs`; trang `Gợi ý` là nơi hiển thị các kết quả matching cá nhân.
- Khôi phục giao diện và luồng magic-link tại `/auth/magic-link/verify`, gồm gửi link từ trang đăng nhập, kiểm tra token, lưu session và chuyển dashboard đúng role.
- Sửa catalog để có error state và nút thử lại; Guest bấm ứng tuyển mở popup yêu cầu đăng nhập thay vì bị điều hướng đột ngột.
- Khôi phục lưu/bỏ lưu JD cho Candidate trên catalog, bao gồm trạng thái `Đã lưu`, loading và thông báo lỗi/thành công.
- Job card không còn hiển thị `No description provided` khi response danh sách không có nội dung JD; trang chi tiết sử dụng `parseJobDescription` để tách mô tả, trách nhiệm, yêu cầu và quyền lợi ổn định hơn.
- Khôi phục bộ lọc điểm matching có giá trị số hiển thị, URL query `minScore` và request backend cho danh sách Candidate cũ (được giữ lại làm component dự phòng).
- Cập nhật regression tests: error state catalog, save JD Candidate, external job CTA và Settings demo notice.
- Verification: `npm run type-check`, `npm run lint`, Playwright Chromium `22/22`, `npm run build` và `npm run check-bundle` đều pass.

### 2026-08-18 +07:00 - Recruiter Talent Pool

- Khôi phục Talent Pool thành một trang Recruiter riêng tại `/recruiter/talent-pool`, có trong thanh điều hướng và giữ `job`/`view` trên URL để chia sẻ hoặc tải lại vẫn đúng JD và tab đang xem.
- Talent Pool đọc danh sách CV tiềm năng theo JD từ Candidate Discovery API, tách tab `Đề xuất AI` và `Đã lưu`; hỗ trợ xem CV, gửi lời mời, lưu/bỏ lưu shortlist riêng cho từng JD.
- Gỡ tab `Ứng viên tiềm năng AI` trùng lặp khỏi chi tiết JD. URL cũ `/recruiter/jobs/:jobId/potential` tự chuyển sang Talent Pool cùng JD.
- Đồng bộ API frontend cho bookmark Talent Pool và sửa tên field response backend `CvBookmarkResponse` để `bookmarkId`, `jobId`, `candidateId`, `cvId` khớp dữ liệu thực tế.
- Bổ sung route này vào Playwright recruiter route smoke và regression test xác nhận cả Candidate Discovery API lẫn Bookmark API được gọi.
- Verification: `npm run type-check`, `npm run lint`, Playwright Chromium `23/23`, `npm run build`, `npm run check-bundle` và backend `mvnw.cmd -DskipTests compile` đều pass.
