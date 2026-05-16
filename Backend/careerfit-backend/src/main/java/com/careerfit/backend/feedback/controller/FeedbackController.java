package com.careerfit.backend.feedback.controller;

import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.common.response.ApiResponse;
import com.careerfit.backend.feedback.entity.Feedback;
import com.careerfit.backend.feedback.service.FeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/matches/{matchingId}/feedback")
@Tag(name = "Feedback", description = "CV-JD match feedback (triggers Rocchio learning)")
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @PostMapping
    @Operation(summary = "Submit feedback on a match: GOOD_MATCH | POTENTIAL | BAD_MATCH | NOT_INTERESTED")
    public ResponseEntity<ApiResponse<Void>> submitFeedback(
            @PathVariable UUID matchingId,
            @RequestParam String type,
            @RequestParam(defaultValue = "WEB") String channel,
            @RequestParam(defaultValue = "CANDIDATE") String role,
            @RequestAttribute("userId") UUID userId) {

        Feedback.FeedbackType feedbackType;
        try {
            feedbackType = Feedback.FeedbackType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw AppException.badRequest("Invalid feedback type: " + type);
        }

        Feedback.ActorRole actorRole;
        try {
            actorRole = Feedback.ActorRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw AppException.badRequest("Invalid role: " + role);
        }

        Feedback.SourceChannel sourceChannel;
        try {
            sourceChannel = Feedback.SourceChannel.valueOf(channel.toUpperCase());
        } catch (IllegalArgumentException e) {
            sourceChannel = Feedback.SourceChannel.WEB;
        }

        feedbackService.submitFeedback(matchingId, userId, actorRole, feedbackType, sourceChannel);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
