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
`Nền tảng tự động hóa tuyển dụng tích hợp AI hỗ trợ đánh giá và gợi ý CV-JD với Human-in-the-Loop.`

Phạm vi áp dụng:
`Hệ thống tập trung vào bài toán tuyển dụng trong ngành công nghệ thông tin.`

Tiếng Anh:
`Design and Implementation of a Human-in-the-Loop AI-Assisted Recruitment Automation Platform for CV-JD Evaluation and Recommendation in IT.`

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
| Recommendation Interaction | Lịch sử tương tác của candidate với job được đề xuất, ví dụ Viewed, Skipped, Applied, Not Interested, Show Similar. |
| Salary Mode | Kiểu khai báo lương của JD, ví dụ Negotiable, Range, Up To, From hoặc Hidden. |
| Employer Profile | Hồ sơ công ty/nhà tuyển dụng hiển thị cho candidate, gồm giới thiệu, logo, banner, thông tin liên hệ và job đang mở. |
| Job Market Analytics | Thống kê thị trường việc làm trên hệ thống, ví dụ tổng job đăng tuyển, xu hướng đăng tuyển, phân bố theo nhóm IT hoặc mức lương. Dữ liệu này khác với thống kê CV-JD matching. |
| Candidate Profile | Thông tin cố định của candidate như liên hệ, vị trí mong muốn, kỹ năng, preference và CV mặc định. Đây không phải là portfolio. |
| Portfolio | Phần bổ trợ trong Hồ sơ & CV để candidate khai báo link cá nhân và dự án nổi bật, giúp recruiter xem bằng chứng năng lực. |

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
- candidate có thể quản lý nhiều CV, chọn CV mặc định và bổ sung portfolio dự án,
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
- quản lý nhiều CV trên cùng một candidate,
- quản lý hồ sơ cố định và portfolio dự án của candidate,
- tạo và quản lý JD,
- tìm kiếm và lọc job,
- gợi ý tìm kiếm theo keyword,
- hiển thị trang kết quả tìm kiếm job,
- hiển thị hồ sơ nhà tuyển dụng và danh sách job đang mở,
- hiển thị thống kê thị trường việc làm dựa trên số job đăng tuyển,
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
| UC-C04 | Cập nhật Hồ sơ & CV | Candidate quản lý nhiều CV, hồ sơ cố định, preference và portfolio dự án. |
| UC-C05 | Xem job feed | Candidate xem danh sách job như web tìm việc thông thường. |
| UC-C06 | Tìm kiếm và lọc job | Candidate tìm job theo keyword, xem gợi ý tìm kiếm, chuyển sang trang kết quả và lọc theo điều kiện. |
| UC-C07 | Xem job recommendation | Candidate xem job được gợi ý theo profile vector. |
| UC-C08 | Apply job thủ công | Candidate bấm apply job trên web. |
| UC-C09 | Bật auto-apply | Candidate bật auto-apply theo threshold. |
| UC-C10 | Xác nhận apply qua email | Candidate bấm Apply/Skip/Show Similar từ email. |
| UC-C11 | Xem lịch sử ứng tuyển | Candidate xem job đã apply, auto-applied, skipped. |
| UC-C12 | Phản hồi job recommendation | Candidate feedback Good/Potential/Bad/Not Interested. |
| UC-C13 | Cấu hình lịch tự động | Candidate chọn tần suất scan job, giờ nhận digest và giới hạn email/ngày. |
| UC-C14 | Xem nhà tuyển dụng nổi bật | Candidate xem danh sách công ty nổi bật trên trang việc làm. |
| UC-C15 | Xem chi tiết nhà tuyển dụng | Candidate mở trang hồ sơ công ty để xem giới thiệu, thông tin công ty và job đang mở. |
| UC-C16 | Chọn CV mặc định | Candidate chọn một CV làm nguồn mặc định cho matching/recommendation. |
| UC-C17 | Quản lý portfolio | Candidate thêm link cá nhân và dự án nổi bật phục vụ recruiter review. |

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
| UC-S11 | Scan job định kỳ | Hệ thống quét job mới theo tần suất trong AutoFit policy. |
| UC-S12 | Xử lý skip | Hệ thống ghi nhận skip và quyết định có đề xuất job thay thế hay không. |
| UC-S13 | Tổng hợp job market analytics | Hệ thống tổng hợp số lượng job đăng tuyển, xu hướng theo thời gian, phân bố theo nhóm IT và mức lương. |

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

Một candidate phải có thể lưu nhiều CV.
Mỗi CV phải có id riêng, source, trạng thái xử lý, ngày cập nhật và có thể được chọn làm CV mặc định.

#### FR-CV-02: Nhập CV bằng form

Candidate phải có thể nhập CV bằng form nếu không có file PDF.

Frontend phải tách rõ hai tab trong trang Upload CV:

- `Document Parser`: upload file, validate, parse và hiển thị trạng thái xử lý.
- `Manual Creation`: nhập CV thủ công bằng form có cấu trúc.

Hai tab này là hai giao diện chuyển qua lại, không thay thế lẫn nhau.

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

#### FR-CV-06: Quản lý CV đã tạo

Candidate phải có trang quản lý các CV đã upload hoặc nhập form.

Mỗi CV item tối thiểu hiển thị:

- tên CV,
- nguồn tạo: uploaded PDF hoặc manual creation,
- ngày cập nhật,
- trạng thái parse/scoring,
- score tốt nhất hoặc trạng thái matching gần nhất nếu có,
- các skill/từ khóa chính,
- action xem chi tiết,
- action chọn làm CV mặc định.

#### FR-CV-07: Hồ sơ cố định

Candidate phải có tab hồ sơ cố định trong trang `Hồ sơ & CV`.

Hồ sơ cố định không phải portfolio.
Nó lưu thông tin dùng chung cho toàn bộ AutoFit/recommendation:

- tên,
- email,
- số điện thoại,
- location,
- desired title,
- skills chính,
- seniority,
- expected salary,
- work model,
- auto-apply threshold hoặc preference liên quan.

#### FR-CV-08: Portfolio / Dự án

Candidate có thể khai báo portfolio như dữ liệu bổ trợ.

Thông tin portfolio tối thiểu:

- GitHub,
- LinkedIn,
- website cá nhân,
- link demo/design nếu có,
- danh sách dự án nổi bật,
- vai trò trong dự án,
- mô tả ngắn,
- tech stack,
- link repository/demo,
- impact hoặc thành tựu đo được.

Portfolio nằm trong trang `Hồ sơ & CV` như một tab riêng, không nằm trong trang Upload CV.

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

Khi candidate gõ keyword ở thanh tìm kiếm chính, frontend phải có thể hiển thị gợi ý tìm kiếm dưới ô nhập liệu.
Gợi ý chỉ hiển thị khi ô tìm kiếm đang được focus hoặc đang trong trạng thái nhập liệu.
Sau khi bấm Search, hệ thống phải chuyển sang trang kết quả tìm kiếm job, không chỉ lọc tại chỗ trên homepage.

#### FR-JOB-02.1: Gợi ý tìm kiếm

Hệ thống phải trả về search suggestions theo keyword.

Nguồn gợi ý tối thiểu:

- skill hoặc expertise,
- job title,
- company/employer.

Suggestion label phải phù hợp ngữ cảnh và không được hiển thị cố định sau khi người dùng đã rời khỏi trạng thái nhập liệu.

#### FR-JOB-02.2: Trang kết quả tìm kiếm

Trang kết quả tìm kiếm phải hiển thị:

- keyword hiện tại,
- số lượng job phù hợp,
- danh sách job dạng một cột,
- bộ lọc ngang phía trên danh sách,
- nút mở filter modal hoặc panel nâng cao.

Trang tổng quan candidate chỉ cần hiển thị một số job mới hoặc job nổi bật.
Nút `Xem tất cả` phải dẫn đến trang kết quả/danh sách đầy đủ.

#### FR-JOB-03: Lọc job

Candidate phải lọc job theo:

- location,
- seniority,
- skill,
- language,
- salary mode,
- salary range nếu có,
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

Khi candidate bấm vào card job, tên job hoặc nút chi tiết trong hover preview, hệ thống phải mở trang chi tiết job tương ứng.
Khi người dùng cuộn xuống trên trang chi tiết, frontend có thể hiển thị sticky bottom apply bar để giữ các hành động chính như apply/save luôn truy cập được.

#### FR-JOB-05: Hover preview JD

Trên danh sách job, frontend có thể hiển thị preview JD khi người dùng hover vào một job trong một khoảng thời gian ngắn.

Preview phải có:

- thông tin công ty và job,
- mô tả công việc,
- yêu cầu công việc,
- vùng nội dung có thể cuộn nếu JD dài,
- nút chi tiết dẫn đến trang chi tiết job.

Hover preview chỉ là tiện ích xem nhanh, không thay thế trang chi tiết job.

#### FR-JOB-06: Nhà tuyển dụng nổi bật

Candidate phải xem được danh sách nhà tuyển dụng nổi bật trên trang candidate home hoặc trang việc làm.

Mỗi item tối thiểu có:

- logo,
- tên công ty,
- mô tả ngắn hoặc lĩnh vực,
- số job đang mở nếu có.

Khi bấm vào item nhà tuyển dụng, hệ thống phải mở trang chi tiết nhà tuyển dụng.

#### FR-JOB-07: Chi tiết nhà tuyển dụng

Trang chi tiết nhà tuyển dụng phải hiển thị:

- banner hoặc cover,
- logo,
- tên công ty,
- giới thiệu công ty,
- thông tin địa điểm/quy mô/lĩnh vực,
- các benefit hoặc điểm nổi bật,
- danh sách job đang mở của công ty.

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
- salary mode,
- salary range/display text nếu có.

Recruiter không bị bắt buộc nhập đầy đủ `salary_min` và `salary_max`.
Hệ thống phải hỗ trợ các kiểu lương thực tế:

- `NEGOTIABLE`: lương thỏa thuận,
- `RANGE`: khoảng lương từ `salary_min` đến `salary_max`,
- `UP_TO`: lương tối đa đến `salary_max`,
- `FROM`: lương từ `salary_min` trở lên,
- `HIDDEN`: không công khai lương.

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

Salary validation:

- `NEGOTIABLE`: không cần `salary_min`, `salary_max`, `salary_currency`, `salary_type`; hiển thị `salary_display_text` như `Thỏa thuận`.
- `RANGE`: bắt buộc `salary_min`, `salary_max`, `salary_currency`, `salary_type` và `salary_min <= salary_max`.
- `UP_TO`: bắt buộc `salary_max`, `salary_currency`, `salary_type`.
- `FROM`: bắt buộc `salary_min`, `salary_currency`, `salary_type`.
- `HIDDEN`: không cần min/max và không hiển thị mức lương cho candidate.
- Nếu nhập số âm, currency không hợp lệ hoặc min lớn hơn max thì phải trả validation error rõ ràng.

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
- daily digest time,
- user timezone,
- job scan enabled,
- job scan frequency,
- high-match email enabled,
- high-match threshold,
- max email per day,
- quiet hours enabled,
- quiet hours start,
- quiet hours end,
- notification cooldown hours,
- replacement after skip enabled,
- replacement delay minutes,
- max auto-apply per day.

Recruiter policy:

- email high-match alert enabled,
- daily digest enabled,
- daily digest time,
- user timezone,
- auto-invite enabled nếu được cho phép,
- high-match threshold,
- potential threshold,
- max email per day.

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

#### FR-AUTO-05: Scan job mới định kỳ

Hệ thống phải cho phép candidate bật/tắt tự động quét job mới.

Tần suất hỗ trợ tối thiểu:

- mỗi 1 giờ,
- mỗi 6 giờ,
- mỗi ngày.

Default khuyến nghị: mỗi 1 giờ.

#### FR-AUTO-06: High-match notification

Hệ thống phải gửi email ngay khi có job/candidate match rất cao nếu người dùng bật cấu hình này.

Default khuyến nghị:

- candidate high-match job threshold: `>= 90%`,
- recruiter high-match CV threshold: `>= 85%` hoặc theo policy,
- không vượt quá `max_email_per_day`.

Nếu score chưa đủ gửi ngay, kết quả phải được gom vào daily digest hoặc hiển thị trên web.

#### FR-AUTO-07: Daily digest

Hệ thống phải hỗ trợ email tổng hợp hằng ngày.

Default khuyến nghị:

- gửi lúc `08:00` theo timezone của user,
- gom top job/candidate đáng chú ý,
- mỗi CTA trong digest vẫn dùng token riêng.

#### FR-AUTO-08: Weekly summary

Hệ thống có thể hỗ trợ báo cáo tuần cho xu hướng job, tổng số match và hiệu quả automation.

Tính năng này có thể triển khai sau MVP nếu thiếu thời gian.

#### FR-AUTO-09: Xử lý Skip

Hệ thống phải phân biệt skip theo nguồn:

- Skip trên web: ẩn job ngay và trả job kế tiếp từ danh sách hiện tại.
- Skip qua email: ghi nhận interaction nhưng không gửi job kế tiếp ngay.
- Skip qua email chỉ được gửi job thay thế sau delay nếu user bật Autopilot tìm job thay thế.

Default delay đề xuất: `30-60 phút`.

Skip không được coi là Bad Match.

#### FR-AUTO-10: Recommendation interaction tracking

Hệ thống phải lưu lại tương tác recommendation của candidate.

Các action tối thiểu:

- `VIEWED`,
- `SKIPPED`,
- `APPLIED`,
- `SAVED`,
- `NOT_INTERESTED`,
- `SHOW_SIMILAR`.

Các source tối thiểu:

- `WEB`,
- `EMAIL`,
- `DIGEST`,
- `AUTOPILOT`.

#### FR-AUTO-11: Timezone, quiet hours và cooldown

Hệ thống phải lưu timezone của người dùng để tính đúng giờ gửi digest và quiet hours.

Hệ thống phải hỗ trợ:

- `user_timezone`,
- `quiet_hours_enabled`,
- `quiet_hours_start`,
- `quiet_hours_end`,
- `notification_cooldown_hours`.

Nếu đang trong quiet hours, hệ thống không gửi email ngay mà phải dời sang digest hoặc thời điểm hợp lệ tiếp theo.

Nếu cùng một job/candidate đã được notify hoặc skip gần đây, hệ thống không gửi lặp lại cho đến khi hết cooldown, trừ khi JD/CV thay đổi đáng kể.

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

Dữ liệu job trend trên trang tổng quan candidate/recruiter phải đại diện cho tổng số lượng job được đăng tuyển trên hệ thống theo thời gian, không phải số lượng CV-JD matching.

#### FR-ANA-01.1: Job market summary

Hệ thống phải hiển thị thống kê tổng quan thị trường việc làm IT trên hệ thống, tối thiểu gồm:

- tổng job đang/đã đăng theo phạm vi thống kê,
- tổng công ty/nhà tuyển dụng có job,
- số job mới hoặc job active nổi bật.

#### FR-ANA-01.2: Job market distribution

Hệ thống phải hỗ trợ xem phân bố job theo:

- nhóm ngành/vị trí IT như Frontend, Backend, Data/AI, DevOps, QA/Testing, Mobile,
- mức lương hoặc salary band.

Tooltip trên biểu đồ chỉ hiển thị khi người dùng hover vào điểm/cột dữ liệu.
Nhãn tooltip phải dùng nội dung như `jobs đăng tuyển` hoặc `việc làm`, không dùng `matches` cho biểu đồ thị trường việc làm.

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
- search results,
- job detail,
- employer detail,
- CV upload,
- Hồ sơ & CV,
- CV management,
- fixed candidate profile,
- portfolio/projects,
- recommendations,
- applications,
- AutoFit settings,
- notifications.

### 6.4. Recruiter Pages

Các trang recruiter:

- recruiter dashboard,
- job management HR dashboard,
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
- `CandidatePortfolioLink`,
- `CandidatePortfolioProject`,
- `EmployerProfile`,
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
- `RecommendationInteraction`,
- `JobTrendSnapshot`,
- `JobMarketSnapshot`.

### 7.2. Database

Database lõi của hệ thống là PostgreSQL.

Môi trường development và demo trực tiếp dùng PostgreSQL local chạy bằng Docker Compose.
Khi cần demo online hoặc deploy, hệ thống có thể chuyển sang Supabase PostgreSQL hoặc PostgreSQL cloud khác bằng cách đổi datasource config.
Supabase không phải là dependency bắt buộc của nghiệp vụ.

Dữ liệu vector, extracted terms, metadata có thể lưu dạng JSONB.

Schema database phải được quản lý bằng Flyway migration để bảo đảm local PostgreSQL và database cloud có cùng cấu trúc.

### 7.2.0. Storage Và Auth Strategy

File CV trong development được lưu bằng local filesystem.
Storage service phải được thiết kế theo interface để có thể đổi sang Supabase Storage hoặc S3-compatible storage ở phase deploy.

Authentication và authorization do backend tự triển khai bằng Spring Security, JWT, role-based access và passwordless magic-link.
Hệ thống không phụ thuộc Supabase Auth.

Quan hệ giữa `Candidate` và `CV` là one-to-many.
Candidate có thể có nhiều CV, nhưng chỉ nên có một CV mặc định cho matching chính tại một thời điểm.

### 7.2.1. Job Salary Fields

Bảng `job` phải lưu salary theo dạng có cấu trúc để filter, sort, recommendation và email template dùng được.

Các trường salary đề xuất:

- `salary_mode`: không null, enum `NEGOTIABLE`, `RANGE`, `UP_TO`, `FROM`, `HIDDEN`.
- `salary_min`: nullable, dùng cho `RANGE` hoặc `FROM`.
- `salary_max`: nullable, dùng cho `RANGE` hoặc `UP_TO`.
- `salary_currency`: nullable, ví dụ `VND`, `USD`.
- `salary_type`: nullable, enum `MONTHLY`, `HOURLY`, `YEARLY`.
- `salary_is_visible`: không null, mặc định `true`, quyết định có hiển thị salary cho candidate không.
- `salary_display_text`: nullable, lưu text hiển thị như `Thỏa thuận`, `1000 - 2000 USD / tháng`, `Up to 2000 USD`.

Quy tắc lưu:

- Không chỉ lưu salary dạng text vì sẽ khó filter/sort.
- Vẫn cần `salary_display_text` để giữ cách hiển thị tự nhiên theo thực tế tuyển dụng.
- Các trường min/max được phép null tùy theo `salary_mode`, nhưng phải được validate có điều kiện.

### 7.2.1.1. CV Management Fields

Bảng `cv` phải hỗ trợ quản lý nhiều CV cho một candidate.

Các trường bổ sung/gợi ý:

- `display_name`,
- `source`: enum `UPLOAD`, `MANUAL`,
- `is_default`,
- `parsed_summary`,
- `top_skills` JSONB,
- `last_scored_at`,
- `created_at`,
- `updated_at`.

Ràng buộc:

- mỗi candidate có thể có nhiều CV,
- mỗi candidate chỉ có tối đa một CV `is_default = true`.

### 7.2.2. Employer Profile Fields

Bảng hoặc entity `employer_profile` phải lưu thông tin công ty phục vụ trang nhà tuyển dụng.

Các trường đề xuất:

- `id`,
- `recruiter_id` hoặc `owner_user_id`,
- `company_name`,
- `slug`,
- `logo_url`,
- `cover_url`,
- `summary`,
- `description`,
- `industry`,
- `company_size`,
- `location`,
- `website_url`,
- `benefits` JSONB,
- `is_featured`,
- `created_at`,
- `updated_at`.

### 7.2.3. Job Market Snapshot Fields

Bảng hoặc view `job_market_snapshot` dùng cho biểu đồ thị trường việc làm.

Các trường đề xuất:

- `id`,
- `snapshot_date`,
- `total_posted_jobs`,
- `active_jobs`,
- `new_jobs`,
- `employer_count`,
- `distribution_by_role` JSONB,
- `distribution_by_salary` JSONB,
- `created_at`.

`job_market_snapshot` không lưu số lượng CV-JD matching trừ khi có trường riêng được đặt tên rõ như `matching_count`.

### 7.2.4. Candidate Portfolio Fields

Portfolio có thể lưu bằng bảng riêng hoặc JSONB tùy scope MVP.

Entity `candidate_portfolio_link` đề xuất:

- `id`,
- `candidate_id`,
- `type`: enum `GITHUB`, `LINKEDIN`, `WEBSITE`, `DEMO`, `DESIGN`,
- `url`,
- `created_at`,
- `updated_at`.

Entity `candidate_portfolio_project` đề xuất:

- `id`,
- `candidate_id`,
- `name`,
- `role`,
- `summary`,
- `tech_stack` JSONB,
- `project_url`,
- `impact`,
- `created_at`,
- `updated_at`.

### 7.3. Index Đề Xuất

Các index chính:

- `candidate(user_account_id)`,
- `cv(candidate_id, is_default)`,
- `cv(candidate_id)`,
- `candidate_portfolio_project(candidate_id)`,
- `job(language, status)`,
- `job(title)`,
- `job(company)`,
- `job(salary_mode)`,
- `job(salary_min, salary_max)`,
- `employer_profile(slug)`,
- `employer_profile(is_featured)`,
- `job_market_snapshot(snapshot_date)`,
- `matching(job_id, normalized_score)`,
- `matching(cv_id, normalized_score)`,
- `application(candidate_id, job_id)`,
- `recommendation_interaction(candidate_id, job_id)`,
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
- hiển thị badge score theo thang màu từ xanh sáng ở điểm cao đến đỏ ở điểm thấp,
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

### 9.3.1. Notification Timing Rules

- Ranking sau upload CV phải chạy ngay bằng async worker.
- Ranking sau khi recruiter tạo/cập nhật JD phải chạy ngay hoặc đưa vào background queue.
- Job scan cho candidate mặc định chạy mỗi 1 giờ nếu user bật.
- Email high-match chỉ gửi ngay khi score vượt ngưỡng và chưa vượt quota ngày.
- Match không đủ ngưỡng gửi ngay phải được gom vào daily digest.
- Daily digest mặc định gửi lúc `08:00` theo timezone của user.
- Email gửi ngay phải tôn trọng quiet hours nếu user bật.
- Hệ thống phải có cooldown chống gửi lặp lại cùng job/candidate.
- Weekly summary là optional sau MVP.

### 9.3.2. AutoFit Decision Priority

Khi nhiều điều kiện cùng xảy ra, hệ thống phải xử lý theo thứ tự:

- kiểm tra role, quyền truy cập và consent,
- kiểm tra job/CV/application còn hợp lệ,
- kiểm tra interaction cũ như `APPLIED`, `SKIPPED`, `NOT_INTERESTED`, `SHOW_SIMILAR`,
- kiểm tra cooldown,
- kiểm tra quota email/ngày,
- kiểm tra quiet hours và timezone,
- chọn action cuối cùng: auto execute, gửi email, gom digest, chờ duyệt hoặc không làm gì.

### 9.4. Feedback Rules

- Good Match ảnh hưởng mạnh đến vector.
- Potential ảnh hưởng nhẹ hơn Good.
- Bad Match ảnh hưởng âm.
- Skip hoặc Not Interested không tự động tương đương Bad Match.
- Skip là tín hiệu yếu để ẩn hoặc giảm ưu tiên job cụ thể.
- Not Interested là tín hiệu mạnh hơn Skip.
- Show Similar là tín hiệu tích cực cho nhóm job tương tự.

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
- `GET /api/cv/me`
- `GET /api/cv/{id}`
- `GET /api/cv/{id}/status`
- `GET /api/cv/{id}/matchings`
- `POST /api/cv/{id}/set-default`

### 10.3.1. Candidate Profile & Portfolio

- `GET /api/candidates/me/profile`
- `PUT /api/candidates/me/profile`
- `GET /api/candidates/me/portfolio`
- `PUT /api/candidates/me/portfolio/links`
- `POST /api/candidates/me/portfolio/projects`
- `PUT /api/candidates/me/portfolio/projects/{projectId}`
- `DELETE /api/candidates/me/portfolio/projects/{projectId}`

### 10.4. Job

- `GET /api/jobs`
- `GET /api/jobs/search`
- `GET /api/jobs/search/suggestions`
- `GET /api/jobs/{id}`
- `POST /api/jobs`
- `PUT /api/jobs/{id}`
- `DELETE /api/jobs/{id}`

### 10.4.1. Employer

- `GET /api/employers/featured`
- `GET /api/employers/{id}`
- `GET /api/employers/{id}/jobs`

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
- `POST /api/automation/actions/feedback`

### 10.8.1. Recommendation Interaction

- `POST /api/recommendations/{jobId}/interactions`
- `GET /api/recommendations/interactions`

### 10.9. Analytics Và Audit

- `GET /api/analytics/summary`
- `GET /api/analytics/jobs/trends`
- `GET /api/analytics/job-market/summary`
- `GET /api/analytics/job-market/trends`
- `GET /api/analytics/job-market/demand?groupBy=role|salary`
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

### 11.1.1. Candidate quản lý Hồ sơ & CV

1. Candidate mở trang `Hồ sơ & CV`.
2. Tab `CV đã tạo` hiển thị nhiều CV đã upload hoặc nhập form.
3. Candidate có thể upload CV mới, tạo CV bằng form hoặc chọn một CV mặc định.
4. Tab `Hồ sơ cố định` lưu thông tin cá nhân và preference dùng chung.
5. Tab `Portfolio / Dự án` lưu link cá nhân và dự án nổi bật.
6. Backend dùng CV mặc định, hồ sơ cố định và portfolio như tín hiệu dữ liệu riêng biệt khi cần.

### 11.2. Candidate Nhận Recommendation

1. Candidate cập nhật preference.
2. Backend tạo profile vector.
3. Backend score profile với job active.
4. Frontend hiển thị job feed kèm recommendation score.
5. Candidate apply/skip/show similar.
6. Hệ thống lưu `RecommendationInteraction`.
7. Feedback được lưu nếu có.

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

### 11.5. Scan job mới và gửi thông báo

1. Scheduler chạy theo `job_scan_frequency`.
2. Backend tìm job mới hoặc job vừa cập nhật.
3. Recommendation Engine score job với candidate phù hợp.
4. AutoFit kiểm tra consent, interaction cũ, cooldown, quota, quiet hours và threshold.
5. Nếu candidate đã skip/not interested/applied job đó, backend không gửi lại job đó trong cùng luồng recommendation.
6. Nếu score rất cao và đủ điều kiện gửi ngay, backend tạo actionable email.
7. Nếu không đủ điều kiện gửi ngay, backend đưa vào daily digest hoặc chỉ hiển thị trên web.

### 11.6. Skip job

1. Candidate bấm `Skip`.
2. Backend ghi `RecommendationInteraction`.
3. Nếu source là `WEB`, frontend ẩn job ngay và hiển thị job kế tiếp.
4. Nếu source là `EMAIL`, backend không gửi job kế tiếp ngay.
5. Nếu user bật Autopilot thay thế sau skip, backend tạo notification job sau delay `30-60 phút`.
6. Audit log ghi lại action nếu skip đi qua email/magic-link.

### 11.7. Candidate search job

1. Candidate nhập keyword ở thanh tìm kiếm.
2. Frontend gọi search suggestion API khi input đang focus.
3. Candidate chọn suggestion hoặc bấm Search.
4. Frontend chuyển sang trang kết quả với keyword trên URL/query state.
5. Backend trả danh sách job phù hợp, tổng số kết quả và metadata filter.
6. Candidate dùng bộ lọc ngang hoặc filter modal để thu hẹp kết quả.
7. Candidate bấm job card, tên job hoặc nút chi tiết để mở trang chi tiết job.

### 11.8. Candidate xem nhà tuyển dụng

1. Frontend tải danh sách nhà tuyển dụng nổi bật.
2. Candidate bấm vào một nhà tuyển dụng.
3. Frontend mở trang chi tiết nhà tuyển dụng.
4. Backend trả profile công ty và danh sách job đang mở.
5. Candidate có thể mở từng job để xem chi tiết và apply.

### 11.9. Job market dashboard

1. Backend tổng hợp snapshot thị trường việc làm theo lịch.
2. Frontend candidate/recruiter dashboard gọi analytics job-market APIs.
3. Biểu đồ line hiển thị tổng job đăng tuyển theo thời gian.
4. Biểu đồ bar hiển thị phân bố theo nhóm IT hoặc mức lương.
5. Tooltip chỉ xuất hiện khi hover và dùng đơn vị job/việc làm.

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
- job scan scheduler,
- skip interaction,
- high-match notification quota,
- daily digest generation,
- timezone/quiet hours behavior,
- notification cooldown,
- audit log.

### 12.3. UI Test

Cần test:

- upload flow,
- job search/filter,
- search suggestions,
- search results page,
- job detail navigation,
- sticky apply bar on job detail,
- employer featured list and employer detail page,
- recommendation list,
- recruiter ranking,
- job market dashboard for posted job counts,
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
- hệ thống hỗ trợ scan job mới theo lịch,
- hệ thống xử lý skip đúng giữa web và email,
- high-match email không vượt quota ngày,
- daily digest dùng đúng timezone,
- quiet hours và cooldown hoạt động đúng,
- magic-link confirm hoạt động đúng,
- audit log ghi được action quan trọng,
- UI hỗ trợ tiếng Việt và tiếng Anh ở các màn hình chính.

---

## 14. Rủi Ro Và Giả Định

### 14.1. Giả Định

- Dữ liệu demo tập trung vào ngành công nghệ thông tin.
- CV PDF chủ yếu là text-based.
- PostgreSQL local qua Docker đủ cho quy mô development/demo trực tiếp.
- Supabase PostgreSQL hoặc PostgreSQL cloud chỉ dùng như lựa chọn deploy/demo online nếu cần.
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
