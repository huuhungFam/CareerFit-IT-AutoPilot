package com.careerfit.backend.common.dto;

public class ValidationDtos {

    public enum Severity {
        ERROR,
        WARNING,
        QUALITY_FLAG
    }

    public record QualitySignal(
            Severity severity,
            String code,
            String field,
            String message
    ) {}

    public record FieldViolation(
            Severity severity,
            String field,
            String reason,
            String message,
            String suggestion
    ) {}

    public record ValidationErrorDetails(
            String code,
            String message,
            java.util.List<FieldViolation> fields
    ) {}
}
