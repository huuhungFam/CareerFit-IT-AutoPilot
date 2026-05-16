# CareerFit IT AutoPilot - Frontend Implementation Guide

Tài liệu này mô tả mức triển khai chi tiết cho frontend của `CareerFit IT AutoPilot`.
Mục tiêu là để frontend không chỉ “đẹp” mà còn phản ánh đúng toàn bộ luồng automation, HITL, recommendation và validation của hệ thống.
Tài liệu này bám theo [proposal.md](../proposal.md), [srs.md](../srs.md) và [architecture.md](../architecture.md).

---

## 1. Vai Trò Của Frontend

Frontend là job portal cho candidate và control plane cho recruiter/admin.

Nó phải:

- cho candidate tìm kiếm, lọc, xem chi tiết và apply job như một web tìm việc thông thường
- cho candidate upload CV, nhập CV thủ công, quản lý nhiều CV, hồ sơ cố định và portfolio
- cho recruiter quản lý job và duyệt matching
- hiển thị score, label, potential
- hiển thị trạng thái xử lý background
- cho phép bật/tắt policy auto-fit
- mở các landing pages cho magic-link / email action
- hiển thị cảnh báo validation rõ ràng
- support bilingual vi/en

Frontend không tính toán matching score.
Frontend không giữ logic quyết định automation.
Frontend chỉ gửi request, hiển thị kết quả, và cho phép cấu hình policy.

---

## 2. Non-Goals

Frontend này không làm:

- scoring engine
- Rocchio update
- token issuance
- email sending
- policy decision logic
- background job execution

---

## 3. Recommended Stack

Nếu chưa có code sẵn, dùng:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- React Hook Form
- Zod
- Recharts
- i18next

Nếu repo đã chọn stack khác, giữ cùng nguyên tắc:

- typed UI
- server state tách khỏi local state
- responsive
- bilingual
- design system thống nhất

---

## 4. Information Architecture

### 4.1. Public routes

- `/login`
- `/register`
- `/auth/magic-link`
- `/auth/magic-link/verify`
- `/automation/confirm`
- `/automation/result`

### 4.2. Candidate routes

- `/candidate`
- `/candidate/jobs`
- `/candidate/jobs/:jobId`
- `/candidate/upload`
- `/candidate/profile`
- `/candidate/recommendations`
- `/candidate/applications`
- `/candidate/settings`
- `/candidate/automation`

### 4.3. Recruiter routes

- `/recruiter`
- `/recruiter/jobs`
- `/recruiter/jobs/:jobId`
- `/recruiter/jobs/:jobId/ranking`
- `/recruiter/jobs/:jobId/applicants`
- `/recruiter/jobs/:jobId/potential`
- `/recruiter/analytics`
- `/recruiter/automation`

### 4.4. Shared routes

- `/notifications`
- `/settings/language`
- `/settings/privacy`
- `/settings/security`

---

## 5. Global Layout

### 5.1. App shell

Layout nên có:

- left sidebar hoặc top navigation tùy role
- main content area
- top utility bar:
  - language switcher
  - user menu
  - notification bell
  - automation status indicator

### 5.2. Visual style

Tuân thủ `main-design.md`:

- editorial feel
- no generic dashboard look
- no heavy borders
- subtle tonal layering
- soft shadows
- glass-like overlays cho confirm pages
- font:
  - Plus Jakarta Sans cho headline
  - Inter cho body

### 5.3. Brand

Use brand name:

- `CareerFit IT AutoPilot`

Brand language:

- professional
- calm
- automation-centric
- not playful

---

## 6. Screen-by-Screen Requirements

## 6.1. Login / Register

### Purpose

- login bằng password hoặc passwordless
- register basic account
- nhận email magic-link

### Behaviors

- nếu chọn passwordless, chỉ nhập email
- nếu chọn password flow, có backup
- show loading state while awaiting email
- show resend timer
- show success and failure states

### Components

- email input
- password input
- primary CTA
- resend link button
- validation message area

## 6.2. Candidate Home

### Purpose

Trang trung tâm cho candidate, kết hợp job feed, recommendation summary và trạng thái automation.

### Sections

- summary header
- highlighted job feed
- CV upload CTA
- recommendation summary
- current automation policy card
- recent applications
- recent notifications

### Behaviors

- show latest status of upload jobs
- show whether auto-apply is on/off
- show threshold
- show next job scan time
- show daily digest time and email quota if enabled
- show timezone and quiet-hours status if enabled
- show notifications from HITL
- let candidate continue browsing jobs without feeling like a technical dashboard

## 6.3. Candidate Job Feed Page

### Purpose

Cho candidate tìm kiếm và khám phá job như một nền tảng tuyển dụng thông thường.

### Data shown

- job title
- company
- location
- seniority
- required skills
- salary display text if visible, for example `Thỏa thuận`, `1000 - 2000 USD / tháng`, `Up to 2000 USD`
- recommendation score if the candidate has a profile
- label and potential flag when available

### Behaviors

- search by keyword
- filter by skill, location, seniority, language, salary mode/range, score range
- sort by relevance, newest, score
- open job detail
- apply, save, skip, show similar
- when skipped, remove the job from the visible list immediately and show the next available job

## 6.4. Candidate Job Detail Page

### Purpose

Hiển thị JD đầy đủ và giải thích vì sao job phù hợp với candidate.

### Data shown

- full job description
- required skills
- optional skills
- company/location/salary display text if visible
- matching/recommendation score
- reason chips
- application status

### Behaviors

- apply manually
- save for later
- skip/not interested
- show similar jobs
- inspect why score was assigned

## 6.5. CV Upload Page

### Purpose

- hỗ trợ 2 tab giao diện: Document Parser và Manual Creation
- Document Parser để drop/upload PDF
- Manual Creation để nhập CV bằng form
- display validation
- display processing state

### States

- idle
- drag over
- uploading
- validating
- processing
- scored
- failed

### Behaviors

- file type validation before submit
- file size warning
- preview extracted summary if backend returns it
- polling status until scored
- render ranking results after success
- tab `Document Parser` và `Manual Creation` phải chuyển qua lại, không thay thế nhau
- sticky action bar `Save & Start Matching` chỉ hiển thị trong tab Manual Creation
- Document Parser giữ dropzone/parser chính, không cần thêm card tóm tắt trùng ở hero

## 6.6. Candidate Profile Page

### Purpose

- Trang này hiển thị dưới label `Hồ sơ & CV`.
- Quản lý nhiều CV đã upload hoặc nhập form.
- Chọn CV mặc định.
- Chỉnh hồ sơ cố định và preference.
- Quản lý portfolio/dự án bổ trợ.

### Tabs

- `CV đã tạo`: danh sách nhiều CV, source, updated date, status, score, skills và actions.
- `Hồ sơ cố định`: thông tin cá nhân, desired title, desired skills, location, seniority, expected salary, work model, auto-apply threshold.
- `Portfolio / Dự án`: GitHub, LinkedIn, website, demo/design links và project cards.

### Behaviors

- show inline validation
- show helper text for each field
- save preference immediately or by explicit submit
- allow toggling automation policy
- allow setting one CV as default
- portfolio is not a replacement for CV and should not live under Upload CV

### UI copy note

Trang phải có chú thích ngắn ở đầu để phân biệt:

- CV là từng phiên bản hồ sơ dùng để matching/ứng tuyển.
- Hồ sơ cố định là dữ liệu nền dùng chung cho AutoFit.
- Portfolio là bằng chứng năng lực/dự án bổ trợ.

## 6.7. Candidate Recommendations Page

### Purpose

- show top JD phù hợp với hồ sơ mong muốn

### Data shown

- score %
- label
- potential flag
- reason chips
- salary/location if available
- match confidence

### Behaviors

- filter by score, location, skill, seniority
- sort by score
- open detail drawer for JD
- CTA:
  - Apply
  - Skip
  - Save for later
  - Show Similar

## 6.8. Candidate Applications Page

### Purpose

- show application history
- show auto-applied items
- show invitation status

### Behaviors

- status chips
- timeline
- ability to inspect why auto-apply happened
- show audit summary if user has permission

## 6.9. Candidate AutoFit Settings Page

### Purpose

Cho candidate cấu hình lịch tự động và thông báo đề xuất job.

### Controls

- auto-apply enabled
- auto-apply threshold
- automatic job scan enabled
- scan frequency: `1 hour`, `6 hours`, `daily`
- high-match email enabled
- high-match threshold
- daily digest enabled
- daily digest time
- timezone
- max emails per day
- quiet hours enabled
- quiet hours start/end
- notification cooldown
- replacement after email skip enabled
- replacement delay minutes

### Behaviors

- show clear preview of current policy
- show next scan time if backend returns it
- warn user if email quota is low
- show when immediate email is muted by quiet hours
- explain through concise field labels, not long instructional text

## 6.10. Recruiter Dashboard

### Purpose

- `/recruiter` là dashboard tổng quan.
- Không dùng layout HR Dashboard chi tiết ở trang này.
- Hiển thị job market chart, metric cards và bảng tóm tắt ranking/applicant/potential pool.

### Sections

- metric cards
- job list
- recent matches
- pending approvals
- digest summary

## 6.11. Recruiter Job Detail

Trang `/recruiter/jobs` là HR Dashboard cho job management.

### Layout

- left column: Active Requisitions.
- right column: selected job detail, Applied CVs tab, AI Potential Matches tab.
- search jobs, filters, post job action ở đầu trang.

### Subtabs

- job summary
- ranking
- applicants
- potential
- automation
- analytics

### Behaviors

- ranking table with filters
- applicant list with application status
- invite candidate action
- feedback action
- export if enabled

## 6.11.1. Recruiter Job Salary Form

Recruiter không phải nhập tất cả trường lương. UI phải cho chọn kiểu lương trước, sau đó chỉ hiện field cần thiết.

Salary modes:

- `NEGOTIABLE`: hiển thị là `Thỏa thuận`, không cần min/max.
- `RANGE`: cần `salaryMin`, `salaryMax`, `salaryCurrency`, `salaryType`.
- `UP_TO`: cần `salaryMax`, `salaryCurrency`, `salaryType`.
- `FROM`: cần `salaryMin`, `salaryCurrency`, `salaryType`.
- `HIDDEN`: không hiển thị lương cho candidate.

UI rules:

- Nếu chọn `RANGE`, validate `salaryMin <= salaryMax`.
- Không cho nhập số âm.
- `salaryDisplayText` có thể được backend generate từ structured fields, hoặc frontend preview trước khi submit.
- Candidate-facing card/detail chỉ dùng `salaryDisplayText` khi `salaryIsVisible = true`.

## 6.12. Automation Confirm Page

### Purpose

Landing page from email magic-link.

### Must show

- action summary
- target object
- score and reason
- token expiration notice
- confirm and reject buttons

### Security behavior

- if token invalid: show error and request resend
- if token already used: show already processed state
- if token valid: perform action via backend POST
- if action is `SKIP` from email: show that the job was skipped and no replacement will be sent immediately unless replacement autopilot is enabled

## 6.13. Automation Result Page

### Purpose

Show the outcome after clicking email CTA.

### Must show

- success or failure
- what action was taken
- what was updated
- next steps

## 6.14. Analytics Page

### Purpose

- show trend charts
- show counts and distributions

### Charts

- line chart for job trend
- bar chart for job volume
- pie/donut for label distribution

---

## 7. Component Inventory

The following components should exist at minimum:

- `AppShell`
- `RoleRouter`
- `LanguageSwitcher`
- `ThemeHeader`
- `StatCard`
- `JobFeed`
- `JobCard`
- `JobSearchBar`
- `JobFilterPanel`
- `JobDetailPanel`
- `CvUploadDropzone`
- `CvPreviewPanel`
- `CvManagementList`
- `CvManagementCard`
- `CandidateProfileForm`
- `CandidatePortfolioForm`
- `PortfolioProjectCard`
- `AutoApplyToggle`
- `ThresholdSlider`
- `ScanFrequencySelect`
- `DigestTimePicker`
- `EmailQuotaIndicator`
- `ReplacementAfterSkipToggle`
- `QuietHoursControl`
- `TimezoneSelect`
- `NotificationCooldownField`
- `MatchingBadge`
- `PotentialBadge`
- `ReasonChips`
- `ActionButtonGroup`
- `JobRankingTable`
- `RecruiterOverviewPanel`
- `RecruiterHrDashboard`
- `ApplicantTable`
- `PotentialList`
- `NotificationList`
- `TrendLineChart`
- `ValidationPanel`
- `EmptyState`
- `ErrorState`
- `SkeletonCard`
- `EmailActionConfirmCard`
- `EmailActionResultCard`
- `DigestBanner`
- `InviteDrawer`
- `FeedbackSheet`

Each component should be presentational first, with logic pushed to hooks/pages.

---

## 8. State Management

### 8.1. Server state

Use TanStack Query for:

- profile fetch
- job lists
- ranking lists
- recommendation lists
- application history
- automation policies
- analytics
- action token verification

### 8.2. Local UI state

Use component state / form state for:

- modal open/close
- selected filters
- upload drag state
- language selector
- tab selection
- slider values before submit

### 8.3. Form state

Use React Hook Form + Zod for:

- profile form
- profile/CV tab selection
- portfolio project form
- job form
- login form
- passwordless request form
- automation policy settings

---

## 9. Data Flow Rules

### 9.1. Matching / recommendation data

Frontend only renders:

- `rawScore`
- `normalizedScore`
- `label`
- `isPotential`
- `reasons`
- `status`

Frontend must not compute these values itself.
Score badge color should be visual-only and based on `normalizedScore`: high scores use bright green/teal, mid scores use yellow/orange, low scores use red.

### 9.2. Status polling

For long-running backend operations:

- upload
- parsing
- scoring
- recompute

frontend should poll status or refetch on interval.

Use:

- `refetchInterval`
- `refetchOnWindowFocus`
- manual refresh button where necessary

### 9.3. Auto refresh

Auto refresh is UI only.

It should:

- refresh candidate recommendations when user returns to page
- refresh recruiter ranking after action
- refresh pending confirmation state

Do not use aggressive polling that harms usability.

---

## 10. Validation UX

Frontend validation should mirror backend validation.

### Hard errors

- file not PDF
- missing required fields
- invalid email
- invalid phone
- invalid token

### Soft warnings

- profile incomplete
- JD too short
- missing optional fields
- suspicious input length

### UX rule

When possible:

- show the issue inline
- highlight the field
- give a direct fix suggestion
- do not rely on a single toast

---

## 11. Bilingual Support

### Rules

- All UI copy must go through translation keys.
- Do not hardcode Vietnamese or English in reusable components.
- Persist language preference in local storage and backend if needed.
- Support switching language without reload where possible.

### Translation domains

- auth
- candidate
- recruiter
- automation
- validation
- analytics
- common

---

## 12. Email and HITL UX

This is the part that needs real frontend adjustment for the automation model.

### 12.1. What frontend must support

- email-action landing pages
- confirm and reject screens
- action result screen
- resend flow
- invalid token fallback
- policy settings for auto behavior

### 12.2. What frontend does not do

- frontend does not decide whether an action should auto-run
- frontend does not verify signed tokens by itself
- frontend does not send email

### 12.3. Useful UX patterns

- big CTA cards
- minimal confirm layout
- explain why action was suggested
- show expiration timer
- show audit-friendly summary

---

## 13. Design System Constraints

Use the existing design direction:

- editorial layout
- premium spacing
- no default SaaS purple
- subtle shadows
- soft gradients for CTAs
- glass effect for overlays
- no hard 1px dividers for sectioning when avoidable

Useful surface hierarchy:

- `surface`
- `surface-container-low`
- `surface-container-lowest`

---

## 14. Responsive Behavior

### Mobile

- candidate flow first
- single-column layout
- bottom sheet instead of wide tables when necessary

### Desktop

- recruiter dashboard should use wider tables and side panels
- analytics and ranking can use split panes

### Tablet

- collapse sidebar
- preserve key actions

---

## 15. Performance Rules

- use code splitting for large routes
- lazy load charts
- virtualize large ranking tables if needed
- debounce filter inputs
- cache server responses through query keys

---

## 16. Accessibility Rules

- keyboard navigable
- visible focus states
- color not the only signal for label
- aria labels for icon-only buttons
- readable contrast
- clear error text

---

## 17. Testing Plan

### Component tests

- upload dropzone
- upload tab switcher
- CV management list
- portfolio project card
- profile form
- ranking table
- action confirm card
- language switcher
- validation panel

### Flow tests

- upload -> status -> ranking
- preference -> recommendation
- email link -> confirm -> result
- recruiter invite -> audit feedback

---

## 18. Definition of Done

Frontend is done when:

- candidate can upload and inspect results
- candidate can manage multiple CVs and choose a default CV
- candidate can edit fixed profile and portfolio from `Hồ sơ & CV`
- candidate can configure automation policy
- recruiter can review rankings and potential candidates
- recruiter overview and recruiter job management are separate screens
- email action pages work
- passwordless login works
- language toggle works
- validation is visible and helpful
- charts render
- auto refresh behaves correctly
- design system is consistent
