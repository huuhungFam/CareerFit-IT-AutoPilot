package com.careerfit.backend.candidate.controller;

import com.careerfit.backend.candidate.service.CandidateSavedJobService;
import com.careerfit.backend.candidate.service.CandidateJobCatalogService;
import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.job.dto.JobDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/candidates/me/saved-jobs")
@Tag(name = "Candidate Saved Jobs", description = "Candidate job bookmarks")
public class CandidateSavedJobController {

    private final CandidateSavedJobService savedJobService;
    private final CandidateJobCatalogService catalogService;

    public CandidateSavedJobController(CandidateSavedJobService savedJobService,
                                       CandidateJobCatalogService catalogService) {
        this.savedJobService = savedJobService;
        this.catalogService = catalogService;
    }

    @GetMapping
    @Operation(summary = "List IDs of jobs saved by the authenticated candidate")
    public ResponseEntity<ApiResponse<List<UUID>>> list(@RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(savedJobService.listSavedJobIds(userId)));
    }

    @GetMapping("/cards")
    @Operation(summary = "List saved active jobs with candidate matching metadata")
    public ResponseEntity<ApiResponse<JobDtos.CandidateJobCatalogPageResponse>> cards(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.getSavedJobCards(userId, page, size)));
    }

    @PutMapping("/{jobId}")
    @Operation(summary = "Save a job")
    public ResponseEntity<ApiResponse<Void>> save(@PathVariable UUID jobId,
                                                   @RequestAttribute("userId") UUID userId) {
        savedJobService.save(userId, jobId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @DeleteMapping("/{jobId}")
    @Operation(summary = "Remove a saved job")
    public ResponseEntity<ApiResponse<Void>> remove(@PathVariable UUID jobId,
                                                     @RequestAttribute("userId") UUID userId) {
        savedJobService.remove(userId, jobId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
