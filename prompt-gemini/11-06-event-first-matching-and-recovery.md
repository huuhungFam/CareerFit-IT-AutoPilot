# Phase 3 — Event-first matching, notification enqueue và recovery scan

Chỉ bắt đầu khi Checkpoint 2 PASS. Đọc prompt 11 gốc và reports trước đó.

## Mục tiêu

Đưa matching sang primary event-after-commit path, dùng outbox enqueue idempotent và 30s scheduler chỉ làm recovery. Chưa triển khai mail dispatcher spacing hoàn chỉnh.

## Công việc

1. Xác định chính xác transition sang ACTIVE và active-content changes làm invalid vector/matches.
2. Sau transaction commit, gọi service hiện có `scoreJobAgainstAllCvs(jobId)` hoặc abstraction canonical; không tạo scoring implementation thứ hai.
3. Không enqueue/rescore cho update không ảnh hưởng matching.
4. Chỉ CV eligible/completed, thông thường SCORING_DONE.
5. Sau matching commit, gọi outbox enqueue primitive của Phase 1 cho eligible notification commands.
6. Recovery scheduler hạ cadence infrastructure xuống 30s cho thesis-demo configuration nhưng:
   - tìm missed/incomplete work có giới hạn;
   - không Cartesian-rescore toàn bộ jobs × CVs mỗi tick;
   - gọi cùng matching/enqueue services;
   - tôn trọng effective policy cho Demo OFF;
   - không business-hours hard stop với Demo recipients.
7. Candidate query invalidation/polling phải thấy matching mới trong tối đa hai poll 5s.

## Tests bắt buộc

- ACTIVE transition triggers exactly once after commit;
- rollback không chạy matching;
- irrelevant update không enqueue/rescore;
- relevant active content update invalidates/recomputes;
- only eligible CVs scored;
- event and recovery producer cùng logical match tạo một outbox row;
- recovery picks missed work nhưng không rescore unchanged world;
- Demo OFF effective policy được tôn trọng;
- catalog vẫn độc lập matching.

Chạy backend full regression và frontend relevant tests. Không gửi email thật, không reset DB chính.

## Deliverable

Tạo `prompt-gemini/11-06-event-first-matching-and-recovery-report.md` với transaction/timing evidence, SQL outbox evidence và exact tests.

## Điều kiện dừng

Dừng sau report; không làm dispatcher/feedback Phase 4.

