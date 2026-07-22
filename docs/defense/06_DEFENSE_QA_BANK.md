# Ngân Hàng Câu Hỏi Bảo Vệ CareerFit

## 1. Cách luyện

Mỗi câu có bốn phần:

- **Trả lời ngắn:** dùng trong 20–30 giây đầu.
- **Đào sâu:** dùng khi hội đồng hỏi tiếp.
- **Bằng chứng:** file hoặc thành phần có thể mở.
- **Tránh nói:** phát biểu dễ bị phản biện.

Không cần học thuộc từng chữ. Cần nhớ luận điểm và bằng chứng.

## 2. Sản phẩm và thực tiễn

### Câu 1. CareerFit giải quyết vấn đề gì?

**Trả lời ngắn:** CareerFit giảm công việc tìm kiếm và sàng lọc lặp lại trong tuyển dụng IT. Candidate nhận job được ưu tiên và giải thích; Recruiter nhận ranking và candidate discovery; quyết định cuối vẫn thuộc về con người.

**Đào sâu:** Hệ thống kết nối dữ liệu CV, JD, matching, application, feedback và automation trong một vòng lặp. Giá trị nằm ở workflow thống nhất, không chỉ ở thuật toán.

**Bằng chứng:** `CandidateController`, `JobController`, `MatchingController`, `ApplicationController`, `RecruiterController`.

**Tránh nói:** “Hệ thống giải quyết hoàn toàn tuyển dụng.”

### Câu 2. Ai là người dùng chính?

**Trả lời ngắn:** Candidate, Recruiter và Admin. Candidate tìm việc; Recruiter quản lý JD và ứng viên; Admin kiểm soát vận hành, tài khoản và audit.

**Đào sâu:** Guest/email recipient/background worker là actor phụ. Role được phản ánh cả trên route frontend và authorization backend.

**Bằng chứng:** route trong `Frontend/src/App.tsx`, `SecurityConfig.java`.

### Câu 3. CareerFit khác website tìm việc thông thường ở đâu?

**Trả lời ngắn:** Website job board chủ yếu giúp đăng và tìm tin. CareerFit bổ sung matching hai chiều, lý do phù hợp, feedback learning, recruiter discovery và automation có policy.

**Tránh nói:** “Các job board khác không có AI.” Nhiều sản phẩm thương mại đã có search, screening và recommendation.

### Câu 4. Điểm mới của đồ án là gì?

**Trả lời ngắn:** Đóng góp là cách tích hợp vòng lặp Candidate–Recruiter với matching giải thích được, feedback Rocchio, policy-driven automation, email action và audit trong một hệ thống IT recruitment.

**Đào sâu:** Đây là đóng góp thiết kế/hệ thống, không tuyên bố phát minh TF-IDF hoặc Rocchio.

### Câu 5. Tại sao Recruiter cần hệ thống này?

**Trả lời ngắn:** Để ưu tiên CV cần đọc trước, nhìn thấy lý do matching và yêu cầu kỹ năng của JD, đồng thời tìm candidate tiềm năng chưa apply, từ đó giảm time-to-shortlist. Backend hiện chưa tính `missing skills` riêng.

**Đào sâu:** Hiệu quả thật phải đo bằng precision@K, thời gian shortlist, invite acceptance và conversion funnel.

### Câu 6. Candidate được lợi gì ngoài một score?

**Trả lời ngắn:** Candidate thấy score, nhãn, các term/domain trùng nhau, required/optional skills của JD và quản lý application/automation. Backend hiện chưa tính danh sách missing skills cá nhân riêng, nên không nên giới thiệu field đó như kết quả thuật toán.

### Câu 7. Hệ thống có thay thế Recruiter không?

**Trả lời ngắn:** Không. Nó hỗ trợ sàng lọc và ưu tiên. Recruiter vẫn đọc hồ sơ, phỏng vấn và chịu trách nhiệm quyết định.

**Tránh nói:** “AI khách quan hơn con người.” Thuật toán vẫn phản ánh dữ liệu và rule do con người thiết kế.

### Câu 8. Nếu đưa vào doanh nghiệp, KPI là gì?

**Trả lời ngắn:** time-to-shortlist, precision@K/NDCG của ranking, apply conversion, invite acceptance, time-to-hire, tỷ lệ lỗi automation và số khiếu nại.

**Đào sâu:** Accuracy đơn lẻ không đủ vì ranking và workflow cần metric khác classification.

## 3. Production

### Câu 9. Project đã Production-ready chưa?

**Trả lời ngắn:** Project có các nền tảng như security, migration, test, audit và cấu hình theo môi trường, nhưng không nên khẳng định Production-ready tuyệt đối. Cần kiểm chứng runtime và hoàn thiện observability, DR, load test, secret/data governance và vận hành.

**Đào sâu:** Backend xanh không chứng minh frontend E2E, monitoring, email và benchmark đều xanh.

**Tránh nói:** “Báo cáo ghi PASS nên chắc chắn Production-ready.”

### Câu 10. Scale như thế nào?

**Trả lời ngắn:** API stateless có thể scale ngang; PostgreSQL cần index/connection pool; batch/email nên chuyển sang queue/worker; scheduler nhiều instance cần distributed lock.

**Đào sâu:** Matching có thể precompute và cập nhật bất đồng bộ thay vì tính toàn bộ trên mỗi request.

### Câu 11. Nếu 1 triệu CV thì sao?

**Trả lời ngắn:** Không thể quét tuyến tính toàn bộ ở mỗi request. Cần inverted index/vector index, phân vùng dữ liệu, batch incremental, cache và giới hạn candidate set trước khi scoring chi tiết.

**Tránh nói:** “Chỉ cần tăng RAM.”

### Câu 12. Làm sao tránh scheduler chạy trùng?

**Trả lời ngắn:** Hiện cần bảo đảm idempotency ở business rule. Khi chạy nhiều instance, bổ sung distributed lock hoặc tách scheduler thành worker singleton/queue consumer.

**Bằng chứng:** `AutomationScheduler`, duplicate guard trong application/notification.

### Câu 13. Email gửi lỗi thì sao?

**Trả lời ngắn:** Không rollback transaction nghiệp vụ chỉ vì provider email lỗi. Cần lưu delivery state, retry có backoff, dead-letter/manual retry và idempotency key.

**Bằng chứng:** notification delivery log, admin email monitor.

### Câu 14. Backup và recovery?

**Trả lời ngắn:** Cần backup PostgreSQL và object storage, mã hóa backup, định nghĩa RPO/RTO và thực hiện restore test định kỳ. Có backup nhưng chưa thử restore thì chưa đủ.

### Câu 15. Quan sát hệ thống thế nào?

**Trả lời ngắn:** Metrics về latency/error/throughput, structured logs có correlation ID, distributed tracing, dashboard và alert theo SLO. Tách health của API, database, mail, scheduler và frontend.

## 4. Thuật toán

### Câu 16. Vì sao chọn TF-IDF?

**Trả lời ngắn:** TF-IDF nhẹ, dễ triển khai, tái lập và giải thích; phù hợp baseline đồ án khi dữ liệu chủ yếu là CV/JD kỹ thuật.

**Đào sâu:** Hạn chế là không hiểu tốt đồng nghĩa và ngữ cảnh. Có thể cải tiến bằng skill dictionary hoặc hybrid embedding.

**Bằng chứng:** `TfIdfService`, `ScoringService`, `TfIdfPipelineTest`.

### Câu 17. Cosine similarity là gì?

**Trả lời ngắn:** Là độ giống về hướng giữa hai vector. Nó giảm ảnh hưởng của độ dài văn bản và cho biết phân bố thuật ngữ CV/JD giống nhau đến đâu.

### Câu 18. Score có phải xác suất phù hợp không?

**Trả lời ngắn:** Không. Đây là điểm xếp hạng từ các tín hiệu đã thiết kế. Muốn gọi là xác suất phải có mô hình và calibration trên dữ liệu nhãn phù hợp.

### Câu 19. Vì sao không dùng LLM hoặc embedding?

**Trả lời ngắn:** Phạm vi hiện tại ưu tiên chi phí thấp, khả năng tái lập và giải thích. Embedding/LLM hiểu ngữ nghĩa tốt hơn nhưng tăng chi phí, phụ thuộc model và khó giải thích/kiểm soát hơn.

**Đào sâu:** Hướng nâng cấp là hybrid: filter theo skill/rule, retrieve bằng keyword/vector, rerank có kiểm soát và giữ reason generation dựa trên bằng chứng.

### Câu 20. TF-IDF có quá đơn giản cho đồ án không?

**Trả lời ngắn:** Đơn giản không đồng nghĩa không phù hợp. Giá trị phải đánh giá bằng baseline, metric và workflow. Điểm yếu là nếu chỉ trình bày thuật toán mà không đánh giá và không giải thích giới hạn.

### Câu 21. Rocchio hoạt động thế nào?

**Trả lời ngắn:** Vector job mới bằng vector TF-IDF gốc cộng tâm các CV được đánh giá tích cực và trừ tâm các CV bị đánh giá tiêu cực, theo alpha/beta/gamma. Trọng số không dương bị loại; vector không được normalize độ dài trước khi lưu.

**Bằng chứng:** `FeedbackService` gọi Rocchio sau commit; `RocchioService.updateJobVector` lưu learned vector rồi đặt `needsRecompute`; `RocchioServiceTest` kiểm tra thuật toán.

### Câu 22. Feedback ít thì sao?

**Trả lời ngắn:** Kết quả dễ dao động. Production cần ngưỡng số mẫu, regularization, giới hạn mức thay đổi, versioning và A/B/offline evaluation trước khi áp dụng rộng.

### Câu 23. Đánh giá ranking thế nào?

**Trả lời ngắn:** Dùng precision@K, recall@K, MAP hoặc NDCG trên dataset có relevance label; đồng thời theo dõi KPI online. Dataset phải tách train/tuning/test và không sửa nhãn để làm đẹp kết quả.

### Câu 24. Bias xuất hiện ở đâu?

**Trả lời ngắn:** Từ dữ liệu lịch sử, cách viết CV, từ điển kỹ năng, feedback Candidate, dữ liệu thiếu và rule score. Các quyết định của Recruiter cũng có thể tạo thiên lệch ở tầng quy trình dù hiện chưa đi trực tiếp vào Rocchio. Cần loại thuộc tính nhạy cảm khỏi ranking, kiểm tra theo nhóm và có quy trình khiếu nại.

## 5. Backend và dữ liệu

### Câu 25. Vì sao dùng Spring Boot?

**Trả lời ngắn:** Spring Boot cung cấp DI, web, validation, security, JPA, configuration và test ecosystem, phù hợp hệ thống API nhiều domain.

**Tránh nói:** “Vì Spring Boot tốt nhất.” Hãy nói phù hợp yêu cầu và năng lực triển khai.

### Câu 26. Controller, Service, Repository khác gì?

**Trả lời ngắn:** Controller xử lý HTTP; Service giữ use case/business rule; Repository truy cập persistence. Tách lớp giúp test và thay đổi rõ trách nhiệm.

### Câu 27. Vì sao không trả Entity trực tiếp?

**Trả lời ngắn:** DTO kiểm soát API contract, tránh lộ field nội bộ và tránh coupling schema với frontend. DTO cũng là nơi validation input/output shape.

### Câu 28. `@Transactional` để làm gì?

**Trả lời ngắn:** Bảo đảm nhóm thay đổi database của một use case cùng commit hoặc rollback. Không nên giữ transaction trong khi gọi mail/network lâu.

### Câu 29. Làm sao chống application trùng?

**Trả lời ngắn:** Kiểm tra ở service để trả lỗi thân thiện và cần unique constraint ở database để chống race condition. Chỉ kiểm tra bằng `exists` chưa đủ khi hai request đồng thời.

### Câu 30. Flyway có vai trò gì?

**Trả lời ngắn:** Quản lý schema theo migration có phiên bản, giúp môi trường dựng lại nhất quán và review được lịch sử thay đổi.

### Câu 31. Nếu hai recruiter cập nhật cùng application?

**Trả lời ngắn:** Code đã có ownership và `@Version` để phát hiện stale write, nhưng `updateStatus` chưa có ma trận state transition đầy đủ. Đây là giới hạn cần nói rõ hoặc bổ sung trước Production.

### Câu 32. Vì sao lưu vector JSON?

**Trả lời ngắn:** Đơn giản cho baseline và tái sử dụng score mà không xử lý văn bản lại. Với quy mô lớn, JSON có hạn chế về truy vấn/index và nên cân nhắc vector store hoặc bảng/column chuyên dụng.

## 6. Security và riêng tư

### Câu 33. JWT flow hoạt động thế nào?

**Trả lời ngắn:** Login mật khẩu hoặc POST verify magic-link phát JWT. Client gửi Bearer token; filter xác minh chữ ký/thời hạn và tạo authentication; security kiểm tra role trước khi controller chạy.

**Bằng chứng:** `JwtService`, `JwtAuthenticationFilter`, `SecurityConfig`.

### Câu 34. 401 và 403 khác nhau?

**Trả lời ngắn:** 401 là chưa xác thực hợp lệ; 403 là đã xác thực nhưng không được phép.

### Câu 35. Ẩn nút trên frontend có đủ bảo mật?

**Trả lời ngắn:** Không. Kẻ tấn công gọi API trực tiếp được. Backend phải kiểm tra role và ownership.

### Câu 36. Bảo vệ CV thế nào?

**Trả lời ngắn:** Giới hạn định dạng/kích thước, quét malware, object storage private, URL có thời hạn, mã hóa, access log, retention/delete policy và không ghi nội dung CV vào log.

### Câu 37. Token email có rủi ro gì?

**Trả lời ngắn:** Token bị đoán, lộ, replay, hết hạn hoặc bị mail scanner mở. Cần entropy cao, expiry, one-time use, binding với action và confirmation khi hành động nhạy cảm.

**Bằng chứng:** `EmailActionController`, `EmailActionService`, `EmailToken`.

### Câu 38. Lưu JWT ở sessionStorage có an toàn không?

**Trả lời ngắn:** `sessionStorage` giảm thời gian tồn tại so với local storage nhưng token vẫn có thể bị JavaScript độc hại lấy nếu có XSS. Production cần CSP, chống XSS và cân nhắc cookie HttpOnly/SameSite cùng chiến lược CSRF phù hợp.

### Câu 39. Rate limiting để làm gì?

**Trả lời ngắn:** Giảm brute force và abuse, nhưng không thay thế WAF, bot protection và giới hạn phân tán ở gateway khi scale nhiều instance.

## 7. Automation

### Câu 40. Auto-apply có nguy hiểm không?

**Trả lời ngắn:** Có nếu chạy chỉ dựa trên score. Hệ thống hiện dùng enable policy, threshold, duplicate guard, CV `SCORING_DONE`, job active, giới hạn ba application mỗi lượt và audit. Pause/resume chưa lưu `pausedUntil` và chưa dừng auto-apply nên chưa được tính là guard hoàn chỉnh.

**Bằng chứng:** `AutomationPolicyService`, `AutoApplyService`, `AutomationScheduler`.

### Câu 41. Nếu auto-apply nhầm thì sao?

**Trả lời ngắn:** Người dùng có thể tắt policy Auto-Apply và withdraw application; hệ thống lưu audit để điều tra rule/score. Endpoint pause hiện chưa dừng Auto-Apply đáng tin cậy. Production cần dry-run, confirmation cho giai đoạn đầu và circuit breaker khi lỗi tăng.

### Câu 42. Làm sao chống gửi email trùng?

**Trả lời ngắn:** Dùng unique business key/idempotency key, delivery log và kiểm tra trạng thái trước khi gửi. Retry phải dùng cùng key.

### Câu 43. Human-in-the-Loop thể hiện ở đâu?

**Trả lời ngắn:** Người dùng cấu hình policy, xem lý do và có thể withdraw; recruiter vẫn approve/reject/invite; admin kiểm tra audit và can thiệp vận hành. Pause/resume hiện là hạng mục chưa hoàn thiện.

## 8. Frontend và tích hợp

### Câu 44. React Query giải quyết gì?

**Trả lời ngắn:** React Query quản lý cache, loading, error, refetch và invalidate. Code hiện dùng `useQuery`/`useQueryClient`; thao tác ghi là hàm async thủ công, chưa dùng `useMutation`.

### Câu 45. API contract thay đổi thì sao?

**Trả lời ngắn:** DTO/type/mapper cần cập nhật cùng backend; contract/resilience test phát hiện drift. Mapper job hiện dùng giá trị trung tính khi field thiếu và không chèn `mockJobs`, nhưng vẫn phải báo lỗi khi contract bắt buộc bị phá vỡ.

### Câu 46. CORS là gì?

**Trả lời ngắn:** Chính sách trình duyệt giới hạn frontend origin nào được gọi backend. Backend cấu hình allowed origins; CORS không phải cơ chế phân quyền người dùng.

### Câu 47. Tại sao UI vẫn cần role guard nếu backend đã kiểm tra?

**Trả lời ngắn:** Để UX đúng và tránh người dùng vào màn hình không liên quan. Bảo mật vẫn nằm ở backend.

## 9. Testing

### Câu 48. Unit, integration và E2E khác nhau?

**Trả lời ngắn:** Unit kiểm tra thành phần cô lập; integration kiểm tra nhiều lớp/database/context; E2E kiểm tra hành trình giống người dùng qua runtime đầy đủ.

### Câu 49. Test xanh có chứng minh không có bug?

**Trả lời ngắn:** Không. Test chỉ chứng minh các trường hợp đã viết. Cần coverage theo rủi ro, negative tests, runtime evidence, monitoring và review.

### Câu 50. Test matching cần những gì?

**Trả lời ngắn:** Case giống/khác rõ, vector rỗng/lỗi, cosine và label threshold, potential heuristic/seniority, learned vector, tie metadata, determinism và benchmark trên dataset có nhãn. Seniority không được cộng vào score hiện tại.

### Câu 51. Làm sao test security?

**Trả lời ngắn:** Test không token, token sai/hết hạn, sai role, ownership khác, input độc hại, rate limit và kiểm tra response không lộ chi tiết.

## 10. Câu phản biện khó

### Câu 52. Nếu thương mại đã có chức năng tương tự, đề tài còn ý nghĩa gì?

**Trả lời ngắn:** Đề tài không tuyên bố sản phẩm đầu tiên. Ý nghĩa nằm ở việc phân tích, thiết kế và triển khai một workflow tuyển dụng IT có thể kiểm soát, giải thích và self-host, qua đó chứng minh năng lực xây dựng hệ thống end-to-end.

### Câu 53. Vì sao người dùng phải tin điểm số?

**Trả lời ngắn:** Không yêu cầu tin mù quáng. Hệ thống hiển thị score, nhãn, term/domain trùng nhau và yêu cầu của JD; người dùng vẫn có quyền quyết định và phản hồi. Score phải được xem là tín hiệu hỗ trợ ưu tiên, không phải xác suất hay kết luận tuyển dụng.

### Câu 54. Nếu CV viết nhiều từ khóa để gian lận?

**Trả lời ngắn:** TF-IDF có thể bị keyword stuffing. Cần giới hạn/reweight lặp từ, kỹ năng có cấu trúc, kiểm tra bằng chứng dự án/kinh nghiệm, anomaly detection và recruiter review.

### Câu 55. Tại sao không dùng microservice?

**Trả lời ngắn:** Với phạm vi đồ án, modular monolith giảm chi phí vận hành và giữ transaction đơn giản. Chỉ tách service khi có ranh giới tải, đội ngũ hoặc lifecycle độc lập rõ ràng.

### Câu 56. Nếu được làm lại, ưu tiên gì?

**Trả lời ngắn:** Em ưu tiên chất lượng dữ liệu/benchmark, async queue/outbox, observability và bảo vệ CV trước; sau đó mới nâng matching sang hybrid retrieval. Các phần này cải thiện độ tin cậy nhiều hơn việc chỉ thay thuật toán.

## 11. Bộ trả lời cực ngắn

- **Sản phẩm là gì?** Nền tảng hỗ trợ tuyển dụng IT hai chiều, có matching giải thích và automation có kiểm soát.
- **Core backend?** Lưu CV/job → after-commit worker → extract/OCR → normalize → TF-IDF → cosine score/matching → recommendation/application → Candidate feedback → Rocchio → scheduler recompute.
- **Điểm mạnh?** Explainability, workflow control, policy và audit.
- **Điểm yếu?** Ngữ nghĩa TF-IDF, dữ liệu feedback, hạ tầng Production và fairness cần tiếp tục hoàn thiện.
- **Production?** Có nền tảng nhưng phải xác nhận runtime và bổ sung vận hành, scale, DR, privacy.
- **AI thay người?** Không; Human-in-the-Loop.

## 12. Bài luyện cuối

Tự trả lời không nhìn tài liệu:

1. Mô tả CareerFit trong 30 giây.
2. Đi từ click Apply đến database.
3. Giải thích TF-IDF và cosine không dùng công thức.
4. Giải thích Rocchio trong 20 giây.
5. Nêu năm điều kiện AutoFit.
6. Nêu ba rủi ro Production.
7. Nêu hai hạn chế thuật toán.
8. Chỉ ra một test chứng minh business rule.
9. Trả lời “tại sao không dùng LLM?”.
10. Trả lời “điểm mới của đề tài là gì?”.

## 13. Câu hỏi bổ sung theo phiên bản hiện tại

### Câu 57. Vì sao cần `AfterCommitExecutor`?

**Trả lời ngắn:** Để chỉ chạy xử lý CV hoặc matching job sau khi transaction tạo/cập nhật dữ liệu đã commit. Nếu gọi worker quá sớm, thread nền có thể không thấy record hoặc đọc trạng thái chưa hoàn chỉnh.

**Bằng chứng:** `AfterCommitExecutor`, `CvIngestionService`, `JobService`, `AfterCommitExecutorTest`.

### Câu 58. Portfolio có tham gia score không?

**Trả lời ngắn:** Không. Score vẫn dựa trên vector CV và job. Portfolio là bằng chứng bổ sung cho recruiter, chỉ được trả sau khi Candidate đã apply và setting `showPortfolioAfterApply` cho phép.

**Bằng chứng:** `CandidatePortfolioVisibilityService`, `MatchingQueryService`, `ApplicationService`.

### Câu 59. Passwordless login có mấy bước?

**Trả lời ngắn:** Request token, GET verify để kiểm tra/hiển thị xác nhận, rồi POST verify để tiêu thụ token và phát JWT. Frontend lưu JWT trong `sessionStorage` và gọi `/auth/me` để khôi phục identity.

### Câu 60. Feedback web hiện thuộc role nào?

**Trả lời ngắn:** Candidate-only. Frontend gửi `type` và `channel` bằng query string; backend không tin role do client tự khai báo và kiểm tra matching thuộc CV của Candidate. Recruiter dùng invite/application lifecycle, không dùng endpoint này.

### Câu 61. Frontend còn mock không?

**Trả lời ngắn:** API mapper không còn lấy job score, skill hoặc salary từ `mockJobs`; khi thiếu field nó dùng giá trị trung tính. `src/data/mock.ts` vẫn có một số hằng UI cục bộ như preference/automation mẫu, nên cần phân biệt rõ với dữ liệu nghiệp vụ từ backend.
