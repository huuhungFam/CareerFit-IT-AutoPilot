package com.careerfit.backend.admin.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminJobSummary(
        UUID id,
        String title,
        String company,
        String status,
        String recruiterEmail,
        Instant createdAt
) {}
