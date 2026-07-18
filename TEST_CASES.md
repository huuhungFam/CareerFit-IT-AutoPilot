# CareerFit IT AutoPilot - Test Cases

Tài liệu này liệt kê bộ test case bao phủ các chức năng chính của project CareerFit IT AutoPilot dựa trên SRS, kiến trúc và code hiện tại. Mục tiêu là tạo regression matrix thực dụng cho backend API, frontend UI, database, integration, security và các luồng lỗi thường gặp.

Lưu ý: "mọi tình huống" trong thực tế là không hữu hạn. Bộ test này bao phủ các use case chính, happy path, negative path, boundary case, authorization, data integrity và failure mode quan trọng. Khi thêm feature mới, cần bổ sung test case theo cùng format.

## 1. Phạm Vi Và Quy Ước

### 1.1. Môi Trường Test

| Thành phần | Giá trị mặc định |
|---|---|
| Frontend | `http://127.0.0.1:5173` |
| Backend | `http://localhost:8080` |
| API base | `http://localhost:8080/api` |
| PostgreSQL host | `localhost:5433` |
| Database | `careerfit` |
| DB user | `careerfit` |
| Candidate demo | `ca` / `1` |
| Recruiter demo | `re` / `1` |

### 1.2. Mức Ưu Tiên

| Priority | Ý nghĩa |
|---|---|
| P0 | Bắt buộc pass trước demo, ảnh hưởng luồng chính hoặc bảo mật |
| P1 | Quan trọng cho regression, ảnh hưởng trải nghiệm hoặc dữ liệu |
| P2 | Edge case, UX polish, khả năng mở rộng hoặc vận hành |

### 1.3. Ký Hiệu Actor

| Actor | Mô tả |
|---|---|
| Guest | Chưa đăng nhập |
| Candidate | Ứng viên đã đăng nhập |
| Recruiter | Nhà tuyển dụng đã đăng nhập |
| Admin | Quản trị hệ thống |
| System | Background worker, async job, scheduler |

### 1.4. Dữ Liệu Test Chuẩn Bị

| Mã dữ liệu | Mô tả |
|---|---|
| `CANDIDATE_TOKEN` | JWT lấy từ `POST /api/auth/login` với `ca` / `1` |
| `RECRUITER_TOKEN` | JWT lấy từ `POST /api/auth/login` với `re` / `1` |
| `ADMIN_TOKEN` | JWT lấy từ `POST /api/auth/login` với `ad` / `1` sau khi Flyway chạy đến V13 |
| `ACTIVE_JOB_ID` | Job có `status = ACTIVE` |
| `CLOSED_JOB_ID` | Job có `status = CLOSED` |
| `DRAFT_JOB_ID` | Job có `status = DRAFT` |
| `CANDIDATE_CV_ID` | CV thuộc Candidate hiện tại; với DB đã chạy Flyway đến V7, account `ca` có default CV seeded |
| `OTHER_CV_ID` | CV thuộc Candidate khác |
| `APPLICATION_ID` | Application thuộc Candidate hiện tại |
| `OTHER_APPLICATION_ID` | Application thuộc Candidate khác |
| `EMAIL_ACTION_TOKEN` | Token email action còn hạn và status pending |

### 1.5. Cách Test Theo Cấp Độ

| Cấp độ test | Khi nào dùng | Lệnh/cách chạy | Kết quả cần đạt |
|---|---|---|---|
| Smoke local infra | Trước mọi buổi code/demo | `docker compose up -d postgres` và `docker compose ps` | PostgreSQL healthy, port `5433->5432` |
| Backend unit/integration | Sau khi sửa backend | `cd Backend\careerfit-backend` rồi `.\mvnw.cmd test` | Build success; test fail phải sửa trước khi demo |
| Backend compile nhanh | Khi chỉ cần kiểm tra compile | `.\mvnw.cmd -DskipTests compile` | Không lỗi compile/import |
| Frontend build | Sau khi sửa frontend/types/API mapping | `cd Frontend` rồi `npm run build` | TypeScript/Vite build success |
| API smoke thủ công | Khi backend đang chạy | Dùng curl/PowerShell trong mục regression | Endpoint public 200, protected 401/403 đúng |
| UI demo tuần tự | Trước demo | Chạy theo `DEMO_FUNCTIONAL_TEST_SCENARIO.md` | Guest/Candidate/Recruiter/Admin flow chính pass và cleanup hoàn tất |
| API/E2E kỹ thuật | Khi cần đối chứng request/response | Chạy theo `CAREERFIT_E2E_TEST_SCRIPT.md` | Contract và lifecycle API chính pass |
| DB sạch | Trước khi chốt demo | `docker compose down -v`, start lại DB/backend | Flyway chạy hết, seed `ca/re/ad` hoạt động |
| Security smoke | Khi sửa auth/role/token | Dùng token sai role gọi protected endpoint | Không bypass được role; inactive user bị chặn |

### 1.5.1. Coverage Backend Tự Động Hiện Có

Tại ngày 2026-06-21, lệnh `./mvnw test` chạy **44 test, 0 failures, 0 errors, 0 skipped**. Docker Desktop phải hoạt động để các test Testcontainers chạy trên PostgreSQL thật; nếu Docker không khả dụng thì không được coi là một lần regression đầy đủ.

| Lớp test | Số test | Phạm vi chính |
|---|---:|---|
| `ApiContractIntegrationTest` | 4 | Login seed, role security, settings persistence, validation envelope, recruiter JD lifecycle và CSV UTF-8 |
| `ApplicationContextTest` | 1 | Spring context, PostgreSQL Testcontainers và Flyway V1-V14 |
| `AutoApplyServiceTest` | 4 | Policy, threshold, giới hạn mỗi lần chạy và duplicate application |
| `CandidateProfileServiceTest` | 4 | Portfolio normalization, URL security và ownership |
| `JobServiceTest` | 4 | Recruiter/admin status boundary, delete guard, CSV escaping và authorization |
| `MatchingBatchServiceTest` | 2 | Pagination ổn định và cô lập lỗi theo từng JD |
| `PdfExtractionServiceTest` | 6 | PDF text, DOCX, file rỗng/sai loại và image/OCR failure rõ ràng |
| `QualityValidationServiceTest` | 3 | Validation chất lượng CV/JD |
| `SettingsServiceTest` | 6 | Default theo role, merge persistence và type/range validation |
| `TfIdfPipelineTest` | 10 | Normalize, TF-IDF, cosine similarity và edge cases |

Quy tắc đọc kết quả:

- P0 fail: không demo, phải sửa.
- P1 fail: có thể demo nếu không nằm trong luồng bảo vệ, nhưng phải ghi bug/tồn đọng.
- P2 fail: ghi nhận cải thiện sau.
- Nếu backend trả HTML cho JSON API, xem là contract bug, trừ `/api/email-action/redeem`.
- Nếu frontend loading vô hạn, xem là UI bug dù backend lỗi đúng.

### 1.6. Traceability Use Case - Test Group

| Use case SRS | Nhóm test chính | Ghi chú |
|---|---|---|
| UC-C01, UC-R01 | Authentication, UI guard | Login password/passwordless, role redirect, suspended user |
| UC-C02, UC-C03, UC-C04, UC-C16, UC-C17 | Candidate Profile, CV, Portfolio | Upload PDF, manual CV, default CV, validation |
| UC-C05, UC-C06, UC-C14, UC-C15 | Job Portal Public, UI E2E | Search, filter, job detail, employer detail |
| UC-C07, UC-C18 | Matching, Recommendation, Contract | Score, label, potential, empty state, tie state |
| UC-C08, UC-C11 | Application Flow | Apply, duplicate prevention, withdraw, application history |
| UC-C09, UC-C13, UC-C19 | Automation Policy | Auto-Apply, threshold, email toggle, quiet hours/cooldown |
| UC-C10, UC-R10 | Email Action | Magic-link token, redeem, scanner protection, HTML success |
| UC-C12, UC-R08 | Matching, Recommendation, Feedback | Good/Bad/Potential/Not Interested, Rocchio effect |
| UC-R02, UC-R03 | Recruiter Job Management | Create/update/close JD, salary validation, recompute |
| UC-R04, UC-R05, UC-R06, UC-R12 | Recruiter Dashboard | Ranking, applicants, high/potential filter, tie metadata |
| UC-R07, UC-R13 | Application Flow | Invite candidate, update application status |
| UC-R09, UC-R11 | Automation, Analytics | Recruiter policy, digest, analytics overview |
| UC-A01, UC-A02 | Analytics, Audit, Admin | User suspend/activate, audit log filter |
| UC-A03, UC-A04 | Admin Email Monitor | Email action list/retry, token list/revoke, redaction |
| UC-A06, UC-A07 | Admin Job/System | Hide/restore job, rebuild matching |
| UC-S01 - UC-S14 | Smoke, DB, Contract, Reliability | Background jobs, scoring, notification, audit, inactive user |

## 2. Smoke Test Và Infrastructure

| ID | Priority | Type | Test case | Điều kiện | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|---|
| SMK-001 | P0 | Docker | PostgreSQL container chạy healthy | Docker Desktop đang chạy | Chạy `docker compose ps` | Service `careerfit-postgres` ở trạng thái `healthy`, port `5433->5432` |
| SMK-002 | P0 | DB | DB nhận kết nối | PostgreSQL healthy | Chạy `docker exec careerfit-postgres pg_isready -U careerfit -d careerfit` | Trả về `accepting connections` |
| SMK-003 | P0 | DB | Migration Flyway đã chạy | Backend từng khởi động | Query bảng `flyway_schema_history` | Có version migration `V1` đến version mới nhất, trạng thái success |
| SMK-004 | P0 | Backend | Backend khởi động thành công | Backend đang chạy port 8080 | Gọi `GET /swagger-ui.html` | HTTP 200 |
| SMK-005 | P0 | Backend | Endpoint protected trả 401 khi chưa login | Không có JWT | Gọi `GET /api/auth/me` | HTTP 401, body có `success=false`, `UNAUTHORIZED` |
| SMK-006 | P0 | Frontend | Frontend dev server hoạt động | Vite đang chạy | Mở `http://127.0.0.1:5173/` | Trang guest render không crash |
| SMK-007 | P0 | Integration | CORS cho frontend hợp lệ | Frontend và backend cùng chạy | Gọi OPTIONS `/api/jobs/search` với Origin `http://127.0.0.1:5173` | HTTP 200, có `Access-Control-Allow-Origin` đúng |
| SMK-008 | P0 | Integration | Frontend gọi được backend auth | Backend chạy | Login từ UI hoặc gọi `POST /api/auth/login` | Nhận access token, UI chuyển route theo role |
| SMK-009 | P1 | Config | Backend dùng DB host đúng khi chạy Maven | PostgreSQL Docker ở host port 5433 | Khởi động backend local | Datasource là `localhost:5433`, migration chạy thành công |
| SMK-010 | P1 | Config | Backend dùng DB host đúng khi chạy Docker profile | Chạy `docker compose --profile backend up -d --build` | Xem log backend | Datasource là `postgres:5432`, backend không lỗi connection refused |
| SMK-011 | P1 | API contract | API public jobs không trả 500 | DB có job active | Gọi `GET /api/jobs/search?page=0&size=20` | HTTP 200, body có `success=true`, `data.jobs` là array |
| SMK-012 | P1 | API contract | API suggestions hoạt động | DB có seed job | Gọi `GET /api/jobs/search/suggestions?keyword=React` | HTTP 200, trả danh sách titles/companies/skills |
| SMK-013 | P1 | DB | Admin migration đã chạy | Backend từng khởi động | Query `flyway_schema_history` và login `ad` / `1` | Có V13 success, login trả role `ADMIN` |

## 3. Authentication Và Authorization

| ID | Priority | Type | Test case | Actor | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|---|
| AUTH-001 | P0 | API | Đăng ký Candidate hợp lệ | Guest | `POST /api/auth/register` với email mới, password >= 8, role `CANDIDATE` | HTTP 200/201, trả JWT, tạo user và candidate profile |
| AUTH-002 | P0 | API | Đăng ký Recruiter hợp lệ | Guest | `POST /api/auth/register` với role `RECRUITER` | HTTP 200/201, trả JWT, tạo user role recruiter |
| AUTH-003 | P0 | API | Đăng ký email trùng | Guest | Gửi lại email đã tồn tại | HTTP 409, không tạo user mới |
| AUTH-004 | P0 | API | Đăng ký email sai format | Guest | Email không hợp lệ | HTTP 400 validation error |
| AUTH-005 | P0 | API | Đăng ký password quá ngắn | Guest | Password dưới 8 ký tự | HTTP 400 validation error |
| AUTH-006 | P0 | API | Đăng ký role không hợp lệ | Guest | Role `MANAGER` | HTTP 400, message role chỉ nhận Candidate hoặc Recruiter |
| AUTH-007 | P0 | API | Login Candidate hợp lệ | Guest | `POST /api/auth/login` với `ca` / `1` | HTTP 200, trả token Bearer và user role `CANDIDATE` |
| AUTH-008 | P0 | API | Login Recruiter hợp lệ | Guest | `POST /api/auth/login` với `re` / `1` | HTTP 200, trả token Bearer và user role `RECRUITER` |
| AUTH-008A | P0 | API | Login Admin hợp lệ | Guest | `POST /api/auth/login` với `ad` / `1` | HTTP 200, trả token Bearer và user role `ADMIN` |
| AUTH-009 | P0 | API | Login sai password | Guest | Gửi password sai | HTTP 401, không trả token |
| AUTH-010 | P0 | API | Login user không tồn tại | Guest | Email chưa đăng ký | HTTP 401, không leak thông tin user |
| AUTH-011 | P0 | API | Login tài khoản bị suspend/inactive | Guest | Admin suspend user trước | Login | HTTP 403, message account disabled |
| AUTH-012 | P0 | API | Lấy current user với token hợp lệ | Candidate | `GET /api/auth/me` với `CANDIDATE_TOKEN` | HTTP 200, trả email, fullName, role, language |
| AUTH-013 | P0 | Security | Truy cập protected API không token | Guest | Gọi `/api/cv/me` | HTTP 401 |
| AUTH-014 | P0 | Security | Candidate gọi recruiter API | Candidate | Gọi `GET /api/recruiter/dashboard` | HTTP 403 |
| AUTH-015 | P0 | Security | Recruiter gọi candidate API | Recruiter | Gọi `GET /api/cv/me` | HTTP 403 |
| AUTH-016 | P0 | Security | Candidate gọi admin API | Candidate | Gọi `GET /api/admin/users` | HTTP 403 |
| AUTH-017 | P0 | Security | Token bị sửa payload | Candidate | Sửa 1 ký tự trong JWT rồi gọi `/api/auth/me` | HTTP 401 |
| AUTH-018 | P0 | Security | Token hết hạn | Candidate | Dùng token expired | HTTP 401 |
| AUTH-019 | P1 | API | Passwordless request email hợp lệ | Guest | `POST /api/auth/passwordless/request` | HTTP 200, trả raw token trong môi trường MVP |
| AUTH-020 | P1 | API | Passwordless request email không tồn tại | Guest | Email không có trong DB | HTTP 404 |
| AUTH-021 | P1 | API | Passwordless verify token hợp lệ | Guest | `POST /api/auth/passwordless/verify` với token mới | HTTP 200, token được mark used, trả JWT |
| AUTH-022 | P1 | API | Passwordless verify token đã dùng | Guest | Verify lại token cũ | HTTP 409 hoặc token already used |
| AUTH-023 | P1 | API | Passwordless verify token hết hạn | Guest | Dùng token expired | HTTP 410 hoặc token expired |
| AUTH-024 | P1 | UI | Login redirect `next` đúng role Candidate | Guest | Mở `/candidate/upload`, bấm login, đăng nhập Candidate | Chuyển về `/candidate/upload` |
| AUTH-025 | P1 | UI | Login redirect `next` sai role | Guest | Mở `/candidate/upload`, đăng nhập Recruiter | Chuyển về `/recruiter`, không vào candidate route |
| AUTH-026 | P1 | UI | Logout xóa session | Candidate | Login, logout từ Settings | localStorage token/account bị xóa, UI về guest/login |
| AUTH-027 | P1 | UI | Reload giữ session | Candidate | Login rồi refresh browser | UI restore account từ localStorage |
| AUTH-028 | P1 | UI | Login sai hiển thị lỗi | Guest | Nhập credential sai trên UI | Hiển thị validation error, không chuyển route |
| AUTH-029 | P2 | Security | Không lộ password hash qua API | Any | Kiểm tra response login/me/admin users | Không có field `passwordHash` |
| AUTH-030 | P2 | Security | Header Authorization sai scheme | Any | Dùng `Basic <token>` | HTTP 401 |

## 4. Job Portal Public Và Employer

| ID | Priority | Type | Test case | Actor | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|---|
| JOB-001 | P0 | API | Search jobs public không filter | Guest | `GET /api/jobs/search?page=0&size=20&sort=recent` | HTTP 200, chỉ trả job `ACTIVE`, phân trang đúng |
| JOB-002 | P0 | API | Search theo keyword title | Guest | Gọi `/api/jobs/search?keyword=React` | Kết quả title/company/originalText chứa keyword liên quan |
| JOB-003 | P1 | API | Search theo company | Guest | Keyword là tên công ty có trong seed | Trả job của công ty đó |
| JOB-004 | P1 | API | Search keyword không có kết quả | Guest | Keyword ngẫu nhiên | HTTP 200, `jobs=[]`, `total=0` |
| JOB-005 | P1 | API | Search location | Guest | `/api/jobs/search?location=Ho Chi Minh` | Chỉ trả job location phù hợp |
| JOB-006 | P1 | API | Search level | Guest | `/api/jobs/search?level=Mid` hoặc `MID` | Kết quả level phù hợp, case-insensitive nếu backend hỗ trợ |
| JOB-007 | P1 | API | Search language | Guest | `/api/jobs/search?language=en` | Chỉ trả job language `en` |
| JOB-008 | P1 | API | Sort recent | Guest | `sort=recent` | Job mới hơn đứng trước |
| JOB-009 | P1 | API | Sort salary ascending | Guest | `sort=salary_asc` | Job salaryMin thấp hơn đứng trước |
| JOB-010 | P1 | API | Sort salary descending | Guest | `sort=salary_desc` | Job salaryMax cao hơn đứng trước |
| JOB-011 | P1 | API | Page âm được normalize | Guest | `page=-1` | Không crash, page xử lý về 0 hoặc trả 400 nhất quán |
| JOB-012 | P1 | API | Size quá lớn bị giới hạn | Guest | `size=1000` | Không trả quá 50 item |
| JOB-013 | P1 | API | Size bằng 0 dùng default | Guest | `size=0` | Trả page size mặc định hoặc tối thiểu 1 theo code |
| JOB-014 | P1 | API | Keyword có khoảng trắng đầu cuối | Guest | `keyword=%20React%20` | Trim hoặc vẫn tìm đúng, không lỗi |
| JOB-015 | P1 | API | Keyword Unicode tiếng Việt | Guest | Keyword có dấu | Không lỗi encoding, trả kết quả nếu có |
| JOB-016 | P0 | API | Lấy job detail active | Guest | `GET /api/jobs/{ACTIVE_JOB_ID}` | HTTP 200, có title/company/skills/salary/originalText |
| JOB-017 | P0 | API | Lấy job detail UUID không tồn tại | Guest | `GET /api/jobs/{valid-random-uuid}` | HTTP 404 |
| JOB-018 | P0 | API | Lấy job detail UUID sai format | Guest | `GET /api/jobs/not-a-uuid` | HTTP 400 |
| JOB-019 | P1 | API | Public không thấy job draft trong search | Guest | Tạo DRAFT job rồi search | DRAFT không nằm trong danh sách search |
| JOB-020 | P1 | API | Suggestions keyword hợp lệ | Guest | `/api/jobs/search/suggestions?keyword=React` | Trả group titles/companies/skills, không duplicate |
| JOB-021 | P1 | API | Suggestions keyword rỗng | Guest | `/api/jobs/search/suggestions?keyword=` | HTTP 200, list rỗng |
| JOB-022 | P1 | API | Suggestions limit | Guest | Keyword phổ biến | Mỗi nhóm không vượt limit code định nghĩa |
| JOB-023 | P0 | UI | Guest mở trang `/jobs` | Guest | Mở route `/jobs` | Danh sách job public render, không yêu cầu login |
| JOB-024 | P0 | UI | Guest search từ home | Guest | Nhập keyword, bấm Search | Chuyển `/jobs?keyword=...`, danh sách filter theo keyword |
| JOB-025 | P1 | UI | Guest chọn suggestion | Guest | Focus input, nhập keyword, chọn suggestion | Input cập nhật, search chạy đúng |
| JOB-026 | P1 | UI | Guest mở job detail | Guest | Bấm job card | Route `/jobs/{jobId}` render detail |
| JOB-027 | P1 | UI | Apply public job yêu cầu login | Guest | Bấm Apply ở job public | Hiển thị login prompt hoặc chuyển login với next |
| JOB-028 | P1 | UI | Sticky apply bar xuất hiện khi scroll | Guest/Candidate | Mở job detail, scroll xuống | Sticky apply bar xuất hiện sau ngưỡng scroll |
| EMP-001 | P1 | API | Lấy employer featured | Guest | `GET /api/employers/featured` | HTTP 200, trả employer featured |
| EMP-002 | P1 | API | Lấy employer detail bằng slug | Guest | `GET /api/employers/{slug}` | HTTP 200, trả company profile |
| EMP-003 | P1 | API | Employer slug không tồn tại | Guest | `GET /api/employers/not-found` | HTTP 404 |
| EMP-004 | P1 | API | Lấy jobs của employer | Guest | `GET /api/employers/{slug}/jobs` | Chỉ trả job active thuộc employer |
| EMP-005 | P1 | UI | Mở employer detail từ card | Guest/Candidate | Bấm employer card | Route `/candidate/employers/{employerId}` render thông tin công ty và job |
| EMP-006 | P1 | API | Recruiter xem employer profile của mình | Recruiter | `GET /api/employers/me` | HTTP 200, chỉ profile của recruiter hiện tại |
| EMP-007 | P1 | API | Candidate không xem được `/employers/me` | Candidate | Gọi `GET /api/employers/me` | HTTP 403 |
| EMP-008 | P1 | API | Recruiter cập nhật employer profile | Recruiter | `PUT /api/employers/me` payload hợp lệ | HTTP 200, dữ liệu mới được lưu |

## 5. Candidate Profile, CV Và Portfolio

| ID | Priority | Type | Test case | Actor | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|---|
| CV-001 | P0 | API | Upload CV PDF text-based hợp lệ | Candidate | `POST /api/cv/upload` multipart file PDF | HTTP 200/201, tạo CV status processing/done, trả CV id |
| CV-002 | P0 | API | Upload không có file | Candidate | Gửi multipart thiếu file | HTTP 400 |
| CV-003 | P0 | API | Guest upload CV | Guest | Gọi `/api/cv/upload` không JWT | HTTP 401 |
| CV-004 | P0 | API | Recruiter upload CV | Recruiter | Gọi `/api/cv/upload` | HTTP 403 |
| CV-005 | P1 | API | Upload file không được hỗ trợ | Candidate | Upload `.txt`, `.exe` hoặc MIME không khớp extension | HTTP 400, không tạo CV |
| CV-006 | P1 | API | Upload PDF rỗng/quá ngắn | Candidate | PDF ít text | HTTP 400 hoặc CV status failed với failureReason |
| CV-007 | P1 | API | Upload PDF image-only có OCR | Candidate | PDF scan có nội dung rõ, Tesseract sẵn sàng | CV xử lý thành công hoặc status `SCORING_DONE`, có raw text/summary |
| CV-007B | P1 | API | Upload PDF image-only OCR fail | Candidate | Tesseract thiếu hoặc OCR text quá ít | CV status `FAILED` hoặc response lỗi rõ, không crash backend |
| CV-007C | P0 | API | Upload ảnh CV | Candidate | PNG/JPG rõ chữ, MIME đúng, Docker có Tesseract `vie+eng` | CV chuyển `SCORING_DONE`, raw text có nội dung OCR |
| CV-007D | P0 | API | Upload DOCX CV | Candidate | DOCX hợp lệ có ít nhất 50 ký tự | CV chuyển `SCORING_DONE`, raw text do Apache POI trích xuất |
| CV-008 | P1 | API | Upload file quá lớn | Candidate | File vượt limit cấu hình | HTTP 413 hoặc 400, không lưu file |
| CV-009 | P1 | Security | Upload filename path traversal | Candidate | Filename `../../x.pdf` | File lưu bằng safe path, không ghi ngoài storage |
| CV-010 | P0 | API | Manual CV hợp lệ | Candidate | `POST /api/cv/manual` với displayName/fullName/email/desiredTitle/years/skills | HTTP 200/201, tạo CV source `MANUAL` |
| CV-011 | P0 | API | Manual CV thiếu displayName | Candidate | Gửi displayName rỗng | HTTP 400 validation |
| CV-012 | P0 | API | Manual CV thiếu fullName | Candidate | fullName rỗng | HTTP 400 validation |
| CV-013 | P0 | API | Manual CV email sai format | Candidate | Email `abc` | HTTP 400 validation |
| CV-014 | P0 | API | Manual CV years âm | Candidate | yearsOfExperience = -1 | HTTP 400 |
| CV-015 | P0 | API | Manual CV years > 50 | Candidate | yearsOfExperience = 51 | HTTP 400 |
| CV-016 | P0 | API | Manual CV thiếu skills | Candidate | skills rỗng/null | HTTP 400 |
| CV-017 | P1 | API | Manual CV nhiều kỹ năng Unicode | Candidate | skills có tiếng Việt/công nghệ | Lưu đúng JSON, không lỗi encoding |
| CV-018 | P0 | API | Lấy danh sách CV của mình | Candidate | `GET /api/cv/me` | HTTP 200, trả list CV và defaultCvId |
| CV-019 | P0 | API | Lấy detail CV thuộc mình | Candidate | `GET /api/cv/{CANDIDATE_CV_ID}` | HTTP 200, trả rawText/topSkills/status |
| CV-020 | P0 | Security | Lấy CV của người khác | Candidate | `GET /api/cv/{OTHER_CV_ID}` | HTTP 403 hoặc 404, không leak dữ liệu |
| CV-021 | P1 | API | Lấy status CV | Candidate | `GET /api/cv/{cvId}/status` | HTTP 200, trả status/failureReason/lastScoredAt |
| CV-022 | P0 | API | Set default CV thuộc mình | Candidate | `POST /api/cv/{cvId}/set-default` | HTTP 200, CV đó default, các CV khác không default |
| CV-023 | P0 | DB | Chỉ có một CV default mỗi candidate | Candidate | Set default CV A rồi B | DB chỉ có B `is_default=true` |
| CV-024 | P0 | Security | Set default CV của người khác | Candidate | `POST /api/cv/{OTHER_CV_ID}/set-default` | HTTP 403 hoặc 404 |
| CV-025 | P1 | API | Delete CV thuộc mình | Candidate | `DELETE /api/cv/{cvId}` | HTTP 200/204, CV không còn xuất hiện |
| CV-026 | P1 | API | Delete CV default | Candidate | Delete default CV | Hệ thống xử lý rõ: chọn CV khác default hoặc default null |
| CV-027 | P1 | Security | Delete CV người khác | Candidate | `DELETE /api/cv/{OTHER_CV_ID}` | HTTP 403 hoặc 404 |
| CV-028 | P1 | Async | Upload CV trigger matching async | Candidate/System | Upload CV hợp lệ, chờ worker | Bảng `matching` có record cho active job tương thích |
| CV-029 | P1 | Async | CV failed không trigger matching | Candidate/System | Upload CV invalid | Không tạo matching, failureReason rõ |
| PROF-001 | P0 | API | Lấy profile Candidate | Candidate | `GET /api/candidates/me` | HTTP 200, trả candidateId/userId/profile fields |
| PROF-002 | P0 | API | Cập nhật profile hợp lệ | Candidate | `PATCH /api/candidates/me` | HTTP 200, fields thay đổi |
| PROF-003 | P1 | API | Cập nhật profile partial | Candidate | Chỉ gửi `desiredTitle` | Chỉ field đó thay đổi, field khác giữ nguyên |
| PROF-004 | P1 | API | YearsOfExperience âm | Candidate | `yearsOfExperience=-1` | HTTP 400 |
| PROF-005 | P1 | API | YearsOfExperience > 50 | Candidate | `yearsOfExperience=51` | HTTP 400 |
| PROF-006 | P1 | API | Field vượt max length | Candidate | `aboutMe` > 3000 ký tự | HTTP 400 |
| PROF-007 | P1 | API | Cập nhật account fullName/avatar | Candidate | `PATCH /api/candidates/me/account` | HTTP 200, user fullName/avatar đổi |
| PROF-008 | P1 | UI | Trang Profile có 3 tab | Candidate | Mở `/candidate/profile` | Có CV đã tạo, Hồ sơ cố định, Portfolio/Dự án |
| PORT-001 | P1 | API | Lấy portfolio rỗng | Candidate | `GET /api/candidates/me/portfolio` user mới | HTTP 200, links/projects là array rỗng |
| PORT-002 | P1 | API | Thêm portfolio link hợp lệ | Candidate | `POST /portfolio/links` với type/url | HTTP 200/201, trả id |
| PORT-003 | P1 | API | Link URL quá dài | Candidate | URL > 500 ký tự | HTTP 400 |
| PORT-004 | P1 | API | Cập nhật portfolio link | Candidate | `PATCH /portfolio/links/{linkId}` | HTTP 200, dữ liệu đổi |
| PORT-005 | P1 | Security | Cập nhật link người khác | Candidate | PATCH link không thuộc mình | HTTP 403 hoặc 404 |
| PORT-006 | P1 | API | Xóa portfolio link | Candidate | DELETE link thuộc mình | HTTP 200/204 |
| PORT-007 | P1 | API | Thêm project hợp lệ | Candidate | `POST /portfolio/projects` | HTTP 200/201, trả project id |
| PORT-008 | P1 | API | Project name quá dài | Candidate | name > 255 ký tự | HTTP 400 |
| PORT-009 | P1 | API | Project techStack lưu đúng | Candidate | Gửi nhiều tech stack | Response trả đúng list |
| PORT-010 | P1 | API | Cập nhật project | Candidate | PATCH project thuộc mình | HTTP 200 |
| PORT-011 | P1 | API | Xóa project | Candidate | DELETE project thuộc mình | HTTP 200/204 |
| PORT-012 | P2 | Security | XSS trong portfolio summary | Candidate | Nhập `<script>alert(1)</script>` | Backend lưu an toàn, frontend render escaped, script không chạy |

## 6. Matching, Recommendation Và Feedback

| ID | Priority | Type | Test case | Actor | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|---|
| MAT-001 | P0 | Unit | Cosine similarity vector giống nhau | System | Gọi scoring với CV/JD vector giống nhau | rawScore gần 1, normalized gần 100 |
| MAT-002 | P0 | Unit | Cosine similarity vector không giao nhau | System | CV vector và JD vector khác hoàn toàn | rawScore 0, label LOW |
| MAT-003 | P1 | Unit | Vector rỗng không crash | System | CV/JD vector `{}` | Score 0, không throw exception |
| MAT-004 | P1 | Unit | JSON vector lỗi không crash | System | extractedTermsJson invalid JSON | Log warning/error, dùng empty vector |
| MAT-005 | P0 | Unit | Label HIGH | System | Score trên ngưỡng high | Label HIGH |
| MAT-006 | P0 | Unit | Label MEDIUM | System | Score trong medium range | Label MEDIUM theo rule hiện tại |
| MAT-007 | P0 | Unit | Label LOW | System | Score dưới low range | Label LOW |
| MAT-008 | P1 | Unit | Potential khi có transferable skills | System | Score medium, sharedTerms >= 3 | `isPotential=true`, có potentialReason |
| MAT-009 | P1 | Unit | Không Potential khi score quá thấp | System | Score < 35 | `isPotential=false` |
| MAT-010 | P1 | Unit | Không Potential khi đã HIGH | System | Score >= 75 | `isPotential=false` |
| MAT-011 | P1 | Unit | Language compatible cùng ngôn ngữ | System | CV `vi`, Job `vi` | Matching được tính |
| MAT-012 | P1 | Unit | English job accept all CV | System | CV `vi`, Job `en` | Matching được tính |
| MAT-013 | P1 | Unit | Language không tương thích bị skip | System | CV `en`, Job `vi` | Matching bị skip |
| MAT-014 | P0 | API | Candidate xem matches của mình | Candidate | `GET /api/matches/me` | HTTP 200, chỉ match của Candidate hiện tại |
| MAT-015 | P0 | API | Candidate xem job cards cá nhân hóa | Candidate | `GET /api/matches/me/cards?page=0&size=20` | HTTP 200, trả score/label/reasons |
| MAT-016 | P0 | Security | Guest xem matches | Guest | `GET /api/matches/me/cards` | HTTP 401 |
| MAT-017 | P0 | Security | Recruiter xem candidate matches endpoint | Recruiter | `GET /api/matches/me/cards` | HTTP 403 |
| MAT-018 | P1 | API | Pagination matches | Candidate | page/size khác nhau | total/page/size/totalPages đúng |
| MAT-019 | P1 | API | Match reasons tối đa 5 shared terms cộng domain | Candidate/System | Tạo CV/JD có nhiều overlap | Response reasons không quá dài, ưu tiên term quan trọng |
| REC-001 | P0 | API | Candidate xem recommendations | Candidate | `GET /api/recommendations/jobs` | HTTP 200, trả danh sách job gợi ý |
| REC-002 | P0 | Security | Guest xem recommendations | Guest | `GET /api/recommendations/jobs` | HTTP 401 |
| REC-003 | P0 | Security | Recruiter xem recommendations candidate | Recruiter | `GET /api/recommendations/jobs` | HTTP 403 |
| REC-004 | P1 | API | Similar jobs public | Guest | `GET /api/recommendations/jobs/{jobId}/similar` | HTTP 200, trả job tương tự |
| REC-005 | P1 | API | Similar jobs với job không tồn tại | Guest | UUID random | HTTP 404 |
| FB-001 | P0 | API | Candidate feedback GOOD_MATCH | Candidate | `POST /api/matches/{matchingId}/feedback?type=GOOD_MATCH&channel=WEB&role=CANDIDATE` | HTTP 200, tạo feedback, trigger Rocchio/recompute nếu có |
| FB-002 | P0 | API | Candidate feedback NOT_INTERESTED | Candidate | `POST /api/matches/{matchingId}/feedback?type=NOT_INTERESTED&channel=WEB&role=CANDIDATE` | Feedback lưu, recommendation giảm ưu tiên job tương tự |
| FB-003 | P0 | Security | Feedback match người khác | Candidate | matchingId không thuộc Candidate | HTTP 403 hoặc 404 |
| FB-004 | P1 | API | Feedback type không hợp lệ | Candidate | type `UNKNOWN` | HTTP 400 |
| FB-005 | P1 | API | Feedback duplicate cùng match | Candidate | Gửi feedback nhiều lần | Hệ thống update hoặc reject nhất quán, không tạo duplicate ngoài ý muốn |
| FB-006 | P1 | Integration | Feedback qua email tạo cùng effect với web | Email Recipient | Redeem GOOD_MATCH token hoặc submit với `channel=EMAIL` khi có token hợp lệ | Feedback source `EMAIL`, matching được cập nhật như web |
| FB-007 | P1 | API | Recruiter đánh dấu Potential | Recruiter | `POST /api/matches/{matchingId}/feedback?type=POTENTIAL&channel=WEB&role=RECRUITER` | Feedback lưu với role Recruiter, ranking/potential pool cập nhật nhất quán |

## 7. Application Flow

| ID | Priority | Type | Test case | Actor | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|---|
| APP-001 | P0 | API | Candidate apply job bằng default CV | Candidate | `POST /api/applications` với `jobId`, `cvId=null` | HTTP 200/201, tạo application, dùng default CV |
| APP-002 | P0 | API | Candidate apply job bằng CV cụ thể | Candidate | Gửi `jobId` và `cvId` thuộc mình | Application link đúng CV |
| APP-003 | P0 | API | Apply khi chưa có default CV | Candidate | Không gửi cvId và Candidate chưa có CV default | HTTP 400, message yêu cầu upload/specify CV |
| APP-004 | P0 | API | Apply job không tồn tại | Candidate | jobId random | HTTP 404 |
| APP-005 | P0 | API | Apply job CLOSED/PAUSED/DRAFT | Candidate | jobId inactive | HTTP 400, job no longer accepting applications |
| APP-006 | P0 | API | Apply trùng job | Candidate | Apply cùng job lần 2 | HTTP 409, không tạo duplicate |
| APP-007 | P0 | Security | Apply bằng CV người khác | Candidate | `cvId=OTHER_CV_ID` | HTTP 403 |
| APP-008 | P0 | Security | Guest apply | Guest | `POST /api/applications` không token | HTTP 401 |
| APP-009 | P0 | Security | Recruiter apply | Recruiter | `POST /api/applications` | HTTP 403 |
| APP-010 | P1 | API | Cover letter optional | Candidate | Apply không coverLetter | Application tạo thành công |
| APP-011 | P1 | API | Cover letter dài | Candidate | CoverLetter vượt limit kỳ vọng | HTTP 400 nếu có limit, hoặc lưu an toàn nếu chưa có limit |
| APP-012 | P0 | API | Candidate xem applications của mình | Candidate | `GET /api/applications/me` | HTTP 200, chỉ application của Candidate hiện tại |
| APP-013 | P1 | API | Pagination applications | Candidate | page/size khác nhau | total/page/size đúng, size không vượt 50 |
| APP-014 | P0 | API | Withdraw application pending | Candidate | `DELETE /api/applications/{APPLICATION_ID}` | Status chuyển `NOT_INTERESTED`, audit log ghi nhận |
| APP-015 | P0 | API | Withdraw application finalised | Candidate | Application APPROVED/REJECTED | HTTP 400, không đổi status |
| APP-016 | P0 | Security | Withdraw application người khác | Candidate | DELETE other id | HTTP 403 hoặc 404 |
| APP-017 | P0 | API | Recruiter xem applicants job của mình | Recruiter | `GET /api/recruiter/jobs/{jobId}/applicants` | HTTP 200, trả applicants của job owned |
| APP-018 | P0 | Security | Recruiter xem applicants job người khác | Recruiter | jobId không thuộc recruiter | HTTP 403 |
| APP-019 | P1 | API | Filter applicants theo status | Recruiter | `?status=APPROVED` | Chỉ trả applicants status tương ứng |
| APP-020 | P0 | API | Recruiter update application status | Recruiter | `PATCH /api/recruiter/applications/{id}/status` với `APPROVED` | HTTP 200, status update, audit log |
| APP-021 | P0 | API | Recruiter update invalid status | Recruiter | status `UNKNOWN` | HTTP 400 |
| APP-022 | P0 | Security | Recruiter update application không thuộc job mình | Recruiter | PATCH other application | HTTP 403 |
| APP-023 | P1 | UI | Candidate xem trang applications | Candidate | Mở `/candidate/applications` | Danh sách ứng tuyển render, status rõ |
| APP-024 | P1 | UI | Guest vào applications bị guard | Guest | Mở `/candidate/applications` | Hiển thị login required với next |

## 8. Recruiter Job Management Và Dashboard

| ID | Priority | Type | Test case | Actor | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|---|
| RECJOB-001 | P0 | API | Recruiter tạo JD hợp lệ | Recruiter | `POST /api/jobs` payload đủ title/company/originalText/salaryMode | HTTP 201, job active/draft theo default, vector hóa JD |
| RECJOB-002 | P0 | API | Candidate không tạo JD | Candidate | `POST /api/jobs` | HTTP 403 |
| RECJOB-003 | P0 | API | Guest không tạo JD | Guest | `POST /api/jobs` | HTTP 401 |
| RECJOB-004 | P0 | API | Tạo JD thiếu title | Recruiter | title rỗng | HTTP 400 |
| RECJOB-005 | P0 | API | Tạo JD thiếu company | Recruiter | company rỗng | HTTP 400 |
| RECJOB-006 | P0 | API | Tạo JD thiếu originalText | Recruiter | originalText rỗng | HTTP 400 |
| RECJOB-007 | P0 | API | Tạo JD salaryMode null | Recruiter | salaryMode null | HTTP 400 |
| RECJOB-008 | P0 | API | Tạo JD salaryMode invalid | Recruiter | salaryMode `INVALID` | HTTP 400 |
| RECJOB-009 | P1 | API | Salary mode NEGOTIABLE không cần min/max | Recruiter | salaryMode `NEGOTIABLE`, min/max null | HTTP 201, salary display hợp lý |
| RECJOB-010 | P1 | API | Salary mode HIDDEN không lộ lương public | Recruiter | salaryMode `HIDDEN`, visible false | Public job salary là hidden/negotiable |
| RECJOB-011 | P1 | API | Salary RANGE min > max | Recruiter | min 3000, max 1000 | HTTP 400 nếu rule đã có; nếu chưa, ghi nhận bug cần bổ sung validation |
| RECJOB-012 | P1 | API | Required skills JSON lưu đúng | Recruiter | requiredSkills nhiều item | Public detail trả đúng list |
| RECJOB-013 | P1 | Async | Tạo JD trigger recompute/mark existing matches | Recruiter/System | Tạo job mới | Existing matching liên quan được score/mark recompute theo service hiện tại |
| RECJOB-014 | P0 | API | Recruiter update JD thuộc mình | Recruiter | `PATCH /api/jobs/{id}` | HTTP 200, fields đổi |
| RECJOB-015 | P0 | Security | Recruiter update JD người khác | Recruiter | PATCH job không thuộc mình | HTTP 403 |
| RECJOB-016 | P1 | Async | Update originalText trigger recompute | Recruiter/System | PATCH originalText | Job vector update, matching cần recompute |
| RECJOB-017 | P0 | API | Update status ACTIVE -> CLOSED | Recruiter | `PATCH /api/jobs/{id}/status?status=CLOSED` | HTTP 200, job không còn trong public search |
| RECJOB-018 | P0 | API | Update status invalid | Recruiter | status `ARCHIVED` | HTTP 400 |
| RECJOB-019 | P0 | API | Delete job thuộc mình | Recruiter | `DELETE /api/jobs/{id}` | HTTP 200/204, job không còn truy cập hoặc bị xóa theo rule |
| RECJOB-020 | P0 | Security | Delete job người khác | Recruiter | DELETE other job | HTTP 403 |
| RECDASH-001 | P0 | API | Recruiter dashboard | Recruiter | `GET /api/recruiter/dashboard` | HTTP 200, trả totalJobs/activeJobs/totalApplicants/pendingReview/recentJobs |
| RECDASH-002 | P0 | API | Recruiter job list | Recruiter | `GET /api/recruiter/jobs` | HTTP 200, chỉ jobs của recruiter |
| RECDASH-003 | P0 | API | Job stats thuộc recruiter | Recruiter | `GET /api/recruiter/jobs/{jobId}/stats` | HTTP 200, số applicants/matches/views đúng |
| RECDASH-004 | P0 | Security | Job stats job người khác | Recruiter | Gọi stats other job | HTTP 403 |
| RECDASH-005 | P1 | API | Top candidates | Recruiter | `GET /api/recruiter/jobs/{jobId}/top-candidates` | HTTP 200, sắp xếp theo score |
| RECDASH-006 | P1 | API | Ranking CV theo JD | Recruiter | `GET /api/recruiter/jobs/{jobId}/ranking` | HTTP 200, trả match ranking |
| RECDASH-007 | P1 | UI | Recruiter home render summary | Recruiter | Mở `/recruiter` | Cards summary và recent jobs render |
| RECDASH-008 | P1 | UI | Recruiter HR dashboard | Recruiter | Mở `/recruiter/jobs` | Job list bên trái, detail/ranking/applicants/potential render |
| RECDASH-009 | P1 | UI | Candidate vào recruiter route bị redirect | Candidate | Mở `/recruiter/jobs` | Chuyển về `/candidate` |

## 9. Automation Policy Và Email Action

| ID | Priority | Type | Test case | Actor | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|---|
| AUTO-001 | P0 | API | Get policy tạo default nếu chưa có | Candidate/Recruiter | `GET /api/automation/policy` | HTTP 200, trả default policy |
| AUTO-002 | P0 | Security | Guest xem policy | Guest | `GET /api/automation/policy` | HTTP 401 |
| AUTO-003 | P0 | API | Update policy hợp lệ | Candidate | `PATCH /api/automation/policy` | HTTP 200, fields đổi |
| AUTO-004 | P1 | API | Update partial policy | Candidate | Chỉ gửi `digestEnabled=false` | Chỉ field đó đổi |
| AUTO-005 | P1 | API | minScoreToNotify âm | Candidate | `minScoreToNotify=-1` | HTTP 400 nếu validation có; nếu chưa, ghi nhận cần validate |
| AUTO-006 | P1 | API | minScoreToNotify > 100 | Candidate | `minScoreToNotify=101` | HTTP 400 nếu validation có; nếu chưa, ghi nhận cần validate |
| AUTO-007 | P1 | API | maxNotificationsPerDay âm | Candidate | `maxNotificationsPerDay=-1` | HTTP 400 nếu validation có; nếu chưa, ghi nhận cần validate |
| AUTO-008 | P1 | API | Pause automation | Candidate/Recruiter | `POST /api/automation/pause` | Policy có `pausedUntil` hoặc autopilot disabled theo implementation |
| AUTO-009 | P1 | API | Resume automation | Candidate/Recruiter | `POST /api/automation/resume` | Policy active lại |
| AUTO-010 | P1 | UI | Candidate automation page render | Candidate | Mở `/candidate/automation` | Panel policy hiển thị toggle/threshold/digest |
| AUTO-011 | P1 | UI | Recruiter automation page render | Recruiter | Mở `/recruiter/automation` | Panel policy phù hợp recruiter |
| AUTO-012 | P0 | API | Auto-Apply run-now khi policy tắt | Candidate | `POST /api/automation/auto-apply/run-now` với `autoApplyEnabled=false` | HTTP 200, `created=0`, `reason=AUTO_APPLY_DISABLED` |
| AUTO-013 | P0 | API | Auto-Apply run-now tạo application | Candidate | Bật `autoApplyEnabled=true`, threshold đủ thấp, gọi run-now | Tạo tối đa 3 application `AUTO_APPLIED`, không tạo trùng |
| AUTO-014 | P0 | API | Auto-Apply threshold ngoài range | Candidate | `PATCH /api/automation/policy` với `autoApplyThreshold=40` hoặc `101` | HTTP 400 structured validation, field `autoApplyThreshold`, reason `AUTO_APPLY_THRESHOLD_RANGE` |
| AUTO-015 | P1 | API | Email notification toggle off | Candidate | `PATCH /api/automation/policy/email-notifications` `{enabled:false}`, thực hiện action có email | Domain action vẫn chạy, email bị skip/log bởi notification policy |
| EMAIL-001 | P0 | API | Redeem GOOD_MATCH token pending | Email Recipient | `GET /api/email-action/redeem?token=...` | HTTP 200 HTML success, token status redeemed, feedback được ghi |
| EMAIL-002 | P0 | API | Redeem POTENTIAL token pending | Email Recipient | Redeem token POTENTIAL | Feedback Potential được ghi |
| EMAIL-003 | P0 | API | Redeem NOT_INTERESTED token pending | Email Recipient | Redeem skip token | Feedback Not Interested, token redeemed |
| EMAIL-004 | P0 | API | Redeem token không tồn tại | Email Recipient | token random | HTTP 200 HTML error, không throw stacktrace |
| EMAIL-005 | P0 | API | Redeem token đã xử lý | Email Recipient | Gọi cùng token lần 2 | HTML info "Đã xử lý", không tạo duplicate feedback |
| EMAIL-006 | P0 | API | Redeem token expired | Email Recipient | Token hết hạn | Token status EXPIRED, HTML error |
| EMAIL-007 | P1 | API | Redeem token thiếu query param | Email Recipient | `GET /redeem` không token | HTTP 400 hoặc HTML error nhất quán |
| EMAIL-008 | P1 | API | VIEW_JOB action không ghi feedback | Email Recipient | Redeem VIEW_JOB token | Token redeemed, không tạo feedback |
| EMAIL-009 | P1 | API | UNSUBSCRIBE_DIGEST action | Email Recipient | Redeem unsubscribe token | Digest disabled hoặc ghi nhận cần implement nếu chưa có |
| EMAIL-010 | P1 | Security | Link scanner không tạo action ngoài ý muốn | Email Recipient/System | HEAD/GET scanner pattern nếu có | Không redeem khi chưa có user intent nếu feature chống scanner được implement |
| EMAIL-011 | P2 | Security | Token không thể đoán | System | Kiểm tra format/randomness token | Token đủ dài, không tuần tự |

## 10. Analytics, Audit Và Admin

| ID | Priority | Type | Test case | Actor | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|---|
| ANA-001 | P1 | API | Analytics stats public | Guest | `GET /api/analytics/stats` | HTTP 200, trả tổng job/company/... đúng contract |
| ANA-002 | P1 | API | Analytics trend public | Guest | `GET /api/analytics/trend` | HTTP 200, trả time series |
| ANA-003 | P1 | API | Analytics roles public | Guest | `GET /api/analytics/roles` | HTTP 200, trả distribution theo role |
| ANA-004 | P1 | API | Analytics khi DB ít dữ liệu | Guest | Xóa seed trong DB test riêng | HTTP 200, trả số 0/list rỗng, không 500 |
| ANA-005 | P1 | UI | Job market dashboard render | Guest/Candidate/Recruiter | Mở home/dashboard | Chart không crash, label/value hiển thị |
| ANA-006 | P1 | API | Market advanced overview public | Guest | `GET /api/analytics/market/overview?rangeDays=30` | HTTP 200, có activeJobs/topSkills/salaryDistribution |
| ANA-007 | P1 | API | Candidate advanced analytics | Candidate | Login `ca/1`, gọi `GET /api/candidate/analytics/overview` | HTTP 200, chỉ trả dữ liệu candidate hiện tại |
| ANA-008 | P1 | Security | Guest không gọi candidate analytics | Guest | `GET /api/candidate/analytics/overview` | HTTP 401 |
| ANA-009 | P1 | API | Recruiter advanced analytics | Recruiter | Login `re/1`, gọi `GET /api/recruiter/analytics/overview` | HTTP 200, chỉ thống kê job thuộc recruiter |
| ANA-010 | P1 | API | Recruiter job funnel ownership | Recruiter | Gọi `/api/recruiter/analytics/jobs/{jobId}/funnel` với job người khác | HTTP 403 |
| ANA-011 | P1 | API | Analytics event tracking | Authenticated | `POST /api/analytics/events` event `JOB_VIEWED` | HTTP 200, lưu `analytics_event` |
| ANA-012 | P1 | API | Analytics event type invalid | Authenticated | `POST /api/analytics/events` event `UNKNOWN` | HTTP 400, error code/message rõ |
| ANA-013 | P1 | UI | Candidate Advanced Analytics route | Candidate | Login `ca/1`, mở `/candidate/advanced-analytics` | Hero, metric cards, market trend, skill demand, salary distribution và candidate panel render |
| ANA-014 | P1 | UI | Recruiter Advanced Analytics route | Recruiter | Login `re/1`, mở `/recruiter/advanced-analytics` | Hero, metric cards, market widgets và top performing jobs render |
| ANA-015 | P1 | UI | Recruiter basic analytics không bị thay thế | Recruiter | Mở `/recruiter/analytics`, sau đó `/recruiter/advanced-analytics` | Hai route render hai UI khác nhau, route cũ không có `.advanced-analytics-hero` |
| AUD-001 | P0 | DB | Register ghi audit log | Guest/System | Register user mới | Bảng `audit_log` có action `REGISTER` |
| AUD-002 | P0 | DB | Submit application ghi audit log | Candidate/System | Apply job | Audit action `APPLICATION_SUBMITTED` |
| AUD-003 | P1 | DB | Withdraw application ghi audit log | Candidate/System | Withdraw | Audit action `APPLICATION_WITHDRAWN` |
| AUD-004 | P1 | DB | Admin action ghi audit log | Admin/System | Suspend hoặc activate user | Audit ghi actor admin và target user |
| ADMIN-001 | P0 | Security | Guest không gọi admin API | Guest | `GET /api/admin/users` | HTTP 401 |
| ADMIN-002 | P0 | Security | Candidate không gọi admin API | Candidate | `GET /api/admin/users` | HTTP 403 |
| ADMIN-003 | P0 | API | Admin xem dashboard | Admin | `GET /api/admin/dashboard` | HTTP 200, trả metrics users/jobs/matching/email actions |
| ADMIN-004 | P0 | API | Admin xem users | Admin | `GET /api/admin/users?page=0&size=10` | HTTP 200, có danh sách user và không lộ password hash |
| ADMIN-005 | P0 | API | Admin filter/search users | Admin | `GET /api/admin/users?role=CANDIDATE&keyword=ca` | HTTP 200, chỉ trả user phù hợp filter nếu có dữ liệu |
| ADMIN-006 | P0 | API | Admin suspend user | Admin | `POST /api/admin/users/{userId}/suspend` | User inactive, login mới bị chặn, JWT cũ bị chặn 403 ở request sau |
| ADMIN-007 | P0 | API | Admin activate user | Admin | `POST /api/admin/users/{userId}/activate` | User active, login lại được |
| ADMIN-008 | P1 | API | Admin xem jobs | Admin | `GET /api/admin/jobs?page=0&size=10` | HTTP 200, có danh sách job moderation |
| ADMIN-009 | P1 | API | Admin hide job | Admin | `POST /api/admin/jobs/{jobId}/hide` | Job status thành `HIDDEN_BY_ADMIN`, không xuất hiện trong feed candidate active |
| ADMIN-010 | P1 | API | Admin restore job | Admin | `POST /api/admin/jobs/{jobId}/restore` | Job status trở lại `ACTIVE` |
| ADMIN-011 | P1 | API | Admin xem audit logs | Admin | `GET /api/admin/audit-logs?page=0&size=10` | HTTP 200, logs mới nhất trước |
| ADMIN-012 | P1 | API | Audit log filter không lỗi PostgreSQL type | Admin | `GET /api/admin/audit-logs?actionType=USER_SUSPENDED&page=0&size=5` | HTTP 200, không lỗi `upper(bytea)` |
| ADMIN-013 | P1 | API | Admin xem email actions | Admin | `GET /api/admin/email-actions?page=0&size=10` | HTTP 200, id/token hiển thị dạng redacted |
| ADMIN-014 | P1 | API | Admin retry email action lỗi | Admin | `POST /api/admin/email-actions/{actionId}/retry` | Action lỗi được đưa về pending hoặc trả lỗi rõ nếu trạng thái không hợp lệ |
| ADMIN-015 | P1 | API | Admin xem email tokens | Admin | `GET /api/admin/email-tokens?page=0&size=10` | HTTP 200, không leak raw token |
| ADMIN-016 | P1 | API | Admin revoke email token | Admin | `POST /api/admin/email-tokens/{tokenId}/revoke` | Token bị revoke, magic-link tương ứng không dùng được |
| ADMIN-017 | P1 | API | Admin rebuild matching | Admin | `POST /api/admin/matching/rebuild?cvId={cvId}` | Job async/rebuild chạy hoặc trả accepted |
| ADMIN-018 | P1 | Runtime | Scheduler email action không rollback startup | System | Khởi động backend và xem log sau scheduler tick | Không có lỗi `f != java.lang.String`, `no Session`, `UnexpectedRollback` |

## 11. Frontend UI Và End-to-End

| ID | Priority | Type | Test case | Actor | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|---|
| UI-001 | P0 | Route | Guest home | Guest | Mở `/` | Header guest, search hero, public jobs, employer section |
| UI-002 | P0 | Route | Login page | Guest | Mở `/login` | Form username/password, button sign in |
| UI-003 | P1 | Route | Register page | Guest | Mở `/register` | Form render, mode register text |
| UI-004 | P0 | Guard | Guest mở protected Candidate route | Guest | Mở `/candidate/upload` | Login required panel, next path đúng |
| UI-005 | P0 | Guard | Guest mở protected Recruiter route | Guest | Mở `/recruiter/jobs` | Login required panel |
| UI-006 | P0 | Guard | Candidate mở Candidate home | Candidate | Login `ca`/`1`, mở `/candidate` | Dashboard Candidate render |
| UI-007 | P0 | Guard | Recruiter mở Recruiter home | Recruiter | Login `re`/`1`, mở `/recruiter` | Dashboard Recruiter render |
| UI-008 | P0 | Guard | Candidate vào recruiter route | Candidate | Mở `/recruiter` | Redirect về `/candidate` |
| UI-009 | P0 | Guard | Recruiter vào candidate route | Recruiter | Mở `/candidate` | Redirect về `/recruiter` |
| UI-009A | P0 | Guard | Admin mở Admin home | Admin | Login `ad`/`1`, mở `/admin` | Admin Dashboard render, sidebar admin hiển thị |
| UI-009B | P0 | Guard | Candidate vào admin route | Candidate | Mở `/admin` | Redirect về `/candidate` hoặc bị chặn theo role guard |
| UI-009C | P0 | Guard | Recruiter vào admin route | Recruiter | Mở `/admin` | Redirect về `/recruiter` hoặc bị chặn theo role guard |
| UI-009D | P1 | UI | Admin user management render | Admin | Mở `/admin/users` | Bảng user render, filter/search không crash |
| UI-009E | P1 | UI | Admin job moderation render | Admin | Mở `/admin/jobs` | Bảng job moderation render, hide/restore action có trạng thái rõ |
| UI-009F | P1 | UI | Admin audit log render | Admin | Mở `/admin/audit-logs` | Audit logs render, filter không làm treo loading |
| UI-009G | P1 | UI | Admin email monitor render | Admin | Mở `/admin/email-monitor` | Email actions/tokens render, token/action id đã redact |
| UI-009H | P1 | UI | Admin API lỗi hiển thị rõ | Admin | Tắt backend hoặc dùng token hết hạn rồi mở `/admin` | Hiển thị error panel, không loading vô hạn |
| UI-010 | P1 | UI | Search input Enter | Guest/Candidate | Nhập keyword, bấm Enter | Chạy search, URL query cập nhật |
| UI-011 | P1 | UI | Clear search keyword | Guest/Candidate | Bấm nút clear trong search | Input rỗng, kết quả reset |
| UI-012 | P1 | UI | Filter modal mở/đóng | Guest/Candidate | Bấm Filter, đóng modal | Modal không làm mất state |
| UI-013 | P1 | UI | Skip job trong list | Candidate | Bấm Skip | Job biến khỏi danh sách hiện tại |
| UI-014 | P1 | UI | Job preview/detail panel | Candidate | Hover/click job nếu có preview | Detail panel cập nhật đúng job |
| UI-014A | P1 | UX | Job card polish | Guest/Candidate | Mở `/jobs`, xem job list | Card có company avatar, metadata icon, insight row, action bar; không overflow text |
| UI-015 | P1 | UI | Upload page có 2 tab | Candidate | Mở `/candidate/upload` | Có Document Parser và Manual Creation |
| UI-016 | P1 | UI | Manual CV form validation UI | Candidate | Submit form rỗng | Hiển thị lỗi/không gửi request không hợp lệ |
| UI-017 | P1 | UI | Profile tabs không nhầm Portfolio với Upload CV | Candidate | Mở `/candidate/profile` | Portfolio nằm trong Profile, không nằm ở Upload CV |
| UI-018 | P1 | UI | Recommendations page | Candidate | Mở `/candidate/recommendations` | Cards có score/reasons/actions |
| UI-019 | P1 | UI | Candidate settings logout | Candidate | Mở settings, logout | Session clear, route về guest/login |
| UI-020 | P1 | UI | Candidate delete account action | Candidate | Bấm delete account nếu có confirm | Session clear hoặc account disabled theo implementation |
| UI-021 | P1 | UI | Recruiter jobs navigation tabs | Recruiter | Mở ranking/applicants/potential URL | Nội dung tương ứng render |
| UI-022 | P1 | UI | Recruiter settings | Recruiter | Mở `/recruiter/settings` | Company/team/JD defaults/notifications render |
| UI-023 | P1 | UI | Automation confirm page | Guest | Mở `/automation/confirm` | Confirm/reject buttons render, result route hoạt động |
| UI-024 | P1 | UI | Language switch | Guest/Candidate | Đổi ngôn ngữ nếu control có | Text đổi vi/en, state không mất |
| UI-025 | P0 | Integration | Frontend không âm thầm dùng mock khi backend OK | Guest | Backend OK, mở Network `/api/jobs/search` | Request trả 200; UI hiển thị data từ backend |
| UI-026 | P1 | Integration | Backend offline không bị mock che lỗi | Guest | Tắt backend, mở frontend | UI không crash, hiển thị loading/error/empty phù hợp và không hiển thị dữ liệu API giả |
| UI-026A | P2 | UX | Job list skeleton loading | Guest/Candidate | Throttle network hoặc delay API job list | Khi chưa có data render, skeleton card xuất hiện và layout không nhảy mạnh |
| UI-027 | P1 | Responsive | Mobile home | Guest | Viewport 390x844 | Không overlap text/buttons, nav usable |
| UI-028 | P1 | Responsive | Mobile recruiter dashboard | Recruiter | Viewport mobile | Panels stack hợp lý, không tràn ngang |
| UI-029 | P1 | Responsive | Desktop wide | Guest/Candidate/Recruiter | Viewport 1440x900 | Layout cân đối, chart/list không vỡ |
| UI-030 | P1 | Accessibility | Keyboard navigation | Guest | Tab qua login/search/buttons | Focus visible, thứ tự hợp lý |
| UI-031 | P1 | Accessibility | Button accessible names | Any | Inspect buttons icon-only | Có aria-label hoặc text |
| UI-032 | P1 | Accessibility | Color contrast | Any | Kiểm tra text chính/buttons | Contrast đạt mức đọc được |
| UI-033 | P2 | Accessibility | Reduced motion | Any | Bật `prefers-reduced-motion`, reload UI | Animation/transition được giảm, UI vẫn usable |

## 12. API Contract Frontend - Backend

| ID | Priority | Type | Test case | Endpoint | Kết quả mong đợi |
|---|---|---|---|---|---|
| CONTRACT-001 | P0 | Contract | Login response map được sang account frontend | `POST /api/auth/login` | Có `accessToken`, `user.email`, `user.fullName`, `user.role` |
| CONTRACT-002 | P0 | Contract | Public job list map được sang `Job` UI | `GET /api/jobs/search` | Mỗi job có `id`, `title`, `company`, optional salary/skills/status |
| CONTRACT-003 | P0 | Contract | Job detail map được sang detail UI | `GET /api/jobs/{id}` | Có `originalText`, `niceToHaveSkills`, salary display |
| CONTRACT-004 | P0 | Contract | Candidate job cards map được | `GET /api/matches/me/cards` | Có `id`, score/label/reasons; field thiếu dùng giá trị rỗng an toàn, không lấy mock job |
| CONTRACT-005 | P1 | Contract | Suggestions response đúng group | `GET /api/jobs/search/suggestions` | Body có `titles`, `companies`, `skills` |
| CONTRACT-006 | P0 | Contract | Recruiter dashboard response đúng | `GET /api/recruiter/dashboard` | Có `activeJobs`, `pendingReview`, `totalApplicants`, `recentJobs` |
| CONTRACT-007 | P0 | Contract | Recruiter jobs response đúng | `GET /api/recruiter/jobs` | Array job có `id`, `title`, `status`, applicant/match counts |
| CONTRACT-008 | P1 | Contract | Error envelope nhất quán | Any failing API | Body có `success=false`, `error.code`, `error.message` |
| CONTRACT-009 | P1 | Contract | Không trả HTML cho JSON API | Any `/api/*` JSON endpoint | `Content-Type: application/json`, trừ `/api/email-action/redeem` |
| CONTRACT-010 | P1 | Contract | Date format parse được JS | Jobs/CV/Application | Date là ISO string hoặc format JS `Date` parse được |
| CONTRACT-011 | P1 | Contract | List metadata cho candidate matches | `GET /api/matches/me/cards` hoặc `/api/matches/me` | `data.meta.generatedAt`, `resultState`, `message`, `suggestions` tồn tại hoặc null hợp lệ |
| CONTRACT-012 | P1 | Contract | List metadata cho applications | `GET /api/applications/me` | `data.meta.resultState` là `READY`, `NO_MATCH` hoặc `NO_FILTERED_RESULTS` |
| CONTRACT-013 | P1 | Contract | Recruiter discovery metadata | `GET /api/recruiter/jobs/{jobId}/candidates` | Có `resultState`, `message`, `generatedAt`, `lastUpdatedAt`, `suggestions` |
| CONTRACT-014 | P1 | Contract | Recruiter ranking metadata | `GET /api/recruiter/jobs/{jobId}/ranking` | Có `data.meta`, tie metadata vẫn giữ trong candidate item |

## 13. Database Và Data Integrity

| ID | Priority | Type | Test case | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|
| DB-001 | P0 | Migration | Chạy migration trên DB sạch | `docker compose down -v`, start lại, chạy backend | Tất cả migrations success |
| DB-002 | P0 | Migration | Seed idempotent | Chạy lại migration trong DB đã có seed hoặc kiểm tra `ON CONFLICT` | Không duplicate user/job/employer |
| DB-003 | P0 | Constraint | User email unique | Insert/register email trùng | DB/API reject duplicate |
| DB-004 | P0 | Constraint | Job status chỉ nhận enum hợp lệ | Insert status invalid trực tiếp DB test | DB check constraint reject |
| DB-005 | P0 | Constraint | Job salary_mode chỉ nhận enum hợp lệ | Insert invalid salary_mode | DB reject |
| DB-006 | P0 | FK | Job recruiter_id phải tồn tại | Insert job với recruiter_id random | DB reject FK |
| DB-007 | P0 | FK | Application job_id phải tồn tại | Insert application job_id random | DB reject FK |
| DB-008 | P0 | FK | Matching cv/job phải tồn tại | Insert matching invalid FK | DB reject |
| DB-009 | P1 | Data | JSONB skills lưu và đọc đúng | Tạo CV/JD có skills list | Query DB và API trả list đúng |
| DB-010 | P1 | Data | Timestamp created/updated | Create rồi update entity | `created_at` giữ nguyên, `updated_at` đổi |
| DB-011 | P1 | Data | Delete job có relation | Delete job có application/matching | Hành vi đúng theo FK/cascade, không orphan ngoài ý muốn |
| DB-012 | P1 | Data | Delete CV có matching/application | Delete CV đang dùng | Hành vi rõ: reject hoặc cascade theo rule, không orphan |
| DB-013 | P1 | Index | Search jobs dùng index cơ bản | EXPLAIN query search phổ biến | Không full scan quá nặng khi dữ liệu lớn, nếu cần bổ sung index |
| DB-014 | P1 | Backup | Volume persist sau restart | Restart container không down -v | Data vẫn còn |
| DB-015 | P1 | Clean | `docker compose down -v` xóa data | Down với `-v`, up lại | DB reset, seed chạy lại |

## 14. Security Và Negative Testing

| ID | Priority | Type | Test case | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|
| SEC-001 | P0 | Auth | API protected không bypass bằng query param | Gọi `/api/cv/me?role=RECRUITER` không token | HTTP 401 |
| SEC-002 | P0 | Auth | Role lấy từ JWT server-verified | Sửa localStorage account thành recruiter nhưng token Candidate | Backend vẫn 403 với recruiter API |
| SEC-003 | P0 | IDOR | Candidate không truy cập tài nguyên Candidate khác | Dùng ID CV/Application/Portfolio khác | HTTP 403/404 |
| SEC-004 | P0 | IDOR | Recruiter không truy cập job/applicant recruiter khác | Dùng jobId khác owner | HTTP 403 |
| SEC-005 | P0 | Injection | SQL injection keyword search | `keyword=' OR '1'='1` | Không lỗi SQL, không trả dữ liệu vượt điều kiện |
| SEC-006 | P0 | Injection | SQL injection login email | email chứa SQL payload | HTTP 401/400, DB an toàn |
| SEC-007 | P0 | XSS | XSS trong job title/company | Tạo job title chứa script | Frontend render escaped, script không chạy |
| SEC-008 | P0 | XSS | XSS trong CV/profile/portfolio | Gửi script trong aboutMe/project | Frontend escaped, API không trả HTML unsafe nếu không cần |
| SEC-009 | P1 | Upload | Upload malware disguised PDF | File PDF có nội dung nguy hiểm | Không thực thi file, lưu trong storage an toàn |
| SEC-010 | P1 | Upload | Upload filename Unicode/ký tự đặc biệt | Filename lạ | Không crash, path sanitize |
| SEC-011 | P1 | CORS | Origin không được allow | Origin `http://evil.test` | Không có allow-origin hoặc request bị chặn |
| SEC-012 | P1 | Rate | Brute force login | Gửi nhiều login sai liên tục | Nếu chưa có rate limit, ghi nhận risk; không crash backend |
| SEC-013 | P1 | Error | Backend không leak stack trace | Gây lỗi API | Response không có stack trace/classpath/password |
| SEC-014 | P1 | Headers | Security headers cơ bản | Gọi API | Có `X-Content-Type-Options`, frame/cache headers theo config |
| SEC-015 | P1 | Token | Email action token single-use | Redeem cùng token 2 lần | Lần 2 không tái thực hiện action |
| SEC-016 | P1 | Token | Passwordless token single-use | Verify token 2 lần | Lần 2 reject |
| SEC-017 | P1 | Privacy | Public API không trả candidate private data | Guest gọi jobs/employers/analytics | Không có email/phone/CV rawText candidate |
| SEC-018 | P1 | Privacy | Recruiter chỉ thấy applicant liên quan job mình | Recruiter applicants | Không thấy Candidate ngoài job/apply/match hợp lệ |

## 15. Reliability, Performance Và Edge Cases

| ID | Priority | Type | Test case | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|
| NFR-001 | P0 | Reliability | Backend restart không mất DB data | Restart backend | API vẫn trả seed/user/job |
| NFR-002 | P1 | Reliability | DB restart trong lúc backend chạy | Restart postgres container | Backend recover hoặc trả lỗi rõ, sau DB up API hoạt động lại |
| NFR-003 | P1 | Reliability | Async matching exception isolated | Gây lỗi scoring 1 CV/job | Các CV/job khác vẫn được xử lý |
| NFR-004 | P1 | Performance | Public search dưới 1 giây | DB seed/demo | p95 dưới 1s |
| NFR-005 | P1 | Performance | Login dưới 1 giây | Gọi login nhiều lần | p95 dưới 1s |
| NFR-006 | P1 | Performance | Upload CV trả id nhanh | Upload PDF hợp lệ | Response nhận CV id nhanh, scoring async không block quá lâu |
| NFR-007 | P1 | Performance | Search size lớn bị cap | `size=1000` | Không làm backend trả payload quá lớn |
| NFR-008 | P1 | Performance | Frontend build thành công | `cd Frontend && npm run build` | TypeScript và Vite build pass |
| NFR-009 | P1 | Maintainability | Backend compile/test | `mvn test` hoặc `mvn package` | Build pass |
| NFR-010 | P1 | Observability | Log lỗi có request id | Gây lỗi API | Log/response có requestId hoặc đủ trace vận hành |
| NFR-011 | P2 | Browser | Chrome latest | Chạy E2E trên Chrome | UI hoạt động |
| NFR-012 | P2 | Browser | Edge latest | Chạy smoke trên Edge | UI hoạt động |
| NFR-013 | P2 | Browser | Network slow | Throttle slow 3G | Loading/fallback không vỡ UI |
| NFR-014 | P2 | Offline | Backend offline khi frontend chạy | Tắt backend | UI fallback mock hoặc hiển thị lỗi thân thiện |
| NFR-015 | P2 | Timezone | Ngày giờ hiển thị theo locale | Data ISO UTC | UI hiển thị ngày đúng locale, không lệch nghiêm trọng |

## 16. Acceptance Test Theo Luồng Chính

| ID | Priority | Luồng | Actor | Bước test | Kết quả mong đợi |
|---|---|---|---|---|---|
| E2E-001 | P0 | Guest job search | Guest | Mở `/`, search `React`, mở job detail | Search và detail hoạt động không cần login |
| E2E-002 | P0 | Candidate login and apply | Candidate | Login `ca`/`1`, mở job active, apply bằng default CV | Application tạo thành công, xuất hiện ở `/candidate/applications` |
| E2E-003 | P0 | Candidate upload CV to match cards | Candidate | Upload CV hợp lệ, chờ scoring, mở `/candidate/jobs` | Cards có score/reasons hoặc match list update |
| E2E-004 | P0 | Candidate manual CV to recommendations | Candidate | Tạo manual CV, set default, mở recommendations | Recommendation/match cards dùng CV mới |
| E2E-005 | P0 | Recruiter create JD to public search | Recruiter | Login `re`/`1`, tạo JD active, logout, search public | Job mới xuất hiện public |
| E2E-006 | P0 | Recruiter dashboard applicants | Recruiter | Candidate apply job của recruiter, recruiter mở applicants | Applicant xuất hiện đúng job |
| E2E-007 | P1 | Recruiter status update application | Recruiter | Update applicant status APPROVED | Candidate applications thấy status mới |
| E2E-008 | P1 | Feedback learning | Candidate | Candidate feedback NOT_INTERESTED trên match | Feedback lưu, recommendation sau đó giảm/ẩn job tương ứng nếu implemented |
| E2E-009 | P1 | Email action | Email Recipient | Redeem GOOD_MATCH token | HTML success, feedback source EMAIL |
| E2E-010 | P1 | Automation policy | Candidate | Update threshold/digest, reload page | Policy giữ nguyên sau reload |
| E2E-011 | P1 | Employer browsing | Guest | Mở featured employer, mở job của employer | Employer detail và job detail hoạt động |
| E2E-012 | P1 | Login next intent | Guest/Candidate | Mở protected route, login đúng role | Quay lại intent ban đầu |
| E2E-013 | P0 | Admin control panel | Admin | Login `ad`/`1`, mở `/admin`, `/admin/users`, `/admin/jobs`, `/admin/audit-logs`, `/admin/email-monitor` | Các trang render từ backend, không loading vô hạn |
| E2E-014 | P0 | Admin role guard | Candidate/Recruiter | Dùng token candidate/recruiter gọi `/api/admin/dashboard` | HTTP 403, UI không cho vào `/admin` |
| E2E-015 | P0 | Admin suspend user | Admin/Candidate | Admin suspend candidate, candidate dùng JWT cũ gọi `/api/auth/me`, admin activate lại | JWT cũ bị chặn 403 sau suspend; activate khôi phục |
| E2E-016 | P1 | Admin job moderation | Admin/Candidate | Admin hide job rồi kiểm tra candidate active feed, sau đó restore | Job `HIDDEN_BY_ADMIN` không xuất hiện trong feed active; restore về `ACTIVE` |
| E2E-017 | P1 | Validation suggestions | Candidate/Recruiter | Submit manual CV/JD/salary invalid | UI hiển thị field-level error/suggestion, backend trả envelope validation |
| E2E-018 | P1 | Matching empty states | Candidate/Recruiter | Dùng filter hoặc data test tạo `NO_MATCH`, `LOW_MATCH_ONLY`, `NO_FILTERED_RESULTS` | UI hiển thị CTA/suggestion đúng, không crash |
| E2E-019 | P1 | Ranking tie state | Recruiter | Chuẩn bị nhiều candidate score bằng nhau, mở ranking/discovery | UI hiển thị tie note, thứ tự ổn định |
| E2E-020 | P1 | Email notification toggle | Candidate | Tắt email notification, thực hiện apply/withdraw/invite | Domain action vẫn chạy, email bị skip/log |
| E2E-021 | P1 | Auto-Apply run-now | Candidate | Bật auto-apply threshold hợp lệ, gọi run-now | Tạo tối đa 3 application hoặc trả reason hợp lệ |
| E2E-022 | P1 | Passwordless dev flow | Guest | Request passwordless, dùng dev token verify | Verify trả JWT, token used không dùng lại được |
| E2E-023 | P0 | Settings persistence | Candidate | Đổi alert threshold, lưu, reload rồi khôi phục giá trị cũ | PATCH `/api/settings/me` trả 200 và giá trị vẫn đúng sau reload |
| E2E-024 | P0 | Recommendations API | Candidate | Mở `/candidate/recommendations`, chọn job đầu tiên | Danh sách lấy từ `/api/matches/me/cards`, mở đúng `/candidate/jobs/{id}` |
| E2E-025 | P0 | Role route smoke | Candidate/Recruiter/Admin | Duyệt toàn bộ route chính theo role và theo dõi `pageerror` | Mọi route render `main` không rỗng và không có runtime error |

## 17. Checklist Chạy Regression Nhanh Trước Demo

1. Chạy DB:

```powershell
docker compose up -d
docker compose ps
```

2. Chạy backend:

```powershell
cd Backend\careerfit-backend
mvn spring-boot:run
```

3. Chạy frontend:

```powershell
cd Frontend
npm install
npm run dev
```

4. Kiểm tra smoke:

```powershell
curl.exe -i http://localhost:8080/swagger-ui.html
curl.exe -i http://localhost:8080/api/auth/me
curl.exe -i "http://localhost:8080/api/jobs/search?page=0&size=20"
curl.exe -i "http://localhost:8080/api/jobs/search/suggestions?keyword=React"
```

5. Kiểm tra login và role Admin:

```powershell
$adminLogin = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login -ContentType 'application/json' -Body (@{ email = 'ad'; password = '1' } | ConvertTo-Json)
$adminHeaders = @{ Authorization = "Bearer $($adminLogin.data.accessToken)" }
Invoke-RestMethod -Method Get -Uri http://localhost:8080/api/admin/dashboard -Headers $adminHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/admin/audit-logs?page=0&size=5" -Headers $adminHeaders
```

6. Kiểm tra candidate API chính:

```powershell
$candidateLogin = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login -ContentType 'application/json' -Body (@{ email = 'ca'; password = '1' } | ConvertTo-Json)
$candidateHeaders = @{ Authorization = "Bearer $($candidateLogin.data.accessToken)" }
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/matches/me/cards?page=0&size=10" -Headers $candidateHeaders
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/applications/me?page=0&size=10" -Headers $candidateHeaders
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/automation/auto-apply/run-now" -Headers $candidateHeaders
```

7. Kiểm tra build:

```powershell
cd Frontend
npm run build
```

```powershell
cd Backend\careerfit-backend
mvn test
```

8. Kiểm tra UI thủ công:

- `/`
- `/jobs`
- `/candidate/jobs`
- `/candidate/applications`
- `/candidate/automation`
- `/recruiter/jobs`
- `/admin`
- `/admin/users`
- `/admin/jobs`
- `/admin/audit-logs`
- `/admin/email-monitor`

## 18. Gợi Ý Tự Động Hóa Test

| Nhóm test | Công cụ đề xuất | Ghi chú |
|---|---|---|
| Unit backend | JUnit 5, Mockito | ScoringService, TfIdfService, TextNormalizationService, AuthService validation |
| Integration backend | Spring Boot Test, Testcontainers PostgreSQL | Auth, CV, job, application, matching repository |
| API regression | REST Assured hoặc Postman/Newman | Contract và security matrix |
| Frontend unit | Vitest, React Testing Library | API mapping, route guard, form validation |
| E2E UI | Playwright | Guest search, login next, candidate apply, recruiter dashboard |
| Security smoke | OWASP ZAP baseline, custom curl scripts | CORS, auth bypass, XSS smoke, upload tests |
| Performance smoke | k6 hoặc JMeter | Search/login/upload endpoint |

## 19. Test Case Cần Bổ Sung Khi Feature Mới Hoàn Thiện

| Khu vực | Test bổ sung |
|---|---|
| OCR CV | PDF scan, ảnh xoay, tiếng Việt có dấu, OCR timeout, thiếu Tesseract host, Docker image có `vie+eng` |
| Advanced Analytics UI | drill-down cho `/candidate/advanced-analytics`, `/recruiter/advanced-analytics`, event tracking integration đầy đủ |
| Email provider thật | SMTP failure, retry, bounce, unsubscribe thật |
| Scheduler thật | hourly scan, daily digest, weekly summary, timezone/quiet hours |
| Admin nâng cao | Admin edit chi tiết user/job, export audit, phân quyền admin nhiều cấp, dashboard vận hành sâu |
| Advanced recommendation | A/B ranking, personalization vector drift, cold start |
| Production deploy | HTTPS, reverse proxy headers, DB cloud connection, storage S3/Supabase |
