package com.careerfit.backend.job.service;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class JobDuplicateProtectionServiceTest {
    @Test
    void normalizationVariantsProduceTheSameExactFingerprint() {
        JobDuplicateProtectionService service = new JobDuplicateProtectionService(mock(JobRepository.class));
        Job canonical = job("MB Bank", "Senior Java Engineer", "Hà Nội", "FULL_TIME", "Build secure payment APIs with Java Spring.");
        Job alias = job("Military Commercial Joint Stock Bank", "  senior-java engineer  ", "Ha Noi", "full time", "Build secure payment APIs with Java Spring.");
        Job vietnameseAlias = job("Ngân Hàng TMCP Quân Đội", "Senior Java Engineer", "Ha Noi", "FULL_TIME", "Build secure payment APIs with Java Spring.");

        assertThat(service.fingerprint(alias)).isEqualTo(service.fingerprint(canonical));
        assertThat(service.fingerprint(vietnameseAlias)).isEqualTo(service.fingerprint(canonical));
    }

    @Test
    void exactDuplicateIsBlockedAtActivationButImportedBaselineRowsDoNotParticipate() {
        JobRepository repo = mock(JobRepository.class);
        JobDuplicateProtectionService service = new JobDuplicateProtectionService(repo);
        UserAccount recruiter = recruiter();
        Job original = job(recruiter, "MB Bank", "Senior Java Engineer", "Hanoi", "FULL_TIME", "Build payment APIs with Java Spring Security.");
        original.setDuplicateFingerprint(service.fingerprint(original));
        Job imported = job(recruiter, "MB Bank", "Senior Java Engineer", "Hanoi", "FULL_TIME", "Build payment APIs with Java Spring Security.");
        imported.setSourceType(Job.SourceType.IMPORTED);
        Job candidate = job(recruiter, "Ngân Hàng TMCP Quân Đội", "Senior Java Engineer", "Hà Nội", "FULL_TIME", "Build payment APIs with Java Spring Security.");

        when(repo.findByDuplicateFingerprint(service.fingerprint(candidate))).thenReturn(List.of(imported, original));

        assertThatThrownBy(() -> service.assertCanActivate(candidate, false))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("identical internal job");
    }

    @Test
    void anotherRecruiterIsNotBlockedByThisRecruitersInternalJob() {
        JobRepository repo = mock(JobRepository.class);
        JobDuplicateProtectionService service = new JobDuplicateProtectionService(repo);
        Job original = job(recruiter(), "MB Bank", "Senior Java Engineer", "Hanoi", "FULL_TIME", "Build payment APIs with Java Spring Security.");
        original.setDuplicateFingerprint(service.fingerprint(original));
        Job otherRecruiterCandidate = job(recruiter(), "MB Bank", "Senior Java Engineer", "Hanoi", "FULL_TIME", "Build payment APIs with Java Spring Security.");
        when(repo.findByDuplicateFingerprint(service.fingerprint(otherRecruiterCandidate))).thenReturn(List.of(original));
        when(repo.findBySourceType(Job.SourceType.INTERNAL)).thenReturn(List.of(original));

        service.assertCanActivate(otherRecruiterCandidate, false);
        assertThat(otherRecruiterCandidate.getDuplicateFingerprint()).isNotBlank();
    }

    @Test
    void nearDuplicateWarnsUntilExplicitlyConfirmedAndOverlappingJobsRemainAllowed() {
        JobRepository repo = mock(JobRepository.class);
        JobDuplicateProtectionService service = new JobDuplicateProtectionService(repo);
        UserAccount recruiter = recruiter();
        Job existing = job(recruiter, "CareerFit Labs", "Backend Java Engineer", "Can Tho", "FULL_TIME",
                "Java Spring Boot PostgreSQL APIs Docker Kubernetes cloud monitoring testing.");
        Job near = job(recruiter, "CareerFit Labs", "Java Backend Engineer", "Can Tho", "FULL_TIME",
                "Java Spring Boot PostgreSQL APIs Docker Kubernetes cloud monitoring tests.");
        when(repo.findByDuplicateFingerprint(anyString())).thenReturn(List.of());
        when(repo.findBySourceType(Job.SourceType.INTERNAL)).thenReturn(List.of(existing));

        assertThatThrownBy(() -> service.assertCanActivate(near, false))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("confirmNearDuplicate=true");
        service.assertCanActivate(near, true);
        assertThat(near.getDuplicateFingerprint()).isNotBlank();

        Job transferable = job(recruiter, "CareerFit Labs", "Cloud Platform Engineer", "Can Tho", "FULL_TIME",
                "Terraform AWS networking incident response observability Linux operations.");
        service.assertCanActivate(transferable, false);
        assertThat(transferable.getDuplicateFingerprint()).isNotBlank();
    }

    private static Job job(String company, String title, String location, String employment, String description) {
        return job(recruiter(), company, title, location, employment, description);
    }

    private static Job job(UserAccount recruiter, String company, String title, String location, String employment, String description) {
        Job job = new Job(recruiter, title, company, description, Job.SalaryMode.NEGOTIABLE);
        job.setLocation(location);
        job.setEmploymentType(employment);
        job.setSourceType(Job.SourceType.INTERNAL);
        ReflectionTestUtils.setField(job, "id", UUID.randomUUID());
        return job;
    }

    private static UserAccount recruiter() {
        UserAccount recruiter = new UserAccount(UUID.randomUUID() + "@example.test", "hash", UserAccount.Role.RECRUITER, "Recruiter");
        ReflectionTestUtils.setField(recruiter, "id", UUID.randomUUID());
        return recruiter;
    }
}
