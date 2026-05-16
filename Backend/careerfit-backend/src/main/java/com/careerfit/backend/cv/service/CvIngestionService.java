package com.careerfit.backend.cv.service;

import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.common.util.StorageService;
import com.careerfit.backend.common.util.TextNormalizationService;
import com.careerfit.backend.common.util.TfIdfService;
import com.careerfit.backend.cv.dto.CvDtos;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.matching.service.MatchingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
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

    public CvIngestionService(CVRepository cvRepo,
                              CandidateRepository candidateRepo,
                              PdfExtractionService pdfService,
                              TextNormalizationService normalizer,
                              TfIdfService tfidf,
                              MatchingService matchingService,
                              StorageService storage,
                              AuditLogRepository auditRepo,
                              ObjectMapper objectMapper) {
        this.cvRepo = cvRepo;
        this.candidateRepo = candidateRepo;
        this.pdfService = pdfService;
        this.normalizer = normalizer;
        this.tfidf = tfidf;
        this.matchingService = matchingService;
        this.storage = storage;
        this.auditRepo = auditRepo;
        this.objectMapper = objectMapper;
    }

    // ── PDF Upload ─────────────────────────────────────────────────────────

    /**
     * Accept a PDF upload: store file and create CV record with status UPLOADED.
     * Processing is delegated to async worker.
     * Returns immediately so the HTTP request doesn't wait for scoring.
     */
    @Transactional
    public CvDtos.CvUploadResponse acceptPdfUpload(MultipartFile file,
                                                    String displayName,
                                                    UUID userId) {
        Candidate candidate = candidateRepo.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Candidate", userId));

        // Validate early (MIME check before storing)
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            if (file.getOriginalFilename() == null ||
                    !file.getOriginalFilename().toLowerCase().endsWith(".pdf")) {
                throw AppException.badRequest("Only PDF files are accepted");
            }
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

        // Auto-set default if this is the first CV
        if (!cvRepo.existsByCandidateIdAndIsDefaultTrue(candidate.getId())) {
            cv.setDefault(true);
            cvRepo.save(cv);
        }

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, userId, "CV_UPLOAD")
                .withTarget("CV", cv.getId())
                .withResult(AuditLog.Result.SUCCESS));

        // Trigger async processing
        processPdfAsync(cv.getId());

        return new CvDtos.CvUploadResponse(
                cv.getId().toString(),
                cv.getDisplayName(),
                cv.getStatus().name(),
                "CV uploaded. Processing started in background."
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

        var cv = new CV(candidate, req.displayName(), CV.CvSource.MANUAL);
        cv.setStatus(CV.CvStatus.UPLOADED);
        cv.setLanguage(req.language() != null ? req.language() : "vi");

        // Build raw text from form fields
        String rawText = buildRawTextFromForm(req);
        cv.setRawText(rawText);
        cvRepo.save(cv);

        if (!cvRepo.existsByCandidateIdAndIsDefaultTrue(candidate.getId())) {
            cv.setDefault(true);
            cvRepo.save(cv);
        }

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, userId, "CV_MANUAL_CREATE")
                .withTarget("CV", cv.getId()));

        // Trigger async vectorization + matching
        processManualAsync(cv.getId());

        return new CvDtos.CvUploadResponse(
                cv.getId().toString(),
                cv.getDisplayName(),
                cv.getStatus().name(),
                "CV created. Processing started in background."
        );
    }

    // ── Async Workers ─────────────────────────────────────────────────────

    @Async
    public void processPdfAsync(UUID cvId) {
        CV cv = cvRepo.findById(cvId).orElse(null);
        if (cv == null) {
            log.error("CV not found for async processing: {}", cvId);
            return;
        }

        try {
            cv.setStatus(CV.CvStatus.VALIDATING);
            cvRepo.save(cv);

            // Extract text from stored PDF
            if (cv.getFilePath() == null) {
                throw new IllegalStateException("CV has no file path stored");
            }

            var pdfFile = storage.resolve(cv.getFilePath());
            var extracted = pdfService.extractFromFile(pdfFile);

            cv.setStatus(CV.CvStatus.PROCESSING);
            cv.setRawText(extracted.rawText());
            cvRepo.save(cv);

            // Detect language and vectorize
            vectorizeAndScore(cv);

        } catch (PdfExtractionService.PdfExtractionException e) {
            log.error("PDF extraction failed for CV={}: {}", cvId, e.getMessage());
            markFailed(cv, e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error processing CV={}: {}", cvId, e.getMessage(), e);
            markFailed(cv, "Internal processing error: " + e.getMessage());
        }
    }

    @Async
    public void processManualAsync(UUID cvId) {
        CV cv = cvRepo.findById(cvId).orElse(null);
        if (cv == null) return;

        try {
            cv.setStatus(CV.CvStatus.PROCESSING);
            cvRepo.save(cv);
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
            cvRepo.save(cv);
        } catch (Exception e) {
            markFailed(cv, "Failed to serialize vectors: " + e.getMessage());
            return;
        }

        log.info("CV={} vectorized: {} terms, top skills: {}", cv.getId(), vector.size(), topSkills.subList(0, Math.min(5, topSkills.size())));

        // Trigger async matching against all active jobs
        matchingService.scoreAllJobsForCv(cv);
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

    private void appendIfNotNull(StringBuilder sb, String label, String value) {
        if (value != null && !value.isBlank()) {
            sb.append(label).append(": ").append(value).append("\n");
        }
    }
}
