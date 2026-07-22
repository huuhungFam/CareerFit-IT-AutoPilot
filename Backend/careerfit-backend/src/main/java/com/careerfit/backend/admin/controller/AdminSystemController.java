package com.careerfit.backend.admin.controller;

import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.common.util.AfterCommitExecutor;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.matching.service.MatchingService;
import com.careerfit.backend.matching.service.MatchingBatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin System", description = "Admin System Operations")
public class AdminSystemController {

    private final MatchingService matchingService;
    private final CVRepository cvRepo;
    private final MatchingBatchService matchingBatchService;
    private final AfterCommitExecutor afterCommitExecutor;

    public AdminSystemController(MatchingService matchingService, CVRepository cvRepo,
                                 MatchingBatchService matchingBatchService,
                                 AfterCommitExecutor afterCommitExecutor) {
        this.matchingService = matchingService;
        this.cvRepo = cvRepo;
        this.matchingBatchService = matchingBatchService;
        this.afterCommitExecutor = afterCommitExecutor;
    }

    @PostMapping("/matching/rebuild")
    @Operation(summary = "Force full matching recompute for a specific CV")
    public ResponseEntity<ApiResponse<Map<String, String>>> rebuildMatchingForCv(@RequestParam UUID cvId) {
        var cv = cvRepo.findById(cvId)
                .orElseThrow(() -> AppException.notFound("CV", cvId));
        afterCommitExecutor.execute(() -> matchingService.scoreAllJobsForCv(cv.getId()));
        return ResponseEntity.ok(ApiResponse.ok(
                Map.of("message", "Full recompute triggered for CV " + cvId)));
    }

    @PostMapping("/matching/rebuild-batch")
    @Operation(summary = "Vectorize and rebuild matching for one page of active jobs")
    public ResponseEntity<ApiResponse<MatchingBatchService.BatchResult>> rebuildMatchingBatch(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return ResponseEntity.ok(ApiResponse.ok(matchingBatchService.rebuild(page, size)));
    }
}
