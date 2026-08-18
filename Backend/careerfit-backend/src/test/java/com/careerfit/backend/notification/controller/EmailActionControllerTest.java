package com.careerfit.backend.notification.controller;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.feedback.entity.Feedback;
import com.careerfit.backend.feedback.service.FeedbackService;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.notification.entity.EmailAction;
import com.careerfit.backend.notification.repository.EmailActionRepository;
import com.careerfit.backend.notification.service.NotificationEmailService;
import com.careerfit.backend.notification.service.OutboxService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class EmailActionControllerTest {
    @Test
    void successfulCandidateFeedbackQueuesImmediateAlertForTheOwningRecruiter() throws Exception {
        EmailActionRepository actions = mock(EmailActionRepository.class);
        FeedbackService feedback = mock(FeedbackService.class);
        NotificationEmailService emails = mock(NotificationEmailService.class);
        OutboxService outbox = mock(OutboxService.class);
        EmailActionController controller = new EmailActionController(actions, feedback, emails, outbox);

        UUID matchingId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        UUID recruiterId = UUID.randomUUID();
        Matching matching = mock(Matching.class);
        Job job = mock(Job.class);
        UserAccount candidate = mock(UserAccount.class);
        UserAccount recruiter = mock(UserAccount.class);
        EmailAction action = mock(EmailAction.class);
        when(action.isPending()).thenReturn(true);
        when(action.isExpired()).thenReturn(false);
        when(action.getActionType()).thenReturn(EmailAction.ActionType.GOOD_MATCH);
        when(action.getMatching()).thenReturn(matching);
        when(action.getRecipient()).thenReturn(candidate);
        when(matching.getId()).thenReturn(matchingId);
        when(matching.getJob()).thenReturn(job);
        when(job.getId()).thenReturn(jobId);
        when(job.getRecruiter()).thenReturn(recruiter);
        when(candidate.getId()).thenReturn(candidateId);
        when(recruiter.getId()).thenReturn(recruiterId);
        when(actions.findByTokenHashForUpdate(hash("raw-token"))).thenReturn(Optional.of(action));

        MockHttpServletResponse response = new MockHttpServletResponse();
        controller.redeem("raw-token", response);

        verify(feedback).submitFeedback(matchingId, candidateId, Feedback.ActorRole.CANDIDATE,
                Feedback.FeedbackType.GOOD_MATCH, Feedback.SourceChannel.EMAIL);
        verify(outbox).enqueue(eq(recruiterId), eq("RECRUITER_CANDIDATE_FEEDBACK"), eq(matchingId), eq(jobId), any(Instant.class));
        verify(action).redeem();
        verify(actions).save(action);
        assertThat(response.getContentAsString()).contains("Hành động thành công");
    }

    @Test
    void replayExpiredAndInvalidTokensDoNotCreateFeedbackOrOutboxRows() throws Exception {
        EmailActionRepository actions = mock(EmailActionRepository.class);
        FeedbackService feedback = mock(FeedbackService.class);
        OutboxService outbox = mock(OutboxService.class);
        EmailActionController controller = new EmailActionController(actions, feedback,
                mock(NotificationEmailService.class), outbox);

        EmailAction replay = mock(EmailAction.class);
        when(replay.isPending()).thenReturn(false);
        when(actions.findByTokenHashForUpdate(hash("replay"))).thenReturn(Optional.of(replay));
        MockHttpServletResponse replayResponse = new MockHttpServletResponse();
        controller.redeem("replay", replayResponse);
        assertThat(replayResponse.getContentAsString()).contains("Đã xử lý");

        EmailAction expired = mock(EmailAction.class);
        when(expired.isPending()).thenReturn(true);
        when(expired.isExpired()).thenReturn(true);
        when(actions.findByTokenHashForUpdate(hash("expired"))).thenReturn(Optional.of(expired));
        MockHttpServletResponse expiredResponse = new MockHttpServletResponse();
        controller.redeem("expired", expiredResponse);
        verify(expired).setStatus(EmailAction.ActionStatus.EXPIRED);
        assertThat(expiredResponse.getContentAsString()).contains("Token hết hạn");

        MockHttpServletResponse invalidResponse = new MockHttpServletResponse();
        controller.redeem("missing", invalidResponse);
        assertThat(invalidResponse.getContentAsString()).contains("Token không hợp lệ");
        verifyNoInteractions(feedback, outbox);
    }

    private static String hash(String token) throws Exception {
        return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(token.getBytes(StandardCharsets.UTF_8)));
    }
}
