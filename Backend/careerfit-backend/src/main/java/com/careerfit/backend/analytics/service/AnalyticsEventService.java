package com.careerfit.backend.analytics.service;

import com.careerfit.backend.analytics.entity.AnalyticsEvent;
import com.careerfit.backend.analytics.repository.AnalyticsEventRepository;
import com.careerfit.backend.common.exception.AppException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class AnalyticsEventService {

    private static final Set<String> ALLOWED_EVENTS = Set.of(
            "JOB_VIEWED",
            "JOB_SEARCHED",
            "JOB_APPLIED",
            "CV_UPLOADED",
            "MATCH_CARD_VIEWED",
            "MATCH_CARD_CLICKED",
            "AUTOFIT_ENABLED",
            "RECRUITER_VIEWED_CANDIDATE",
            "APPLICATION_STATUS_CHANGED"
    );

    private final AnalyticsEventRepository eventRepo;
    private final ObjectMapper objectMapper;

    public AnalyticsEventService(AnalyticsEventRepository eventRepo,
                                 ObjectMapper objectMapper) {
        this.eventRepo = eventRepo;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public EventRecordedResponse record(UUID actorUserId,
                                        Authentication authentication,
                                        EventRequest request) {
        String eventType = cleanUpper(request.eventType());
        if (eventType == null) {
            throw AppException.badRequest("Analytics eventType is required");
        }
        if (!ALLOWED_EVENTS.contains(eventType)) {
            throw AppException.badRequest("Unsupported analytics event type: " + request.eventType());
        }

        String subjectType = cleanUpper(request.subjectType());
        String metadataJson = serializeMetadata(request.metadata());
        String actorRole = resolveRole(authentication);

        AnalyticsEvent event = new AnalyticsEvent(
                actorUserId,
                actorRole,
                eventType,
                subjectType,
                request.subjectId(),
                metadataJson,
                request.occurredAt());

        eventRepo.save(event);
        return new EventRecordedResponse(event.getId(), eventType, event.getOccurredAt());
    }

    private String serializeMetadata(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) return null;
        try {
            String json = objectMapper.writeValueAsString(metadata);
            if (json.length() > 4000) {
                throw AppException.badRequest("Analytics event metadata is too large");
            }
            return json;
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw AppException.badRequest("Analytics event metadata must be valid JSON");
        }
    }

    private String resolveRole(Authentication authentication) {
        if (authentication == null) return null;
        return authentication.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .sorted()
                .findFirst()
                .orElse(null);
    }

    private String cleanUpper(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim().toUpperCase();
    }

    public record EventRequest(
            String eventType,
            String subjectType,
            UUID subjectId,
            Map<String, Object> metadata,
            Instant occurredAt
    ) {}

    public record EventRecordedResponse(
            UUID id,
            String eventType,
            Instant occurredAt
    ) {}
}
