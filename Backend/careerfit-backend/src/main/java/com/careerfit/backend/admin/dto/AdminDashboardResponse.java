package com.careerfit.backend.admin.dto;

import java.time.Instant;

public record AdminDashboardResponse(
        long totalCandidates,
        long totalRecruiters,
        long activeJobs,
        long applications,
        long highMatches,
        long potentialMatches,
        long emailActionsSentToday,
        long failedEmailActions,
        long pendingAutomationActions,
        long systemErrorsLast24h,
        Instant generatedAt
) {
}
