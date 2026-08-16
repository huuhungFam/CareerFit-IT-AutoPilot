package com.careerfit.backend.automation.service;

import com.careerfit.backend.automation.entity.AutomationPolicy;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Service
public class EffectiveAutomationPolicyResolver {

    private final AutomationPolicyService policyService;

    public EffectiveAutomationPolicyResolver(AutomationPolicyService policyService) {
        this.policyService = policyService;
    }

    public EffectivePolicy resolve(UUID userId) {
        AutomationPolicy stored = policyService.getOrCreate(userId);
        if (stored == null) {
            return null;
        }
        
        boolean isImported = stored.getUser().isImported();
        
        boolean effDemoMode = isImported ? false : stored.isDemoModeEnabled();
        boolean effAutoApply = isImported ? false : stored.isAutoApplyEnabled();
        boolean effEmailNotifications = isImported ? false : stored.isEmailNotificationsEnabled();
        boolean effDigest = isImported ? false : stored.isDigestEnabled();
        boolean effEmailAction = isImported ? false : stored.isEmailActionEnabled();
        boolean effAutopilot = isImported ? false : stored.isAutopilotEnabled();
        
        if (effDemoMode) {
            return new EffectivePolicy(
                    effAutopilot,
                    effAutoApply,
                    stored.getAutoApplyThreshold(),
                    effEmailNotifications,
                    effDigest,
                    stored.getDigestFrequency(),
                    stored.getDailyDigestTime(),
                    stored.getUserTimezone(),
                    stored.getMinScoreToNotify(),
                    stored.isNotifyOnHighOnly(),
                    stored.isNotifyPotential(),
                    stored.getMaxNotificationsPerDay(),
                    0, // cooldown 0
                    false, // quiet hours disabled
                    null,
                    null,
                    stored.isReplacementAfterSkipEnabled(),
                    stored.getReplacementDelayMinutes(),
                    effEmailAction,
                    stored.getPausedUntil(),
                    5,  // candidatePollIntervalSeconds
                    12, // firstSuggestionDelaySeconds
                    30, // subsequentSpacingSeconds
                    30  // recoveryCadenceSeconds
            );
        } else {
            return new EffectivePolicy(
                    effAutopilot,
                    effAutoApply,
                    stored.getAutoApplyThreshold(),
                    effEmailNotifications,
                    effDigest,
                    stored.getDigestFrequency(),
                    stored.getDailyDigestTime(),
                    stored.getUserTimezone(),
                    stored.getMinScoreToNotify(),
                    stored.isNotifyOnHighOnly(),
                    stored.isNotifyPotential(),
                    stored.getMaxNotificationsPerDay(),
                    stored.getNotificationCooldownHours(),
                    stored.isQuietHoursEnabled(),
                    stored.getQuietHoursStart(),
                    stored.getQuietHoursEnd(),
                    stored.isReplacementAfterSkipEnabled(),
                    stored.getReplacementDelayMinutes(),
                    effEmailAction,
                    stored.getPausedUntil(),
                    300,  // candidatePollIntervalSeconds (5m)
                    0,    // firstSuggestionDelaySeconds
                    3600, // subsequentSpacingSeconds (1h)
                    3600  // recoveryCadenceSeconds (1h)
            );
        }
    }

    public record EffectivePolicy(
            boolean autopilotEnabled,
            boolean autoApplyEnabled,
            BigDecimal autoApplyThreshold,
            boolean emailNotificationsEnabled,
            boolean digestEnabled,
            String digestFrequency,
            LocalTime dailyDigestTime,
            String userTimezone,
            Double minScoreToNotify,
            boolean notifyOnHighOnly,
            boolean notifyPotential,
            int maxNotificationsPerDay,
            int notificationCooldownHours,
            boolean quietHoursEnabled,
            LocalTime quietHoursStart,
            LocalTime quietHoursEnd,
            boolean replacementAfterSkipEnabled,
            int replacementDelayMinutes,
            boolean emailActionEnabled,
            Instant pausedUntil,
            int candidatePollIntervalSeconds,
            int firstSuggestionDelaySeconds,
            int subsequentSpacingSeconds,
            int recoveryCadenceSeconds
    ) {}
}
