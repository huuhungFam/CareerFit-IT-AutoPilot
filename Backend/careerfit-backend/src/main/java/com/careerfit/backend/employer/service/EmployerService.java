package com.careerfit.backend.employer.service;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.employer.dto.EmployerDtos;
import com.careerfit.backend.employer.entity.EmployerProfile;
import com.careerfit.backend.employer.repository.EmployerProfileRepository;
import com.careerfit.backend.job.repository.JobRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class EmployerService {

    private static final Logger log = LoggerFactory.getLogger(EmployerService.class);
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};
    private static final Pattern NON_SLUG = Pattern.compile("[^a-z0-9-]");

    private final EmployerProfileRepository employerRepo;
    private final UserAccountRepository userRepo;
    private final JobRepository jobRepo;
    private final ObjectMapper objectMapper;

    public EmployerService(EmployerProfileRepository employerRepo,
                           UserAccountRepository userRepo,
                           JobRepository jobRepo,
                           ObjectMapper objectMapper) {
        this.employerRepo = employerRepo;
        this.userRepo = userRepo;
        this.jobRepo = jobRepo;
        this.objectMapper = objectMapper;
    }

    // ── Create / Update ───────────────────────────────────────────────────

    @Transactional
    public EmployerDtos.EmployerDetailResponse createOrUpdate(UUID userId,
                                                              EmployerDtos.CreateOrUpdateEmployerRequest req) {
        UserAccount recruiter = userRepo.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));

        if (recruiter.getRole() != UserAccount.Role.RECRUITER) {
            throw AppException.forbidden("Only RECRUITER accounts can manage employer profiles");
        }

        EmployerProfile profile = employerRepo.findByRecruiterId(userId)
                .orElse(new EmployerProfile(recruiter, req.companyName(), ""));

        profile.setCompanyName(req.companyName());

        // Slug: use provided or auto-generate from company name
        String slug = (req.slug() != null && !req.slug().isBlank())
                ? req.slug()
                : toSlug(req.companyName());

        // Ensure slug uniqueness (skip check if slug didn't change)
        if (!slug.equals(profile.getSlug())) {
            if (employerRepo.existsBySlug(slug)) {
                slug = slug + "-" + userId.toString().substring(0, 8);
            }
        }

        profile.setSlug(slug);
        if (req.logoUrl()    != null) profile.setLogoUrl(req.logoUrl());
        if (req.coverUrl()   != null) profile.setCoverUrl(req.coverUrl());
        if (req.summary()    != null) profile.setSummary(req.summary());
        if (req.description()!= null) profile.setDescription(req.description());
        if (req.industry()   != null) profile.setIndustry(req.industry());
        if (req.companySize()!= null) profile.setCompanySize(req.companySize());
        if (req.location()   != null) profile.setLocation(req.location());
        if (req.websiteUrl() != null) profile.setWebsiteUrl(req.websiteUrl());

        if (req.benefits() != null) {
            try {
                profile.setBenefitsJson(objectMapper.writeValueAsString(req.benefits()));
            } catch (Exception e) {
                log.warn("Failed to serialize benefits: {}", e.getMessage());
            }
        }

        employerRepo.save(profile);
        return toDetail(profile, countJobs(userId));
    }

    // ── Public Queries ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public EmployerDtos.EmployerDetailResponse getBySlug(String slug) {
        EmployerProfile profile = employerRepo.findBySlug(slug)
                .orElseThrow(() -> AppException.notFound("Employer", slug));
        return toDetail(profile, countJobs(profile.getRecruiter().getId()));
    }

    @Transactional(readOnly = true)
    public EmployerDtos.EmployerDetailResponse getMyProfile(UUID userId) {
        EmployerProfile profile = employerRepo.findByRecruiterId(userId)
                .orElseThrow(() -> AppException.notFound("Employer profile",
                        "No profile found. Please create one."));
        return toDetail(profile, countJobs(userId));
    }

    @Transactional(readOnly = true)
    public List<EmployerDtos.EmployerSummaryResponse> getFeatured() {
        return employerRepo.findByIsFeaturedTrue().stream()
                .map(p -> toSummary(p, countJobs(p.getRecruiter().getId())))
                .toList();
    }

    // ── Mappers ───────────────────────────────────────────────────────────

    private EmployerDtos.EmployerDetailResponse toDetail(EmployerProfile p, long jobCount) {
        return new EmployerDtos.EmployerDetailResponse(
                p.getId().toString(),
                p.getCompanyName(),
                p.getSlug(),
                p.getLogoUrl(),
                p.getCoverUrl(),
                p.getSummary(),
                p.getDescription(),
                p.getIndustry(),
                p.getCompanySize(),
                p.getLocation(),
                p.getWebsiteUrl(),
                parseBenefits(p.getBenefitsJson()),
                p.isFeatured(),
                (int) jobCount,
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }

    private EmployerDtos.EmployerSummaryResponse toSummary(EmployerProfile p, long jobCount) {
        return new EmployerDtos.EmployerSummaryResponse(
                p.getId().toString(),
                p.getCompanyName(),
                p.getSlug(),
                p.getLogoUrl(),
                p.getCoverUrl(),
                p.getSummary(),
                p.getIndustry(),
                p.getCompanySize(),
                p.getLocation(),
                p.isFeatured(),
                (int) jobCount
        );
    }

    private List<String> parseBenefits(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, LIST_TYPE);
        } catch (Exception e) {
            return List.of();
        }
    }

    private long countJobs(UUID recruiterId) {
        return jobRepo.findByRecruiterIdAndStatus(recruiterId,
                com.careerfit.backend.job.entity.Job.JobStatus.ACTIVE).size();
    }

    private String toSlug(String name) {
        // Normalize Unicode, then lower + replace spaces, remove non-alnum-dash
        String normalized = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase()
                .trim()
                .replaceAll("\\s+", "-");
        return NON_SLUG.matcher(normalized).replaceAll("");
    }
}
