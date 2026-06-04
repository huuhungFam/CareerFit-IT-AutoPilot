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
}
