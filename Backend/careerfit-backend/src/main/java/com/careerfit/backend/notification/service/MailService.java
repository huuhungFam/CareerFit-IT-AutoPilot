package com.careerfit.backend.notification.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/**
 * Thin wrapper around JavaMailSender with HTML support and async dispatch.
 *
 * Active only when app.mail.enabled=true.
 * No-op implementation is used automatically when mail is disabled.
 *
 * Templates: inline HTML strings built in the calling service.
 * For production: swap to Thymeleaf template engine.
 */
@Service
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "true")
public class MailService implements IMailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.username:noreply@careerfit.vn}")
    private String fromAddress;

    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Send an HTML email asynchronously.
     * Failures are logged but not propagated to callers.
     */
    @Async
    public void sendHtml(String to, String subject, String htmlBody) {
        try {
            var msg = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(msg, true, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
            log.info("Email sent to {} — subject: {}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    /**
     * Send a plain-text email (fallback or magic-link).
     */
    @Async
    public void sendPlainText(String to, String subject, String text) {
        try {
            var msg = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(msg, false, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, false);
            mailSender.send(msg);
            log.info("Plain email sent to {}", to);
        } catch (Exception e) {
            log.error("Failed to send plain email to {}: {}", to, e.getMessage());
        }
    }

    @Override
    public void deliverOutboxPlainText(String to, String subject, String text) {
        try {
            var msg = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(msg, false, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, false);
            mailSender.send(msg);
            log.info("Outbox email delivered to {}", to);
        } catch (Exception error) {
            throw new IllegalStateException("Outbox email delivery failed", error);
        }
    }

    @Override
    public void deliverOutboxHtml(String to, String subject, String htmlBody) {
        try {
            var msg = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(msg, true, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
            log.info("Outbox HTML email delivered to {}", to);
        } catch (Exception error) {
            throw new IllegalStateException("Outbox HTML email delivery failed", error);
        }
    }
}
