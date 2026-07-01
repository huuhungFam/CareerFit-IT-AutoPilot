package com.careerfit.backend;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.settings.dto.SettingsDtos;
import com.careerfit.backend.settings.entity.UserSettings;
import com.careerfit.backend.settings.repository.UserSettingsRepository;
import com.careerfit.backend.settings.service.SettingsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SettingsServiceTest {
    private final UUID userId = UUID.randomUUID();
    private UserSettingsRepository settingsRepo;
    private UserAccount user;
    private SettingsService service;

    @BeforeEach
    void setUp() {
        settingsRepo = mock(UserSettingsRepository.class);
        UserAccountRepository userRepo = mock(UserAccountRepository.class);
        user = mock(UserAccount.class);
        when(user.getRole()).thenReturn(UserAccount.Role.CANDIDATE);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(settingsRepo.findByUserId(userId)).thenReturn(Optional.empty());
        when(settingsRepo.save(any(UserSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));
        service = new SettingsService(settingsRepo, userRepo, new ObjectMapper());
    }

    @Test
    void returnsCandidateDefaults() {
        var result = service.get(userId);
        assertThat(result.role()).isEqualTo("CANDIDATE");
        assertThat(result.values()).containsEntry("alertThreshold", 90).containsEntry("dailyDigest", true);
    }

    @Test
    void rejectsSettingsOwnedByAnotherRole() {
        assertThatThrownBy(() -> service.update(userId,
                new SettingsDtos.UpdateSettingsRequest(Map.of("hiringManagerReview", true))))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Unsupported setting");
    }

    @Test
    void rejectsOutOfRangeThreshold() {
        assertThatThrownBy(() -> service.update(userId,
                new SettingsDtos.UpdateSettingsRequest(Map.of("alertThreshold", 101))))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("out of range");
    }

    @Test
    void mergesPersistedCandidateSettingsOverDefaults() {
        UserSettings stored = new UserSettings(user);
        stored.setSettingsJson("{\"dailyDigest\":false,\"alertThreshold\":75}");
        when(settingsRepo.findByUserId(userId)).thenReturn(Optional.of(stored));

        var result = service.get(userId);

        assertThat(result.values())
                .containsEntry("dailyDigest", false)
                .containsEntry("alertThreshold", 75)
                .containsEntry("highMatchEmail", true);
    }

    @Test
    void returnsRecruiterDefaultsWithoutCandidateKeys() {
        when(user.getRole()).thenReturn(UserAccount.Role.RECRUITER);

        var result = service.get(userId);

        assertThat(result.role()).isEqualTo("RECRUITER");
        assertThat(result.values()).containsEntry("candidateReviewSlaHours", 48);
        assertThat(result.values()).doesNotContainKey("alertThreshold");
    }

    @Test
    void rejectsInvalidDigestTimeAndBooleanType() {
        assertThatThrownBy(() -> service.update(userId,
                new SettingsDtos.UpdateSettingsRequest(Map.of("digestTime", "25:99"))))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("HH:mm");

        assertThatThrownBy(() -> service.update(userId,
                new SettingsDtos.UpdateSettingsRequest(Map.of("dailyDigest", "yes"))))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("true or false");
    }
}
