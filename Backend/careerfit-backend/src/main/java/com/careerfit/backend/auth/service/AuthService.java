package com.careerfit.backend.auth.service;

import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.auth.dto.AuthDtos;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.automation.entity.AutomationPolicy;
import com.careerfit.backend.automation.service.AutomationPolicyService;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.config.AppProperties;
import com.careerfit.backend.config.security.JwtService;
import com.careerfit.backend.notification.service.IMailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserAccountRepository userRepo;
    private final CandidateRepository candidateRepo;
    private final AuditLogRepository auditRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AppProperties props;
    private final IMailService mailService;
    private final AutomationPolicyService policyService;
    private final AccountDeletionService accountDeletionService;

    public AuthService(UserAccountRepository userRepo,
                       CandidateRepository candidateRepo,
                       AuditLogRepository auditRepo,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AppProperties props,
                       IMailService mailService,
                       AutomationPolicyService policyService,
                       AccountDeletionService accountDeletionService) {
        this.userRepo = userRepo;
        this.candidateRepo = candidateRepo;
        this.auditRepo = auditRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.props = props;
        this.mailService = mailService;
        this.policyService = policyService;
        this.accountDeletionService = accountDeletionService;
    }

    // ── Register ──────────────────────────────────────────────────────────

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest req) {
        String email = normalizeEmail(req.email());
        if (userRepo.existsByEmail(email)) {
            throw AppException.conflict("Email already registered: " + email);
        }

        UserAccount.Role role;
        try {
            role = UserAccount.Role.valueOf(req.role().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw AppException.badRequest("Invalid role: " + req.role() + ". Must be CANDIDATE or RECRUITER");
        }
        if (role != UserAccount.Role.CANDIDATE && role != UserAccount.Role.RECRUITER) {
            throw AppException.badRequest("Invalid role: " + req.role() + ". Must be CANDIDATE or RECRUITER");
        }

        var user = new UserAccount(
                email,
                passwordEncoder.encode(req.password()),
                role,
                req.fullName()
        );
        user.setEmailVerified(true); // skip email verification for MVP
        userRepo.save(user);
        policyService.getOrCreate(user.getId());

        // Auto-create Candidate profile if role is CANDIDATE
        if (role == UserAccount.Role.CANDIDATE) {
            candidateRepo.save(new Candidate(user));
        }

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, user.getId(), "REGISTER")
                .withResult(AuditLog.Result.SUCCESS)
                .withChannel(AuditLog.SourceChannel.WEB));

        log.info("Registered new user: {} role={}", email, role);
        return buildAuthResponse(user);
    }

    // ── Login ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest req) {
        String identifier = normalizeLoginIdentifier(req.email());
        var user = userRepo.findByEmail(identifier)
                .orElseThrow(() -> AppException.unauthorized("Invalid credentials"));

        if (!user.isActive()) {
            throw AppException.forbidden("Account is disabled");
        }
        if (user.getPasswordHash() == null || !passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw AppException.unauthorized("Invalid credentials");
        }

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, user.getId(), "LOGIN")
                .withResult(AuditLog.Result.SUCCESS)
                .withChannel(AuditLog.SourceChannel.WEB));

        return buildAuthResponse(user);
    }

    private String normalizeLoginIdentifier(String identifier) {
        if (identifier == null) return null;
        String normalized = identifier.trim();
        return switch (normalized.toLowerCase()) {
            case "ca" -> "ca";
            case "re" -> "re";
            default -> normalizeEmail(normalized);
        };
    } // ── Current user ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AuthDtos.MeResponse getMe(String email) {
        String normalizedEmail = normalizeEmail(email);
        var user = userRepo.findByEmail(normalizedEmail)
                .orElseThrow(() -> AppException.notFound("User", normalizedEmail));
        return new AuthDtos.MeResponse(
                user.getId().toString(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.isEmailVerified(),
                user.getPreferredLanguage()
        );
    }

    @Transactional
    public AuthDtos.AccountDeletionResponse deleteCurrentAccount(String email) {
        String normalizedEmail = normalizeEmail(email);
        var user = userRepo.findByEmail(normalizedEmail)
                .orElseThrow(() -> AppException.notFound("User", normalizedEmail));
        if (user.getRole() == UserAccount.Role.ADMIN) {
            throw AppException.forbidden("Administrator accounts cannot be deleted through this endpoint");
        }

        accountDeletionService.delete(user);
        log.info("Deleted account: {} role={}", normalizedEmail, user.getRole());
        return new AuthDtos.AccountDeletionResponse("Account deleted successfully");
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private AuthDtos.AuthResponse buildAuthResponse(UserAccount user) {
        String token = jwtService.generateToken(user.getEmail(), user.getRole().name(), user.getId());
        return new AuthDtos.AuthResponse(
                token,
                "Bearer",
                props.getJwtExpirationMs() / 1000,
                new AuthDtos.UserInfo(
                        user.getId().toString(),
                        user.getEmail(),
                        user.getFullName(),
                        user.getRole().name(),
                        user.isEmailVerified()
                )
        );
    }

    private static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

}
