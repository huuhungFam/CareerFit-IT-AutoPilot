package com.careerfit.backend.admin.dto;

import java.time.Instant;
import java.util.UUID;

public class AdminEmailResponse {

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

    public record EmailTokenSummary(
        UUID id,
        String tokenPrefix, // hash or prefix only
        String recipientEmail,
        String purpose,
        boolean valid,
        boolean used,
        boolean expired,
        Instant expiresAt,
        Instant usedAt,
        Instant createdAt
    ) {}
}
