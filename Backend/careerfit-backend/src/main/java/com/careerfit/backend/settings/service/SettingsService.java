package com.careerfit.backend.settings.service;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.settings.dto.SettingsDtos;
import com.careerfit.backend.settings.entity.UserSettings;
import com.careerfit.backend.settings.repository.UserSettingsRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.careerfit.backend.automation.entity.AutomationPolicy;
import com.careerfit.backend.automation.service.AutomationPolicyService;
import com.careerfit.backend.automation.service.EffectiveAutomationPolicyResolver;

@Service
public class SettingsService {
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final Set<String> CANDIDATE_KEYS = Set.of(
            "highMatchEmail", "dailyDigest", "recruiterInviteAlerts", "alertThreshold", "digestTime",
            "showPortfolioAfterApply", "allowPotentialDiscovery", "hidePhoneUntilInvite",
            "sessionTimeoutDays");
    private static final Set<String> RECRUITER_KEYS = Set.of(
            "hiringManagerReview", "sharedCandidateNotes", "restrictSalaryVisibility",
            "defaultWorkingModel", "defaultSalaryMode", "candidateReviewSlaHours", "defaultLanguage",
            "highMatchCvAlert", "dailyApprovalDigest", "jobClosingReminders");

    private final UserSettingsRepository settingsRepo;
    private final UserAccountRepository userRepo;
    private final ObjectMapper objectMapper;
    private final AutomationPolicyService policyService;
    private final EffectiveAutomationPolicyResolver effectiveResolver;

    public SettingsService(UserSettingsRepository settingsRepo, UserAccountRepository userRepo,
                           ObjectMapper objectMapper, AutomationPolicyService policyService,
                           EffectiveAutomationPolicyResolver effectiveResolver) {
        this.settingsRepo = settingsRepo;
        this.userRepo = userRepo;
        this.objectMapper = objectMapper;
        this.policyService = policyService;
        this.effectiveResolver = effectiveResolver;
    }

    @Transactional(readOnly = true)
    public SettingsDtos.SettingsResponse get(UUID userId) {
        UserAccount user = resolveUser(userId);
        Map<String, Object> values = defaults(user.getRole());
        Optional<UserSettings> stored = settingsRepo.findByUserId(userId);
        stored.ifPresent(entity -> values.putAll(parse(entity.getSettingsJson())));
        
        AutomationPolicy policy = policyService.getOrCreate(userId);
        EffectiveAutomationPolicyResolver.EffectivePolicy eff = effectiveResolver.resolve(userId);
        SettingsDtos.EffectiveTimingSummary timing = null;
        Boolean demoModeEnabled = null;
        if (policy != null && eff != null) {
            demoModeEnabled = policy.isDemoModeEnabled();
            timing = new SettingsDtos.EffectiveTimingSummary(
                    eff.candidatePollIntervalSeconds(),
                    eff.firstSuggestionDelaySeconds(),
                    eff.subsequentSpacingSeconds(),
                    eff.notificationCooldownHours()
            );
        }

        return new SettingsDtos.SettingsResponse(user.getRole().name(), values,
                stored.map(UserSettings::getUpdatedAt).orElse(null), demoModeEnabled, timing);
    }

    @Transactional
    public SettingsDtos.SettingsResponse update(UUID userId, SettingsDtos.UpdateSettingsRequest request) {
        UserAccount user = resolveUser(userId);
        Set<String> allowed = allowedKeys(user.getRole());
        Map<String, Object> current = defaults(user.getRole());
        UserSettings entity = settingsRepo.findByUserId(userId).orElse(new UserSettings(user));
        current.putAll(parse(entity.getSettingsJson()));
        request.values().forEach((key, value) -> {
            if (!allowed.contains(key)) throw AppException.badRequest("Unsupported setting for role: " + key);
            current.put(key, validate(key, value));
        });
        try {
            entity.setSettingsJson(objectMapper.writeValueAsString(current));
        } catch (Exception e) {
            throw AppException.badRequest("Settings payload could not be serialized");
        }
        entity = settingsRepo.save(entity);

        if (request.demoModeEnabled() != null && user.getRole() != UserAccount.Role.ADMIN) {
            AutomationPolicyService.PolicyUpdateRequest policyReq = new AutomationPolicyService.PolicyUpdateRequest(
                    request.demoModeEnabled(), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
            );
            policyService.update(userId, policyReq);
        }

        AutomationPolicy policy = policyService.getOrCreate(userId);
        EffectiveAutomationPolicyResolver.EffectivePolicy eff = effectiveResolver.resolve(userId);
        SettingsDtos.EffectiveTimingSummary timing = null;
        Boolean demoModeEnabled = null;
        if (policy != null && eff != null) {
            demoModeEnabled = policy.isDemoModeEnabled();
            timing = new SettingsDtos.EffectiveTimingSummary(
                    eff.candidatePollIntervalSeconds(),
                    eff.firstSuggestionDelaySeconds(),
                    eff.subsequentSpacingSeconds(),
                    eff.notificationCooldownHours()
            );
        }

        return new SettingsDtos.SettingsResponse(user.getRole().name(), current, entity.getUpdatedAt(), demoModeEnabled, timing);
    }

    private Object validate(String key, Object value) {
        if (value == null) throw AppException.badRequest("Setting cannot be null: " + key);
        if (Set.of("alertThreshold", "sessionTimeoutDays", "candidateReviewSlaHours").contains(key)) {
            if (!(value instanceof Number number)) throw AppException.badRequest(key + " must be a number");
            int parsed = number.intValue();
            int max = key.equals("alertThreshold") ? 100 : key.equals("sessionTimeoutDays") ? 90 : 168;
            if (parsed < 0 || parsed > max) throw AppException.badRequest(key + " is out of range");
            return parsed;
        }
        if (Set.of("digestTime", "defaultWorkingModel", "defaultSalaryMode", "defaultLanguage").contains(key)) {
            String parsed = String.valueOf(value).trim();
            if (parsed.isEmpty() || parsed.length() > 50) throw AppException.badRequest(key + " is invalid");
            if (key.equals("digestTime") && !parsed.matches("(?:[01]\\d|2[0-3]):[0-5]\\d")) {
                throw AppException.badRequest("digestTime must use HH:mm");
            }
            return parsed;
        }
        if (!(value instanceof Boolean)) throw AppException.badRequest(key + " must be true or false");
        return value;
    }

    private UserAccount resolveUser(UUID userId) {
        return userRepo.findById(userId).orElseThrow(() -> AppException.notFound("User", userId));
    }

    private Set<String> allowedKeys(UserAccount.Role role) {
        return switch (role) {
            case CANDIDATE -> CANDIDATE_KEYS;
            case RECRUITER -> RECRUITER_KEYS;
            case ADMIN -> Set.of();
        };
    }

    private Map<String, Object> defaults(UserAccount.Role role) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (role == UserAccount.Role.CANDIDATE) {
            result.put("highMatchEmail", true); result.put("dailyDigest", true);
            result.put("recruiterInviteAlerts", true); result.put("alertThreshold", 90);
            result.put("digestTime", "08:00"); result.put("showPortfolioAfterApply", true);
            result.put("allowPotentialDiscovery", false); result.put("hidePhoneUntilInvite", true);
            result.put("sessionTimeoutDays", 30);
        } else if (role == UserAccount.Role.RECRUITER) {
            result.put("hiringManagerReview", true); result.put("sharedCandidateNotes", true);
            result.put("restrictSalaryVisibility", false); result.put("defaultWorkingModel", "HYBRID");
            result.put("defaultSalaryMode", "RANGE"); result.put("candidateReviewSlaHours", 48);
            result.put("defaultLanguage", "BILINGUAL"); result.put("highMatchCvAlert", true);
            result.put("dailyApprovalDigest", true); result.put("jobClosingReminders", true);
        }
        return result;
    }

    private Map<String, Object> parse(String json) {
        if (json == null || json.isBlank()) return new LinkedHashMap<>();
        try { return new LinkedHashMap<>(objectMapper.readValue(json, MAP_TYPE)); }
        catch (Exception e) { return new LinkedHashMap<>(); }
    }
}
