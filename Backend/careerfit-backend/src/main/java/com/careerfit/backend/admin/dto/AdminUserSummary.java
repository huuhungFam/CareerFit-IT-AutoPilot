package com.careerfit.backend.admin.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminUserSummary(
        UUID id,
        String email,
        String fullName,
        String role,
        String status,
        boolean emailVerified,
        Instant createdAt
) {}
