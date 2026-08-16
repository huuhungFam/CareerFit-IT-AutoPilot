# Remediation Phase 1 — Đóng toàn bộ lỗi Checkpoint 1 trước khi sang Phase 2

Bạn đang sửa lại Phase 1 sau khi checkpoint thất bại. Đây là prompt triển khai code, không phải prompt chỉ lập kế hoạch.

## Tài liệu bắt buộc phải đọc trước khi sửa

Đọc đầy đủ, theo thứ tự:

1. `prompt-gemini/11-default-demo-mode-and-live-two-role-workflow.md`
2. `prompt-gemini/11-00-phased-workflow-index.md`
3. `prompt-gemini/11-01-baseline-audit-and-failure-reproduction-report.md`
4. `prompt-gemini/11-02-schema-policy-and-outbox-foundation.md`
5. `prompt-gemini/11-02-schema-policy-and-outbox-foundation-report.md`
6. `prompt-gemini/11-03-checkpoint-schema-policy-outbox.md`
7. `prompt-gemini/11-03-checkpoint-schema-policy-outbox-report.md`

Đối chiếu trực tiếp code, schema, Git diff và test output. Không tin các tuyên bố PASS cũ nếu không tái lập được.

## Mục tiêu duy nhất

Sửa toàn bộ blocking findings trong `11-03-checkpoint-schema-policy-outbox-report.md` để Phase 1 có thể được audit lại độc lập và PASS.

Không triển khai Settings UI, polling UI, event-first matching, dispatcher gửi email, scheduler business, duplicate-job UX, live E2E hoặc bất kỳ phần nào của Phase 2 trở đi.

## Quy tắc an toàn bắt buộc

### Không được chạm database chính

Database chính là:

```text
jdbc:postgresql://localhost:5433/careerfit
```

Một lần test cũ đã chạy nhầm vào database này, apply V31 và có thể để lại `concurrent@test.com` cùng notification outbox test.

Trong remediation này:

- không reset database chính;
- không drop database/schema/table/volume;
- không delete hoặc update residue trong database chính;
- không chạy Flyway test hoặc Spring integration test vào port 5433/database `careerfit`;
- chỉ được query read-only để lập inventory residue nếu cần;
- ghi residue vào report để final baseline reset xử lý sau.

Mọi migration/integration/concurrency test phải chạy trên PostgreSQL disposable/Testcontainers. Test phải fail ngay nếu JDBC URL trỏ tới `localhost:5433/careerfit`.

### Không sửa migration đã apply

V31 đã bị apply vào database chính. Vì vậy:

- tuyệt đối không sửa nội dung `V31__demo_mode_and_outbox.sql`;
- nếu cần bổ sung index/constraint/schema, tạo migration additive kế tiếp `V32__...sql`;
- không sửa V1–V31;
- chứng minh clean migration V1 → latest trên disposable PostgreSQL.

### Bảo toàn worktree

- Không discard/reset thay đổi của người dùng.
- Không commit, không push.
- Không stage thêm toàn bộ repository bằng `git add -A`.
- Chỉ sửa file cần thiết cho remediation và các test compile compatibility thực sự bắt buộc.
- Không xóa/disable/rename test để tạo PASS giả.
- Không dùng `skipTests`, `maven.test.skip`, test-source exclusion hoặc Surefire trick để né test compile lỗi.

## Công việc bắt buộc

### 1. Cô lập hoàn toàn Phase 1 integration tests

Refactor `Phase1OutboxPolicyTest` để dùng `BaseIntegrationTest` hoặc cấu hình Testcontainers tương đương.

Yêu cầu:

- PostgreSQL container riêng, ephemeral;
- Flyway chạy V1 → latest trên container;
- datasource assertion đọc `DataSource.getConnection().getMetaData().getURL()` và fail nếu chứa `localhost:5433/careerfit`;
- không phụ thuộc dữ liệu trong local demo DB;
- không để test account/outbox tồn tại ngoài container;
- Docker unavailable hoặc test bị skipped không được tính là PASS acceptance.

### 2. Sửa regression compile do Phase 1 và phục hồi test gate

Ít nhất phải cập nhật `AuthServiceTest` cho dependency `AutomationPolicyService` mới và verify policy creation call phù hợp.

Chạy `mvnw.cmd testCompile`, phân loại từng lỗi:

- lỗi do thay đổi Phase 1: sửa đầy đủ;
- lỗi compile pre-existing/staged baseline: thực hiện compatibility repair nhỏ nhất để test sources và production contract nhất quán;
- không triển khai feature Phase 2+ chỉ để làm test compile;
- không sửa assertion thành vô nghĩa, không xóa test.

Sau sửa, toàn bộ test sources phải compile. Nếu một lỗi thực sự không thể xử lý trong phạm vi, report phải ghi blocker và không được tuyên bố PASS.

### 3. Chứng minh registration-created policy bằng luồng thật

Thêm integration tests gọi real `AuthService.register(...)`, không gọi trực tiếp factory, cho cả:

- LOCAL Candidate;
- LOCAL Recruiter.

Sau registration, query database và assert:

- đúng một `automation_policy` gắn với user;
- `demo_mode_enabled = true`;
- role đúng;
- transaction không tạo duplicate policy;
- Candidate profile behavior hiện hữu vẫn đúng;
- registration lỗi phải rollback user và policy phù hợp.

Registration và lazy creation phải dùng chung một account-source-aware factory/default implementation.

### 4. Hoàn thiện invariant cho IMPORTED/synthetic accounts

Imported account không chỉ có default false lúc tạo. Nó phải không thể phát outbound automation do policy drift hoặc API update.

Áp dụng defense-in-depth hợp lý:

- policy factory tắt toàn bộ outbound/automation toggles;
- mutation/update boundary phải reject hoặc cưỡng chế false khi imported account cố bật outbound;
- effective resolver phải bảo đảm imported account luôn trả outbound/automation disabled;
- Admin không tự nhận Demo Mode human defaults;
- LOCAL Candidate/Recruiter mặc định Demo Mode ON.

Kiểm tra đầy đủ ít nhất các toggle hiện có:

```text
emailNotificationsEnabled
digest/dailyDigestEnabled
autoApplyEnabled
autoInviteEnabled
jobScanEnabled
highMatchEmailEnabled
emailActionEnabled
```

Nếu còn outbound toggle tương đương trong entity/settings, phải đưa vào cùng invariant.

Thêm negative tests: cố bật từng đường mutation có thể truy cập cho imported account, rồi assert stored/effective policy vẫn disabled hoặc request bị từ chối theo contract nhất quán.

### 5. Hoàn thiện EffectiveAutomationPolicyResolver

Test chính xác cả Demo ON và OFF.

Demo ON effective timing:

```text
candidatePollIntervalSeconds = 5
firstSuggestionDelaySeconds = 12
subsequentSpacingSeconds = 30
recoveryCadenceSeconds = 30
notificationCooldownHours = 0
quietHoursEnabled = false
```

Demo OFF phải trả normal stored/effective equivalents theo source of truth hiện tại, không làm mất preferences.

Test toggle sequence:

1. Set các normal preferences thành giá trị khác default.
2. Bật Demo Mode.
3. Assert effective overlay dùng timing/cooldown Demo.
4. Assert stored normal fields không đổi.
5. Tắt Demo Mode.
6. Assert effective policy khôi phục đúng toàn bộ stored values ban đầu.

Không được overwrite normal preferences khi bật/tắt Demo Mode.

### 6. Chuẩn hóa typed identity cho outbox

Không để producer tự truyền `targetKey` string tùy ý.

Tạo abstraction typed/factory duy nhất, ví dụ tương đương:

```text
OutboxTargetIdentity.from(matchingId, jobId)
```

Contract:

- có `matchingId` → identity bắt buộc dùng matchingId;
- không có matchingId nhưng có `jobId` → dùng jobId;
- thiếu cả hai → reject;
- target type/key được canonicalize một chỗ;
- producer cạnh tranh cho cùng logical identity phải đi qua cùng API;
- unique DB identity vẫn là recipient + email type + canonical target type/key.

Không cần viết dispatcher hoặc gửi email trong phase này.

### 7. Viết lại persistence/concurrency tests có ý nghĩa

Test trên PostgreSQL Testcontainers thật, không mock repository/constraint.

Phải cover:

- duplicate enqueue tuần tự → đúng một row;
- 10 producer/transaction cạnh tranh → đúng một row;
- thu kết quả từng `Future`, không nuốt exception;
- timeout hữu hạn;
- executor luôn shutdown trong `finally`;
- assert chính xác một insert thành công và các call còn lại là conflict/no-op hợp lệ;
- query database assert `COUNT(*) = 1` cho logical identity;
- matchingId được ưu tiên khi cả matchingId và jobId có mặt;
- jobId chỉ dùng khi matchingId absent;
- thiếu cả hai ID bị reject;
- hai recipient hoặc email type khác nhau không bị deduplicate nhầm.

### 8. Bổ sung migration/index recovery nếu còn thiếu

Không sửa V31. Nếu query recovery cần index mà V31 chưa có, thêm V32 additive.

Chứng minh qua PostgreSQL catalog hoặc `EXPLAIN` rằng schema có index phù hợp cho:

- due PENDING polling;
- recipient scheduling/history;
- FAILED hoặc stuck-item recovery theo status model thực tế.

Không cần implement dispatcher; chỉ hoàn thiện foundation/schema/query contract cần cho phase sau.

### 9. DTO/API contract

Kiểm tra API/DTO liên quan Demo Mode:

- không trả JPA entity trực tiếp;
- không lộ password hash, token hoặc secret;
- Admin không bị áp Demo defaults;
- imported mutation contract trả response/error nhất quán.

Không xây Settings UI trong remediation này.

## Test gates bắt buộc

Chạy từ `Backend/careerfit-backend` và lưu command, exit code, test count, elapsed time:

```powershell
.\mvnw.cmd testCompile
.\mvnw.cmd -Dtest=Phase1OutboxPolicyTest,AuthServiceTest test
.\mvnw.cmd test
```

Ngoài ra:

```powershell
git diff --check
```

Migration verification trên disposable PostgreSQL phải chứng minh:

- clean V1 → latest thành công;
- Flyway validate thành công;
- `demo_mode_enabled` tồn tại đúng null/default contract;
- `notification_outbox` columns/constraint/indexes đúng;
- `ca` và `re` Demo ON khi fixture/seed tương ứng tồn tại;
- `ad` không bị bật Demo Mode;
- imported accounts outbound-disabled;
- database chính không bị test ghi thêm.

Không được ghi PASS nếu:

- targeted test chỉ pass nhờ exclude test sources;
- Docker/Testcontainers tests bị skipped;
- full `mvn test` còn failure/error/compile error;
- datasource evidence trỏ vào database chính;
- acceptance nào chỉ được mô tả bằng prose mà không có automated assertion hoặc SQL evidence tương ứng.

## Báo cáo bắt buộc

Cập nhật chính xác:

`prompt-gemini/11-02-schema-policy-and-outbox-foundation-report.md`

Đồng thời tạo:

`prompt-gemini/11-02-remediation-close-checkpoint-1-report.md`

Report remediation phải có:

```text
STATUS: READY_FOR_REAUDIT | BLOCKED
Changed files:
Findings closed, từng finding một:
Migration V1→latest evidence:
Ephemeral JDBC evidence (redacted, và khẳng định không phải localhost:5433/careerfit):
Exact test commands + exit codes + test counts:
Outbox row-count/concurrency evidence:
Registration Candidate/Recruiter evidence:
Imported invariant evidence:
Demo ON/OFF stored-vs-effective evidence:
Read-only inventory của main-DB residue cũ:
Full regression result:
git diff --check result:
Remaining risks/blockers:
```

Không chèn raw JWT, password, token, secret hoặc connection password vào report. Không được tự nhận checkpoint PASS; chỉ checkpoint agent mới kết luận PASS/FAIL.

## Điều kiện dừng

Chỉ dừng khi một trong hai điều kiện:

1. Tất cả test gates và acceptance trên pass, report ghi `READY_FOR_REAUDIT`; hoặc
2. Có blocker khách quan không thể xử lý an toàn, report ghi `BLOCKED` cùng command/output thật.

Sau đó dừng. Không chạy Phase 2 và không reset database chính.
