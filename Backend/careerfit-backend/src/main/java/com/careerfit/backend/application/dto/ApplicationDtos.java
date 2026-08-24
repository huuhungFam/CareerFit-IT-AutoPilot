package com.careerfit.backend.application.dto;

import com.careerfit.backend.candidate.dto.CandidateDtos;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ApplicationDtos {
    public record TalentCandidateCardResponse(
        UUID bookmarkId,
        UUID applicationId,
        UUID matchingId,
        UUID candidateId,
        UUID cvId,
        String fullName,
        String desiredTitle,
        String location,
        Integer yearsOfExperience,
        List<String> topSkills,
        String parsedSummary,
        BigDecimal matchScore,
        String matchLabel,
        boolean isPotential,
        List<String> matchReasons,
        String potentialReason,
        String applicationStatus,
        String invitationState,
        boolean isBookmarked,
        boolean isInvited,
        Instant updatedAt
    ) {}

    public record TalentPoolPageResponse(
        UUID jobId,
        String jobTitle,
        List<TalentCandidateCardResponse> candidates,
        long total,
        int page,
        int size,
        int totalPages
    ) {}

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
        int totalPages,
        ListMeta meta
    ) {}

    public record InvitationResponseRequest(String decision) {}

    // ── Recruiter: view applicant ─────────────────────────────────────────

    public record ApplicantResponse(
        UUID applicationId,
        UUID candidateId,
        UUID cvId,
        String fullName,
        String email,
        String desiredTitle,
        String desiredSeniority,
        String location,
        Integer yearsOfExperience,
        String aboutMe,
        List<String> topSkills,
        String parsedSummary,
        Double matchScore,
        String matchLabel,
        boolean isPotential,
        List<String> matchReasons,
        String potentialReason,
        String applicationStatus,
        boolean autoApplied,
        String coverLetter,
        Instant appliedAt,
        boolean portfolioVisible,
        CandidateDtos.PortfolioResponse portfolio,
        String portfolioHiddenReason
    ) {}

    public record ApplicantPageResponse(
        UUID jobId,
        String jobTitle,
        List<ApplicantResponse> applicants,
        long total,
        int page,
        int size,
        int totalPages,
        ListMeta meta
    ) {}

    public record ListMeta(
        Instant generatedAt,
        Instant lastUpdatedAt,
        String resultState,
        String message,
        List<String> suggestions
    ) {}

    // ── Recruiter: update application status ─────────────────────────────

    public record UpdateApplicationStatusRequest(
        String status,        // APPROVED | REJECTED | INVITED | INTERVIEW_RESCHEDULED | INTERVIEW_CANCELLED
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
