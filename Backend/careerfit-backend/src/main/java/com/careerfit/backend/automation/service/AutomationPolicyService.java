package com.careerfit.backend.automation.service;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.automation.entity.AutomationPolicy;
import com.careerfit.backend.automation.repository.AutomationPolicyRepository;
import com.careerfit.backend.common.exception.AppException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        if (req.digestEnabled()        != null) policy.setDigestEnabled(req.digestEnabled());
        if (req.digestFrequency()      != null) policy.setDigestFrequency(req.digestFrequency());
        if (req.minScoreToNotify()     != null) policy.setMinScoreToNotify(req.minScoreToNotify());
        if (req.notifyOnHighOnly()     != null) policy.setNotifyOnHighOnly(req.notifyOnHighOnly());
        if (req.notifyPotential()      != null) policy.setNotifyPotential(req.notifyPotential());
        if (req.maxNotificationsPerDay()!= null) policy.setMaxNotificationsPerDay(req.maxNotificationsPerDay());
        if (req.pausedUntil()          != null) policy.setPausedUntil(req.pausedUntil());

        return policyRepo.save(policy);
    }

    @Transactional(readOnly = true)
    public AutomationPolicy.PolicySummary getSummary(UUID userId) {
        var policy = getOrCreate(userId);
        return new AutomationPolicy.PolicySummary(
                policy.isAutopilotEnabled(),
                policy.isDigestEnabled(),
                policy.getDigestFrequency(),
                policy.getMinScoreToNotify(),
                policy.isNotifyOnHighOnly(),
                policy.isNotifyPotential(),
                policy.getMaxNotificationsPerDay(),
                policy.getPausedUntil()
        );
    }

    public record PolicyUpdateRequest(
        Boolean autopilotEnabled,
        Boolean digestEnabled,
        String digestFrequency,
        Double minScoreToNotify,
        Boolean notifyOnHighOnly,
        Boolean notifyPotential,
        Integer maxNotificationsPerDay,
        java.time.Instant pausedUntil
    ) {}
}
