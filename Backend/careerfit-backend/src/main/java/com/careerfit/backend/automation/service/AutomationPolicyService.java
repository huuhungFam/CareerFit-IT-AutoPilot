package com.careerfit.backend.automation.service;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.automation.entity.AutomationPolicy;
import com.careerfit.backend.automation.repository.AutomationPolicyRepository;
import com.careerfit.backend.common.dto.ValidationDtos;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.common.exception.ValidationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
public class AutomationPolicyService {

    private final AutomationPolicyRepository policyRepo;
    private final UserAccountRepository userRepo;

    public AutomationPolicyService(AutomationPolicyRepository policyRepo,
                                   UserAccountRepository userRepo) {
        this.policyRepo = policyRepo;
        this.userRepo = userRepo;
    }

    /**
     * Get or create default policy for a user.
     */
    @Transactional
    public AutomationPolicy getOrCreate(UUID userId) {
        return policyRepo.findByUserId(userId).orElseGet(() -> {
            UserAccount user = userRepo.findById(userId)
                    .orElseThrow(() -> AppException.notFound("User", userId));
            var policy = new AutomationPolicy(user);
            return policyRepo.save(policy);
        });
    }

    @Transactional
    public AutomationPolicy update(UUID userId, PolicyUpdateRequest req) {
        AutomationPolicy policy = getOrCreate(userId);

        if (req.autopilotEnabled()     != null) policy.setAutopilotEnabled(req.autopilotEnabled());
        if (req.autoApplyEnabled()     != null) policy.setAutoApplyEnabled(req.autoApplyEnabled());
        if (req.autoApplyThreshold()   != null) {
            if (req.autoApplyThreshold() < 50 || req.autoApplyThreshold() > 100) {
                throw new ValidationException("Validation failed: autoApplyThreshold must be between 50 and 100",
                        List.of(new ValidationDtos.QualitySignal(
                                ValidationDtos.Severity.ERROR,
                                "AUTO_APPLY_THRESHOLD_RANGE",
                                "autoApplyThreshold",
                                "Auto-Apply threshold must be between 50 and 100."
                        )));
            }
            policy.setAutoApplyThreshold(java.math.BigDecimal.valueOf(req.autoApplyThreshold()));
        }
        if (req.emailNotificationsEnabled() != null) policy.setEmailNotificationsEnabled(req.emailNotificationsEnabled());
        if (req.digestEnabled()        != null) policy.setDigestEnabled(req.digestEnabled());
        if (req.digestFrequency()      != null) policy.setDigestFrequency(req.digestFrequency());
        if (req.minScoreToNotify()     != null) policy.setMinScoreToNotify(req.minScoreToNotify());
        if (req.notifyOnHighOnly()     != null) policy.setNotifyOnHighOnly(req.notifyOnHighOnly());
        if (req.notifyPotential()      != null) policy.setNotifyPotential(req.notifyPotential());
        if (req.maxNotificationsPerDay()!= null) policy.setMaxNotificationsPerDay(req.maxNotificationsPerDay());
        if (req.notificationCooldownHours() != null) {
            policy.setNotificationCooldownHours(clamp(req.notificationCooldownHours(), 0, 168));
        }
        if (req.quietHoursEnabled()    != null) policy.setQuietHoursEnabled(req.quietHoursEnabled());
        if (req.quietHoursStart()      != null) policy.setQuietHoursStart(req.quietHoursStart());
        if (req.quietHoursEnd()        != null) policy.setQuietHoursEnd(req.quietHoursEnd());
        if (req.replacementAfterSkipEnabled() != null) {
            policy.setReplacementAfterSkipEnabled(req.replacementAfterSkipEnabled());
        }
        if (req.replacementDelayMinutes() != null) {
            policy.setReplacementDelayMinutes(clamp(req.replacementDelayMinutes(), 0, 1440));
        }
        if (req.pausedUntil()          != null) policy.setPausedUntil(req.pausedUntil());

        return policyRepo.save(policy);
    }

    @Transactional
    public AutomationPolicy.PolicySummary updateEmailNotifications(UUID userId, boolean enabled) {
        AutomationPolicy policy = getOrCreate(userId);
        policy.setEmailNotificationsEnabled(enabled);
        policyRepo.save(policy);
        return getSummary(userId);
    }

    @Transactional(readOnly = true)
    public AutomationPolicy.PolicySummary getSummary(UUID userId) {
        var policy = getOrCreate(userId);
        return new AutomationPolicy.PolicySummary(
                policy.isAutopilotEnabled(),
                policy.isAutoApplyEnabled(),
                policy.getAutoApplyThreshold().doubleValue(),
                policy.isEmailNotificationsEnabled(),
                policy.isDigestEnabled(),
                policy.getDigestFrequency(),
                policy.getMinScoreToNotify(),
                policy.isNotifyOnHighOnly(),
                policy.isNotifyPotential(),
                policy.getMaxNotificationsPerDay(),
                policy.getNotificationCooldownHours(),
                policy.isQuietHoursEnabled(),
                policy.getQuietHoursStart(),
                policy.getQuietHoursEnd(),
                policy.isReplacementAfterSkipEnabled(),
                policy.getReplacementDelayMinutes(),
                policy.getPausedUntil(),
                policy.getUpdatedAt()
        );
    }

    public record PolicyUpdateRequest(
        Boolean autopilotEnabled,
        Boolean autoApplyEnabled,
        Double autoApplyThreshold,
        Boolean emailNotificationsEnabled,
        Boolean digestEnabled,
        String digestFrequency,
        Double minScoreToNotify,
        Boolean notifyOnHighOnly,
        Boolean notifyPotential,
        Integer maxNotificationsPerDay,
        Integer notificationCooldownHours,
        Boolean quietHoursEnabled,
        LocalTime quietHoursStart,
        LocalTime quietHoursEnd,
        Boolean replacementAfterSkipEnabled,
        Integer replacementDelayMinutes,
        java.time.Instant pausedUntil
    ) {}

    public record EmailNotificationsToggleRequest(Boolean enabled) {}

    private int clamp(int value, int min, int max) {
        return Math.min(max, Math.max(min, value));
    }
}
