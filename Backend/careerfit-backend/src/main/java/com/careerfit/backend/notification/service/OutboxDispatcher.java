package com.careerfit.backend.notification.service;

import com.careerfit.backend.notification.entity.NotificationOutbox;
import com.careerfit.backend.notification.repository.NotificationOutboxRepository;
import com.careerfit.backend.matching.repository.MatchingRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Arrays;

/** Durable, competing-worker-safe dispatcher. Claim and state changes are persisted before delivery. */
@Service
public class OutboxDispatcher {
    private final NotificationOutboxRepository repository;
    private final IMailService mailService;
    private final MatchingRepository matchingRepository;
    private final EmailActionService emailActionService;
    private final NotificationPolicyGuard notificationPolicyGuard;
    @org.springframework.beans.factory.annotation.Value("${app.mail.allowlist:}")
    private String allowlist;
    public OutboxDispatcher(NotificationOutboxRepository repository, IMailService mailService,
                            MatchingRepository matchingRepository, EmailActionService emailActionService,
                            NotificationPolicyGuard notificationPolicyGuard) {
        this.repository = repository;
        this.mailService = mailService;
        this.matchingRepository = matchingRepository;
        this.emailActionService = emailActionService;
        this.notificationPolicyGuard = notificationPolicyGuard;
    }

    @Scheduled(fixedDelayString = "${app.scheduler.outbox-delay-ms:1000}")
    @Transactional
    public void dispatchDue() { claimAndDeliver(); }

    public void claimAndDeliver() {
        List<NotificationOutbox> due = repository.lockDue(Instant.now(), PageRequest.of(0, 20));
        for (NotificationOutbox row : due) {
            row.setStatus(NotificationOutbox.OutboxStatus.PROCESSING);
            row.incrementAttempt();
            try {
                String email = row.getRecipient().getEmail();
                if (!isAllowed(email)) throw new IllegalStateException("Recipient suppressed by mail allowlist");
                if ("HIGH_MATCH".equals(row.getEmailType()) && "MATCHING".equals(row.getTargetType())) {
                    var matching = matchingRepository.findById(java.util.UUID.fromString(row.getTargetKey()))
                            .orElseThrow(() -> new IllegalStateException("Matching no longer exists for outbox row"));
                    emailActionService.deliverMatchNotification(row.getRecipient(), matching);
                } else {
                    mailService.deliverOutboxPlainText(email, "CareerFit notification", "Notification: " + row.getEmailType());
                }
                row.setStatus(NotificationOutbox.OutboxStatus.SENT);
                row.setSentAt(Instant.now());
                row.setLastError(null);
                notificationPolicyGuard.logSent(row.getRecipient(), row.getEmailType(), row.getTargetKey());
            } catch (Exception error) {
                row.setStatus(NotificationOutbox.OutboxStatus.FAILED);
                row.setLastError(error.getMessage());
                notificationPolicyGuard.logFailed(row.getRecipient(), row.getEmailType(), row.getTargetKey(), error.getMessage());
            }
        }
    }
    private boolean isAllowed(String email) {
        if (email == null || email.endsWith(".local")) return false;
        if (allowlist == null || allowlist.isBlank()) return true;
        return Arrays.stream(allowlist.split(",")).map(String::trim).anyMatch(entry -> entry.equalsIgnoreCase(email));
    }
}
