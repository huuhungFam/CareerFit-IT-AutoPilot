package com.careerfit.backend.notification;

import com.careerfit.backend.BaseIntegrationTest;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.notification.entity.NotificationOutbox;
import com.careerfit.backend.notification.repository.NotificationOutboxRepository;
import com.careerfit.backend.notification.service.OutboxDispatcher;
import com.careerfit.backend.notification.service.OutboxService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class OutboxDeliveryIntegrationTest extends BaseIntegrationTest {
    @Autowired private UserAccountRepository users;
    @Autowired private NotificationOutboxRepository outbox;
    @Autowired private OutboxService outboxService;
    @Autowired private OutboxDispatcher dispatcher;

    @BeforeEach
    void clearOutbox() {
        outbox.deleteAllInBatch();
    }

    @Test
    void concurrentDemoSuggestionsReceiveSerializedThirtySecondSlots() throws Exception {
        UserAccount candidate = users.save(new UserAccount("slot." + UUID.randomUUID() + "@example.test",
                "hash", UserAccount.Role.CANDIDATE, "Slot candidate"));
        Instant requestedAt = Instant.now();
        int count = 4;
        ExecutorService pool = Executors.newFixedThreadPool(count);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Boolean>> futures = new ArrayList<>();
        try {
            for (int i = 0; i < count; i++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return outboxService.enqueueSuggestion(candidate.getId(), UUID.randomUUID(), null, requestedAt, true);
                }));
            }
            start.countDown();
            for (Future<Boolean> future : futures) assertThat(future.get(15, TimeUnit.SECONDS)).isTrue();
        } finally {
            pool.shutdownNow();
        }

        List<Instant> slots = outbox.findAll().stream()
                .filter(row -> row.getRecipient().getId().equals(candidate.getId()))
                .map(NotificationOutbox::getScheduledAt)
                .sorted(Comparator.naturalOrder())
                .toList();
        assertThat(slots).hasSize(count);
        assertThat(slots.getFirst()).isAfterOrEqualTo(requestedAt.plusSeconds(11));
        for (int i = 1; i < slots.size(); i++) {
            assertThat(slots.get(i)).isAfterOrEqualTo(slots.get(i - 1).plusSeconds(30));
        }
    }

    @Test
    void competingDispatchersClaimAndDeliverOneLogicalRowOnlyOnce() throws Exception {
        UserAccount candidate = users.save(new UserAccount("dispatch." + UUID.randomUUID() + "@example.test",
                "hash", UserAccount.Role.CANDIDATE, "Dispatch candidate"));
        assertThat(outboxService.enqueue(candidate.getId(), "RECRUITER_CANDIDATE_FEEDBACK", UUID.randomUUID(), null,
                Instant.now().minusSeconds(1))).isTrue();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<?> first = pool.submit(() -> { start.await(); dispatcher.dispatchDue(); return null; });
            Future<?> second = pool.submit(() -> { start.await(); dispatcher.dispatchDue(); return null; });
            start.countDown();
            first.get(15, TimeUnit.SECONDS);
            second.get(15, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }

        List<NotificationOutbox> rows = outbox.findAll().stream()
                .filter(row -> row.getRecipient().getId().equals(candidate.getId()))
                .toList();
        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().getStatus()).isEqualTo(NotificationOutbox.OutboxStatus.SENT);
        assertThat(rows.getFirst().getAttemptCount()).isEqualTo(1);
        assertThat(rows.getFirst().getSentAt()).isNotNull();
    }
}
