package com.careerfit.backend.settings.controller;

import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.settings.dto.SettingsDtos;
import com.careerfit.backend.settings.service.SettingsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/settings/me")
public class SettingsController {
    private final SettingsService service;

    public SettingsController(SettingsService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<ApiResponse<SettingsDtos.SettingsResponse>> get(
            @RequestAttribute("userId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.ok(service.get(userId)));
    }

    @PatchMapping
    public ResponseEntity<ApiResponse<SettingsDtos.SettingsResponse>> update(
            @RequestAttribute("userId") UUID userId,
            @Valid @RequestBody SettingsDtos.UpdateSettingsRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(userId, request)));
    }
}
