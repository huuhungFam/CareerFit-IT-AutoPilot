package com.careerfit.backend.matching.service;

import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.employer.entity.EmployerProfile;
import com.careerfit.backend.employer.repository.EmployerProfileRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.dto.MatchingDtos;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Recruiter ranking view + candidate matched-job feed.
 */
@Service
public class MatchingQueryService {

    private static final Logger log = LoggerFactory.getLogger(MatchingQueryService.class);
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};

    private final MatchingRepository matchingRepo;
    private final JobRepository jobRepo;
    private final CandidateRepository candidateRepo;
    private final CVRepository cvRepo;
    private final EmployerProfileRepository employerRepo;
    private final ObjectMapper objectMapper;

    public MatchingQueryService(MatchingRepository matchingRepo,
                                JobRepository jobRepo,
                                CandidateRepository candidateRepo,
                                CVRepository cvRepo,
                                EmployerProfileRepository employerRepo,
                                ObjectMapper objectMapper) {
        this.matchingRepo = matchingRepo;
        this.jobRepo = jobRepo;
        this.candidateRepo = candidateRepo;
        this.cvRepo = cvRepo;
        this.employerRepo = employerRepo;
        this.objectMapper = objectMapper;
    }

    // ── Recruiter: Top CVs per Job ────────────────────────────────────────

    @Transactional(readOnly = true)
    public MatchingDtos.RankingPageResponse getRankedCandidates(UUID jobId, UUID recruiterId,
                                                                 int page, int size,
                                                                 boolean potentialOnly) {
        Job job = jobRepo.findById(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));

        if (!job.getRecruiter().getId().equals(recruiterId)) {
            throw AppException.forbidden("You do not own this job");
        }

        int pageSize = Math.min(50, Math.max(1, size == 0 ? 20 : size));
        Pageable pageable = PageRequest.of(Math.max(0, page), pageSize);

        Page<Matching> matchingPage = potentialOnly
                ? matchingRepo.findPotentialByJobId(jobId, pageable)
                : matchingRepo.findRankingByJobId(jobId, pageable);

        List<MatchingDtos.RankedCandidateResponse> ranked = matchingPage.getContent().stream()
                .map(m -> toRanked(m, m.getCv()))
                .toList();

        return new MatchingDtos.RankingPageResponse(
                jobId.toString(),
                job.getTitle(),
                ranked,
                matchingPage.getTotalElements(),
                page, pageSize,
                matchingPage.getTotalPages()
        );
    }

    // ── Candidate: Matched Job Feed ───────────────────────────────────────

    @Transactional(readOnly = true)
    public MatchingDtos.MatchedJobPageResponse getMatchedJobs(UUID userId, int page, int size,
                                                               String label, boolean potentialOnly) {
        Candidate candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));

        // Get default CV for matching feed
        CV defaultCv = cvRepo.findByCandidateIdAndIsDefaultTrue(candidate.getId())
                .orElseThrow(() -> AppException.badRequest(
                        "No default CV found. Please upload a CV and set it as default."));

        int pageSize = Math.min(50, Math.max(1, size == 0 ? 20 : size));
        Pageable pageable = PageRequest.of(Math.max(0, page), pageSize);

        List<Matching> matches = matchingRepo.findTopMatchesByCvId(defaultCv.getId(), pageable);

        // Optional label filter
        List<Matching> filtered = label != null && !label.isBlank()
                ? matches.stream()
                    .filter(m -> m.getLabel().name().equalsIgnoreCase(label))
                    .toList()
                : matches;

        if (potentialOnly) {
            filtered = filtered.stream().filter(Matching::isPotential).toList();
        }

        List<MatchingDtos.MatchedJobResponse> responses = filtered.stream()
                .map(this::toMatchedJob)
                .toList();

        return new MatchingDtos.MatchedJobPageResponse(
                responses, responses.size(), page, pageSize, 1
        );
    }

    // ── Mappers ───────────────────────────────────────────────────────────

    private MatchingDtos.RankedCandidateResponse toRanked(Matching m, CV cv) {
        Candidate candidate = cv.getCandidate();
        var user = candidate.getUser();

        return new MatchingDtos.RankedCandidateResponse(
                m.getId().toString(),
                cv.getId().toString(),
                candidate.getId().toString(),
                user.getFullName(),
                user.getEmail(),
                candidate.getDesiredTitle(),
                candidate.getLocation(),
                candidate.getYearsOfExperience(),
                parseList(cv.getTopSkillsJson()),
                cv.getParsedSummary(),
                m.getNormalizedScore(),
                m.getLabel().name(),
                m.isPotential(),
                parseList(m.getMatchReasonsJson()),
                m.getPotentialReasonJson() != null
                        ? m.getPotentialReasonJson().replace("\"", "") : null,
                m.getCreatedAt()
        );
    }

    private MatchingDtos.MatchedJobResponse toMatchedJob(Matching m) {
        Job job = m.getJob();
        EmployerProfile employer = employerRepo
                .findByRecruiterId(job.getRecruiter().getId()).orElse(null);

        // Resolve display salary text
        String salaryDisplay = buildSalaryText(job);

        return new MatchingDtos.MatchedJobResponse(
                m.getId().toString(),
                job.getId().toString(),
                job.getTitle(),
                job.getCompany(),
                employer != null ? employer.getLogoUrl() : null,
                job.getLocation(),
                job.getRemoteType(),
                job.getSeniorityLevel(),
                salaryDisplay,
                parseList(job.getRequiredSkillsJson()),
                m.getNormalizedScore(),
                m.getLabel().name(),
                m.isPotential(),
                parseList(m.getMatchReasonsJson()),
                m.getPotentialReasonJson() != null
                        ? m.getPotentialReasonJson().replace("\"", "") : null,
                m.getCreatedAt()
        );
    }

    private String buildSalaryText(Job job) {
        if (!job.isSalaryIsVisible()) return "Thỏa thuận";
        if (job.getSalaryDisplayText() != null && !job.getSalaryDisplayText().isBlank()) {
            return job.getSalaryDisplayText();
        }
        return switch (job.getSalaryMode()) {
            case NEGOTIABLE -> "Thỏa thuận";
            case HIDDEN     -> "Thỏa thuận";
            case RANGE      -> format(job.getSalaryMin()) + " – " + format(job.getSalaryMax())
                               + " " + defaultCurrency(job);
            case UP_TO      -> "Lên đến " + format(job.getSalaryMax()) + " " + defaultCurrency(job);
            case FROM       -> "Từ " + format(job.getSalaryMin()) + " " + defaultCurrency(job);
        };
    }

    private String format(java.math.BigDecimal v) {
        if (v == null) return "?";
        return v.stripTrailingZeros().toPlainString();
    }

    private String defaultCurrency(Job job) {
        return job.getSalaryCurrency() != null ? job.getSalaryCurrency() : "VND";
    }

    private List<String> parseList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, LIST_TYPE); }
        catch (Exception e) { return List.of(); }
    }
}
