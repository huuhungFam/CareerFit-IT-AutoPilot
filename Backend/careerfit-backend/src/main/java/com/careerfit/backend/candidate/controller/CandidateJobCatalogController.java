package com.careerfit.backend.candidate.controller;

import com.careerfit.backend.candidate.service.CandidateJobCatalogService;
import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.job.dto.JobDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.UUID;

/** Candidate catalog: active public jobs enriched once per page for the current user. */
@RestController
@RequestMapping("/api/candidates/me/job-catalog")
@Tag(name = "Candidate Job Catalog", description = "Public jobs with candidate-specific state")
public class CandidateJobCatalogController {

    private final CandidateJobCatalogService catalogService;

    public CandidateJobCatalogController(CandidateJobCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    @Operation(summary = "Search the full active job catalog with candidate matching, save and application state")
    public ResponseEntity<ApiResponse<JobDtos.CandidateJobCatalogPageResponse>> catalog(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String remoteType,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String salaryMode,
            @RequestParam(required = false) BigDecimal salaryMin,
            @RequestParam(required = false) String domain,
            @RequestParam(required = false) BigDecimal minScore,
            @RequestParam(required = false) UUID jobId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "recent") String sort,
            @RequestAttribute("userId") UUID userId) {
        var request = new JobDtos.JobSearchRequest(keyword, location, level, remoteType, language,
                salaryMode, salaryMin, null, domain, page, size, sort);
        return ResponseEntity.ok(ApiResponse.ok(catalogService.getCatalog(userId, request, jobId, minScore)));
    }
}
