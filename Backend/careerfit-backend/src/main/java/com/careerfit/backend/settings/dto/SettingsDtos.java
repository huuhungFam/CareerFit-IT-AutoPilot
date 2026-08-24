package com.careerfit.backend.settings.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;

public class SettingsDtos {
    public record UpdateSettingsRequest(
            @NotNull @Size(max = 30) Map<String, Object> values,
            Boolean demoModeEnabled
    ) {}

    public record SettingsResponse(
            String role,
            Map<String, Object> values,
            Instant updatedAt,
            Boolean demoModeEnabled,
            EffectiveTimingSummary effectiveTiming
    ) {}

    public record EffectiveTimingSummary(
            Integer candidatePollIntervalSeconds,
            Integer firstSuggestionDelaySeconds,
            Integer subsequentSpacingSeconds,
            Integer notificationCooldownHours
    ) {}
}
