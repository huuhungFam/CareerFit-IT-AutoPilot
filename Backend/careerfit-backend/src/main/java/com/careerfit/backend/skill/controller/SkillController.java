package com.careerfit.backend.skill.controller;

import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.skill.service.SkillCatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/skills")
@Tag(name = "Skills", description = "Canonical skill catalog")
public class SkillController {

    private final SkillCatalogService skillCatalogService;

    public SkillController(SkillCatalogService skillCatalogService) {
        this.skillCatalogService = skillCatalogService;
    }

    @GetMapping("/suggestions")
    @Operation(summary = "Suggest canonical skill names, prioritizing prefix matches")
    public ResponseEntity<ApiResponse<List<String>>> suggestions(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(ApiResponse.ok(
                skillCatalogService.suggestions(keyword, limit)));
    }
}
