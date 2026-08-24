package com.careerfit.backend.candidate.service;

import com.careerfit.backend.candidate.dto.CandidateDtos;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.entity.CandidatePortfolioLink;
import com.careerfit.backend.candidate.entity.CandidatePortfolioProject;
import com.careerfit.backend.candidate.repository.CandidatePortfolioLinkRepository;
import com.careerfit.backend.candidate.repository.CandidatePortfolioProjectRepository;
import com.careerfit.backend.settings.service.SettingsService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CandidatePortfolioVisibilityService {

    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};

    private final CandidatePortfolioLinkRepository linkRepo;
    private final CandidatePortfolioProjectRepository projectRepo;
    private final SettingsService settingsService;
    private final ObjectMapper objectMapper;

    public CandidatePortfolioVisibilityService(CandidatePortfolioLinkRepository linkRepo,
                                               CandidatePortfolioProjectRepository projectRepo,
                                               SettingsService settingsService,
                                               ObjectMapper objectMapper) {
        this.linkRepo = linkRepo;
        this.projectRepo = projectRepo;
        this.settingsService = settingsService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public PortfolioVisibility buildForRecruiter(Candidate candidate, boolean hasApplied) {
        if (!hasApplied) {
            return hidden("PORTFOLIO_AVAILABLE_AFTER_APPLY");
        }

        var settings = settingsService.get(candidate.getUser().getId());
        if (!isEnabled(settings.values().get("showPortfolioAfterApply"))) {
            return hidden("CANDIDATE_DISABLED_PORTFOLIO_AFTER_APPLY");
        }

        var portfolio = new CandidateDtos.PortfolioResponse(
                linkRepo.findByCandidateIdOrderByCreatedAtDesc(candidate.getId()).stream()
                        .map(this::toPortfolioLink)
                        .toList(),
                projectRepo.findByCandidateIdOrderByCreatedAtDesc(candidate.getId()).stream()
                        .map(this::toPortfolioProject)
                        .toList()
        );
        return new PortfolioVisibility(true, portfolio, null);
    }

    private PortfolioVisibility hidden(String reason) {
        return new PortfolioVisibility(false, null, reason);
    }

    private boolean isEnabled(Object value) {
        return !(value instanceof Boolean bool) || bool;
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

    private List<String> parseList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, LIST_TYPE);
        } catch (Exception e) {
            return List.of();
        }
    }

    public record PortfolioVisibility(
            boolean visible,
            CandidateDtos.PortfolioResponse portfolio,
            String hiddenReason
    ) {}
}
