package com.careerfit.backend.job.service;

import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.common.dto.ValidationDtos;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.common.service.QualityValidationService;
import com.careerfit.backend.common.util.AfterCommitExecutor;
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
import java.nio.charset.StandardCharsets;

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
    private final QualityValidationService qualityValidationService;
    private final ApplicationRepository applicationRepo;
    private final AfterCommitExecutor afterCommitExecutor;
    private final JobDuplicateProtectionService duplicateProtection;

    public JobService(JobRepository jobRepo,
                      UserAccountRepository userRepo,
                      EmployerProfileRepository employerRepo,
                      TextNormalizationService normalizer,
                      TfIdfService tfidf,
                      MatchingService matchingService,
                      ObjectMapper objectMapper,
                      QualityValidationService qualityValidationService,
                      ApplicationRepository applicationRepo,
                      AfterCommitExecutor afterCommitExecutor,
                      JobDuplicateProtectionService duplicateProtection) {
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.employerRepo = employerRepo;
        this.normalizer = normalizer;
        this.tfidf = tfidf;
        this.matchingService = matchingService;
        this.objectMapper = objectMapper;
        this.qualityValidationService = qualityValidationService;
        this.applicationRepo = applicationRepo;
        this.afterCommitExecutor = afterCommitExecutor;
        this.duplicateProtection = duplicateProtection;
    }

    // ── Create Job ────────────────────────────────────────────────────────

    @Transactional
    public JobDtos.JobDetailResponse createJob(UUID userId, JobDtos.CreateJobRequest req) {
        return createJob(userId, req, false);
    }

    @Transactional
    public JobDtos.JobDetailResponse createJob(UUID userId, JobDtos.CreateJobRequest req, boolean confirmNearDuplicate) {
        var recruiter = userRepo.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        if (recruiter.getRole() != UserAccount.Role.RECRUITER) {
            throw AppException.forbidden("Only recruiters can create job postings");
        }
        qualityValidationService.validateCreateJob(req);

        Job.SalaryMode salaryMode;
        try {
            salaryMode = Job.SalaryMode.valueOf(req.salaryMode().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw AppException.badRequest("Invalid salary mode: " + req.salaryMode());
        }

        var job = new Job(recruiter, req.title(), req.company(), req.originalText(), salaryMode);
        job.setSourceType(Job.SourceType.INTERNAL);

        applyRequiredFields(job, req);

        // Detect language from JD text
        if (req.language() != null && !req.language().isBlank()) {
            job.setLanguage(req.language());
        } else {
            job.setLanguage(normalizer.detectLanguage(req.originalText()));
        }

        // Vectorize JD immediately (sync — JDs are usually short)
        vectorizeJob(job);

        // New jobs are ACTIVE by default; draft edits are intentionally not blocked.
        duplicateProtection.assertCanActivate(job, confirmNearDuplicate);

        jobRepo.save(job);

        enqueueMatchingAfterCommitIfActive(job);

        log.info("Job created: id={} title='{}' by recruiter={}", job.getId(), job.getTitle(), userId);
        return toDetail(job, employerRepo.findByRecruiterId(userId).orElse(null));
    }

    @Transactional
    public JobDtos.JobDetailResponse saveDraft(UUID userId, JobDtos.SaveJobDraftRequest req) {
        var recruiter = userRepo.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        if (recruiter.getRole() != UserAccount.Role.RECRUITER) {
            throw AppException.forbidden("Only recruiters can save job drafts");
        }

        var job = new Job(recruiter,
                valueOr(req.title(), "Untitled draft"),
                valueOr(req.company(), "Company not specified"),
                valueOr(req.originalText(), ""),
                draftSalaryMode(req.salaryMode()));
        job.setStatus(Job.JobStatus.DRAFT);
        job.setSourceType(Job.SourceType.INTERNAL);
        job.setSeniorityLevel(req.seniorityLevel());
        job.setEmploymentType(req.employmentType());
        job.setLocation(req.location());
        job.setRemoteType(req.remoteType());
        job.setSalaryMin(req.salaryMin());
        job.setSalaryMax(req.salaryMax());
        job.setSalaryCurrency(req.salaryCurrency());
        job.setSalaryType(valueOr(req.salaryType(), "MONTHLY"));
        job.setSalaryIsVisible(req.salaryIsVisible() == null || req.salaryIsVisible());
        job.setDomain(req.domain());
        job.setLanguage(valueOr(req.language(), "vi"));
        job.setUrgent(Boolean.TRUE.equals(req.isUrgent()));
        try {
            job.setRequiredSkillsJson(objectMapper.writeValueAsString(req.requiredSkills() == null ? List.of() : req.requiredSkills()));
            job.setNiceToHaveSkillsJson(objectMapper.writeValueAsString(req.niceToHaveSkills() == null ? List.of() : req.niceToHaveSkills()));
        } catch (Exception ignored) {
            job.setRequiredSkillsJson("[]");
            job.setNiceToHaveSkillsJson("[]");
        }
        jobRepo.save(job);
        return toDetail(job, employerRepo.findByRecruiterId(userId).orElse(null));
    }

    @Transactional(readOnly = true)
    public JobDtos.JobQualityPreviewResponse previewQuality(JobDtos.JobQualityPreviewRequest req) {
        return new JobDtos.JobQualityPreviewResponse(qualityValidationService.previewJob(req));
    }

    // ── Update Job ────────────────────────────────────────────────────────

    @Transactional
    public JobDtos.JobDetailResponse updateJob(UUID jobId, UUID userId, JobDtos.UpdateJobRequest req) {
        return updateJob(jobId, userId, req, false);
    }

    @Transactional
    public JobDtos.JobDetailResponse updateJob(UUID jobId, UUID userId, JobDtos.UpdateJobRequest req,
                                                boolean confirmNearDuplicate) {
        Job job = findAndAuthorize(jobId, userId);
        boolean shouldRevectorize = false;
        boolean matchingRelevantChange = false;
        Job.JobStatus previousStatus = job.getStatus();

        if (req.title()        != null) { job.setTitle(req.title()); matchingRelevantChange = true; }
        if (req.location()     != null) job.setLocation(req.location());
        if (req.seniorityLevel()!= null) job.setSeniorityLevel(req.seniorityLevel());
        if (req.employmentType()!= null) job.setEmploymentType(req.employmentType());
        if (req.remoteType()   != null) job.setRemoteType(req.remoteType());
        if (req.domain()       != null) job.setDomain(req.domain());
        if (req.language()     != null) job.setLanguage(req.language());
        if (req.isUrgent()     != null) job.setUrgent(req.isUrgent());

        if (req.salaryMode() != null) {
            try {
                job.setSalaryMode(Job.SalaryMode.valueOf(req.salaryMode().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw AppException.badRequest("Invalid salary mode: " + req.salaryMode());
            }
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
            matchingRelevantChange = true;
        }
        if (req.niceToHaveSkills() != null) {
            try { job.setNiceToHaveSkillsJson(objectMapper.writeValueAsString(req.niceToHaveSkills())); }
            catch (Exception ignored) {}
        }

        // If JD text changed → re-vectorize → mark existing matches for recompute
        if (req.originalText() != null && !req.originalText().isBlank()) {
            job.setOriginalText(req.originalText());
            shouldRevectorize = true;
            matchingRelevantChange = true;
        }

        if (req.status() != null) {
            try {
                job.setStatus(parseRecruiterStatus(req.status()));
            } catch (IllegalArgumentException e) {
                throw AppException.badRequest("Invalid status: " + req.status());
            }
        }

        qualityValidationService.validateJob(job);

        if (shouldRevectorize) {
            vectorizeJob(job);
        }

        if ((previousStatus != Job.JobStatus.ACTIVE && job.getStatus() == Job.JobStatus.ACTIVE)
                || (job.getStatus() == Job.JobStatus.ACTIVE && (shouldRevectorize || matchingRelevantChange))) {
            duplicateProtection.assertCanActivate(job, confirmNearDuplicate);
        }

        jobRepo.save(job);
        if ((previousStatus != Job.JobStatus.ACTIVE && job.getStatus() == Job.JobStatus.ACTIVE)
                || (job.getStatus() == Job.JobStatus.ACTIVE && (shouldRevectorize || matchingRelevantChange))) {
            enqueueMatchingAfterCommitIfActive(job);
        }
        return toDetail(job, employerRepo.findByRecruiterId(userId).orElse(null));
    }

    // ── Status Management ─────────────────────────────────────────────────

    @Transactional
    public JobDtos.JobStatusUpdateResponse updateStatus(UUID jobId, UUID userId, String newStatus) {
        return updateStatus(jobId, userId, newStatus, false);
    }

    @Transactional
    public JobDtos.JobStatusUpdateResponse updateStatus(UUID jobId, UUID userId, String newStatus,
                                                         boolean confirmNearDuplicate) {
        Job job = findAndAuthorize(jobId, userId);
        Job.JobStatus previousStatus = job.getStatus();
        try {
            job.setStatus(parseRecruiterStatus(newStatus));
        } catch (IllegalArgumentException e) {
            throw AppException.badRequest("Invalid status: " + newStatus);
        }
        if (previousStatus != Job.JobStatus.ACTIVE && job.getStatus() == Job.JobStatus.ACTIVE) {
            duplicateProtection.assertCanActivate(job, confirmNearDuplicate);
        }
        jobRepo.save(job);
        if (previousStatus != Job.JobStatus.ACTIVE && job.getStatus() == Job.JobStatus.ACTIVE) {
            enqueueMatchingAfterCommitIfActive(job);
        }
        return new JobDtos.JobStatusUpdateResponse(job.getId().toString(), job.getStatus().name(), job.getUpdatedAt());
    }

    /** Updates only the urgency flag without re-validating or re-vectorizing legacy JD content. */
    @Transactional
    public JobDtos.JobUrgencyUpdateResponse updateUrgency(UUID jobId, UUID userId, boolean isUrgent) {
        Job job = findAndAuthorize(jobId, userId);
        job.setUrgent(isUrgent);
        jobRepo.save(job);
        return new JobDtos.JobUrgencyUpdateResponse(job.getId().toString(), job.isUrgent(), job.getUpdatedAt());
    }

    @Transactional
    public void deleteJob(UUID jobId, UUID userId) {
        Job job = findAndAuthorize(jobId, userId);
        if (applicationRepo.countByJobId(jobId) > 0) {
            throw AppException.conflict("A job with applications cannot be deleted; close it instead");
        }
        jobRepo.delete(job);
        log.info("Job deleted: id={} by recruiter={}", jobId, userId);
    }

    @Transactional(readOnly = true)
    public byte[] exportMyJobsCsv(UUID userId) {
        UserAccount user = userRepo.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        if (user.getRole() != UserAccount.Role.RECRUITER) {
            throw AppException.forbidden("Only recruiters can export jobs");
        }
        StringBuilder csv = new StringBuilder("id,title,company,status,location,seniority,applicants,createdAt\r\n");
        jobRepo.findByRecruiterId(userId).stream()
                .sorted(java.util.Comparator.comparing(Job::getCreatedAt).reversed())
                .forEach(job -> csv.append(csv(job.getId())).append(',')
                        .append(csv(job.getTitle())).append(',')
                        .append(csv(job.getCompany())).append(',')
                        .append(csv(job.getStatus())).append(',')
                        .append(csv(job.getLocation())).append(',')
                        .append(csv(job.getSeniorityLevel())).append(',')
                        .append(applicationRepo.countByJobId(job.getId())).append(',')
                        .append(csv(job.getCreatedAt())).append("\r\n"));
        return ("\uFEFF" + csv).getBytes(StandardCharsets.UTF_8);
    }

    // ── Public Queries ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public JobDtos.JobDetailResponse getById(UUID jobId) {
        Job job = jobRepo.findByIdAndStatus(jobId, Job.JobStatus.ACTIVE)
                .orElseThrow(() -> AppException.notFound("Job", jobId));
        var employer = employerRepo.findByRecruiterId(job.getRecruiter().getId()).orElse(null);
        return toDetail(job, employer);
    }

    @Transactional(readOnly = true)
    public JobDtos.JobListResponse search(JobDtos.JobSearchRequest req) {
        int pageNum  = Math.max(0, req.page());
        int pageSize = Math.min(50, Math.max(1, req.size() == 0 ? 20 : req.size()));

        String requestedSort = req.sort() != null ? req.sort() : "recent";
        Sort sort = switch (requestedSort) {
            case "salary_asc"  -> Sort.by("salaryMin").ascending();
            case "salary_desc" -> Sort.by("salaryMax").descending();
            case "oldest"      -> Sort.by("createdAt").ascending();
            case "urgent"      -> Sort.by(Sort.Order.desc("urgent"), Sort.Order.desc("createdAt"));
            default            -> Sort.by("createdAt").descending();
        };

        Pageable pageable = PageRequest.of(pageNum, pageSize, sort);
        String keyword = normalizeFilter(req.keyword());
        String location = normalizeFilter(req.location());
        String level = normalizeFilter(req.level());
        String language = normalizeFilter(req.language());
        String remoteType = normalizeFilter(req.remoteType());
        String domain = normalizeFilter(req.domain());
        Job.SalaryMode salaryMode = parseSalaryMode(req.salaryMode());
        java.math.BigDecimal salaryMin = req.salaryMin();
        Page<Job> page = "popular".equals(requestedSort)
                ? jobRepo.searchJobsByPopularity(keyword, location, level, language, remoteType, salaryMode, salaryMin, domain, null, null, pageable)
                : jobRepo.searchJobs(keyword, location, level, language, remoteType, salaryMode, salaryMin, domain, null, null, pageable);

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
                : jobRepo.findTitleSuggestions(normalizedKeyword, PageRequest.of(0, 8));
        List<String> companies = normalizedKeyword.isBlank()
                ? List.of()
                : jobRepo.findCompanySuggestions(normalizedKeyword, PageRequest.of(0, 5));
        List<String> skills = normalizedKeyword.isBlank()
                ? List.of()
                : jobRepo.findByStatus(Job.JobStatus.ACTIVE).stream()
                    .flatMap(j -> parseSkills(j.getRequiredSkillsJson()).stream())
                    .filter(s -> s.toLowerCase().contains(normalizedKeyword))
                    .distinct()
                    .sorted(String.CASE_INSENSITIVE_ORDER)
                    .limit(8)
                    .toList();
        List<String> locations = normalizedKeyword.isBlank()
                ? List.of()
                : jobRepo.findLocationSuggestions(normalizedKeyword, PageRequest.of(0, 8));
        List<String> domains = normalizedKeyword.isBlank()
                ? List.of()
                : jobRepo.findDomainSuggestions(normalizedKeyword, PageRequest.of(0, 8));
        return new JobDtos.SuggestionsResponse(titles, companies, skills, locations, domains);
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

    @Transactional(readOnly = true)
    public JobDtos.DuplicateCheckResponse checkDuplicates(UUID userId, JobDtos.DuplicateCheckRequest req) {
        UserAccount recruiter = userRepo.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        if (recruiter.getRole() != UserAccount.Role.RECRUITER) {
            throw AppException.forbidden("Only recruiters can check job duplicates");
        }
        Job candidate = new Job(recruiter, req.title(), req.company(), req.originalText(), Job.SalaryMode.NEGOTIABLE);
        candidate.setEmploymentType(req.employmentType());
        candidate.setLocation(req.location());
        candidate.setSourceType(Job.SourceType.INTERNAL);
        var result = duplicateProtection.check(candidate);
        return new JobDtos.DuplicateCheckResponse(result.fingerprint(), result.exactDuplicate(),
                JobDuplicateProtectionService.NEAR_DUPLICATE_THRESHOLD,
                result.nearDuplicates().stream()
                        .map(item -> new JobDtos.NearDuplicateResponse(item.jobId(), item.title(), item.similarity()))
                        .toList());
    }

    /** The primary matching path; work is emitted only after the job transaction commits. */
    private void enqueueMatchingAfterCommitIfActive(Job job) {
        if (job.getStatus() != Job.JobStatus.ACTIVE) return;
        job.setMatchingRecoveryNeeded(true);
        jobRepo.save(job);
        UUID jobId = job.getId();
        afterCommitExecutor.execute(() -> matchingService.scoreJobAgainstAllCvs(jobId));
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

    private Job.JobStatus parseRecruiterStatus(String status) {
        try {
            Job.JobStatus parsed = Job.JobStatus.valueOf(status.trim().toUpperCase());
            if (parsed == Job.JobStatus.HIDDEN_BY_ADMIN) throw new IllegalArgumentException();
            return parsed;
        } catch (Exception e) {
            throw AppException.badRequest("Invalid recruiter job status: " + status);
        }
    }

    private String csv(Object value) {
        if (value == null) return "";
        String text = String.valueOf(value).replace("\"", "\"\"");
        return "\"" + text + "\"";
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
        job.setUrgent(req.isUrgent());
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
                job.getCreatedAt(),
                job.isInternalApplication() ? "INTERNAL" : "EXTERNAL",
                job.getSourceUrl(),
                job.isUrgent(),
                qualityValidationService.analyzeJob(job)
        );
    }

    public JobDtos.JobDetailResponse toDetail(Job job, EmployerProfile employer) {
        List<ValidationDtos.QualitySignal> qualitySignals = qualityValidationService.analyzeJob(job);
        return new JobDtos.JobDetailResponse(
                job.getId().toString(),
                job.getTitle(),
                job.getCompany(),
                employer != null ? employer.getLogoUrl() : null,
                employer != null ? employer.getId().toString() : null,
                employer != null ? employer.getSlug() : null,
                job.getRecruiter().getEmail(),
                job.getRecruiter().getFullName(),
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
                job.getUpdatedAt(),
                job.isInternalApplication() ? "INTERNAL" : "EXTERNAL",
                job.getSourceUrl(),
                job.isUrgent(),
                qualitySignals
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

    private String valueOr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private Job.SalaryMode draftSalaryMode(String value) {
        if (value == null || value.isBlank()) return Job.SalaryMode.NEGOTIABLE;
        try {
            return Job.SalaryMode.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return Job.SalaryMode.NEGOTIABLE;
        }
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
