package com.careerfit.backend.cv.service;

import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.common.service.QualityValidationService;
import com.careerfit.backend.common.util.AfterCommitExecutor;
import com.careerfit.backend.common.util.StorageService;
import com.careerfit.backend.common.util.TextNormalizationService;
import com.careerfit.backend.common.util.TfIdfService;
import com.careerfit.backend.cv.dto.CvDtos;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.matching.service.MatchingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * CV ingestion service — coordinates the full upload/manual pipeline:
 *
 * Upload PDF:
 *   accept → save metadata (UPLOADED) → store file → async process
 *       → parse PDF → normalize text → vectorize → match → SCORING_DONE
 *
 * Manual creation:
 *   accept form → build raw text → async process
 *       → normalize → vectorize → match → SCORING_DONE
 */
@Service
public class CvIngestionService {

    private static final Logger log = LoggerFactory.getLogger(CvIngestionService.class);

    private final CVRepository cvRepo;
    private final CandidateRepository candidateRepo;
    private final PdfExtractionService pdfService;
    private final TextNormalizationService normalizer;
    private final TfIdfService tfidf;
    private final MatchingService matchingService;
    private final StorageService storage;
    private final AuditLogRepository auditRepo;
    private final ObjectMapper objectMapper;
    private final QualityValidationService qualityValidationService;
    private final AfterCommitExecutor afterCommitExecutor;
    private final CvReviewAnalyzer reviewAnalyzer;

    public CvIngestionService(CVRepository cvRepo,
                              CandidateRepository candidateRepo,
                              PdfExtractionService pdfService,
                              TextNormalizationService normalizer,
                              TfIdfService tfidf,
                              MatchingService matchingService,
                              StorageService storage,
                              AuditLogRepository auditRepo,
                              ObjectMapper objectMapper,
                              QualityValidationService qualityValidationService,
                              AfterCommitExecutor afterCommitExecutor,
                              CvReviewAnalyzer reviewAnalyzer) {
        this.cvRepo = cvRepo;
        this.candidateRepo = candidateRepo;
        this.pdfService = pdfService;
        this.normalizer = normalizer;
        this.tfidf = tfidf;
        this.matchingService = matchingService;
        this.storage = storage;
        this.auditRepo = auditRepo;
        this.objectMapper = objectMapper;
        this.qualityValidationService = qualityValidationService;
        this.afterCommitExecutor = afterCommitExecutor;
        this.reviewAnalyzer = reviewAnalyzer;
    }

    // ── PDF Upload ─────────────────────────────────────────────────────────

    /**
     * Accept a PDF upload: store file and create CV record with status UPLOADED.
     * Processing is delegated to async worker.
     * Returns immediately so the HTTP request doesn't wait for scoring.
     */
    @Transactional
    public CvDtos.CvUploadResponse acceptDocumentUpload(MultipartFile file,
                                                    String displayName,
                                                    UUID userId) {
        Candidate candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));

        try {
            pdfService.validateSupportedUpload(file);
        } catch (PdfExtractionService.PdfExtractionException e) {
            throw AppException.badRequest(e.getMessage());
        }

        String name = (displayName != null && !displayName.isBlank())
                ? displayName
                : (file.getOriginalFilename() != null ? file.getOriginalFilename() : "My CV");

        var cv = new CV(candidate, name, CV.CvSource.UPLOAD);
        cv.setFileOriginalName(file.getOriginalFilename());
        cv.setStatus(CV.CvStatus.UPLOADED);
        cvRepo.save(cv);

        // Store file on disk
        String filePath = storage.store(file, cv.getId());
        cv.setFilePath(filePath);
        cvRepo.save(cv);

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, userId, "CV_UPLOAD")
                .withTarget("CV", cv.getId())
                .withResult(AuditLog.Result.SUCCESS));

        try {
            String extractedText = pdfService.extractFromFile(storage.resolve(cv.getFilePath())).rawText();
            prepareReview(cv, reviewAnalyzer.fromExtractedText(extractedText), extractedText, List.of());
        } catch (Exception exception) {
            markFailed(cv, exception.getMessage());
        }

        return new CvDtos.CvUploadResponse(
                cv.getId().toString(),
                cv.getDisplayName(),
                cv.getStatus().name(),
                cv.getStatus() == CV.CvStatus.FAILED ? "CV upload needs retry before review." : "CV uploaded. Review extracted content before processing.",
                List.of()
        );
    }

    // ── Manual CV ─────────────────────────────────────────────────────────

    /**
     * Accept a manually-filled CV form.
     */
    @Transactional
    public CvDtos.CvUploadResponse acceptManualCv(CvDtos.ManualCvRequest req, UUID userId) {
        Candidate candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));
        var qualitySignals = qualityValidationService.validateManualCv(req);

        var cv = new CV(candidate, req.displayName(), CV.CvSource.MANUAL);
        cv.setStatus(CV.CvStatus.REVIEW_REQUIRED);
        cv.setLanguage(req.language() != null ? req.language() : "vi");

        // Build raw text from form fields
        var sections = reviewAnalyzer.fromManual(req);
        prepareReview(cv, sections, reviewAnalyzer.toRawText(sections), qualitySignals);

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, userId, "CV_MANUAL_CREATE")
                .withTarget("CV", cv.getId()));

        return new CvDtos.CvUploadResponse(
                cv.getId().toString(),
                cv.getDisplayName(),
                cv.getStatus().name(),
                "CV created. Review the content before processing.",
                qualitySignals
        );
    }

    /** Persist incomplete manual data without making it a matching CV. */
    @Transactional
    public CvDtos.CvUploadResponse saveManualCvDraft(CvDtos.ManualCvDraftRequest req, UUID userId) {
        Candidate candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));
        var cv = new CV(candidate,
                req.displayName() == null || req.displayName().isBlank() ? "Untitled CV draft" : req.displayName().trim(),
                CV.CvSource.MANUAL);
        cv.setStatus(CV.CvStatus.DRAFT);
        cv.setLanguage(req.language() == null || req.language().isBlank() ? "vi" : req.language());
        var sections = reviewAnalyzer.fromManualDraft(req);
        cv.setRawText(reviewAnalyzer.toRawText(sections));
        cv.setOriginalRawText(cv.getRawText());
        writeReview(cv, sections, List.of());
        cvRepo.save(cv);

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, userId, "CV_MANUAL_DRAFT_SAVE")
                .withTarget("CV", cv.getId()));
        return new CvDtos.CvUploadResponse(
                cv.getId().toString(), cv.getDisplayName(), cv.getStatus().name(),
                "CV draft saved. It will not be used for matching until completed and submitted.", List.of());
    }


    // ─── Retry ────────────────────────────────────────────────────────────

    @Transactional
    public CvDtos.CvUploadResponse retryFailedCv(UUID cvId, UUID userId) {
        Candidate candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));
        CV cv = cvRepo.findById(cvId)
                .orElseThrow(() -> AppException.notFound("CV", cvId));
        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw AppException.forbidden("Cannot retry another user's CV");
        }
        if (cv.getStatus() != CV.CvStatus.FAILED) {
            throw AppException.badRequest("Only FAILED CVs can be retried");
        }
        
        cv.setFailureReason(null);
        try {
            if (cv.getSource() == CV.CvSource.UPLOAD) {
                String extractedText = pdfService.extractFromFile(storage.resolve(cv.getFilePath())).rawText();
                prepareReview(cv, reviewAnalyzer.fromExtractedText(extractedText), extractedText, List.of());
            } else {
                var sections = reviewAnalyzer.fromExtractedText(cv.getRawText());
                prepareReview(cv, sections, reviewAnalyzer.toRawText(sections), List.of());
            }
        } catch (Exception exception) {
            markFailed(cv, exception.getMessage());
        }
        return new CvDtos.CvUploadResponse(cv.getId().toString(), cv.getDisplayName(), cv.getStatus().name(),
                cv.getStatus() == CV.CvStatus.FAILED ? "CV could not be prepared for review." : "CV is ready for review.", List.of());
    }

    @Transactional
    public CvDtos.CvDetailResponse confirmReviewedCv(UUID cvId, UUID userId) {
        Candidate candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));
        CV cv = cvRepo.findById(cvId).orElseThrow(() -> AppException.notFound("CV", cvId));
        if (!cv.getCandidate().getId().equals(candidate.getId())) throw AppException.forbidden("You do not own this CV");
        if (cv.getStatus() != CV.CvStatus.REVIEW_REQUIRED && cv.getStatus() != CV.CvStatus.DRAFT) {
            throw AppException.badRequest("CV must be reviewed before confirmation");
        }
        cv.setStatus(CV.CvStatus.PROCESSING);
        cv.setFailureReason(null);
        cv = cvRepo.save(cv);
        UUID confirmedCvId = cv.getId();
        afterCommitExecutor.execute(() -> processManual(confirmedCvId));
        return new CvDtos.CvDetailResponse(cv.getId().toString(), cv.getDisplayName(), cv.getSource().name(), cv.isDefault(),
                cv.getStatus().name(), cv.getLanguage(), List.of(), cv.getParsedSummary(), cv.getRawText(), reviewSections(cv), reviewIssues(cv),
                null, cv.getLastScoredAt(), cv.getCreatedAt(), cv.getUpdatedAt());
    }

    // ── Async Workers ─────────────────────────────────────────────────────

    public void processDocument(UUID cvId) {
        CV cv = cvRepo.findById(cvId).orElse(null);
        if (cv == null) {
            log.error("CV not found for async processing: {}", cvId);
            return;
        }

        try {
            cv.setStatus(CV.CvStatus.VALIDATING);
            cv = cvRepo.save(cv);

            // Extract text from the stored PDF, image or DOCX document.
            if (cv.getFilePath() == null) {
                throw new IllegalStateException("CV has no file path stored");
            }

            var documentFile = storage.resolve(cv.getFilePath());
            var extracted = pdfService.extractFromFile(documentFile);

            cv.setStatus(CV.CvStatus.PROCESSING);
            cv.setRawText(extracted.rawText());
            cv = cvRepo.save(cv);

            // Detect language and vectorize
            vectorizeAndScore(cv);

        } catch (PdfExtractionService.PdfExtractionException e) {
            log.error("Document extraction failed for CV={}: {}", cvId, e.getMessage());
            markFailed(cv, e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error processing CV={}: {}", cvId, e.getMessage(), e);
            markFailed(cv, "Internal processing error: " + e.getMessage());
        }
    }

    public void processManual(UUID cvId) {
        CV cv = cvRepo.findById(cvId).orElse(null);
        if (cv == null) return;

        try {
            cv.setStatus(CV.CvStatus.PROCESSING);
            cv = cvRepo.save(cv);
            vectorizeAndScore(cv);
        } catch (Exception e) {
            log.error("Error processing manual CV={}: {}", cvId, e.getMessage(), e);
            markFailed(cv, "Processing error: " + e.getMessage());
        }
    }

    // ── Core Processing Pipeline ──────────────────────────────────────────

    @Transactional
    protected void vectorizeAndScore(CV cv) {
        String rawText = cv.getRawText();
        if (rawText == null || rawText.isBlank()) {
            markFailed(cv, "Extracted text is empty");
            return;
        }

        // Detect language if not set
        if (cv.getLanguage() == null) {
            cv.setLanguage(normalizer.detectLanguage(rawText));
        }

        // Normalize and tokenize
        List<String> tokens = normalizer.normalize(rawText, cv.getLanguage());

        if (tokens.isEmpty()) {
            markFailed(cv, "Text normalization produced no tokens");
            return;
        }

        // Build TF-IDF vector
        Map<String, Double> vector = tfidf.buildVector(tokens);

        // Extract top skills (top 15 terms by TF-IDF weight)
        List<String> topSkills = vector.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(15)
                .map(Map.Entry::getKey)
                .toList();

        // Build short summary from top tokens
        String summary = String.join(", ", topSkills.subList(0, Math.min(8, topSkills.size())));

        // Persist vectorized data
        try {
            cv.setExtractedTermsJson(objectMapper.writeValueAsString(vector));
            cv.setTopSkillsJson(objectMapper.writeValueAsString(topSkills));
            cv.setParsedSummary(summary);
            cv.setLastScoredAt(Instant.now());
            cv.setStatus(CV.CvStatus.SCORING_DONE);
            if (!cvRepo.existsByCandidateIdAndIsDefaultTrue(cv.getCandidate().getId())) {
                cv.setDefault(true);
            }
            cv = cvRepo.save(cv);
        } catch (Exception e) {
            markFailed(cv, "Failed to serialize vectors: " + e.getMessage());
            return;
        }

        log.info("CV={} vectorized: {} terms, top skills: {}", cv.getId(), vector.size(), topSkills.subList(0, Math.min(5, topSkills.size())));

        // Trigger async matching against all active jobs
        matchingService.scoreAllJobsForCv(cv.getId());
    }

    private void prepareReview(CV cv,
                               Map<String, String> sections,
                               String originalText,
                               List<com.careerfit.backend.common.dto.ValidationDtos.QualitySignal> qualitySignals) {
        cv.setOriginalRawText(originalText);
        cv.setRawText(reviewAnalyzer.toRawText(sections));
        cv.setReviewSectionsJson(writeReviewValue(sections));
        cv.setReviewIssuesJson(writeReviewValue(reviewAnalyzer.analyze(sections, qualitySignals)));
        cv.setStatus(CV.CvStatus.REVIEW_REQUIRED);
        cv.setFailureReason(null);
        cvRepo.save(cv);
    }

    private void writeReview(CV cv, Map<String, String> sections, List<CvDtos.CvReviewIssue> issues) {
        cv.setReviewSectionsJson(writeReviewValue(sections));
        cv.setReviewIssuesJson(writeReviewValue(issues));
    }

    private String writeReviewValue(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception exception) {
            throw new IllegalStateException("Could not prepare CV review", exception);
        }
    }

    private Map<String, String> reviewSections(CV cv) {
        if (cv.getReviewSectionsJson() == null || cv.getReviewSectionsJson().isBlank()) {
            return reviewAnalyzer.fromExtractedText(cv.getRawText() == null ? "" : cv.getRawText());
        }
        try {
            return objectMapper.readValue(cv.getReviewSectionsJson(), new TypeReference<LinkedHashMap<String, String>>() {});
        } catch (Exception ignored) {
            return reviewAnalyzer.fromExtractedText(cv.getRawText() == null ? "" : cv.getRawText());
        }
    }

    private List<CvDtos.CvReviewIssue> reviewIssues(CV cv) {
        if (cv.getReviewIssuesJson() == null || cv.getReviewIssuesJson().isBlank()) return List.of();
        try {
            return objectMapper.readValue(cv.getReviewIssuesJson(), new TypeReference<List<CvDtos.CvReviewIssue>>() {});
        } catch (Exception ignored) {
            return List.of();
        }
    }

    @Transactional
    protected void markFailed(CV cv, String reason) {
        cv.setStatus(CV.CvStatus.FAILED);
        cv.setFailureReason(reason);
        cvRepo.save(cv);
        log.error("CV={} marked FAILED: {}", cv.getId(), reason);

        auditRepo.save(new AuditLog(AuditLog.ActorType.SYSTEM, null, "CV_PROCESSING_FAILED")
                .withTarget("CV", cv.getId())
                .withResult(AuditLog.Result.FAILURE)
                .withMetadata("{\"reason\":\"" + reason.replace("\"", "'") + "\"}"));
    }

    // ── Form → Raw Text ───────────────────────────────────────────────────

    private String buildRawTextFromForm(CvDtos.ManualCvRequest req) {
        StringBuilder sb = new StringBuilder();
        appendIfNotNull(sb, "Name", req.fullName());
        appendIfNotNull(sb, "Title", req.desiredTitle());
        appendIfNotNull(sb, "Seniority", req.seniorityLevel());
        appendIfNotNull(sb, "Experience", req.yearsOfExperience() + " years");
        appendIfNotNull(sb, "Location", req.location());
        appendIfNotNull(sb, "Summary", req.summary());
        if (req.skills() != null) {
            sb.append("Skills: ").append(String.join(", ", req.skills())).append("\n");
        }
        if (req.niceToHaveSkills() != null) {
            sb.append("Additional Skills: ").append(String.join(", ", req.niceToHaveSkills())).append("\n");
        }
        appendIfNotNull(sb, "Education", req.education());
        appendIfNotNull(sb, "Experience", req.workExperience());
        appendIfNotNull(sb, "Projects", req.projects());
        appendIfNotNull(sb, "Certifications", req.certifications());
        appendIfNotNull(sb, "Languages", req.languages());
        return sb.toString();
    }

    private String buildRawTextFromDraft(CvDtos.ManualCvDraftRequest req) {
        StringBuilder sb = new StringBuilder();
        appendIfNotNull(sb, "Name", req.fullName());
        appendIfNotNull(sb, "Title", req.desiredTitle());
        appendIfNotNull(sb, "Seniority", req.seniorityLevel());
        if (req.yearsOfExperience() != null) appendIfNotNull(sb, "Experience", req.yearsOfExperience() + " years");
        appendIfNotNull(sb, "Location", req.location());
        appendIfNotNull(sb, "Summary", req.summary());
        if (req.skills() != null && !req.skills().isEmpty()) sb.append("Skills: ").append(String.join(", ", req.skills())).append("\n");
        appendIfNotNull(sb, "Experience", req.workExperience());
        appendIfNotNull(sb, "Education", req.education());
        appendIfNotNull(sb, "Projects", req.projects());
        appendIfNotNull(sb, "Certifications", req.certifications());
        appendIfNotNull(sb, "Languages", req.languages());
        return sb.toString();
    }

    private void appendIfNotNull(StringBuilder sb, String label, String value) {
        if (value != null && !value.isBlank()) {
            sb.append(label).append(": ").append(value).append("\n");
        }
    }
}
