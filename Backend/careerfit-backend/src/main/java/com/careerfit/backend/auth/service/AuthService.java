package com.careerfit.backend.auth.service;

import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.auth.dto.AuthDtos;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.automation.entity.AutomationPolicy;
import com.careerfit.backend.automation.entity.EmailToken;
import com.careerfit.backend.automation.repository.EmailTokenRepository;
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
    private final EmailTokenRepository tokenRepo;
    private final AuditLogRepository auditRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AppProperties props;
    private final IMailService mailService;

    public AuthService(UserAccountRepository userRepo,
                       CandidateRepository candidateRepo,
                       EmailTokenRepository tokenRepo,
                       AuditLogRepository auditRepo,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AppProperties props,
                       IMailService mailService) {
        this.userRepo = userRepo;
        this.candidateRepo = candidateRepo;
        this.tokenRepo = tokenRepo;
        this.auditRepo = auditRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.props = props;
        this.mailService = mailService;
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

        var user = new UserAccount(
                email,
                passwordEncoder.encode(req.password()),
                role,
                req.fullName()
        );
        user.setEmailVerified(true); // skip email verification for MVP
        userRepo.save(user);

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
    }

    // ── Passwordless ──────────────────────────────────────────────────────

    @Transactional
    public AuthDtos.PasswordlessRequestResponse requestPasswordlessToken(String email) {
        String normalizedEmail = normalizeEmail(email);
        var maybeUser = userRepo.findByEmail(normalizedEmail);
        if (maybeUser.isEmpty()) {
            log.info("Passwordless token requested for unknown email: {}", normalizedEmail);
            return new AuthDtos.PasswordlessRequestResponse(
                    "Magic link sent if the account exists and mail is configured.",
                    null,
                    props.getMagicLinkExpirationMinutes()
            );
        }
        var user = maybeUser.get();

        // Revoke existing active PASSWORDLESS tokens for this user
        tokenRepo.revokeActiveTokens(user.getId(),
                EmailToken.TokenPurpose.PASSWORDLESS_LOGIN, Instant.now());

        // Generate a random 32-byte token
        byte[] rawBytes = new byte[32];
        SECURE_RANDOM.nextBytes(rawBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(rawBytes);
        String tokenHash = sha256Hex(rawToken);

        var expiry = Instant.now().plusSeconds(props.getMagicLinkExpirationMinutes() * 60L);
        var token = new EmailToken(tokenHash, EmailToken.TokenPurpose.PASSWORDLESS_LOGIN, user, expiry);
        tokenRepo.save(token);

        String magicLink = buildMagicLink(rawToken);
        mailService.sendPlainText(
                normalizedEmail,
                "CareerFit magic login link",
                """
                Hello %s,

                Use this link to sign in to CareerFit:
                %s

                This link expires in %d minutes. If you did not request it, you can ignore this email.
                """.formatted(
                        user.getFullName() != null ? user.getFullName() : normalizedEmail,
                        magicLink,
                        props.getMagicLinkExpirationMinutes()
                )
        );

        log.info("Passwordless token issued for: {}", normalizedEmail);
        return new AuthDtos.PasswordlessRequestResponse(
                "Magic link sent if the account exists and mail is configured.",
                props.isMagicLinkExposeTokenInResponse() ? rawToken : null,
                props.getMagicLinkExpirationMinutes()
        );
    }

    @Transactional(readOnly = true)
    public String inspectPasswordlessToken(String rawToken) {
        var emailToken = findValidPasswordlessToken(rawToken);
        String email = emailToken.getUser().getEmail();
        return "Token is valid for " + email + ". POST to /api/auth/passwordless/verify to complete login.";
    }

    @Transactional
    public AuthDtos.AuthResponse verifyPasswordlessToken(String rawToken) {
        var emailToken = findValidPasswordlessToken(rawToken);

        var user = emailToken.getUser();
        if (!user.isActive()) {
            throw AppException.unauthorized("Account has been suspended");
        }

        emailToken.markUsed();
        tokenRepo.save(emailToken);

        user.setEmailVerified(true);
        userRepo.save(user);

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, user.getId(), "PASSWORDLESS_LOGIN")
                .withResult(AuditLog.Result.SUCCESS)
                .withChannel(AuditLog.SourceChannel.EMAIL));

        return buildAuthResponse(user);
    }

    // ── Current user ──────────────────────────────────────────────────────

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

    // ── Helpers ───────────────────────────────────────────────────────────

    private AuthDtos.AuthResponse buildAuthResponse(UserAccount user) {
        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
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

    private String buildMagicLink(String rawToken) {
        String baseUrl = props.getBaseUrl();
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        return baseUrl + "/api/auth/passwordless/verify?token=" + rawToken;
    }

    private EmailToken findValidPasswordlessToken(String rawToken) {
        String tokenHash = sha256Hex(rawToken);
        var emailToken = tokenRepo.findByTokenHash(tokenHash)
                .orElseThrow(AppException::tokenInvalid);

        if (!emailToken.isValid()) {
            if (emailToken.isExpired())  throw AppException.tokenExpired();
            if (emailToken.isUsed())     throw AppException.tokenAlreadyUsed();
            throw AppException.tokenInvalid();
        }
        if (emailToken.getPurpose() != EmailToken.TokenPurpose.PASSWORDLESS_LOGIN) {
            throw AppException.tokenInvalid();
        }
        return emailToken;
    }

    private static String sha256Hex(String input) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
