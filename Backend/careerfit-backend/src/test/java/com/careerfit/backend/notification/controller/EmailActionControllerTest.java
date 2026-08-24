package com.careerfit.backend.notification.controller;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.application.service.ApplicationService;
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
    void successfulCandidateFeedbackEmailsTheOwningRecruiterImmediately() throws Exception {
        EmailActionRepository actions = mock(EmailActionRepository.class);
        FeedbackService feedback = mock(FeedbackService.class);
        NotificationEmailService emails = mock(NotificationEmailService.class);
        OutboxService outbox = mock(OutboxService.class);
        EmailActionController controller = new EmailActionController(actions, feedback, emails, outbox,
                mock(ApplicationService.class));

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
        verify(emails).sendRecruiterCandidateFeedback(matching, "GOOD_MATCH");
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
                mock(NotificationEmailService.class), outbox, mock(ApplicationService.class));

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

    @Test
    void applyAndInvitationTokensUseTheStoredMatchingOrApplicationSnapshot() throws Exception {
        EmailActionRepository actions = mock(EmailActionRepository.class);
        ApplicationService applications = mock(ApplicationService.class);
        EmailActionController controller = new EmailActionController(actions, mock(FeedbackService.class),
                mock(NotificationEmailService.class), mock(OutboxService.class), applications);
        UserAccount candidate = mock(UserAccount.class);
        UUID candidateId = UUID.randomUUID();
        when(candidate.getId()).thenReturn(candidateId);

        Matching matching = mock(Matching.class);
        UUID matchingId = UUID.randomUUID();
        when(matching.getId()).thenReturn(matchingId);
        EmailAction apply = mock(EmailAction.class);
        when(apply.isPending()).thenReturn(true);
        when(apply.isExpired()).thenReturn(false);
        when(apply.getActionType()).thenReturn(EmailAction.ActionType.APPLY);
        when(apply.getRecipient()).thenReturn(candidate);
        when(apply.getMatching()).thenReturn(matching);
        when(actions.findByTokenHashForUpdate(hash("apply"))).thenReturn(Optional.of(apply));

        controller.redeem("apply", new MockHttpServletResponse());

        verify(applications).submitFromEmail(matchingId, candidateId);
        verify(apply).redeem();

        com.careerfit.backend.application.entity.Application invitation =
                mock(com.careerfit.backend.application.entity.Application.class);
        UUID invitationId = UUID.randomUUID();
        when(invitation.getId()).thenReturn(invitationId);
        EmailAction accept = mock(EmailAction.class);
        when(accept.isPending()).thenReturn(true);
        when(accept.isExpired()).thenReturn(false);
        when(accept.getActionType()).thenReturn(EmailAction.ActionType.ACCEPT_INVITATION);
        when(accept.getRecipient()).thenReturn(candidate);
        when(accept.getApplication()).thenReturn(invitation);
        when(actions.findByTokenHashForUpdate(hash("accept"))).thenReturn(Optional.of(accept));

        controller.redeem("accept", new MockHttpServletResponse());

        verify(applications).respondToInvitation(eq(invitationId), eq(candidateId),
                argThat(request -> "ACCEPT".equals(request.decision())));
        verify(accept).redeem();
    }

    private static String hash(String token) throws Exception {
        return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(token.getBytes(StandardCharsets.UTF_8)));
    }
}
