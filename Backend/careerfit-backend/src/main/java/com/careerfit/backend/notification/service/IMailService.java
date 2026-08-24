package com.careerfit.backend.notification.service;

/**
 * Mail service interface — allows conditional swapping between real SMTP (MailService)
 * and development no-op logger (NoOpMailService).
 */
public interface IMailService {
    void sendHtml(String to, String subject, String htmlBody);
    void sendPlainText(String to, String subject, String text);

    /**
     * Synchronous, exception-propagating delivery used only by the durable outbox.
     * The dispatcher owns retries, so it must observe transport failures.
     */
    void deliverOutboxPlainText(String to, String subject, String text);
    void deliverOutboxHtml(String to, String subject, String htmlBody);
}
