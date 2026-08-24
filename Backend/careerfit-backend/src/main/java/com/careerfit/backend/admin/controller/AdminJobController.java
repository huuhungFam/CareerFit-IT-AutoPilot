package com.careerfit.backend.admin.controller;

import com.careerfit.backend.admin.dto.AdminJobSummary;
import com.careerfit.backend.admin.service.AdminJobService;
import com.careerfit.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/jobs")
@Tag(name = "Admin Jobs", description = "Admin Job Moderation")
public class AdminJobController {

    private final AdminJobService jobService;

    public AdminJobController(AdminJobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping
    @Operation(summary = "Get jobs")
    public ResponseEntity<ApiResponse<Page<AdminJobSummary>>> getJobs(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        var jobPage = jobService.getJobs(status, PageRequest.of(page, size));
        var summaryPage = jobPage.map(j -> new AdminJobSummary(
                j.getId(),
                j.getTitle(),
                j.getCompany(),
                j.getStatus().name(),
                j.getRecruiter() != null ? j.getRecruiter().getEmail() : "UNKNOWN",
                j.getCreatedAt()
        ));
        return ResponseEntity.ok(ApiResponse.ok(summaryPage));
    }

    @PostMapping("/{jobId}/hide")
    @Operation(summary = "Hide a job")
    public ResponseEntity<ApiResponse<Void>> hideJob(@PathVariable UUID jobId, @RequestAttribute("userId") UUID adminId) {
        jobService.hideJob(jobId, adminId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PostMapping("/{jobId}/restore")
    @Operation(summary = "Restore a job")
    public ResponseEntity<ApiResponse<Void>> restoreJob(@PathVariable UUID jobId, @RequestAttribute("userId") UUID adminId) {
        jobService.restoreJob(jobId, adminId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
