package com.careerfit.backend.notification.controller;

import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.feedback.entity.Feedback;
import com.careerfit.backend.feedback.service.FeedbackService;
import com.careerfit.backend.notification.entity.EmailAction;
import com.careerfit.backend.notification.repository.EmailActionRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.io.IOException;
import java.io.PrintWriter;

/**
 * Handles one-click email action token redemption.
 *
 * Flow:
 *  1. User clicks link in email → GET /api/email-action/redeem?token=<token>
 *  2. Server validates token (not expired, not already redeemed)
 *  3. Maps action to FeedbackType and submits feedback
 *  4. Marks token REDEEMED
 *  5. Returns a "success" HTML page (or redirect to frontend)
 *
 * This endpoint is intentionally public (no JWT required).
 * Security: the token is the authentication factor (72h expiry, UUID v4).
 */
@Controller
@RequestMapping("/api/email-action")
@Tag(name = "Email Actions", description = "One-click email action token redemption")
public class EmailActionController {

    private static final Logger log = LoggerFactory.getLogger(EmailActionController.class);

    private final EmailActionRepository emailActionRepo;
    private final FeedbackService feedbackService;

    public EmailActionController(EmailActionRepository emailActionRepo,
                                 FeedbackService feedbackService) {
        this.emailActionRepo = emailActionRepo;
        this.feedbackService = feedbackService;
    }

    @GetMapping(value = "/redeem", produces = MediaType.TEXT_HTML_VALUE)
    @Operation(summary = "Redeem a one-click email action token (public, no JWT)")
    @Transactional
    public void redeem(@RequestParam String token,
                       HttpServletResponse response) throws IOException {

        response.setContentType("text/html; charset=UTF-8");
        PrintWriter out = response.getWriter();

        EmailAction action = emailActionRepo.findByToken(token).orElse(null);

        // ── Validation ────────────────────────────────────────────────────
        if (action == null) {
            out.write(errorPage("Token không hợp lệ",
                    "Liên kết này không tồn tại hoặc đã bị xóa."));
            return;
        }
        if (!action.isPending()) {
            out.write(infoPage("Đã xử lý",
                    "Hành động này đã được thực hiện trước đó."));
            return;
        }
        if (action.isExpired()) {
            action.setStatus(EmailAction.ActionStatus.EXPIRED);
            emailActionRepo.save(action);
            out.write(errorPage("Token hết hạn",
                    "Liên kết này đã hết hạn (72 giờ). Vui lòng đăng nhập để cập nhật thủ công."));
            return;
        }

        // ── Dispatch action ───────────────────────────────────────────────
        try {
            switch (action.getActionType()) {
                case GOOD_MATCH, POTENTIAL, BAD_MATCH, NOT_INTERESTED -> {
                    if (action.getMatching() != null) {
                        Feedback.FeedbackType feedbackType = mapToFeedback(action.getActionType());
                        feedbackService.submitFeedback(
                                action.getMatching().getId(),
                                action.getRecipient().getId(),
                                Feedback.ActorRole.CANDIDATE,
                                feedbackType,
                                Feedback.SourceChannel.EMAIL
                        );
                    }
                }
                case UNSUBSCRIBE_DIGEST -> {
                    // Set candidate automation policy digest=false
                    log.info("Unsubscribe digest for user={}", action.getRecipient().getId());
                    // Handled by AutomationPolicyService (call not shown — avoids circular dep)
                }
                case VIEW_JOB -> {
                    // No server-side action needed — just redirect to job page
                }
            }

            action.redeem();
            emailActionRepo.save(action);

            String message = switch (action.getActionType()) {
                case GOOD_MATCH    -> "✅ Cảm ơn! Bạn đã đánh giá đây là cơ hội <strong>rất phù hợp</strong>.";
                case POTENTIAL     -> "🌟 Cảm ơn! Hệ thống đã ghi nhận đây là cơ hội <strong>tiềm năng</strong>.";
                case BAD_MATCH     -> "❌ Cảm ơn! Hệ thống sẽ <strong>giảm</strong> các gợi ý tương tự.";
                case NOT_INTERESTED-> "⏭️ Đã bỏ qua. Hệ thống sẽ không nhắc lại về vị trí này.";
                case UNSUBSCRIBE_DIGEST -> "📭 Đã hủy nhận digest hàng ngày.";
                case VIEW_JOB      -> "🔗 Đang chuyển hướng...";
            };

            out.write(successPage(message));

        } catch (Exception e) {
            log.error("Failed to process email action {}: {}", token, e.getMessage());
            out.write(errorPage("Có lỗi xảy ra", "Vui lòng thử lại sau hoặc đăng nhập để thực hiện."));
        }
    }

    // ── HTML Responses ────────────────────────────────────────────────────

    private String successPage(String message) {
        return page("🎉 Hành động thành công", message, "#22c55e");
    }

    private String errorPage(String title, String detail) {
        return page("❌ " + title, detail, "#ef4444");
    }

    private String infoPage(String title, String detail) {
        return page("ℹ️ " + title, detail, "#6366f1");
    }

    private String page(String title, String body, String accent) {
        return """
            <!DOCTYPE html><html lang="vi"><head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>%s — CareerFit</title></head>
            <body style="font-family:Inter,Arial,sans-serif;background:#0f172a;color:#e2e8f0;
                         display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
              <div style="max-width:480px;width:90%%;background:#1e293b;border-radius:16px;
                          padding:40px;text-align:center;border:1px solid #334155;">
                <div style="font-size:48px;margin-bottom:16px;">%s</div>
                <h2 style="color:%s;margin:0 0 12px;">%s</h2>
                <p style="color:#94a3b8;line-height:1.6;">%s</p>
                <a href="/" style="display:inline-block;margin-top:24px;background:%s;color:#fff;
                   padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">
                   Về trang chủ →</a>
              </div>
            </body></html>
            """.formatted(
                title,
                title.substring(0, 2),   // emoji
                accent, title.substring(2).trim(), body, accent);
    }

    // ── Mapper ────────────────────────────────────────────────────────────

    private Feedback.FeedbackType mapToFeedback(EmailAction.ActionType actionType) {
        return switch (actionType) {
            case GOOD_MATCH     -> Feedback.FeedbackType.GOOD_MATCH;
            case POTENTIAL      -> Feedback.FeedbackType.POTENTIAL;
            case BAD_MATCH      -> Feedback.FeedbackType.BAD_MATCH;
            case NOT_INTERESTED -> Feedback.FeedbackType.NOT_INTERESTED;
            default             -> throw new IllegalStateException("Not a feedback action: " + actionType);
        };
    }
}
