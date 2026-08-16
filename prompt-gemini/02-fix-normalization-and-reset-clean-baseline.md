# Nhiệm vụ: Sửa triệt để importer/recruiter normalization và reset dữ liệu local về baseline sạch

Bạn là coding agent tiếp tục nhiệm vụ từ:

```text
prompt-gemini/01-normalize-company-recruiters.md
prompt-gemini/01-normalize-company-recruiters-report.md
```

Một reviewer độc lập đã kết luận vòng trước **chưa đạt** vì importer không idempotent và thuật toán slug giữa JavaScript, SQL importer và migrations không nhất quán. Hãy trực tiếp sửa code, migration, test và chạy kiểm chứng. Sau khi tất cả test đạt, thực hiện một lần reset database/storage local về trạng thái baseline sạch như ngay sau khi migrations chạy và dữ liệu scrape được import lần đầu.

Khi hoàn tất, bắt buộc tạo báo cáo:

```text
prompt-gemini/02-fix-normalization-and-reset-clean-baseline-report.md
```

Không sửa hoặc xóa các file prompt. Không commit, push hay tạo PR.

## Kết quả audit bắt buộc phải xử lý

### P0 — Import lại hiện tạo JD trùng

Reviewer đã tái tạo không ghi dữ liệu và thu được:

```text
Expected hashes từ importer mới: 974
Hash hiện có trong database:      974
Expected hash chưa tồn tại:       133
```

Nguyên nhân: importer tính `external_hash` bằng canonical company, trong khi V27 chỉ đổi `job.company`/`recruiter_id` mà không chuyển identity/hash cũ. `ON CONFLICT (external_hash)` không thể bắt 133 bản ghi đó.

Yêu cầu sửa:

- Chọn một identity ổn định cho imported JD, không thay đổi chỉ vì alias/canonical company hoặc text normalization.
- Dataset hiện tại đã được xác minh có 974/974 `source_url` và 974 cặp `(source_platform, source_url)` duy nhất. Có thể dùng source key này làm thành phần chính, nhưng phải xử lý/validate rõ trường hợp nguồn tương lai thiếu URL hoặc URL trùng.
- Import trên database cũ phải match JD hiện hữu trước khi insert, giữ nguyên `job.id` và cập nhật identity mới an toàn.
- Không xóa rồi tạo lại JD.
- Application, matching, recruiter bookmark, content report và mọi foreign key theo JD phải giữ nguyên.
- Chứng minh import lần 1 và lần 2 có cùng count và cùng tập ID.
- Chứng minh thêm alias mới rồi import lại không sinh JD mới cho source record cũ.

### P0 — Ba thuật toán slug/email đang khác nhau

Reviewer đã xác minh 215/433 công ty có slug khác nhau giữa module JavaScript và SQL importer.

Ví dụ:

```text
LG CNS Việt Nam
companySlug module: lg-cns-viet-nam
database V28:       lg-cns-viit-nam
importer SQL:       lg-cns-vi-t-nam
```

Yêu cầu sửa:

- Chỉ có **một source of truth thực thi** cho canonical company, slug và recruiter email.
- Tính canonical name, slug và email trong JavaScript trước khi đưa vào staging SQL; SQL không được tự triển khai lại transliteration bằng regex/`translate` khác.
- Payload staging nên chứa trực tiếp canonical company, canonical slug và recruiter email đã validate.
- Migrations/data upgrade phải dùng mapping/artifact được sinh deterministically từ cùng source hoặc có test máy tự động chứng minh 100% tương đương.
- Kiểm tra collision trên toàn bộ 433 canonical company, không chỉ 14 alias groups.
- Collision phải fail-fast hoặc được giải quyết bằng suffix ổn định; không âm thầm gộp hai công ty.
- Email phải nằm trong giới hạn cột `user_account.email` và đúng format.

### P1 — Migration/password/policy scope quá rộng

V28 đang reset password cho mọi account khớp `recruiter.%@careerfit.local`; V27/V28 cũng sửa policy theo pattern rộng này.

Yêu cầu sửa:

- Chỉ sửa account được xác định chắc chắn thuộc importer qua mapping/staging/ownership/import marker phù hợp.
- Không reset password hoặc settings của recruiter local không thuộc dữ liệu scrape.
- Nếu schema cần marker rõ ràng cho imported account, thêm migration/field có tên và constraint phù hợp; cập nhật entity/test nếu ứng dụng cần đọc field.
- Canonical imported recruiters vẫn phải có password `1`, active, role recruiter, unverified, language `vi` và mọi email-related toggle tắt.

### P1 — Thiếu integration/idempotency/API tests

Bổ sung test tự động hoặc test harness có assertion/exit code để chứng minh:

1. Clean migration V1 đến version mới chạy thành công.
2. Import lần đầu tạo đúng dữ liệu.
3. Import lần hai không đổi count hoặc ID của JD.
4. Import sau khi alias map được mở rộng vẫn giữ ID.
5. Một canonical company có đúng một active imported recruiter.
6. Slug/email do pipeline dùng khớp `companySlug()`/`recruiterEmail()` cho toàn bộ dataset.
7. Password và email policy đúng cho toàn bộ imported recruiters, không tác động account ngoài importer.
8. Login thật bằng `recruiter.mb-bank@careerfit.local` / `1`.
9. Dùng JWT thật gọi thành công các endpoint đại diện:
   - recruiter dashboard;
   - danh sách owned jobs;
   - applicants của một MB Bank job;
   - discovery/ranking/talent endpoint phù hợp;
   - recruiter analytics;
   - settings.
10. Backend regression suite pass.

Không được chỉ test utility function hoặc ghi kết quả thủ công trong báo cáo.

## Quy tắc Flyway

- Kiểm tra trạng thái Git và `flyway_schema_history` trước khi quyết định sửa migration.
- V27/V28 đã được apply vào database local hiện tại. Không được âm thầm sửa checksum của migration đã phát hành nếu cần hỗ trợ database đã apply.
- Ưu tiên migration kế tiếp để remediate database đã có V27/V28, trừ khi chứng minh rõ repo chưa phát hành và quy trình reset sẽ thay thế toàn bộ history. Báo cáo phải giải thích quyết định.
- Migration mới phải chạy được trên:
  - clean database;
  - database đã qua V27/V28 với 974 imported JD;
  - database ít hoặc chưa có scraped JD.
- Không dùng `flyway repair` để che checksum mismatch.

## Alias và ranh giới công ty

- Giữ tối thiểu mapping MB Bank và TPBank theo prompt gốc.
- Rà lại các trường hợp agent trước đã gộp công ty con/joint venture như MBV, MB Ageas, VCBS, VPBank Securities, ACB Securities.
- Bám đúng mong muốn người dùng: mô hình demo không cần nhiều recruiter/chi nhánh/công ty con trong cùng nhóm công ty; nếu tiếp tục gộp thì ghi rõ group ownership. Không được vừa nói “không gộp pháp nhân riêng” vừa gộp mà không giải thích.
- Không fuzzy-match tự động.

## Tạo quy trình reset local tái lập được

Tạo một script an toàn, có tài liệu, ví dụ:

```text
scripts/reset-local-demo-data.ps1
```

Script phải dựng lại đúng baseline sau:

1. Xóa **chỉ** container/volume local thuộc Compose project của repository này.
2. Xóa PostgreSQL volume để loại mọi account, CV, JD, application, matching, bookmark, report và dữ liệu runtime người dùng đã thêm.
3. Xóa backend storage volume để loại file CV upload không còn tham chiếu.
4. Khởi động PostgreSQL mới.
5. Chạy toàn bộ Flyway migrations mới nhất.
6. Import `scraped-data/jobs_for_careerfit_import.json` đúng một lần bằng importer đã sửa.
7. Chạy hậu kiểm và fail nếu baseline không hợp lệ.

### Ràng buộc an toàn reset

- Đây là thao tác phá hủy dữ liệu **đã được người dùng yêu cầu**, nhưng chỉ được nhắm vào local CareerFit của repo `C:\CODING\Thesis`.
- Trước khi xóa, resolve và in ra Compose project, services và exact named volumes. Hiện config dự kiến có hai logical volumes:

```text
careerfit_postgres_data
careerfit_backend_storage
```

Với project hiện tại, Docker có thể materialize thành:

```text
thesis_careerfit_postgres_data
thesis_careerfit_backend_storage
```

Không hard-code rồi xóa volume chưa được đối chiếu với `docker compose config`/labels.
- Không đụng các volume `careerfit_monitoring_*`, database/volume project khác hoặc file ngoài workspace.
- Dùng một shell PowerShell end-to-end; không enumerate bằng PowerShell rồi chuyển danh sách sang shell khác để xóa.
- Script phải mặc định từ chối chạy nếu sai workspace/Compose project hoặc target không khớp.
- Có cờ xác nhận rõ như `-Force`; không yêu cầu nhập tương tác khi đã dùng cờ.
- Fail-fast; kiểm tra health giữa các bước.
- Không đọc/in secret từ `.env` vào report/log.

## Thứ tự thực hiện bắt buộc

### Giai đoạn A — Sửa code, chưa reset database thật

1. Đọc prompt gốc, report cũ và audit ở trên.
2. Kiểm tra working tree; bảo toàn thay đổi không liên quan của người dùng.
3. Sửa identity, slug/email, migration scope và tests.
4. Dùng Testcontainers, database tạm hoặc Compose project/volume tạm biệt lập để test:
   - upgrade database cũ;
   - import hai lần;
   - alias mở rộng;
   - bảo toàn ID/foreign keys;
   - API smoke test.
5. Chạy backend suite và `git diff --check`.
6. Nếu bất cứ test bắt buộc nào fail, tự sửa và chạy lại. Không chuyển sang Giai đoạn B.

### Giai đoạn B — Reset local thật một lần

Chỉ sau khi Giai đoạn A pass hoàn toàn:

1. Thu thập **manifest trước reset** để làm bằng chứng, tối thiểu:
   - Flyway version;
   - count user/account theo role/import status;
   - count job tổng/imported;
   - CV, application, matching, bookmark, report;
   - exact Compose resources sẽ xóa.
2. Chạy script reset với cờ xác nhận để xóa đúng PostgreSQL và backend storage của project này.
3. Dựng schema mới từ migrations.
4. Import dữ liệu scrape đúng một lần.
5. Thu thập **manifest baseline sau reset**.
6. Chạy importer lần hai như idempotency verification; xác nhận count và tập `job.id` không đổi.
7. Để database cuối cùng ở trạng thái chạy được, clean baseline, không chèn test fixtures tạm.

## Baseline sau reset được hiểu như thế nào

Baseline sạch là:

- Các seed/demo account, CV, JD và dữ liệu mẫu được định nghĩa chính thức trong Flyway migrations vẫn tồn tại.
- 974 JD scrape từ file nguồn được import và chuẩn hóa.
- Canonical imported recruiter tồn tại, đăng nhập được với password `1`, email toggle tắt.
- Không còn account/CV/JD/application/... do người dùng thêm thủ công sau lần import trước.
- Không còn file CV upload runtime cũ trong backend storage.
- Không còn account alias active hoặc recruiter trùng cho cùng canonical company.
- Lần import kiểm chứng thứ hai không làm baseline thay đổi.

Không được hiểu “mới tinh” là database rỗng hoàn toàn; nó là trạng thái tái lập từ migrations + một dataset scrape chuẩn.

## Hậu kiểm bắt buộc sau reset

Báo cáo câu lệnh và output thực tế cho:

- Flyway version mới nhất và toàn bộ migration success.
- Tổng user theo role; imported canonical recruiters active; inactive aliases.
- Tổng JD, imported JD, canonical company.
- Source key thiếu/trùng.
- External/import identity thiếu/trùng.
- Company có nhiều hơn một active imported recruiter: 0 rows.
- `job.company` không khớp canonical employer: 0 rows cho imported jobs.
- Imported recruiter sai email/password/role/active/verified/language/policy: 0 rows.
- Counts CV/application/matching/bookmark/report của baseline.
- Storage volume mới không chứa file upload cũ.
- Top 10 demo recruiter với email/password/job count.
- Snapshot tập JD ID/count trước và sau lần import kiểm chứng thứ hai giống hệt.
- Login và sáu nhóm recruiter endpoint nêu trên trả status phù hợp.

## Các lệnh test tối thiểu

Tự xác định chính xác theo repo, nhưng tối thiểu gồm:

```text
node scripts/company-normalization.test.mjs
node scripts/import-scraped-jobs.mjs --dry-run
<integration/idempotency test mới>
Backend/careerfit-backend/mvnw.cmd test
git diff --check -- <các file thuộc nhiệm vụ>
```

Nếu tạo script test mới, nó phải có assertion và exit code khác 0 khi sai; không chỉ print thống kê.

## Tiêu chí hoàn thành

- [ ] 133-hash/idempotency defect được sửa và có regression test.
- [ ] Pipeline chỉ dùng một canonical slug/email source; 433/433 company nhất quán.
- [ ] Không có silent slug/email collision.
- [ ] Migration chỉ tác động imported accounts.
- [ ] Database cũ V27/V28 upgrade được mà giữ JD ID và foreign keys.
- [ ] Import hai lần không thay đổi count/ID.
- [ ] Auth + dashboard/jobs/applicants/discovery/analytics/settings được test bằng account MB Bank thật.
- [ ] Backend regression pass.
- [ ] Reset script an toàn, tái lập được và có guard.
- [ ] Reset local thực tế đã chạy sau khi test pass.
- [ ] Database/storage cuối cùng là clean baseline từ migrations + scrape import.
- [ ] Báo cáo mới trung thực, đầy đủ bằng chứng.

## Nội dung bắt buộc của báo cáo mới

Tạo `prompt-gemini/02-fix-normalization-and-reset-clean-baseline-report.md` với:

### 1. Kết luận

`HOÀN THÀNH`, `HOÀN THÀNH MỘT PHẦN` hoặc `BỊ CHẶN`. Không ghi hoàn thành nếu chưa reset hoặc chưa chứng minh idempotency.

### 2. Root cause và cách sửa từng finding

Đối chiếu P0/P1 ở trên, kèm file và dòng.

### 3. Identity và canonicalization design cuối cùng

Mô tả source key/import identity, alias source, slug/email, collision behavior và scope marker.

### 4. Migration strategy

Nêu migration version mới, clean path, upgrade path V27/V28 và cách giữ ID/FK.

### 5. File thay đổi

Liệt kê chính xác từng file và mục đích; không nhận các thay đổi có sẵn ngoài nhiệm vụ là của mình.

### 6. Test trước reset

Mỗi lệnh gồm working directory, full command, exit code, pass/fail/skip và output chính.

### 7. Manifest trước reset

Counts, Flyway state và exact Compose resources.

### 8. Reset execution

Câu lệnh thực tế, từng bước, exit code, health và volume nào đã xóa/tạo lại. Không ghi secret.

### 9. Manifest baseline sau reset

Toàn bộ hậu kiểm bắt buộc cùng SQL/output thực tế.

### 10. Idempotency proof

Count và checksum/sorted ID-set trước/sau import lần hai; phải giống nhau.

### 11. API smoke proof

Endpoint, HTTP status và assertion chính; che JWT token.

### 12. Top 10 account demo

Bảng `rank | company | login | password | job_count`.

### 13. Diff audit

`git status --short`, target `git diff --stat`, target `git diff --check`.

### 14. Rủi ro/phần còn lại

Ghi trung thực mọi mục chưa chạy. Không tuyên bố pass dựa trên suy luận.

## Quy tắc kết thúc

- Không dừng ở kế hoạch.
- Không chạy reset thật trước khi integration/idempotency tests pass trên môi trường tạm.
- Không xóa volume ngoài exact local Compose project đã xác minh.
- Sau reset, không để test fixture hoặc dữ liệu kiểm thử phát sinh trong database baseline.
- Chỉ kết thúc sau khi báo cáo mới được tạo và tự đối chiếu với bằng chứng thực tế.

