package com.careerfit.backend.settings.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;

public class SettingsDtos {
    public record UpdateSettingsRequest(
            @NotNull @Size(max = 30) Map<String, Object> values
    ) {}

    public record SettingsResponse(
            String role,
            Map<String, Object> values,
            Instant updatedAt
    ) {}
}
