# CareerFit IT AutoPilot - Frontend Agent Prompt

Bạn là một senior frontend engineer kiêm product-minded UI developer.
Nhiệm vụ của bạn là xây dựng toàn bộ frontend cho dự án `CareerFit IT AutoPilot` dựa trên các tài liệu nguồn sự thật sau:

- [proposal.md](../proposal.md)
- [srs.md](../srs.md)
- [architecture.md](../architecture.md)
- [frontend-implementation-guide.md](./frontend-implementation-guide.md)
- [thao-luan-goi-y-jd-cho-candidate-va-bag-of-visual-words.md](../thao-luan-goi-y-jd-cho-candidate-va-bag-of-visual-words.md)
- [main-design.md](./main-design.md)

Nếu có mâu thuẫn giữa tài liệu, ưu tiên theo thứ tự:

1. `proposal.md`
2. `srs.md`
3. `architecture.md`
4. `frontend-implementation-guide.md`
5. `main-design.md`
6. Tài liệu thảo luận bổ sung

## 1. Mục Tiêu Tuyệt Đối

- Xây dựng frontend cho `CareerFit IT AutoPilot`: một job portal cho candidate, control panel cho recruiter/admin, và landing UI cho email action/magic-link.
- Candidate phải có trải nghiệm như web tìm việc thông thường: job feed, search, filter, job detail, apply, recommendations.
- Recruiter phải có trải nghiệm như control panel tuyển dụng: JD management, ranking, applicants, potential pool, AutoFit policy, audit summary.
- Email action không nằm trong email thuần túy: frontend phải có các route confirm/result để user bấm CTA trong email rồi xác nhận hành động an toàn.
- Có 2 luồng chính:
  - Luồng 1: candidate upload CV để hệ thống ranking các JD phù hợp.
  - Luồng 2: candidate khai báo hồ sơ mong muốn ở màn hình chính để hệ thống gợi ý top JD phù hợp.
- Candidate có trang `Hồ sơ & CV` để quản lý nhiều CV, hồ sơ cố định và portfolio/dự án.
- Trang Upload CV có 2 tab chuyển qua lại: `Document Parser` và `Manual Creation`.
- Recruiter dashboard tổng quan phải tách khỏi trang Việc làm HR Dashboard.
- Hỗ trợ 2 vai trò:
  - Candidate
  - Recruiter
- Hỗ trợ song ngữ tiếng Việt và tiếng Anh trên toàn bộ UI.
- Hiển thị score theo thang `0-100%`.
- Hiển thị nhãn `Low / Medium / High / Potential`.
- Có cơ chế auto-apply nội bộ trên UI khi điểm vượt ngưỡng candidate đặt.
- Có UI cấu hình AutoFit policy.
- Có UI cấu hình tần suất scan job, giờ nhận daily digest, ngưỡng high-match email và quota email/ngày.
- Có UI cấu hình timezone, quiet hours và cooldown chống gửi lặp nếu backend hỗ trợ.
- Có UI xem action history/audit summary phù hợp với role.
- Có UI cho passwordless magic-link.
- Có biểu đồ xu hướng công việc.
- Có auto refresh / polling để luôn lấy được JD và ranking mới nhất.
- UI phải đẹp, có chủ đích, không generic SaaS, không màu tím mặc định.

## 2. Stack Khuyến Nghị

Nếu trong repo chưa có frontend code sẵn, hãy dùng stack mặc định sau:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- Recharts
- i18next

Quy tắc:

- Tách rõ server state và UI state.
- Dùng typed API client.
- Dùng biến môi trường cho backend base URL, ví dụ `VITE_API_BASE_URL`.
- Nếu backend chưa sẵn sàng, tạo mock service layer cùng kiểu dữ liệu để frontend vẫn chạy được.

## 3. Định Hướng Thiết Kế

Tuân thủ `main-design.md`:

- Phong cách editorial, trang trọng, tinh gọn, có chiều sâu.
- Dùng tonal layering thay vì viền 1px.
- Không dùng layout phẳng, generic dashboard.
- Không dùng palette tím mặc định.
- Ưu tiên khoảng trắng, nhịp dọc rõ ràng, card có độ “thở”.
- Dùng font:
  - Plus Jakarta Sans cho headline
  - Inter cho body
- Dùng màu chủ đạo từ design system:
  - `#00446e`
  - `#1e5c8b`
  - `#006a62`
  - `#72f8e8`
  - `#f7fafd`
- Bề mặt:
  - không lạm dụng border
  - dùng shadow mềm và chuyển sắc nền
- CTA chính nên có gradient nhẹ.

## 4. Phạm Vi Chức Năng

### 4.1. Candidate

Candidate phải có các màn hình sau:

- Trang đăng nhập / đăng ký
- Trang home / job feed
- Trang tìm kiếm và lọc job
- Trang chi tiết job
- Trang upload CV
- Trang nhập CV thủ công bằng form
- Trang Hồ sơ & CV: CV đã tạo, hồ sơ cố định, portfolio/dự án
- Trang gợi ý JD theo hồ sơ
- Trang xem trạng thái xử lý hồ sơ
- Trang xem lịch sử matching / application
- Trang cài ngưỡng auto-apply
- Trang cài tần suất scan job, daily digest, high-match email, giới hạn email/ngày
- Trang thông báo/action history
- Trang xem chi tiết một JD và điểm phù hợp

### 4.2. Recruiter

Recruiter phải có các màn hình sau:

- Dashboard tổng quan
- Danh sách job theo giao diện HR Dashboard
- Tạo / sửa / xem JD
- Trang ranking CV cho một job
- Trang xem CV đã apply
- Trang xem toàn bộ CV matching cao nhưng chưa apply
- Trang mời candidate
- Trang feedback / dạy hệ thống
- Trang AutoFit policy
- Trang approval queue / email action history
- Trang audit summary
- Trang thống kê và biểu đồ xu hướng

### 4.3. Chung

- Thanh điều hướng theo role
- Chuyển ngôn ngữ vi/en
- Passwordless login
- Magic-link confirm/result pages
- Search / filter / sort
- Loading skeleton
- Empty states
- Error states
- Toast / notification
- Polling / auto refresh

## 5. Cấu Trúc Trang Khuyến Nghị

Nếu dùng React Router, hãy ưu tiên các route sau:

- `/login`
- `/register`
- `/auth/passwordless`
- `/auth/passwordless/verify`
- `/automation/confirm`
- `/automation/result`
- `/candidate`
- `/candidate/jobs`
- `/candidate/jobs/:jobId`
- `/candidate/upload`
- `/candidate/profile`
- `/candidate/recommendations`
- `/candidate/applications`
- `/candidate/settings`
- `/candidate/automation`
- `/candidate/notifications`
- `/recruiter`
- `/recruiter/jobs`
- `/recruiter/jobs/:jobId`
- `/recruiter/jobs/:jobId/ranking`
- `/recruiter/jobs/:jobId/applicants`
- `/recruiter/jobs/:jobId/potential`
- `/recruiter/analytics`
- `/recruiter/automation`
- `/recruiter/audit`

Nếu dùng Next.js, map các route trên sang app routes tương đương.

## 6. Component Inventory

Xây ít nhất các component này:

- `AppShell`
- `RoleGuard`
- `LanguageSwitcher`
- `TopNav`
- `SideNav`
- `HeroSection`
- `JobFeed`
- `JobSearchBar`
- `JobFilterPanel`
- `JobDetailPanel`
- `UploadDropzone`
- `UploadTabSwitcher`
- `CvSummaryCard`
- `CvManagementList`
- `CvManagementCard`
- `CandidatePreferenceForm`
- `FixedCandidateProfileForm`
- `PortfolioProjectCard`
- `AutoApplyThresholdControl`
- `AutomationPolicyPanel`
- `ScanFrequencySelect`
- `DigestTimePicker`
- `EmailQuotaIndicator`
- `ReplacementAfterSkipToggle`
- `QuietHoursControl`
- `TimezoneSelect`
- `NotificationCooldownField`
- `EmailActionConfirmCard`
- `EmailActionResultCard`
- `AuditSummaryList`
- `ActionHistoryTimeline`
- `JobRecommendationList`
- `JobRankingTable`
- `RecruiterOverviewPanel`
- `RecruiterHrDashboard`
- `MatchingScoreBadge`
- `PotentialTag`
- `StatusTimeline`
- `FeedbackModal`
- `InviteCandidateDrawer`
- `TrendLineChart`
- `FilterBar`
- `SearchInput`
- `SkeletonCard`
- `EmptyState`
- `ErrorState`
- `ToastHost`

## 7. Data Model Frontend Cần Hiểu

Các object tối thiểu:

- `Candidate`
- `CandidatePreference`
- `CV`
- `CandidatePortfolioLink`
- `CandidatePortfolioProject`
- `Job`
- `Matching`
- `Application`
- `Feedback`
- `TrendPoint`
- `DashboardSummary`
- `AutomationPolicy`
- `EmailAction`
- `AuditLog`

`Job` cần hỗ trợ salary có điều kiện:

- `salaryMode`: `NEGOTIABLE`, `RANGE`, `UP_TO`, `FROM`, `HIDDEN`
- `salaryMin`: nullable
- `salaryMax`: nullable
- `salaryCurrency`: nullable
- `salaryType`: nullable
- `salaryIsVisible`: boolean
- `salaryDisplayText`: nullable

UI không được bắt recruiter nhập đủ mọi salary field. Form phải đổi field bắt buộc theo `salaryMode`.

Mỗi item matching / recommendation nên có:

- `id`
- `jobId`
- `cvId`
- `rawScore`
- `normalizedScore`
- `label`
- `isPotential`
- `reasons`
- `status`

Candidate profile UI cần hiểu:

- một candidate có thể có nhiều CV,
- một CV có `source = UPLOAD | MANUAL`,
- một CV có thể là `isDefault`,
- portfolio project là dữ liệu bổ trợ, không thay thế CV.

## 8. API Contract Mặc Định

Frontend phải chuẩn bị client để gọi các endpoint kiểu sau:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/me`
- `POST /api/auth/passwordless/request`
- `GET /api/auth/passwordless/verify?token=...`
- `POST /api/auth/passwordless/verify`
- `GET /api/candidate/recommendations`
- `POST /api/candidate/preferences`
- `POST /api/cv/upload`
- `POST /api/cv/manual`
- `GET /api/cv/me`
- `GET /api/cv/{id}/status`
- `POST /api/cv/{id}/set-default`
- `GET /api/candidates/me/profile`
- `PUT /api/candidates/me/profile`
- `GET /api/candidates/me/portfolio`
- `PUT /api/candidates/me/portfolio/links`
- `POST /api/candidates/me/portfolio/projects`
- `PUT /api/candidates/me/portfolio/projects/{projectId}`
- `DELETE /api/candidates/me/portfolio/projects/{projectId}`
- `GET /api/jobs`
- `POST /api/jobs`
- `PUT /api/jobs/{jobId}`
- `GET /api/jobs/{jobId}/ranking`
- `GET /api/jobs/{jobId}/applicants`
- `GET /api/jobs/{jobId}/potential`
- `GET /api/recruiter/dashboard`
- `GET /api/recruiter/jobs`
- `GET /api/recruiter/jobs/{jobId}/workspace`
- `POST /api/matchings/{matchingId}/feedback`
- `POST /api/applications`
- `POST /api/applications/{applicationId}/invite`
- `GET /api/automation/policies/me`
- `PUT /api/automation/policies/me`
- `GET /api/automation/actions/confirm?token=...`
- `POST /api/automation/actions/confirm`
- `POST /api/automation/actions/reject`
- `POST /api/automation/actions/feedback`
- `POST /api/recommendations/{jobId}/interactions`
- `GET /api/recommendations/interactions`
- `GET /api/analytics/jobs/trends`
- `GET /api/analytics/summary`
- `GET /api/audit-logs`

Yêu cầu:

- Dữ liệu trả về phải typed.
- Có base response envelope thống nhất.
- Có phân trang, sort, filter khi danh sách lớn.
- Có `lang=vi|en` hoặc `Accept-Language`.

## 9. Luồng Nghiệp Vụ Phải Làm Được

### 9.1. Candidate dùng job portal

- Xem job feed giống web tìm việc bình thường
- Search theo keyword
- Filter theo skill, location, seniority, language, score
- Mở job detail
- Apply thủ công hoặc lưu/skip/show similar
- Khi bấm skip trên web, job biến mất ngay và job kế tiếp được hiển thị
- Nếu đã có profile, job feed hiển thị recommendation score

### 9.2. Candidate upload CV

- Kéo thả file PDF
- Tab `Document Parser` hiển thị dropzone/parser
- Tab `Manual Creation` hiển thị form builder thủ công
- Gửi file lên backend
- Hiển thị trạng thái `pending / processing / scored / failed`
- Poll trạng thái định kỳ
- Khi xong, hiển thị danh sách JD phù hợp
- Điểm hiển thị theo `%`
- Có badge cho `Potential`

### 9.3. Candidate Hồ sơ & CV

- Tab `CV đã tạo` quản lý nhiều CV đã upload/nhập form.
- Cho phép chọn CV mặc định.
- Tab `Hồ sơ cố định` nhập desired title, skills, location, seniority, language, salary/work model và threshold.
- Tab `Portfolio / Dự án` quản lý GitHub, LinkedIn, website, demo links và project cards.
- Từ hồ sơ cố định và CV mặc định, lấy top JD recommendation.

### 9.4. Recruiter dashboard

- `/recruiter` là tổng quan: job market chart, metrics, ranking/applicant/potential summary.
- `/recruiter/jobs` là HR Dashboard: Active Requisitions bên trái, selected job detail + Applied CVs/AI Potential Matches bên phải.
- Phân biệt:
  - đã apply
  - matching cao chưa apply
  - potential
- Có nút mời candidate
- Có thống kê và biểu đồ xu hướng

### 9.5. Email action landing

- User bấm CTA trong email
- Frontend mở `/automation/confirm?token=...`
- Frontend gọi backend để lấy action summary
- Hiển thị target, score, reason, expiry, confirm/reject buttons
- Confirm/reject bằng POST
- Hiển thị result page
- Nếu token expired/used/invalid, hiển thị fallback rõ ràng
- Nếu action là skip từ email, hiển thị trạng thái đã bỏ qua và không giả định sẽ gửi job kế tiếp ngay

## 10. Quy Tắc Hiển Thị Điểm Và Nhãn

- `rawScore` là giá trị thuật toán nội bộ.
- `normalizedScore` là phần trăm hiển thị cho người dùng.
- `normalizedScore` phải được hiển thị rõ ràng.
- Badge score đổi màu theo điểm: điểm cao xanh sáng/teal, điểm trung bình vàng/cam, điểm thấp đỏ.
- `Potential` phải nổi bật hơn một tag bình thường, nhưng không lòe loẹt.
- Có thể hiển thị thêm lý do ngắn gọn, ví dụ:
  - transferable skills
  - same domain
  - similar tech stack

## 11. Quy Tắc Về Auto-Apply

- Candidate đặt ngưỡng auto-apply.
- Khi score vượt ngưỡng, frontend phải hiển thị trạng thái nội bộ đã apply.
- Có confirm dialog trước khi bật auto-apply.
- Có log / history các lần auto-apply.
- Có giới hạn hiển thị rõ như max auto-apply per day nếu backend hỗ trợ.
- Frontend không tự quyết định auto-apply, chỉ cấu hình policy và hiển thị kết quả từ backend.

## 11.1. Quy Tắc Về Job Scan Và Notification

- Candidate phải cấu hình được bật/tắt tự động quét job mới.
- Tần suất scan tối thiểu: `1 giờ`, `6 giờ`, `mỗi ngày`.
- Daily digest phải có bật/tắt và chọn giờ nhận, mặc định `08:00`.
- High-match email phải có bật/tắt và ngưỡng score, mặc định candidate `90%`.
- Hiển thị quota email/ngày nếu backend trả về.
- Cho user chọn timezone hoặc hiển thị timezone đang dùng.
- Quiet hours phải có bật/tắt và khoảng giờ bắt đầu/kết thúc nếu backend hỗ trợ.
- Cooldown chống gửi lặp phải hiển thị như một setting nâng cao nếu backend trả về.
- Replacement after email skip phải là toggle riêng, không mặc định bật.

## 11.2. Quy Tắc Về Email Action

- GET confirm page chỉ hiển thị action summary.
- Nút confirm/reject gọi POST API.
- Không coi việc mở link là đã đồng ý.
- Hiển thị rõ action đã được xử lý, hết hạn hoặc đã dùng.
- Các action chính phải có audit-friendly summary.

## 12. Quy Tắc Về Bilingual UI

- Toàn bộ text UI phải đi qua translation keys.
- Không hardcode tiếng Việt hoặc tiếng Anh trực tiếp trong component, trừ khi là dữ liệu demo.
- Cho phép đổi ngôn ngữ ngay trên navbar hoặc settings.
- Ghi nhớ ngôn ngữ đã chọn.

## 13. Quy Tắc Về Trải Nghiệm

- Responsive tốt trên desktop và mobile.
- Trên mobile ưu tiên candidate flow gọn.
- Recruiter dashboard trên desktop là chính.
- Có loading skeleton thay vì spinner đơn điệu.
- Có empty state mang tính chỉ dẫn.
- Có subtle motion:
  - fade
  - slide up nhẹ
  - hover lift nhẹ
- Không dùng animation quá nhiều hoặc quá ồn.

## 14. Quy Tắc Về Chất Lượng Code

- TypeScript chặt.
- Component nhỏ, rõ, tái sử dụng được.
- Không nhét mọi thứ vào một component lớn.
- Server state quản lý bằng TanStack Query.
- Local UI state giữ tại component hoặc store nhỏ.
- Tách:
  - `api/`
  - `components/`
  - `features/`
  - `pages/`
  - `hooks/`
  - `i18n/`
  - `types/`

## 15. Thứ Tự Triển Khai

Làm theo thứ tự này:

1. Dựng app shell, routing, theme, i18n
2. Tạo typed API client và mock layer
3. Làm job portal candidate: feed, search, filter, detail
4. Làm candidate upload, profile, recommendation, applications
5. Làm Hồ sơ & CV: multi-CV, fixed profile và portfolio
6. Làm recruiter overview và recruiter HR job dashboard
7. Làm AutoFit policy UI, automation history, email confirm/result pages
8. Làm job scan/digest/high-match settings và skip interaction UX
9. Làm biểu đồ, thống kê, feedback modal, invite flow
10. Làm auto-refresh, polling, error handling
11. Tối ưu responsive, accessibility, motion
12. Hoàn thiện polish và test UI

## 16. Tiêu Chí Hoàn Thành

Frontend chỉ coi là xong khi:

- Vào app thấy đúng thương hiệu `CareerFit IT`
- Candidate dùng được job feed/search/filter/detail như web tìm việc
- Candidate upload CV và xem ranking được
- Candidate quản lý nhiều CV, chọn CV mặc định, khai báo hồ sơ cố định và portfolio được
- Candidate khai báo preference và xem recommendation được
- Recruiter xem ranking, applicant, potential, invite được
- Recruiter overview và HR job dashboard tách riêng đúng route
- Email action confirm/result pages hoạt động
- AutoFit policy UI hoạt động
- Scan frequency/digest/high-match settings hiển thị và lưu được
- Timezone/quiet hours/cooldown hiển thị đúng nếu backend hỗ trợ
- Skip trên web ẩn job ngay; skip qua email không hiển thị flow gửi job kế tiếp ngay
- Action history/audit summary hiển thị được
- Đổi ngôn ngữ vi/en được
- Score hiển thị theo phần trăm
- `Potential` hiển thị đúng
- Auto-apply UI hoạt động
- Có chart xu hướng
- Giao diện responsive và đẹp

## 17. Nguyên Tắc Cuối Cùng

- Đừng làm UI generic.
- Đừng bỏ qua design system.
- Đừng phá luồng nghiệp vụ để chiều layout.
- Nếu backend chưa có thật, hãy dựng mock contract đúng như trên để frontend vẫn chạy end-to-end.
- Nếu gặp điểm mơ hồ, ưu tiên đọc lại tài liệu gốc trước khi tự bịa.
