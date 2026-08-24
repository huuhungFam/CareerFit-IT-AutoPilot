package com.careerfit.backend.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base runtime exception carrying an HTTP status and an error code.
 * All domain-specific exceptions should extend this.
 */
public class AppException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public AppException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public AppException(HttpStatus status, String code, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode()       { return code; }

    // ── Common factory methods ─────────────────────────────────────────────

    public static AppException notFound(String entity, Object id) {
        return new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND",
                entity + " not found: " + id);
    }

    public static AppException forbidden(String message) {
        return new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }

    public static AppException unauthorized(String message) {
        return new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", message);
    }

    public static AppException badRequest(String message) {
        return new AppException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", message);
    }

    public static AppException conflict(String message) {
        return new AppException(HttpStatus.CONFLICT, "CONFLICT", message);
    }

    public static AppException tokenExpired() {
        return new AppException(HttpStatus.GONE, "TOKEN_EXPIRED", "Token has expired");
    }

    public static AppException tokenAlreadyUsed() {
        return new AppException(HttpStatus.GONE, "TOKEN_ALREADY_USED", "Token has already been used");
    }

    public static AppException tokenInvalid() {
        return new AppException(HttpStatus.UNAUTHORIZED, "TOKEN_INVALID", "Token is invalid or not found");
    }

    public static AppException quotaExceeded(String message) {
        return new AppException(HttpStatus.TOO_MANY_REQUESTS, "QUOTA_EXCEEDED", message);
    }

    public static AppException policyDenied(String message) {
        return new AppException(HttpStatus.FORBIDDEN, "POLICY_DENIED", message);
    }
}
