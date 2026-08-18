package com.careerfit.backend;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.notification.repository.NotificationOutboxRepository;
import com.careerfit.backend.notification.service.OutboxService;
import com.careerfit.backend.notification.service.NotificationPolicyGuard;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OutboxServiceTest {
    @Test
    void firstHighMatchGetsDemoFirstSlotAndLaterMatchGetsThirtySecondSpacing() {
        NotificationOutboxRepository repo = mock(NotificationOutboxRepository.class);
        when(repo.enqueueIdempotent(any(), any(), anyString(), anyString(), anyString(), any())).thenReturn(1);
        UserAccountRepository users = mock(UserAccountRepository.class);
        UUID recipient = UUID.randomUUID();
        UserAccount user = new UserAccount("candidate@example.test", "hash", UserAccount.Role.CANDIDATE, "Candidate");
        when(users.findByIdForUpdate(recipient)).thenReturn(java.util.Optional.of(user));
        NotificationPolicyGuard guard = allowedGuard();
        OutboxService service = new OutboxService(repo, users, guard);
        Instant now = Instant.now();

        when(repo.latestSuggestionSlot(recipient)).thenReturn(null);
        service.enqueueSuggestion(recipient, UUID.randomUUID(), null, now, true);
        ArgumentCaptor<Instant> first = ArgumentCaptor.forClass(Instant.class);
        verify(repo).enqueueIdempotent(any(), eq(recipient), eq("HIGH_MATCH"), anyString(), anyString(), first.capture());
        assertThat(first.getValue()).isAfterOrEqualTo(now.plusSeconds(11));

        reset(repo);
        Instant previous = Instant.now().plusSeconds(20);
        when(repo.latestSuggestionSlot(recipient)).thenReturn(previous);
        when(repo.enqueueIdempotent(any(), any(), anyString(), anyString(), anyString(), any())).thenReturn(1);
        service.enqueueSuggestion(recipient, UUID.randomUUID(), null, now, true);
        ArgumentCaptor<Instant> later = ArgumentCaptor.forClass(Instant.class);
        verify(repo).enqueueIdempotent(any(), eq(recipient), eq("HIGH_MATCH"), anyString(), anyString(), later.capture());
        assertThat(later.getValue()).isAfterOrEqualTo(previous.plusSeconds(30));
    }

    @Test
    void recruiterFeedbackAlertIsImmediateAndNotSuggestionSpaced() {
        NotificationOutboxRepository repo = mock(NotificationOutboxRepository.class);
        when(repo.enqueueIdempotent(any(), any(), anyString(), anyString(), anyString(), any())).thenReturn(1);
        OutboxService service = new OutboxService(repo, mock(UserAccountRepository.class), allowedGuard());
        Instant now = Instant.now();

        service.enqueue(UUID.randomUUID(), "RECRUITER_CANDIDATE_FEEDBACK", UUID.randomUUID(), null, now);

        ArgumentCaptor<Instant> scheduled = ArgumentCaptor.forClass(Instant.class);
        verify(repo).enqueueIdempotent(any(), any(), eq("RECRUITER_CANDIDATE_FEEDBACK"), anyString(), anyString(), scheduled.capture());
        assertThat(scheduled.getValue()).isEqualTo(now);
        verify(repo, never()).latestSuggestionSlot(any());
    }

    @Test
    void normalSuggestionUsesTheEffectivePolicyTimeWithoutDemoDelay() {
        NotificationOutboxRepository repo = mock(NotificationOutboxRepository.class);
        when(repo.enqueueIdempotent(any(), any(), anyString(), anyString(), anyString(), any())).thenReturn(1);
        UserAccountRepository users = mock(UserAccountRepository.class);
        UUID recipient = UUID.randomUUID();
        when(users.findByIdForUpdate(recipient)).thenReturn(java.util.Optional.of(
                new UserAccount("candidate@example.test", "hash", UserAccount.Role.CANDIDATE, "Candidate")));
        OutboxService service = new OutboxService(repo, users, allowedGuard());
        Instant now = Instant.now();

        service.enqueueSuggestion(recipient, UUID.randomUUID(), null, now, false);

        ArgumentCaptor<Instant> scheduled = ArgumentCaptor.forClass(Instant.class);
        verify(repo).enqueueIdempotent(any(), any(), eq("HIGH_MATCH"), anyString(), anyString(), scheduled.capture());
        assertThat(scheduled.getValue()).isEqualTo(now);
        verify(repo, never()).latestSuggestionSlot(any());
    }

    private NotificationPolicyGuard allowedGuard() {
        NotificationPolicyGuard guard = mock(NotificationPolicyGuard.class);
        when(guard.evaluate(any(), anyString(), anyString())).thenReturn(NotificationPolicyGuard.Decision.send());
        return guard;
    }
}
