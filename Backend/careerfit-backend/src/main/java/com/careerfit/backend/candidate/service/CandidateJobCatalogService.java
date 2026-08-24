package com.careerfit.backend.candidate.service;

import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.entity.CandidateSavedJob;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.candidate.repository.CandidateSavedJobRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.employer.entity.EmployerProfile;
import com.careerfit.backend.employer.repository.EmployerProfileRepository;
import com.careerfit.backend.feedback.entity.Feedback;
import com.careerfit.backend.feedback.repository.FeedbackRepository;
import com.careerfit.backend.job.dto.JobDtos;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Catalog-oriented candidate query. It keeps public search pagination intact
 * while batching each candidate-specific lookup for the current page.
 */
@Service
public class CandidateJobCatalogService {

    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};

    private final JobRepository jobRepository;
    private final CandidateRepository candidateRepository;
    private final CVRepository cvRepository;
    private final MatchingRepository matchingRepository;
    private final CandidateSavedJobRepository savedJobRepository;
    private final ApplicationRepository applicationRepository;
    private final FeedbackRepository feedbackRepository;
    private final EmployerProfileRepository employerRepository;
    private final ObjectMapper objectMapper;

    public CandidateJobCatalogService(JobRepository jobRepository,
                                      CandidateRepository candidateRepository,
                                      CVRepository cvRepository,
                                      MatchingRepository matchingRepository,
                                      CandidateSavedJobRepository savedJobRepository,
                                      ApplicationRepository applicationRepository,
                                      FeedbackRepository feedbackRepository,
                                      EmployerProfileRepository employerRepository,
                                      ObjectMapper objectMapper) {
        this.jobRepository = jobRepository;
        this.candidateRepository = candidateRepository;
        this.cvRepository = cvRepository;
        this.matchingRepository = matchingRepository;
        this.savedJobRepository = savedJobRepository;
        this.applicationRepository = applicationRepository;
        this.feedbackRepository = feedbackRepository;
        this.employerRepository = employerRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public JobDtos.CandidateJobCatalogPageResponse getCatalog(UUID userId,
                                                                JobDtos.JobSearchRequest request,
                                                                UUID jobId,
                                                                BigDecimal minScore) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));
        UUID defaultCvId = cvRepository.findByCandidateIdAndIsDefaultTrue(candidate.getId()).map(CV::getId).orElse(null);
        BigDecimal effectiveMinScore = minScore != null && minScore.compareTo(BigDecimal.ZERO) > 0 ? minScore : null;
        if (effectiveMinScore != null && defaultCvId == null) {
            int pageNum = Math.max(0, request.page());
            int pageSize = Math.min(50, Math.max(1, request.size() == 0 ? 20 : request.size()));
            return new JobDtos.CandidateJobCatalogPageResponse(List.of(), 0, pageNum, pageSize, 0);
        }
        Page<Job> page = findActiveJobs(request, jobId, defaultCvId, effectiveMinScore);
        return toPage(candidate, page.getContent(), page.getTotalElements(), page.getNumber(), page.getSize(), page.getTotalPages());
    }

    @Transactional(readOnly = true)
    public JobDtos.CandidateJobCatalogPageResponse getSavedJobCards(UUID userId, int page, int size) {
        Candidate candidate = candidateRepository.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));
        int safePage = Math.max(0, page);
        int pageSize = Math.min(50, Math.max(1, size == 0 ? 20 : size));
        Page<CandidateSavedJob> savedPage = savedJobRepository
                .findByCandidateUserIdAndJobStatusOrderByCreatedAtDesc(userId, Job.JobStatus.ACTIVE, PageRequest.of(safePage, pageSize));
        List<Job> jobs = savedPage.getContent().stream().map(CandidateSavedJob::getJob).toList();
        return toPage(candidate, jobs, savedPage.getTotalElements(), savedPage.getNumber(), savedPage.getSize(), savedPage.getTotalPages());
    }

    private Page<Job> findActiveJobs(JobDtos.JobSearchRequest request, UUID jobId, UUID matchingCvId, BigDecimal minScore) {
        int pageNum = Math.max(0, request.page());
        int pageSize = Math.min(50, Math.max(1, request.size() == 0 ? 20 : request.size()));
        String requestedSort = request.sort() == null ? "recent" : request.sort();
        Sort sort = switch (requestedSort) {
            case "oldest" -> Sort.by("createdAt").ascending();
            case "urgent" -> Sort.by(Sort.Order.desc("urgent"), Sort.Order.desc("createdAt"));
            default -> Sort.by("createdAt").descending();
        };
        Pageable pageable = PageRequest.of(pageNum, pageSize, sort);
        if (jobId != null) {
            Job job = jobRepository.findByIdAndStatus(jobId, Job.JobStatus.ACTIVE)
                    .orElseThrow(() -> AppException.notFound("Job", jobId));
            return new PageImpl<>(List.of(job), pageable, 1);
        }

        String keyword = normalize(request.keyword());
        String location = normalize(request.location());
        String level = normalize(request.level());
        String language = normalize(request.language());
        String remoteType = normalize(request.remoteType());
        String domain = normalize(request.domain());
        Job.SalaryMode salaryMode = parseSalaryMode(request.salaryMode());

        if ("popular".equals(requestedSort)) {
            return jobRepository.searchJobsByPopularity(keyword, location, level, language, remoteType, salaryMode,
                    request.salaryMin(), domain, matchingCvId, minScore, PageRequest.of(pageNum, pageSize));
        }
        if ("match_desc".equals(requestedSort)) {
            return jobRepository.searchJobsByMatchingScore(keyword, location, level, language, remoteType, salaryMode,
                    request.salaryMin(), domain, matchingCvId, minScore, PageRequest.of(pageNum, pageSize));
        }
        return jobRepository.searchJobs(keyword, location, level, language, remoteType, salaryMode,
                request.salaryMin(), domain, matchingCvId, minScore, pageable);
    }

    private JobDtos.CandidateJobCatalogPageResponse toPage(Candidate candidate,
                                                            List<Job> jobs,
                                                            long total,
                                                            int page,
                                                            int size,
                                                            int totalPages) {
        if (jobs.isEmpty()) {
            return new JobDtos.CandidateJobCatalogPageResponse(List.of(), total, page, size, totalPages);
        }

        List<UUID> jobIds = jobs.stream().map(Job::getId).toList();
        Set<UUID> savedJobIds = savedJobRepository.findSavedJobIds(candidate.getUser().getId(), jobIds).stream().collect(Collectors.toSet());
        Map<UUID, Application> applicationsByJob = applicationRepository
                .findByCandidateIdAndJobIdIn(candidate.getId(), jobIds).stream()
                .filter(application -> !application.isInvitationWithdrawn())
                .collect(Collectors.toMap(application -> application.getJob().getId(), Function.identity(), (left, right) -> left));

        Map<UUID, Matching> matchesByJob = cvRepository.findByCandidateIdAndIsDefaultTrue(candidate.getId())
                .map(CV::getId)
                .map(cvId -> matchingRepository.findByCvIdAndJobIdIn(cvId, jobIds).stream()
                        .collect(Collectors.toMap(matching -> matching.getJob().getId(), Function.identity())))
                .orElse(Map.of());
        Map<UUID, Feedback> feedbackByMatching = matchesByJob.isEmpty()
                ? Map.of()
                : feedbackRepository.findByActorIdAndMatchingIdIn(candidate.getUser().getId(),
                        matchesByJob.values().stream().map(Matching::getId).toList()).stream()
                    .collect(Collectors.toMap(feedback -> feedback.getMatching().getId(), Function.identity(), (left, right) -> left));
        Map<UUID, EmployerProfile> employersByRecruiter = employersByRecruiter(jobs);

        List<JobDtos.CandidateJobCatalogResponse> cards = jobs.stream().map(job -> {
            Matching matching = matchesByJob.get(job.getId());
            Application application = applicationsByJob.get(job.getId());
            Feedback feedback = matching == null ? null : feedbackByMatching.get(matching.getId());
            EmployerProfile employer = employersByRecruiter.get(job.getRecruiter().getId());
            return new JobDtos.CandidateJobCatalogResponse(
                    job.getId().toString(),
                    job.getTitle(),
                    job.getCompany(),
                    employer == null ? null : employer.getLogoUrl(),
                    job.getLocation(),
                    job.getRemoteType(),
                    job.getSeniorityLevel(),
                    job.getEmploymentType(),
                    salary(job),
                    parseList(job.getRequiredSkillsJson()),
                    parseList(job.getNiceToHaveSkillsJson()),
                    job.getOriginalText(),
                    job.getDomain(),
                    job.getLanguage(),
                    job.getCreatedAt(),
                    job.isInternalApplication() ? "INTERNAL" : "EXTERNAL",
                    job.getSourceUrl(),
                    job.isUrgent(),
                    matching == null ? null : matching.getId().toString(),
                    matching == null ? null : matching.getNormalizedScore(),
                    matching == null ? null : matching.getLabel().name(),
                    matching != null && matching.isPotential(),
                    savedJobIds.contains(job.getId()),
                    application == null ? null : application.getStatus().name(),
                    feedback == null ? null : feedback.getFeedbackType().name(),
                    matching == null ? List.of() : parseList(matching.getMatchReasonsJson())
            );
        }).toList();
        return new JobDtos.CandidateJobCatalogPageResponse(cards, total, page, size, totalPages);
    }

    private Map<UUID, EmployerProfile> employersByRecruiter(Collection<Job> jobs) {
        Set<UUID> recruiterIds = jobs.stream().map(job -> job.getRecruiter().getId()).collect(Collectors.toSet());
        return employerRepository.findByRecruiterIdIn(recruiterIds).stream()
                .collect(Collectors.toMap(employer -> employer.getRecruiter().getId(), Function.identity()));
    }

    private JobDtos.SalaryDisplay salary(Job job) {
        return new JobDtos.SalaryDisplay(job.getSalaryMode().name(), job.getSalaryMin(), job.getSalaryMax(),
                job.getSalaryCurrency(), job.getSalaryType(), job.isSalaryIsVisible(), job.getSalaryDisplayText());
    }

    private List<String> parseList(String value) {
        if (value == null || value.isBlank()) return List.of();
        try {
            return objectMapper.readValue(value, LIST_TYPE);
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private Job.SalaryMode parseSalaryMode(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Job.SalaryMode.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw AppException.badRequest("Invalid salary mode: " + value);
        }
    }
}
