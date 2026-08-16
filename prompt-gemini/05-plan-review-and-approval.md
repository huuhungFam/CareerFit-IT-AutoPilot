# Review và phê duyệt kế hoạch thực thi Remediation 05

## Kết luận

Kế hoạch được **CHẤP NHẬN CÓ ĐIỀU KIỆN**. Agent được phép thực thi sau khi áp dụng toàn bộ điều chỉnh dưới đây cùng với:

```text
prompt-gemini/05-fix-cross-account-profile-merge-and-final-proof.md
```

Không sửa V27–V30, không dùng `flyway repair`, không commit/push/PR. Không reset thật trước khi toàn bộ pre-reset gates pass.

## 1. Quy tắc merge phải được định nghĩa chính xác

Không chỉ ghi “chọn giá trị đầu tiên theo UUID”. Với mỗi canonical recruiter, áp dụng quy tắc deterministic sau:

1. Chuẩn hóa candidate value: `NULL`, chuỗi blank và placeholder được xem là không có giá trị.
2. Nếu canonical hiện có giá trị real thì giữ canonical.
3. Nếu canonical thiếu/placeholder, chọn real value từ alias có thứ tự:

```text
old_recruiter_id ASC, employer_profile.id ASC
```

4. Placeholder cần nhận diện tối thiểu:

```text
summary bắt đầu bằng "Imported from"
description bắt đầu bằng "This employer profile was generated"
industry = "Technology"
company_size = "UNKNOWN"
location = "Vietnam"
benefits = null hoặc []
```

5. `logo_url`, `cover_url`, `website_url`: giữ canonical non-blank; nếu thiếu chọn alias đầu tiên theo thứ tự trên.
6. `is_featured`: OR canonical và toàn bộ aliases.
7. `benefits`: validate tất cả value là JSON array; union canonical + toàn bộ alias arrays, loại trùng, sắp xếp deterministic. Nếu gặp JSON shape không hợp lệ, fail transaction thay vì xóa dữ liệu.
8. Không dùng `UPDATE ... FROM` khi một target có thể match nhiều source rows. Aggregate thành đúng một source row cho mỗi `canonical_recruiter_id`, hoặc dùng procedure/loop deterministic có test.
9. Chỉ xóa alias profiles sau khi update canonical thành công và hậu điều kiện của merge đạt.

## 2. Bắt buộc test nhiều alias cùng canonical

Fixture phải có ít nhất hai alias accounts khác nhau cùng map về MB Bank. Không dùng hai profiles cùng alias để thay thế test cross-account; giữ test V30 same-account riêng.

Sau importer, assert exact từng field canonical, bao gồm:

```text
company_name
slug
logo_url
cover_url
summary
description
industry
company_size
location
website_url
benefits với exact deterministic order
is_featured
```

Đồng thời assert:

- hai alias profile IDs không còn tồn tại;
- hai alias slugs không còn resolve trong database;
- canonical chỉ có một profile;
- alias user IDs và automation policies vẫn tồn tại;
- alias users inactive, policy toggles false, không còn JD;
- application, matching, bookmark, report và direct-user reference vẫn tồn tại.

Nếu public employer API được chạy trong harness, old alias slug/profile ID phải trả 404 và canonical profile phải trả 200 với dữ liệu merged. Nếu chưa start backend trong integration harness, phải có backend/API test tương đương; không được chỉ suy luận từ comment.

## 3. Partial-dataset test phải chạy đúng thời điểm

Partial test phải chạy **trước full import**, trên alias có ít nhất hai JD thật thuộc dataset:

1. Alias account sở hữu JD A và JD B.
2. Temp partial dataset chỉ chứa source identity của JD A.
3. Chạy importer partial.
4. Assert JD A chuyển canonical nhưng JD B vẫn thuộc alias.
5. Assert alias vẫn active, profile vẫn tồn tại và chưa bị merge/delete.
6. Sau đó chạy full dataset.
7. Assert JD B cũng chuyển; lúc này alias mới trở thành orphan, profile được merge/delete và account inactive.

Partial/full temp datasets phải dùng `os.tmpdir()` kết hợp `fs.mkdtempSync()`. Xóa cả file và temp directory trong outer `finally`, kể cả Flyway/import/assertion fail.

## 4. Khôi phục toàn bộ regression assertions

Không được thay test cũ bằng test merge mới. Sau full import bắt buộc kiểm tra lại:

- 993 total / 974 imported jobs;
- pass-1/pass-2/pass-alias-expansion full sorted ID checksum bằng nhau;
- source identity duplicates = 0;
- external hash duplicates = 0;
- company/owner mismatch = 0;
- active imported recruiter có profile count khác 1 = 0;
- imported password/role/active/verified/language/policy violations = 0;
- MB Bank, TPBank, LG CNS canonical ownership đúng;
- LOCAL collision fail đúng error và rollback toàn transaction.

## 5. API smoke validation

Luôn query database để validate `NON_OWNED_JOB_ID`, kể cả ID truyền từ env/argument:

```text
count(job.id) = 1
owner email tồn tại
owner email != recruiter.mb-bank@careerfit.local
```

Kiểm tra `spawnSync.error`, `status`, `signal`, stdout và stderr. Nếu ID truyền vào khác ID query được thì vẫn được phép, miễn chính ID đó được query và xác minh. Ownership endpoint bắt buộc exact `403`.

Không log JWT đầy đủ hoặc DB secret.

## 6. Resolve volume bằng Compose config thật

Dùng:

```powershell
docker compose --profile backend config --format json
```

Parse chính xác:

```text
volumes.careerfit_postgres_data.name
volumes.careerfit_backend_storage.name
```

Không còn dòng tự ghép `${composeProject}_${logicalVolume}` làm nguồn quyết định target.

Trước xóa:

- exact physical name từ config;
- project label khớp;
- logical volume label khớp;
- ghi Name, CreatedAt và labels.

Sau recreate:

- verify cả hai volume tồn tại;
- physical name và labels khớp config;
- nếu có old timestamp thì parse datetime và assert new `CreatedAt > old CreatedAt`;
- nếu volume cũ không tồn tại thì ghi rõ `old state = absent`, không bịa timestamp;
- storage file count = 0.

Không dùng name-substring filter để quyết định xóa. Chỉ inspect/remove exact physical name đã resolve và label-verified.

## 7. Final manifest phải fail khi sai

Tạo helper PowerShell cho external command/query để kiểm tra exit code ngay tại từng lần gọi. Không chạy hai query liên tiếp rồi chỉ dựa vào `$LASTEXITCODE` cuối.

Final assertions tối thiểu:

```text
Flyway latest = 30 và success=true
total jobs = 993
imported jobs = 974
active imported recruiters = 433
canonical imported companies = 433
duplicate source identity = 0
duplicate external_hash = 0
company/owner mismatch = 0
active imported profile violations = 0
imported password/status/role/language/policy violations = 0
active orphan imported aliases = 0
pass-1 count/checksum = pass-2 count/checksum
CV/application/matching/bookmark/report counts đúng seed baseline được migration tạo
storage files = 0
backend healthy
full API smoke = pass
```

Không hard-code bookmark/report phải lớn hơn 0: clean seed hiện có thể bằng 0. Ghi exact expected baseline theo migrations và assert không có runtime junk.

## 8. Trạng thái hệ thống sau reset

Hủy dòng kế hoạch:

```text
Dừng toàn bộ hệ thống sau khi reset thật hoàn tất.
```

Sau reset thành công phải để:

- PostgreSQL running/healthy;
- backend running/healthy;
- baseline sẵn dùng để demo;
- báo cáo ghi rõ services đang chạy.

Chỉ dừng hệ thống nếu người dùng yêu cầu riêng. Testcontainers/disposable databases phải cleanup như bình thường.

## 9. Report cuối

Report 05 phải supersede report 04 và chứa output thật, không chỉ mô tả. Đặc biệt phải có:

- reproduction lỗi cũ và exact canonical merged values sau fix;
- multiple-alias + partial-dataset evidence;
- full checksums;
- exact old/new volume evidence của cả hai volumes;
- final SQL assertion manifest;
- đủ 10 recruiter accounts, password hiển thị `1`;
- commands/exit codes;
- target files/diff check;
- remaining risks trung thực.

## Lệnh giao agent

```text
Thực thi kế hoạch Remediation 05 theo prompt-gemini/05-fix-cross-account-profile-merge-and-final-proof.md và toàn bộ điều kiện bắt buộc trong prompt-gemini/05-plan-review-and-approval.md. Không sửa V27–V30, không dùng flyway repair. Chỉ reset thật sau khi mọi pre-reset gate pass. Sau reset giữ PostgreSQL và backend running/healthy. Tạo prompt-gemini/05-fix-cross-account-profile-merge-and-final-proof-report.md với bằng chứng thực tế. Không commit, push hoặc tạo PR.
```
