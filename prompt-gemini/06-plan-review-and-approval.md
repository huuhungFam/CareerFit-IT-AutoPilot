# Phê duyệt kế hoạch thực thi Remediation 06

## Kết luận

Kế hoạch được **CHẤP NHẬN CÓ ĐIỀU KIỆN**. Agent được phép thực thi ngay sau khi áp dụng toàn bộ điều chỉnh trong file này cùng với:

```text
prompt-gemini/06-close-round-05-acceptance-gaps.md
```

Không sửa V27–V30, không dùng Flyway repair, không commit/push/PR. Chỉ chạy reset thật sau khi toàn bộ pre-reset gates pass.

## 1. Sửa Verification Plan của API smoke

Không dùng invalid UUID để thay cho ownership guard `403`.

Bắt buộc có ba trường hợp riêng:

1. Một `job_id` có thật và thuộc recruiter khác MB Bank:
   - DB validation trả đúng một row;
   - owner email nonblank và khác `recruiter.mb-bank@careerfit.local`;
   - endpoint applicants trả exact `403`.
2. Một UUID đúng cú pháp nhưng không tồn tại:
   - chạy `test-api-smoke.mjs` với ID này;
   - script phải exit non-zero ngay ở DB validation, trước ownership HTTP call.
3. Một chuỗi không phải UUID:
   - script phải reject trước khi gọi `psql`;
   - exit non-zero và không lộ token/secret.

Do đó thay dòng kế hoạch:

```text
node scripts/test-api-smoke.mjs http://localhost:8080 <invalid-uuid>
```

bằng các gate có expected exit code rõ ràng:

```text
node scripts/test-api-smoke.mjs http://localhost:8080 <real-cross-owner-job-id>  # exit 0, HTTP 403
node scripts/test-api-smoke.mjs http://localhost:8080 <well-formed-absent-uuid>   # expected non-zero
node scripts/test-api-smoke.mjs http://localhost:8080 not-a-uuid                 # expected non-zero before psql
```

Harness gọi negative cases phải tự assert exit code khác 0; không được coi expected failure là gate thất bại.

## 2. Hậu điều kiện merge không chỉ là profile count

Kiểm tra mỗi canonical có đúng một profile là cần thiết nhưng chưa đủ để ngăn trường hợp update chạy 0 row hoặc bỏ mất field rồi vẫn xóa alias.

Importer phải tạo một aggregate source deterministic, đúng một row cho mỗi `canonical_recruiter_id`, chứa các expected merged values. Trình tự bắt buộc:

1. Validate benefits của đúng các canonical/alias profiles tham gia merge là JSON array.
2. Materialize expected aggregate deterministic.
3. Update canonical profile từ aggregate.
4. Trước delete, verify cho từng target:
   - canonical profile count = 1;
   - mọi field đã update bằng expected aggregate theo rule canonical-real-wins;
   - benefits bằng exact deterministic union;
   - `is_featured` bằng OR result.
5. Nếu thiếu target hoặc bất kỳ field khác expected thì raise exception để rollback.
6. Chỉ sau đó mới delete alias profiles và deactivate orphan alias users.

Không chỉ kiểm tra `COUNT(profile)=1` rồi xóa.

## 3. Fixture integration phải thực sự test simultaneous merge

Sau partial import:

- Alias A vẫn phải còn ít nhất một JD để chưa orphan.
- Alias B còn JD B2 nên vẫn active/profile còn nguyên.
- Canonical chưa được nhận field chỉ có ở A hoặc B.

Full import phải chứa JD còn lại của A và B2, khiến A và B cùng xuất hiện trong `temp_orphan_aliases` và cùng merge vào MB Bank trong một transaction. Test phải assert hoặc log số source aliases của MB Bank aggregate là `2`; không được suy luận chỉ từ trạng thái cuối.

Thêm fixtures/assertions còn thiếu:

- canonical có real value ở ít nhất một field để chứng minh canonical-real-wins;
- whitespace-only ở ít nhất một canonical/alias candidate;
- hai aliases cùng có real candidate cho ít nhất một field để chứng minh UUID ordering;
- canonical benefits + Alias A benefits + Alias B benefits có overlap, rồi deep-equal exact sorted union;
- exact company name và slug;
- exact alias profile IDs/slugs không còn;
- cả hai alias user IDs và policy IDs còn tồn tại, users inactive, sáu toggles false;
- một direct FK reference tới alias user còn nguyên;
- application, matching, bookmark và report giữ nguyên ID/link.

## 4. Invalid benefits rollback phải độc lập và đo đủ state

Vì cột là `jsonb`, “invalid JSON” phải được hiểu là JSON shape không phải array, ví dụ object/string/number. Không dùng literal JSON không parse được vì fixture sẽ fail trước importer.

Chạy invalid-shape scenario trong một phase riêng trước successful full import. Chụp trước/sau tối thiểu:

```text
sorted job-ID checksum
job ownership
canonical profile JSON
alias profile count/JSON
alias account active state
policy/reference counts
```

Importer phải exit non-zero và tất cả state trên phải giống hệt trước khi chạy. Sau đó sửa/xóa invalid fixture có kiểm soát để tiếp tục successful path.

## 5. Regression assertions phải exact

Không gom nhiều invariant vào một query khó chẩn đoán. Report từng count riêng:

- duplicate `(source_platform, source_url)`;
- duplicate `external_hash`;
- company/owner mismatch;
- active imported profile count khác 1;
- password, role, active canonical ownership, verified, language violations;
- missing automation policy;
- từng nhóm sáu toggles true;
- active orphan imported aliases.

MB Bank, TPBank và LG CNS phải assert cả `job.company`, owner email và profile company/slug, không chỉ account tồn tại.

## 6. Reset script và checksum

Dùng helper native command fail-fast ngay từ bước Compose config/inspect, không chỉ trong final manifest.

Pass-1 và pass-2 count/checksum phải được lấy bằng bốn calls riêng có exit checks ngay lúc chạy. Final manifest phải assert lại các giá trị đã capture:

```text
pass1 count = 993
pass2 count = 993
pass1 checksum nonblank
pass2 checksum nonblank
pass1 checksum = pass2 checksum
current final checksum = pass2 checksum
```

Không thể tái-query lịch sử pass-1 sau khi pass-2; vì vậy phải giữ evidence của pass-1 từ call fail-fast ban đầu rồi so với final current checksum.

Volume existence/removal chỉ dùng exact `docker volume inspect <physical-name>`. Kiểm tra returned `.Name` exact; không dùng `docker volume ls --filter name=...` ở bất kỳ decision gate nào.

## 7. Báo cáo bắt buộc

Tạo:

```text
prompt-gemini/06-close-round-05-acceptance-gaps-report.md
```

Report phải chứa output thật theo report contract trong prompt 06, bao gồm cả ba API ID scenarios, simultaneous alias count `2`, invalid-benefits rollback manifest, exact merged JSON, full checksums, old/new volume metadata, final SQL manifest, top 10 recruiter login và services cuối cùng running/healthy.

## Lệnh thực thi đã duyệt

```text
Thực thi kế hoạch Remediation 06 theo prompt-gemini/06-close-round-05-acceptance-gaps.md và toàn bộ điều kiện bắt buộc trong prompt-gemini/06-plan-review-and-approval.md. Sửa code/test trước; chạy đủ positive và expected-negative pre-reset gates; chỉ khi tất cả đạt mới chạy reset-local-demo-data.ps1 -Force đúng một lần. Sau reset giữ PostgreSQL và backend running/healthy. Tạo prompt-gemini/06-close-round-05-acceptance-gaps-report.md với bằng chứng thật. Không sửa V27–V30, không dùng flyway repair, không commit/push/PR.
```
