package com.careerfit.backend;

import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.config.security.JwtService;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AccountDeletionIntegrationTest extends BaseIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private JwtService jwtService;
    @Autowired private UserAccountRepository userRepo;
    @Autowired private CandidateRepository candidateRepo;
    @Autowired private CVRepository cvRepo;
    @Autowired private JobRepository jobRepo;
    @Autowired private MatchingRepository matchingRepo;
    @Autowired private ApplicationRepository applicationRepo;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("""
                DELETE FROM user_account
                WHERE email IN ('delete-candidate@example.com', 'delete-recruiter@example.com', 'remaining-candidate@example.com')
                """);
    }

    @Test
    void candidateCanDeleteAccountAndRegisterAgainWithTheSameEmail() throws Exception {
        String email = "delete-candidate@example.com";
        String oldToken = register(email, "CANDIDATE");
        java.util.UUID originalUserId = userRepo.findByEmail(email).orElseThrow().getId();

        mockMvc.perform(delete("/api/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(oldToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.message").value("Account deleted successfully"));

        assertThat(userRepo.findByEmail(email)).isEmpty();
        assertThat(candidateRepo.findByUserId(originalUserId)).isEmpty();

        String newToken = register(email, "CANDIDATE");
        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(oldToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_ACCOUNT_MISMATCH"));
        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(newToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(email));
    }

    @Test
    void recruiterDeletionRemovesOwnedJobsAndTheirDependentApplications() throws Exception {
        UserAccount recruiter = saveUser("delete-recruiter@example.com", UserAccount.Role.RECRUITER);
        Job job = jobRepo.save(new Job(recruiter, "Delete me", "CareerFit", "Test job", Job.SalaryMode.NEGOTIABLE));

        UserAccount candidateUser = saveUser("remaining-candidate@example.com", UserAccount.Role.CANDIDATE);
        Candidate candidate = candidateRepo.save(new Candidate(candidateUser));
        CV cv = cvRepo.save(new CV(candidate, "candidate-cv", CV.CvSource.MANUAL));
        Matching matching = matchingRepo.save(new Matching(cv, job, new BigDecimal("0.80"), new BigDecimal("80.00"), Matching.MatchLabel.HIGH));
        Application application = applicationRepo.save(new Application(candidate, job, cv, matching, false));
        jdbcTemplate.update("""
                INSERT INTO notification_outbox
                    (id, recipient_user_id, email_type, target_type, target_key, scheduled_at, status, attempt_count, created_at, updated_at)
                VALUES (?, ?, 'HIGH_MATCH', 'MATCHING', ?, NOW(), 'PENDING', 0, NOW(), NOW())
                """, java.util.UUID.randomUUID(), candidateUser.getId(), matching.getId().toString());

        String recruiterToken = jwtService.generateToken(recruiter.getEmail(), recruiter.getRole().name(), recruiter.getId());
        mockMvc.perform(delete("/api/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(recruiterToken)))
                .andExpect(status().isOk());

        assertThat(userRepo.findById(recruiter.getId())).isEmpty();
        assertThat(jobRepo.findById(job.getId())).isEmpty();
        assertThat(matchingRepo.findById(matching.getId())).isEmpty();
        assertThat(applicationRepo.findById(application.getId())).isEmpty();
        assertThat(userRepo.findById(candidateUser.getId())).isPresent();
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM notification_outbox WHERE target_key = ?", Long.class, matching.getId().toString())).isZero();
    }

    private String register(String email, String role) throws Exception {
        String body = objectMapper.writeValueAsString(java.util.Map.of(
                "email", email,
                "password", "Password123!",
                "fullName", "Deletion Test",
                "role", role));
        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).at("/data/accessToken").asText();
    }

    private UserAccount saveUser(String email, UserAccount.Role role) {
        UserAccount user = new UserAccount(email, "hash", role, role.name());
        user.setActive(true);
        user.setEmailVerified(true);
        return userRepo.saveAndFlush(user);
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
