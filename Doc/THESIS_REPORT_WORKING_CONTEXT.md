# Ngữ cảnh làm việc cho báo cáo luận văn CareerFit

## Cách dùng file này

Khi mở phiên Codex mới, yêu cầu agent đọc hai file sau trước:

1. `Doc/THESIS_REPORT_WORKING_CONTEXT.md` — ngữ cảnh cô đọng và nguồn cần đọc.
2. `Doc/THESIS_REPORT_CONTENT_PLAN.md` — dàn ý và kế hoạch nội dung đầy đủ.

Sau đó chỉ mở tài liệu/code liên quan đến chương đang viết. Không cần đọc toàn bộ repository ngay từ đầu.

## Cập nhật hoàn thiện ngày 2026-07-04

- File báo cáo chính: `Doc/CareerFit-Thesis-Report.docx`. Chưa xuất PDF cuối; Word đã cập nhật TOC/List of Figures/List of Tables trong DOCX.
- File mẫu gốc `Doc/Thesis-Report.docx` được giữ nguyên.
- Ngôn ngữ báo cáo: tiếng Anh. Tên đề tài chính thức lấy từ `proposal.md`.
- Sinh viên: Pham Huu Hung – B2203557. Giảng viên hướng dẫn: Ph.D. Nguyen Thanh Khoa. Thời gian: Can Tho, August 2026.
- Đã hoàn thiện Chapter 1–6, Abstract, References và Appendices A–F.
- Đã thay toàn bộ `NOTE` bằng 29 sơ đồ gốc, 6 screenshot runtime, Table 1.1 và caption tương ứng. Asset nằm trong `Doc/figures` và `Doc/screenshots`.
- Đã sửa email action sang lưu token hash, GET chỉ xác nhận và POST mới thực thi; migration là `V15__secure_email_action_tokens.sql`.
- Đã externalize lịch scheduler, sửa aggregate health local, chia frontend bundle, bỏ mock Job fallback, đổi token/account sang `sessionStorage`, sửa concurrency benchmark và thêm cleanup cho E2E tạo Job.
- Bằng chứng cuối: backend 63/63 test pass; benchmark sạch không có `StaleObjectStateException`; frontend build pass, chunk lớn nhất 375.64 kB; aggregate health HTTP 200/UP. Xem `evidence/final-*20260704*.log` và `evaluation/result.json`.
- Script tái tạo/hoàn thiện: `scripts/generate-thesis-figures.py`, `scripts/finalize-thesis-report.py`, `scripts/update-thesis-final-evidence.py`, `scripts/refresh-thesis-fields.py`, `scripts/word-finalize-thesis.ps1`.
- Khi mở DOCX trong Word, kiểm tra lại TOC/List of Figures/List of Tables và pagination nếu Word yêu cầu cập nhật field.

### Rà soát văn phong và hình ảnh

- Đã rà soát lại prose sau khi hoàn thiện kỹ thuật: rút gọn phần Problem Statement, Motivation, Thesis Organization và các đoạn Chapter Summary/Conclusion bị nhắc lại.
- Đã sửa các kết luận cũ trong Chapter 5–6 về optimistic locking và aggregate health để khớp bằng chứng cuối.
- Đã xóa toàn bộ dấu backtick Markdown bị lọt vào DOCX; không còn NOTE hoặc placeholder.
- Word đã cập nhật lại TOC/List of Figures/List of Tables; bản hiện tại có 94 trang và khoảng 19,155 từ theo Word.
- Báo cáo đánh giá hình ảnh nằm tại `Doc/THESIS_VISUAL_REVIEW.md`. Hiện có 35 hình (29 sơ đồ/biểu đồ và 6 ảnh runtime); không có hình bắt buộc nào còn thiếu cho phạm vi luận văn hiện tại.
- Bản sao trước lần biên tập này: `Doc/working/CareerFit-Thesis-Report-before-prose-review.docx`.

### Rà soát định dạng và dàn trang

- Đã khôi phục logo CTU, ba section và đánh số trang: bìa không số, phần đầu số La Mã, nội dung chính số Ả Rập từ 1.
- Đã xóa numbering tự động khỏi Heading 1–3 để tránh số chương/mục bị lặp trong mục lục.
- Đã chuẩn hóa Times New Roman 13 pt, line spacing 1.5; Heading 1/2/3 lần lượt 16/14/13 pt; caption và bảng 11 pt.
- Đã crop Screen 4.1 từ hình cao 43.28 inch xuống 6.15 × 3.46 inch, khôi phục phân trang bình thường.
- Đã chuẩn hóa bảng, caption, heading orphan control, References và phân cấp Appendix.
- Word hiện tính 95 trang và khoảng 18,910 từ; List of Figures có 35 mục và List of Tables có 25 mục.
- Báo cáo chi tiết: `Doc/THESIS_FORMAT_REVIEW.md`; audit Word: `Doc/working/WORD_LAYOUT_AUDIT_FINAL.txt`.
- Bản sao trước chỉnh định dạng: `Doc/working/CareerFit-Thesis-Report-before-format-polish.docx`.

## Yêu cầu gốc của người dùng

- `Doc/Thesis-Report.docx` là file mẫu của một luận văn đã được duyệt.
- Cần xem cấu trúc mẫu và lập kế hoạch nội dung cho luận văn CareerFit.
- Giai đoạn hiện tại là lập kế hoạch và lưu ngữ cảnh; chưa phải viết toàn bộ báo cáo.
- Tài liệu nên dùng tiếng Việt có dấu; nội dung luận văn có thể cần tiếng Anh tùy quy định khoa và phải xác nhận trước khi soạn bản chính.

## Kết quả phân tích file mẫu

- File có 238 paragraph, 2 table, 1 media asset.
- Các phần đầu: cover, acknowledgements, abstract, TOC, lists of figures/tables/abbreviations.
- Sáu chương theo logic:
  1. Introduction.
  2. Fundamental of Theory.
  3. System Analysis and Design.
  4. System Implementation.
  5. Experimental Evaluation.
  6. Results, Discussion & Conclusion.
- Introduction của mẫu tương đối đầy đủ: problem, motivation, objectives, scope, contributions, organization.
- Từ Chương 2 trở đi phần lớn chỉ là heading/placeholder. Không được xem file mẫu là nội dung hoàn chỉnh hoặc sao chép các claim/số liệu của đề tài SignBridge.

## Định vị CareerFit cần giữ nhất quán

Tên sản phẩm: **CareerFit IT AutoPilot**.

Tên tiếng Việt đang dùng trong proposal: **Nền tảng tự động hóa tuyển dụng tích hợp AI hỗ trợ đánh giá và gợi ý CV-JD với Human-in-the-Loop**.

Tên tiếng Anh đang dùng: **Design and Implementation of a Human-in-the-Loop AI-Assisted Recruitment Automation Platform for CV-JD Evaluation and Recommendation in IT**.

Mô hình sản phẩm:

`Job Portal + Matching Engine + Recommendation Engine + AutoFit Automation + HITL Email Action Channel`

Vòng hoạt động backend:

`Perception → Decision → Action → Learning → Audit`

Luận điểm bảo vệ:

- Không tuyên bố AI tổng quát tốt hơn sản phẩm recruiter thương mại.
- Khác biệt cần nhấn mạnh: phạm vi tuyển dụng IT, scoring có thể giải thích, tách matching/recommendation, policy gating, Human-in-the-Loop, actionable email, feedback learning và auditability.
- Giá trị chính là tích hợp workflow có kiểm soát, không phải một mô hình ML mới.

## Actor và luồng chính

- Guest: xem job/dashboard public; đăng nhập khi apply hoặc dùng tính năng cá nhân.
- Candidate: quản lý CV/profile/portfolio, tìm job, nhận matching/recommendation, apply, feedback, cấu hình AutoFit.
- Recruiter: quản lý JD, xem applicants/potential candidates/ranking, invite, feedback, policy/analytics.
- Admin: dashboard, user/job moderation, audit/email-token monitoring.
- Background Worker/Scheduler: scoring, scan, digest, automation.
- Mail Provider/Email Recipient: actionable email qua magic-link.

Luồng kỹ thuật cốt lõi:

1. CV PDF/form → extraction/OCR → validation → normalization → TF-IDF → cosine scoring → result cards.
2. Candidate preference/profile → recommendation vector → ranked jobs.
3. Feedback → Rocchio update → recompute → score/rank changes.
4. Score/state/consent → AutoFit policy → notify/email/pending/auto-execute.
5. Email GET confirm → POST action → token consumed → audit log.

## Phạm vi kỹ thuật và giới hạn

Core hiện được mô tả bằng:

- Backend Java/Spring Boot, REST, JWT/RBAC, async/scheduler.
- Frontend React/TypeScript/Vite.
- PostgreSQL/Flyway; local host port `5433`, Compose network port `5432`.
- TF-IDF, cosine similarity, score/label/reason, Rocchio feedback.
- CV extraction và OCR fallback, validation/quality signals.
- AutoFit, notifications, email/magic-link, audit.

Không được mô tả như đã hoàn tất nếu chưa kiểm tra code/runtime:

- Redis, message broker, external ATS/job-board integration.
- Semantic embeddings/BERT/LLM matching.
- Enterprise-scale production deployment.
- Hiệu quả trên dữ liệu recruiter thực tế hoặc fairness đã được chứng minh.

## Quy tắc về bằng chứng và số liệu

- Các file `FINAL_*`, `QA_*`, handover/report chỉ là claim cần kiểm tra, không phải nguồn sự thật cuối cùng.
- Trước khi viết kết quả phải chạy lại test/benchmark và lưu environment, commit, timestamp, raw artifacts.
- `ALGORITHM_EVALUATION_REPORT.md` mô tả controlled synthetic benchmark. Dùng để chứng minh causal behavior của Rocchio, không dùng để tuyên bố chất lượng production.
- Không thay dataset/labels chỉ để tạo metric đẹp.
- Tách rõ các nhóm kết quả: algorithm, backend/integration, frontend/E2E, UAT, performance, security và monitoring.
- Nếu chỉ chạy scripted acceptance test mà không có người tham gia thật, không gọi đó là user study.

## Thứ tự ưu tiên nguồn khi viết

1. Code, Flyway migrations, cấu hình và test hiện hành.
2. Fresh runtime evidence/artifacts.
3. API client/frontend routing để xác nhận contract và UX.
4. `srs.md`, `architecture.md`, `proposal.md` để lấy ý định và mô tả tổng quan.
5. Các report cuối kỳ chỉ dùng làm chỉ mục để kiểm tra lại.

## Bản đồ nguồn theo nội dung

- Tổng quan/định vị/scope/demo: `proposal.md`.
- Requirements, actors, use cases, business rules: `srs.md`.
- Architecture, modules, workflows, security/failure modes: `architecture.md`.
- Backend implementation: `Backend/careerfit-backend/BACKEND_CODE_GUIDE.md` và source backend.
- Frontend overview/contracts: `Frontend/FRONTEND_CODE_GUIDE_FOR_BACKEND.md`, `Frontend/src/lib/api.ts`, routes/components.
- Algorithm setup/limitations: `ALGORITHM_EVALUATION_REPORT.md`, evaluator tests và artifact mới chạy.
- Functional tests: `TEST_CASES.md`, `CAREERFIT_E2E_TEST_SCRIPT.md`.
- Acceptance/demo: `UAT_ACCEPTANCE_SCRIPT.md`, `DEMO_FUNCTIONAL_TEST_SCENARIO.md`.
- Runtime/deployment: `README.md`, Compose files, `DEPLOYMENT_CHECKLIST.md`, source configuration.
- Template structure: `Doc/Thesis-Report.docx`.

## Nội dung từng chương đã chốt ở mức kế hoạch

- Chương 1: problem, motivation, objectives, scope, contributions, organization.
- Chương 2: recruitment matching, TF-IDF/cosine, Rocchio, ranking metrics, HITL/explainable automation, web/security foundations, related work/gap.
- Chương 3: requirements/use cases, architecture/modules, ERD, workflows, security/failure/deployment design.
- Chương 4: stack, auth, CV/JD processing, matching/recommendation, feedback, AutoFit, email/audit, persistence/API, frontend overview, deployment/observability.
- Chương 5: research questions, environment/datasets, algorithm protocol, functional/integration, UAT/usability, performance/security, results, threats to validity.
- Chương 6: result summary, discussion, achievements, limitations, future work, conclusion.

Chi tiết xem `Doc/THESIS_REPORT_CONTENT_PLAN.md`.

## Các quyết định còn cần người dùng xác nhận

- Báo cáo chính viết tiếng Anh hay tiếng Việt.
- Quy định chính thức của khoa về số chương, font, margin, citation và giới hạn trang.
- Tên đề tài chính thức đã đăng ký có đúng hoàn toàn với `proposal.md` hay không.
- Có dữ liệu/người tham gia UAT thật và consent hay chỉ dùng scripted acceptance.
- Deadline và độ dài mục tiêu.
- Commit/tag nào được khóa làm phiên bản luận văn.

## Prompt tiếp tục gợi ý cho phiên mới

```text
Hãy đọc Doc/THESIS_REPORT_WORKING_CONTEXT.md và Doc/THESIS_REPORT_CONTENT_PLAN.md trước. Sau đó kiểm tra các nguồn được liệt kê cho [tên chương/mục]. Chưa viết claim hoặc số liệu nếu chưa xác minh với code/runtime/artifact hiện hành. Hãy tạo dàn ý cấp đoạn và danh sách bằng chứng cần thu thập cho [tên chương/mục], rồi chờ tôi duyệt trước khi viết bản đầy đủ.
```

## Trạng thái công việc

- Đã phân tích cấu trúc `Doc/Thesis-Report.docx`.
- Đã tạo kế hoạch nội dung chi tiết.
- Đã tạo file ngữ cảnh này để tái sử dụng sau reset.
- Đã tạo `Doc/CareerFit-Thesis-Report.docx` từ định dạng của file mẫu, bằng tiếng Anh.
- Bản DOCX hiện có trang bìa với placeholder thông tin cá nhân, Acknowledgements, Abstract đã cập nhật theo fresh evidence, các danh mục tự động, bảng từ viết tắt và nội dung cho Chapter 1–6.
- Chapter 2 đã có theoretical background, related work, công thức TF-IDF/cosine/Rocchio/ranking metrics, bảng positioning và 14 tài liệu tham khảo IEEE. Bốn hình của chương vẫn là `NOTE` để bổ sung sau.
- Script tái tạo phần Chapter 2 nằm tại `scripts/update-thesis-chapter2.py`; script có guard để không chèn chương hai lần.
- Chapter 3 đã được viết từ source, security config, scheduler, controllers, entities, Flyway migrations và Compose hiện hành. Nội dung gồm actor, requirements, use cases, modular-monolith architecture, modules, data design, security/failure design và deployment; có 9 `NOTE` cho sơ đồ và 6 bảng.
- Source trung gian và script tái tạo Chapter 3 nằm tại `Doc/working/CHAPTER_3_SOURCE.md` và `scripts/update-thesis-chapter3.py`.
- Đã sửa các claim cũ về email action: implementation hiện tại dùng state-changing GET, raw token và expiry 72 giờ; confirm-then-POST/token hashing được ghi là cải tiến bắt buộc, không phải chức năng đã hoàn tất.
- Chapter 4 đã mô tả implementation thực tế: Java/Spring security, CV ingestion và OCR, normalization, static-corpus TF-IDF, cosine scoring, potential heuristic, matching persistence, Rocchio, application, AutoFit/scheduler, notification/email action, API/JPA/Flyway, frontend integration và observability.
- Các chi tiết cần giữ nhất quán: Spring Boot 3.2.5/Java 21; score label `LOW < 70`, `MEDIUM 70–<90`, `HIGH >= 90`; potential là cờ riêng cho heuristic 35–<75; Rocchio alpha=1.0, beta=0.75, gamma=0.15; auto-apply tối đa 3 application mỗi lần chạy.
- Source trung gian và script Chapter 4 nằm tại `Doc/working/CHAPTER_4_SOURCE.md` và `scripts/update-thesis-chapter4.py`.
- Chapter 5 dùng fresh evidence ngày 2026-07-03: backend 63/63 test; frontend build pass nhưng main JS 802.15 kB có chunk warning; Chromium P0 E2E 4/4; selected auth checks đúng 200/401/403; local Job API sample mean 61.79 ms và p95 85.11 ms; aggregate health 503 DOWN dù liveness/readiness/Prometheus đều 200.
- Controlled benchmark: 50 Jobs, 100 CVs, 300 train + 300 holdout pairs, dataset hash `6e935639ba6d3290dca8ad91a35d714c5e30c7e69a59af23ddbcf89fcc5cc2f2`; nDCG@5 baseline 0.037737 và Rocchio 0.817737, delta +0.78. Ba lần lặp cho metric giống nhau nhưng cả ba log có background `StaleObjectStateException`, nên metric deterministic nhưng runtime chưa sạch.
- Evidence chi tiết: `evidence/CHAPTER5_EVIDENCE_20260703.md`, `evaluation/result.json`, Surefire reports và `evidence/chapter5-benchmark-run-*.log`.
- Source/script Chapter 5: `Doc/working/CHAPTER_5_SOURCE.md`, `scripts/update-thesis-chapter5.py`.
- Chapter 6 đã tổng hợp kết quả, đối chiếu objectives, thảo luận giá trị/positioning, liệt kê limitations, future work và conclusion. Kết luận định vị CareerFit là functioning academic prototype, không phải production hiring system.
- Source/script Chapter 6: `Doc/working/CHAPTER_6_SOURCE.md`, `scripts/update-thesis-chapter6.py`.
- Bản DOCX sau Word QA có 81 trang và khoảng 19,749 từ.
- Việc còn lại: thay placeholder sinh viên/giảng viên/tháng, bổ sung hình/sơ đồ/screenshots từ các `NOTE`, hoàn thiện Appendices, rà soát citation hai chiều, caption/cross-reference, format theo quy định khoa và clean release/evidence archive.
- Chưa soạn bản luận văn hoàn chỉnh.
- Chưa chạy lại benchmark/test/runtime cho số liệu Chương 5.
- Đã chốt ngôn ngữ báo cáo là tiếng Anh và tên đề tài lấy từ `proposal.md`.
- Chưa chốt thông tin sinh viên/giảng viên, commit, deadline và các quy định định dạng bổ sung ngoài file mẫu.

## Cập nhật mới nhất — 2026-07-18 (thay thế các số liệu cũ phía trên)

- File báo cáo chính: `Doc/CareerFit-Thesis-Report.docx`; đã hoàn thiện thông tin bìa: Pham Huu Hung – B2203557, supervisor Ph.D. Nguyen Thanh Khoa, Can Tho, August 2026.
- Báo cáo hiện có 97 trang, khoảng 19,062 từ, 27 bảng và 36 hình/ảnh. Mục lục, danh mục hình và danh mục bảng đã được Word cập nhật.
- Đã đồng bộ báo cáo với working tree tại Git HEAD `65318fb0e0978574c9a04d9e54aecca5ba1eb241`. Working tree còn thay đổi/untracked nên kết quả không thể tái tạo chỉ bằng commit hash.
- Các thay đổi implementation đã đưa vào Chương 3–4: Candidate-only feedback authorization; `AfterCommitExecutor` cho CV/Job matching và Rocchio; privacy-gated candidate portfolio; immediate high/low/no-match notifications có deduplication; hashed email-action tokens với confirm-then-POST; Flyway V1–V15; magic-link route, `/api/auth/me` session restore, `sessionStorage`, CV polling/management, recommendations và market dashboard.
- Fresh backend evidence: 20 Surefire suites, 72 tests, 0 failures/errors/skips; 127 application source files, 22 test source files, 15 Flyway migrations; aggregated Surefire time 244.659 s và command wall time khoảng 266 s.
- Fresh frontend evidence: Vite 6.4.3, 2,417 modules; largest JS chunk 378.44 kB (gzip 112.04 kB); toàn bộ 20 Chromium workflow/contract/resilience tests passed trong 34.1 s.
- Fresh controlled benchmark trong `evaluation/result.json`: baseline/Rocchio — Precision@5 0.012/0.172; Recall@5 0.06/0.86; nDCG@3 0.03/0.83; nDCG@5 0.037737/0.837737; nDCG@10 0.050424/0.850424; MRR 0.058755/0.842665; HitRate@5 0.06/0.86. Final log không còn optimistic-lock exception.
- Đã chụp lại sáu giao diện thật vào `Doc/screenshots/` và nhúng vào báo cáo. Ảnh AutoFit cũ bị trắng đã được thay thế.
- Đã thêm title/alt text cho toàn bộ 36 drawing. Kiểm tra XML không thấy control/invisible/replacement character, repeated-word error hoặc drawing thiếu alt text.
- Kiểm tra style cuối: A4, 3 sections, margin trái 3.0 cm và các lề còn lại khoảng 2.01 cm; nội dung dùng Times New Roman; hierarchy Heading 1/2/3, caption, page break, TOC/list fields nhất quán với mẫu. Bảng hai cột Supervisor/Student ở bìa cố ý không đánh dấu header vì là bảng bố cục.
- Đã render và xem toàn bộ 97 trang. Không có text tràn lề; trang 67 thưa nội dung vì chỉ chứa hai screenshot/caption. Một mã trường Word `TOC \\h \\z ...` bị lộ ở trang vật lý 20 đã được xóa và trang đó đã render lại để xác nhận.
- Backup trước đợt cập nhật: `Doc/working/CareerFit-Thesis-Report-before-20260718-review.docx`.

## Cập nhật mới nhất — 2026-07-22 (language, spelling và Word QA)

- Đã rà soát lại toàn bộ `Doc/CareerFit-Thesis-Report.docx` về chính tả, ngữ pháp, độ tự nhiên, tính nhất quán nội dung, hình ảnh và định dạng Word.
- Đã sửa lỗi thực tế `multiple cv` thành `multiple CVs`; các cảnh báo chính tả còn lại của Word chủ yếu là tên riêng và thuật ngữ/ký hiệu kỹ thuật như CareerFit, Rocchio, nDCG, endpoint, tên lớp và tên tác giả.
- Đã đơn giản hóa khoảng hơn 40 đoạn, ưu tiên từ phổ thông và câu ngắn hơn; vẫn giữ thuật ngữ bắt buộc của luận văn như TF-IDF, cosine similarity, Rocchio, nDCG, API và Human-in-the-Loop.
- Đã sửa mâu thuẫn cũ về email action: implementation hiện tại dùng token entropy cao, chỉ lưu SHA-256 hash, GET để xác nhận không đổi dữ liệu và POST để thực thi/đánh dấu token đã dùng; rate limiting, origin controls và mail-delivery monitoring vẫn là việc production cần bổ sung.
- Đã đổi caption thành `Figure 4.5. Scoring and matching persistence flow` và heading thành `6.3.4 Test Results versus Background Errors`; TOC và List of Figures đã được Word cập nhật.
- Đã rút gọn phần Conclusion để loại bỏ trang gần như trống trước References. Báo cáo cuối hiện có 95 trang và khoảng 19,044 từ.
- Kiểm tra cấu trúc cuối: 721 paragraphs, 27 tables, 36 inline images; 0 ký tự lạ, 0 lỗi từ lặp liền nhau, 0 hình thiếu alt text. Cảnh báo bảng thiếu header duy nhất là bảng bố cục Supervisor/Student trên bìa và được giữ nguyên theo mẫu.
- Đã render và xem toàn bộ tài liệu, đồng thời render lại riêng các trang bị ảnh hưởng bởi cập nhật field/caption/heading/email-action/conclusion. Không thấy clipping, overlap, text tràn lề, ảnh vỡ hoặc lỗi font. Các screenshot giao diện vẫn rõ và đúng caption.
- Backup trước lượt language QA: `Doc/working/CareerFit-Thesis-Report-before-20260722-language-review.docx`.

## Cập nhật mới nhất — 2026-07-26 (cấu trúc mới theo bộ mẫu luận văn)

- File chính vẫn là `Doc/CareerFit-Thesis-Report.docx`; bản sao trước khi đổi cấu trúc nằm tại `Doc/working/CareerFit-Thesis-Report-before-20260726-new-structure.docx`.
- Báo cáo được giữ hoàn toàn bằng tiếng Anh. Không thêm tên đề tài tiếng Việt, Tóm tắt tiếng Việt, Course 48 hoặc nhãn `UNDERGRADUATE THESIS`.
- Tên đơn vị dùng `FACULTY OF SOFTWARE ENGINEERING`; bìa giữ `SOFTWARE DEVELOPMENT THESIS PROJECT`, `COURSE: CT250H`, tên đề tài chính thức, Pham Huu Hung - B2203557, Ph.D. Nguyen Thanh Khoa và Can Tho, August 2026.
- Cấu trúc hiện tại: hai bìa; Acknowledgements; Declaration of Originality; Supervisor's Comments; TOC; List of Tables; List of Figures; List of Abbreviations; Abstract; Introduction; Main Content; Chapter 1 Problem Description and Requirements; Chapter 2 Theoretical Background; Chapter 3 System Design and Implementation; Chapter 4 Testing and Evaluation; Conclusion; References; Appendices A-G.
- Thesis Revision Confirmation và Reviewer/Examiner Comments chưa được đưa vào DOCX. Các việc này được ghi tại `Doc/NOTE_BoSungSau.md`.
- Đã tạo sáu bảng use case có actor, precondition, trigger, main flow, alternative/exception flow và postcondition.
- Đã chuyển và đánh số lại toàn bộ heading, bảng, hình, screen và tham chiếu theo bốn chương mới. TOC, List of Tables và List of Figures đã được Word dựng lại và cập nhật.
- Định dạng áp dụng: A4; cả bìa, phần đầu và thân bài dùng lề trên/dưới/trái/phải 3/3/3.5/2 cm theo yêu cầu chính thức; Times New Roman 13 pt; line spacing 1.2; first-line indent 0.75 cm; caption 11 pt; phần đầu số La Mã và thân bài số Ả Rập từ 1.
- Báo cáo hiện có 82 trang vật lý, khoảng 19,936 từ, 33 bảng và 37 inline image (bao gồm hai logo bìa).
- Đã kiểm tra ký tự lạ, từ lặp, chính tả bằng cspell, heading/caption/field, style, accessibility và toàn bộ 82 trang đã render. Không còn clipping, overlap, bảng vỡ, trang tràn gần trắng hoặc field code hiện ra.
- Sáu screenshot giao diện hiện tại vẫn là bằng chứng triển khai nhưng phần lớn UI đang ở tiếng Việt. Việc chụp lại theo locale tiếng Anh và bổ sung screenshot cho Appendix G được hoãn sang lượt hình ảnh; kế hoạch chi tiết nằm ở phần 5 và 7 của `Doc/THESIS_REPORT_CONTENT_PLAN.md`.
- Script chính của lượt này: `scripts/restructure-thesis-20260726.py`, `scripts/cleanup-thesis-20260726.py` và `scripts/word-rebuild-figure-table-lists-20260726.ps1`.

## Cập nhật mới nhất — 2026-07-30 (áp dụng lề chính thức)

- File chính: `Doc/CareerFit-Thesis-Report.docx`.
- Cả 3 section đều dùng A4 dọc và cùng thông số lề chính thức: trên 3.0 cm, dưới 3.0 cm, trái 3.5 cm, phải 2.0 cm.
- Đã cập nhật lại TOC, List of Tables, List of Figures, số trang và toàn bộ phân trang trong Word.
- TOC được thu gọn nhẹ để loại bỏ một trang tràn gần trắng; các hàng của bảng được đặt không tách qua ranh giới trang.
- Kết quả cuối: 89 trang vật lý; phần Appendices bắt đầu ở trang vật lý 86, tức 85 trang trước phụ lục, nằm trong mức khuyến khích 80-90 trang.
- Đã render và xem lại toàn bộ 89 trang. Không thấy clipping, overlap, bảng/hàng bảng bị vỡ, trang tràn gần trắng hoặc nội dung vượt lề.
- Backup trước khi áp dụng lề: `Doc/working/CareerFit-Thesis-Report-before-required-margins-20260730.docx`.
- Script của lượt này: `scripts/apply-thesis-required-margins-20260730.py` và `scripts/polish-thesis-after-margins-20260730.py`.

## Cập nhật mới nhất — 2026-08-03 (đồng bộ project, nội dung, hình và QA cuối)

- File luận văn chính: `Doc/CareerFit-Thesis-Report.docx`. Backup trước lượt này: `Doc/working/CareerFit-Thesis-Report-before-20260803-project-sync.docx`.
- Source được kiểm tra tại Git HEAD `242e13a8f7d16fc9ebcab9780264c2c2b2b4ef06`; working tree có 197 mục modified/untracked tại thời điểm lấy evidence, nên không được tuyên bố commit này tự nó tái tạo đầy đủ kết quả.
- Auth hiện chỉ dùng đăng ký và email/password JWT; passwordless/magic-link login đã bị loại bỏ. One-time signed token chỉ còn dùng cho email action có GET confirmation không đổi dữ liệu và POST thực thi.
- CV flow hiện tại: upload hoặc manual draft → extraction/image preprocessing/OCR cleanup → section review (`DRAFT`/`REVIEW_REQUIRED`) → Candidate edit/confirm → vectorization → async matching. Không mô tả CV upload là tự chấm điểm ngay trước bước confirm.
- Potential hiện dùng `SkillTransferService` và file model versioned: alias, direct transfer, family transfer, shared foundation, seniority, minimum Potential score 62, skill compatibility 0.50, family compatibility 0.55 và các guard. Potential là cờ/reason riêng, không thay cosine score hoặc nhãn LOW/MEDIUM/HIGH.
- Recruiter flow mới: bắt buộc company profile; JD quality preview; Job DRAFT/publish; urgent flag; application deadline; application count/popularity; server-side Job filters/pagination/sort; applicants; Talent Pool; Potential filter; CV bookmark; invite.
- Candidate/frontend mới: urgent catalogue, CV review, skill/title/location/domain autocomplete, application status tabs, server-side catalogues, per-account AutoFit settings và analytics refetch. Không còn mock fallback khi API lỗi.
- Automation/notification: per-account enable/pause, thresholds, category guards, quota, cooldown, quiet hours, reminders, deduplication và audit/delivery outcomes. Application authorization và notification delivery là hai quyết định có guard riêng.
- Data/schema hiện dùng Flyway V1-V24. `email_token` đã bị drop ở V16; dữ liệu hiện tại bổ sung CV review/draft, Skill catalogue, Potential support, RecruiterCvBookmark, application_count, urgent, account toggle execution và application_deadline.
- Fresh backend evidence ngày 2026-08-03: `mvnw.cmd clean verify` pass; 142 application source files, 35 test source files, 24 migrations, 33 Surefire suites, 131 tests, 0 failures/errors/skips; aggregated Surefire time 102.194 s; JAR build thành công.
- Fresh frontend evidence: TypeScript `--noEmit`, ESLint, Vite build và bundle check đều pass; Vite 6.4.3 transformed 2,361 modules; largest JS chunk 387.39 kB (112.17 kB gzip); 41/41 integrated Playwright tests pass trong 42.1 s bằng desktop Chrome với Vite + current backend + PostgreSQL.
- Controlled benchmark giữ dataset hash `6e935639ba6d3290dca8ad91a35d714c5e30c7e69a59af23ddbcf89fcc5cc2f2`; nDCG@5 0.037737056145 → 0.837737056145, delta 0.80. Chỉ dùng làm bằng chứng cho designed synthetic causal behavior.
- Đã regenerate 7 technical diagrams và nhúng 6 screenshot: urgent Jobs, Candidate AutoFit, CV upload, Recruiter Jobs/applicants, Recruiter Talent Pool/Potential CV, Admin audit. Ảnh dashboard bị clip lúc chụp không được dùng.
- Caption và List of Figures cuối đã đổi cho CV review/confirmation, Potential assessment, AutoFit policy guard và server-side catalogue/API flow.
- Kết quả Word cuối: 90 physical pages, khoảng 19,801 words, 33 tables, 37 inline images; Appendices bắt đầu ở physical page 87 nên có 86 trang trước phụ lục.
- Format cuối: A4, cả 3 section có lề trên/dưới/trái/phải 3.0/3.0/3.5/2.0 cm; body Times New Roman 13 pt, 1.2 lines; caption 11 pt italic; TOC/List of Tables/List of Figures đã refresh.
- Đã render/kiểm tra toàn bộ 90 trang qua Word PDF chunks và PNG contact sheets. Không có clipping, overlap, bảng vỡ, ảnh méo hay blank overflow thật. Accessibility audit: 0 high/medium/low. cspell chỉ còn tên riêng, thuật ngữ và tool/class hợp lệ.
- Script của lượt này: `scripts/generate-thesis-figures.py`, `scripts/update-thesis-20260803.py`, `scripts/fix-thesis-20260803-residuals.py`, và `scripts/fix-thesis-20260803-captions.py`.

## Cập nhật mới nhất — 2026-08-07 (content reporting, evidence mới và font bảng 13)

- File chính: `Doc/CareerFit-Thesis-Report.docx`. Backup: `Doc/working/CareerFit-Thesis-Report-before-20260807-project-sync-and-table-font.docx`.
- Working tree được kiểm tra tại Git HEAD `242e13a8f7d16fc9ebcab9780264c2c2b2b4ef06`; có 209 mục modified/untracked lúc lấy evidence, vì vậy phải giữ nguyên giới hạn về reproducibility.
- Tính năng mới đã đồng bộ vào toàn bộ báo cáo: Candidate chỉ report Job `ACTIVE`; Recruiter report CV phải gửi `jobId`, sở hữu Job đó và có quan hệ Application/Matching để nhìn thấy CV; Administrator có report queue/detail và hành động Ban/Dismiss.
- Report reasons hiện có: `IMPERSONATION`, `FRAUD_SCAM`, `FALSE_INFORMATION`, `INAPPROPRIATE_CONTENT`, `DISCRIMINATION_HARASSMENT`, `PRIVACY_VIOLATION`, `SPAM`, `OTHER`. Report status: `PENDING`, `DISMISSED`, `ACTIONED`. Mỗi reporter-target chỉ có một pending report.
- Flyway hiện là V1-V25. V25 thêm `content_report`, queue/target indexes, `pending_report_count` cho Job/CV, và trạng thái `BANNED`. Ban giải quyết toàn bộ pending report của target, reset counter; CV bị ban không còn là default. Ban/Dismiss đều ghi audit.
- Frontend hiện có report modal cho Candidate Job và Recruiter CV, badge/history cho report state, và tab Administrator `Report moderation` với case detail, Ban, Dismiss.
- Fresh backend 2026-08-07: compile 148 application source files + 37 test source files; 25 migrations; 35 Surefire suites; 141/141 tests pass, 0 failures/errors/skips; aggregated suite time 102.453 s; `clean verify` và JAR build pass.
- Fresh frontend: TypeScript, ESLint, Vite build, bundle check pass; 2,362 modules; charts chunk 387.39 kB (112.63 kB gzip); 46/46 integrated Chrome tests pass trong khoảng 1.2 phút. Ba contract mới cover Candidate report Job, Administrator review/ban Job và Recruiter report CV.
- Toàn bộ nội dung trong 33 bảng đã dùng effective Times New Roman 13 pt; Word COM audit báo 0 cell sai font/size. Paragraph trong bảng dùng single spacing và 0 pt before/after để giữ bố cục gọn.
- Word cuối: 96 physical pages, khoảng 19,952 words, 33 tables, 37 inline images; Appendices bắt đầu ở physical page 93. Cả 3 section vẫn A4 và lề trên/dưới/trái/phải 3.0/3.0/3.5/2.0 cm; body 13 pt, 1.2 lines; caption 11 pt italic.
- Đã refresh TOC/List of Tables/List of Figures/fields/page numbers. Canonical renderer không chạy do workspace không có LibreOffice; đã fallback bằng Microsoft Word export PDF + Poppler render toàn bộ 96 trang và kiểm tra 8 contact sheets. Không thấy clipping, overlap, bảng vỡ, ảnh méo, trang trắng tràn hoặc field code lộ.
- QA cấu trúc: 0 suspicious character, 0 adjacent repeated word, 0 drawing thiếu alt text, 0 bảng thiếu header flag; accessibility audit 0 high/medium/low.
- Script lượt này: `scripts/update-thesis-20260807.py`, `scripts/fix-thesis-20260807-residuals.py`, `scripts/make-docx-contact-sheets.py`.

## Cập nhật mới nhất — 2026-08-09 (chốt 14 use case theo role)

- File chính: `Doc/CareerFit-Thesis-Report.docx`; Word hiện có 100 trang vật lý, khoảng 21.830 từ, 41 bảng và 37 inline image.
- Chapter 1 hiện dùng đúng 14 use case đã chốt: UC-01 CV/profile/portfolio/match; UC-02 tìm kiếm và xem Job; UC-03 application và Recruiter invitation; UC-04 feedback/Rocchio; UC-05 recommendation và analytics; UC-06 AutoFit; UC-07 Candidate/Recruiter report Job hoặc CV hợp lệ; UC-08 company profile và Job lifecycle; UC-09 xử lý applicants; UC-10 Talent Pool và invitation; UC-11 Recruiter analytics/notification settings; UC-12 Admin user/Job visibility; UC-13 Admin report moderation; UC-14 actionable email.
- Ba loại `MATCH_NOTIFICATION`, `DAILY_DIGEST`, `RECRUITER_INVITATION` là ba scenario trong UC-14. Email thông báo vòng đời thụ động không được tách thành use case.
- Quy tắc Admin cần giữ nhất quán: dùng Suspend/Activate cho account và Hide/Restore cho Job; Restore không được biến `DRAFT`, `PAUSED`, `CLOSED`, hoặc `BANNED` thành Job công khai.
- UC-14 giữ mô hình confirm-then-POST: GET chỉ kiểm tra và hiển thị, POST mới thực thi; chỉ lưu SHA-256 token hash; trạng thái `PENDING`/`REDEEMED`/`EXPIRED`; action hợp lệ gồm match feedback, per-Job digest feedback/unsubscribe và invitation accept/decline.
- Figure 1.4 đã được thay bằng sơ đồ tổng quan 14 use case. Figures 1.5-1.8 được giữ và đặt cạnh UC tương ứng. Actor table, functional requirements, Chapter 1 summary và Appendix A traceability đã được cập nhật.
- TOC, List of Tables, List of Figures và pagination đã refresh. UC-05 có page break chủ động để tránh tiêu đề/caption chỉ đi cùng hàng header ở cuối trang.
- QA: 874/874 ô bảng có effective Times New Roman 13 pt; 0 ký tự lạ, 0 repeated word liền nhau, 0 hình thiếu alt text, 0 bảng thiếu repeating-header flag; accessibility audit 0 high/medium/low. Đã render Word → PDF → PNG và kiểm tra toàn bộ bố cục cùng riêng trang use case; không thấy clipping, overlap, bảng vỡ, ảnh méo, blank overflow hay field code lộ.
- Script: `scripts/update-thesis-usecases-20260809.py`, `scripts/word-table-font-audit-20260809.ps1`, `scripts/make-docx-contact-sheets-20260809.py`.

## Cập nhật mới nhất — 2026-08-09 (khung hai trang bìa)

- Hai trang đầu của `Doc/CareerFit-Thesis-Report.docx` đã đổi từ khung một nét sang khung đôi màu đen theo hình mẫu người dùng cung cấp.
- Khung cách mép giấy 12 pt, khoảng 4,2 mm, ở cả bốn cạnh; cấu hình độ rộng double-line là 2,25 pt.
- Khung chỉ nằm ở section đầu chứa hai trang bìa. Acknowledgements và toàn bộ các trang sau không có khung.
- Nội dung bìa, lề chính thức và pagination không thay đổi; báo cáo vẫn có 100 trang. Đã export và kiểm tra trực quan cả hai trang bìa.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260809-double-cover-border.docx`; script: `scripts/update-cover-double-border-20260809.py`.

## Cập nhật mới nhất — 2026-08-09 (đánh số tiêu đề Introduction)

- Các mục chính trong Introduction đã được đánh số `1` đến `7`; các mục con dùng `3.1`/`3.2`, `4.1`/`4.2`, và `5.1`/`5.2`.
- Heading style và phân cấp Heading 2/Heading 3 được giữ nguyên; TOC đã refresh và hiển thị cùng hệ thống số.
- Đoạn `7. Thesis Structure` được rút gọn để giữ nguyên ý chính nhưng loại bỏ trang tiếp nối gần như trống trước Part 2.
- Báo cáo hiện có 99 trang vật lý và khoảng 21.819 từ. Đã render và kiểm tra TOC cùng toàn bộ Introduction; không có heading bị cắt, chồng hoặc rơi riêng cuối trang.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260809-introduction-numbering.docx`; scripts: `scripts/number-introduction-headings-20260809.py`, `scripts/compact-introduction-ending-20260809.py`.

## Cập nhật mới nhất — 2026-08-09 (xóa Figure 1.1 và 1.2 khỏi Introduction)

- Đã xóa hoàn toàn hai hình Introduction cũ: `CareerFit problem context and principal information flows` và `Scope boundary of the CareerFit thesis`, gồm image paragraph và caption.
- Không có đoạn nội dung nào tham chiếu trực tiếp tới hai hình này, nên không còn cross-reference bị đứt.
- Sáu hình còn lại của Chapter 1 đã được đánh số lại liên tục: Figure 1.1 System context; Figure 1.2 Use-case overview; Figure 1.3 CV sequence; Figure 1.4 Feedback sequence; Figure 1.5 AutoFit flow; Figure 1.6 Email-action sequence.
- List of Figures, TOC, fields và pagination đã refresh. Introduction nằm ở physical pages 14-18; Part 2 bắt đầu tại physical page 19.
- File hiện có 98 trang vật lý, khoảng 21.783 từ, 41 bảng và 35 inline image. QA: 0 hình thiếu alt text, 0 ký tự lạ, 0 repeated word liền nhau; không thấy clipping hoặc caption hỏng.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260809-remove-introduction-figures.docx`; script: `scripts/remove-introduction-figures-20260809.py`.

## Cập nhật mới nhất — 2026-08-09 (đặc tả 14 Use Case đã duyệt)

- `Doc/CareerFit-Thesis-Report.docx` hiện giữ chính xác `UC-01` đến `UC-14`, mỗi bảng dùng 13 field và nhãn chung `Primary Actor(s)`.
- UC-06 đã có A6 lưu cấu hình mà không chạy thủ công. UC-14 dùng E2 `Action was already redeemed`; E3 chỉ xử lý hết hạn.
- Đã đồng bộ heading 1.5.1-1.5.14, caption, TOC, List of Tables, Figure 1.2, actor table, Table 1.3, Appendix A và các đoạn Chapter 3 liên quan.
- Figure 3.8 đã đổi thành `Per-account notification policy guard`; quota/cooldown/quiet hours được trình bày là điều kiện gửi thông báo, tách khỏi AutoApply eligibility.
- AutoApply đã đối chiếu code: threshold 50-100; Candidate phải có default CV `SCORING_DONE`; Job phải `ACTIVE`; bỏ qua Application trùng; tối đa 3 Application mỗi lượt; không dùng deadline, quota, cooldown, quiet hours hoặc email preference làm điều kiện ứng tuyển.
- Email action đã đối chiếu code: GET chỉ xác nhận; POST mới thực hiện; POST thành công lưu `REDEEMED`; POST link hết hạn lưu `EXPIRED`; `VIEW_JOB` chưa redirect và `UNSUBSCRIBE_DIGEST` chưa cập nhật policy nên không được ghi là luồng UC-14 thành công.
- Audit cuối: 14 heading/caption/table đúng ID và tên; tất cả run có nội dung trong bảng là Times New Roman 13; A4, lề 3/3/3.5/2 cm, body 13 pt, line spacing 1.2; không có ký tự U+FFFD hoặc NUL.
- Word-native render trước chỉnh nhãn Figure 3.8 (ảnh thay cùng kích thước nên không đổi pagination): 124 trang, khoảng 26.734 từ; đã kiểm tra trực quan toàn bộ contact sheets và các trang Use Case/Chapter 3 bị ảnh hưởng.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260809-approved-usecase-specifications.docx`; script: `scripts/update-approved-usecase-specifications-20260809.py`.

## Cập nhật mới nhất — 2026-08-09 (quy tắc vị trí caption)

- Đã chuyển caption `Table 1.1. Mapping of objectives, contributions, and evidence` lên ngay trên bảng.
- Toàn bộ tài liệu hiện thống nhất: 39 table caption nằm ngay trên table; 33 figure/screen caption nằm ngay dưới hình.
- Caption bảng được đặt `keep with next`; image paragraph được giữ cùng figure caption để hạn chế tách trang.
- Đã refresh TOC, List of Tables, List of Figures và các field. Hai lỗi `Error! Bookmark not defined` từng xuất hiện ở Figure 1.2 và Figure 3.8 đã được sửa.
- Word render giữ 124 trang; trang Table 1.1 và List of Figures đã được kiểm tra trực quan, không có lỗi chồng, cắt hoặc khoảng cách bất thường.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260809-caption-placement.docx`; script: `scripts/fix-caption-placement-20260809.py`.

## Cập nhật mới nhất — 2026-08-10 (sắp xếp Use Case theo actor)

- Thứ tự mới: Candidate `UC-01`–`UC-07`; Recruiter `UC-08`–`UC-11`; Candidate/Recruiter dùng chung `UC-12`; Administrator `UC-13`–`UC-14`.
- Mapping ID: `UC-14` cũ → `UC-07`; `UC-07` cũ → `UC-12`; `UC-12` cũ → `UC-13`; `UC-13` cũ → `UC-14`.
- `UC-07` mới là Respond Through Actionable Email; `UC-12` mới là Report Suspicious Recruitment Content; `UC-13` mới là Administer Platform Access and Job Visibility; `UC-14` mới là Review and Resolve Content Reports.
- Đã di chuyển nguyên khối heading-caption-table-figure, cập nhật Related Use Cases, Chapter 3, Appendix A, TOC và List of Tables.
- Không chỉnh ảnh Figure 1.2 theo yêu cầu. Đã thêm NOTE tiếng Anh ngay dưới hình và ghi nhiệm vụ vẽ lại trong `NOTE_BoSungSau.md`.
- File có 125 trang sau khi thêm NOTE. Đã render/kiểm tra trang Figure 1.2, các điểm chuyển Candidate → Recruiter → Shared → Admin và cuối Chapter 1; không thấy clipping, overlap hoặc bảng vỡ.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260810-usecase-reorder.docx`; script: `scripts/reorder-usecases-by-actor-20260810.py`.

## Cập nhật mới nhất — 2026-08-11 (rút gọn nội dung bảng Use Case)

- Chỉ chỉnh nội dung trong 14 bảng Use Case; không đổi đoạn ngoài bảng, bảng khác, heading, caption, hình, ID, tên, actor hoặc priority.
- Tổng số từ trong Description/Preconditions/Trigger/Main Flow/Alternative Flows/Exception Flows/Postconditions/Related Use Cases giảm từ 6.561 xuống 4.549, tương đương 30,7%.
- Giữ đủ business rule quan trọng của UC-01–UC-14, đặc biệt UC-04/05/06, actionable email UC-07, shared reporting UC-12 và moderation UC-14.
- Báo cáo giảm từ 125 xuống 116 trang; vùng Use Case giảm khoảng 9 trang.
- Cả 14 bảng vẫn có header + 13 field; mọi run có nội dung trong bảng là Times New Roman 13 pt.
- Audit xác nhận non-field paragraphs và non-Use-Case tables giống backup; không có bookmark error, U+FFFD hoặc NUL.
- Đã Word-export PDF và kiểm tra contact sheet của toàn bộ physical pages 24–52 cùng các trang dày/điểm chuyển bảng; không thấy clipping, overlap hoặc row bị cắt.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-shortened-usecases.docx`; script: `scripts/shorten-usecase-tables-20260811.py`.

## Cập nhật mới nhất — 2026-08-11 (bổ sung năm sơ đồ Use Case)

- Đã kiểm tra năm hình người dùng chèn: Overall, Candidate, Recruiter, shared Candidate–Recruiter reporting và Administrator.
- Figure 1.2 đã thay bằng sơ đồ tổng quan mới; bốn sơ đồ theo nhóm actor được đặt cạnh phần đặc tả tương ứng.
- Chapter 1 hiện có Figure 1.1–1.9 liên tục. Caption mới: Figure 1.2 Overall; Figure 1.3 Candidate; Figure 1.7 Recruiter; Figure 1.8 shared reporting; Figure 1.9 Administrator.
- Tất cả năm hình được căn giữa, caption đặt ngay dưới hình; tiêu đề chữ gõ lặp bên ngoài hình và đoạn heading trống đã được xóa.
- Sơ đồ UC-12 trong file thực tế dùng đúng hai actor Recruiter và Candidate. Ghi chú tạm yêu cầu vẽ lại Figure 1.2 đã được xóa khỏi tài liệu và `NOTE_BoSungSau.md`.
- Đã refresh TOC, List of Tables, List of Figures và toàn bộ field bằng Microsoft Word. Bản Word sau cập nhật có 117 trang vật lý; mục 1.3 bắt đầu ở trang mới để không dính caption Figure 1.2.
- Đã export PDF và kiểm tra trực quan các trang List of Figures cùng năm sơ đồ. Không thấy hình/caption bị cắt, chồng hoặc sai vị trí.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-five-usecase-captions.docx`; scripts: `scripts/caption-five-usecase-images-20260811.py`, `scripts/finalize-usecase-figure-layout-20260811.py`.

## Cập nhật mới nhất — 2026-08-11 (sắp lại Chapter 2 và Chapter 3 theo mẫu mới)

- Giữ nguyên toàn bộ 14 Use Case và nội dung chuyên môn; audit xác nhận 14 bảng Use Case giống hệt backup trước khi sắp chương.
- Chapter 2 đổi thành `THEORETICAL BACKGROUND` và kết thúc tại `2.10 Theoretical Background Summary`.
- Các khối thiết kế cũ 2.11-2.15 chuyển sang Chapter 3 thành 3.1-3.5: architecture, modules, data, security/failure/consistency và deployment.
- Chapter 3 đổi thành `SYSTEM DESIGN AND IMPLEMENTATION`; phần implementation cũ được đánh số lại từ 3.6 đến 3.19.
- Figures 2.5-2.7 đổi thành Figures 3.1-3.3; Figures 3.1-3.10 cũ đổi thành Figures 3.4-3.13. Tables 2.2-2.4 đổi thành Tables 3.1-3.3; Tables 3.1-3.6 cũ đổi thành Tables 3.4-3.9.
- `PART 4. REFERENCES` đổi thành `REFERENCES`; `PART 5. APPENDICES` đổi thành `APPENDICES`.
- Khôi phục hai ảnh feedback recomputation và AutoFit decision từ backup vì ảnh đã bị mất nhưng caption vẫn còn sau lần người dùng chèn năm Use Case diagram.
- Word cuối có 118 trang vật lý. Bốn chương chính chiếm logical pages 6-91, khoảng 86 trang, nằm trong yêu cầu 70-120 trang nội dung cốt lõi.
- TOC, List of Tables, List of Figures và toàn bộ fields đã refresh. 14 nguồn [1]-[14] vẫn được trích đủ; 1.036 ô bảng vẫn Times New Roman 13 pt.
- Đã export PDF, render và kiểm tra toàn bộ 118 trang qua 10 contact sheets cùng các trang chuyển chương ở độ phân giải đầy đủ; không thấy clipping, overlap, caption treo, bảng vỡ hoặc field error.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-chapter-restructure.docx`; scripts: `scripts/restructure-thesis-chapters-20260811.py`, `scripts/finalize-chapter-restructure-20260811.py`, `scripts/restore-missing-usecase-flow-images-20260811.py`, `scripts/audit-chapter-restructure-20260811.py`.

## Cập nhật mới nhất — 2026-08-11 (đưa flowchart thuật toán sang Chapter 3)

- Giữ nguyên toàn bộ 14 bảng Use Case đã duyệt; checksum nội dung bảng giống backup trước chỉnh sửa.
- Đã xóa ba hình quy trình không thuộc Use Case khỏi Chapter 1. Chapter 1 hiện chỉ còn Figure 1.1-1.6: system context, overall Use Case, Candidate, Recruiter, shared Candidate-Recruiter reporting và Administrator.
- Đã vẽ lại bốn flowchart đơn sắc, khổ lớn theo ký hiệu chuẩn: CV ingestion/review/confirmation/matching; CV-Job matching và Potential; Rocchio feedback-learning/recomputation; AutoFit eligibility/application decision.
- Vị trí mới trong Chapter 3: Figure 3.6, Figure 3.8, Figure 3.9 và Figure 3.11. Ba hình phía sau đổi số thành Figure 3.12 notification guard, Figure 3.13 actionable email, Figure 3.14 frontend flow.
- Flowchart AutoFit bám đúng project: policy enabled, default CV `SCORING_DONE`, Job `ACTIVE`, threshold cấu hình, bỏ Application trùng, tối đa ba Application mỗi run. Email quota/cooldown/quiet hours/preferences được ghi rõ là kiểm tra riêng, không phải AutoApply eligibility.
- Đã refresh TOC, List of Figures và toàn bộ Word fields. Bản cuối có 121 trang vật lý; 41 bảng; 1.036 ô bảng vẫn Times New Roman 13 pt; 14 heading Use Case còn nguyên.
- Đã raster hóa PDF do Word xuất và kiểm tra toàn bộ 121 trang qua contact sheets; kiểm tra riêng physical pages 78, 82, 84 và 87 ở độ phân giải đầy đủ. Không thấy clipping, overlap, caption sai vị trí hoặc nhánh flowchart khó đọc.
- File hình nguồn nằm trong `Doc/figures/`: `flowchart-cv-processing-20260811.png`, `flowchart-matching-potential-20260811.png`, `flowchart-rocchio-feedback-20260811.png`, `flowchart-autofit-20260811.png`.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-standard-flowcharts.docx`; scripts chính: `scripts/generate-standard-flowcharts-20260811.py`, `scripts/relocate-and-replace-flowcharts-20260811.py`, `scripts/audit-standard-flowcharts-20260811.py`.

## Cập nhật mới nhất — 2026-08-11 (vẽ thêm Figure 3.7, 3.12 và 3.13)

- Đã đối chiếu trực tiếp `TfIdfService`, `NotificationPolicyGuard` và `EmailActionController` trước khi vẽ.
- Figure 3.7 đổi thành flowchart seed-corpus/TF-IDF: 49 seed documents, document frequency, smoothed IDF, unknown-term IDF, empty-token branch và sparse vector.
- Figure 3.12 đổi thành flowchart notification guard: recipient, global/type preference, quiet hours, daily quota, duplicate context, category cooldown, delivery và SENT/FAILED log.
- Figure 3.13 đổi thành flowchart actionable email: GET hash/confirm không đổi state; POST kiểm tra lại; expired POST ghi EXPIRED; chỉ mô tả Matching Feedback và Recruiter invitation là business action đã xác minh; thành công ghi REDEEMED.
- Không đổi narrative, bảng, Use Case, ID hoặc implementation. Checksum 41 bảng giống backup; 1.036 ô bảng vẫn Times New Roman 13 pt; 14 Use Case còn nguyên.
- Đã refresh TOC/List of Figures. Bản Word cuối có 124 trang vật lý. Đã kiểm tra toàn bộ 124 trang qua contact sheets và kiểm tra riêng physical pages 80, 90, 92 ở độ phân giải đầy đủ; không có clipping, overlap hoặc caption lỗi.
- PNG nguồn: `Doc/figures/flowchart-tfidf-construction-20260811.png`, `flowchart-notification-policy-20260811.png`, `flowchart-email-action-redemption-20260811.png`.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-additional-flowcharts.docx`; script: `scripts/replace-additional-flowcharts-20260811.py`.

## Cập nhật mới nhất — 2026-08-11 (loại bỏ style hộp xanh và chuẩn hóa hình chuyên môn)

- Đã xóa toàn bộ Figure 2.1-2.4 dạng các hộp nối mũi tên vì nội dung đã được giải thích trong phần lý thuyết; Chapter 2 hiện không còn figure.
- Đã xóa Figure 4.1 cũ về môi trường đánh giá và Figure 4.3 cũ về P0 workflow vì trùng với Table 4.1 và Table 4.5.
- Đã thay các hình cần giữ bằng ký pháp chuyên biệt, đơn sắc: UML component, crow's-foot ERD, UML deployment, layered component, sequence diagram, state machine và sequence frontend/API.
- Biểu đồ latency được vẽ lại thành statistical range plot thực, dùng min 44,99 ms, p50 55,20 ms, mean 61,79 ms, p95 85,11 ms và max 99,32 ms trên 50 request.
- Chapter 4 hiện có Figure 4.1 benchmark Rocchio và Figure 4.2 latency. Caption và List of Figures đã refresh; không còn caption Figure 2.x.
- Giữ nguyên sáu hình context/Use Case ở Chapter 1, bảy flowchart thuật toán chuẩn ở Chapter 3, 14 Use Case đã duyệt, 41 bảng, 1.036 ô bảng và toàn bộ implementation.
- Bản Word cuối có 122 trang vật lý; phần nội dung cốt lõi từ Introduction đến Conclusion dài 103 trang logical, nằm trong yêu cầu 70-120 trang.
- QA cuối: Chapter 1/2/3/4 có lần lượt 6/0/14/2 figure; caption hình nằm ngay dưới ảnh; List of Figures khớp; tất cả drawing có alt text; không có clipping, overlap, caption vỡ, hình khó đọc hoặc blank overflow.
- Đã render và xem toàn bộ 122 trang; các physical pages 11, 64, 67, 70, 72, 74, 85, 94, 103 và 107 được kiểm tra ở độ phân giải đầy đủ.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-remove-placeholder-diagrams.docx`.
- Scripts: `scripts/generate-professional-diagrams-20260811.py`, `scripts/remove-placeholder-and-replace-diagrams-20260811.py`, `scripts/fix-professional-diagram-pagination-20260811.py`.

## Cập nhật mới nhất — 2026-08-11 (khung chính xác cho hai trang bìa)

- Đã bỏ khung double mô phỏng trước đó và sao chép trực tiếp cấu hình page border từ section đầu của `Doc/mau-luan-van/Thesis template_SE_English_updated.docx`.
- Khung hiện dùng đúng Word border art `twistedLines1` của mẫu: đường chính màu xanh đậm, các đường đen mảnh đi kèm và chi tiết ô vuông giao nhau ở bốn góc.
- Khung chỉ áp dụng cho section đầu, tức physical pages 1-2. Trang 3 và các phần phía sau không có khung.
- Không thay đổi nội dung bìa, ảnh, bảng, drawing, section hoặc phân trang; tài liệu vẫn có 122 trang vật lý.
- Đã refresh fields, xuất PDF bằng Microsoft Word và kiểm tra pages 1-2 ở độ phân giải đầy đủ; kiểm tra riêng page 3 để xác nhận khung không bị kéo sang phần Acknowledgements.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-template-cover-border.docx`; script: `scripts/copy-template-cover-border-20260811.py`.

## Cập nhật mới nhất — 2026-08-11 (chuẩn hóa Data Design theo CDM → LDM → PDM → Data Dictionary)

- Section 3.3 hiện gồm: `3.3.1 Data Design Overview`, `3.3.2 Conceptual Data Model`, `3.3.3 Logical Data Model`, `3.3.4 Physical Data Model`, `3.3.5 Data Dictionary`.
- Đã kiểm tra trực tiếp database CareerFit sau Flyway V1-V25: schema cuối có 24 table đang hoạt động và 293 column. Bảng `email_token` cũ không được đưa vào vì migration V16 đã xóa.
- Đã bổ sung chín hình đơn sắc theo style draw.io: một CDM tổng quan; bốn LDM theo cụm Identity/Career Profile, Recruitment/Matching, Automation/Communication, Governance/Analytics; và bốn PDM tương ứng. Hình dùng hộp entity/table, header xám nhạt, đường nối vuông góc, cardinality và PK/FK; không dùng kiểu pipeline hộp xanh.
- Appendix C đổi thành `Full Data Dictionary`, gồm một table catalogue và 24 bảng từ điển thuộc tính. Mỗi column có PostgreSQL type, nullable, PK/FK/UQ, default/check constraint và mô tả tiếng Anh ngắn.
- Các figure Chapter 3 phía sau được đánh lại thành Figure 3.11-3.22. TOC, List of Tables, List of Figures, caption, cross-reference và số trang đã refresh bằng Microsoft Word.
- Quy tắc trình bày được giữ: caption bảng ở trên, caption hình ở dưới; nội dung table Times New Roman 13; A4 với lề trên/dưới/trái/phải 3/3/3,5/2 cm.
- Bản cuối có 182 trang vật lý. Nội dung chính từ Introduction đến Conclusion kết thúc tại logical page 111; Data Dictionary chi tiết nằm trong phụ lục nên không làm vượt giới hạn 70-120 trang nội dung cốt lõi.
- Audit: 66 bảng, 38 drawing, Figure 3.1-3.22 liên tục, 25 caption Appendix C, đủ 24 dictionary table và 293 column; không có bookmark error, U+FFFD hoặc NUL.
- Đã render và xem toàn bộ 182 trang; không thấy clipping, overlap, caption rời hình/bảng, bảng vỡ, sơ đồ khó đọc hoặc blank overflow.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-data-design.docx`.
- Scripts: `scripts/generate-data-design-diagrams-20260811.py`, `scripts/apply-data-design-restructure-20260811.py`, `scripts/fix-data-design-caption-spacing-20260811.py`, `scripts/fix-data-design-figure-pagination-20260811.py`, `scripts/audit-data-design-restructure-20260811.py`.

## Cập nhật mới nhất — 2026-08-11 (căn lại flowchart và phóng lớn hình)

- Đã vẽ lại bảy flowchart Chapter 3, giữ nguyên nội dung nghiệp vụ/thuật toán đã xác minh.
- Nhãn `YES/NO` được đưa ra khỏi cạnh decision, có khoảng trắng nền để không dính mũi tên; các hộp kết quả bên phải được căn tâm với decision và các nhánh ngang được làm thẳng.
- Flowchart trong Word tăng từ 5,20 lên 5,30 inch; chiều cao của hình lớn nhất vẫn nằm vừa vùng nội dung A4 cùng caption.
- Toàn bộ technical diagram, CDM/LDM/PDM, screenshot và chart còn lại trong Chapter 3-4 được tăng lên 6,10 inch, tương ứng gần đúng chiều rộng nội dung tối đa 15,5 cm.
- TOC, List of Figures, field và số trang đã refresh. Bản cuối có 183 trang vật lý; phần nội dung chính kết thúc tại logical page 112, vẫn đạt yêu cầu 70-120 trang.
- Đã render và kiểm tra các trang hình ở độ phân giải đầy đủ; không có clipping, overlap, caption rời hình hoặc nhãn/mũi tên chạm chữ. Nội dung văn bản và 66 bảng không thay đổi.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-figure-refinement.docx`.
- Scripts: `scripts/generate-standard-flowcharts-20260811.py`, `scripts/refine-and-enlarge-thesis-figures-20260811.py`.

## Cập nhật mới nhất — 2026-08-11 (căn trái Appendix C và hoàn thiện khoảng cách flowchart)

- Toàn bộ nội dung của 25 bảng trong Appendix C đã được căn trái, kể cả header. Các ô được căn trên, dùng Times New Roman 13 pt và có độ rộng cột cố định theo vùng nội dung A4 rộng 15,5 cm.
- Đã xóa một hàng trống hoàn toàn ở cuối Table App.C.25. Số liệu đúng vẫn là 24 bảng dữ liệu và 293 thuộc tính lưu trữ.
- Đã vẽ và chèn lại bảy flowchart Chapter 3. Chữ trong decision có khoảng đệm lớn hơn; các ô nhánh phụ được tách xa; nhãn YES/NO không còn đè viền; đường nhánh dùng các đoạn ngang/dọc rõ và có đầu mũi tên nhìn thấy được.
- Không thay đổi nội dung nghiệp vụ, thuật toán, Use Case hay implementation. Caption và vị trí hình giữ nguyên; flowchart vẫn rộng 5,30 inch.
- TOC, List of Tables, List of Figures, field và pagination đã refresh bằng Microsoft Word. File cuối có 183 trang vật lý.
- Audit cuối: 66 bảng, 38 drawing, 25 caption Appendix C, 24 dictionary table, 293 dictionary row; A4 và lề 3/3/3,5/2 cm; nội dung bảng 13 pt; không có bookmark error, U+FFFD hoặc NUL.
- Đã xuất PDF bằng Word, raster hóa và xem toàn bộ 183 trang qua contact sheets; kiểm tra riêng bảy trang flowchart và các trang Appendix C ở độ phân giải đầy đủ.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-flowchart-and-dictionary-fix.docx`.
- Scripts: `scripts/generate-standard-flowcharts-20260811.py`, `scripts/fix-appendix-c-alignment-and-flowcharts-20260811.py`.

## Cập nhật mới nhất — 2026-08-11 (bổ sung Functional Design theo mẫu)

- Đã thêm `3.4 Functional Design` ngay sau Data Design. Mỗi chức năng có Purpose, ảnh giao diện thật được đánh số, bảng giải thích các số, Processing Logic và sequence diagram khổ lớn.
- Candidate gồm Explore Jobs, Manage AutoFit, Upload and Confirm a CV; Recruiter gồm Manage Job Postings and Applicants, Manage Talent Pool and Invitations; Administrator gồm Review Administrative Audit Activity.
- Sáu screenshot cũ ở Frontend Integration được chuyển về đúng chức năng và đánh marker; không tạo UI hoặc hành vi mới. Frontend Integration chỉ còn nội dung tích hợp tổng quát, tránh lặp hình.
- Đã thêm Table 3.3-3.8 và Figure 3.11-3.22. Không lặp bảng Data Used vì Section 3.3 và Appendix C đã chứa Data Design/Data Dictionary đầy đủ.
- Sequence diagram được vẽ lại đơn sắc, chữ lớn, đường thẳng, có mũi tên đầy đủ và không chồng chữ/khung. Hình dùng gần hết chiều rộng nội dung A4 và caption nằm dưới hình.
- Đã đổi số toàn bộ heading, figure và table phía sau; refresh TOC đến Heading 4, List of Figures, List of Tables và field bằng Microsoft Word.
- File cuối có 193 trang vật lý, 72 bảng và 44 drawing. Chapters 1-4 nằm ở logical pages 6-113, tổng 108 trang, đạt yêu cầu 70-120 trang nội dung cốt lõi.
- Đã render và kiểm tra toàn bộ trang Functional Design ở độ phân giải đầy đủ; không có clipping, overlap, caption rời hình/bảng hoặc bảng bị tách vô lý.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-functional-design.docx`.
- Scripts chính: `scripts/generate-functional-design-assets-20260811.py`, `scripts/add-functional-design-section-20260811.py`, `scripts/refine-functional-design-layout-20260811.py`, `scripts/compact-functional-design-section-20260811.py`, `scripts/replace-functional-design-sequences-20260811.py`.

## Cập nhật mới nhất — 2026-08-12 (rút gọn nội dung có kiểm soát)

- Đã thực thi toàn bộ kế hoạch rút gọn đã duyệt cho Introduction, Chapter 2, Chapter 3, Chapter 4 và Conclusion; không thay đổi implementation, 14 Use Case, Functional Design, Data Design, hình hoặc phụ lục.
- Ba mục người dùng yêu cầu giữ nguyên là `2.2.2 Bag-of-Words Representation`, `2.3.1 Term Frequency and Inverse Document Frequency`, `2.3.2 Cosine Similarity`. Audit so với backup xác nhận nội dung và style paragraph của cả ba mục không đổi.
- Introduction được tách vai trò rõ hơn: Problem nêu vấn đề, Background nêu khoảng trống, Objectives nêu mục tiêu, Scope nêu giới hạn, Contributions nêu đóng góp.
- Chapter 2 rút phần kiến thức phổ thông; giữ nội dung riêng của CareerFit về Vietnamese text/OCR/technical token, Matching, Rocchio, evaluation, HITL, security, actionable email và audit. Đã dùng citation `[2]` hiện có cho phần normalization và evaluation metric liên quan.
- Chapter 3 bổ sung mô tả ngắn cho CDM/LDM và bỏ các đoạn lặp về stack, Appendix C, JWT/authorization, deployment/observability, persistence/API và danh sách frontend. Không cắt Functional Design.
- Chapter 4 rút phần liệt kê test, gộp mô tả trùng về `StaleObjectStateException`, runtime health/mail/Prometheus và summary. Không chạy lại test và không thay số liệu bằng kết quả chưa xác minh.
- Conclusion được cô đọng mạnh để tránh lặp danh sách chức năng, test và limitation đã trình bày ở Chapter 3-4.
- Word count: 31.704 → 29.849; số trang vật lý: 193 → 190. Chapters 1-4 nằm ở logical pages 6-111, tổng 106 trang, đạt yêu cầu nội dung chính 70-120 trang.
- QA cuối: 1.102 paragraph, 72 table, 44 drawing, đủ 14 Use Case heading; không có field-reference error, bookmark error, U+FFFD hay NUL. Đã export qua Microsoft Word và xem các trang phần chính bằng contact sheet; không thấy clipping, caption rời, bảng/hình vỡ hoặc blank page bất thường.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260812-content-reduction.docx`.
- Scripts: `scripts/reduce-thesis-content-20260812.py`, `scripts/audit-content-reduction-20260812.py`.

## Cập nhật mới nhất — 2026-08-12 (bổ sung nguồn website tuyển dụng)

- References hiện có 19 nguồn. Đã thêm `[15]` ITviec, `[16]` CareerViet, `[17]` TopDev, `[18]` TopCV Pro và `[19]` bài CareerViet Talent Community về AI Matching.
- Introduction Section 2 dùng `[15]`-`[18]` để mô tả bối cảnh thực tế của các cổng tuyển dụng Việt Nam. Nội dung chỉ nêu vai trò thực hành của các portal, không dùng chúng làm bằng chứng khoa học cho chất lượng thuật toán.
- Section 2.9 dùng `[19]` và ghi rõ bài CareerViet là nguồn cảm hứng thực tế cho project, không phải bằng chứng học thuật về algorithmic effectiveness.
- Mỗi nguồn web có organization, page title, `[Online]`, URL clickable và ngày truy cập `Aug. 12, 2026`.
- Đã refresh field/pagination và render kiểm tra pages 1, 47, 119-121 logical. Tài liệu vẫn 190 trang vật lý; References kết thúc ở logical page 120 và Appendices bắt đầu ở page 121.
- Audit: 19 reference paragraph, đủ citation `[15]`-`[19]`, không có field error; 72 table, 44 drawing, 14 Use Case; ba mục 2.2.2, 2.3.1, 2.3.2 vẫn không đổi.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260812-web-references.docx`; script: `scripts/add-recruitment-web-references-20260812.py`.

## Cập nhật mới nhất — 2026-08-12 (kiểm duyệt nội dung, định dạng và bằng chứng cuối)

- File chuẩn tiếp tục là `Doc/CareerFit-Thesis-Report.docx`; không thay đổi implementation và không bổ sung chức năng mới.
- Đã chuẩn hóa theo mẫu mới của giảng viên: Times New Roman 13 pt cho nội dung và bảng, giãn dòng 1,2; Heading 1-4 thống nhất; caption 12 pt italic; caption bảng ở trên và caption hình ở dưới.
- Đã sửa toàn bộ nguyên nhân làm khoảng cách giữa hai từ bị giãn: nội dung bảng căn trái; 11 đoạn ngắn hoặc có identifier dài được căn trái thay vì justify. Audit cuối còn 0 đoạn có nguy cơ wide-word-spacing và 0 font trực tiếp ngoài Times New Roman.
- Hai paragraph rỗng dùng để chứa section break trước Appendix C/D đã đổi từ Heading 2 sang Normal nên không tạo mục rỗng trong TOC. Heading 3 rỗng trước 1.5.1 mà người dùng đã xóa không xuất hiện lại.
- Appendix A và Appendix B được trình bày thành hai bảng gọn. Appendix C chuyển sang landscape, giữ đủ 24 bảng dữ liệu và 293 thuộc tính; nội dung căn trái, 13 pt, số trang liên tục.
- Conclusion dùng nhãn `Table Con.1`-`Table Con.3`. TOC, List of Tables, List of Figures, caption và pagination đã refresh trực tiếp bằng Microsoft Word.
- References giữ 19 nguồn có trọng tâm. Không thêm nguồn phổ thông cho đủ số lượng; `[15]`-`[19]` chỉ gồm bốn website tuyển dụng Việt Nam liên quan và bài CareerViet AI Matching truyền cảm hứng cho project.
- Bằng chứng ngày 12/08/2026: backend 141/141 test qua 35 suite; frontend production build, ESLint và bundle check đều qua; E2E Chromium 49/49 qua; benchmark kiểm soát giữ nguyên các metric baseline/Rocchio đã ghi trong báo cáo.
- File cuối có 213 trang vật lý, 74 bảng, 44 drawing, 30.314 từ theo Word và 5 section. Chapters 1-4 kết thúc ở logical page 119; phần Data Dictionary chi tiết nằm trong phụ lục.
- Audit cấu trúc cuối: 1.114 paragraph; không có empty heading, repeated sentence, U+FFFD, NUL, soft hyphen, NBSP, font sai hay đoạn có nguy cơ giãn từ.
- Đã xuất đủ 213 trang qua Microsoft Word và kiểm tra toàn bộ 18 contact sheet; không thấy clipping, overflow, overlap, ký tự hỏng, caption vỡ hoặc TOC có dòng rỗng bất thường.
- Backup trước lượt hoàn thiện: `Doc/working/CareerFit-Thesis-Report-before-final-format-20260812.docx`.
