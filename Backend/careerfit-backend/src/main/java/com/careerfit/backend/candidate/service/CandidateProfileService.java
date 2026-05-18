package com.careerfit.backend.candidate.service;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.candidate.dto.CandidateDtos;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.entity.CandidatePortfolioLink;
import com.careerfit.backend.candidate.entity.CandidatePortfolioProject;
import com.careerfit.backend.candidate.repository.CandidatePortfolioLinkRepository;
import com.careerfit.backend.candidate.repository.CandidatePortfolioProjectRepository;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CandidateProfileService {

    private static final Logger log = LoggerFactory.getLogger(CandidateProfileService.class);
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};

    private final CandidateRepository candidateRepo;
    private final CandidatePortfolioLinkRepository linkRepo;
    private final CandidatePortfolioProjectRepository projectRepo;
    private final UserAccountRepository userRepo;
    private final CVRepository cvRepo;
    private final ObjectMapper objectMapper;

    public CandidateProfileService(CandidateRepository candidateRepo,
                                   CandidatePortfolioLinkRepository linkRepo,
                                   CandidatePortfolioProjectRepository projectRepo,
                                   UserAccountRepository userRepo,
                                   CVRepository cvRepo,
                                   ObjectMapper objectMapper) {
        this.candidateRepo = candidateRepo;
        this.linkRepo = linkRepo;
        this.projectRepo = projectRepo;
        this.userRepo = userRepo;
        this.cvRepo = cvRepo;
        this.objectMapper = objectMapper;
    }

    // ── Get profile ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CandidateDtos.CandidateProfileResponse getProfile(UUID userId) {
        Candidate candidate = resolveCandidate(userId);
        UserAccount user = candidate.getUser();
        return toProfileResponse(candidate, user);
    }

    // ── Update profile ────────────────────────────────────────────────────

    @Transactional
    public CandidateDtos.CandidateProfileResponse updateProfile(UUID userId,
            CandidateDtos.UpdateCandidateProfileRequest req) {

        Candidate candidate = resolveCandidate(userId);
        UserAccount user = candidate.getUser();

        // Patch fields — only update if not null
        if (req.avatarUrl()             != null) candidate.setAvatarUrl(req.avatarUrl());
        if (req.phone()                 != null) candidate.setPhone(req.phone());
        if (req.location()              != null) candidate.setLocation(req.location());
        if (req.desiredTitle()          != null) candidate.setDesiredTitle(req.desiredTitle());
        if (req.desiredSeniority()      != null) candidate.setDesiredSeniority(req.desiredSeniority());
        if (req.desiredSkills()         != null) candidate.setDesiredSkillsJson(toJson(req.desiredSkills()));
        if (req.desiredWorkModel()      != null) candidate.setDesiredWorkModel(req.desiredWorkModel());
        if (req.desiredSalaryMin()      != null) candidate.setDesiredSalaryMin(req.desiredSalaryMin());
        if (req.desiredSalaryMax()      != null) candidate.setDesiredSalaryMax(req.desiredSalaryMax());
        if (req.desiredSalaryCurrency() != null) candidate.setDesiredSalaryCurrency(req.desiredSalaryCurrency());
        if (req.yearsOfExperience()     != null) candidate.setYearsOfExperience(req.yearsOfExperience());
        if (req.aboutMe()               != null) candidate.setAboutMe(req.aboutMe());
        if (req.preferredLanguage()     != null) candidate.setPreferredLanguage(req.preferredLanguage());

        candidateRepo.save(candidate);
        log.info("Updated candidate profile for userId={}", userId);

        return toProfileResponse(candidate, user);
    }

    // ── Update user account name/avatar ──────────────────────────────────

    @Transactional
    public void updateAccount(UUID userId, CandidateDtos.UpdateAccountRequest req) {
        UserAccount user = userRepo.findById(userId)
                .orElseThrow(() -> AppException.notFound("User", userId));
        if (req.fullName()  != null) user.setFullName(req.fullName());
        userRepo.save(user);
        log.info("Updated account for userId={}", userId);
    }

    // ── CV list ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CandidateDtos.CvSummaryResponse> getMyCvs(UUID userId) {
        Candidate candidate = resolveCandidate(userId);
        return cvRepo.findByCandidateIdOrderByCreatedAtDesc(candidate.getId())
                .stream()
                .map(this::toCvSummary)
                .toList();
    }

    // ── Portfolio ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CandidateDtos.PortfolioResponse getPortfolio(UUID userId) {
        Candidate candidate = resolveCandidate(userId);
        return new CandidateDtos.PortfolioResponse(
                linkRepo.findByCandidateIdOrderByCreatedAtDesc(candidate.getId()).stream()
                        .map(this::toPortfolioLink)
                        .toList(),
                projectRepo.findByCandidateIdOrderByCreatedAtDesc(candidate.getId()).stream()
                        .map(this::toPortfolioProject)
                        .toList()
        );
    }

    @Transactional
    public CandidateDtos.PortfolioLinkResponse addPortfolioLink(UUID userId,
            CandidateDtos.PortfolioLinkRequest req) {
        Candidate candidate = resolveCandidate(userId);
        if (req.url() == null || req.url().isBlank()) {
            throw AppException.badRequest("Portfolio link URL is required");
        }
        CandidatePortfolioLink link = new CandidatePortfolioLink(
                candidate,
                req.type() != null ? req.type() : "OTHER",
                req.url().trim());
        return toPortfolioLink(linkRepo.save(link));
    }

    @Transactional
    public CandidateDtos.PortfolioLinkResponse updatePortfolioLink(UUID userId, UUID linkId,
            CandidateDtos.PortfolioLinkRequest req) {
        Candidate candidate = resolveCandidate(userId);
        CandidatePortfolioLink link = linkRepo.findById(linkId)
                .orElseThrow(() -> AppException.notFound("Portfolio link", linkId));
        ensureOwnsLink(candidate, link);
        if (req.type() != null) link.setType(req.type());
        if (req.url() != null) {
            if (req.url().isBlank()) throw AppException.badRequest("Portfolio link URL cannot be blank");
            link.setUrl(req.url().trim());
        }
        return toPortfolioLink(linkRepo.save(link));
    }

    @Transactional
    public void deletePortfolioLink(UUID userId, UUID linkId) {
        Candidate candidate = resolveCandidate(userId);
        CandidatePortfolioLink link = linkRepo.findById(linkId)
                .orElseThrow(() -> AppException.notFound("Portfolio link", linkId));
        ensureOwnsLink(candidate, link);
        linkRepo.delete(link);
    }

    @Transactional
    public CandidateDtos.PortfolioProjectResponse addPortfolioProject(UUID userId,
            CandidateDtos.PortfolioProjectRequest req) {
        Candidate candidate = resolveCandidate(userId);
        if (req.name() == null || req.name().isBlank()) {
            throw AppException.badRequest("Portfolio project name is required");
        }
        CandidatePortfolioProject project = new CandidatePortfolioProject(candidate, req.name().trim());
        applyProjectPatch(project, req);
        return toPortfolioProject(projectRepo.save(project));
    }

    @Transactional
    public CandidateDtos.PortfolioProjectResponse updatePortfolioProject(UUID userId, UUID projectId,
            CandidateDtos.PortfolioProjectRequest req) {
        Candidate candidate = resolveCandidate(userId);
        CandidatePortfolioProject project = projectRepo.findById(projectId)
                .orElseThrow(() -> AppException.notFound("Portfolio project", projectId));
        ensureOwnsProject(candidate, project);
        applyProjectPatch(project, req);
        return toPortfolioProject(projectRepo.save(project));
    }

    @Transactional
    public void deletePortfolioProject(UUID userId, UUID projectId) {
        Candidate candidate = resolveCandidate(userId);
        CandidatePortfolioProject project = projectRepo.findById(projectId)
                .orElseThrow(() -> AppException.notFound("Portfolio project", projectId));
        ensureOwnsProject(candidate, project);
        projectRepo.delete(project);
    }

    // ── Mappers ───────────────────────────────────────────────────────────

    private CandidateDtos.CandidateProfileResponse toProfileResponse(Candidate c, UserAccount u) {
        return new CandidateDtos.CandidateProfileResponse(
                c.getId(),
                u.getId(),
                u.getEmail(),
                u.getFullName(),
                c.getAvatarUrl(),
                c.getPhone(),
                c.getLocation(),
                c.getDesiredTitle(),
                c.getDesiredSeniority(),
                parseList(c.getDesiredSkillsJson()),
                c.getDesiredWorkModel(),
                c.getDesiredSalaryMin(),
                c.getDesiredSalaryMax(),
                c.getDesiredSalaryCurrency(),
                c.getYearsOfExperience(),
                c.getAboutMe(),
                c.getPreferredLanguage(),
                c.isAutoApplyEnabled(),
                c.getAutoApplyThreshold(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }

    private CandidateDtos.CvSummaryResponse toCvSummary(CV cv) {
        return new CandidateDtos.CvSummaryResponse(
                cv.getId(),
                cv.getDisplayName(),
                cv.getSource().name(),
                cv.isDefault(),
                cv.getStatus().name(),
                cv.getLanguage(),
                cv.getParsedSummary(),
                parseList(cv.getTopSkillsJson()),
                cv.getCreatedAt()
        );
    }

    private CandidateDtos.PortfolioLinkResponse toPortfolioLink(CandidatePortfolioLink link) {
        return new CandidateDtos.PortfolioLinkResponse(
                link.getId(), link.getType(), link.getUrl(), link.getCreatedAt(), link.getUpdatedAt());
    }

    private CandidateDtos.PortfolioProjectResponse toPortfolioProject(CandidatePortfolioProject project) {
        return new CandidateDtos.PortfolioProjectResponse(
                project.getId(),
                project.getName(),
                project.getRole(),
                project.getSummary(),
                parseList(project.getTechStackJson()),
                project.getProjectUrl(),
                project.getImpact(),
                project.getCreatedAt(),
                project.getUpdatedAt()
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private Candidate resolveCandidate(UUID userId) {
        return candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));
    }

    private List<String> parseList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, LIST_TYPE); }
        catch (Exception e) { return List.of(); }
    }

    private String toJson(List<String> list) {
        if (list == null) return null;
        try { return objectMapper.writeValueAsString(list); }
        catch (Exception e) { return "[]"; }
    }

    private void applyProjectPatch(CandidatePortfolioProject project,
            CandidateDtos.PortfolioProjectRequest req) {
        if (req.name() != null) {
            if (req.name().isBlank()) throw AppException.badRequest("Portfolio project name cannot be blank");
            project.setName(req.name().trim());
        }
        if (req.role() != null) project.setRole(req.role());
        if (req.summary() != null) project.setSummary(req.summary());
        if (req.techStack() != null) project.setTechStackJson(toJson(req.techStack()));
        if (req.projectUrl() != null) project.setProjectUrl(req.projectUrl());
        if (req.impact() != null) project.setImpact(req.impact());
    }

    private void ensureOwnsLink(Candidate candidate, CandidatePortfolioLink link) {
        if (!link.getCandidate().getId().equals(candidate.getId())) {
            throw AppException.forbidden("Portfolio link does not belong to you");
        }
    }

    private void ensureOwnsProject(Candidate candidate, CandidatePortfolioProject project) {
        if (!project.getCandidate().getId().equals(candidate.getId())) {
            throw AppException.forbidden("Portfolio project does not belong to you");
        }
    }
}
