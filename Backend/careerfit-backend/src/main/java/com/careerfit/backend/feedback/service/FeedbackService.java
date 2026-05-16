package com.careerfit.backend.feedback.service;

import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.feedback.entity.Feedback;
import com.careerfit.backend.feedback.repository.FeedbackRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        // Upsert: if feedback already exists, update it
        Feedback feedback = feedbackRepo.findByMatchingIdAndActorId(matchingId, userId)
                .orElse(new Feedback(matching, user, actorRole, feedbackType, channel));

        // If overwriting NOT_INTERESTED with a real signal → update
        feedbackRepo.save(feedback);

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
            rocchioService.updateJobVector(jobId);
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
