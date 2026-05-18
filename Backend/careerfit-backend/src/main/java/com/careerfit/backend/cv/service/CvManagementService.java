package com.careerfit.backend.cv.service;

import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.dto.CvDtos;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.common.util.StorageService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * CV management service — list, view, set-default, delete.
 * Separate from ingestion to keep concerns isolated.
 */
@Service
public class CvManagementService {

    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};

    private final CVRepository cvRepo;
    private final CandidateRepository candidateRepo;
    private final ObjectMapper objectMapper;
    private final StorageService storageService;

    public CvManagementService(CVRepository cvRepo,
                               CandidateRepository candidateRepo,
                               ObjectMapper objectMapper,
                               StorageService storageService) {
        this.cvRepo = cvRepo;
        this.candidateRepo = candidateRepo;
        this.objectMapper = objectMapper;
        this.storageService = storageService;
    }

    // ── List CVs ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CvDtos.CvListResponse listMyCvs(UUID userId) {
        var candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));

        List<CV> cvs = cvRepo.findByCandidateIdOrderByCreatedAtDesc(candidate.getId());
        var defaultCv = cvRepo.findByCandidateIdAndIsDefaultTrue(candidate.getId()).orElse(null);

        List<CvDtos.CvSummaryResponse> summaries = cvs.stream()
                .map(this::toSummary)
                .toList();

        return new CvDtos.CvListResponse(
                summaries,
                summaries.size(),
                defaultCv != null ? defaultCv.getId().toString() : null
        );
    }

    @Transactional(readOnly = true)
    public CvDtos.CvDetailResponse getById(UUID cvId, UUID userId) {
        CV cv = findAndAuthorize(cvId, userId);
        return toDetail(cv);
    }

    @Transactional(readOnly = true)
    public CvDtos.CvStatusResponse getStatus(UUID cvId, UUID userId) {
        CV cv = findAndAuthorize(cvId, userId);
        return new CvDtos.CvStatusResponse(
                cv.getId().toString(),
                cv.getStatus().name(),
                cv.getFailureReason(),
                cv.getLastScoredAt()
        );
    }

    // ── Set Default CV ────────────────────────────────────────────────────

    @Transactional
    public CvDtos.CvSummaryResponse setDefault(UUID cvId, UUID userId) {
        var candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));

        CV cv = cvRepo.findById(cvId)
                .orElseThrow(() -> AppException.notFound("CV", cvId));

        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw AppException.forbidden("You do not own this CV");
        }

        if (cv.getStatus() != CV.CvStatus.SCORING_DONE) {
            throw AppException.badRequest(
                "Cannot set a CV as default until processing is complete. Current status: " + cv.getStatus());
        }

        // Atomically clear existing default and set new one
        cvRepo.clearDefaultByCandidateId(candidate.getId());
        cv.setDefault(true);
        cvRepo.save(cv);

        return toSummary(cv);
    }

    // ── Delete CV ─────────────────────────────────────────────────────────

    @Transactional
    public void deleteCv(UUID cvId, UUID userId) {
        CV cv = findAndAuthorize(cvId, userId);

        if (cv.isDefault()) {
            throw AppException.badRequest(
                "Cannot delete the default CV. Set another CV as default first.");
        }

        cvRepo.delete(cv);
        
        // Delete physical file if it exists
        if (cv.getFilePath() != null) {
            try {
                storageService.delete(cv.getFilePath());
            } catch (Exception e) {
                // Log and swallow so DB tx still commits
                // e.g., file was already removed manually
                System.err.println("Failed to delete CV file: " + cv.getFilePath());
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private CV findAndAuthorize(UUID cvId, UUID userId) {
        var candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));
        CV cv = cvRepo.findById(cvId)
                .orElseThrow(() -> AppException.notFound("CV", cvId));
        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw AppException.forbidden("You do not own this CV");
        }
        return cv;
    }

    private CvDtos.CvSummaryResponse toSummary(CV cv) {
        return new CvDtos.CvSummaryResponse(
                cv.getId().toString(),
                cv.getDisplayName(),
                cv.getSource().name(),
                cv.isDefault(),
                cv.getStatus().name(),
                cv.getLanguage(),
                parseTopSkills(cv.getTopSkillsJson()),
                cv.getParsedSummary(),
                cv.getLastScoredAt(),
                cv.getCreatedAt()
        );
    }

    private CvDtos.CvDetailResponse toDetail(CV cv) {
        return new CvDtos.CvDetailResponse(
                cv.getId().toString(),
                cv.getDisplayName(),
                cv.getSource().name(),
                cv.isDefault(),
                cv.getStatus().name(),
                cv.getLanguage(),
                parseTopSkills(cv.getTopSkillsJson()),
                cv.getParsedSummary(),
                cv.getRawText(),
                cv.getFailureReason(),
                cv.getLastScoredAt(),
                cv.getCreatedAt(),
                cv.getUpdatedAt()
        );
    }

    private List<String> parseTopSkills(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, LIST_TYPE);
        } catch (Exception e) {
            return List.of();
        }
    }
}
