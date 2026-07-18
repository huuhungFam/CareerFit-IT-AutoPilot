package com.careerfit.backend.scheduler;

import com.careerfit.backend.automation.entity.AutomationPolicy;
import com.careerfit.backend.automation.repository.AutomationPolicyRepository;
import com.careerfit.backend.automation.service.AutoApplyService;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.matching.service.MatchingService;
import com.careerfit.backend.matching.service.ScoringService;
import com.careerfit.backend.notification.repository.EmailActionRepository;
import com.careerfit.backend.notification.service.EmailActionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Central scheduler for all background automation tasks:
 *
 *  1. RECOMPUTE STALE MATCHINGS — runs every 30 minutes
 *     Finds matchings where needsRecompute=true (after Rocchio update)
 *     and re-scores them.
 *
 *  2. DAILY DIGEST — runs every day at 8:00 AM ICT
 *     For each candidate with digestEnabled, sends a digest of top matches.
 *
 *  3. TOKEN CLEANUP — runs every day at 3:00 AM ICT
 *     Expires pending tokens that have passed their expiresAt.
 *     Purges tokens expired > 30 days.
 *
 *  4. NEW MATCH NOTIFICATIONS — runs every 4 hours
 *     For candidates with autopilotEnabled, sends individual match
 *     notification emails for new SCORING_DONE CVs.
 */
@Component
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class AutomationScheduler {

    private static final Logger log = LoggerFactory.getLogger(AutomationScheduler.class);

    private final MatchingRepository matchingRepo;
    private final ScoringService scoringService;
    private final CandidateRepository candidateRepo;
    private final CVRepository cvRepo;
    private final AutomationPolicyRepository policyRepo;
    private final EmailActionService emailActionService;
    private final EmailActionRepository emailActionRepo;
    private final AutoApplyService autoApplyService;

    public AutomationScheduler(MatchingRepository matchingRepo,
                                ScoringService scoringService,
                                CandidateRepository candidateRepo,
                                CVRepository cvRepo,
                                AutomationPolicyRepository policyRepo,
                                EmailActionService emailActionService,
                                EmailActionRepository emailActionRepo,
                                AutoApplyService autoApplyService) {
        this.matchingRepo = matchingRepo;
        this.scoringService = scoringService;
        this.candidateRepo = candidateRepo;
        this.cvRepo = cvRepo;
        this.policyRepo = policyRepo;
        this.emailActionService = emailActionService;
        this.emailActionRepo = emailActionRepo;
        this.autoApplyService = autoApplyService;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 1. Recompute stale matchings (every 30 minutes)
    // ─────────────────────────────────────────────────────────────────────

    @Scheduled(fixedDelayString = "${app.scheduler.recompute-delay-ms:1800000}")
    @Transactional
    public void recomputeStaleMatchings() {
        List<Matching> stale = matchingRepo.findByNeedsRecomputeTrue();
        if (stale.isEmpty()) return;

        log.info("[SCHEDULER] Recomputing {} stale matchings...", stale.size());
        int success = 0, failed = 0;

        for (Matching m : stale) {
            try {
                ScoringService.ScoringResult result = scoringService.score(m.getCv(), m.getJob());
                m.setRawScore(result.rawScore());
                m.setNormalizedScore(result.normalizedScore());
                m.setLabel(result.label());
                m.setPotential(result.isPotential());
                m.setNeedsRecompute(false);
                matchingRepo.save(m);
                success++;
            } catch (Exception e) {
                log.error("[SCHEDULER] Failed to recompute matching {}: {}", m.getId(), e.getMessage());
                failed++;
            }
        }
        log.info("[SCHEDULER] Recompute done. Success={}, Failed={}", success, failed);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. Daily digest (every day at 8:00 AM ICT)
    // ─────────────────────────────────────────────────────────────────────

    @Scheduled(cron = "${app.scheduler.daily-digest-cron:0 0 8 * * *}", zone = "${app.scheduler.zone:Asia/Ho_Chi_Minh}")
    @Transactional
    public void sendDailyDigest() {
        log.info("[SCHEDULER] Starting daily digest...");

        List<AutomationPolicy> digestPolicies = policyRepo.findByDigestEnabledTrueAndAutopilotEnabledTrue();

        int sent = 0;
        for (AutomationPolicy policy : digestPolicies) {
            try {
                // Skip if paused
                if (policy.getPausedUntil() != null &&
                        Instant.now().isBefore(policy.getPausedUntil())) {
                    continue;
                }

                var user = policy.getUser();

                // Get default CV
                var candidateOpt = candidateRepo.findByUserId(user.getId());
                if (candidateOpt.isEmpty()) continue;

                var defaultCvOpt = cvRepo.findByCandidateIdAndIsDefaultTrue(
                        candidateOpt.get().getId());
                if (defaultCvOpt.isEmpty()) continue;

                CV cv = defaultCvOpt.get();
                if (cv.getStatus() != CV.CvStatus.SCORING_DONE) continue;

                // Get top N matches
                double minScore = policy.getMinScoreToNotify() != null
                        ? policy.getMinScoreToNotify() : 40.0;

                List<Matching> topMatches = matchingRepo.findTopMatchesByCvId(
                        cv.getId(), PageRequest.of(0, 5));

                // Filter by min score and notification preferences
                List<Matching> filtered = topMatches.stream()
                        .filter(m -> m.getNormalizedScore().doubleValue() >= minScore)
                        .filter(m -> !policy.isNotifyOnHighOnly() ||
                                     m.getLabel() == Matching.MatchLabel.HIGH)
                        .filter(m -> policy.isNotifyPotential() || !m.isPotential() ||
                                     m.getLabel() == Matching.MatchLabel.HIGH)
                        .toList();

                if (filtered.isEmpty()) continue;

                emailActionService.sendDigest(user, filtered);
                sent++;
            } catch (Exception e) {
                log.error("[SCHEDULER] Digest failed for policy {}: {}", policy.getId(), e.getMessage());
            }
        }
        log.info("[SCHEDULER] Daily digest done. Sent to {} users.", sent);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. Token cleanup (every day at 3:00 AM ICT)
    // ─────────────────────────────────────────────────────────────────────

    @Scheduled(cron = "${app.scheduler.token-cleanup-cron:0 0 3 * * *}", zone = "${app.scheduler.zone:Asia/Ho_Chi_Minh}")
    @Transactional
    public void cleanupExpiredTokens() {
        log.info("[SCHEDULER] Cleaning up expired email action tokens...");

        Instant now    = Instant.now();
        Instant cutoff = now.minus(30, ChronoUnit.DAYS);

        int expired = emailActionRepo.expireOlderThan(now);
        int purged  = emailActionRepo.deleteExpiredBefore(cutoff);

        log.info("[SCHEDULER] Token cleanup: expired={}, purged={}", expired, purged);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. New match notifications (every 4 hours)
    //    Only notifies for HIGH matches above candidate's threshold
    // ─────────────────────────────────────────────────────────────────────

    @Scheduled(fixedDelayString = "${app.scheduler.notification-delay-ms:14400000}")
    @Transactional
    public void notifyHighMatches() {
        log.info("[SCHEDULER] Scanning for high-value matches to notify...");

        // Only run during business hours ICT (7am - 10pm)
        ZonedDateTime nowIct = ZonedDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        int hour = nowIct.getHour();
        if (hour < 7 || hour > 22) {
            log.info("[SCHEDULER] Outside business hours ({}:xx ICT), skipping notifications.", hour);
            return;
        }

        List<AutomationPolicy> activePolicies = policyRepo.findByAutopilotEnabledTrue();

        int notified = 0;
        for (AutomationPolicy policy : activePolicies) {
            try {
                if (policy.getPausedUntil() != null &&
                        Instant.now().isBefore(policy.getPausedUntil())) continue;

                var user = policy.getUser();
                var candidateOpt = candidateRepo.findByUserId(user.getId());
                if (candidateOpt.isEmpty()) continue;

                var defaultCvOpt = cvRepo.findByCandidateIdAndIsDefaultTrue(
                        candidateOpt.get().getId());
                if (defaultCvOpt.isEmpty()) continue;

                CV cv = defaultCvOpt.get();
                if (cv.getStatus() != CV.CvStatus.SCORING_DONE) continue;

                double minScore = policy.getMinScoreToNotify() != null
                        ? policy.getMinScoreToNotify() : 60.0;

                // Notify only the single best new HIGH match
                matchingRepo.findTopMatchesByCvId(cv.getId(), PageRequest.of(0, 1))
                        .stream()
                        .filter(m -> m.getNormalizedScore().doubleValue() >= minScore)
                        .filter(m -> m.getLabel() == Matching.MatchLabel.HIGH)
                        .findFirst()
                        .ifPresent(m -> {
                            emailActionService.sendMatchNotification(user, m);
                        });

                notified++;
            } catch (Exception e) {
                log.error("[SCHEDULER] Notify failed for policy {}: {}", policy.getId(), e.getMessage());
            }
        }
        log.info("[SCHEDULER] Match notifications done. Notified {} candidates.", notified);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. Auto-apply (every 2 hours)
    //    Creates AUTO_APPLIED applications for candidate policies above threshold.
    // ─────────────────────────────────────────────────────────────────────

    @Scheduled(fixedDelayString = "${app.scheduler.auto-apply-delay-ms:7200000}")
    public void executeAutoApply() {
        log.info("[SCHEDULER] Scanning auto-apply policies...");
        List<AutomationPolicy> policies = policyRepo.findByAutoApplyEnabledTrue();
        int created = 0;
        for (AutomationPolicy policy : policies) {
            try {
                created += autoApplyService.runForPolicy(policy);
            } catch (Exception e) {
                log.error("[SCHEDULER] Auto-apply failed for policy {}: {}", policy.getId(), e.getMessage());
            }
        }
        log.info("[SCHEDULER] Auto-apply done. Created {} applications.", created);
    }
}
