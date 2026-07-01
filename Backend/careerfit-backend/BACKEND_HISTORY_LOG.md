# CareerFit Backend History Log

File này ghi lại lịch sử làm việc backend trong thread hiện tại: thời điểm, yêu cầu, nội dung đã phân tích/thực thi, file bị ảnh hưởng, kiểm chứng và điểm còn lại.

Ghi chú bảo mật: các credential như Gmail App Password, mật khẩu email hoặc token chỉ được ghi là `[REDACTED]`.

## Cách cập nhật

Khi có thay đổi backend mới, thêm entry theo mẫu:

```md
## YYYY-MM-DD HH:mm +07:00 - Tên thay đổi

- Yêu cầu:
- Đã thực hiện:
- File chính:
- Kiểm chứng:
- Ghi chú/rủi ro:
```

## Timeline Box Chat

### 2026-05-17 - Kiểm tra backend sau khi user bổ sung code

- Yêu cầu: đọc `BACKEND_DOCUMENTATION.md`, phân tích backend có cần chỉnh sửa/bổ sung gì không và lập kế hoạch.
- Nội dung chính:
  - Review tài liệu backend và đối chiếu code.
  - Xác định các điểm cần sửa: demo account, endpoint suggestion, skill suggestions, portfolio API, candidate job card DTO, validation/security, OCR, advanced analytics.
- Kết quả: có kế hoạch chỉnh backend theo từng nhóm.

### 2026-05-17 - Thực thi kế hoạch chỉnh sửa backend

- Yêu cầu: thực hiện kế hoạch chỉnh sửa.
- Nội dung chính:
  - Bổ sung/điều chỉnh demo accounts `ca / 1`, `re / 1`.
  - Thống nhất suggestion endpoint.
  - Bổ sung suggestion theo skills.
  - Hoàn thiện portfolio API cho Candidate profile.
  - Bổ sung DTO candidate job card có score/potential/reasons để frontend ít mapper hơn.
- Ghi chú: các thay đổi này nằm trong nhóm backend/domain/API trước khi có các nâng cấp sau.

### 2026-05-17 - Kiểm tra backend có đúng kế hoạch không

- Yêu cầu: kiểm tra kỹ backend có phù hợp kế hoạch không.
- Nội dung chính:
  - Đối chiếu lại backend với các file liên quan.
  - Xác nhận các API/DTO/seed/suggestion/profile đã được cập nhật theo kế hoạch.

### 2026-05-17 - Sửa lỗi backend start

- Yêu cầu: user báo `mvn spring-boot:run` fail với `Process terminated with exit code: 1`.
- Nội dung chính:
  - Kiểm tra nguyên nhân lỗi start.
  - Làm việc với PostgreSQL/Docker/Flyway/JPA để backend chạy được trong môi trường local.
- Ghi chú: lỗi dạng Maven `BUILD FAILURE` khi Spring Boot app exit code 1 thường do lỗi runtime bên trong app, không phải lỗi Maven compile.

### 2026-05-17 - Review validation và edge cases CV/JD

- Yêu cầu:
  - Backend đã có validation nào?
  - Có cần check CV/JD sai lệch hoặc quá khủng như Fresher yêu cầu 10 năm, Intern lương 20tr?
  - Nếu CV không match JD nào hoặc toàn điểm thấp thì sao?
  - Nếu nhiều JD cùng điểm cao nhất thì sao?
- Nội dung chính:
  - Phân tích validation hiện có.
  - Đề xuất bổ sung quality validation cho CV/JD.
  - Đề xuất xử lý no-match/low-match/tie-score.
- Kết quả: user yêu cầu bổ sung các đề xuất.

### 2026-05-17 - Bổ sung validation và exception bảo mật đủ dùng

- Yêu cầu: bổ sung các đề xuất và thêm exception bảo mật mức đủ dùng.
- Nội dung chính:
  - Bổ sung validation chất lượng CV/JD.
  - Bổ sung xử lý no-match/low-match/tie-score.
  - Bổ sung hardening exception/security response.
  - Thêm migration hardening.
- File tiêu biểu:
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/common/service/QualityValidationService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/common/exception/GlobalExceptionHandler.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/config/security/SecurityErrorResponseWriter.java`
  - `Backend/careerfit-backend/src/main/resources/db/migration/V8__database_hardening.sql`

### 2026-05-17 - Kiểm tra upload CV chỉ PDF và nâng cấp OCR

- Yêu cầu:
  - Hiện tại chỉ cho upload PDF thôi à?
  - Có phải chỉ quét PDF dạng text copy-paste được?
  - Muốn nâng cấp OCR cho PDF dạng ảnh.
- Nội dung chính:
  - Xác nhận upload hiện chỉ nhận PDF.
  - Nâng cấp PDF extraction: ưu tiên text extraction bằng PDFBox; nếu text quá ít thì render trang PDF thành ảnh và chạy Tesseract OCR.
  - Thêm config OCR trong `application.yml`.
  - Dockerfile cài Tesseract và language data `eng`, `vie`.
- File chính:
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/cv/service/PdfExtractionService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/config/AppProperties.java`
  - `Backend/careerfit-backend/src/main/resources/application.yml`
  - `Backend/careerfit-backend/Dockerfile`
- Kiểm chứng:
  - Compile/test backend.
  - Sau đó có 2 lỗi kiểm tra được khắc phục theo yêu cầu.

### 2026-05-17 - Advanced Analytics backend

- Yêu cầu:
  - Nâng cấp Advanced Analytics.
  - Giữ cái cũ hay thay thế?
  - Làm route riêng cho Advanced Analytics, backend trước, cập nhật tài liệu frontend sau.
- Quyết định:
  - Giữ analytics cơ bản cũ.
  - Bổ sung route Advanced Analytics riêng theo role.
- Đã thực hiện:
  - Thêm controller/service/entity/repository cho advanced analytics event và dashboard.
  - Thêm migration `V9__advanced_analytics_events.sql`.
  - Thêm route public/candidate/recruiter.
- Routes chính:
  - `GET /api/analytics/market/overview`
  - `GET /api/analytics/market/skills`
  - `GET /api/analytics/market/salary`
  - `GET /api/analytics/market/trends`
  - `POST /api/analytics/events`
  - `GET /api/candidate/analytics/overview`
  - `GET /api/candidate/analytics/skill-demand`
  - `GET /api/candidate/analytics/profile-gaps`
  - `GET /api/candidate/analytics/match-trends`
  - `GET /api/recruiter/analytics/overview`
  - `GET /api/recruiter/analytics/jobs/{jobId}/funnel`
  - `GET /api/recruiter/analytics/jobs/{jobId}/skill-gap`
  - `GET /api/recruiter/analytics/trends`
- File chính:
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/analytics/controller/AdvancedAnalyticsController.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/analytics/service/AdvancedAnalyticsService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/analytics/service/AnalyticsEventService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/analytics/entity/AnalyticsEvent.java`
  - `Backend/careerfit-backend/src/main/resources/db/migration/V9__advanced_analytics_events.sql`
- Kiểm chứng:
  - Smoke test market/candidate/recruiter/event HTTP 200.

### 2026-05-17 - Cập nhật tài liệu backend/frontend

- Yêu cầu: bổ sung vào các tài liệu những gì backend đã cập nhật.
- Nội dung chính:
  - Cập nhật backend README, backend code guide, implementation guide, agent prompt.
  - Cập nhật frontend guide và API contract.
  - Cập nhật architecture/proposal/SRS/test cases.
  - Thêm/cập nhật `BACKEND_DOCUMENTATION.md`.
- File tiêu biểu:
  - `BACKEND_DOCUMENTATION.md`
  - `Backend/careerfit-backend/README.md`
  - `Backend/careerfit-backend/BACKEND_CODE_GUIDE.md`
  - `Frontend/ADVANCED_ANALYTICS_API.md`
  - `Frontend/FRONTEND_CODE_GUIDE_FOR_BACKEND.md`
  - `README.md`
  - `TEST_CASES.md`
  - `architecture.md`
  - `proposal.md`
  - `srs.md`

### 2026-06-03 17:00-18:00 +07:00 - Kiểm tra phần email đã hoạt động chưa

- Yêu cầu: hỏi phần email đã hoạt động chưa.
- Kết luận:
  - Email notification/digest đã có pipeline.
  - Profile `dev` dùng `NoOpMailService`, chỉ log ra console.
  - Profile `prod` dùng `MailService` + SMTP thật khi có `MAIL_USERNAME`/`MAIL_PASSWORD`.
  - Passwordless lúc đó chưa gửi email thật, chỉ trả token.
- File liên quan:
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/service/MailService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/service/NoOpMailService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/auth/service/AuthService.java`

### 2026-06-03 17:40-17:50 +07:00 - Fix passwordless email và test account thật

- Yêu cầu: tạo tài khoản bằng email thật `h***m@gmail.com` để test, có lỗi thì fix.
- Đã thực hiện:
  - Nối passwordless flow vào `IMailService`.
  - Thêm `PasswordlessRequestResponse`.
  - Thêm `app.magic-link.expose-token-in-response`.
  - Dev trả token để test; prod không expose token.
  - GET verify token kiểm tra token thật.
  - Request unknown email không leak user existence.
- Account test:
  - Email: `h***m@gmail.com`
  - Role: `CANDIDATE`
  - Password test đã được tạo trong DB local, không ghi lại ở đây.
- Kiểm chứng:
  - Register OK.
  - Login password OK.
  - Request passwordless OK.
  - GET inspect token OK.
  - POST verify token trả JWT OK.
  - No-op email log ghi gửi tới đúng email.
- File chính:
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/auth/service/AuthService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/auth/controller/AuthController.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/auth/dto/AuthDtos.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/config/AppProperties.java`
  - `Backend/careerfit-backend/src/main/resources/application.yml`
  - `Backend/careerfit-backend/src/main/resources/application-prod.yml`

### 2026-06-04 - Cấu hình Gmail sender và test SMTP thật

- Yêu cầu:
  - Dùng `h***m@gmail.com` làm mail gửi đi.
  - Gửi test email HTML có giao diện/nút bấm tới `hungb2203557@student.ctu.edu.vn`.
- Nội dung chính:
  - Giải thích cần Gmail App Password, không dùng mật khẩu Gmail chính.
  - User cung cấp App Password; dùng tạm trong process để test, không ghi vào repo.
  - Gửi email HTML test qua `smtp.gmail.com:587`.
- Kết quả:
  - Lần dùng password thường: SMTP fail `5.7.0 Authentication Required`.
  - Lần dùng App Password: SMTP send OK.
- Ghi chú bảo mật:
  - Credential không được lưu vào source.
  - App Password trong chat được xem là secret và không ghi lại trong log.

### 2026-06-04 13:30-14:00 +07:00 - Sửa HTML email mobile-safe

- Yêu cầu:
  - Desktop email đẹp rồi, không đụng.
  - Mobile Gmail hiển thị xấu.
  - Chỉnh mobile mà PC không bị ảnh hưởng, gửi mail test lại.
- Đã thực hiện:
  - Chuyển email action template sang table layout.
  - Thêm CSS mobile-specific qua media query.
  - Button mobile full-width/stack hợp lý.
  - Giữ desktop card 600px.
  - Ép màu chữ/nền rõ hơn để giảm lỗi Gmail mobile dark mode.
- File chính:
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/service/EmailActionService.java`
- Kiểm chứng:
  - `mvn -DskipTests compile` OK.
  - Gửi email test subject `[CareerFit] Mobile-safe email action test` tới `hungb2203557@student.ctu.edu.vn`: SMTP OK.

### 2026-06-04 14:00-14:15 +07:00 - Giải thích feedback/Rocchio

- Yêu cầu:
  - Feedback từ người dùng cho thuật toán Rocchio là gì?
- Nội dung chính:
  - Giải thích feedback học lại vector của Job.
  - `GOOD_MATCH` và `POTENTIAL` là positive.
  - `BAD_MATCH` là negative.
  - `NOT_INTERESTED` là skip mềm.
  - Rocchio update `learned_profile_vector`, rồi đánh dấu matching `needsRecompute`.
- File liên quan:
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/feedback/service/FeedbackService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/feedback/service/RocchioService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/feedback/entity/Feedback.java`

### 2026-06-04 14:15-14:30 +07:00 - Lifecycle emails và prompt frontend feedback

- Yêu cầu:
  1. Viết prompt chỉnh sửa frontend feedback UI.
  2. Backend nếu cần bổ sung mail gửi đi thì thực thi.
  3. Thực thi thêm tất cả lifecycle email.
- Đã thực hiện backend:
  - Thêm `NotificationEmailService`.
  - Wire lifecycle emails vào các flow thật:
    - Apply thành công -> mail candidate + recruiter.
    - Withdraw -> mail candidate.
    - Recruiter update status -> mail candidate.
    - `INVITED`, `APPROVED`, `REJECTED`.
    - Thêm status `INTERVIEW_RESCHEDULED`, `INTERVIEW_CANCELLED`.
    - Email action `NOT_INTERESTED` -> mail xác nhận skip.
    - CV scoring no-match/low-match -> mail chờ/cập nhật CV.
  - Thêm method sẵn cho lifecycle mở rộng:
    - `AUTO_APPLIED`
    - `PROFILE_OR_CV_NEEDS_UPDATE`
    - `NEW_HIGH_MATCH_FOUND`
    - `DIGEST_SUMMARY`
    - `RECRUITER_HIGH_MATCH_CANDIDATE_FOUND`
    - `CANDIDATE_RESPONDED_TO_INVITE`
- Đã thực hiện frontend docs:
  - Tạo prompt `Frontend/FEEDBACK_UI_PROMPT.md`.
  - Cập nhật `Frontend/FRONTEND_CODE_GUIDE_FOR_BACKEND.md`.
- File chính:
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/service/NotificationEmailService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/application/service/ApplicationService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/application/entity/Application.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/application/dto/ApplicationDtos.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/matching/service/MatchingService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/controller/EmailActionController.java`
  - `Frontend/FEEDBACK_UI_PROMPT.md`
- Kiểm chứng:
  - `mvn -DskipTests compile` OK.
  - `mvn test` OK.
  - Test log có cảnh báo Testcontainers không thấy Docker, nhưng exit code 0.

### 2026-06-04 14:42 +07:00 - Tạo backend history log

- Yêu cầu: tạo file log markdown dành cho backend, ghi lại thời gian nào đã thực thi nội dung gì, liệt kê cả box chat nếu có thể.
- Đã thực hiện:
  - Tạo file này: `Backend/careerfit-backend/BACKEND_HISTORY_LOG.md`.
  - Tái dựng timeline theo ngữ cảnh còn lại của thread.
  - Không ghi raw secret/password/App Password.

## Trạng thái backend hiện tại

- Auth:
  - Register/login JWT.
  - Passwordless magic-link đã gọi mail service.
  - Dev có thể expose token; prod không expose.
- CV:
  - Upload PDF.
  - PDF text extraction + OCR fallback cho PDF scan/image-only.
- Matching:
  - TF-IDF scoring.
  - Candidate job card DTO có score/potential/reasons.
  - No-match/low-match có lifecycle email.
- Feedback/Rocchio:
  - Backend API đã có.
  - Email action redeem ghi feedback.
  - Frontend prompt đã có, UI chưa được implement trong code frontend ở log này.
- Email:
  - `MailService` SMTP thật khi `app.mail.enabled=true`.
  - `NoOpMailService` log-only ở dev.
  - Email action/digest mobile-safe.
  - Lifecycle email service đã có và đã wire vào các flow chính.
- Advanced Analytics:
  - Public/candidate/recruiter route riêng đã có.
  - Analytics event tracking đã có.

## Verification gần nhất

```text
2026-06-04 - mvn -DskipTests compile: OK
2026-06-04 - mvn test: OK
```

Ghi chú: test output có cảnh báo Testcontainers không tìm thấy Docker environment, nhưng command exit code 0.

## Việc còn mở

- Frontend feedback UI cần được triển khai theo `Frontend/FEEDBACK_UI_PROMPT.md`.
- Nếu muốn gửi email thật khi chạy backend, cần set SMTP bằng App Password trong môi trường local/prod, không commit secret.
- Các lifecycle method chưa có domain event thật như interview schedule detail cần API/lịch phỏng vấn riêng nếu muốn sử dụng đầy đủ.
- Có thể bổ sung integration test cho `NotificationEmailService` bằng mock `IMailService`.

### 2026-06-05 01:40-02:10 +07:00 - Email toggle, no-spam, recruiter discovery, validation response, ranking tie-breaker

- Yêu cầu:
  - Thực hiện Email toggle.
  - Thực hiện no-spam rules.
  - Thực hiện Recruiter candidate discovery.
  - Chuẩn hóa validation response.
  - Bổ sung ranking tie-breaker.
- Đã thực hiện:
  - Thêm `emailNotificationsEnabled` vào `AutomationPolicy` và migration `V10__notification_policy_log.sql`.
  - Thêm endpoint `PATCH /api/automation/policy/email-notifications`.
  - Thêm `notification_delivery_log` để ghi `SENT`, `SKIPPED`, `FAILED`.
  - Thêm `NotificationPolicyGuard` kiểm tra global toggle, quiet hours, daily quota, cooldown.
  - Wire guard vào `EmailActionService` và `NotificationEmailService`.
  - Thêm route `GET /api/recruiter/jobs/{jobId}/candidates` với filter label, isPotential, applicationStatus, minScore, sort, page, size.
  - Thêm `TieBreakMeta` vào ranking/candidate job DTO để xử lý nhiều candidate/JD cùng score.
  - Thêm `ValidationException` và response `error.fieldErrors.fields[]` có severity, field, reason, message, suggestion.
  - Cập nhật `README.md` và `Frontend/FRONTEND_CODE_GUIDE_FOR_BACKEND.md`.
- File chính:
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/entity/AutomationPolicy.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/service/AutomationPolicyService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/automation/controller/AutomationController.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/service/NotificationPolicyGuard.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/entity/NotificationDeliveryLog.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/notification/repository/NotificationDeliveryLogRepository.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/matching/service/MatchingQueryService.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/matching/dto/MatchingDtos.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/recruiter/controller/RecruiterController.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/common/exception/ValidationException.java`
  - `Backend/careerfit-backend/src/main/java/com/careerfit/backend/common/exception/GlobalExceptionHandler.java`
- Kiểm chứng:
  - `.\\mvnw.cmd -DskipTests compile` OK.
  - `.\\mvnw.cmd test` OK.
  - `ApplicationContextTest` bị skip vì Testcontainers không tìm thấy Docker environment hợp lệ trong phiên chạy này.

### 2026-06-05 22:10-22:25 +07:00 - Connect frontend 1-5 và thêm invite candidate

- Yêu cầu:
  - Thực thi các việc 1 tới 6: email toggle, no-spam policy UI, recruiter discovery, tie metadata, validation mapper, invite candidate.
  - Chưa thực hiện auto-apply.
- Đã thực hiện backend:
  - Thêm endpoint `POST /api/recruiter/jobs/{jobId}/candidates/{candidateId}/invite`.
  - Endpoint invite idempotent: nếu đã có application thì trả application hiện tại, không tạo trùng.
  - Khi tạo mới, application có status `INVITED`, ghi audit `CANDIDATE_INVITED`, và gửi lifecycle email qua notification/no-spam policy.
  - Cập nhật README backend.
- Đã thực hiện frontend liên quan backend:
  - Nối `GET /api/automation/policy`, `PATCH /api/automation/policy`, `PATCH /api/automation/policy/email-notifications`.
  - Nối `GET /api/recruiter/jobs/{jobId}/candidates`.
  - Nối nút Invite vào endpoint backend mới.
  - Dùng `tie` metadata backend khi hiển thị tie-break note.
  - Thêm structured validation error class/mapper trong `api.ts`.
- Kiểm chứng:
  - Frontend `npm run build` OK.
  - Backend `.\\mvnw.cmd -DskipTests compile` OK.
  - Backend `.\\mvnw.cmd test` OK.
  - `ApplicationContextTest` vẫn bị skip vì Testcontainers không tìm thấy Docker environment hợp lệ trong phiên chạy này.

### 2026-06-05 22:50-23:20 +07:00 - Application flow, Auto-Apply thật và kịch bản E2E

- Yêu cầu:
  - Thực hiện danh sách 7 bước còn lại cho project.
  - Chuẩn bị file kịch bản để user test thực tế, có mô phỏng kết quả và fail mode.
- Đã thực hiện backend:
  - Mở rộng `AutomationPolicyService.PolicyUpdateRequest` và `PolicySummary` với `autoApplyEnabled`, `autoApplyThreshold`.
  - Validate `autoApplyThreshold` trong khoảng `50-100`.
  - Thêm `AutoApplyService` để tạo application nội bộ `AUTO_APPLIED` theo matching score, job active, default CV và duplicate protection.
  - Thêm scheduler `AutomationScheduler.executeAutoApply()` chạy mỗi 2 giờ.
  - Thêm endpoint `POST /api/automation/auto-apply/run-now` để chạy Auto-Apply một lần cho user hiện tại, phục vụ test/demo không phải chờ scheduler.
  - Auto-Apply ghi audit `AUTO_APPLY_EXECUTED` và gọi lifecycle email qua notification/no-spam policy.
- Test:
  - Thêm `AutoApplyServiceTest` với Mockito để kiểm tra tạo application hợp lệ và skip match dưới threshold.
- Đã thực hiện frontend liên quan backend:
  - Candidate apply từ job card/detail gọi `POST /api/applications`.
  - Trang `/candidate/applications` đọc `GET /api/applications/me` và withdraw gọi `DELETE /api/applications/{id}`.
  - Recruiter discovery page gọi approve/reject qua `PATCH /api/recruiter/applications/{id}/status`.
  - Automation page hiển thị Auto-Apply threshold và nút `Run now`.
- Tài liệu:
  - Tạo `CAREERFIT_E2E_TEST_SCRIPT.md` với các bước UI/API, kết quả mong đợi và fail mode.
  - Cập nhật `README.md`, `BACKEND_DOCUMENTATION.md`, `Backend/careerfit-backend/README.md`.
  - Dọn `Backend/backend-supplement-prompt.md` để chỉ còn gap chưa làm.
- Kiểm chứng:
  - Backend `.\\mvnw.cmd -DskipTests compile` OK.
  - Backend `.\\mvnw.cmd test` OK: 18 tests, 0 failures, 0 errors, 1 skipped do Testcontainers không thấy Docker environment trong phiên chạy này.
  - Frontend `npm run build` OK, chỉ còn cảnh báo bundle size lớn của Vite.

### 2026-06-06 - Đồng bộ tài liệu sau Application/Auto-Apply update

- Yêu cầu:
  - Cập nhật các tài liệu theo những thay đổi đã thực hiện.
- Đã cập nhật:
  - `Frontend/FRONTEND_CODE_GUIDE_FOR_BACKEND.md`: bổ sung `autoApplyEnabled`, `autoApplyThreshold`, `POST /api/automation/auto-apply/run-now`, candidate apply/withdraw và recruiter status update contract.
  - `Frontend/FRONTEND_UI_HISTORY_LOG.md`: thêm log application flow, recruiter status action và Automation `Run now`.
  - `Frontend/frontend-implementation-guide.md`: cập nhật danh sách server-state API client method.
  - `Backend/careerfit-backend/BACKEND_CODE_GUIDE.md`: bổ sung invite candidate chưa apply, Auto-Apply service, policy fields và scheduler `executeAutoApply`.
- Kiểm chứng:
  - Tài liệu được rà bằng `rg` theo các keyword `Auto-Apply`, `run-now`, `invite`, `application flow`, `no-spam`.

### 2026-06-06 17:00 +07:00 - Metadata, validation polish, tests và deploy checklist

- Yêu cầu:
  - Tiếp tục nếu còn phần chưa hoàn thiện.
- Đã thực hiện backend:
  - Bổ sung `meta` cho `GET /api/applications/me` và `GET /api/recruiter/jobs/{jobId}/applicants`.
  - Bổ sung metadata/freshness/empty-state cho match feed, candidate job cards, recruiter ranking và recruiter discovery.
  - Chuẩn hóa Auto-Apply threshold invalid thành `ValidationException` field-level với reason `AUTO_APPLY_THRESHOLD_RANGE`.
  - Mở rộng `AutoApplyServiceTest` để kiểm tra giới hạn tối đa 3 application/lần chạy và skip application đã tồn tại.
- Đã thực hiện frontend/docs:
  - Thêm `ListMetaDto` optional trong `Frontend/src/lib/api.ts`.
  - Cập nhật `BACKEND_DOCUMENTATION.md`, `Backend/careerfit-backend/README.md`, `Backend/careerfit-backend/BACKEND_CODE_GUIDE.md`, `Frontend/FRONTEND_CODE_GUIDE_FOR_BACKEND.md`, `Frontend/frontend-implementation-guide.md`.
  - Cập nhật `.env.example` với `CORS_ORIGINS`, `STORAGE_PATH`, `APP_MAIL_ENABLED`.
  - Tạo `DEPLOYMENT_CHECKLIST.md`.
  - Bổ sung `TEST_CASES.md` cho Auto-Apply, email toggle và list metadata contract.
  - Dọn `Backend/backend-supplement-prompt.md` chỉ còn automated tests sâu hơn, DB sạch/manual E2E và production runtime verification.
- Kiểm chứng:
  - Backend `.\\mvnw.cmd test` OK: 20 tests, 0 failures, 0 errors, 1 skipped do Testcontainers không thấy Docker environment trong phiên chạy này.
  - Frontend `npm run build` OK, chỉ còn cảnh báo bundle size lớn của Vite.
  - `git diff --check` OK, chỉ có cảnh báo line-ending CRLF/LF trên Windows.

### 2026-06-14 00:05 +07:00 - Backend test pass và sửa cấu hình SMTP flag

- Yêu cầu:
  - Test backend và fix bug nếu có; cập nhật tài liệu nếu chỉnh sửa quan trọng.
- Kết quả test:
  - Backend `.\\mvnw.cmd test` OK: 20 tests, 0 failures, 0 errors, 1 skipped.
  - `ApplicationContextTest` bị skip vì Docker Desktop/Testcontainers không thấy Docker daemon trong phiên shell này.
- Bug cấu hình đã sửa:
  - `.env.example` và docs đã có `APP_MAIL_ENABLED`, nhưng `application.yml` chưa bind biến này vào `app.mail.enabled`.
  - Cập nhật `application.yml`, `application-dev.yml`, `application-prod.yml` để `APP_MAIL_ENABLED` hoạt động đúng.
  - Cập nhật `docker-compose.yml` gốc và `Backend/careerfit-backend/docker-compose.yml` để truyền `APP_MAIL_ENABLED`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAGIC_LINK_EXPOSE_TOKEN`, `CORS_ORIGINS` vào backend container.
- Tài liệu:
  - Cập nhật `Backend/careerfit-backend/README.md` và `DEPLOYMENT_CHECKLIST.md` về cách bật SMTP thật khi chạy Docker Compose.
### 2026-06-18 18:56 +07:00 - Docker 29 Testcontainers Compatibility

- Upgraded the managed Testcontainers version from Spring Boot 3.2.5's `1.19.7` to `1.21.4`.
- Reason: Docker Engine 29 rejected the older docker-java client during environment discovery, causing `ApplicationContextTest` to be skipped even while Docker was healthy.
- Verification:
  - `ApplicationContextTest` started a real PostgreSQL 16 container, applied Flyway migrations, loaded the Spring context, and passed.
  - No database volume reset was performed.

### 2026-06-19 17:47 +07:00 - E2E Rerun Review And Scheduler Test Isolation

- Rà lại `ketqua_test.md`: duplicate apply `409`, Auto-Apply `NO_ELIGIBLE_MATCHES` và validation `400` là hành vi đúng theo dữ liệu/kịch bản; lỗi approve và suspend đến từ cách chọn ID trong script.
- Kiểm tra suspend bằng đúng user ID của `ca`: token đang tồn tại trả `403 ACCOUNT_DISABLED`; tài khoản được activate lại ngay sau test.
- Phát hiện scheduler chạy nền trong `ApplicationContextTest`, có thể chạm connection đúng lúc Testcontainers shutdown và in stack trace giả dù test pass.
- Thêm `app.scheduling.enabled` qua `@ConditionalOnProperty` cho `AutomationScheduler`; integration test đặt property này thành `false`. Dev/prod vẫn bật mặc định.
- Kiểm chứng:
  - `.\mvnw.cmd test`: 20 tests passed, 0 failures, 0 errors, 0 skipped.
  - Không còn stack trace scheduler/database shutdown trong test log.

### 2026-06-20 01:50 +07:00 - Recruiter Job Contract And OCR Runtime Review

- Mở rộng `GET /api/recruiter/jobs` để trả kỹ năng bắt buộc/ưu tiên, original JD, salary fields và language thay vì buộc frontend dùng mock fallback.
- Sửa OpenAPI summary của CV upload: PDF text và PDF scan đều được hỗ trợ, PDF scan dùng OCR khi Tesseract khả dụng.
- Xác minh runtime 11A/11B:
  - Candidate profile và CV list trả `200` sau khi login lấy token mới.
  - Recruiter đọc lại được job đã tạo với salary `VND`, seniority, skills và original text đúng database.
- Giới hạn đã xác nhận: host Windows hiện chưa cài Tesseract; direct image `.png/.jpg` và Word chưa được upload endpoint hỗ trợ.
- Kiểm chứng: `.\mvnw.cmd test` thành công với 20 tests, 0 failures/errors/skips.

### 2026-06-20 11:40 +07:00 - Candidate Portfolio CRUD Hardening

- Chuẩn hóa Portfolio link type về `GITHUB`, `LINKEDIN`, `PORTFOLIO`, `BLOG`, `OTHER`.
- Chặn URL không phải HTTP(S), URL thiếu host và URL chứa user-info; project URL rỗng được lưu thành `null`.
- Trim field dự án, loại trùng tech stack không phân biệt hoa thường và giới hạn tối đa 30 kỹ năng.
- Giữ kiểm tra ownership cho mọi thao tác sửa/xóa link và project.
- Thêm `CandidateProfileServiceTest` cho normalization, URL security, project cleanup và cross-candidate ownership.
- Kiểm chứng cuối với Docker Desktop: Maven 24 tests, 0 failures/errors/skips; API PostgreSQL thật pass toàn bộ CRUD, URL xấu trả `400`, recruiter trả `403`, cleanup thành công.
### 2026-06-21 - Hoàn thành backlog 1-5 và kiểm thử runtime

- Hoàn thiện JD recruiter: edit, status, delete có application guard, export CSV UTF-8; `/api/recruiter/jobs` trả đủ employment type, remote type, domain, salary, skills và counts.
- Thêm Settings persistence V14 và `GET/PATCH /api/settings/me`, allowlist/type/range validation theo Candidate/Recruiter.
- Import idempotent đủ 974 JD scrape; DB có 994 JD gồm seed, 991 ACTIVE.
- Thêm admin batch matching và script `scripts/rebuild-matchings.mjs`; sửa bug phân trang timestamp trùng bằng sort `createdAt DESC, id ASC`.
- Batch runtime phủ 991 JD ACTIVE x 13 CV, `failures=0`; DB có matching cho đủ 991 JD trên mỗi CV.
- Nâng upload CV lên PDF, PNG, JPG/JPEG, DOCX; PDF scan/ảnh dùng Tesseract, DOCX dùng Apache POI.
- Runtime Docker xác nhận Tesseract có `vie` + `eng`; ảnh OCR 270 ký tự và DOCX 186 ký tự đều đạt `SCORING_DONE`.
- Test: Maven 29/29 pass gồm Testcontainers/Flyway V1-V14; frontend production build pass.

### 2026-06-21 01:38 +07:00 - Mở rộng automated regression tests

- Tăng backend automated suite từ 29 lên 44 test.
- Thêm `JobServiceTest` cho status boundary, delete application guard, CSV UTF-8/escaping và authorization.
- Thêm `MatchingBatchServiceTest` cho page-size clamp, stable sort `createdAt DESC, id ASC` và tiếp tục batch khi một JD lỗi.
- Mở rộng `SettingsServiceTest` cho defaults theo role, merge dữ liệu đã lưu và type/range validation.
- Mở rộng `PdfExtractionServiceTest` cho file rỗng/sai loại và image input khi OCR bị tắt.
- Thêm `ApiContractIntegrationTest` chạy PostgreSQL 16 qua Testcontainers: login seed, role security, settings persistence, validation envelope và recruiter JD create/edit/status/export/delete.
- Integration harness dùng HTTP client hỗ trợ `PATCH`, tắt mail/scheduler và mock matching async để không race với lúc Testcontainers shutdown.
- Kiểm chứng cuối: `.\mvnw.cmd test` đạt 44 tests, 0 failures, 0 errors, 0 skipped; Flyway V1-V14 chạy thành công trên database tạm.

### 2026-06-21 - Security Hardening & Production Deployment Preparation

- **Yêu cầu:** Triển khai các cấu hình fail-fast cho production, bảo mật API, rate limiting, kiểm tra vulnerability, Dockerize ứng dụng không dùng root, và tạo monitoring stack.
- **Nội dung thực hiện:**
  - **Fail-Fast Configuration:** Tạo `ProductionConfigValidator` để báo lỗi ngay lập tức nếu thiếu `JWT_SECRET` hoặc có password mặc định ở môi trường `prod`. Cập nhật `application-prod.yml`.
  - **Demo Accounts Guard:** Viết `DemoAccountGuard` vô hiệu hóa `ca`, `re`, `ad` trên `prod` trừ khi `DEMO_MODE=true`.
  - **API Security:** Thêm headers `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`. Ẩn Swagger ở `prod`.
  - **Rate Limiting:** Implement `RateLimitFilter` dùng thuật toán Token Bucket (10 req/min) cho các route `/api/auth/**`.
  - **File Upload Security:** Thêm Magic Bytes validation trong `PdfExtractionService` để chống upload file giả mạo; thêm Canonical Path Validation ở `StorageService` để chống Path Traversal.
  - **Security Tests:** Tạo `SecurityHardeningTest` đảm bảo headers bảo mật và rate limiting hoạt động.
  - **Dependency Audit:** Thêm OWASP Dependency-Check Maven plugin.
  - **Docker & CI/CD:** Cập nhật `Dockerfile` backend chạy user `careerfit` thay vì `root`. Tạo `Dockerfile.prod` cho frontend kèm cấu hình `nginx.conf` với bảo mật.
  - **Monitoring:** Cấu hình Prometheus, Grafana trong `docker-compose.prod.yml`.
- **Kiểm chứng:** `.\mvnw.cmd test` passes. Compose config hợp lệ.

