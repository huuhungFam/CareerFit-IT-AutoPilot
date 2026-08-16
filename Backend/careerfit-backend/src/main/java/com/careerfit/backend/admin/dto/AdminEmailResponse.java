package com.careerfit.backend.admin.dto;

import java.time.Instant;
import java.util.UUID;

public class AdminEmailResponse {
    public record EmailSampleFailure(String email, String reason) {}
    public record EmailSampleBatchResult(String id, int status, int total, int sent, java.util.List<String> emails, java.util.List<EmailSampleFailure> failures, java.time.Instant time, long duration) {}

    public record EmailActionSummary(
        UUID id,
        String tokenPrefix, // DO NOT expose raw token
        String recipientEmail,
        String actionType,
        String status,
        Instant expiresAt,
        Instant redeemedAt,
        Instant createdAt
    ) {}

    }
