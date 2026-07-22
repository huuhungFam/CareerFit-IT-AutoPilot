package com.careerfit.backend.feedback.service;

import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.feedback.entity.Feedback;
import com.careerfit.backend.feedback.repository.FeedbackRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

@Service
public class FeedbackService {

    private static final Logger log = LoggerFactory.getLogger(FeedbackService.class);

    private final FeedbackRepository feedbackRepo;
    private final MatchingRepository matchingRepo;
    private final UserAccountRepository userRepo;
    private final RocchioService rocchioService;
    private final AuditLogRepository auditRepo;

    public FeedbackService(FeedbackRepository feedbackRepo,
                           MatchingRepository matchingRepo,
                           UserAccountRepository userRepo,
                           RocchioService rocchioService,
                           AuditLogRepository auditRepo) {
        this.feedbackRepo = feedbackRepo;
        this.matchingRepo = matchingRepo;
        this.userRepo = userRepo;
        this.rocchioService = rocchioService;
        this.auditRepo = auditRepo;
    }

    /**
     * Record a feedback event and optionally trigger Rocchio update.
     *
     * @param matchingId  the matching being evaluated
     * @param userId      actor who gives feedback
     * @param actorRole   CANDIDATE or RECRUITER
     * @param feedbackType GOOD_MATCH | POTENTIAL | BAD_MATCH | NOT_INTERESTED
     * @param channel     WEB | EMAIL | DIGEST | AUTOPILOT
     */
    @Transactional
    public void submitFeedback(UUID matchingId, UUID userId,
                               Feedback.ActorRole actorRole,
                               Feedback.FeedbackType feedbackType,
                               Feedback.SourceChannel channel) {
        Matching matching = matchingRepo.findById(matchingId)
                .orElseThrow(() -> AppException.notFound("Matching", matchingId));

        var user = userRepo.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));

        authorizeActor(matching, userId, actorRole);

        // Upsert: if feedback already exists, update it
        Feedback feedback = feedbackRepo.findByMatchingIdAndActorId(matchingId, userId)
                .orElse(new Feedback(matching, user, actorRole, feedbackType, channel));

        feedback.setActorRole(actorRole);
        feedback.setFeedbackType(feedbackType);
        feedback.setSourceChannel(channel);

        try {
            feedbackRepo.saveAndFlush(feedback);
        } catch (DataIntegrityViolationException e) {
            Feedback existing = feedbackRepo.findByMatchingIdAndActorId(matchingId, userId)
                    .orElseThrow(() -> AppException.conflict("Feedback was submitted concurrently. Please retry."));
            existing.setActorRole(actorRole);
            existing.setFeedbackType(feedbackType);
            existing.setSourceChannel(channel);
            feedbackRepo.saveAndFlush(existing);
        }

        // Audit
        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, userId, "FEEDBACK_SUBMITTED")
                .withTarget("Matching", matchingId)
                .withChannel(mapChannel(channel))
                .withMetadata("{\"type\":\"" + feedbackType.name() + "\"}"));

        log.info("Feedback: user={} matching={} type={} channel={}",
                userId, matchingId, feedbackType, channel);

        // Trigger Rocchio update (async) if this is a learning signal
        if (feedbackType != Feedback.FeedbackType.NOT_INTERESTED) {
            UUID jobId = matching.getJob().getId();
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        rocchioService.updateJobVector(jobId);
                    }
                });
            } else {
                rocchioService.updateJobVector(jobId);
            }
        }
    }

    private void authorizeActor(Matching matching, UUID userId, Feedback.ActorRole actorRole) {
        boolean authorized = switch (actorRole) {
            case CANDIDATE -> matching.getCv().getCandidate().getUser().getId().equals(userId);
            case RECRUITER -> matching.getJob().getRecruiter().getId().equals(userId);
        };
        if (!authorized) {
            throw AppException.forbidden("You cannot submit feedback for this matching");
        }
    }

    private AuditLog.SourceChannel mapChannel(Feedback.SourceChannel c) {
        return switch (c) {
            case WEB      -> AuditLog.SourceChannel.WEB;
            case EMAIL    -> AuditLog.SourceChannel.EMAIL;
            case DIGEST   -> AuditLog.SourceChannel.DIGEST;
            case AUTOPILOT-> AuditLog.SourceChannel.AUTOPILOT;
        };
    }
}
