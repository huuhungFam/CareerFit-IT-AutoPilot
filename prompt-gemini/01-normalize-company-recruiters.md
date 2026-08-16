# Nhiệm vụ: Chuẩn hóa công ty và hợp nhất recruiter cho dữ liệu JD import

Bạn là coding agent chịu trách nhiệm triển khai hoàn chỉnh nhiệm vụ này trong repository CareerFit. Hãy trực tiếp khảo sát code, sửa code, thêm migration, thêm test, chạy kiểm thử và tự sửa đến khi đạt. Không chỉ viết kế hoạch hay hướng dẫn.

Khi hoàn tất, **bắt buộc tạo báo cáo chi tiết tại**:

```text
prompt-gemini/01-normalize-company-recruiters-report.md
```

Báo cáo này là đầu vào để một agent khác kiểm tra độc lập công việc của bạn. Không sửa hoặc ghi đè file prompt hiện tại.

## Bối cảnh đã xác minh

- Importer chính hiện nằm tại `scripts/import-scraped-jobs.mjs`.
- Nguồn mặc định là `scraped-data/jobs_for_careerfit_import.json`, hiện có khoảng 974 JD và 452 chuỗi tên công ty khác nhau.
- Importer hiện tạo email dạng `scraped+<md5-company>@careerfit.local`, do đó alias công ty tạo thành nhiều recruiter.
- `external_hash` hiện phụ thuộc cả `company`; thay đổi tên công ty mà không xử lý chiến lược định danh có thể làm lần import tiếp theo tạo JD trùng.
- Account nằm ở `user_account`; hồ sơ công ty nằm ở `employer_profile`; ownership nằm ở `job.recruiter_id` và tên hiển thị nằm ở `job.company`.
- Email settings nằm chủ yếu trong `automation_policy`; tên cột thực tế phải được đọc từ migration/schema hiện tại, không suy đoán từ tên khái niệm.
- BCrypt hash đã dùng trong repo cho mật khẩu demo `1` là:

```text
$2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi
```

- Migration hiện tại cao nhất là V26 tại thời điểm viết prompt. Trước khi thêm migration mới, phải kiểm tra lại để tránh trùng version nếu repository đã thay đổi.
- Working tree có thể đang chứa nhiều thay đổi chưa commit của người dùng. Không hoàn tác, xóa, format hàng loạt hoặc ghi đè thay đổi không thuộc nhiệm vụ.

## Kết quả nghiệp vụ bắt buộc

### 1. Một công ty phổ biến tương ứng đúng một recruiter import

- Mọi alias đã biết của cùng một công ty phải được chuẩn hóa về đúng một canonical company name.
- Không xây mô hình công ty mẹ/con, chi nhánh hay nhiều recruiter cho cùng công ty trong phạm vi dữ liệu import.
- Một recruiter canonical quản lý toàn bộ JD được chuẩn hóa về công ty đó.
- Không hợp nhất các công ty chỉ vì tên gần giống nếu không đủ bằng chứng; ưu tiên mapping tường minh, có kiểm thử và dễ mở rộng.

Các mapping tối thiểu bắt buộc:

```json
{
  "MB Bank": [
    "MB Bank",
    "Ngân Hàng TMCP Quân Đội",
    "Military Commercial Joint Stock Bank"
  ],
  "TPBank": [
    "TPBank",
    "Ngân Hàng TMCP Tiên Phong (TPBank)",
    "Ngân hàng TMCP Tiên Phong | TPBank"
  ]
}
```

Hãy rà toàn bộ tập dữ liệu hiện có để bổ sung **các alias có độ tin cậy cao** khác (khác biệt viết hoa/thường, dấu câu, legal suffix, tên Việt/Anh có thương hiệu rõ ràng). Báo cáo phải liệt kê toàn bộ canonical group đã hợp nhất và bằng chứng/logic dùng để hợp nhất. Không dùng fuzzy matching mù có nguy cơ gộp nhầm pháp nhân.

### 2. Chuẩn hóa trước khi tạo recruiter và JD

- Tách alias map và hàm normalization thành cấu trúc có thể đọc, review, mở rộng và unit test; không nhét một biểu thức SQL khó bảo trì làm nguồn chân lý duy nhất.
- Chuẩn hóa company ngay trong pipeline import, trước khi:
  - tính danh tính recruiter;
  - tạo/cập nhật `user_account`;
  - tạo/cập nhật `employer_profile`;
  - gán `job.recruiter_id`;
  - lưu `job.company`;
  - tính khóa idempotency/deduplication của JD.
- Alias lookup phải xử lý an toàn whitespace, Unicode và khác biệt hoa/thường phù hợp, nhưng output luôn là canonical name đúng chính tả trong alias map.
- Tên không có mapping phải được giữ nguyên sau bước clean an toàn, không bị mất dữ liệu.

### 3. Tài khoản recruiter canonical

- Mỗi recruiter canonical dùng email xác định, dễ đọc:

```text
recruiter.<company-slug>@careerfit.local
```

- Ví dụ bắt buộc:

```text
MB Bank -> recruiter.mb-bank@careerfit.local
```

- Slug phải ổn định, lowercase ASCII, an toàn cho email và xử lý collision một cách xác định. Không để hai canonical company vô tình dùng chung email/slug.
- Tất cả recruiter import canonical có:

```text
password = 1
password_hash = $2a$10$Zq8pkdahfd6.2P/iseYLA.3i43HY5ZVPJmlIWyVY3MwjemD8sgsmi
role = RECRUITER
is_active = true
email_verified = false
preferred_language = vi
```

- Tất cả các recruiter canonical, không chỉ top 10, phải đăng nhập được và sử dụng đầy đủ các API/UI recruiter theo ownership: dashboard, quản lý JD, applicants, discovery/talent pool, analytics và settings.
- Không làm yếu cơ chế authentication/authorization để đạt yêu cầu này.

### 4. Tắt email mặc định cho recruiter import `.local`

Với mọi recruiter canonical do importer quản lý, tạo hoặc cập nhật policy để ít nhất các hành vi sau đều tắt:

```text
emailNotificationsEnabled = false
dailyDigest = false
highMatchAlerts = false
```

Hãy ánh xạ các khái niệm này sang đúng cột/entity hiện có sau khi đọc schema. Kiểm tra thêm các toggle có thể gửi email khác cho recruiter import (ví dụ email action/notification tương đương); nếu chúng có thể phát email đến `.local`, phải tắt hoặc chứng minh có guard tập trung chặn gửi. Không thay đổi default của người dùng thật hoặc demo account không thuộc nhóm import.

### 5. Migration cho database đã import

Thêm Flyway migration kế tiếp, an toàn và chạy trong transaction, để nâng cấp database đã có dữ liệu import:

- Tạo/upsert recruiter canonical và employer profile canonical.
- Chuyển mọi JD của alias sang đúng recruiter canonical.
- Đổi `job.company` sang canonical popular name.
- Giữ nguyên ID của mọi JD.
- Giữ nguyên toàn bộ application, matching, bookmark, report và các quan hệ nghiệp vụ gắn với JD; không xóa rồi tạo lại JD.
- Tạo/cập nhật policy tắt email cho recruiter canonical.
- Sau khi alias account không còn sở hữu JD, đặt `is_active = false` cho account alias import cũ.
- Không vô hiệu hóa account hợp lệ ngoài nhóm recruiter import mà migration xác định chắc chắn.
- Xử lý employer profile alias cũ mà không vi phạm unique constraint và không làm mất dữ liệu hồ sơ có giá trị. Nêu rõ chiến lược merge/preserve trong báo cáo.
- Migration phải tương thích với cả database đã import và database mới/ít dữ liệu; không được fail khi một alias không tồn tại.

### 6. Import phải idempotent, không sinh JD trùng

Đây là tiêu chí quan trọng, không được bỏ qua:

- Hiện `external_hash` chứa company name. Sau normalization, hash có thể thay đổi so với bản ghi đã import bằng alias.
- Thiết kế và triển khai cách migration/importer phối hợp để chạy importer lại trên cùng file không tạo bản sao JD.
- Không được giải quyết bằng cách xóa JD cũ vì phải bảo toàn ID và mọi quan hệ.
- Chứng minh bằng test tự động hoặc integration verification rằng:
  1. import lần đầu tạo dữ liệu đúng;
  2. import lại cùng input không tăng số JD;
  3. thêm alias mới vào mapping rồi import/migrate vẫn hợp nhất ownership mà không nhân đôi JD;
  4. `external_hash`/khóa định danh vẫn unique và ổn định theo chiến lược đã chọn.

### 7. Danh sách khoảng 10 recruiter demo nổi bật

- Không cố ép tổng số canonical company xuống một con số thấp tùy tiện. Sau normalization, 350–430 công ty vẫn chấp nhận được nếu mapping đúng.
- Tính top 10 canonical recruiter theo số JD sau chuẩn hóa.
- Ghi danh sách top 10 vào báo cáo với: thứ hạng, canonical company, email đăng nhập, mật khẩu demo `1`, số JD.
- Nếu dự án có tài liệu demo-account phù hợp thì cập nhật đồng bộ; không hard-code top 10 vào logic runtime nếu danh sách có thể được tính từ dữ liệu.
- Tất cả recruiter canonical ngoài top 10 vẫn phải đăng nhập được.

## Thiết kế và an toàn dữ liệu

- Thuật toán matching CV–JD không được thay đổi chỉ vì hợp nhất recruiter.
- Không làm thay đổi điểm matching, nội dung CV, nội dung JD hoặc trạng thái application ngoài các trường ownership/company/identity cần thiết.
- Không thêm dependency nếu có thể dùng Node/JDK/PostgreSQL hiện có.
- Không hard-code kết quả đếm 974/452 vào logic; đó chỉ là snapshot để đối chiếu.
- Không log password hash hoặc secret ngoài dữ liệu demo đã công khai trong seed/migration.
- Importer cần tiếp tục hỗ trợ `--dry-run`; dry-run phải cho thấy số raw company, canonical company, số alias được hợp nhất và các collision/cảnh báo quan trọng.
- Các thao tác SQL/import phải fail-fast và rollback khi có lỗi; không để database ở trạng thái chuyển đổi một phần.

## Test bắt buộc

Tự xác định lệnh chính xác từ repo, nhưng tối thiểu phải bổ sung và chạy:

1. Unit test cho company normalization:
   - Ba alias MB đều trả `MB Bank`.
   - Ba alias TPBank đều trả `TPBank`.
   - Case/whitespace/Unicode normalization phù hợp.
   - Company chưa biết được giữ lại an toàn.
   - Slug/email deterministic và không collision âm thầm.
2. Test importer/dry-run:
   - Số canonical company nhỏ hơn số raw distinct company khi dataset chứa alias.
   - Mọi row sau normalize có canonical company/recruiter identity nhất quán.
3. Test migration hoặc integration SQL trên PostgreSQL thật nếu môi trường có Docker:
   - Alias JD được chuyển sang canonical recruiter nhưng `job.id` không đổi.
   - Counts/IDs của application, matching, bookmark và report trước/sau không đổi.
   - Alias account bị inactive chỉ sau khi không còn JD.
   - Canonical account active, chưa verified, BCrypt hash đúng và policy email đều false.
   - Không còn hơn một active imported recruiter cho cùng canonical company.
4. Idempotency test chạy import hai lần và so sánh ID/count JD.
5. Authentication/API smoke test ít nhất cho `recruiter.mb-bank@careerfit.local` / `1`, chứng minh login thật và truy cập được các recruiter endpoints đại diện cho dashboard, owned jobs, applicants/discovery, analytics và settings. Không mock authentication cho kiểm tra này nếu stack chạy được.
6. Backend regression suite liên quan và `git diff --check`.

Nếu Docker hoặc dịch vụ không khả dụng, vẫn phải chạy toàn bộ unit/static test có thể chạy, ghi nguyên văn blocker và cung cấp script/câu SQL verification để người kiểm tra chạy lại. Không được ghi `PASS` cho kiểm tra chưa thực thi.

## Truy vấn hậu kiểm bắt buộc

Trong báo cáo, cung cấp kết quả thực tế và câu SQL có thể chạy lại để kiểm tra ít nhất:

- tổng số imported JD;
- số raw distinct company và số canonical company;
- số active canonical imported recruiters;
- số inactive alias recruiters;
- canonical company nào còn nhiều hơn một active imported recruiter (kết quả phải rỗng);
- JD nào có `job.company` không khớp employer canonical của recruiter (kết quả phải rỗng cho imported jobs);
- recruiter `.local` nào thiếu password hash hoặc policy email-off (kết quả phải rỗng);
- duplicate JD theo khóa identity mới (kết quả phải rỗng);
- top 10 recruiter theo số JD.

## Tiêu chí hoàn thành

- [ ] Mapping tối thiểu MB Bank và TPBank đúng hoàn toàn.
- [ ] Alias map có cấu trúc rõ ràng, được dùng chung nhất quán bởi importer và migration hoặc được sinh ra deterministically từ cùng một source of truth.
- [ ] Mỗi canonical imported company có đúng một active recruiter và một employer profile phù hợp.
- [ ] Email canonical theo `recruiter.<slug>@careerfit.local`; MB Bank đúng email mẫu.
- [ ] Tất cả canonical recruiter đăng nhập được bằng mật khẩu `1`.
- [ ] Mọi email toggle của recruiter import mặc định tắt mà không ảnh hưởng user ngoài phạm vi.
- [ ] Database cũ được migrate mà giữ nguyên JD ID và toàn bộ quan hệ phụ thuộc.
- [ ] Import lại không tạo JD trùng.
- [ ] Top 10 recruiter được tính và báo cáo.
- [ ] Test mới và regression test liên quan pass.
- [ ] Không có thay đổi ngoài phạm vi hoặc phá thay đổi sẵn có của người dùng.

## Nội dung bắt buộc của file báo cáo

Tạo `prompt-gemini/01-normalize-company-recruiters-report.md` với đúng các mục sau:

### 1. Kết luận

Ghi `HOÀN THÀNH`, `HOÀN THÀNH MỘT PHẦN` hoặc `BỊ CHẶN`. Không ghi `HOÀN THÀNH` nếu bất kỳ tiêu chí bắt buộc nào chưa được chứng minh.

### 2. Hiện trạng và nguyên nhân gốc

Mô tả ngắn cách importer cũ tách alias và rủi ro `external_hash`.

### 3. Thiết kế đã triển khai

Nêu source of truth của alias, normalization rules, email/slug strategy, idempotency strategy, migration order và cách bảo toàn quan hệ.

### 4. Toàn bộ file đã thay đổi

Liệt kê từng file, mục đích và phần hành vi quan trọng; phân biệt file đã có thay đổi từ trước nếu có overlap.

### 5. Alias groups

Bảng đầy đủ canonical name → aliases thực sự được hợp nhất. Giải thích các trường hợp đáng chú ý hoặc alias nghi ngờ đã chủ động không gộp.

### 6. Migration và tính toàn vẹn dữ liệu

Ghi version migration, dữ liệu trước/sau, số ID/quan hệ được đối chiếu, chiến lược employer profile và alias account.

### 7. Kết quả kiểm thử

Với từng lệnh: working directory, câu lệnh đầy đủ, exit code, số test pass/fail/skip và trích kết quả đủ để kiểm chứng. Không chỉ ghi “tests passed”.

### 8. Kết quả truy vấn hậu kiểm

Ghi câu SQL và output/count thực tế cho toàn bộ danh sách hậu kiểm ở trên. Đánh dấu rõ lệnh nào chưa chạy.

### 9. Top 10 tài khoản demo

Bảng `rank | company | login | password | job_count`.

### 10. Diff audit

Tóm tắt `git status --short`, `git diff --stat`, `git diff --check`; xác nhận không xóa/hoàn tác thay đổi ngoài phạm vi.

### 11. Phần còn lại và rủi ro

Liệt kê chính xác test chưa chạy, blocker môi trường, giả định, rủi ro migration hoặc việc cần reviewer kiểm tra. Ghi `Không có` chỉ khi thực sự đầy đủ.

## Quy tắc kết thúc

- Không commit, push hoặc tạo PR trừ khi người dùng yêu cầu riêng.
- Không dừng ở bản kế hoạch.
- Nếu test do code mới thất bại, tự sửa và chạy lại.
- Chỉ kết thúc sau khi file báo cáo đã được tạo và tự kiểm tra nội dung báo cáo khớp bằng chứng thực tế.

