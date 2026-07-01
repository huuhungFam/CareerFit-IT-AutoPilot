package com.careerfit.backend.common.exception;

import com.careerfit.backend.common.dto.ValidationDtos;
import org.springframework.http.HttpStatus;

import java.util.List;

public class ValidationException extends AppException {

    private final List<ValidationDtos.QualitySignal> signals;

    public ValidationException(String message, List<ValidationDtos.QualitySignal> signals) {
        super(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message);
        this.signals = signals;
    }

    public List<ValidationDtos.QualitySignal> getSignals() {
        return signals;
    }
}
