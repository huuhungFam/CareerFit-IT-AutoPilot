# Backend Update Report

Tài liệu này tóm tắt các thay đổi backend hiện tại của CareerFit để frontend và các tài liệu kỹ thuật khác có cùng một nguồn tham chiếu.

## Tổng Quan Thay Đổi

Backend vẫn giữ các API cũ để tương thích với frontend hiện tại, đồng thời bổ sung các capability mới theo hướng append-only:

- OCR fallback cho PDF scan/image-only.
- Validation nâng cao cho CV/JD/job quality signals.
- Security exception handling nhất quán hơn cho JWT, user disabled/deleted và access denied.
- Candidate profile portfolio API.
- Recruiter applicant/discovery response có portfolio gated theo `showPortfolioAfterApply`.
- High-match email được kích hoạt ngay sau CV scoring nếu đạt policy, không còn chỉ chờ scheduler.
- Candidate job card DTO có score/potential/reasons.
- Search suggestions thống nhất alias `/api/jobs/suggestions` và `/api/jobs/search/suggestions`, có nhóm skill.
- Advanced Analytics API theo role candidate/recruiter và market public.
- Analytics event tracking để frontend ghi nhận tương tác thật.

## OCR Cho PDF Scan

`PdfExtractionService` đọc PDF theo 2 bước:

1. Dùng PDFBox `PDFTextStripper` để đọc text layer.
2. Nếu text quá ít, render PDF thành ảnh bằng PDFBox `PDFRenderer` rồi chạy Tesseract OCR.

Config:

```yaml
app:
  ocr:
    enabled: ${OCR_ENABLED:true}
    tesseract-command: ${TESSERACT_COMMAND:tesseract}
    languages: ${OCR_LANGUAGES:vie+eng}
    dpi: ${OCR_DPI:220}
    max-pages: ${OCR_MAX_PAGES:8}
    timeout-seconds: ${OCR_TIMEOUT_SECONDS:45}
```

Khi chạy bằng Docker, backend image đã cài `tesseract-ocr`, `tesseract-ocr-data-eng`, `tesseract-ocr-data-vie`.
Khi chạy trực tiếp bằng Maven trên Windows, máy host cần cài Tesseract riêng hoặc set `TESSERACT_COMMAND`.

## Validation Và Quality Signals

Backend bổ sung `QualityValidationService` và DTO `ValidationDtos.QualitySignal` để phân biệt:

- Hard validation: reject request sai rõ ràng, ví dụ salary min > max.
- Soft warning/quality signal: dữ liệu bất thường nhưng vẫn có thể lưu, ví dụ Fresher yêu cầu 10 năm kinh nghiệm.

Các response liên quan có thể trả `qualitySignals`, gồm:

- CV upload/manual response.
- Job card/detail response.
- Candidate matching feed metadata.

## Security Exception Handling

Các lỗi security đã được chuẩn hóa qua JSON envelope:

- JWT malformed/expired/invalid.
- Authorization header sai format.
- User disabled/deleted.
- Unauthorized/forbidden.

Response giữ format:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  },
  "meta": {
    "requestId": "..."
  }
}
```

## Advanced Analytics

## Notification Và Portfolio Visibility

Sau khi CV upload được parse/vectorize xong, `MatchingService.scoreAllJobsForCv` chấm CV với toàn bộ JD `ACTIVE` tương thích ngôn ngữ. Nếu best match đạt `highMatchThreshold`, label là `HIGH`, và Candidate bật `emailNotificationsEnabled` + `highMatchEmailEnabled`, backend gọi `EmailActionService.sendMatchNotification` ngay trong flow scoring. `NotificationPolicyGuard` vẫn enforce quiet hours, quota/ngày và cooldown theo `MATCH_NOTIFICATION + matchingId`, nên scheduler chạy sau đó không spam trùng email.

Nếu không có JD hoặc không score được JD nào, backend gửi/log email no-match. Nếu best score dưới 40%, backend gửi/log email low-match.

Portfolio vẫn là dữ liệu bổ sung riêng của Candidate, không thay CV. Recruiter chỉ thấy portfolio trong applicant/discovery response khi:

- Candidate đã apply thật hoặc application đã qua trạng thái không phải `INVITED`.
- Candidate setting `showPortfolioAfterApply=true`.

Nếu setting tắt hoặc Candidate chưa apply, response trả `portfolioVisible=false`, `portfolio=null` và `portfolioHiddenReason`.

API cũ vẫn giữ:

- `GET /api/analytics/stats`
- `GET /api/analytics/trend`
- `GET /api/analytics/roles`
- `GET /api/recruiter/dashboard`

API mới:

### Market Public

- `GET /api/analytics/market/overview`
- `GET /api/analytics/market/skills`
- `GET /api/analytics/market/salary`
- `GET /api/analytics/market/trends`

### Candidate

- `GET /api/candidate/analytics/overview`
- `GET /api/candidate/analytics/skill-demand`
- `GET /api/candidate/analytics/profile-gaps`
- `GET /api/candidate/analytics/match-trends`

### Recruiter

- `GET /api/recruiter/analytics/overview`
- `GET /api/recruiter/analytics/jobs/{jobId}/funnel`
- `GET /api/recruiter/analytics/jobs/{jobId}/skill-gap`
- `GET /api/recruiter/analytics/trends`

### Event Tracking

- `POST /api/analytics/events`

Supported event types:

- `JOB_VIEWED`
- `JOB_SEARCHED`
- `JOB_APPLIED`
- `CV_UPLOADED`
- `MATCH_CARD_VIEWED`
- `MATCH_CARD_CLICKED`
- `AUTOFIT_ENABLED`
- `RECRUITER_VIEWED_CANDIDATE`
- `APPLICATION_STATUS_CHANGED`

Frontend contract chi tiết nằm tại `Frontend/ADVANCED_ANALYTICS_API.md`.

## Database Migrations Mới

- `V8__database_hardening.sql`: constraint/index hardening cho dữ liệu hiện có.
- `V9__advanced_analytics_events.sql`: tạo bảng `analytics_event` và indexes phục vụ event tracking.

## Verification Gần Nhất

Đã kiểm tra:

- `.\mvnw.cmd test`: build/test pass.
- Backend start với PostgreSQL Docker tại `localhost:5433`.
- Smoke test:
  - `GET /api/analytics/market/overview?rangeDays=30` trả `HTTP 200`.
  - `GET /api/candidate/analytics/overview` với `ca / 1` trả `HTTP 200`.
  - `GET /api/recruiter/analytics/overview` với `re / 1` trả `HTTP 200`.
  - `POST /api/analytics/events` trả `HTTP 200`.

Lưu ý: Testcontainers integration test có thể bị skip nếu Docker Desktop/Testcontainers environment chưa sẵn sàng.
