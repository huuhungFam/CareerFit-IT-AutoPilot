package com.careerfit.backend;

import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.auth.dto.AuthDtos;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.auth.service.AuthService;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.config.AppProperties;
import com.careerfit.backend.config.security.JwtService;
import com.careerfit.backend.notification.service.IMailService;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

class AuthServiceTest {

    @Test
    void publicRegistrationCannotCreateAdminAccount() {
        UserAccountRepository userRepo = mock(UserAccountRepository.class);
        when(userRepo.existsByEmail("attacker@example.com")).thenReturn(false);
        CandidateRepository candidateRepo = mock(CandidateRepository.class);
        AuthService service = new AuthService(
                userRepo,
                candidateRepo,
                mock(AuditLogRepository.class),
                mock(PasswordEncoder.class),
                mock(JwtService.class),
                mock(AppProperties.class),
                mock(IMailService.class),
                mock(com.careerfit.backend.automation.service.AutomationPolicyService.class),
                mock(com.careerfit.backend.auth.service.AccountDeletionService.class));

        var request = new AuthDtos.RegisterRequest(
                "attacker@example.com", "strong-password", "Attacker", "ADMIN");

        assertThatThrownBy(() -> service.register(request))
                .isInstanceOf(AppException.class)
                .satisfies(error -> {
                    AppException appError = (AppException) error;
                    assertThat(appError.getCode()).isEqualTo("BAD_REQUEST");
                    assertThat(appError.getMessage()).contains("CANDIDATE or RECRUITER");
                });
        verify(userRepo, never()).save(any());
        verify(candidateRepo, never()).save(any());
    }
}
