package com.careerfit.backend.automation.service;

import com.careerfit.backend.automation.entity.AutomationPolicy;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EffectiveAutomationPolicyResolverTest {

    @Test
    void demoModeUsesFastTimingAndThreeHundredEmailQuotaWithoutChangingStoredNormalValues() {
        AutomationPolicyService policies = mock(AutomationPolicyService.class);
        AutomationPolicy stored = mock(AutomationPolicy.class);
        when(policies.getOrCreate(org.mockito.ArgumentMatchers.any())).thenReturn(stored);
        when(stored.isDemoModeEnabled()).thenReturn(true);
        when(stored.getAutoApplyThreshold()).thenReturn(BigDecimal.valueOf(75));
        when(stored.getDigestFrequency()).thenReturn("DAILY");
        when(stored.getDailyDigestTime()).thenReturn(LocalTime.of(8, 0));
        when(stored.getUserTimezone()).thenReturn("Asia/Ho_Chi_Minh");
        when(stored.getMaxNotificationsPerDay()).thenReturn(5);

        var effective = new EffectiveAutomationPolicyResolver(policies).resolve(UUID.randomUUID());

        assertThat(effective.maxNotificationsPerDay()).isEqualTo(300);
        assertThat(effective.notificationCooldownHours()).isZero();
        assertThat(effective.candidatePollIntervalSeconds()).isEqualTo(5);
        assertThat(effective.firstSuggestionDelaySeconds()).isEqualTo(12);
        assertThat(effective.subsequentSpacingSeconds()).isEqualTo(30);
        assertThat(stored.getMaxNotificationsPerDay()).isEqualTo(5);
    }
}
