# Thảo luận về gợi ý JD cho từng candidate và Bag of Visual Words

Tài liệu này được viết để trả lời 2 câu hỏi thực tế sau:

1. Với proposal hiện tại, có nên bổ sung thuật toán gợi ý JD cho từng candidate không?
2. Bag of Visual Words là gì, hoạt động ra sao, và có áp dụng được cho project đánh giá CV/JD này không?

---

## 1. Phân tích nhanh `proposal.md`

### 1.1. Điểm mạnh của đề cương hiện tại

Đề cương đang đi theo một hướng rất rõ:

- Bài toán chính là matching giữa CV và Job Description.
- Luồng xử lý đủ “thực chiến”: upload PDF, parse text, vector hóa, tính similarity, ranking, feedback learning.
- Công nghệ được chọn nhất quán với mục tiêu backend:
  - Java 21+
  - Spring Boot
  - PDFBox
  - TF-IDF
  - Cosine Similarity
  - Rocchio
  - `@Async`, `@Scheduled`
- Scope tương đối hợp lý, không bị lan sang một hệ thống tuyển dụng full-flow.

Nói ngắn gọn: đây là một đồ án thiên về Information Retrieval và Backend Engineering, không phải kiểu project AI dùng model lớn.

### 1.2. Điểm cần làm rõ thêm

Trong proposal hiện tại có một số chỗ rất tốt về mặt ý tưởng, nhưng nếu muốn bảo vệ chắc hơn thì nên làm rõ thêm:

- “Matching Score” sẽ được tính từ những thành phần nào ngoài cosine similarity.
- `learned_profile_vector` của job sẽ được cập nhật theo công thức nào, và cập nhật khi nào.
- Static corpus sẽ được xây dựng ra sao để tránh IDF bị lệch.
- “Candidate” có được nhận gợi ý job riêng theo hồ sơ hay chỉ xem ranking chung.

### 1.3. Nhận xét về hướng mở rộng

Thầy hướng dẫn yêu cầu thêm “thuật toán gợi ý JD cho từng candidate” là hợp lý, vì nó làm cho hệ thống có thêm một lớp giá trị:

- Không chỉ “chấm điểm CV so với một JD”.
- Mà còn “đề xuất những JD phù hợp nhất cho một candidate”.

Điều này giúp project giống một hệ thống recommendation hơn, và cũng rất dễ demo.

---

## 2. Gợi ý JD cho từng candidate nên hiểu thế nào

### 2.1. Cách hiểu đúng bài toán

“Gợi ý JD cho từng candidate” thực chất là:

- Input: hồ sơ của candidate.
- Output: danh sách Job Description được sắp xếp theo mức độ phù hợp giảm dần.

Đây chính là bài toán recommendation theo hướng **content-based recommendation**.

Nếu hiện tại hệ thống đang làm:

- `score(CV, JD)`

thì phần mở rộng chỉ là đổi góc nhìn thành:

- `score(candidate_profile, JD)`

hoặc:

- `score(CV của candidate, JD)`

vì về bản chất candidate được đại diện bằng CV hoặc tập đặc trưng tổng hợp từ CV.

### 2.2. Có cần tạo thuật toán hoàn toàn mới không?

Không nhất thiết.

Đây là điểm quan trọng nhất:

- Nếu hệ thống đã có vector hóa CV và JD.
- Nếu hệ thống đã có cosine similarity.
- Nếu hệ thống đã có Rocchio để học từ feedback.

thì gợi ý JD cho candidate gần như là một **bài toán xếp hạng ngược chiều** của matching hiện tại.

Tức là:

- Matching hiện tại: “Job này phù hợp với CV nào?”
- Recommendation mới: “Candidate này hợp với Job nào?”

Hai bài toán có cùng lõi toán học.

### 2.3. Cách thiết kế hợp lý nhất cho project của bạn

Mình khuyên chia thành 2 lớp:

#### Lớp 1: Job-to-Candidate Matching

- Một JD được dùng để chấm điểm nhiều CV.
- Đây là luồng hiện tại trong proposal.

#### Lớp 2: Candidate-to-Job Recommendation

- Một candidate được dùng để chấm điểm nhiều JD.
- Hệ thống trả về top `N` job phù hợp.

Hai lớp này dùng chung:

- bộ tiền xử lý text,
- vocabulary,
- TF-IDF vectorization,
- cosine similarity,
- và feedback learning.

### 2.4. Vì sao nên làm feature này

Feature này đáng làm vì:

- Tăng giá trị sử dụng thực tế của hệ thống.
- Có thể demo rất thuyết phục.
- Không làm lệch quá nhiều khỏi scope hiện tại.
- Tận dụng lại gần như toàn bộ phần lõi đã có.

### 2.5. Mô hình đề xuất

Mô hình phù hợp nhất cho đề tài này là:

**Content-based job recommendation**

Nguồn dữ liệu đầu vào có thể là:

- CV text của candidate.
- Các kỹ năng đã extract.
- Kinh nghiệm.
- Chức danh mong muốn.
- Location, seniority, domain nếu bạn có lưu.

Điểm số có thể tính bằng:

- Cosine similarity giữa candidate vector và job vector.
- Có thể cộng trọng số cho các trường quan trọng.

Ví dụ:

- `skills` quan trọng hơn `summary`
- `experience` quan trọng hơn `education` trong một số job

Nhưng nếu muốn giữ scope gọn, chỉ cần một vector tổng hợp là đủ.

### 2.6. Phần nào nên tránh

Không nên vội làm:

- Collaborative filtering thuần túy.
- Matrix factorization.
- Deep learning recommender.
- Graph recommender.

Lý do:

- Cần nhiều dữ liệu lịch sử.
- Khó giải thích khi bảo vệ.
- Không hợp scope Java backend + IR.
- Dễ làm project phình to.

### 2.7. Kết luận phần recommendation

Nếu thầy yêu cầu “gợi ý JD cho từng candidate”, cách tốt nhất là:

- giữ nguyên TF-IDF + cosine similarity,
- thêm endpoint và luồng xử lý candidate-to-job,
- coi đây là một lớp recommendation content-based,
- không cần thay đổi bản chất kiến trúc của đề tài.

---

## 3. Bag of Visual Words là gì

### 3.1. Định nghĩa ngắn gọn

Bag of Visual Words thường viết là **BoVW**.

Đây là một kỹ thuật trong computer vision để biến hình ảnh thành một biểu diễn dạng “túi từ”, tương tự ý tưởng bag-of-words trong xử lý văn bản.

Thay vì:

- từ trong văn bản,

BoVW dùng:

- các đặc trưng cục bộ của ảnh,
- rồi gom chúng thành các “visual words”.

### 3.2. Ý tưởng trực giác

Trong text:

- Một tài liệu có thể được biểu diễn bằng số lần xuất hiện của các từ.

Trong ảnh:

- Một ảnh có thể được biểu diễn bằng số lần xuất hiện của các mẫu đặc trưng hình ảnh.

Ví dụ:

- góc cạnh,
- texture,
- pattern,
- blob,
- vùng chuyển tiếp sáng tối.

Các mẫu này được gom cụm thành các nhóm đại diện gọi là visual vocabulary.

### 3.3. Tại sao gọi là “bag”

Vì kỹ thuật này bỏ qua thứ tự xuất hiện chi tiết của các đặc trưng.

Nó chỉ quan tâm:

- trong ảnh có những visual word nào,
- và mỗi visual word xuất hiện bao nhiêu lần.

Giống như bag-of-words trong text:

- không quan tâm ngữ pháp,
- chỉ quan tâm thống kê từ.

---

## 4. BoVW hoạt động như thế nào

### 4.1. Pipeline tổng quát

BoVW thường có 5 bước:

1. Trích xuất local features từ ảnh.
2. Gom cụm các feature này để tạo visual vocabulary.
3. Mã hóa mỗi feature vào một visual word gần nhất.
4. Đếm histogram số lần xuất hiện của từng visual word.
5. Dùng histogram đó để phân loại, tìm kiếm, hoặc so sánh ảnh.

### 4.2. Bước 1: Trích xuất đặc trưng cục bộ

Ảnh không được coi như một ma trận pixel thô.

Thay vào đó, hệ thống lấy các điểm hoặc vùng đặc trưng cục bộ bằng các bộ mô tả như:

- SIFT
- SURF
- ORB
- HOG trong một số biến thể gần liên quan

Mỗi đặc trưng là một vector mô tả vùng ảnh tại điểm đó.

### 4.3. Bước 2: Tạo visual vocabulary

Tất cả feature vector từ tập ảnh training sẽ được gom cụm bằng thuật toán như:

- K-means

Mỗi cụm đại diện cho một “visual word”.

Tập trung tâm cụm chính là visual dictionary.

### 4.4. Bước 3: Vector quantization

Khi có feature mới từ ảnh đầu vào:

- tìm visual word gần nhất trong dictionary,
- gán feature đó vào word ấy.

Đây là bước lượng tử hóa đặc trưng liên tục thành các nhãn rời rạc.

### 4.5. Bước 4: Tạo histogram

Sau khi mọi feature được gán nhãn:

- đếm xem mỗi visual word xuất hiện bao nhiêu lần.

Kết quả là một vector histogram có độ dài bằng số visual words.

Ví dụ:

- word 1: 3 lần
- word 2: 0 lần
- word 3: 12 lần
- word 4: 1 lần

### 4.6. Bước 5: Dùng histogram cho tác vụ downstream

Vector BoVW có thể dùng để:

- phân loại ảnh,
- nhận dạng scene,
- image retrieval,
- clustering,
- content-based image retrieval.

---

## 5. BoVW mạnh ở điểm nào

### 5.1. Đơn giản và dễ hiểu

BoVW là một ý tưởng rất đẹp về mặt học thuật:

- chuyển bài toán ảnh sang biểu diễn vector,
- rồi xử lý bằng các kỹ thuật machine learning cổ điển.

### 5.2. Không cần deep learning

Nếu không muốn dùng CNN, BoVW vẫn là một hướng truyền thống tốt để học:

- feature engineering,
- clustering,
- vector representation,
- similarity computation.

### 5.3. Tốt cho một số bài toán cổ điển

BoVW từng rất mạnh trong:

- image categorization,
- image retrieval,
- scene recognition,
- object recognition ở mức cổ điển.

---

## 6. BoVW yếu ở đâu

### 6.1. Mất cấu trúc không gian

Vì là “bag”, BoVW gần như bỏ qua vị trí tương đối của các đặc trưng.

Nghĩa là:

- ảnh A và ảnh B có thể cùng histogram,
- nhưng bố cục khác nhau nhiều,
- BoVW vẫn coi chúng khá giống nhau.

### 6.2. Phụ thuộc vào quality của local features

Nếu feature extraction kém:

- dictionary sẽ kém,
- histogram sẽ kém,
- kết quả downstream sẽ kém.

### 6.3. Không còn là lựa chọn hiện đại nhất

Trong thực tế hiện nay, CNN/ViT thường tốt hơn BoVW cho đa số bài toán ảnh.

BoVW chủ yếu còn giá trị:

- học thuật,
- baseline cổ điển,
- hoặc hệ thống rất đơn giản.

---

## 7. BoVW liên quan gì đến bag-of-words trong text

Hai kỹ thuật này có cùng tinh thần:

### 7.1. Điểm giống

- Cả hai đều biến dữ liệu thành histogram.
- Cả hai đều bỏ qua thứ tự chi tiết.
- Cả hai đều hữu ích cho classification/retrieval.

### 7.2. Điểm khác

- Bag-of-words xử lý từ ngữ.
- BoVW xử lý đặc trưng hình ảnh.

Nói cách khác:

- BOW là phiên bản “văn bản hóa”.
- BoVW là phiên bản “ảnh hóa”.

---

## 8. Có thể áp dụng BoVW cho project CV/JD không?

### 8.1. Nếu CV/JD của bạn là text-based PDF

Thì câu trả lời là: **không nên dùng BoVW như một lõi chính**.

Lý do:

- Bài toán gốc của bạn là text matching.
- Bạn đã có TF-IDF, cosine similarity, Rocchio.
- BoVW giải quyết ảnh, không giải quyết văn bản trực tiếp.

### 8.2. Nếu CV của bạn có layout, ảnh, icon, scan

BoVW chỉ có thể hữu ích trong một số trường hợp rất phụ:

- CV là ảnh scan,
- cần nhận diện thành phần thị giác của tài liệu,
- cần phân loại layout,
- hoặc cần nhận dạng template CV.

Nhưng đây không phải bài toán chính của proposal.

### 8.3. Trong project hiện tại, BoVW nên được xem là gì

BoVW chỉ nên được xem là:

- kiến thức tham khảo,
- hoặc hướng mở rộng nếu sau này bạn làm thêm:
  - OCR cho CV scan,
  - nhận dạng layout,
  - phân tích ảnh chụp hồ sơ,
  - phân loại template CV.

### 8.4. Kết luận thực tế

Nếu chỉ xét đúng scope hiện tại:

- BoVW **không phải lựa chọn phù hợp** để làm lõi matching CV/JD.

Vì project của bạn đang là:

- text retrieval + ranking + feedback learning.

BoVW là:

- image retrieval + visual feature histogram.

Hai hướng này khác miền dữ liệu.

---

## 9. Nếu muốn “áp dụng được” thì áp dụng như thế nào

### 9.1. Trường hợp hợp lý nhất

Nếu sau này bạn mở rộng hệ thống để xử lý:

- CV dạng scan ảnh,
- ảnh profile,
- ảnh chứng chỉ,
- screenshot portfolio,

thì BoVW có thể dùng để:

- phân loại template tài liệu,
- tìm ảnh tương tự,
- hoặc hỗ trợ trích xuất cấu trúc trực quan ở mức đơn giản.

### 9.2. Nhưng vẫn không nên ôm quá sâu

Ngay cả khi mở rộng như vậy, hiện nay vẫn có nhiều lựa chọn tốt hơn:

- OCR + NLP cho CV scan.
- Layout analysis.
- CNN embedding.
- Vision Transformer embedding.

Nên BoVW chỉ thật sự hợp nếu bạn muốn:

- học thuật,
- cổ điển,
- dễ giải thích,
- và chấp nhận hiệu năng vừa phải.

---

## 10. Liên hệ giữa BoVW và project hiện tại

### 10.1. Ở mức tư duy

BoVW rất đáng học vì nó giúp bạn hiểu:

- cách biến một đối tượng phức tạp thành vector,
- cách tạo vocabulary,
- cách dùng histogram để so sánh,
- vì sao retrieval và matching thường đi từ feature -> vector -> similarity.

Đây là tư duy rất giống với:

- TF-IDF cho văn bản,
- và cũng rất gần với cách project của bạn hoạt động.

### 10.2. Ở mức triển khai

Bạn có thể rút ra một bài học quan trọng:

- Text dùng vocabulary của từ.
- Image dùng vocabulary của visual words.

Tức là:

- CV/JD text matching của bạn là “bag-of-words trên văn bản”.
- BoVW là “bag-of-words trên ảnh”.

Hai bên rất giống nhau về triết lý, chỉ khác miền dữ liệu.

---

## 11. Nên trả lời thầy hướng dẫn như thế nào

Bạn có thể trả lời theo hướng sau:

> Em có thể bổ sung module gợi ý JD cho từng candidate theo hướng content-based recommendation, dùng chung pipeline vector hóa và cosine similarity hiện tại. Như vậy hệ thống vừa có matching CV-to-JD, vừa có recommendation candidate-to-job mà không làm phình scope quá nhiều.

Về Bag of Visual Words, bạn có thể nói:

> Em đã tìm hiểu BoVW. Đây là kỹ thuật biểu diễn ảnh bằng histogram của các visual words, phù hợp cho bài toán image retrieval hoặc phân loại ảnh cổ điển. Tuy nhiên project hiện tại của em là text-based CV/JD matching, nên BoVW không phù hợp để làm lõi chính. Em có thể xem nó như kiến thức mở rộng hoặc hướng phụ nếu sau này xử lý CV scan hoặc tài liệu có yếu tố hình ảnh.

---

## 12. Kết luận cuối cùng

### 12.1. Về gợi ý JD cho candidate

Nên làm.

Nhưng không cần đổi lõi kiến trúc.

Chỉ cần:

- coi đó là content-based recommendation,
- dùng chung vector hóa và similarity,
- thêm endpoint và UI để trả top JD cho một candidate.

### 12.2. Về Bag of Visual Words

Rất nên học để hiểu tư duy biểu diễn dữ liệu bằng vector.

Nhưng:

- không nên dùng làm lõi chính cho project CV/JD text-based của bạn.

### 12.3. Quyết định thực dụng cho project

Nếu mục tiêu là bảo vệ đồ án tốt và đúng scope, hướng hợp lý nhất là:

- giữ TF-IDF + cosine similarity + Rocchio làm lõi,
- thêm recommendation candidate-to-job,
- xem BoVW là kiến thức tham khảo hoặc hướng mở rộng, không phải phần bắt buộc.

