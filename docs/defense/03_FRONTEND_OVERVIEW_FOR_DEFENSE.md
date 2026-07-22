# Tổng Quan Frontend CareerFit Dành Cho Buổi Bảo Vệ

## 1. Mức độ cần hiểu

Không cần thuộc toàn bộ CSS hoặc từng component. Cần trả lời được:

- URL nào mở màn hình nào?
- Màn hình dành cho role nào?
- Dữ liệu đến từ API nào?
- Token được gửi ra sao?
- UI xử lý loading, lỗi và empty state như thế nào?

## 2. Công nghệ chính

- React: xây giao diện từ component.
- TypeScript: kiểm tra kiểu dữ liệu.
- Vite: dev server và build.
- React Router: ánh xạ URL với page.
- TanStack React Query: tải, cache và làm mới server state.
- `fetch` qua API client: giao tiếp backend.

## 3. Entry point

`src/main.tsx` gắn React vào DOM và bao ứng dụng bằng các provider. `src/App.tsx` khai báo route, trạng thái tài khoản và page chính. `AppShell` chứa layout/navigation chung.

Luồng đọc tối thiểu:

```text
main.tsx -> App.tsx -> Route -> Page -> hook/API -> backend
```

## 4. Route và phân quyền

Các route công khai gồm trang chủ, danh sách job, job detail, login/register, `/auth/magic-link/verify` và trang xác nhận automation.

Candidate có các vùng `/candidate/...`: job, upload CV, profile, recommendation, application, automation, analytics và settings.

Recruiter có các vùng `/recruiter/...`: dashboard, jobs, ranking/applicants/potential, analytics, automation và settings.

Admin có `/admin`, `/admin/users`, `/admin/jobs`, `/admin/audit-logs` và `/admin/email-monitor`.

Hàm `protectedRoute` trong `App.tsx` giúp điều hướng đúng role. Tuy nhiên backend vẫn phải kiểm tra quyền vì người dùng có thể gọi API mà không qua UI.

## 5. API client

`src/lib/api.ts` là file quan trọng nhất khi giải thích tích hợp. Hàm `request<T>`:

1. Ghép API base URL và path.
2. Đọc token từ `sessionStorage`.
3. Gắn `Authorization: Bearer ...` khi có token.
4. Gửi request.
5. Parse response/error thành `ApiRequestError` có HTTP status.
6. Trả dữ liệu theo generic type `T`.

Admin có `src/lib/adminApi.ts` cho các API quản trị.

## 6. Data flow ví dụ

Candidate mở trang việc làm:

```text
CandidateJobsPage
  -> useJobs/useQuery
  -> api.searchJobs(...)
  -> GET /api/jobs/search
  -> backend trả DTO
  -> mapper/default value
  -> JobCard render
```

Candidate apply:

```text
Click Apply
  -> hàm async gọi API trực tiếp
  -> POST /api/applications
  -> success: thông báo + invalidate/refetch query
  -> error: hiển thị message phù hợp
```

## 7. Những API chính đang được frontend gọi

- Auth: login/register, `/auth/me`, passwordless request/inspect/verify.
- Job công khai: `/jobs/search`, `/jobs/{id}`, suggestions và employer detail/jobs.
- Candidate: `/candidates/me`, CV upload/detail/status/delete/set-default, portfolio.
- Matching: `/matches/me/cards`.
- Application: `/applications`, `/applications/me`.
- Automation: `/automation/policy`, email toggle, run-now.
- Recruiter: dashboard, jobs, candidates, invite, application status.
- Feedback Candidate: `/matches/{matchingId}/feedback?type=...&channel=WEB`.
- Analytics: market/candidate/recruiter analytics.
- Admin: dashboard, users, jobs, audit và email monitor.

API base URL thường đã có `/api`, vì vậy method trong `api.ts` dùng path như `/jobs/search`.

## 8. React Query

Code hiện dùng `useQuery` cho dữ liệu đọc và `useQueryClient` để invalidate cache. Các thao tác thay đổi dữ liệu chưa dùng `useMutation`; page gọi hàm async trong `careerfitApi`, tự quản lý saving/error rồi invalidate/refetch query liên quan.

Các trạng thái phải xử lý riêng:

- `isLoading`: đang chờ.
- `error`: request thất bại.
- data rỗng: request thành công nhưng không có kết quả.
- success: render dữ liệu.

API mapper hiện không còn lấy score, skill, salary hay mô tả từ `mockJobs`; field thiếu được chuyển thành giá trị trung tính như `0`, danh sách rỗng hoặc “Not specified”. `src/data/mock.ts` vẫn còn một số hằng UI cục bộ như preference/automation mẫu, nên khi trình bày phải phân biệt chúng với dữ liệu API.

## 9. TypeScript và DTO mapping

`src/types.ts` định nghĩa model dùng trong UI. DTO backend có thể khác model hiển thị, vì vậy mapper chuyển đổi:

- Tên field.
- Enum thành label.
- `null` thành giá trị an toàn.
- Dữ liệu phân trang thành danh sách và metadata.

Mapper không nên che lỗi contract. Nếu backend đổi field quan trọng, frontend cần báo/handle rõ thay vì âm thầm tạo dữ liệu sai.

## 10. Authentication trên frontend

Sau login, frontend lưu token và thông tin tài khoản trong `sessionStorage`, rồi chuyển đến vùng theo role. Khi tải lại trang, `restoreSession()` gọi `/auth/me`; 401/403 sẽ xóa phiên, còn lỗi mạng tạm thời giữ identity đã được xác minh trước đó.

Magic-link dùng hai bước: UI gọi `GET /auth/passwordless/verify?token=...` để kiểm tra, sau khi người dùng xác nhận mới `POST /auth/passwordless/verify`, lưu JWT và gọi `/auth/me`.

`sessionStorage` giảm thời gian tồn tại so với local storage nhưng JavaScript vẫn đọc được token nếu có XSS. Production có thể cân nhắc cookie `HttpOnly`, CSP và chiến lược refresh token chặt chẽ hơn.

## 11. Các màn hình chính

### Candidate

- Home/job search: khám phá job.
- Job detail: đọc yêu cầu và hành động.
- Upload/profile: upload PDF/PNG/JPG/DOCX, polling trạng thái xử lý, xem/xóa/đặt CV mặc định và quản lý portfolio.
- Recommendations: xem kết quả cá nhân.
- Applications: theo dõi trạng thái.
- Automation: cấu hình policy.
- Analytics: nhìn khoảng cách kỹ năng/xu hướng.

### Recruiter

- Dashboard: tổng quan.
- Jobs: CRUD và trạng thái job.
- Ranking/applicants/potential: ba góc nhìn candidate; portfolio chỉ hiện sau apply nếu Candidate cho phép.
- Analytics: funnel, skill gap và trend.
- Automation/settings: điều khiển hành vi liên quan.

### Admin

- Dashboard vận hành.
- User moderation.
- Job moderation.
- Audit log.
- Email action/token monitor.

## 12. i18n và component

`LanguageProvider` quản lý ngôn ngữ. Component như `JobCard`, `Badges`, `StatCard`, `AutomationPolicyPanel` tái sử dụng UI và giảm logic lặp.

Page nên điều phối dữ liệu; component trình bày; API client giao tiếp mạng. Không nên nhét tất cả vào một file page.

## 13. Các lỗi tích hợp thường gặp

### 401

Token thiếu, hết hạn hoặc sai. Kiểm tra `sessionStorage`, header Authorization và thời gian token.

### 403

Token hợp lệ nhưng role/ownership không phù hợp. Không sửa bằng cách bỏ kiểm tra backend.

### CORS

Origin frontend chưa nằm trong allowed origins hoặc preflight bị chặn.

### Response mismatch

Frontend kỳ vọng mảng nhưng backend trả object phân trang, hoặc field đổi tên. Kiểm tra Network response và mapper.

### UI có dữ liệu khi backend tắt

Kiểm tra Network và error state. Các mapper job hiện dùng giá trị trung tính, không dùng `mockJobs` để che lỗi API. Nếu màn hình vẫn có dữ liệu khi backend tắt, kiểm tra các hằng UI cục bộ từ `src/data/mock.ts` và xác định rõ chúng không phải dữ liệu nghiệp vụ.

## 14. Cách giải thích frontend trong 30 giây

> Frontend là React SPA dùng React Router để chia màn hình theo role và React Query cho server state. `api.ts` gắn JWT từ sessionStorage, chuẩn hóa lỗi và map DTO mà không chèn dữ liệu job giả. Frontend đã có magic-link, CV polling, employer detail và portfolio visibility. Các thao tác ghi vẫn dùng hàm async thủ công; phân quyền giao diện chỉ hỗ trợ UX, backend mới thực thi bảo mật.

## 15. Câu hỏi thường gặp

**Vì sao dùng React Query?**  
Để chuẩn hóa loading/error/cache/refetch và tránh tự quản lý server state rải rác.

**Vì sao cần mapper?**  
Để UI không phụ thuộc tuyệt đối vào shape persistence/backend và để xử lý enum/null có kiểm soát.

**Frontend có bảo mật API không?**  
Không. Frontend chỉ giữ token và ẩn/hiện chức năng. Backend xác minh token, role và ownership.

**Nếu backend lỗi thì sao?**  
UI hiển thị trạng thái lỗi và cho phép thử lại. Không nên dùng dữ liệu giả để che lỗi trong môi trường thật.

## 16. Thứ tự đọc code

1. `src/main.tsx`.
2. Route trong `src/App.tsx`.
3. `src/lib/api.ts`.
4. `src/types.ts`.
5. Một Candidate page.
6. Một Recruiter page.
7. `AutomationPolicyPanel.tsx`.
8. `src/lib/adminApi.ts` và `AdminPages.tsx`.
9. `tests/backend-contracts.spec.ts`, `tests/resilience.spec.ts` và `tests/p0-flows.spec.ts`.

## 17. Lệnh kiểm tra frontend hiện tại

- `npm run type-check`: chạy TypeScript không emit.
- `npm run lint`: ESLint với `--max-warnings=0`.
- `npm run build`: type-check rồi Vite build.
- `npm test`: Playwright project Chromium.
- `npm run test:e2e` và `npm run test:e2e:prod`: các cấu hình E2E khác trong repo.
