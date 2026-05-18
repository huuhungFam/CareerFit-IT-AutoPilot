package com.careerfit.backend.recruiter.controller;

import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Recruiter self-service dashboard: job performance, top-ranked candidates, applicant funnel.
 * All endpoints require ROLE_RECRUITER (enforced by SecurityConfig /api/recruiter/**).
 */
@RestController
@RequestMapping("/api/recruiter")
@Tag(name = "Recruiter Dashboard", description = "Job stats, applicant funnel, top candidate rankings")
public class RecruiterDashboardController {

    private final JobRepository jobRepo;
    private final MatchingRepository matchingRepo;
    private final ApplicationRepository applicationRepo;

    public RecruiterDashboardController(JobRepository jobRepo,
                                        MatchingRepository matchingRepo,
                                        ApplicationRepository applicationRepo) {
        this.jobRepo = jobRepo;
        this.matchingRepo = matchingRepo;
        this.applicationRepo = applicationRepo;
    }

    // ── Overview dashboard ────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @Operation(summary = "Get recruiter dashboard summary: active jobs, total applicants, top jobs")
    public ResponseEntity<ApiResponse<DashboardSummary>> getDashboard(
            @RequestAttribute("userId") UUID userId) {

        List<Job> myJobs = jobRepo.findByRecruiterId(userId);

        long activeJobs = myJobs.stream()
                .filter(j -> j.getStatus() == Job.JobStatus.ACTIVE).count();

        long totalApplicants = myJobs.stream()
                .mapToLong(j -> applicationRepo.countByJobId(j.getId()))
                .sum();

        long pendingReview = myJobs.stream()
                .mapToLong(j -> applicationRepo.countByJobIdAndStatus(
                        j.getId(), com.careerfit.backend.application.entity.Application.ApplicationStatus.PENDING))
                .sum();

        // Top 5 jobs by applicant count
        List<JobStatItem> topJobs = myJobs.stream()
                .map(j -> new JobStatItem(
                        j.getId(), j.getTitle(), j.getStatus().name(),
                        applicationRepo.countByJobId(j.getId()),
                        (long) matchingRepo.findTopByJobIdOrderByNormalizedScoreDesc(
                                j.getId(), PageRequest.of(0, 1)).size()))
                .sorted(Comparator.comparingLong(JobStatItem::applicantCount).reversed())
                .limit(5)
                .toList();

        // Recent activity: jobs posted in last 30 days
        Instant since = Instant.now().minus(30, ChronoUnit.DAYS);
        long recentJobs = myJobs.stream()
                .filter(j -> j.getCreatedAt().isAfter(since)).count();

        return ResponseEntity.ok(ApiResponse.ok(new DashboardSummary(
                myJobs.size(), activeJobs, totalApplicants,
                pendingReview, recentJobs, topJobs)));
    }

    // ── Job performance ───────────────────────────────────────────────────

    @GetMapping("/jobs/{jobId}/stats")
    @Operation(summary = "Get detailed stats for a specific job: applicant funnel, match score distribution")
    public ResponseEntity<ApiResponse<JobDetailStats>> getJobStats(
            @PathVariable UUID jobId,
            @RequestAttribute("userId") UUID userId) {

        Job job = jobRepo.findById(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));

        if (!job.getRecruiter().getId().equals(userId)) {
            throw AppException.forbidden("You do not own this job");
        }

        // Applicant funnel
        var Status = com.careerfit.backend.application.entity.Application.ApplicationStatus.class;
        Map<String, Long> funnel = new LinkedHashMap<>();
        funnel.put("PENDING",      applicationRepo.countByJobIdAndStatus(jobId, com.careerfit.backend.application.entity.Application.ApplicationStatus.PENDING));
        funnel.put("AUTO_APPLIED", applicationRepo.countByJobIdAndStatus(jobId, com.careerfit.backend.application.entity.Application.ApplicationStatus.AUTO_APPLIED));
        funnel.put("APPROVED",     applicationRepo.countByJobIdAndStatus(jobId, com.careerfit.backend.application.entity.Application.ApplicationStatus.APPROVED));
        funnel.put("REJECTED",     applicationRepo.countByJobIdAndStatus(jobId, com.careerfit.backend.application.entity.Application.ApplicationStatus.REJECTED));
        funnel.put("INVITED",      applicationRepo.countByJobIdAndStatus(jobId, com.careerfit.backend.application.entity.Application.ApplicationStatus.INVITED));

        // Match score distribution
        List<Matching> allMatchings = matchingRepo.findByJobId(jobId);
        Map<String, Long> scoreDistrib = allMatchings.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getLabel().name(),
                        Collectors.counting()));

        double avgScore = allMatchings.stream()
                .mapToDouble(m -> m.getNormalizedScore().doubleValue())
                .average().orElse(0.0);

        return ResponseEntity.ok(ApiResponse.ok(new JobDetailStats(
                job.getId(), job.getTitle(), job.getStatus().name(),
                applicationRepo.countByJobId(jobId),
                allMatchings.size(), avgScore, funnel, scoreDistrib,
                job.getCreatedAt())));
    }

    // ── Top candidates for a job ──────────────────────────────────────────

    @GetMapping("/jobs/{jobId}/top-candidates")
    @Operation(summary = "Get top-ranked candidates for a job by match score (max 50)")
    public ResponseEntity<ApiResponse<List<TopCandidateItem>>> getTopCandidates(
            @PathVariable UUID jobId,
            @RequestParam(defaultValue = "20") int limit,
            @RequestAttribute("userId") UUID userId) {

        Job job = jobRepo.findById(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));

        if (!job.getRecruiter().getId().equals(userId)) {
            throw AppException.forbidden("You do not own this job");
        }

        List<Matching> topMatchings = matchingRepo.findTopByJobIdOrderByNormalizedScoreDesc(
                jobId, PageRequest.of(0, Math.min(limit, 50)));

        List<TopCandidateItem> candidates = topMatchings.stream()
                .map(m -> {
                    var cv = m.getCv();
                    var candidate = cv.getCandidate();
                    var user = candidate.getUser();
                    boolean applied = applicationRepo.existsByCandidateIdAndJobId(
                            candidate.getId(), jobId);
                    return new TopCandidateItem(
                            candidate.getId(),
                            user.getFullName(),
                            user.getEmail(),
                            candidate.getDesiredTitle(),
                            candidate.getLocation(),
                            candidate.getYearsOfExperience(),
                            cv.getId(),
                            cv.getParsedSummary(),
                            m.getNormalizedScore().doubleValue(),
                            m.getLabel().name(),
                            m.isPotential(),
                            applied
                    );
                })
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(candidates));
    }

    // ── My jobs list ──────────────────────────────────────────────────────

    @GetMapping("/jobs")
    @Operation(summary = "List all my posted jobs with applicant counts")
    public ResponseEntity<ApiResponse<List<MyJobItem>>> getMyJobs(
            @RequestParam(required = false) String status,
            @RequestAttribute("userId") UUID userId) {

        List<Job> jobs = jobRepo.findByRecruiterId(userId);

        if (status != null && !status.isBlank()) {
            try {
                Job.JobStatus s = Job.JobStatus.valueOf(status.toUpperCase());
                jobs = jobs.stream().filter(j -> j.getStatus() == s).toList();
            } catch (Exception ignored) {}
        }

        List<MyJobItem> result = jobs.stream()
                .sorted(Comparator.comparing(Job::getCreatedAt).reversed())
                .map(j -> new MyJobItem(
                        j.getId(), j.getTitle(), j.getCompany(),
                        j.getLocation(), j.getSeniorityLevel(),
                        j.getStatus().name(),
                        applicationRepo.countByJobId(j.getId()),
                        matchingRepo.countByJobId(j.getId()),
                        j.getCreatedAt()))
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // ── Response records ──────────────────────────────────────────────────

    public record DashboardSummary(
        long totalJobs, long activeJobs, long totalApplicants,
        long pendingReview, long recentJobs,
        List<JobStatItem> topJobsByApplicants
    ) {}

    public record JobStatItem(
        UUID jobId, String title, String status,
        long applicantCount, long matchCount
    ) {}

    public record JobDetailStats(
        UUID jobId, String title, String status,
        long totalApplicants, long totalMatchings,
        double avgMatchScore,
        Map<String, Long> applicantFunnel,
        Map<String, Long> matchScoreDistribution,
        Instant createdAt
    ) {}

    public record TopCandidateItem(
        UUID candidateId, String fullName, String email,
        String desiredTitle, String location, Integer yearsOfExperience,
        UUID cvId, String parsedSummary,
        double matchScore, String matchLabel, boolean isPotential,
        boolean hasApplied
    ) {}

    public record MyJobItem(
        UUID id, String title, String company,
        String location, String seniorityLevel, String status,
        long applicantCount, long matchCount,
        Instant createdAt
    ) {}
}
