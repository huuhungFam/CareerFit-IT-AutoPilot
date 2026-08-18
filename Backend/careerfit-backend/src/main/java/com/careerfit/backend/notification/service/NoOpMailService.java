package com.careerfit.backend.notification.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

/**
 * No-op IMailService: logs emails to console when SMTP is not configured.
 * Registered only when real MailService bean is absent.
 */
@Service
@ConditionalOnMissingBean(MailService.class)
public class NoOpMailService implements IMailService {

    private static final Logger log = LoggerFactory.getLogger(NoOpMailService.class);

    @Override
    public void sendHtml(String to, String subject, String htmlBody) {
        log.info("[NO-OP EMAIL] To: {} | Subject: {} | Body: {} chars",
                to, subject, htmlBody.length());
        log.debug("[NO-OP EMAIL BODY]\n{}", htmlBody);
    }

    @Override
    public void sendPlainText(String to, String subject, String text) {
        log.info("[NO-OP EMAIL] To: {} | Subject: {} | Text:\n{}", to, subject, text);
    }

    @Override
    public void deliverOutboxPlainText(String to, String subject, String text) {
        sendPlainText(to, subject, text);
    }

    @Override
    public void deliverOutboxHtml(String to, String subject, String htmlBody) {
        sendHtml(to, subject, htmlBody);
    }
}
