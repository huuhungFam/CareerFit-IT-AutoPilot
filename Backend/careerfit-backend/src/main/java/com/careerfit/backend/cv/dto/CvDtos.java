package com.careerfit.backend.cv.dto;

import com.careerfit.backend.common.dto.ValidationDtos;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.List;

/**
 * All CV-related DTOs grouped in one file.
 */
public class CvDtos {

    // ── Requests ──────────────────────────────────────────────────────────

    /** Form-based CV creation (Manual Creation tab). */
    public record ManualCvRequest(
        @NotBlank @Size(max = 255) String displayName,

        @NotBlank @Size(max = 255) String fullName,
        @Email String email,
        String phone,
        String location,

        @NotBlank String desiredTitle,
        String seniorityLevel,

        @NotNull @Min(0) @Max(50) Integer yearsOfExperience,

        @NotEmpty List<String> skills,
        List<String> niceToHaveSkills,

        String education,
        String workExperience,   // free-text summary
        String projects,
        String certifications,
        String languages,        // spoken languages, e.g. "Vietnamese (native), English (B2)"

        String summary,

        String language           // 'vi' or 'en'
    ) {}

    /** Request to change which CV is the default for matching. */
    public record SetDefaultRequest(
        @NotNull java.util.UUID cvId
    ) {}

    // ── Responses ─────────────────────────────────────────────────────────

    public record CvSummaryResponse(
        String id,
        String displayName,
        String source,          // UPLOAD | MANUAL
        boolean isDefault,
        String status,
        String language,
        List<String> topSkills,
        String parsedSummary,
        Instant lastScoredAt,
        Instant createdAt
    ) {}

    public record CvDetailResponse(
        String id,
        String displayName,
        String source,
        boolean isDefault,
        String status,
        String language,
        List<String> topSkills,
        String parsedSummary,
        String rawText,
        String failureReason,
        Instant lastScoredAt,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record CvStatusResponse(
        String id,
        String status,
        String failureReason,
        Instant lastScoredAt
    ) {}

    public record CvListResponse(
        List<CvSummaryResponse> cvs,
        int total,
        String defaultCvId
    ) {}

    public record CvUploadResponse(
        String id,
        String displayName,
        String status,
        String message,
        List<ValidationDtos.QualitySignal> qualitySignals
    ) {}
}
