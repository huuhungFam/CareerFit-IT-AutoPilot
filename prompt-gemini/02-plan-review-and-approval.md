# Phê duyệt có điều kiện: Remediation Implementation Plan vòng 02

Kế hoạch được **CHẤP NHẬN ĐỂ THỰC THI** sau khi áp dụng toàn bộ chỉnh sửa bắt buộc trong addendum này. File này bổ sung và có mức ưu tiên cao hơn phần kế hoạch do agent đề xuất nếu có mâu thuẫn. Vẫn phải tuân thủ đầy đủ:

```text
prompt-gemini/02-fix-normalization-and-reset-clean-baseline.md
```

## 1. Stable import identity: chấp nhận có sửa đổi

Không được dùng fallback `title|canonicalCompany`, vì alias map hoặc title thay đổi sẽ làm identity đổi lần nữa.

Dataset hiện tại đã được reviewer xác minh:

```text
974 imported rows
974 rows có source_url
974 cặp (source_platform, source_url) duy nhất
```

Yêu cầu:

- Identity chính của JD import hiện tại phải được suy ra chỉ từ normalized `source_platform` và stable `source_url`.
- Chuẩn hóa chính xác trước khi hash: quy định trim/case cho platform và trim URL; không tự ý làm biến đổi URL có thể gộp hai posting khác nhau.
- Công thức JavaScript và công thức upgrade SQL phải byte-for-byte tương đương, có cross-language test trên toàn bộ dataset.
- Nếu dùng SHA-256 trong PostgreSQL qua `pgcrypto`, migration phải `CREATE EXTENSION IF NOT EXISTS pgcrypto`, test trên clean PostgreSQL 16 image và fail rõ nếu extension không khả dụng. Không giả định extension đã tồn tại.
- Có thể chọn unique source-key column/index thay vì hash nếu thiết kế đơn giản và an toàn hơn, nhưng importer/upgrader phải dùng cùng một identity duy nhất.
- Với row tương lai thiếu `source_url`: ưu tiên durable source-provided ID nếu schema có; nếu không có identity bền vững thì fail/skip có thống kê rõ. Không âm thầm fallback sang canonical company.
- Trước khi cập nhật identity trong V29, kiểm tra duplicate source keys. Nếu có collision, migration phải fail với thông báo; không để unique index nổ khó hiểu hoặc gộp dữ liệu âm thầm.
- V29 phải cập nhật identity của 974 JD hiện hữu trước lần import tiếp theo, giữ nguyên ID.

## 2. Single source of truth: chấp nhận có sửa đổi

- `company-alias-map.mjs` là source of truth runtime cho alias, `companySlug()` và `recruiterEmail()`.
- Importer phải tính và validate `canonicalCompany`, `canonicalSlug`, `recruiterEmail`, `importIdentity` trong JavaScript rồi đưa trực tiếp vào staging payload.
- SQL importer không được transliterate, regex lại tên công ty để tạo email, hoặc tự tính alias.
- Không hard-code kỳ vọng `433` trong code/test. Test phải khẳng định:
  - `uniqueCanonicalCount === uniqueSlugCount === uniqueRecruiterEmailCount` cho dataset được truyền vào;
  - email hợp lệ và không vượt 255 ký tự;
  - collision làm process exit khác 0.
- Con số 433 chỉ được dùng như snapshot hậu kiểm của dataset hiện tại.
- Alias map không cần được copy thêm lần thứ ba vào SQL. Upgrade/reconciliation của dữ liệu cũ có thể được thực hiện bởi importer từ staging payload sau khi V29 thêm marker/identity, miễn toàn bộ transaction an toàn và được integration-test.

## 3. `account_source`: chấp nhận có sửa đổi

V29 được phép thêm:

```text
user_account.account_source VARCHAR(20) NOT NULL DEFAULT 'LOCAL'
```

Nhưng bắt buộc:

- Có CHECK constraint với tối thiểu `LOCAL`, `IMPORTED` hoặc dùng thiết kế enum tương đương.
- Cập nhật JPA entity nếu cần để code có thể thao tác/validate rõ ràng; `ddl-auto=validate` phải pass.
- Backfill `IMPORTED` chỉ cho account xác định chắc chắn:
  - account `scraped+...@careerfit.local`; hoặc
  - canonical account hiện đang sở hữu JD có import identity/source metadata; hoặc
  - account được mapping trực tiếp từ imported jobs trong reconciliation.
- Không đánh dấu mọi `recruiter.%@careerfit.local` là imported.
- Nếu desired canonical email đã thuộc một account `LOCAL`, importer phải fail-fast và rollback; tuyệt đối không reset password, đổi role, lấy ownership hoặc đổi settings của account đó.
- Password/policy cleanup chỉ dùng `account_source='IMPORTED'`.
- Imported orphan/alias account chỉ bị deactivate sau khi toàn bộ JD đã chuyển đi; account LOCAL không bị deactivate.

## 4. Upgrade/reconciliation sau V27/V28

Kế hoạch ban đầu chưa nói đủ cách sửa 215 recruiter email sai slug đang tồn tại.

V29 + importer reconciliation bắt buộc phải:

1. Nhận biết imported owner hiện tại của mỗi JD qua marker/source metadata.
2. Tạo hoặc chọn đúng canonical recruiter email do JavaScript payload cung cấp.
3. Chuyển ownership của JD mà giữ nguyên `job.id`.
4. Merge/preserve employer profile hợp lý, không vi phạm unique `recruiter_id`/slug.
5. Deactivate imported alias/orphan sau khi không còn JD.
6. Tắt email và đặt demo password cho canonical imported recruiter.
7. Không để hai active imported recruiters cho một canonical company.

Phải có test regression ít nhất với một tên tiếng Việt có slug từng sai, ví dụ `LG CNS Việt Nam`, ngoài MB Bank và TPBank.

## 5. Automated tests: kế hoạch ban đầu chưa đủ

Double-import không được chỉ là “manual verification”. Phải tạo integration harness có assertions và exit code, chạy trên PostgreSQL disposable/tách biệt với database local thật.

Harness bắt buộc chứng minh:

- upgrade fixture mô phỏng database V27/V28;
- source identity cũ được chuyển mà JD ID giữ nguyên;
- application, matching, bookmark và content report fixtures vẫn trỏ đúng cùng JD ID;
- import lần một và lần hai giữ nguyên count và sorted ID checksum;
- thêm alias mới cho cùng source record vẫn giữ ID;
- MB Bank, TPBank và LG CNS Việt Nam có đúng email/owner;
- một account LOCAL cố tình dùng email collision không bị sửa và transaction fail/rollback;
- toàn bộ imported recruiter có password/policy/status đúng;
- không còn duplicate source identity hoặc multiple active recruiter/company.

Các utility tests 38 case hiện tại có thể giữ và mở rộng, nhưng không thay thế integration harness.

## 6. API smoke test: phải đủ phạm vi và tự động

`scripts/test-api-smoke.mjs` hoặc harness tương đương phải:

- Login thật `recruiter.mb-bank@careerfit.local` / `1`.
- Che JWT trong output/report.
- Assert HTTP status và response shape/ownership cho:
  - `/api/recruiter/dashboard`;
  - `/api/recruiter/jobs`;
  - applicants của một MB Bank job;
  - discovery/ranking/talent endpoint có thật trong codebase;
  - `/api/recruiter/analytics/overview`;
  - `/api/settings/me`.
- Exit khác 0 khi bất kỳ assertion nào fail.
- Không chỉ ghi bảng “login pass” thủ công.

## 7. Reset script: chấp nhận có gate

`scripts/reset-local-demo-data.ps1` chỉ được chạy thật khi tất cả điều kiện sau pass:

```text
normalization unit tests
dry-run validation
disposable PostgreSQL upgrade/idempotency integration test
API smoke test trên baseline tạm hoặc local trước reset phù hợp
backend mvnw.cmd test
target git diff --check
```

Script reset phải:

- Xác minh workspace là `C:\CODING\Thesis` theo resolved path hoặc guard tương đương không phụ thuộc máy một cách cứng nhắc.
- Lấy Compose project/config/volume labels thực tế, hiện project quan sát được là `thesis`.
- Chỉ xóa volume có label đúng project/config và logical volume:
  - `careerfit_postgres_data`;
  - `careerfit_backend_storage`.
- Không xóa `careerfit_monitoring_*`.
- Xử lý an toàn trường hợp backend storage volume chưa tồn tại.
- Dùng PowerShell end-to-end và `-Force`.
- Sau reset: start PostgreSQL, chạy Flyway, import scrape một lần, kiểm tra baseline, import lần hai để chứng minh idempotency, rồi để database ở baseline sạch.
- Nếu API smoke cần tạo event/runtime data, phải chạy trước final manifest hoặc cleanup chính xác để final database không còn test fixture phát sinh.

## 8. Migration immutability

- Không sửa V27/V28 đã apply.
- Thêm V29 hoặc version kế tiếp chưa bị chiếm tại thời điểm thực thi.
- Không chạy `flyway repair`.
- Test cả clean path V1→latest và upgrade path V28→latest.

## 9. Điều kiện được phép bắt đầu thực thi

Agent được phép bắt đầu code ngay sau khi đọc file này. Không cần hỏi lại người dùng nếu triển khai đúng phạm vi trên.

Agent **không được chuyển sang reset local thật** nếu bất kỳ test gate nào chưa pass. Khi bị chặn, tạo report `HOÀN THÀNH MỘT PHẦN` với bằng chứng; không tự hạ tiêu chuẩn.

## 10. Báo cáo

Vẫn tạo đúng file:

```text
prompt-gemini/02-fix-normalization-and-reset-clean-baseline-report.md
```

Báo cáo phải nêu rõ các thay đổi so với kế hoạch ban đầu theo addendum này, đặc biệt:

- công thức identity cuối cùng;
- cách xử lý row thiếu source URL;
- cách xác định `IMPORTED` account;
- cách xử lý LOCAL email collision;
- kết quả disposable integration harness;
- checksum/count/ID trước và sau double import;
- exact volumes đã reset;
- final clean-baseline manifest.

