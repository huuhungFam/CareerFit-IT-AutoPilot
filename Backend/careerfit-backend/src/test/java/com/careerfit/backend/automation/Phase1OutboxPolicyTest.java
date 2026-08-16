package com.careerfit.backend.automation;

import com.careerfit.backend.BaseIntegrationTest;
import com.careerfit.backend.auth.dto.AuthDtos;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.auth.service.AuthService;
import com.careerfit.backend.automation.entity.AutomationPolicy;
import com.careerfit.backend.automation.repository.AutomationPolicyRepository;
import com.careerfit.backend.automation.service.AutomationPolicyService;
import com.careerfit.backend.automation.service.EffectiveAutomationPolicyResolver;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.notification.repository.NotificationOutboxRepository;
import com.careerfit.backend.notification.service.OutboxService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class Phase1OutboxPolicyTest extends BaseIntegrationTest {

    @Autowired private UserAccountRepository userRepo;
    @Autowired private AutomationPolicyRepository policyRepo;
    @Autowired private AutomationPolicyService policyService;
    @Autowired private EffectiveAutomationPolicyResolver effectiveResolver;
    @Autowired private AuthService authService;
    @Autowired private OutboxService outboxService;
    @Autowired private NotificationOutboxRepository outboxRepo;
    @Autowired private com.careerfit.backend.candidate.repository.CandidateRepository candidateRepo;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        outboxRepo.deleteAllInBatch();
    }

    @Test
    public void testRegistration_CreatesDemoModePolicy() {
        AuthDtos.RegisterRequest candReq = new AuthDtos.RegisterRequest(
            "reg.cand." + UUID.randomUUID() + "@test.com", "password", "Reg Cand", "CANDIDATE");
        authService.register(candReq);
        UserAccount candUser = userRepo.findByEmail(candReq.email()).orElseThrow();
        Optional<AutomationPolicy> candPolicy = policyRepo.findByUserId(candUser.getId());
        assertThat(candPolicy).isPresent();
        assertThat(candPolicy.get().isDemoModeEnabled()).isTrue();

        AuthDtos.RegisterRequest recrReq = new AuthDtos.RegisterRequest(
            "reg.recr." + UUID.randomUUID() + "@test.com", "password", "Reg Recr", "RECRUITER");
        authService.register(recrReq);
        UserAccount recrUser = userRepo.findByEmail(recrReq.email()).orElseThrow();
        Optional<AutomationPolicy> recrPolicy = policyRepo.findByUserId(recrUser.getId());
        assertThat(recrPolicy).isPresent();
        assertThat(recrPolicy.get().isDemoModeEnabled()).isTrue();
    }

    @Test
    @Transactional
    public void testLazyDefaults_AllScenarios() {
        UserAccount localCand = new UserAccount(UUID.randomUUID() + "@test.com", "hash", UserAccount.Role.CANDIDATE, "LC");
        localCand.setSource(UserAccount.AccountSource.LOCAL);
        userRepo.save(localCand);
        AutomationPolicy p1 = policyService.getOrCreate(localCand.getId());
        assertThat(policyRepo.findByUserId(localCand.getId())).isPresent();
        assertThat(p1.isDemoModeEnabled()).isTrue();

        UserAccount localRecr = new UserAccount(UUID.randomUUID() + "@test.com", "hash", UserAccount.Role.RECRUITER, "LR");
        localRecr.setSource(UserAccount.AccountSource.LOCAL);
        userRepo.save(localRecr);
        AutomationPolicy p2 = policyService.getOrCreate(localRecr.getId());
        assertThat(policyRepo.findByUserId(localRecr.getId())).isPresent();
        assertThat(p2.isDemoModeEnabled()).isTrue();

        UserAccount impUser = new UserAccount(UUID.randomUUID() + "@test.com", "hash", UserAccount.Role.RECRUITER, "IMP");
        impUser.setSource(UserAccount.AccountSource.IMPORTED);
        userRepo.save(impUser);
        AutomationPolicy p3 = policyService.getOrCreate(impUser.getId());
        assertThat(policyRepo.findByUserId(impUser.getId())).isPresent();
        assertThat(p3.isDemoModeEnabled()).isFalse();
        assertThat(p3.isEmailNotificationsEnabled()).isFalse();
        assertThat(p3.isAutoInviteEnabled()).isFalse();
    }

    @Test
    @Transactional
    public void testImportedInvariant_UpdateIgnored() {
        UserAccount impUser = new UserAccount(UUID.randomUUID() + "@test.com", "hash", UserAccount.Role.RECRUITER, "IMP2");
        impUser.setSource(UserAccount.AccountSource.IMPORTED);
        userRepo.save(impUser);

        AutomationPolicy policy = policyService.getOrCreate(impUser.getId());
        
        // Deliberately set all outbound-related flags to TRUE in the DB to test the invariant overriding them
        policy.setDemoModeEnabled(true);
        policy.setEmailNotificationsEnabled(true);
        policy.setDigestEnabled(true);
        policy.setAutoApplyEnabled(true);
        policy.setAutoInviteEnabled(true);
        policy.setJobScanEnabled(true);
        policy.setHighMatchEmailEnabled(true);
        policy.setEmailActionEnabled(true);
        policy.setAutopilotEnabled(true);
        policyRepo.save(policy);

        // Call real service update with a valid request trying to set some to true
        AutomationPolicyService.PolicyUpdateRequest req = new AutomationPolicyService.PolicyUpdateRequest(
            true, true, true, 80.0, true, true, "DAILY", 90.0, true, true, 3, 24, false, 
            LocalTime.of(22, 0), LocalTime.of(6, 0), true, 10, null
        );
        policyService.update(impUser.getId(), req);

        AutomationPolicy stored = policyRepo.findByUserId(impUser.getId()).orElseThrow();
        assertThat(stored.isDemoModeEnabled()).isFalse();
        assertThat(stored.isEmailNotificationsEnabled()).isFalse();
        assertThat(stored.isDigestEnabled()).isFalse();
        assertThat(stored.isAutoApplyEnabled()).isFalse();
        assertThat(stored.isAutoInviteEnabled()).isFalse();
        assertThat(stored.isJobScanEnabled()).isFalse();
        assertThat(stored.isHighMatchEmailEnabled()).isFalse();
        assertThat(stored.isEmailActionEnabled()).isFalse();

        EffectiveAutomationPolicyResolver.EffectivePolicy eff = effectiveResolver.resolve(impUser.getId());
        assertThat(eff.emailNotificationsEnabled()).isFalse();
        assertThat(eff.digestEnabled()).isFalse();
        assertThat(eff.autoApplyEnabled()).isFalse();
        assertThat(eff.emailActionEnabled()).isFalse();
        assertThat(eff.autopilotEnabled()).isFalse();
    }

    @Test
    @Transactional
    public void testDemoToggle_BothDirections_PreservesNormalPreferences() {
        UserAccount user = new UserAccount(UUID.randomUUID() + "@test.com", "hash", UserAccount.Role.CANDIDATE, "Toggle");
        user.setSource(UserAccount.AccountSource.LOCAL);
        userRepo.save(user);

        // 1. Setup normal preferences
        AutomationPolicyService.PolicyUpdateRequest setupReq = new AutomationPolicyService.PolicyUpdateRequest(
            false, false, true, 75.0, false, false, "WEEKLY", 90.0, false, true, 3, 48, true, 
            LocalTime.of(23, 0), LocalTime.of(7, 0), true, 10, null
        );
        policyService.update(user.getId(), setupReq);

        // 2. Fetch and assert saved values
        AutomationPolicy stored1 = policyRepo.findByUserId(user.getId()).orElseThrow();
        assertThat(stored1.isDemoModeEnabled()).isFalse();
        assertThat(stored1.getNotificationCooldownHours()).isEqualTo(48);
        assertThat(stored1.isQuietHoursEnabled()).isTrue();
        assertThat(stored1.getQuietHoursStart()).isEqualTo(LocalTime.of(23, 0));
        assertThat(stored1.getQuietHoursEnd()).isEqualTo(LocalTime.of(7, 0));
        assertThat(stored1.isEmailNotificationsEnabled()).isFalse();
        assertThat(stored1.isNotifyPotential()).isTrue();
        assertThat(stored1.getDigestFrequency()).isEqualTo("WEEKLY");

        // 3. Construct Demo ON request with nulls
        AutomationPolicyService.PolicyUpdateRequest reqOn = new AutomationPolicyService.PolicyUpdateRequest(
            true, null, null, null, null, null, null, null, null, null, null, null, null, 
            null, null, null, null, null
        );
        policyService.update(user.getId(), reqOn);

        // 4. Assert preferences preserved, effective values changed
        AutomationPolicy stored2 = policyRepo.findByUserId(user.getId()).orElseThrow();
        assertThat(stored2.isDemoModeEnabled()).isTrue();
        assertThat(stored2.getNotificationCooldownHours()).isEqualTo(48);
        assertThat(stored2.isQuietHoursEnabled()).isTrue();
        assertThat(stored2.getQuietHoursStart()).isEqualTo(LocalTime.of(23, 0));
        assertThat(stored2.getQuietHoursEnd()).isEqualTo(LocalTime.of(7, 0));
        assertThat(stored2.isEmailNotificationsEnabled()).isFalse();
        assertThat(stored2.isNotifyPotential()).isTrue();
        assertThat(stored2.getDigestFrequency()).isEqualTo("WEEKLY");

        EffectiveAutomationPolicyResolver.EffectivePolicy effOn = effectiveResolver.resolve(user.getId());
        assertThat(effOn.candidatePollIntervalSeconds()).isEqualTo(5);
        assertThat(effOn.firstSuggestionDelaySeconds()).isEqualTo(12);
        assertThat(effOn.subsequentSpacingSeconds()).isEqualTo(30);
        assertThat(effOn.recoveryCadenceSeconds()).isEqualTo(30);
        assertThat(effOn.notificationCooldownHours()).isEqualTo(0);
        assertThat(effOn.quietHoursEnabled()).isFalse();

        // 5. Construct Demo OFF request with nulls
        AutomationPolicyService.PolicyUpdateRequest reqOff = new AutomationPolicyService.PolicyUpdateRequest(
            false, null, null, null, null, null, null, null, null, null, null, null, null, 
            null, null, null, null, null
        );
        policyService.update(user.getId(), reqOff);

        // 6. Assert preferences preserved, normal effective values restored
        AutomationPolicy stored3 = policyRepo.findByUserId(user.getId()).orElseThrow();
        assertThat(stored3.isDemoModeEnabled()).isFalse();
        assertThat(stored3.getNotificationCooldownHours()).isEqualTo(48);
        assertThat(stored3.isQuietHoursEnabled()).isTrue();
        assertThat(stored3.getQuietHoursStart()).isEqualTo(LocalTime.of(23, 0));
        assertThat(stored3.getQuietHoursEnd()).isEqualTo(LocalTime.of(7, 0));
        assertThat(stored3.isEmailNotificationsEnabled()).isFalse();
        assertThat(stored3.isNotifyPotential()).isTrue();
        assertThat(stored3.getDigestFrequency()).isEqualTo("WEEKLY");

        EffectiveAutomationPolicyResolver.EffectivePolicy effOff = effectiveResolver.resolve(user.getId());
        assertThat(effOff.candidatePollIntervalSeconds()).isEqualTo(300);
        assertThat(effOff.firstSuggestionDelaySeconds()).isEqualTo(0);
        assertThat(effOff.subsequentSpacingSeconds()).isEqualTo(3600);
        assertThat(effOff.recoveryCadenceSeconds()).isEqualTo(3600);
        assertThat(effOff.notificationCooldownHours()).isEqualTo(48);
        assertThat(effOff.quietHoursEnabled()).isTrue();
        assertThat(effOff.emailNotificationsEnabled()).isFalse();
    }

    @Test
    @Transactional
    public void testExactPolicyBehavior_AdminUnaffected() {
        UserAccount admin = new UserAccount(UUID.randomUUID() + "@test.com", "hash", UserAccount.Role.ADMIN, "Admin");
        userRepo.save(admin);
        
        EffectiveAutomationPolicyResolver.EffectivePolicy effAdmin = effectiveResolver.resolve(admin.getId());
        assertThat(effAdmin).isNull();
    }

    @Test
    public void testRegistrationRollback() {
        AuthDtos.RegisterRequest badReq = new AuthDtos.RegisterRequest("bad@test.com", "password", "Name", "INVALID");
        assertThatThrownBy(() -> authService.register(badReq))
            .isInstanceOf(AppException.class)
            .hasMessageContaining("Invalid role");

        long initialUserCount = userRepo.count();
        long initialPolicyCount = policyRepo.count();
        long initialCandidateCount = candidateRepo.count();

        String tooLongName = "A".repeat(300);
        String testEmail = "toolong." + UUID.randomUUID() + "@test.com";
        AuthDtos.RegisterRequest failReq = new AuthDtos.RegisterRequest(testEmail, "password", tooLongName, "CANDIDATE");
        
        assertThatThrownBy(() -> authService.register(failReq))
            .isExactlyInstanceOf(DataIntegrityViolationException.class);

        assertThat(userRepo.findByEmail(testEmail)).isEmpty();
        
        Integer policyCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM automation_policy ap LEFT JOIN user_account u ON ap.user_id = u.id WHERE u.id IS NULL", 
            Integer.class
        );
        assertThat(policyCount).isEqualTo(0);

        // Prove via injected CandidateRepository directly (not just counts) that no candidate leaked
        long candidateOrphansFromRepo = candidateRepo.findAll().stream()
            .filter(c -> !userRepo.existsById(c.getUser().getId()))
            .count();
        assertThat(candidateOrphansFromRepo).isEqualTo(0);

        assertThat(userRepo.count()).isEqualTo(initialUserCount);
        assertThat(policyRepo.count()).isEqualTo(initialPolicyCount);
        assertThat(candidateRepo.count()).isEqualTo(initialCandidateCount);
    }

    @Test
    @Transactional
    public void testOutboxIdentity() {
        UserAccount cand = new UserAccount(UUID.randomUUID() + "@test.com", "hash", UserAccount.Role.CANDIDATE, "C1");
        userRepo.save(cand);

        UUID matchingId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        Instant now = Instant.now();

        outboxService.enqueue(cand.getId(), "TYPE1", matchingId, jobId, now);
        var res1 = outboxRepo.findAll().stream().filter(o -> o.getRecipient().getId().equals(cand.getId())).toList();
        assertThat(res1).hasSize(1);
        assertThat(res1.get(0).getTargetType()).isEqualTo("MATCHING");
        assertThat(res1.get(0).getTargetKey()).isEqualTo(matchingId.toString());

        outboxService.enqueue(cand.getId(), "TYPE2", null, jobId, now);
        var res2 = outboxRepo.findAll().stream().filter(o -> o.getRecipient().getId().equals(cand.getId())).toList();
        assertThat(res2).hasSize(2);
        assertThat(res2.stream().filter(r -> r.getEmailType().equals("TYPE2")).findFirst().get().getTargetType()).isEqualTo("JOB");

        assertThatThrownBy(() -> outboxService.enqueue(cand.getId(), "TYPE3", null, null, now))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @Transactional
    public void testOutboxDuplicateMatrix() {
        UserAccount cand1 = new UserAccount(UUID.randomUUID() + "@test.com", "hash", UserAccount.Role.CANDIDATE, "C1");
        UserAccount cand2 = new UserAccount(UUID.randomUUID() + "@test.com", "hash", UserAccount.Role.CANDIDATE, "C2");
        userRepo.save(cand1);
        userRepo.save(cand2);

        UUID m1 = UUID.randomUUID();
        UUID m2 = UUID.randomUUID();
        Instant now = Instant.now();

        boolean r1 = outboxService.enqueue(cand1.getId(), "TYPE1", m1, null, now);
        assertThat(r1).isTrue();

        boolean r2 = outboxService.enqueue(cand1.getId(), "TYPE1", m1, null, now);
        assertThat(r2).isFalse();

        boolean r3 = outboxService.enqueue(cand2.getId(), "TYPE1", m1, null, now);
        assertThat(r3).isTrue();

        boolean r4 = outboxService.enqueue(cand1.getId(), "TYPE2", m1, null, now);
        assertThat(r4).isTrue();

        boolean r5 = outboxService.enqueue(cand1.getId(), "TYPE1", m2, null, now);
        assertThat(r5).isTrue();

        long c1Count = outboxRepo.findAll().stream().filter(o -> o.getRecipient().getId().equals(cand1.getId())).count();
        long c2Count = outboxRepo.findAll().stream().filter(o -> o.getRecipient().getId().equals(cand2.getId())).count();
        assertThat(c1Count + c2Count).isEqualTo(4);
    }

    @Test
    public void testOutboxConcurrency() throws Exception {
        UserAccount cand = new UserAccount(UUID.randomUUID() + "@test.com", "hash", UserAccount.Role.CANDIDATE, "Concur");
        userRepo.save(cand);

        UUID m1 = UUID.randomUUID();
        Instant now = Instant.now();
        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        List<Future<Boolean>> futures = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            futures.add(executor.submit(() -> {
                startLatch.await();
                return outboxService.enqueue(cand.getId(), "CONCUR_TYPE", m1, null, now);
            }));
        }

        startLatch.countDown();
        int successes = 0;
        
        try {
            for (Future<Boolean> f : futures) {
                Boolean res = f.get(5, TimeUnit.SECONDS);
                if (res != null && res) {
                    successes++;
                }
            }
        } finally {
            executor.shutdownNow();
        }

        assertThat(successes).isEqualTo(1);
        
        long count = outboxRepo.findAll().stream()
            .filter(o -> o.getRecipient().getId().equals(cand.getId()) && o.getEmailType().equals("CONCUR_TYPE"))
            .count();
        assertThat(count).isEqualTo(1);
    }
}
