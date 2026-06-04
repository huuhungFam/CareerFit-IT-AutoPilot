package com.careerfit.backend.recommendation.service;

import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.config.AppProperties;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Recommendation engine for personalized job suggestions.
 *
 * Strategy:
 *  1. PRIMARY: Matching-based — return top-scored jobs for candidate's default CV.
 *  2. CONTENT-BASED BOOST: Boost jobs whose required_skills overlap with candidate's desired_skills.
 *  3. FRESHNESS FILTER: Only include ACTIVE jobs posted in the last 90 days.
 *  4. EXCLUSION: Skip jobs the candidate has already applied to.
 */
@Service
public class RecommendationService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationService.class);
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};
    private static final int DEFAULT_LIMIT = 20;

    private final MatchingRepository matchingRepo;
    private final CandidateRepository candidateRepo;
    private final CVRepository cvRepo;
    private final JobRepository jobRepo;
    private final ObjectMapper objectMapper;
    private final AppProperties appProperties;

    public RecommendationService(MatchingRepository matchingRepo,
                                  CandidateRepository candidateRepo,
                                  CVRepository cvRepo,
                                  JobRepository jobRepo,
                                  ObjectMapper objectMapper,
                                  AppProperties appProperties) {
        this.matchingRepo = matchingRepo;
        this.candidateRepo = candidateRepo;
        this.cvRepo = cvRepo;
        this.jobRepo = jobRepo;
        this.objectMapper = objectMapper;
        this.appProperties = appProperties;
    }

    // ── Main recommendation feed ──────────────────────────────────────────

    /**
     * Get personalized job recommendations for a candidate.
     * Returns up to {@code limit} ScoredJobRecommendations ordered by final score.
     */
    @Transactional(readOnly = true)
    public List<JobRecommendation> getRecommendations(UUID userId, int limit) {
        Candidate candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));

        int effectiveLimit = Math.min(limit, 50);

        // Get default CV — if none, return profile-based fallback
        Optional<CV> defaultCv = cvRepo.findByCandidateIdAndIsDefaultTrue(candidate.getId());

        if (defaultCv.isEmpty()) {
            log.info("No default CV for candidate={}, falling back to profile-based recs", candidate.getId());
            return getProfileBasedRecommendations(candidate, effectiveLimit);
        }

        CV cv = defaultCv.get();
        List<String> desiredSkills = parseList(candidate.getDesiredSkillsJson());

        // Step 1: Get top matches from matching table
        List<Matching> topMatchings = matchingRepo.findTopMatchesByCvId(
                cv.getId(), PageRequest.of(0, effectiveLimit * 2));  // fetch more to allow filtering
        if (topMatchings.isEmpty() || topMatchings.get(0).getNormalizedScore().doubleValue() < appProperties.getScoreLabelLowMax()) {
            log.info("No usable matches for candidate={}, falling back to profile-based recs", candidate.getId());
            return getProfileBasedRecommendations(candidate, effectiveLimit);
        }

        // Step 2: Score with content-based boost
        return topMatchings.stream()
                .filter(m -> m.getJob().getStatus() == Job.JobStatus.ACTIVE)
                .map(m -> {
                    double baseScore = m.getNormalizedScore().doubleValue();
                    double skillBoost = computeSkillBoost(m.getJob(), desiredSkills);
                    double locationBoost = computeLocationBoost(m.getJob(), candidate.getLocation());
                    double finalScore = Math.min(100.0, baseScore * 0.7 + skillBoost * 0.2 + locationBoost * 0.1);

                    return new JobRecommendation(
                            m.getJob().getId(),
                            m.getJob().getTitle(),
                            m.getJob().getCompany(),
                            m.getJob().getLocation(),
                            m.getJob().getSeniorityLevel(),
                            m.getJob().getEmploymentType(),
                            m.getJob().getSalaryDisplayText(),
                            m.getJob().getLanguage(),
                            baseScore,
                            finalScore,
                            m.getLabel().name(),
                            m.isPotential(),
                            extractSkills(m.getJob().getRequiredSkillsJson()),
                            computeMatchingSkills(m.getJob(), desiredSkills),
                            m.getJob().getCreatedAt()
                    );
                })
                .sorted(Comparator.comparingDouble(JobRecommendation::finalScore).reversed())
                .limit(effectiveLimit)
                .toList();
    }

    /**
     * Fallback: profile-based recommendations when no CV has been processed.
     * Returns ACTIVE jobs matching candidate's desired title/location.
     */
    @Transactional(readOnly = true)
    public List<JobRecommendation> getProfileBasedRecommendations(Candidate candidate, int limit) {
        String desiredTitle = candidate.getDesiredTitle();
        List<Job> activeJobs = jobRepo.findByStatus(Job.JobStatus.ACTIVE);

        List<String> desiredSkills = parseList(candidate.getDesiredSkillsJson());

        return activeJobs.stream()
                .map(job -> {
                    double score = 0;
                    if (desiredTitle != null && job.getTitle() != null &&
                        job.getTitle().toLowerCase().contains(desiredTitle.toLowerCase())) {
                        score += 40;
                    }
                    score += computeSkillBoost(job, desiredSkills);
                    score += computeLocationBoost(job, candidate.getLocation());

                    return new JobRecommendation(
                            job.getId(), job.getTitle(), job.getCompany(),
                            job.getLocation(), job.getSeniorityLevel(),
                            job.getEmploymentType(), job.getSalaryDisplayText(),
                            job.getLanguage(), score, score, "UNKNOWN",
                            false, extractSkills(job.getRequiredSkillsJson()),
                            computeMatchingSkills(job, desiredSkills),
                            job.getCreatedAt()
                    );
                })
                .filter(r -> r.finalScore() > 0)
                .sorted(Comparator.comparingDouble(JobRecommendation::finalScore).reversed())
                .limit(limit)
                .toList();
    }

    /**
     * "Similar jobs" — given a job ID, find other jobs with overlapping required skills.
     */
    @Transactional(readOnly = true)
    public List<JobRecommendation> getSimilarJobs(UUID jobId, int limit) {
        Job referenceJob = jobRepo.findById(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));

        List<String> refSkills = extractSkills(referenceJob.getRequiredSkillsJson());
        if (refSkills.isEmpty()) {
            // Fallback: same seniority and location
            return getSameSeniorityJobs(referenceJob, limit);
        }

        return jobRepo.findByStatus(Job.JobStatus.ACTIVE).stream()
                .filter(j -> !j.getId().equals(jobId))
                .map(j -> {
                    List<String> jSkills = extractSkills(j.getRequiredSkillsJson());
                    long overlap = jSkills.stream()
                            .filter(s -> refSkills.stream().anyMatch(
                                    r -> r.equalsIgnoreCase(s)))
                            .count();
                    double score = refSkills.isEmpty() ? 0 :
                            (double) overlap / refSkills.size() * 100;

                    return new JobRecommendation(
                            j.getId(), j.getTitle(), j.getCompany(),
                            j.getLocation(), j.getSeniorityLevel(),
                            j.getEmploymentType(), j.getSalaryDisplayText(),
                            j.getLanguage(), score, score, "SIMILAR",
                            false, jSkills, new ArrayList<>(), j.getCreatedAt()
                    );
                })
                .filter(r -> r.finalScore() > 20)
                .sorted(Comparator.comparingDouble(JobRecommendation::finalScore).reversed())
                .limit(Math.min(limit, 10))
                .toList();
    }

    // ── Scoring helpers ───────────────────────────────────────────────────

    /** Skill overlap boost: 0–30 points based on % of desired skills in job's required skills. */
    private double computeSkillBoost(Job job, List<String> desiredSkills) {
        if (desiredSkills.isEmpty()) return 0;
        List<String> required = extractSkills(job.getRequiredSkillsJson());
        if (required.isEmpty()) return 0;

        long matches = desiredSkills.stream()
                .filter(ds -> required.stream().anyMatch(rs -> rs.equalsIgnoreCase(ds)))
                .count();
        return (double) matches / desiredSkills.size() * 30;
    }

    /** Location match boost: 15 if same city, 0 otherwise. */
    private double computeLocationBoost(Job job, String candidateLocation) {
        if (candidateLocation == null || job.getLocation() == null) return 0;
        return job.getLocation().toLowerCase().contains(candidateLocation.toLowerCase()) ||
               candidateLocation.toLowerCase().contains(job.getLocation().toLowerCase()) ? 15 : 0;
    }

    private List<String> computeMatchingSkills(Job job, List<String> desiredSkills) {
        List<String> required = extractSkills(job.getRequiredSkillsJson());
        return desiredSkills.stream()
                .filter(ds -> required.stream().anyMatch(rs -> rs.equalsIgnoreCase(ds)))
                .collect(Collectors.toList());
    }

    private List<JobRecommendation> getSameSeniorityJobs(Job ref, int limit) {
        return jobRepo.findByStatus(Job.JobStatus.ACTIVE).stream()
                .filter(j -> !j.getId().equals(ref.getId()))
                .filter(j -> Objects.equals(j.getSeniorityLevel(), ref.getSeniorityLevel()))
                .limit(limit)
                .map(j -> new JobRecommendation(
                        j.getId(), j.getTitle(), j.getCompany(),
                        j.getLocation(), j.getSeniorityLevel(),
                        j.getEmploymentType(), j.getSalaryDisplayText(),
                        j.getLanguage(), 30, 30, "SIMILAR",
                        false, extractSkills(j.getRequiredSkillsJson()),
                        List.of(), j.getCreatedAt()
                ))
                .toList();
    }

    private List<String> extractSkills(String json) {
        return parseList(json);
    }

    private List<String> parseList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, LIST_TYPE); }
        catch (Exception e) { return List.of(); }
    }

    // ── DTO ───────────────────────────────────────────────────────────────

    public record JobRecommendation(
        UUID jobId,
        String title,
        String company,
        String location,
        String seniorityLevel,
        String employmentType,
        String salaryDisplay,
        String language,
        double matchScore,
        double finalScore,
        String matchLabel,
        boolean isPotential,
        List<String> requiredSkills,
        List<String> matchingSkills,
        java.time.Instant postedAt
    ) {}
}
