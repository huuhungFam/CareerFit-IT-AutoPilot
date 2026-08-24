package com.careerfit.backend.application.service;

import com.careerfit.backend.application.dto.ApplicationDtos;
import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.application.entity.RecruiterCvBookmark;
import com.careerfit.backend.application.repository.ApplicationRepository;
import com.careerfit.backend.application.repository.RecruiterCvBookmarkRepository;
import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.candidate.entity.Candidate;
import com.careerfit.backend.candidate.repository.CandidateRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.cv.repository.CVRepository;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.job.repository.JobRepository;
import com.careerfit.backend.matching.dto.MatchingDtos;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.matching.service.MatchingQueryService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class RecruiterTalentService {

    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};

    private final RecruiterCvBookmarkRepository bookmarkRepo;
    private final ApplicationRepository applicationRepo;
    private final JobRepository jobRepo;
    private final CandidateRepository candidateRepo;
    private final CVRepository cvRepo;
    private final MatchingRepository matchingRepo;
    private final MatchingQueryService matchingQueryService;
    private final AuditLogRepository auditRepo;
    private final ObjectMapper objectMapper;

    public RecruiterTalentService(RecruiterCvBookmarkRepository bookmarkRepo,
                                  ApplicationRepository applicationRepo,
                                  JobRepository jobRepo,
                                  CandidateRepository candidateRepo,
                                  CVRepository cvRepo,
                                  MatchingRepository matchingRepo,
                                  MatchingQueryService matchingQueryService,
                                  AuditLogRepository auditRepo,
                                  ObjectMapper objectMapper) {
        this.bookmarkRepo = bookmarkRepo;
        this.applicationRepo = applicationRepo;
        this.jobRepo = jobRepo;
        this.candidateRepo = candidateRepo;
        this.cvRepo = cvRepo;
        this.matchingRepo = matchingRepo;
        this.matchingQueryService = matchingQueryService;
        this.auditRepo = auditRepo;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public ApplicationDtos.TalentPoolPageResponse getTalentPool(UUID jobId, UUID recruiterId,
                                                                  String group, String candidateQuery,
                                                                  double minScore, String sort,
                                                                  int page, int size) {
        Job job = requireOwnedJob(jobId, recruiterId);
        String normalizedGroup = group == null ? "high" : group.trim().toLowerCase();
        String label = "high".equals(normalizedGroup) ? "HIGH" : null;
        Boolean potentialOnly = "potential".equals(normalizedGroup) ? Boolean.TRUE : null;
        boolean potentialExcludingHigh = "potential".equals(normalizedGroup);
        if (!"high".equals(normalizedGroup) && !"potential".equals(normalizedGroup) && !"all".equals(normalizedGroup)) {
            throw AppException.badRequest("Unsupported Talent Pool group: " + group);
        }

        MatchingDtos.RecruiterCandidateDiscoveryPageResponse discovery = matchingQueryService.discoverCandidates(
                jobId, recruiterId, label, potentialOnly, potentialExcludingHigh, null, minScore, sort, page, size, candidateQuery);
        Map<UUID, RecruiterCvBookmark> bookmarks = bookmarksByCandidate(jobId);
        Map<UUID, Application> applications = visibleApplicationsByCandidate(jobId);
        List<ApplicationDtos.TalentCandidateCardResponse> candidates = discovery.candidates().stream()
                .map(candidate -> toDiscoveryCard(candidate, bookmarks.get(candidate.candidateId()),
                        applications.get(candidate.candidateId())))
                .toList();
        return new ApplicationDtos.TalentPoolPageResponse(job.getId(), job.getTitle(), candidates,
                discovery.total(), discovery.page(), discovery.size(), discovery.totalPages());
    }

    @Transactional(readOnly = true)
    public List<ApplicationDtos.TalentCandidateCardResponse> listBookmarks(UUID jobId, UUID recruiterId) {
        requireOwnedJob(jobId, recruiterId);
        List<RecruiterCvBookmark> bookmarks = bookmarkRepo.findByJobIdOrderByCreatedAtDesc(jobId).stream()
                .filter(item -> item.getCv().getStatus() != CV.CvStatus.BANNED)
                .toList();
        if (bookmarks.isEmpty()) return List.of();

        Map<UUID, Matching> matchesByCv = matchingRepo.findByJobIdAndCvIdIn(jobId,
                        bookmarks.stream().map(item -> item.getCv().getId()).toList())
                .stream().collect(Collectors.toMap(match -> match.getCv().getId(), Function.identity(), (left, right) -> left));
        Map<UUID, Application> applications = visibleApplicationsByCandidate(jobId);
        return bookmarks.stream().map(bookmark -> toBookmarkCard(bookmark,
                matchesByCv.get(bookmark.getCv().getId()), applications.get(bookmark.getCandidate().getId()))).toList();
    }

    @Transactional(readOnly = true)
    public List<ApplicationDtos.TalentCandidateCardResponse> listInvitations(UUID jobId, UUID recruiterId) {
        requireOwnedJob(jobId, recruiterId);
        Map<UUID, RecruiterCvBookmark> bookmarks = bookmarksByCandidate(jobId);
        return applicationRepo.findInvitationHistoryByJobId(jobId).stream()
                .map(application -> toApplicationCard(application, bookmarks.get(application.getCandidate().getId())))
                .toList();
    }

    @Transactional
    public ApplicationDtos.TalentCandidateCardResponse bookmark(UUID jobId, UUID candidateId, UUID recruiterId) {
        Job job = requireOwnedJob(jobId, recruiterId);
        RecruiterCvBookmark existing = bookmarkRepo.findByJobIdAndCandidateId(jobId, candidateId).orElse(null);
        if (existing != null) {
            return toBookmarkCard(existing, matchingRepo.findByCvIdAndJobId(existing.getCv().getId(), jobId).orElse(null),
                    visibleApplicationsByCandidate(jobId).get(candidateId));
        }

        Candidate candidate = candidateRepo.findById(candidateId)
                .orElseThrow(() -> AppException.notFound("Candidate", candidateId));
        CV cv = cvRepo.findByCandidateIdAndIsDefaultTrue(candidateId)
                .orElseThrow(() -> AppException.badRequest("Candidate has no default CV to bookmark"));
        if (cv.getStatus() == CV.CvStatus.BANNED) {
            throw AppException.badRequest("A banned CV cannot be bookmarked");
        }

        RecruiterCvBookmark saved;
        try {
            saved = bookmarkRepo.saveAndFlush(new RecruiterCvBookmark(job, candidate, cv));
        } catch (DataIntegrityViolationException conflict) {
            saved = bookmarkRepo.findByJobIdAndCandidateId(jobId, candidateId)
                    .orElseThrow(() -> AppException.conflict("CV bookmark conflicted with another write"));
        }

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, recruiterId, "RECRUITER_CV_BOOKMARKED")
                .withTarget("Candidate", candidateId)
                .withMetadata("{\"jobId\":\"" + jobId + "\"}")
                .withChannel(AuditLog.SourceChannel.WEB));
        return toBookmarkCard(saved, matchingRepo.findByCvIdAndJobId(cv.getId(), jobId).orElse(null),
                visibleApplicationsByCandidate(jobId).get(candidateId));
    }

    @Transactional
    public void removeBookmark(UUID jobId, UUID candidateId, UUID recruiterId) {
        requireOwnedJob(jobId, recruiterId);
        RecruiterCvBookmark bookmark = bookmarkRepo.findByJobIdAndCandidateId(jobId, candidateId)
                .orElseThrow(() -> AppException.notFound("CV bookmark", candidateId));
        bookmarkRepo.delete(bookmark);
        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, recruiterId, "RECRUITER_CV_BOOKMARK_REMOVED")
                .withTarget("Candidate", candidateId)
                .withMetadata("{\"jobId\":\"" + jobId + "\"}")
                .withChannel(AuditLog.SourceChannel.WEB));
    }

    private ApplicationDtos.TalentCandidateCardResponse toDiscoveryCard(
            MatchingDtos.RecruiterCandidateDiscoveryResponse candidate,
            RecruiterCvBookmark bookmark,
            Application application) {
        return new ApplicationDtos.TalentCandidateCardResponse(
                bookmark == null ? null : bookmark.getId(), application == null ? null : application.getId(),
                parseUuid(candidate.matchingId()), parseUuid(candidate.candidateId()), parseUuid(candidate.cvId()),
                candidate.candidateName(), candidate.desiredTitle(), candidate.location(), candidate.yearsOfExperience(),
                candidate.topSkills(), candidate.cvSummary(), candidate.normalizedScore(), candidate.label(),
                candidate.isPotential(), candidate.matchReasons(), candidate.potentialReason(),
                application == null ? "NONE" : application.getStatus().name(), invitationState(application), bookmark != null,
                isVisibleInvitation(application), application == null ? candidate.matchedAt() : application.getUpdatedAt());
    }

    private ApplicationDtos.TalentCandidateCardResponse toBookmarkCard(RecruiterCvBookmark bookmark,
                                                                         Matching matching,
                                                                         Application application) {
        Candidate candidate = bookmark.getCandidate();
        CV cv = bookmark.getCv();
        return new ApplicationDtos.TalentCandidateCardResponse(
                bookmark.getId(), application == null ? null : application.getId(), matching == null ? null : matching.getId(),
                candidate.getId(), cv.getId(), candidate.getUser().getFullName(), candidate.getDesiredTitle(),
                candidate.getLocation(), candidate.getYearsOfExperience(), parseList(cv.getTopSkillsJson()), cv.getParsedSummary(),
                matching == null ? null : matching.getNormalizedScore(), matching == null ? "UNSCORED" : matching.getLabel().name(),
                matching != null && matching.isPotential(), matching == null ? List.of() : parseList(matching.getMatchReasonsJson()),
                matching == null ? null : unquote(matching.getPotentialReasonJson()), application == null ? "NONE" : application.getStatus().name(), invitationState(application),
                true, isVisibleInvitation(application), application == null ? bookmark.getCreatedAt() : application.getUpdatedAt());
    }

    private ApplicationDtos.TalentCandidateCardResponse toApplicationCard(Application application,
                                                                            RecruiterCvBookmark bookmark) {
        Candidate candidate = application.getCandidate();
        CV cv = application.getCv();
        Matching matching = application.getMatching();
        return new ApplicationDtos.TalentCandidateCardResponse(
                bookmark == null ? null : bookmark.getId(), application.getId(), matching == null ? null : matching.getId(),
                candidate.getId(), cv == null ? null : cv.getId(), candidate.getUser().getFullName(), candidate.getDesiredTitle(),
                candidate.getLocation(), candidate.getYearsOfExperience(), cv == null ? List.of() : parseList(cv.getTopSkillsJson()),
                cv == null ? null : cv.getParsedSummary(), matching == null ? null : matching.getNormalizedScore(),
                matching == null ? "UNSCORED" : matching.getLabel().name(), matching != null && matching.isPotential(),
                matching == null ? List.of() : parseList(matching.getMatchReasonsJson()),
                matching == null ? null : unquote(matching.getPotentialReasonJson()), application.getStatus().name(), invitationState(application),
                bookmark != null, isVisibleInvitation(application), application.getUpdatedAt());
    }

    private Map<UUID, RecruiterCvBookmark> bookmarksByCandidate(UUID jobId) {
        return bookmarkRepo.findByJobIdOrderByCreatedAtDesc(jobId).stream()
                .collect(Collectors.toMap(item -> item.getCandidate().getId(), Function.identity(), (left, right) -> left));
    }

    private Map<UUID, Application> visibleApplicationsByCandidate(UUID jobId) {
        return applicationRepo.findAllByJobIdWithDetails(jobId).stream()
                .filter(application -> !application.isInvitationWithdrawn())
                .collect(Collectors.toMap(application -> application.getCandidate().getId(), Function.identity(), (left, right) -> left));
    }

    private boolean isVisibleInvitation(Application application) {
        return application != null && application.isInvitationOrigin() && !application.isInvitationWithdrawn();
    }

    private String invitationState(Application application) {
        if (!isVisibleInvitation(application)) return "NONE";
        return switch (application.getStatus()) {
            case INVITED -> "INVITED";
            case PENDING -> "ACCEPTED";
            case NOT_INTERESTED -> "DECLINED";
            default -> application.getStatus().name();
        };
    }

    private Job requireOwnedJob(UUID jobId, UUID recruiterId) {
        Job job = jobRepo.findByIdWithRecruiter(jobId)
                .orElseThrow(() -> AppException.notFound("Job", jobId));
        if (!job.getRecruiter().getId().equals(recruiterId)) {
            throw AppException.forbidden("You do not own this job");
        }
        return job;
    }

    private List<String> parseList(String value) {
        if (value == null || value.isBlank()) return List.of();
        try {
            return objectMapper.readValue(value, LIST_TYPE);
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private UUID parseUuid(String value) {
        return value == null || value.isBlank() ? null : UUID.fromString(value);
    }

    private String unquote(String value) {
        return value == null ? null : value.replace("\"", "");
    }
}
