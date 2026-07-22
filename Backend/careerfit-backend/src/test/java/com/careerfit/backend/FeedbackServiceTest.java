package com.careerfit.backend;

import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.feedback.entity.Feedback;
import com.careerfit.backend.feedback.repository.FeedbackRepository;
import com.careerfit.backend.feedback.service.FeedbackService;
import com.careerfit.backend.feedback.service.RocchioService;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeedbackServiceTest {

    @Test
    void candidateCannotSubmitFeedbackForAnotherCandidatesMatching() {
        UUID matchingId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UserAccount actor = mock(UserAccount.class);
        UserAccount owner = mock(UserAccount.class);
        when(owner.getId()).thenReturn(UUID.randomUUID());
        Candidate candidate = mock(Candidate.class);
        when(candidate.getUser()).thenReturn(owner);
        CV cv = mock(CV.class);
        when(cv.getCandidate()).thenReturn(candidate);
        Matching matching = mock(Matching.class);
        when(matching.getCv()).thenReturn(cv);

        MatchingRepository matchingRepo = mock(MatchingRepository.class);
        when(matchingRepo.findById(matchingId)).thenReturn(Optional.of(matching));
        UserAccountRepository userRepo = mock(UserAccountRepository.class);
        when(userRepo.findById(actorId)).thenReturn(Optional.of(actor));
        FeedbackRepository feedbackRepo = mock(FeedbackRepository.class);
        FeedbackService service = new FeedbackService(
                feedbackRepo,
                matchingRepo,
                userRepo,
                mock(RocchioService.class),
                mock(AuditLogRepository.class));

        assertThatThrownBy(() -> service.submitFeedback(
                matchingId,
                actorId,
                Feedback.ActorRole.CANDIDATE,
                Feedback.FeedbackType.GOOD_MATCH,
                Feedback.SourceChannel.WEB))
                .isInstanceOf(AppException.class)
                .satisfies(error -> assertThat(((AppException) error).getCode()).isEqualTo("FORBIDDEN"));

        verify(feedbackRepo, never()).saveAndFlush(any());
    }
}
