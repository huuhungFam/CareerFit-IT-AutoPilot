package com.careerfit.backend.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.UUID;

/**
 * Unified API response envelope for all endpoints.
 * Shape: { success, data, error, meta }
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        T data,
        ErrorPayload error,
        Meta meta
) {
    public record Meta(String requestId) {}

    public record ErrorPayload(
            String code,
            String message,
            Object details,
            Object fieldErrors
    ) {}

    // ── Factories ──────────────────────────────────────────────────────────

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, new Meta(UUID.randomUUID().toString()));
    }

    public static <T> ApiResponse<T> ok() {
        return new ApiResponse<>(true, null, null, new Meta(UUID.randomUUID().toString()));
    }

    public static <T> ApiResponse<T> fail(String code, String message) {
        return new ApiResponse<>(false, null,
                new ErrorPayload(code, message, null, null),
                new Meta(UUID.randomUUID().toString()));
    }

    public static <T> ApiResponse<T> fail(String code, String message, Object details) {
        return new ApiResponse<>(false, null,
                new ErrorPayload(code, message, details, null),
                new Meta(UUID.randomUUID().toString()));
    }

    public static <T> ApiResponse<T> validationFail(String message, Object fieldErrors) {
        return new ApiResponse<>(false, null,
                new ErrorPayload("VALIDATION_ERROR", message, null, fieldErrors),
                new Meta(UUID.randomUUID().toString()));
    }
}
