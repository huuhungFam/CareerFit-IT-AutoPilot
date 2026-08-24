package com.careerfit.backend;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.entity.CandidateSavedJob;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.candidate.repository.CandidateSavedJobRepository;
import com.careerfit.backend.common.util.StorageService;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.cv.service.PdfExtractionService;
import com.careerfit.backend.employer.entity.EmployerProfile;
import com.careerfit.backend.employer.repository.EmployerProfileRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.feedback.entity.Feedback;
import com.careerfit.backend.feedback.repository.FeedbackRepository;
import com.careerfit.backend.settings.repository.UserSettingsRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.careerfit.backend.config.security.JwtService;
import org.springframework.http.HttpHeaders;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
public class Phase2SettingsCatalogCvIntegrationTest extends BaseIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;

    private String getToken(UserAccount user) {
        return "Bearer " + jwtService.generateToken(user.getEmail(), user.getRole().name(), user.getId());
    }
    @Autowired private UserAccountRepository userRepo;
    @Autowired private CandidateRepository candidateRepo;
    @Autowired private EmployerProfileRepository employerRepo;
    @Autowired private JobRepository jobRepo;
    @Autowired private CVRepository cvRepo;
    @Autowired private MatchingRepository matchingRepo;
    @Autowired private CandidateSavedJobRepository savedJobRepo;
    @Autowired private ApplicationRepository applicationRepo;
    @Autowired private FeedbackRepository feedbackRepo;
    @Autowired private UserSettingsRepository settingsRepo;
    @Autowired private JdbcTemplate jdbcTemplate;

    @MockBean private PdfExtractionService pdfService;
    @MockBean private StorageService storageService;

    @BeforeEach
    void setup() {
                jdbcTemplate.execute("TRUNCATE TABLE user_account CASCADE;");
    }

    private UserAccount createAccount(UserAccount.Role role) {
        UserAccount acc = new UserAccount(UUID.randomUUID() + "@test.com", "hash", role, role.name() + " User");
        acc.setActive(true);
        acc.setEmailVerified(true);
        return userRepo.save(acc);
    }

    private CV waitForStatus(UUID cvId, CV.CvStatus expected) throws InterruptedException {
        for (int attempt = 0; attempt < 50; attempt++) {
            CV current = cvRepo.findById(cvId).orElseThrow();
            if (current.getStatus() == expected) return current;
            Thread.sleep(100);
        }
        return cvRepo.findById(cvId).orElseThrow();
    }

    @Test
    void testSettingsContractAndDemoToggle() throws Exception {
        UserAccount cand = createAccount(UserAccount.Role.CANDIDATE);
        
        mockMvc.perform(get("/api/settings/me").header(HttpHeaders.AUTHORIZATION, getToken(cand)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.demoModeEnabled").value(true))
                .andExpect(jsonPath("$.data.effectiveTiming.candidatePollIntervalSeconds").value(5)); 

        mockMvc.perform(patch("/api/settings/me")
                        .header(HttpHeaders.AUTHORIZATION, getToken(cand))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"demoModeEnabled\": false, \"values\": {}}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/settings/me").header(HttpHeaders.AUTHORIZATION, getToken(cand)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.demoModeEnabled").value(false))
                .andExpect(jsonPath("$.data.effectiveTiming.candidatePollIntervalSeconds").value(300));

        UserAccount admin = createAccount(UserAccount.Role.ADMIN);
        mockMvc.perform(patch("/api/settings/me")
                        .header(HttpHeaders.AUTHORIZATION, getToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"demoModeEnabled\": true, \"values\": {}}"))
                .andExpect(status().isOk()); 
                
        mockMvc.perform(get("/api/settings/me").header(HttpHeaders.AUTHORIZATION, getToken(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.demoModeEnabled").doesNotExist());
    }

    @Test
    void testActiveCatalogBehaviors() throws Exception {
        UserAccount rec = createAccount(UserAccount.Role.RECRUITER);
        EmployerProfile emp = new EmployerProfile(rec, "Tech Corp", "tech-corp");
        employerRepo.save(emp);
        
        Job job = new Job(rec, "Java Dev", emp.getCompanyName(), "Need Java", Job.SalaryMode.NEGOTIABLE);
        job.setLanguage("vi");
        job.setSalaryMode(Job.SalaryMode.NEGOTIABLE);
        job.setStatus(Job.JobStatus.ACTIVE);
        job = jobRepo.save(job);

        UserAccount candAcc = createAccount(UserAccount.Role.CANDIDATE);
        Candidate cand = new Candidate(candAcc);
        cand.setDesiredTitle("Java");
        cand.setLocation("HN");
        cand.setYearsOfExperience(2);
        cand = candidateRepo.save(cand);

        mockMvc.perform(get("/api/recommendations/jobs").header(HttpHeaders.AUTHORIZATION, getToken(candAcc)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cvStatus").value("NO_CV"))
                .andExpect(jsonPath("$.data.jobs[0].jobId").value(job.getId().toString()))
                .andExpect(jsonPath("$.data.jobs[0].hasMatching").value(false))
                .andExpect(jsonPath("$.data.jobs[0].finalScore").doesNotExist());

        CV cv = new CV(cand, "test.pdf", CV.CvSource.UPLOAD);
        cv.setStatus(CV.CvStatus.SCORING_DONE);
        cv.setDefault(true);
        cvRepo.save(cv);

        mockMvc.perform(get("/api/recommendations/jobs").header(HttpHeaders.AUTHORIZATION, getToken(candAcc)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cvStatus").value("SCORING_DONE"))
                .andExpect(jsonPath("$.data.jobs[0].jobId").value(job.getId().toString()))
                .andExpect(jsonPath("$.data.jobs[0].hasMatching").value(false))
                .andExpect(jsonPath("$.data.jobs[0].finalScore").doesNotExist());

        Matching m = new Matching(cv, job, new BigDecimal("0.855"), new BigDecimal("85.50"), Matching.MatchLabel.HIGH);
        matchingRepo.save(m);

        mockMvc.perform(get("/api/recommendations/jobs").header(HttpHeaders.AUTHORIZATION, getToken(candAcc)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cvStatus").value("SCORING_DONE"))
                .andExpect(jsonPath("$.data.jobs[0].jobId").value(job.getId().toString()))
                .andExpect(jsonPath("$.data.jobs[0].hasMatching").value(true))
                .andExpect(jsonPath("$.data.jobs[0].finalScore").isNumber())
                .andExpect(jsonPath("$.data.jobs[0].matchLabel").value("HIGH"));
    }

    @Test
    void candidateCatalogBatchesPersonalizedStateAndSavedCards() throws Exception {
        UserAccount recruiter = createAccount(UserAccount.Role.RECRUITER);
        EmployerProfile employer = employerRepo.save(new EmployerProfile(recruiter, "Catalog Labs", "catalog-labs"));
        Job job = new Job(recruiter, "Catalog Backend Engineer", employer.getCompanyName(), "Build catalog APIs", Job.SalaryMode.NEGOTIABLE);
        job.setStatus(Job.JobStatus.ACTIVE);
        job.setRequiredSkillsJson("[\"Java\",\"Spring\"]");
        job = jobRepo.save(job);

        UserAccount candidateUser = createAccount(UserAccount.Role.CANDIDATE);
        Candidate candidate = candidateRepo.save(new Candidate(candidateUser));
        CV cv = new CV(candidate, "catalog-cv.pdf", CV.CvSource.MANUAL);
        cv.setDefault(true);
        cv.setStatus(CV.CvStatus.SCORING_DONE);
        cv = cvRepo.save(cv);
        Matching matching = new Matching(cv, job, new BigDecimal("0.915"), new BigDecimal("91.50"), Matching.MatchLabel.HIGH);
        matching.setPotential(true);
        matching.setMatchReasonsJson("[\"Java\",\"Spring\"]");
        matching = matchingRepo.save(matching);
        applicationRepo.save(new Application(candidate, job, cv, matching, false));
        savedJobRepo.save(new CandidateSavedJob(candidateUser, job));
        feedbackRepo.save(new Feedback(matching, candidateUser, Feedback.ActorRole.CANDIDATE,
                Feedback.FeedbackType.GOOD_MATCH, Feedback.SourceChannel.WEB));

        mockMvc.perform(get("/api/candidates/me/job-catalog")
                        .param("keyword", "Catalog Backend")
                        .param("minScore", "80")
                        .param("sort", "popular")
                        .header(HttpHeaders.AUTHORIZATION, getToken(candidateUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.jobs[0].id").value(job.getId().toString()))
                .andExpect(jsonPath("$.data.jobs[0].matchScore").value(91.5))
                .andExpect(jsonPath("$.data.jobs[0].matchLabel").value("HIGH"))
                .andExpect(jsonPath("$.data.jobs[0].isPotential").value(true))
                .andExpect(jsonPath("$.data.jobs[0].isSaved").value(true))
                .andExpect(jsonPath("$.data.jobs[0].applicationStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.jobs[0].feedbackStatus").value("GOOD_MATCH"));

        mockMvc.perform(get("/api/candidates/me/job-catalog")
                        .param("keyword", "Catalog Backend")
                        .header(HttpHeaders.AUTHORIZATION, getToken(candidateUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.jobs[0].matchScore").value(91.5));

        mockMvc.perform(get("/api/candidates/me/saved-jobs/cards")
                        .header(HttpHeaders.AUTHORIZATION, getToken(candidateUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.jobs[0].id").value(job.getId().toString()))
                .andExpect(jsonPath("$.data.jobs[0].isSaved").value(true));
    }

    @Test
    void testCvPipelineTerminalStatesAndRetryAuthorization() throws Exception {
        UserAccount candAcc = createAccount(UserAccount.Role.CANDIDATE);
        Candidate cand = new Candidate(candAcc);
        cand.setDesiredTitle("Java");
        cand.setLocation("HN");
        cand.setYearsOfExperience(2);
        cand = candidateRepo.save(cand);

        when(storageService.store(any(), any())).thenReturn("test/cv.pdf");
        when(storageService.resolve(any())).thenReturn(new java.io.File("test/cv.pdf"));
        when(pdfService.extractFromFile(any())).thenReturn(new PdfExtractionService.ExtractionResult("Java Spring Boot developer", 1, false));
        var successfulUpload = mockMvc.perform(multipart("/api/cv/upload")
                .file("file", "dummy pdf content".getBytes())
                .header(HttpHeaders.AUTHORIZATION, getToken(candAcc)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.status").value("REVIEW_REQUIRED"))
                .andReturn();
        UUID successfulCvId = UUID.fromString(new ObjectMapper().readTree(successfulUpload.getResponse().getContentAsString()).at("/data/id").asText());
        mockMvc.perform(post("/api/cv/" + successfulCvId + "/confirm")
                        .header(HttpHeaders.AUTHORIZATION, getToken(candAcc)))
                .andExpect(status().isOk());
        assertThat(waitForStatus(successfulCvId, CV.CvStatus.SCORING_DONE).getStatus()).isEqualTo(CV.CvStatus.SCORING_DONE);

        doThrow(new RuntimeException("Bad PDF")).when(pdfService).extractFromFile(any());
        var failedUpload = mockMvc.perform(multipart("/api/cv/upload")
                        .file("file", "bad pdf content".getBytes())
                        .header(HttpHeaders.AUTHORIZATION, getToken(candAcc)))
                .andExpect(status().isAccepted())
                .andReturn();
        UUID failedCvId = UUID.fromString(new ObjectMapper().readTree(failedUpload.getResponse().getContentAsString()).at("/data/id").asText());
        CV failedCv = waitForStatus(failedCvId, CV.CvStatus.FAILED);
        assertThat(failedCv.getFailureReason()).contains("Bad PDF");

        UserAccount otherAcc = createAccount(UserAccount.Role.CANDIDATE);
        Candidate otherCand = new Candidate(otherAcc);
        otherCand.setDesiredTitle("C++");
        otherCand.setLocation("SG");
        otherCand.setYearsOfExperience(1);
        candidateRepo.save(otherCand);
        
        mockMvc.perform(post("/api/cv/" + failedCv.getId() + "/retry").header(HttpHeaders.AUTHORIZATION, getToken(otherAcc)))
                .andExpect(status().isForbidden());

        doReturn(new PdfExtractionService.ExtractionResult("Recovered Java CV", 1, false)).when(pdfService).extractFromFile(any());
        mockMvc.perform(post("/api/cv/" + failedCv.getId() + "/retry").header(HttpHeaders.AUTHORIZATION, getToken(candAcc)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/cv/" + failedCv.getId() + "/confirm")
                        .header(HttpHeaders.AUTHORIZATION, getToken(candAcc)))
                .andExpect(status().isOk());
        assertThat(waitForStatus(failedCv.getId(), CV.CvStatus.SCORING_DONE).getStatus()).isEqualTo(CV.CvStatus.SCORING_DONE);

    }
}
