package com.careerfit.backend.notification.dto;

public record EmailSample(
        String key,
        String subject,
        String body,
        boolean html
) {
    public static EmailSample html(String key, String subject, String body) {
        return new EmailSample(key, subject, body, true);
    }

    public static EmailSample plainText(String key, String subject, String body) {
        return new EmailSample(key, subject, body, false);
    }
}
