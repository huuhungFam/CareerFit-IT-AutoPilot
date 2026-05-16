package com.careerfit.backend.cv.controller;

import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.cv.dto.CvDtos;
import com.careerfit.backend.cv.service.CvIngestionService;
import com.careerfit.backend.cv.service.CvManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/cv")
@Tag(name = "CV", description = "CV upload, manual creation, and management")
public class CvController {

    private final CvIngestionService ingestion;
    private final CvManagementService management;

    public CvController(CvIngestionService ingestion, CvManagementService management) {
        this.ingestion = ingestion;
        this.management = management;
    }

    // ── Upload PDF ────────────────────────────────────────────────────────

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a PDF CV (text-based only). Processing is async.")
    public ResponseEntity<ApiResponse<CvDtos.CvUploadResponse>> uploadPdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "displayName", required = false) String displayName,
            @AuthenticationPrincipal String email,
            @RequestAttribute("userId") UUID userId) {

        var result = ingestion.acceptPdfUpload(file, displayName, userId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.ok(result));
    }

    // ── Manual CV ─────────────────────────────────────────────────────────

    @PostMapping("/manual")
    @Operation(summary = "Create a CV by filling a form (Manual Creation). Processing is async.")
    public ResponseEntity<ApiResponse<CvDtos.CvUploadResponse>> createManual(
            @Valid @RequestBody CvDtos.ManualCvRequest req,
            @RequestAttribute("userId") UUID userId) {

        var result = ingestion.acceptManualCv(req, userId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.ok(result));
    }

    // ── List my CVs ───────────────────────────────────────────────────────

    @GetMapping("/me")
    @Operation(summary = "List all CVs belonging to the authenticated candidate")
    public ResponseEntity<ApiResponse<CvDtos.CvListResponse>> listMyCvs(
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(management.listMyCvs(userId)));
    }

    // ── CV Detail ─────────────────────────────────────────────────────────

    @GetMapping("/{cvId}")
    @Operation(summary = "Get CV detail including raw text and extracted terms")
    public ResponseEntity<ApiResponse<CvDtos.CvDetailResponse>> getById(
            @PathVariable UUID cvId,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(management.getById(cvId, userId)));
    }

    // ── CV Status ─────────────────────────────────────────────────────────

    @GetMapping("/{cvId}/status")
    @Operation(summary = "Poll CV processing status (UPLOADED → PROCESSING → SCORING_DONE | FAILED)")
    public ResponseEntity<ApiResponse<CvDtos.CvStatusResponse>> getStatus(
            @PathVariable UUID cvId,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(management.getStatus(cvId, userId)));
    }

    // ── Set Default ───────────────────────────────────────────────────────

    @PostMapping("/{cvId}/set-default")
    @Operation(summary = "Set a SCORING_DONE CV as the default for matching and recommendation")
    public ResponseEntity<ApiResponse<CvDtos.CvSummaryResponse>> setDefault(
            @PathVariable UUID cvId,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(management.setDefault(cvId, userId)));
    }

    // ── Delete ────────────────────────────────────────────────────────────

    @DeleteMapping("/{cvId}")
    @Operation(summary = "Delete a CV (cannot delete the default CV)")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID cvId,
            @RequestAttribute("userId") UUID userId) {
        management.deleteCv(cvId, userId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
