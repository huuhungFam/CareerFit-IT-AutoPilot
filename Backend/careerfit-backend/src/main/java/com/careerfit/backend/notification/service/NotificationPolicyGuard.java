package com.careerfit.backend.notification.service;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.automation.entity.AutomationPolicy;
import com.careerfit.backend.automation.service.AutomationPolicyService;
import com.careerfit.backend.notification.entity.NotificationDeliveryLog;
import com.careerfit.backend.notification.repository.NotificationDeliveryLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;

@Service
public class NotificationPolicyGuard {

    private final AutomationPolicyService policyService;
    private final NotificationDeliveryLogRepository deliveryLogRepo;

    public NotificationPolicyGuard(AutomationPolicyService policyService,
                                   NotificationDeliveryLogRepository deliveryLogRepo) {
        this.policyService = policyService;
        this.deliveryLogRepo = deliveryLogRepo;
    }

    @Transactional
    public Decision evaluate(UserAccount recipient, String emailType, String contextKey) {
        if (recipient == null || recipient.getId() == null) {
            return Decision.skip("RECIPIENT_MISSING");
        }

        AutomationPolicy policy = policyService.getOrCreate(recipient.getId());
        if (policy == null) {
            return Decision.skip("POLICY_NOT_FOUND");
        }
        if (!policy.isEmailNotificationsEnabled()) {
            return Decision.skip("EMAIL_DISABLED");
        }

        ZonedDateTime now = ZonedDateTime.now(zone(policy));
        if (policy.isQuietHoursEnabled() && isInQuietHours(now.toLocalTime(),
                policy.getQuietHoursStart(), policy.getQuietHoursEnd())) {
            return Decision.skip("QUIET_HOURS");
        }

        Instant dayStart = now.toLocalDate().atStartOfDay(now.getZone()).toInstant();
        long sentToday = deliveryLogRepo.countDeliveredBetween(
                recipient.getId(),
                NotificationDeliveryLog.DeliveryStatus.SENT,
                dayStart,
                now.toInstant());
        if (policy.getMaxEmailPerDay() <= 0 || sentToday >= policy.getMaxEmailPerDay()) {
            return Decision.skip("DAILY_QUOTA_EXCEEDED");
        }

        int cooldownHours = Math.max(0, policy.getNotificationCooldownHours());
        if (cooldownHours > 0) {
            Instant since = Instant.now().minus(Duration.ofHours(cooldownHours));
            boolean recent = deliveryLogRepo.existsRecentSent(
                    recipient.getId(),
                    emailType,
                    contextKey,
                    NotificationDeliveryLog.DeliveryStatus.SENT,
                    since);
            if (recent) {
                return Decision.skip("COOLDOWN_ACTIVE");
            }
        }

        return Decision.send();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logSent(UserAccount recipient, String emailType, String contextKey) {
        log(recipient, emailType, contextKey, NotificationDeliveryLog.DeliveryStatus.SENT, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logSkipped(UserAccount recipient, String emailType, String contextKey, String reason) {
        log(recipient, emailType, contextKey, NotificationDeliveryLog.DeliveryStatus.SKIPPED, reason);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logFailed(UserAccount recipient, String emailType, String contextKey, String reason) {
        log(recipient, emailType, contextKey, NotificationDeliveryLog.DeliveryStatus.FAILED, trim(reason));
    }

    private void log(UserAccount recipient, String emailType, String contextKey,
                     NotificationDeliveryLog.DeliveryStatus status, String reason) {
        if (recipient == null || recipient.getId() == null) return;
        deliveryLogRepo.save(new NotificationDeliveryLog(
                recipient,
                trim(emailType),
                trim(contextKey, 120),
                status,
                trim(reason)));
    }

    private boolean isInQuietHours(LocalTime now, LocalTime start, LocalTime end) {
        if (start == null || end == null || start.equals(end)) return false;
        if (start.isBefore(end)) {
            return !now.isBefore(start) && now.isBefore(end);
        }
        return !now.isBefore(start) || now.isBefore(end);
    }

    private ZoneId zone(AutomationPolicy policy) {
        try {
            return ZoneId.of(policy.getUserTimezone());
        } catch (Exception ignored) {
            return ZoneId.of("Asia/Ho_Chi_Minh");
        }
    }

    private String trim(String value) {
        if (value == null) return null;
        return value.length() <= 255 ? value : value.substring(0, 255);
    }

    private String trim(String value, int maxLength) {
        if (value == null) return null;
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    public record Decision(boolean allowed, String reason) {
        public static Decision send() {
            return new Decision(true, null);
        }

        public static Decision skip(String reason) {
            return new Decision(false, reason);
        }
    }
}
