package com.careerfit.backend.application.controller;

import com.careerfit.backend.application.dto.ApplicationDtos;
import com.careerfit.backend.application.service.RecruiterTalentService;
import com.careerfit.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recruiter/talent/jobs/{jobId}")
@Tag(name = "Recruiter Talent", description = "Private CV shortlist for recruiter-owned jobs")
public class RecruiterTalentController {

    private final RecruiterTalentService talentService;

    public RecruiterTalentController(RecruiterTalentService talentService) {
        this.talentService = talentService;
    }

    @GetMapping("/bookmarks")
    @Operation(summary = "List CVs bookmarked for a JD")
    public ResponseEntity<ApiResponse<List<ApplicationDtos.CvBookmarkResponse>>> listBookmarks(
            @PathVariable UUID jobId,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(talentService.listBookmarks(jobId, userId)));
    }

    @PutMapping("/candidates/{candidateId}/bookmark")
    @Operation(summary = "Bookmark a candidate CV without notifying the candidate")
    public ResponseEntity<ApiResponse<ApplicationDtos.CvBookmarkResponse>> bookmark(
            @PathVariable UUID jobId,
            @PathVariable UUID candidateId,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(talentService.bookmark(jobId, candidateId, userId)));
    }

    @DeleteMapping("/candidates/{candidateId}/bookmark")
    @Operation(summary = "Remove a candidate CV bookmark")
    public ResponseEntity<ApiResponse<Void>> removeBookmark(
            @PathVariable UUID jobId,
            @PathVariable UUID candidateId,
            @RequestAttribute("userId") UUID userId) {
        talentService.removeBookmark(jobId, candidateId, userId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
