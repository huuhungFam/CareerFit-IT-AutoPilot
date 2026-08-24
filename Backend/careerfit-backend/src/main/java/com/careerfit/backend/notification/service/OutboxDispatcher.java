package com.careerfit.backend.notification.service;

import com.careerfit.backend.notification.entity.NotificationOutbox;
import com.careerfit.backend.notification.repository.NotificationOutboxRepository;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.cv.repository.CVRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.Instant;
import java.util.List;
import java.util.Arrays;

/** Durable, competing-worker-safe dispatcher. Claim and state changes are persisted before delivery. */
@Service
public class OutboxDispatcher {
    private static final Logger log = LoggerFactory.getLogger(OutboxDispatcher.class);
    private static final long RETRY_DELAY_SECONDS = 30;

    private final NotificationOutboxRepository repository;
    private final IMailService mailService;
    private final MatchingRepository matchingRepository;
    private final CVRepository cvRepository;
    private final EmailActionService emailActionService;
    private final NotificationPolicyGuard notificationPolicyGuard;
    @org.springframework.beans.factory.annotation.Value("${app.mail.allowlist:}")
    private String allowlist;
    public OutboxDispatcher(NotificationOutboxRepository repository, IMailService mailService,
                            MatchingRepository matchingRepository, CVRepository cvRepository, EmailActionService emailActionService,
                            NotificationPolicyGuard notificationPolicyGuard) {
        this.repository = repository;
        this.mailService = mailService;
        this.matchingRepository = matchingRepository;
        this.cvRepository = cvRepository;
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
                } else if ("MATCH_NOTIFICATION".equals(row.getEmailType()) && "MATCHING".equals(row.getTargetType())) {
                    var matching = matchingRepository.findById(java.util.UUID.fromString(row.getTargetKey()))
                            .orElseThrow(() -> new IllegalStateException("Matching no longer exists for outbox row"));
                    emailActionService.deliverCvMatchNotification(row.getRecipient(), matching);
                } else if ("MATCH_NOTIFICATION".equals(row.getEmailType()) && "CV".equals(row.getTargetType())) {
                    // Compatibility for CV-targeted rows created by earlier builds.
                    var cv = cvRepository.findById(java.util.UUID.fromString(row.getTargetKey()))
                            .orElseThrow(() -> new IllegalStateException("CV no longer exists for outbox row"));
                    emailActionService.deliverLegacyCvMatchNotification(row.getRecipient(), cv);
                } else {
                    mailService.deliverOutboxPlainText(email, "CareerFit: Thông báo", "Thông báo: " + row.getEmailType());
                }
                markSent(row);
            } catch (Exception error) {
                markFailed(row, error);
            }
        }
    }

    /**
     * Delivery and audit logging are intentionally separate. Once SMTP accepts a message,
     * the outbox row must remain SENT even if the non-critical quota/audit insert fails.
     * Otherwise a successful message is retried every scheduler tick and spams the recipient.
     */
    private void markSent(NotificationOutbox row) {
        row.setStatus(NotificationOutbox.OutboxStatus.SENT);
        row.setSentAt(Instant.now());
        row.setLastError(null);
        try {
            notificationPolicyGuard.logSent(row.getRecipient(), row.getEmailType(), row.getTargetKey());
        } catch (Exception auditError) {
            log.warn("Outbox email was delivered but its audit log could not be recorded. outboxId={}: {}",
                    row.getId(), auditError.getMessage());
        }
    }

    private void markFailed(NotificationOutbox row, Exception error) {
        row.setStatus(NotificationOutbox.OutboxStatus.FAILED);
        row.setLastError(error.getMessage());
        // A real transport failure remains retryable, but never in a one-second tight loop.
        row.setScheduledAt(Instant.now().plusSeconds(RETRY_DELAY_SECONDS));
        try {
            notificationPolicyGuard.logFailed(row.getRecipient(), row.getEmailType(), row.getTargetKey(), error.getMessage());
        } catch (Exception auditError) {
            log.warn("Outbox delivery failure could not be audited. outboxId={}: {}",
                    row.getId(), auditError.getMessage());
        }
    }

    private boolean isAllowed(String email) {
        if (email == null || email.endsWith(".local")) return false;
        if (allowlist == null || allowlist.isBlank()) return true;
        return Arrays.stream(allowlist.split(",")).map(String::trim).anyMatch(entry -> entry.equalsIgnoreCase(email));
    }
}
