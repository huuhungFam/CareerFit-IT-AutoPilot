package com.careerfit.backend.job.service;

import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.common.util.TextNormalizationService;
import com.careerfit.backend.common.util.TfIdfService;
import com.careerfit.backend.employer.entity.EmployerProfile;
import com.careerfit.backend.employer.repository.EmployerProfileRepository;
import com.careerfit.backend.job.dto.JobDtos;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.service.MatchingService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class JobService {

    private static final Logger log = LoggerFactory.getLogger(JobService.class);
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};
    private static final TypeReference<Map<String, Double>> VEC_TYPE = new TypeReference<>() {};

    private final JobRepository jobRepo;
    private final UserAccountRepository userRepo;
    private final EmployerProfileRepository employerRepo;
    private final TextNormalizationService normalizer;
    private final TfIdfService tfidf;
    private final MatchingService matchingService;
    private final ObjectMapper objectMapper;

    public JobService(JobRepository jobRepo,
                      UserAccountRepository userRepo,
                      EmployerProfileRepository employerRepo,
                      TextNormalizationService normalizer,
                      TfIdfService tfidf,
                      MatchingService matchingService,
                      ObjectMapper objectMapper) {
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.employerRepo = employerRepo;
        this.normalizer = normalizer;
        this.tfidf = tfidf;
        this.matchingService = matchingService;
        this.objectMapper = objectMapper;
    }

    // ── Create Job ────────────────────────────────────────────────────────

    @Transactional
    public JobDtos.JobDetailResponse createJob(UUID userId, JobDtos.CreateJobRequest req) {
        var recruiter = userRepo.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        if (recruiter.getRole() != UserAccount.Role.RECRUITER) {
            throw AppException.forbidden("Only recruiters can create job postings");
        }

        Job.SalaryMode salaryMode;
        try {
            salaryMode = Job.SalaryMode.valueOf(req.salaryMode().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw AppException.badRequest("Invalid salary mode: " + req.salaryMode());
        }

        var job = new Job(recruiter, req.title(), req.company(), req.originalText(), salaryMode);

        applyRequiredFields(job, req);

        // Detect language from JD text
        if (req.language() != null && !req.language().isBlank()) {
            job.setLanguage(req.language());
        } else {
            job.setLanguage(normalizer.detectLanguage(req.originalText()));
        }

        // Vectorize JD immediately (sync — JDs are usually short)
        vectorizeJob(job);

        jobRepo.save(job);

        // Trigger matching against existing candidate CVs (async)
        matchingService.scoreJobAgainstAllCvs(job);

        log.info("Job created: id={} title='{}' by recruiter={}", job.getId(), job.getTitle(), userId);
        return toDetail(job, employerRepo.findByRecruiterId(userId).orElse(null));
    }

    // ── Update Job ────────────────────────────────────────────────────────

    @Transactional
    public JobDtos.JobDetailResponse updateJob(UUID jobId, UUID userId, JobDtos.UpdateJobRequest req) {
        Job job = findAndAuthorize(jobId, userId);

        if (req.title()        != null) job.setTitle(req.title());
        if (req.location()     != null) job.setLocation(req.location());
        if (req.seniorityLevel()!= null) job.setSeniorityLevel(req.seniorityLevel());
        if (req.employmentType()!= null) job.setEmploymentType(req.employmentType());
        if (req.remoteType()   != null) job.setRemoteType(req.remoteType());
        if (req.domain()       != null) job.setDomain(req.domain());
        if (req.language()     != null) job.setLanguage(req.language());

        if (req.salaryMode() != null) {
            job.setSalaryMode(Job.SalaryMode.valueOf(req.salaryMode().toUpperCase()));
        }
        if (req.salaryMin()        != null) job.setSalaryMin(req.salaryMin());
        if (req.salaryMax()        != null) job.setSalaryMax(req.salaryMax());
        if (req.salaryCurrency()   != null) job.setSalaryCurrency(req.salaryCurrency());
        if (req.salaryType()       != null) job.setSalaryType(req.salaryType());
        if (req.salaryIsVisible()  != null) job.setSalaryIsVisible(req.salaryIsVisible());
        if (req.salaryDisplayText()!= null) job.setSalaryDisplayText(req.salaryDisplayText());

        if (req.requiredSkills() != null) {
            try { job.setRequiredSkillsJson(objectMapper.writeValueAsString(req.requiredSkills())); }
            catch (Exception ignored) {}
        }
        if (req.niceToHaveSkills() != null) {
            try { job.setNiceToHaveSkillsJson(objectMapper.writeValueAsString(req.niceToHaveSkills())); }
            catch (Exception ignored) {}
        }

        // If JD text changed → re-vectorize → mark existing matches for recompute
        if (req.originalText() != null && !req.originalText().isBlank()) {
            job.setOriginalText(req.originalText());
            vectorizeJob(job);
            matchingService.scoreJobAgainstAllCvs(job);
        }

        if (req.status() != null) {
            job.setStatus(Job.JobStatus.valueOf(req.status().toUpperCase()));
        }

        jobRepo.save(job);
        return toDetail(job, employerRepo.findByRecruiterId(userId).orElse(null));
    }

    // ── Status Management ─────────────────────────────────────────────────

    @Transactional
    public JobDtos.JobStatusUpdateResponse updateStatus(UUID jobId, UUID userId, String newStatus) {
        Job job = findAndAuthorize(jobId, userId);
        try {
            job.setStatus(Job.JobStatus.valueOf(newStatus.toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw AppException.badRequest("Invalid status: " + newStatus);
        }
        jobRepo.save(job);
        return new JobDtos.JobStatusUpdateResponse(job.getId().toString(), job.getStatus().name(), job.getUpdatedAt());
    }

    @Transactional
    public void deleteJob(UUID jobId, UUID userId) {
        Job job = findAndAuthorize(jobId, userId);
        jobRepo.delete(job);
        log.info("Job deleted: id={} by recruiter={}", jobId, userId);
    }

    // ── Public Queries ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public JobDtos.JobDetailResponse getById(UUID jobId) {
        Job job = jobRepo.findById(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));
        var employer = employerRepo.findByRecruiterId(job.getRecruiter().getId()).orElse(null);
        return toDetail(job, employer);
    }

    @Transactional(readOnly = true)
    public JobDtos.JobListResponse search(JobDtos.JobSearchRequest req) {
        int pageNum  = Math.max(0, req.page());
        int pageSize = Math.min(50, Math.max(1, req.size() == 0 ? 20 : req.size()));

        Sort sort = switch (req.sort() != null ? req.sort() : "recent") {
            case "salary_asc"  -> Sort.by("salaryMin").ascending();
            case "salary_desc" -> Sort.by("salaryMax").descending();
            default            -> Sort.by("createdAt").descending();
        };

        Pageable pageable = PageRequest.of(pageNum, pageSize, sort);
        Page<Job> page = jobRepo.searchJobs(
                normalizeFilter(req.keyword()),
                normalizeFilter(req.location()),
                normalizeFilter(req.level()),
                normalizeFilter(req.language()),
                pageable);

        List<JobDtos.JobCardResponse> cards = page.getContent().stream()
                .map(j -> toCard(j, employerRepo.findByRecruiterId(j.getRecruiter().getId()).orElse(null)))
                .toList();

        return new JobDtos.JobListResponse(cards, page.getTotalElements(),
                pageNum, pageSize, page.getTotalPages());
    }

    @Transactional(readOnly = true)
    public JobDtos.SuggestionsResponse getSuggestions(String keyword) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase();
        List<String> titles = normalizedKeyword.isBlank()
                ? List.of()
                : jobRepo.findTitleSuggestions(keyword, PageRequest.of(0, 8));
        List<String> companies = normalizedKeyword.isBlank()
                ? List.of()
                : jobRepo.findCompanySuggestions(keyword, PageRequest.of(0, 5));
        List<String> skills = normalizedKeyword.isBlank()
                ? List.of()
                : jobRepo.findByStatus(Job.JobStatus.ACTIVE).stream()
                    .flatMap(j -> parseSkills(j.getRequiredSkillsJson()).stream())
                    .filter(s -> s.toLowerCase().contains(normalizedKeyword))
                    .distinct()
                    .sorted(String.CASE_INSENSITIVE_ORDER)
                    .limit(8)
                    .toList();
        return new JobDtos.SuggestionsResponse(titles, companies, skills);
    }

    // ── Recruiter's Own Jobs ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public JobDtos.JobListResponse getMyJobs(UUID userId, String status, int page, int size) {
        Job.JobStatus jobStatus = null;
        if (status != null && !status.isBlank()) {
            try { jobStatus = Job.JobStatus.valueOf(status.toUpperCase()); }
            catch (IllegalArgumentException e) { throw AppException.badRequest("Invalid status: " + status); }
        }

        List<Job> jobs = jobStatus != null
                ? jobRepo.findByRecruiterIdAndStatus(userId, jobStatus)
                : jobRepo.findByRecruiterIdAndStatus(userId, Job.JobStatus.ACTIVE);

        var employer = employerRepo.findByRecruiterId(userId).orElse(null);
        List<JobDtos.JobCardResponse> cards = jobs.stream()
                .map(j -> toCard(j, employer))
                .toList();

        return new JobDtos.JobListResponse(cards, cards.size(), 0, cards.size(), 1);
    }

    // ── Vectorization ─────────────────────────────────────────────────────

    private void vectorizeJob(Job job) {
        String jdText = job.getOriginalText();
        String lang   = job.getLanguage() != null ? job.getLanguage() : "en";

        List<String> tokens = normalizer.normalize(jdText, lang);
        if (tokens.isEmpty()) {
            log.warn("JD for job id={} produced no tokens during vectorization", job.getId());
            return;
        }

        Map<String, Double> vector = tfidf.buildVector(tokens);
        try {
            job.setTfidfVectorJson(objectMapper.writeValueAsString(vector));
        } catch (Exception e) {
            log.error("Failed to serialize JD vector for job id={}: {}", job.getId(), e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private Job findAndAuthorize(UUID jobId, UUID userId) {
        Job job = jobRepo.findById(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));
        if (!job.getRecruiter().getId().equals(userId)) {
            throw AppException.forbidden("You do not own this job");
        }
        return job;
    }

    private void applyRequiredFields(Job job, JobDtos.CreateJobRequest req) {
        if (req.requiredSkills() != null) {
            try { job.setRequiredSkillsJson(objectMapper.writeValueAsString(req.requiredSkills())); }
            catch (Exception ignored) {}
        }
        if (req.niceToHaveSkills() != null) {
            try { job.setNiceToHaveSkillsJson(objectMapper.writeValueAsString(req.niceToHaveSkills())); }
            catch (Exception ignored) {}
        }
        job.setSeniorityLevel(req.seniorityLevel());
        job.setEmploymentType(req.employmentType());
        job.setLocation(req.location());
        job.setRemoteType(req.remoteType());
        job.setSalaryMin(req.salaryMin());
        job.setSalaryMax(req.salaryMax());
        job.setSalaryCurrency(req.salaryCurrency());
        job.setSalaryType(req.salaryType());
        job.setSalaryIsVisible(req.salaryIsVisible());
        job.setSalaryDisplayText(req.salaryDisplayText());
        job.setDomain(req.domain());
    }

    // ── Mappers ───────────────────────────────────────────────────────────

    JobDtos.JobCardResponse toCard(Job job, EmployerProfile employer) {
        return new JobDtos.JobCardResponse(
                job.getId().toString(),
                job.getTitle(),
                job.getCompany(),
                employer != null ? employer.getLogoUrl() : null,
                job.getLocation(),
                job.getRemoteType(),
                job.getSeniorityLevel(),
                job.getEmploymentType(),
                buildSalaryDisplay(job),
                parseSkills(job.getRequiredSkillsJson()),
                job.getDomain(),
                job.getLanguage(),
                job.getStatus().name(),
                job.getCreatedAt()
        );
    }

    public JobDtos.JobDetailResponse toDetail(Job job, EmployerProfile employer) {
        return new JobDtos.JobDetailResponse(
                job.getId().toString(),
                job.getTitle(),
                job.getCompany(),
                employer != null ? employer.getLogoUrl() : null,
                employer != null ? employer.getId().toString() : null,
                job.getLocation(),
                job.getRemoteType(),
                job.getSeniorityLevel(),
                job.getEmploymentType(),
                buildSalaryDisplay(job),
                parseSkills(job.getRequiredSkillsJson()),
                parseSkills(job.getNiceToHaveSkillsJson()),
                job.getOriginalText(),
                job.getDomain(),
                job.getLanguage(),
                job.getStatus().name(),
                job.getCreatedAt(),
                job.getUpdatedAt()
        );
    }

    private JobDtos.SalaryDisplay buildSalaryDisplay(Job job) {
        return new JobDtos.SalaryDisplay(
                job.getSalaryMode().name(),
                job.getSalaryMin(),
                job.getSalaryMax(),
                job.getSalaryCurrency(),
                job.getSalaryType(),
                job.isSalaryIsVisible(),
                job.getSalaryDisplayText()
        );
    }

    private List<String> parseSkills(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, LIST_TYPE); }
        catch (Exception e) { return List.of(); }
    }

    private String normalizeFilter(String value) {
        return value == null ? "" : value.trim();
    }
}
