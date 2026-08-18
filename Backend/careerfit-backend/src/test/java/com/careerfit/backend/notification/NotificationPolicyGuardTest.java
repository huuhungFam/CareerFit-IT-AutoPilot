package com.careerfit.backend.notification;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.automation.service.EffectiveAutomationPolicyResolver;
import com.careerfit.backend.notification.repository.NotificationDeliveryLogRepository;
import com.careerfit.backend.notification.service.NotificationPolicyGuard;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NotificationPolicyGuardTest {
    @Test
    void normalModeHonorsEffectiveQuietHours() {
        EffectiveAutomationPolicyResolver resolver = mock(EffectiveAutomationPolicyResolver.class);
        NotificationDeliveryLogRepository log = mock(NotificationDeliveryLogRepository.class);
        UserAccount user = user();
        LocalTime now = LocalTime.now();
        when(resolver.resolve(user.getId())).thenReturn(policy(true, now.minusMinutes(2), now.plusMinutes(2), 24));

        var result = new NotificationPolicyGuard(resolver, log).evaluate(user, "HIGH_MATCH", "matching");

        assertThat(result.allowed()).isFalse();
        assertThat(result.reason()).isEqualTo("QUIET_HOURS");
        verifyNoInteractions(log);
    }

    @Test
    void demoEffectivePolicyBypassesStoredQuietHoursAndCooldown() {
        EffectiveAutomationPolicyResolver resolver = mock(EffectiveAutomationPolicyResolver.class);
        NotificationDeliveryLogRepository log = mock(NotificationDeliveryLogRepository.class);
        UserAccount user = user();
        when(resolver.resolve(user.getId())).thenReturn(policy(false, null, null, 0));
        when(log.countDeliveredBetween(any(), any(), any(), any())).thenReturn(0L);

        var result = new NotificationPolicyGuard(resolver, log).evaluate(user, "HIGH_MATCH", "matching");

        assertThat(result.allowed()).isTrue();
        verify(log, never()).existsRecentSent(any(), anyString(), anyString(), any(), any());
    }

    private static UserAccount user() {
        UserAccount user = mock(UserAccount.class);
        when(user.getId()).thenReturn(UUID.randomUUID());
        return user;
    }

    private static EffectiveAutomationPolicyResolver.EffectivePolicy policy(boolean quietHours, LocalTime start,
                                                                              LocalTime end, int cooldownHours) {
        return new EffectiveAutomationPolicyResolver.EffectivePolicy(
                false, false, BigDecimal.valueOf(90), true, false, "DAILY", LocalTime.NOON,
                "Asia/Ho_Chi_Minh", 70.0, true, false, 5, cooldownHours, quietHours, start, end,
                false, 0, true, null, 300, 0, 3600, 3600);
    }
}
