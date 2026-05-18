package com.careerfit.backend.application.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ApplicationDtos {

    // ── Candidate: submit application ─────────────────────────────────────

    public record SubmitApplicationRequest(
        UUID jobId,
        UUID cvId,              // optional — uses default CV if null
        String coverLetter      // optional
    ) {}

    // ── Candidate: view my application ───────────────────────────────────

    public record MyApplicationResponse(
        UUID applicationId,
        UUID jobId,
        String jobTitle,
        String company,
        String status,
        boolean autoApplied,
        String coverLetter,
        Double matchScore,
        String matchLabel,
        Instant appliedAt,
        Instant updatedAt
    ) {}

    public record MyApplicationPageResponse(
        List<MyApplicationResponse> applications,
        long total,
        int page,
        int size,
        int totalPages
    ) {}

    // ── Recruiter: view applicant ─────────────────────────────────────────

    public record ApplicantResponse(
        UUID applicationId,
        UUID candidateId,
        UUID cvId,
        String fullName,
        String email,
        String desiredTitle,
        String location,
        Integer yearsOfExperience,
        List<String> topSkills,
        String parsedSummary,
        Double matchScore,
        String matchLabel,
        String applicationStatus,
        boolean autoApplied,
        String coverLetter,
        Instant appliedAt
    ) {}

    public record ApplicantPageResponse(
        UUID jobId,
        String jobTitle,
        List<ApplicantResponse> applicants,
        long total,
        int page,
        int size,
        int totalPages
    ) {}

    // ── Recruiter: update application status ─────────────────────────────

    public record UpdateApplicationStatusRequest(
        String status,        // APPROVED | REJECTED | INVITED
        String recruiterNotes // optional
    ) {}

    // ── Job summary for applicant card ───────────────────────────────────

    public record JobBriefResponse(
        UUID id,
        String title,
        String company,
        String location,
        String seniorityLevel,
        String salaryDisplay,
        String status
    ) {}
}
