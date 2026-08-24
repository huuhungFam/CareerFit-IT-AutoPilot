package com.careerfit.backend;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.notification.entity.NotificationOutbox;
import com.careerfit.backend.notification.repository.NotificationOutboxRepository;
import com.careerfit.backend.notification.service.IMailService;
import com.careerfit.backend.notification.service.OutboxDispatcher;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.notification.service.EmailActionService;
import com.careerfit.backend.notification.service.NotificationPolicyGuard;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Constructor;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OutboxDispatcherTest {
    @Test
    void dueRowIsDeliveredOnceAndMarkedSent() throws Exception {
        NotificationOutboxRepository repo = mock(NotificationOutboxRepository.class);
        IMailService mail = mock(IMailService.class);
        NotificationOutbox row = row("candidate@example.com");
        when(repo.lockDue(any(), any())).thenReturn(List.of(row));
        OutboxDispatcher dispatcher = dispatcher(repo, mail, mock(MatchingRepository.class), mock(EmailActionService.class));
        ReflectionTestUtils.setField(dispatcher, "allowlist", "candidate@example.com");

        dispatcher.claimAndDeliver();

        verify(mail).deliverOutboxPlainText(eq("candidate@example.com"), anyString(), anyString());
        assertThat(row.getStatus()).isEqualTo(NotificationOutbox.OutboxStatus.SENT);
        assertThat(row.getAttemptCount()).isEqualTo(1);
        assertThat(row.getSentAt()).isNotNull();
    }

    @Test
    void syntheticLocalRecipientIsSuppressedAndRetryable() throws Exception {
        NotificationOutboxRepository repo = mock(NotificationOutboxRepository.class);
        IMailService mail = mock(IMailService.class);
        NotificationOutbox row = row("recruiter@careerfit.local");
        when(repo.lockDue(any(), any())).thenReturn(List.of(row));
        OutboxDispatcher dispatcher = dispatcher(repo, mail, mock(MatchingRepository.class), mock(EmailActionService.class));
        ReflectionTestUtils.setField(dispatcher, "allowlist", "");

        dispatcher.claimAndDeliver();

        verifyNoInteractions(mail);
        assertThat(row.getStatus()).isEqualTo(NotificationOutbox.OutboxStatus.FAILED);
        assertThat(row.getAttemptCount()).isEqualTo(1);
        assertThat(row.getLastError()).contains("suppressed");
    }

    @Test
    void deliveryFailureIsRecordedForRetry() throws Exception {
        NotificationOutboxRepository repo = mock(NotificationOutboxRepository.class);
        IMailService mail = mock(IMailService.class);
        NotificationOutbox row = row("candidate@example.com");
        when(repo.lockDue(any(), any())).thenReturn(List.of(row));
        doThrow(new IllegalStateException("smtp unavailable"))
                .when(mail).deliverOutboxPlainText(anyString(), anyString(), anyString());
        OutboxDispatcher dispatcher = dispatcher(repo, mail, mock(MatchingRepository.class), mock(EmailActionService.class));
        ReflectionTestUtils.setField(dispatcher, "allowlist", "candidate@example.com");

        dispatcher.claimAndDeliver();

        assertThat(row.getStatus()).isEqualTo(NotificationOutbox.OutboxStatus.FAILED);
        assertThat(row.getAttemptCount()).isEqualTo(1);
        assertThat(row.getLastError()).contains("smtp unavailable");

        doNothing().when(mail).deliverOutboxPlainText(anyString(), anyString(), anyString());
        dispatcher.claimAndDeliver();
        assertThat(row.getStatus()).isEqualTo(NotificationOutbox.OutboxStatus.SENT);
        assertThat(row.getAttemptCount()).isEqualTo(2);
    }

    @Test
    void highMatchUsesTheTokenizedOutboxDeliveryPath() throws Exception {
        NotificationOutboxRepository repo = mock(NotificationOutboxRepository.class);
        IMailService mail = mock(IMailService.class);
        MatchingRepository matchings = mock(MatchingRepository.class);
        EmailActionService actions = mock(EmailActionService.class);
        UUID matchingId = UUID.randomUUID();
        com.careerfit.backend.matching.entity.Matching matching = mock(com.careerfit.backend.matching.entity.Matching.class);
        NotificationOutbox row = row("candidate@example.com", "HIGH_MATCH", matchingId.toString());
        when(repo.lockDue(any(), any())).thenReturn(List.of(row));
        when(matchings.findById(matchingId)).thenReturn(Optional.of(matching));
        OutboxDispatcher dispatcher = dispatcher(repo, mail, matchings, actions);
        ReflectionTestUtils.setField(dispatcher, "allowlist", "candidate@example.com");

        dispatcher.claimAndDeliver();

        verify(actions).deliverMatchNotification(row.getRecipient(), matching);
        verifyNoInteractions(mail);
        assertThat(row.getStatus()).isEqualTo(NotificationOutbox.OutboxStatus.SENT);
    }

    @Test
    void cvMatchNotificationUsesTheSingleMatchingDeliveryPath() throws Exception {
        NotificationOutboxRepository repo = mock(NotificationOutboxRepository.class);
        IMailService mail = mock(IMailService.class);
        MatchingRepository matchings = mock(MatchingRepository.class);
        EmailActionService actions = mock(EmailActionService.class);
        UUID matchingId = UUID.randomUUID();
        com.careerfit.backend.matching.entity.Matching matching = mock(com.careerfit.backend.matching.entity.Matching.class);
        NotificationOutbox row = row("candidate@example.com", "MATCH_NOTIFICATION", matchingId.toString());
        when(repo.lockDue(any(), any())).thenReturn(List.of(row));
        when(matchings.findById(matchingId)).thenReturn(Optional.of(matching));
        OutboxDispatcher dispatcher = dispatcher(repo, mail, matchings, actions);
        ReflectionTestUtils.setField(dispatcher, "allowlist", "candidate@example.com");

        dispatcher.claimAndDeliver();

        verify(actions).deliverCvMatchNotification(row.getRecipient(), matching);
        verifyNoInteractions(mail);
        assertThat(row.getStatus()).isEqualTo(NotificationOutbox.OutboxStatus.SENT);
    }

    @Test
    void auditFailureAfterSuccessfulDeliveryDoesNotRetryTheEmail() throws Exception {
        NotificationOutboxRepository repo = mock(NotificationOutboxRepository.class);
        IMailService mail = mock(IMailService.class);
        NotificationPolicyGuard guard = mock(NotificationPolicyGuard.class);
        NotificationOutbox row = row("candidate@example.com");
        when(repo.lockDue(any(), any())).thenReturn(List.of(row));
        doThrow(new IllegalStateException("audit database unavailable"))
                .when(guard).logSent(any(), anyString(), anyString());
        OutboxDispatcher dispatcher = dispatcher(repo, mail, mock(MatchingRepository.class),
                mock(EmailActionService.class), guard);
        ReflectionTestUtils.setField(dispatcher, "allowlist", "candidate@example.com");

        dispatcher.claimAndDeliver();

        verify(mail).deliverOutboxPlainText(eq("candidate@example.com"), anyString(), anyString());
        assertThat(row.getStatus()).isEqualTo(NotificationOutbox.OutboxStatus.SENT);
        assertThat(row.getLastError()).isNull();
    }

    @Test
    void nonAllowlistedLiveRecipientIsSuppressed() throws Exception {
        NotificationOutboxRepository repo = mock(NotificationOutboxRepository.class);
        IMailService mail = mock(IMailService.class);
        NotificationOutbox row = row("not-approved@example.com");
        when(repo.lockDue(any(), any())).thenReturn(List.of(row));
        OutboxDispatcher dispatcher = dispatcher(repo, mail, mock(MatchingRepository.class), mock(EmailActionService.class));
        ReflectionTestUtils.setField(dispatcher, "allowlist", "approved@example.com");

        dispatcher.claimAndDeliver();

        verifyNoInteractions(mail);
        assertThat(row.getStatus()).isEqualTo(NotificationOutbox.OutboxStatus.FAILED);
    }

    private NotificationOutbox row(String email) throws Exception {
        return row(email, "RECRUITER_CANDIDATE_FEEDBACK", "target");
    }

    private NotificationOutbox row(String email, String emailType, String targetKey) throws Exception {
        UserAccount user = new UserAccount(email, "hash", UserAccount.Role.CANDIDATE, "Candidate");
        Constructor<NotificationOutbox> ctor = NotificationOutbox.class.getDeclaredConstructor(UserAccount.class, String.class, String.class, String.class, Instant.class);
        ctor.setAccessible(true);
        return ctor.newInstance(user, emailType, "MATCHING", targetKey, Instant.now().minusSeconds(1));
    }

    private OutboxDispatcher dispatcher(NotificationOutboxRepository repo, IMailService mail,
                                        MatchingRepository matchings, EmailActionService actions) {
        return dispatcher(repo, mail, matchings, actions, mock(NotificationPolicyGuard.class));
    }

    private OutboxDispatcher dispatcher(NotificationOutboxRepository repo, IMailService mail,
                                        MatchingRepository matchings, EmailActionService actions,
                                        NotificationPolicyGuard guard) {
        return new OutboxDispatcher(repo, mail, matchings, mock(CVRepository.class), actions,
                guard);
    }
}
