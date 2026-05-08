# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

# CareerFit IT AutoPilot

## 1. Giới Thiệu

### 1.1. Mục Đích Tài Liệu

Tài liệu SRS này mô tả chi tiết yêu cầu phần mềm cho hệ thống `CareerFit IT AutoPilot`.
Tài liệu được dùng làm cơ sở để:

- phân tích nghiệp vụ,
- thiết kế frontend,
- thiết kế backend,
- xây dựng database,
- triển khai thuật toán matching/recommendation,
- kiểm thử hệ thống,
- và làm tài liệu tham chiếu cho coding agent khi implement project.

### 1.2. Phạm Vi Sản Phẩm

`CareerFit IT AutoPilot` là một nền tảng tìm kiếm việc làm và tự động hóa tuyển dụng cho ngành công nghệ thông tin.

Hệ thống kết hợp 5 lớp chính:

- Job Portal: cho phép candidate tìm kiếm, xem chi tiết và ứng tuyển công việc.
- Matching Engine: đánh giá mức độ phù hợp giữa CV và Job Description.
- Recommendation Engine: gợi ý Job phù hợp cho candidate dựa trên CV và hồ sơ mong muốn.
- AutoFit Automation Layer: tự động hóa các hành động như notify, auto-apply, invite hoặc đưa vào hàng đợi duyệt.
- Human-in-the-Loop Email Channel: cho phép người dùng xác nhận, từ chối, phản hồi hoặc duyệt hành động qua email/magic-link.

### 1.3. Tên Đề Tài

Tiếng Việt:
`Nền tảng tự động hóa đánh giá và gợi ý mức độ phù hợp giữa CV và Job Description cho ngành công nghệ thông tin với Human-in-the-Loop.`

Tiếng Anh:
`Design and Implementation of a Human-in-the-Loop CV Evaluation and Job Recommendation Automation Platform for IT.`

Tên sản phẩm:
`CareerFit IT AutoPilot`

### 1.4. Định Nghĩa Thuật Ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| Candidate | Ứng viên tìm kiếm việc làm. |
| Recruiter | Nhà tuyển dụng đăng Job Description và xem danh sách ứng viên phù hợp. |
| Admin | Người quản trị hệ thống, có quyền xem toàn cục và cấu hình hệ thống. |
| CV | Hồ sơ ứng viên, có thể tải lên bằng PDF text-based hoặc nhập qua form. |
| JD | Job Description, mô tả công việc do recruiter tạo. |
| Matching Score | Điểm thể hiện mức độ phù hợp giữa CV và JD. |
| Recommendation Score | Điểm thể hiện mức độ phù hợp giữa hồ sơ mong muốn của candidate và JD. |
| TF-IDF | Phương pháp vector hóa văn bản dựa trên tần suất và độ đặc trưng của từ. |
| Cosine Similarity | Phương pháp đo độ tương đồng giữa hai vector. |
| Rocchio | Thuật toán relevance feedback dùng để cập nhật vector dựa trên phản hồi Good/Bad/Potential. |
| HITL | Human-in-the-Loop, cơ chế con người tham gia giám sát hoặc xác nhận hành động quan trọng. |
| AutoFit | Lớp policy automation quyết định khi nào notify, auto-apply, invite hoặc chờ duyệt. |
| Magic-link | Link có token bảo mật, hết hạn và dùng một lần, dùng cho login hoặc xác nhận hành động. |
| Actionable Email | Email có nút thao tác như Apply, Skip, Invite, Reject, Good Match. |
| Audit Log | Nhật ký bất biến ghi lại toàn bộ hành động quan trọng của người dùng và hệ thống. |

### 1.5. Tài Liệu Tham Chiếu

- `proposal.md`
- `architecture.md`
- `Backend/backend-implementation-guide.md`
- `Frontend/frontend-implementation-guide.md`
- `Frontend/main-design.md`

---

## 2. Mô Tả Tổng Quan

### 2.1. Bối Cảnh Sản Phẩm

Các nền tảng tuyển dụng thông thường thường yêu cầu candidate tự tìm job và recruiter tự lọc CV thủ công.
Điều này làm mất thời gian ở cả hai phía:

- candidate phải đọc nhiều JD để biết job nào phù hợp,
- recruiter phải đọc nhiều CV để chọn ứng viên,
- phản hồi từ người dùng không được dùng để cải thiện ranking,
- hệ thống thường không tự động hành động khi phát hiện match tốt.

`CareerFit IT AutoPilot` giải quyết vấn đề này bằng cách kết hợp job portal thông thường với hệ thống matching, recommendation và automation có giám sát.

### 2.2. Định Vị Hệ Thống

Hệ thống không chỉ là một web tìm việc.
Hệ thống cũng không chỉ là một công cụ chấm điểm CV-JD.

Định vị đúng là:

`Job Portal + CV-JD Matching + Job Recommendation + AutoFit Automation + Human-in-the-Loop Email Actions`

### 2.3. Mô Hình Trải Nghiệm

Đối với candidate:

- web giống một nền tảng tìm việc thông thường,
- candidate có thể tìm job, xem job, upload CV, apply job,
- hệ thống tự gợi ý job phù hợp,
- candidate có thể bật auto-apply theo ngưỡng,
- candidate có thể xác nhận hành động qua email.

Đối với recruiter:

- web giống dashboard vận hành tuyển dụng,
- recruiter tạo JD, xem ranking CV, xem candidate tiềm năng,
- recruiter có thể mời ứng viên hoặc phản hồi match,
- hệ thống gửi email digest hoặc actionable email để duyệt nhanh.

Đối với admin:

- web là control panel quản trị,
- admin xem audit log, quản lý người dùng, cấu hình hệ thống.

### 2.4. Giới Hạn Hệ Thống

Hệ thống làm:

- upload và parse PDF text-based,
- nhập CV qua form,
- tạo và quản lý JD,
- tìm kiếm và lọc job,
- matching CV-JD,
- recommendation candidate-to-job,
- feedback learning bằng Rocchio,
- email action bằng magic-link,
- auto-apply nội bộ theo policy,
- invite candidate nội bộ,
- audit log.

Hệ thống không làm trong phạm vi core:

- OCR PDF scan,
- ATS full-flow,
- phỏng vấn trực tuyến,
- thanh toán,
- tự apply sang website bên thứ ba,
- microservices phức tạp,
- LLM agent tự lập kế hoạch đa bước.

---

## 3. Actor Và Stakeholder

### 3.1. Candidate

Candidate là người tìm việc trong lĩnh vực IT.

Mục tiêu:

- tạo hồ sơ,
- upload CV,
- tìm job,
- nhận job recommendation,
- apply job,
- bật/tắt auto-apply,
- phản hồi job phù hợp hoặc không phù hợp.

### 3.2. Recruiter

Recruiter là người đại diện công ty đăng tuyển.

Mục tiêu:

- tạo và quản lý JD,
- xem CV đã apply,
- xem CV matching cao dù chưa apply,
- mời candidate tiềm năng,
- phản hồi Good/Bad/Potential để hệ thống học,
- nhận digest qua email.

### 3.3. Admin

Admin là người quản trị hệ thống.

Mục tiêu:

- quản lý user,
- xem audit log,
- giám sát queue/email/token,
- cấu hình hệ thống,
- xử lý lỗi vận hành.

### 3.4. Email Recipient

Email Recipient là candidate hoặc recruiter nhận actionable email.

Mục tiêu:

- xác nhận hành động nhanh,
- từ chối hành động,
- phản hồi match,
- truy cập magic-link.

### 3.5. Background Worker

Background Worker là actor hệ thống.

Trách nhiệm:

- parse CV,
- scoring,
- recompute ranking,
- gửi email,
- tạo digest,
- cleanup token,
- ghi audit log.

### 3.6. External Mail Provider

External Mail Provider là dịch vụ gửi email như SMTP, JavaMailSender hoặc SendGrid.

Trách nhiệm:

- nhận email từ backend,
- gửi email đến người dùng,
- trả lỗi nếu gửi thất bại.

---

## 4. Use Case Tổng Quan

### 4.1. Candidate Use Cases

| Mã | Use Case | Mô tả |
|---|---|---|
| UC-C01 | Đăng ký/đăng nhập | Candidate đăng ký hoặc đăng nhập bằng password/passwordless. |
| UC-C02 | Upload CV PDF | Candidate tải lên CV PDF text-based. |
| UC-C03 | Nhập CV bằng form | Candidate nhập hồ sơ khi không có file PDF. |
| UC-C04 | Cập nhật hồ sơ mong muốn | Candidate khai báo title, skill, location, seniority, language. |
| UC-C05 | Xem job feed | Candidate xem danh sách job như web tìm việc thông thường. |
| UC-C06 | Tìm kiếm và lọc job | Candidate tìm job theo keyword, skill, location, seniority. |
| UC-C07 | Xem job recommendation | Candidate xem job được gợi ý theo profile vector. |
| UC-C08 | Apply job thủ công | Candidate bấm apply job trên web. |
| UC-C09 | Bật auto-apply | Candidate bật auto-apply theo threshold. |
| UC-C10 | Xác nhận apply qua email | Candidate bấm Apply/Skip/Show Similar từ email. |
| UC-C11 | Xem lịch sử ứng tuyển | Candidate xem job đã apply, auto-applied, skipped. |
| UC-C12 | Phản hồi job recommendation | Candidate feedback Good/Potential/Bad/Not Interested. |

### 4.2. Recruiter Use Cases

| Mã | Use Case | Mô tả |
|---|---|---|
| UC-R01 | Đăng ký/đăng nhập | Recruiter đăng nhập hệ thống. |
| UC-R02 | Tạo JD | Recruiter tạo Job Description. |
| UC-R03 | Cập nhật JD | Recruiter chỉnh sửa JD và trigger recompute. |
| UC-R04 | Xem ranking CV theo JD | Recruiter xem CV phù hợp với từng JD. |
| UC-R05 | Xem CV đã apply | Recruiter xem danh sách candidate đã ứng tuyển. |
| UC-R06 | Xem candidate tiềm năng | Recruiter xem candidate chưa apply nhưng matching cao hoặc Potential. |
| UC-R07 | Mời candidate | Recruiter gửi invite candidate. |
| UC-R08 | Feedback match | Recruiter đánh dấu Good/Bad/Potential để hệ thống học. |
| UC-R09 | Cấu hình AutoFit | Recruiter bật/tắt email digest, auto-invite, threshold. |
| UC-R10 | Duyệt qua email | Recruiter bấm Invite/Reject/Mark Potential từ email. |
| UC-R11 | Xem analytics | Recruiter xem xu hướng job, apply count, match count. |

### 4.3. Admin Use Cases

| Mã | Use Case | Mô tả |
|---|---|---|
| UC-A01 | Quản lý user | Admin xem, khóa, mở khóa user. |
| UC-A02 | Xem audit log | Admin xem log hành động hệ thống. |
| UC-A03 | Giám sát token | Admin xem token expired/used/revoked ở mức vận hành. |
| UC-A04 | Giám sát email queue | Admin xem email sent/failed/retry. |
| UC-A05 | Cấu hình global policy | Admin cấu hình giới hạn chung của hệ thống. |

### 4.4. System Use Cases

| Mã | Use Case | Mô tả |
|---|---|---|
| UC-S01 | Parse CV async | Hệ thống parse CV trong background. |
| UC-S02 | Validate CV/JD | Hệ thống kiểm tra dữ liệu đầu vào. |
| UC-S03 | Vector hóa text | Hệ thống tạo vector TF-IDF. |
| UC-S04 | Tính matching score | Hệ thống tính cosine similarity giữa CV và JD. |
| UC-S05 | Gắn nhãn match | Hệ thống gắn Low/Medium/High/Potential. |
| UC-S06 | Tính recommendation | Hệ thống gợi ý job theo candidate profile. |
| UC-S07 | Học từ feedback | Hệ thống cập nhật vector bằng Rocchio. |
| UC-S08 | Đánh giá policy AutoFit | Hệ thống quyết định auto action/email/queue. |
| UC-S09 | Gửi actionable email | Hệ thống gửi email có CTA. |
| UC-S10 | Ghi audit log | Hệ thống ghi log mọi hành động quan trọng. |

---

## 5. Yêu Cầu Chức Năng

### 5.1. Authentication Và Authorization

#### FR-AUTH-01: Đăng ký tài khoản

Hệ thống phải cho phép người dùng đăng ký tài khoản với vai trò candidate hoặc recruiter.

Thông tin tối thiểu:

- email,
- name,
- role,
- password hoặc passwordless preference.

#### FR-AUTH-02: Đăng nhập bằng password

Hệ thống phải cho phép người dùng đăng nhập bằng email và password.

#### FR-AUTH-03: Đăng nhập passwordless

Hệ thống phải cho phép người dùng yêu cầu magic-link đăng nhập qua email.

Magic-link phải:

- có token ngẫu nhiên đủ mạnh,
- có thời hạn,
- dùng một lần,
- có purpose `PASSWORDLESS_LOGIN`,
- được ghi audit log khi verify.

#### FR-AUTH-04: Phân quyền theo role

Hệ thống phải phân quyền tối thiểu theo role:

- candidate chỉ xem và thao tác dữ liệu của mình,
- recruiter chỉ xem JD và candidate liên quan đến JD của mình,
- admin có quyền vận hành toàn hệ thống.

### 5.2. Candidate Profile Và CV

#### FR-CV-01: Upload CV PDF

Candidate phải có thể upload CV dạng PDF.

Hệ thống chỉ chấp nhận PDF text-based trong core flow.

#### FR-CV-02: Nhập CV bằng form

Candidate phải có thể nhập CV bằng form nếu không có file PDF.

Các trường chính:

- name,
- email,
- phone,
- skills,
- work experience,
- education,
- desired title,
- desired location,
- preferred language.

#### FR-CV-03: Validate CV

Hệ thống phải validate CV trước khi scoring.

Hard validation:

- file không phải PDF,
- file rỗng,
- PDF không extract được text,
- thiếu trường bắt buộc trong form.

Soft validation:

- CV quá ngắn,
- thiếu skill,
- thiếu kinh nghiệm,
- ngày tháng bất thường,
- ngôn ngữ không rõ.

#### FR-CV-04: Trích xuất text CV

Hệ thống phải dùng Apache PDFBox để trích xuất text từ PDF.

#### FR-CV-05: Theo dõi trạng thái xử lý CV

Hệ thống phải hiển thị trạng thái:

- `UPLOADED`,
- `VALIDATING`,
- `PROCESSING`,
- `SCORING_DONE`,
- `FAILED`.

### 5.3. Job Portal

#### FR-JOB-01: Hiển thị job feed

Candidate phải xem được danh sách job như một web tìm việc thông thường.

Thông tin hiển thị:

- title,
- company,
- location,
- seniority,
- skills,
- language,
- salary nếu có,
- normalized recommendation score nếu user đã có profile.

#### FR-JOB-02: Tìm kiếm job

Candidate phải tìm job theo keyword.

Keyword có thể match:

- title,
- skill,
- company,
- JD text.

#### FR-JOB-03: Lọc job

Candidate phải lọc job theo:

- location,
- seniority,
- skill,
- language,
- score range,
- label.

#### FR-JOB-04: Xem chi tiết job

Candidate phải xem được trang chi tiết job.

Trang chi tiết phải có:

- JD đầy đủ,
- required skills,
- nice-to-have skills,
- score nếu có,
- lý do match,
- nút apply,
- nút save/skip/show similar nếu có.

### 5.4. Recruiter Job Management

#### FR-JD-01: Tạo JD

Recruiter phải tạo được JD.

Trường chính:

- title,
- company,
- description,
- required skills,
- optional skills,
- seniority,
- location,
- language,
- salary range nếu có.

#### FR-JD-02: Validate JD

Hệ thống phải validate JD.

Hard validation:

- thiếu title,
- thiếu description,
- thiếu required skills,
- description quá ngắn để scoring.

Soft validation:

- JD quá chung chung,
- skill không khớp seniority,
- language mismatch,
- thiếu location hoặc salary.

#### FR-JD-03: Cập nhật JD và recompute

Khi JD thay đổi, hệ thống phải đánh dấu các matching liên quan cần recompute.

#### FR-JD-04: Xóa hoặc đóng JD

Recruiter phải có thể đóng JD.

JD đã đóng không nên xuất hiện trong recommendation active.

### 5.5. Matching Engine

#### FR-MAT-01: Vector hóa CV và JD

Hệ thống phải chuẩn hóa text và vector hóa bằng TF-IDF.

Pipeline:

- normalize text,
- remove stop words,
- tokenize,
- build term frequency,
- apply IDF từ static corpus,
- tạo vector.

#### FR-MAT-02: Tính cosine similarity

Hệ thống phải tính raw score bằng cosine similarity giữa CV vector và JD vector.

#### FR-MAT-03: Chuẩn hóa score

Hệ thống phải chuẩn hóa score sang thang 0-100%.

Quy tắc đề xuất:

```text
normalizedScore = round(rawScore * 100, 2)
```

#### FR-MAT-04: Gắn nhãn matching

Hệ thống phải gắn nhãn:

- `LOW`,
- `MEDIUM`,
- `HIGH`,
- `POTENTIAL`.

Ngưỡng đề xuất:

- 0-39.99: `LOW`,
- 40-69.99: `MEDIUM`,
- 70-89.99: `HIGH`,
- từ 90 trở lên: `HIGH`, có thể kết hợp flag auto-action.

`POTENTIAL` dùng cho trường hợp score không cao nhưng có tín hiệu chuyển đổi kỹ năng tốt.

#### FR-MAT-05: Hiển thị lý do match

Hệ thống phải trả về lý do match.

Ví dụ:

- shared skills,
- matched title keywords,
- same seniority,
- same language,
- transferable skill family.

### 5.6. Recommendation Engine

#### FR-REC-01: Tạo candidate profile vector

Hệ thống phải tạo profile vector từ:

- CV,
- desired title,
- desired skills,
- preferred location,
- seniority,
- language.

#### FR-REC-02: Gợi ý job

Hệ thống phải trả về top job phù hợp cho candidate.

Kết quả phải gồm:

- job info,
- recommendation score,
- label,
- reason chips,
- apply/skip/show similar actions.

#### FR-REC-03: Hai luồng riêng biệt

Hệ thống phải phân biệt:

- matching khi candidate upload CV,
- recommendation khi candidate xem job feed/homepage.

Cả hai luồng dùng chung NLP pipeline nhưng khác query vector đầu vào.

### 5.7. Feedback Learning

#### FR-FB-01: Ghi nhận feedback

Hệ thống phải cho phép feedback:

- `GOOD_MATCH`,
- `POTENTIAL`,
- `BAD_MATCH`,
- `NOT_INTERESTED`.

#### FR-FB-02: Feedback qua web

Recruiter và candidate phải có thể feedback từ web.

#### FR-FB-03: Feedback qua email

Người dùng phải có thể feedback từ actionable email.

#### FR-FB-04: Rocchio update

Hệ thống phải cập nhật vector bằng Rocchio.

Công thức:

```text
Qm = alpha * Q0 + beta / |Dr| * sum(Dr) - gamma / |Dnr| * sum(Dnr)
```

Quy tắc:

- `GOOD_MATCH` cộng trọng số dương mạnh,
- `POTENTIAL` cộng trọng số dương nhẹ,
- `BAD_MATCH` cộng trọng số âm,
- `NOT_INTERESTED` không nhất thiết là Bad Match, có thể dùng làm preference signal.

#### FR-FB-05: Recompute sau feedback

Sau feedback, hệ thống phải recompute các ranking hoặc recommendation bị ảnh hưởng.

### 5.8. AutoFit Automation

#### FR-AUTO-01: Cấu hình automation policy

Candidate và recruiter phải cấu hình được policy.

Candidate policy:

- auto-apply enabled,
- auto-apply threshold,
- email recommendation enabled,
- daily digest enabled,
- max auto-apply per day.

Recruiter policy:

- email high-match alert enabled,
- daily digest enabled,
- auto-invite enabled nếu được cho phép,
- high-match threshold,
- potential threshold.

#### FR-AUTO-02: Đánh giá policy

Hệ thống phải đánh giá policy sau khi có matching/recommendation mới.

Kết quả policy có thể là:

- do nothing,
- notify only,
- send actionable email,
- create pending approval,
- auto execute.

#### FR-AUTO-03: Auto-apply nội bộ

Nếu candidate bật auto-apply và score vượt threshold, hệ thống phải tạo `Application` nội bộ.

Auto-apply phải:

- không tạo trùng application,
- ghi audit log,
- thông báo cho candidate,
- hiển thị trong recruiter dashboard.

#### FR-AUTO-04: Invite candidate

Recruiter phải có thể invite candidate matching cao hoặc Potential.

Invite có thể thực hiện từ:

- web,
- email action.

### 5.9. Email Và Magic-Link

#### FR-EMAIL-01: Gửi actionable email

Hệ thống phải gửi email hành động cho các tình huống:

- candidate có job match cao,
- recruiter có CV match cao,
- recruiter có candidate Potential,
- daily digest,
- validation warning,
- passwordless login,
- feedback request.

#### FR-EMAIL-02: CTA trong email

Email phải có tối đa 2 CTA chính và 1 CTA phụ.

Ví dụ candidate:

- `Apply`,
- `Skip`,
- `Show Similar`.

Ví dụ recruiter:

- `Invite`,
- `Reject`,
- `Mark Potential`.

#### FR-EMAIL-03: Token cho email action

Mỗi CTA phải dùng token có:

- purpose,
- target type,
- target id,
- user id,
- expires at,
- used at,
- revoked at.

#### FR-EMAIL-04: Confirm page

GET magic-link không được thực thi hành động nhạy cảm ngay.

GET chỉ hiển thị trang confirm.

POST mới thực thi action.

#### FR-EMAIL-05: Chống link scanner

Hệ thống phải tránh việc email client mở link làm thay đổi state.

### 5.10. Audit Log

#### FR-AUD-01: Ghi audit log

Hệ thống phải ghi audit log cho:

- login,
- passwordless verify,
- CV upload,
- JD create/update,
- matching completed,
- feedback,
- auto-apply,
- invite,
- email action,
- token expired/used/revoked,
- policy update.

#### FR-AUD-02: Nội dung audit log

Audit log phải gồm:

- actor type,
- actor id,
- action type,
- target type,
- target id,
- source channel,
- result,
- metadata,
- created at.

#### FR-AUD-03: Audit log append-only

Audit log không được sửa hoặc xóa trong luồng nghiệp vụ bình thường.

### 5.11. Analytics

#### FR-ANA-01: Job trend

Hệ thống phải hiển thị xu hướng job theo thời gian hoặc nhóm kỹ năng.

#### FR-ANA-02: Recruiter summary

Recruiter dashboard phải có:

- số job active,
- số CV applied,
- số matching high,
- số candidate Potential,
- số pending approvals.

#### FR-ANA-03: Candidate summary

Candidate dashboard phải có:

- số job recommended,
- số application,
- số auto-applied,
- trạng thái CV mới nhất.

---

## 6. Yêu Cầu Giao Diện

### 6.1. Nguyên Tắc UX

Frontend phải vừa giống job portal thông thường vừa hỗ trợ automation.

Candidate-facing UI:

- ưu tiên job browsing,
- tìm kiếm job,
- recommendation,
- apply,
- profile,
- automation settings nhẹ.

Recruiter-facing UI:

- ưu tiên dashboard,
- ranking,
- candidate review,
- approval queue,
- audit,
- policy.

### 6.2. Public Pages

Các trang public:

- login,
- register,
- passwordless request,
- passwordless verify,
- automation confirm,
- automation result.

### 6.3. Candidate Pages

Các trang candidate:

- candidate home,
- job feed,
- job detail,
- CV upload,
- manual CV form,
- profile/preferences,
- recommendations,
- applications,
- AutoFit settings,
- notifications.

### 6.4. Recruiter Pages

Các trang recruiter:

- recruiter dashboard,
- job management,
- job detail,
- ranking,
- applicants,
- potential pool,
- automation settings,
- analytics,
- audit summary.

### 6.5. Admin Pages

Các trang admin:

- user management,
- audit logs,
- email queue monitor,
- token monitor,
- system settings.

### 6.6. Bilingual UI

Hệ thống phải hỗ trợ:

- tiếng Việt,
- tiếng Anh.

Toàn bộ UI copy phải đi qua translation key.

---

## 7. Yêu Cầu Dữ Liệu

### 7.1. Entity Chính

Các entity tối thiểu:

- `UserAccount`,
- `Candidate`,
- `CandidatePreference`,
- `CV`,
- `Job`,
- `Matching`,
- `Application`,
- `Feedback`,
- `AutomationPolicy`,
- `EmailAction`,
- `EmailToken`,
- `AuditLog`,
- `NotificationJob`,
- `JobTrendSnapshot`.

### 7.2. Database

Database sử dụng PostgreSQL/Supabase.

Dữ liệu vector, extracted terms, metadata có thể lưu dạng JSONB.

### 7.3. Index Đề Xuất

Các index chính:

- `candidate(user_account_id)`,
- `cv(candidate_id)`,
- `job(language, status)`,
- `matching(job_id, normalized_score)`,
- `matching(cv_id, normalized_score)`,
- `application(candidate_id, job_id)`,
- `email_token(token_hash)`,
- `audit_log(created_at)`.

### 7.4. Chính Sách Token

Raw token không nên lưu trực tiếp.

Hệ thống nên lưu:

- token hash,
- token purpose,
- expiry,
- used at,
- revoked at.

---

## 8. Yêu Cầu Phi Chức Năng

### 8.1. Performance

Hệ thống phải:

- phản hồi upload request nhanh bằng cách xử lý async,
- không block UI khi parse/scoring,
- hỗ trợ polling trạng thái,
- cache dữ liệu job/ranking nếu cần.

Yêu cầu đề xuất:

- API thông thường phản hồi dưới 1 giây trong môi trường demo,
- upload trả về CV id ngay sau khi nhận file hợp lệ,
- scoring có thể chạy background.

### 8.2. Reliability

Hệ thống phải:

- retry email khi lỗi tạm thời,
- không tạo application trùng,
- không gửi email trùng nếu cùng một email action đã sent,
- xử lý token expired/used rõ ràng.

### 8.3. Security

Hệ thống phải:

- dùng JWT hoặc session an toàn cho web,
- phân quyền theo role,
- dùng magic-link one-time,
- không thực thi side effect nặng bằng GET,
- validate input,
- tránh lộ raw token,
- ghi audit log.

### 8.4. Maintainability

Backend phải tách module rõ:

- auth,
- candidate,
- cv,
- job,
- matching,
- recommendation,
- feedback,
- automation,
- analytics,
- common.

Frontend phải tách:

- pages,
- components,
- hooks,
- api client,
- i18n,
- types.

### 8.5. Usability

Hệ thống phải:

- hiển thị score dạng phần trăm,
- giải thích lý do match,
- hiển thị cảnh báo validation dễ hiểu,
- không bắt người dùng mở web cho mọi action nhỏ,
- hỗ trợ email action.

### 8.6. Auditability

Mọi action tự động hoặc bán tự động phải truy vết được.

Tối thiểu phải biết:

- ai hoặc hệ thống đã làm,
- lúc nào,
- dựa trên policy nào,
- kết quả ra sao.

---

## 9. Business Rules

### 9.1. Score Rules

- Raw score dùng cosine similarity.
- Normalized score dùng thang 0-100%.
- Score cao không đồng nghĩa luôn auto-apply nếu user chưa bật policy.
- Score thấp vẫn có thể là Potential nếu skill có khả năng chuyển đổi.

### 9.2. Auto-Apply Rules

- Candidate phải bật auto-apply.
- Score phải vượt threshold.
- Job phải active.
- Candidate chưa apply job đó.
- Hệ thống phải ghi audit log.

### 9.3. Email Action Rules

- Token phải còn hạn.
- Token phải đúng purpose.
- Token phải thuộc đúng user.
- Token chưa được dùng.
- GET chỉ hiển thị confirm.
- POST mới thực thi action.

### 9.4. Feedback Rules

- Good Match ảnh hưởng mạnh đến vector.
- Potential ảnh hưởng nhẹ hơn Good.
- Bad Match ảnh hưởng âm.
- Skip hoặc Not Interested không tự động tương đương Bad Match.

### 9.5. Validation Rules

- Hard error chặn xử lý.
- Soft warning vẫn cho xử lý nếu dữ liệu đủ tối thiểu.
- Hệ thống phải đề xuất cách sửa nếu phát hiện dữ liệu bất thường.

---

## 10. API Yêu Cầu Tối Thiểu

### 10.1. Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/passwordless/request`
- `GET /api/auth/passwordless/verify?token=...`
- `POST /api/auth/passwordless/verify`
- `GET /api/me`

### 10.2. Candidate

- `GET /api/candidates/me`
- `PUT /api/candidates/me`
- `GET /api/candidates/me/preferences`
- `PUT /api/candidates/me/preferences`

### 10.3. CV

- `POST /api/cv/upload`
- `POST /api/cv/manual`
- `GET /api/cv/{id}`
- `GET /api/cv/{id}/status`
- `GET /api/cv/{id}/matchings`

### 10.4. Job

- `GET /api/jobs`
- `GET /api/jobs/{id}`
- `POST /api/jobs`
- `PUT /api/jobs/{id}`
- `DELETE /api/jobs/{id}`

### 10.5. Matching Và Recommendation

- `GET /api/jobs/{jobId}/ranking`
- `GET /api/candidates/me/recommendations`
- `GET /api/jobs/{jobId}/applicants`
- `GET /api/jobs/{jobId}/potential`

### 10.6. Application

- `POST /api/applications`
- `GET /api/applications/me`
- `POST /api/applications/{id}/withdraw`
- `POST /api/applications/{id}/invite`

### 10.7. Feedback

- `POST /api/matchings/{matchingId}/feedback`

### 10.8. Automation

- `GET /api/automation/policies/me`
- `PUT /api/automation/policies/me`
- `GET /api/automation/actions/confirm?token=...`
- `POST /api/automation/actions/confirm`
- `POST /api/automation/actions/reject`

### 10.9. Analytics Và Audit

- `GET /api/analytics/summary`
- `GET /api/analytics/jobs/trends`
- `GET /api/audit-logs`

---

## 11. Luồng Xử Lý Chính

### 11.1. Candidate Upload CV Và Nhận Ranking

1. Candidate upload PDF.
2. Backend tạo CV record.
3. Backend validate file.
4. Backend parse text bằng PDFBox.
5. Backend normalize và vector hóa.
6. Backend score CV với các JD active.
7. Backend lưu matching.
8. Frontend polling status.
9. Candidate xem danh sách job phù hợp.
10. AutoFit kiểm tra có cần email hoặc auto-apply không.

### 11.2. Candidate Nhận Recommendation

1. Candidate cập nhật preference.
2. Backend tạo profile vector.
3. Backend score profile với job active.
4. Frontend hiển thị job feed kèm recommendation score.
5. Candidate apply/skip/show similar.
6. Feedback được lưu nếu có.

### 11.3. Recruiter Tạo JD Và Xem Ranking

1. Recruiter tạo JD.
2. Backend validate JD.
3. Backend vector hóa JD.
4. Backend score JD với các CV phù hợp.
5. Recruiter xem ranking.
6. Recruiter invite/reject/mark potential.
7. Feedback được dùng để update vector bằng Rocchio.

### 11.4. Email Action

1. Backend phát hiện event cần email.
2. AutoFit policy cho phép gửi email.
3. Backend tạo email action và token.
4. Notification service gửi email.
5. User bấm CTA.
6. Frontend mở confirm page.
7. Backend verify token.
8. User xác nhận bằng POST.
9. Backend thực thi action.
10. Backend ghi audit log.

---

## 12. Yêu Cầu Kiểm Thử

### 12.1. Unit Test

Cần test:

- text normalization,
- tokenization,
- TF-IDF,
- cosine similarity,
- score normalization,
- label assignment,
- Potential heuristic,
- Rocchio update,
- policy evaluation,
- token validation.

### 12.2. Integration Test

Cần test:

- upload CV đến scoring,
- tạo JD đến ranking,
- recommendation,
- feedback đến recompute,
- passwordless login,
- email action confirm,
- auto-apply,
- audit log.

### 12.3. UI Test

Cần test:

- upload flow,
- job search/filter,
- recommendation list,
- recruiter ranking,
- automation settings,
- email confirm page,
- invalid/expired token page,
- language switch.

---

## 13. Acceptance Criteria

Hệ thống được xem là đạt yêu cầu MVP khi:

- candidate đăng nhập được,
- candidate upload CV hoặc nhập CV form được,
- hệ thống parse và validate CV được,
- recruiter tạo JD được,
- hệ thống tính matching score được,
- candidate xem job recommendation được,
- recruiter xem ranking theo JD được,
- feedback Good/Bad/Potential cập nhật ranking được,
- candidate bật auto-apply threshold được,
- hệ thống tạo application nội bộ khi đủ điều kiện,
- hệ thống gửi được ít nhất một loại actionable email,
- magic-link confirm hoạt động đúng,
- audit log ghi được action quan trọng,
- UI hỗ trợ tiếng Việt và tiếng Anh ở các màn hình chính.

---

## 14. Rủi Ro Và Giả Định

### 14.1. Giả Định

- Dữ liệu demo tập trung vào ngành công nghệ thông tin.
- CV PDF chủ yếu là text-based.
- Supabase/PostgreSQL đủ cho quy mô đồ án.
- Email provider có thể dùng SMTP hoặc dịch vụ tương đương.
- Người dùng đồng ý nhận email action khi bật automation.

### 14.2. Rủi Ro

| Rủi ro | Ảnh hưởng | Cách giảm thiểu |
|---|---|---|
| CV scan không parse được | Không scoring được | Chặn trong validation, OCR để phase sau. |
| TF-IDF không hiểu ngữ nghĩa sâu | Score chưa hoàn hảo | Dùng Potential heuristic và feedback Rocchio. |
| Email bị spam hoặc gửi lỗi | HITL kém hiệu quả | Retry, digest, dashboard fallback. |
| Token bị link scanner mở | Action sai | GET chỉ confirm, POST mới thực thi. |
| Scope quá rộng | Không kịp đồ án | MVP trước: matching, recommendation, email action cơ bản, audit. |

---

## 15. MVP Scope

MVP nên bao gồm:

- auth cơ bản,
- candidate profile,
- CV upload text-based PDF,
- JD CRUD,
- TF-IDF vectorization,
- cosine matching,
- recommendation,
- feedback Rocchio,
- AutoFit policy cơ bản,
- one actionable email flow,
- audit log,
- bilingual UI cơ bản.

Các phần có thể để phase sau:

- OCR,
- Redis cache,
- Apache POI export,
- advanced analytics,
- full admin console,
- message broker,
- external ATS integration.

---

## 16. Kết Luận

`CareerFit IT AutoPilot` là hệ thống job portal tích hợp automation cho tuyển dụng IT.

Về mặt người dùng, candidate vẫn có trải nghiệm như một web tìm việc bình thường.
Về mặt recruiter, hệ thống là dashboard quản lý tuyển dụng có ranking và candidate pool.
Về mặt kỹ thuật, backend là automation engine chạy matching, recommendation, feedback learning, email action và audit log.

Hệ thống đủ cơ sở để được mô tả là một nền tảng automation có yếu tố AI chuyên biệt trong miền tuyển dụng, với vòng lặp:

```text
Perception -> Decision -> Action -> Learning
```

