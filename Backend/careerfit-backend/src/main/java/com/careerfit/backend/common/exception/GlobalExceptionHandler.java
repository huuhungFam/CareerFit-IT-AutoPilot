package com.careerfit.backend.common.exception;

import com.careerfit.backend.common.dto.ValidationDtos;
import com.careerfit.backend.common.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ── AppException (all domain errors) ──────────────────────────────────

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(
            AppException ex, HttpServletRequest req) {
        log.warn("[{}] {} - {}: {}", req.getMethod(), req.getRequestURI(), ex.getCode(), ex.getMessage());
        return ResponseEntity.status(ex.getStatus())
                .body(ApiResponse.fail(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDomainValidation(
            ValidationException ex, HttpServletRequest req) {
        List<ValidationDtos.FieldViolation> fields = ex.getSignals().stream()
                .map(signal -> new ValidationDtos.FieldViolation(
                        signal.severity(),
                        signal.field(),
                        signal.code(),
                        signal.message(),
                        suggestionFor(signal.code())))
                .toList();
        var details = new ValidationDtos.ValidationErrorDetails(
                "VALIDATION_FAILED",
                ex.getMessage(),
                fields);
        log.warn("[{}] {} - validation failed: {}", req.getMethod(), req.getRequestURI(), fields);
        return ResponseEntity.badRequest()
                .body(ApiResponse.validationFail(ex.getMessage(), details));
    }

    // ── Bean validation errors ─────────────────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(
            MethodArgumentNotValidException ex) {
        Map<String, String> legacyFieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            legacyFieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        List<ValidationDtos.FieldViolation> fields = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> new ValidationDtos.FieldViolation(
                        ValidationDtos.Severity.ERROR,
                        fe.getField(),
                        "CONSTRAINT_VIOLATION",
                        fe.getDefaultMessage(),
                        null))
                .toList();
        var details = new ValidationDtos.ValidationErrorDetails(
                "VALIDATION_FAILED",
                "Validation failed",
                fields);
        log.debug("Validation failed: {}", legacyFieldErrors);
        return ResponseEntity.badRequest()
                .body(ApiResponse.validationFail("Validation failed", details));
    }

    // ── Spring Security ────────────────────────────────────────────────────

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
        log.warn("[{}] {} - access denied", req.getMethod(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.fail("FORBIDDEN", "Access denied"));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.fail("UNAUTHORIZED", "Invalid credentials"));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthentication(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.fail("UNAUTHORIZED", "Authentication required"));
    }

    // ── Safe request parsing errors ───────────────────────────────────────

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleMalformedJson(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.fail("MALFORMED_REQUEST", "Malformed request body"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.fail("INVALID_PARAMETER", "Invalid parameter: " + ex.getName()));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingParameter(MissingServletRequestParameterException ex) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.fail("MISSING_PARAMETER", "Missing required parameter: " + ex.getParameterName()));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiResponse.fail("METHOD_NOT_ALLOWED", "HTTP method is not allowed for this endpoint"));
    }

    // ── File size ─────────────────────────────────────────────────────────

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxUpload(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ApiResponse.fail("FILE_TOO_LARGE", "Uploaded file exceeds the maximum allowed size"));
    }

    // ── Catch-all ─────────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex, HttpServletRequest req) {
        log.error("[{}] {} - Unhandled exception: {}", req.getMethod(), req.getRequestURI(), ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.fail("INTERNAL_ERROR", "An unexpected error occurred"));
    }

    private String suggestionFor(String code) {
        if (code == null) return null;
        return switch (code) {
            case "SALARY_MODE_REQUIRED" -> "Choose a salary mode before publishing the JD.";
            case "SALARY_NEGATIVE" -> "Use zero or a positive salary value.";
            case "SALARY_RANGE_INVALID" -> "Make salaryMin less than or equal to salaryMax.";
            case "SALARY_RANGE_REQUIRED" -> "Provide both salaryMin and salaryMax for RANGE salary mode.";
            case "SALARY_MIN_REQUIRED" -> "Provide salaryMin for FROM salary mode.";
            case "SALARY_MAX_REQUIRED" -> "Provide salaryMax for UP_TO salary mode.";
            case "JD_SENIORITY_EXPERIENCE_MISMATCH", "JD_FRESHER_EXPERIENCE_MISMATCH" ->
                    "Review seniority level and required years of experience.";
            case "JD_INTERN_SALARY_HIGH" -> "Verify salary currency, unit, and job level.";
            case "JD_TOO_SHORT" -> "Add responsibilities, required skills, and working context.";
            case "JD_REQUIRED_SKILLS_EMPTY" -> "Add at least the core technical skills for this JD.";
            case "CV_SENIORITY_EXPERIENCE_MISMATCH" -> "Review seniority and yearsOfExperience in the CV profile.";
            case "CV_TOO_MANY_SKILLS" -> "Keep the most relevant skills for the target role.";
            case "CV_SUMMARY_TOO_SHORT" -> "Add a concise profile summary with role, stack, and experience.";
            default -> null;
        };
    }
}
