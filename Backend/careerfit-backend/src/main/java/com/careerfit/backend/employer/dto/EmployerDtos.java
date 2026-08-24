package com.careerfit.backend.employer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public class EmployerDtos {

    // ── Requests ──────────────────────────────────────────────────────────

    public record CreateOrUpdateEmployerRequest(
        @NotBlank @Size(max = 255) String companyName,
        @Size(max = 255) String slug,          // optional; auto-generated if blank
        @Size(max = 500) String logoUrl,
        @Size(max = 500) String coverUrl,
        @Size(max = 500) String summary,
        String description,
        @Size(max = 100) String industry,
        @Size(max = 50) String companySize,
        @Size(max = 255) String location,
        @Size(max = 500) String websiteUrl,
        List<String> benefits
    ) {}

    // ── Responses ─────────────────────────────────────────────────────────

    public record EmployerSummaryResponse(
        String id,
        String companyName,
        String slug,
        String logoUrl,
        String coverUrl,
        String summary,
        String industry,
        String companySize,
        String location,
        boolean isFeatured,
        int jobCount
    ) {}

    public record EmployerDetailResponse(
        String id,
        String companyName,
        String slug,
        String logoUrl,
        String coverUrl,
        String summary,
        String description,
        String industry,
        String companySize,
        String location,
        String websiteUrl,
        List<String> benefits,
        boolean isFeatured,
        int jobCount,
        Instant createdAt,
        Instant updatedAt
    ) {}
}
