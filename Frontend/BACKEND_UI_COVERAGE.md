# Backend - Frontend UI Coverage

Ngày rà soát: 2026-07-18

Tài liệu này là nguồn theo dõi trạng thái triển khai hiện tại giữa Spring Boot backend và React frontend. `srs.md`, `proposal.md` và `architecture.md` mô tả yêu cầu/kiến trúc đích; tài liệu này chỉ trả lời câu hỏi: backend đã có capability nào và frontend hiện đã có UI thực sự cho capability đó hay chưa.

## Phạm vi rà soát

- 22 Spring controller trong `Backend/careerfit-backend/src/main/java`.
- 95 handler mapping annotations (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
- Route React trong `Frontend/src/App.tsx`.
- API client trong `Frontend/src/lib/api.ts` và `Frontend/src/lib/adminApi.ts`.
- Các trang Guest, Candidate, Recruiter và Admin.

Không phải mọi endpoint đều cần một trang riêng. Endpoint telemetry, endpoint trùng mục đích, endpoint phục vụ redirect/HTML từ backend và endpoint kiểm tra session có thể được gọi nền hoặc không cần bề mặt UI độc lập.

## Kết luận

Frontend **đã phủ các workflow Candidate P0 theo contract backend hiện tại**: restore session, passwordless completion, CV async/management, recommendation feed và market dashboard. Các khoảng trống còn lại chủ yếu là recruiter drill-down, employer self-service, automation pause/resume, telemetry và admin operations; chúng được hoãn có chủ đích khỏi đợt này.

## Ma trận coverage theo domain

| Domain backend | UI hiện tại | Trạng thái | Ghi chú |
|---|---|---|---|
| Auth register/login | Login/Register và role redirect | Đủ | Gọi `/api/auth/register`, `/api/auth/login`. |
| Passwordless auth | Request và `/auth/magic-link/verify` | Đủ phía frontend | GET inspect, POST consume, lưu JWT, gọi `/api/auth/me` và redirect theo role. Backend email phải trỏ token về route frontend này. |
| Public jobs | Search, suggestion, list, detail, filter | Đủ | CRUD recruiter và public read đã nối API. Backend CSV export không được gọi trực tiếp nhưng UI xuất CSV từ dữ liệu recruiter thật. |
| Homepage market analytics | Cards và hai chart | Đủ | Dùng `/api/analytics/stats`, `/trend`, `/roles` và `/api/analytics/market/salary`; có loading/error/empty state. |
| Advanced market analytics | Candidate/Recruiter Advanced Analytics | Đủ phần tổng quan | Market overview/skills/salary/trends đã nối. `POST /api/analytics/events` chưa được phát từ UI. |
| Candidate analytics | Overview, profile gaps, trends | Đủ phần tổng quan | UI dùng dữ liệu gộp từ overview và match trends. Endpoint skill-demand/profile-gaps riêng có API client nhưng chưa gọi riêng. |
| Candidate profile | Hồ sơ cố định | Đủ | Đọc/cập nhật profile và account name. |
| Candidate portfolio | Link/project CRUD | Đủ | Create/update/delete và privacy display đã nối. |
| CV upload/manual | Document Parser và Manual Creation | Đủ | Poll `/api/cv/{cvId}/status` đến `SCORING_DONE`/`FAILED`, retry lỗi tạm thời, timeout và cho kiểm tra lại trạng thái. |
| CV management | List, detail, set default, delete | Đủ | Dùng `/api/cv/me`, `/api/cv/{cvId}` và DELETE; UI khóa xóa CV mặc định và không cung cấp edit vì backend chưa có update endpoint. |
| Candidate matching | Job cards, score, potential, feedback | Đủ cho feed | Dùng `/api/matches/me/cards`; endpoint `/api/matches/me` là representation thay thế, không bắt buộc có màn riêng. |
| Recommendations | Trang Gợi ý và similar jobs | Đủ | Trang Gợi ý dùng `/api/recommendations/jobs`; matching cards chỉ dùng cho Candidate Jobs. |
| Applications | Apply, list, withdraw | Đủ | Candidate flow đã nối API thật. |
| Employer public | Featured, detail, open jobs | Đủ | Dùng slug và ba endpoint public employer. |
| Employer recruiter self-service | Company profile settings | Thiếu | Chưa đọc/lưu `/api/employers/me`; recruiter Settings hiện chỉ lưu generic user settings. |
| Automation policy | Policy controls, email toggle, run now | Thiếu một phần | Policy chính đã nối; chưa có pause-until/resume cho `/api/automation/pause`, `/resume`. |
| Recruiter dashboard/jobs | Dashboard, JD CRUD, counts | Đủ phần chính | Dashboard và job list/CRUD đã nối. |
| Recruiter ranking/applicants | Ranking, Applied, Potential tabs | Thiếu một phần | UI chủ yếu dùng discovery `/candidates`; chưa dùng riêng ranking, applicants, stats và top-candidates endpoints nên pagination/status/funnel chuyên biệt chưa được phủ hết. |
| Recruiter Advanced Analytics | Overview, top jobs, trends | Thiếu drill-down | Chưa có UI cho job funnel và job skill-gap theo `jobId`. |
| Settings | Candidate/Recruiter settings | Đủ | `/api/settings/me` GET/PATCH đã nối đúng allowed keys. |
| Email action redemption | Confirm/result | Đủ qua backend HTML | Frontend chuyển token sang backend GET; backend render confirm và thực thi bằng POST. Không cần nhân đôi logic token trong React. |
| Admin dashboard/users/jobs/audit | Các route Admin chính | Đủ phần chính | Search/list, suspend/activate, hide/restore và audit log đã có. |
| Admin details/operations | User detail, matching rebuild | Thiếu | API client có rebuild đơn nhưng chưa có UI; chưa có batch rebuild và user-detail view. |
| Admin email monitor | List action/token, retry | Thiếu một phần | Chưa có nút revoke token dù API client và backend đã hỗ trợ. |

## Hạng mục hoàn thành 2026-07-18

1. Magic-link inspect/verify, lưu JWT, `/api/auth/me` và role redirect.
2. CV upload/manual polling với timeout, retry, terminal error; CV detail/delete và default-CV guard.
3. Job Market Dashboard dùng analytics API, không còn ngày/số liệu giả.
4. Recommendations dùng endpoint recommendation chuyên biệt.
5. Session reload được revalidate bằng `/api/auth/me`.

## Backlog UI còn lại

### P1 - Phủ capability nghiệp vụ và vận hành chính

1. Bổ sung recruiter company profile editor dùng `/api/employers/me` GET/PUT.
2. Tách Applied Applicants và Ranking sang endpoint chuyên biệt; thêm job stats/top candidates khi cần.
3. Thêm recruiter job analytics drill-down: funnel và skill-gap.
4. Thêm pause-until/resume trên Automation page.
5. Thêm Admin user detail, matching rebuild/batch rebuild và revoke email token với confirm dialog/audit feedback.

### P2 - Hoàn thiện instrumentation và độ bền session

1. Gửi analytics events cho job search, job view, apply và recruiter review ở các điểm backend mong đợi.
2. Bổ sung pagination/filter đầy đủ cho các bảng Admin và recruiter thay vì chỉ page mặc định.

## Quy tắc cập nhật

- Mỗi lần backend thêm controller/endpoint hoặc thay DTO, cập nhật ma trận này cùng frontend API client.
- Chỉ đánh dấu `Đủ` khi UI có loading, success, empty, error và mutation feedback; có component tĩnh chưa được xem là đủ.
- Endpoint không cần UI phải ghi rõ lý do, không được im lặng bỏ qua.
- Khi hoàn thành một backlog item, thêm Playwright test cho workflow tương ứng và cập nhật `Frontend/FRONTEND_UI_HISTORY_LOG.md`.
