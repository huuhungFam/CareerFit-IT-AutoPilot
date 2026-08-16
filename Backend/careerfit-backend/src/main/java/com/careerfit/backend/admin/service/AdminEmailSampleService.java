package com.careerfit.backend.admin.service;

import com.careerfit.backend.admin.dto.AdminEmailResponse;
import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.notification.dto.EmailSample;
import com.careerfit.backend.notification.service.EmailSampleCatalog;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AdminEmailSampleService {

    private static final Logger log = LoggerFactory.getLogger(AdminEmailSampleService.class);

    private final EmailSampleCatalog catalog;
    private final JavaMailSender mailSender;
    private final AuditLogRepository auditRepo;
    private final boolean mailEnabled;
    private final String smtpUsername;
    private final long cooldownSeconds;
    private final Clock clock;
    private final Map<UUID, Instant> lastRequests = new ConcurrentHashMap<>();

    @Autowired
    public AdminEmailSampleService(EmailSampleCatalog catalog,
                                   JavaMailSender mailSender,
                                   AuditLogRepository auditRepo,
                                   @Value("${app.mail.enabled:false}") boolean mailEnabled,
                                   @Value("${spring.mail.username:}") String smtpUsername,
                                   @Value("${app.mail.sample-cooldown-seconds:300}") long cooldownSeconds) {
        this(catalog, mailSender, auditRepo, mailEnabled, smtpUsername, cooldownSeconds, Clock.systemUTC());
    }

    AdminEmailSampleService(EmailSampleCatalog catalog,
                            JavaMailSender mailSender,
                            AuditLogRepository auditRepo,
                            boolean mailEnabled,
                            String smtpUsername,
                            long cooldownSeconds,
                            Clock clock) {
        this.catalog = catalog;
        this.mailSender = mailSender;
        this.auditRepo = auditRepo;
        this.mailEnabled = mailEnabled;
        this.smtpUsername = smtpUsername == null ? "" : smtpUsername.trim();
        this.cooldownSeconds = Math.max(0, cooldownSeconds);
        this.clock = clock;
    }

    public AdminEmailResponse.EmailSampleBatchResult sendAll(UUID adminId) {
        if (!mailEnabled) {
            throw new AppException(HttpStatus.CONFLICT, "MAIL_DISABLED",
                    "SMTP email is disabled. Set APP_MAIL_ENABLED=true before sending samples.");
        }
        if (smtpUsername.isBlank()) {
            throw new AppException(HttpStatus.CONFLICT, "SMTP_ACCOUNT_NOT_CONFIGURED",
                    "MAIL_USERNAME must be configured before sending samples.");
        }
        reserveCooldown(adminId);

        var samples = catalog.all();
        var sentKeys = new ArrayList<String>();
        var failures = new ArrayList<AdminEmailResponse.EmailSampleFailure>();
        for (int index = 0; index < samples.size(); index++) {
            EmailSample sample = samples.get(index);
            try {
                sendSample(sample, index + 1, samples.size());
                sentKeys.add(sample.key());
            } catch (Exception exception) {
                log.error("Admin email sample failed template={}: {}", sample.key(), exception.getMessage());
                failures.add(new AdminEmailResponse.EmailSampleFailure(
                        sample.key(), "SMTP rejected or could not deliver this sample"));
            }
        }

        Instant completedAt = clock.instant();
        saveAudit(adminId, samples.size(), sentKeys.size(), failures.size());
        return new AdminEmailResponse.EmailSampleBatchResult(
                maskEmail(smtpUsername), samples.size(), sentKeys.size(), failures.size(),
                List.copyOf(sentKeys), List.copyOf(failures), completedAt, cooldownSeconds);
    }

    private void sendSample(EmailSample sample, int sequence, int total) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
        helper.setFrom(smtpUsername);
        helper.setTo(smtpUsername);
        helper.setSubject("[CareerFit SAMPLE %02d/%02d] [%s] %s"
                .formatted(sequence, total, sample.key(), sample.subject()));
        helper.setText(sample.body(), sample.html());
        mailSender.send(message);
    }

    private synchronized void reserveCooldown(UUID adminId) {
        Instant now = clock.instant();
        Instant previous = lastRequests.get(adminId);
        if (previous != null) {
            long retryAfter = previous.plusSeconds(cooldownSeconds).getEpochSecond() - now.getEpochSecond();
            if (retryAfter > 0) {
                throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "EMAIL_SAMPLE_COOLDOWN",
                        "Please wait " + retryAfter + " seconds before sending the sample batch again.");
            }
        }
        lastRequests.put(adminId, now);
    }

    private void saveAudit(UUID adminId, int requested, int sent, int failed) {
        String metadata = "{\"requested\":%d,\"sent\":%d,\"failed\":%d,\"recipient\":\"%s\"}"
                .formatted(requested, sent, failed, maskEmail(smtpUsername));
        try {
            auditRepo.save(new AuditLog(AuditLog.ActorType.USER, adminId, "SEND_ALL_EMAIL_SAMPLES")
                    .withTarget("SMTP_ACCOUNT", null)
                    .withChannel(AuditLog.SourceChannel.WEB)
                    .withResult(failed == 0 ? AuditLog.Result.SUCCESS : AuditLog.Result.FAILURE)
                    .withMetadata(metadata));
        } catch (Exception exception) {
            log.error("Could not persist email sample audit for admin={}: {}", adminId, exception.getMessage());
        }
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return "***" + (at >= 0 ? email.substring(at) : "");
        return email.charAt(0) + "***" + email.substring(at - 1);
    }
}
