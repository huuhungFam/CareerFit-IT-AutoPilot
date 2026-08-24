package com.careerfit.backend.application.controller;

import com.careerfit.backend.application.dto.ApplicationDtos;
import com.careerfit.backend.application.service.RecruiterTalentService;
import com.careerfit.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recruiter/jobs/{jobId}")
@Tag(name = "Recruiter Talent Pool", description = "Recruiter-owned matching, bookmarks, and invitations")
public class RecruiterTalentPoolController {

    private final RecruiterTalentService talentService;

    public RecruiterTalentPoolController(RecruiterTalentService talentService) {
        this.talentService = talentService;
    }

    @GetMapping("/talent-pool")
    @Operation(summary = "Get recruiter Talent Pool candidates with card state")
    public ResponseEntity<ApiResponse<ApplicationDtos.TalentPoolPageResponse>> getTalentPool(
            @PathVariable UUID jobId,
            @RequestParam(defaultValue = "high") String group,
            @RequestParam(required = false) String candidateQuery,
            @RequestParam(defaultValue = "0") double minScore,
            @RequestParam(defaultValue = "score_desc") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(talentService.getTalentPool(
                jobId, userId, group, candidateQuery, minScore, sort, page, size)));
    }

    @GetMapping("/invitations")
    @Operation(summary = "Get visible invitation history for a recruiter job")
    public ResponseEntity<ApiResponse<List<ApplicationDtos.TalentCandidateCardResponse>>> getInvitations(
            @PathVariable UUID jobId,
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(talentService.listInvitations(jobId, userId)));
    }
}
