package com.careerfit.backend.notification.service;

import com.careerfit.backend.notification.dto.EmailSample;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

@Service
public class EmailSampleCatalog {

    private final NotificationEmailService notificationEmailService;
    private final EmailActionService emailActionService;

    public EmailSampleCatalog(NotificationEmailService notificationEmailService,
                              EmailActionService emailActionService) {
        this.notificationEmailService = notificationEmailService;
        this.emailActionService = emailActionService;
    }

    public List<EmailSample> all() {
        List<EmailSample> samples = new ArrayList<>();
        samples.addAll(notificationEmailService.buildSampleCatalog());
        samples.addAll(emailActionService.buildSampleCatalog());

        HashSet<String> keys = new HashSet<>();
        for (EmailSample sample : samples) {
            if (!keys.add(sample.key())) {
                throw new IllegalStateException("Duplicate email sample key: " + sample.key());
            }
        }
        return List.copyOf(samples);
    }
}
