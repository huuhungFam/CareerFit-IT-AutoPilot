package com.careerfit.backend.job.service;

import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/** Deterministic, publish-time protection for newly created internal CareerFit jobs. */
@Service
public class JobDuplicateProtectionService {
    public static final double NEAR_DUPLICATE_THRESHOLD = 0.85d;

    private final JobRepository jobRepository;

    public JobDuplicateProtectionService(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    public void assertCanActivate(Job candidate, boolean confirmNearDuplicate) {
        if (!candidate.isInternalApplication()) return;
        String fingerprint = fingerprint(candidate);
        List<Job> exact = jobRepository.findByDuplicateFingerprint(fingerprint).stream()
                .filter(job -> !sameId(job, candidate))
                .filter(Job::isInternalApplication)
                .filter(job -> sameRecruiter(job, candidate))
                .toList();
        if (!exact.isEmpty()) {
            throw AppException.conflict("An identical internal job already exists (job " + exact.getFirst().getId() + ")");
        }

        List<NearDuplicate> near = findNearDuplicates(candidate);
        if (!near.isEmpty() && !confirmNearDuplicate) {
            NearDuplicate closest = near.getFirst();
            throw AppException.conflict("Potential duplicate (" + String.format(Locale.ROOT, "%.0f", closest.similarity() * 100)
                    + "% similar to job " + closest.jobId() + "). Confirm publish with confirmNearDuplicate=true.");
        }
        candidate.setDuplicateFingerprint(fingerprint);
    }

    public DuplicateCheck check(Job candidate) {
        String fingerprint = fingerprint(candidate);
        boolean exact = jobRepository.findByDuplicateFingerprint(fingerprint).stream()
                .anyMatch(job -> !sameId(job, candidate) && job.isInternalApplication() && sameRecruiter(job, candidate));
        return new DuplicateCheck(fingerprint, exact, findNearDuplicates(candidate));
    }

    public String fingerprint(Job job) {
        String descriptionHash = sha256(normalize(job.getOriginalText()));
        return sha256(String.join("|", canonicalCompany(job.getCompany()), normalize(job.getTitle()),
                normalize(job.getLocation()), normalize(job.getEmploymentType()), descriptionHash));
    }

    private List<NearDuplicate> findNearDuplicates(Job candidate) {
        String company = canonicalCompany(candidate.getCompany());
        return jobRepository.findBySourceType(Job.SourceType.INTERNAL).stream()
                .filter(job -> !sameId(job, candidate))
                .filter(job -> sameRecruiter(job, candidate))
                .filter(job -> canonicalCompany(job.getCompany()).equals(company))
                .map(job -> new NearDuplicate(job.getId().toString(), job.getTitle(), similarity(candidate, job)))
                .filter(match -> match.similarity() >= NEAR_DUPLICATE_THRESHOLD)
                .sorted(Comparator.comparing(NearDuplicate::similarity).reversed().thenComparing(NearDuplicate::jobId))
                .toList();
    }

    private double similarity(Job left, Job right) {
        double title = jaccard(normalize(left.getTitle()), normalize(right.getTitle()));
        double description = jaccard(normalize(left.getOriginalText()), normalize(right.getOriginalText()));
        double location = normalize(left.getLocation()).equals(normalize(right.getLocation())) ? 1d : 0d;
        double employment = normalize(left.getEmploymentType()).equals(normalize(right.getEmploymentType())) ? 1d : 0d;
        return (0.40d * title) + (0.40d * description) + (0.10d * location) + (0.10d * employment);
    }

    private double jaccard(String left, String right) {
        var a = new java.util.HashSet<>(List.of(left.split(" ")));
        var b = new java.util.HashSet<>(List.of(right.split(" ")));
        a.remove(""); b.remove("");
        if (a.isEmpty() || b.isEmpty()) return a.equals(b) ? 1d : 0d;
        var intersection = new java.util.HashSet<>(a); intersection.retainAll(b);
        var union = new java.util.HashSet<>(a); union.addAll(b);
        return (double) intersection.size() / union.size();
    }

    private boolean sameId(Job left, Job right) {
        return left.getId() != null && left.getId().equals(right.getId());
    }

    private boolean sameRecruiter(Job left, Job right) {
        return left.getRecruiter() != null && right.getRecruiter() != null
                && left.getRecruiter().getId() != null
                && left.getRecruiter().getId().equals(right.getRecruiter().getId());
    }

    private String canonicalCompany(String value) {
        String normalized = normalize(value);
        return switch (normalized) {
            case "ngan hang tmcp quan doi", "military commercial joint stock bank", "mb bank" -> "mb bank";
            case "ngan hang tmcp tien phong tpbank", "ngan hang tmcp tien phong", "tpbank" -> "tpbank";
            default -> normalized;
        };
    }

    private String normalize(String value) {
        if (value == null) return "";
        String decomposed = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replace('đ', 'd').replace('Đ', 'D').replaceAll("\\p{M}", "");
        return decomposed.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim().replaceAll("\\s+", " ");
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to fingerprint job", e);
        }
    }

    public record NearDuplicate(String jobId, String title, double similarity) {}
    public record DuplicateCheck(String fingerprint, boolean exactDuplicate, List<NearDuplicate> nearDuplicates) {}
}
