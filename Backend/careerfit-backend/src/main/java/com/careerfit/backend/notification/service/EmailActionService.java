package com.careerfit.backend.notification.service;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.config.AppProperties;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.notification.entity.EmailAction;
import com.careerfit.backend.notification.repository.EmailActionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Builds and sends email action tokens.
 * Each relevant email includes one-click token links for GOOD_MATCH / BAD_MATCH / NOT_INTERESTED.
 */
@Service
public class EmailActionService {

    private static final Logger log = LoggerFactory.getLogger(EmailActionService.class);

    /** How long email action tokens stay valid. */
    private static final int TOKEN_VALIDITY_HOURS = 72;

    private final EmailActionRepository emailActionRepo;
    private final IMailService mailService;
    private final AppProperties props;

    public EmailActionService(EmailActionRepository emailActionRepo,
                              IMailService mailService,
                              AppProperties props) {
        this.emailActionRepo = emailActionRepo;
        this.mailService = mailService;
        this.props = props;
    }

    /**
     * Send a match notification email with one-click feedback buttons.
     * Generates GOOD_MATCH / POTENTIAL / NOT_INTERESTED action tokens.
     */
    @Transactional
    public void sendMatchNotification(UserAccount candidate, Matching matching) {
        String email = candidate.getEmail();
        String name  = candidate.getFullName() != null ? candidate.getFullName() : email;
        var job = matching.getJob();

        // Create tokens for each action
        String goodToken  = createToken(candidate, matching, EmailAction.ActionType.GOOD_MATCH);
        String potToken   = createToken(candidate, matching, EmailAction.ActionType.POTENTIAL);
        String skipToken  = createToken(candidate, matching, EmailAction.ActionType.NOT_INTERESTED);
        String viewToken  = createToken(candidate, matching, EmailAction.ActionType.VIEW_JOB);

        String baseUrl = props.getEmailActionBaseUrl();

        String body = buildMatchEmailHtml(name, job.getTitle(), job.getCompany(),
                matching.getNormalizedScore().doubleValue(),
                matching.getLabel().name(),
                baseUrl + "?token=" + goodToken,
                baseUrl + "?token=" + potToken,
                baseUrl + "?token=" + skipToken,
                baseUrl.replace("/email-action/redeem", "/jobs/") + job.getId());

        mailService.sendHtml(email,
                "✅ CareerFit: Cơ hội mới phù hợp — " + job.getTitle() + " tại " + job.getCompany(),
                body);
    }

    /**
     * Send the daily digest with up to N top matches.
     */
    @Transactional
    public void sendDigest(UserAccount candidate, List<Matching> topMatches) {
        if (topMatches.isEmpty()) return;

        String email = candidate.getEmail();
        String name  = candidate.getFullName() != null ? candidate.getFullName() : email;
        String baseUrl = props.getEmailActionBaseUrl();

        String unsubToken = createToken(candidate, null, EmailAction.ActionType.UNSUBSCRIBE_DIGEST);

        List<String> sections = new ArrayList<>();
        for (Matching m : topMatches) {
            String goodToken = createToken(candidate, m, EmailAction.ActionType.GOOD_MATCH);
            String skipToken = createToken(candidate, m, EmailAction.ActionType.NOT_INTERESTED);
            sections.add(buildDigestSection(m, baseUrl, goodToken, skipToken));
        }

        String body = buildDigestHtml(name, sections,
                baseUrl + "?token=" + unsubToken);

        mailService.sendHtml(email,
                "📬 CareerFit Daily Digest — " + topMatches.size() + " cơ hội phù hợp hôm nay",
                body);
    }

    // ── Token Generation ──────────────────────────────────────────────────

    private String createToken(UserAccount recipient, Matching matching, EmailAction.ActionType type) {
        String token = UUID.randomUUID().toString().replace("-", "").substring(0, 32);
        Instant expires = Instant.now().plus(TOKEN_VALIDITY_HOURS, ChronoUnit.HOURS);
        var action = new EmailAction(token, recipient, matching, type, expires);
        emailActionRepo.save(action);
        return token;
    }

    // ── HTML Builders ─────────────────────────────────────────────────────

    private String buildMatchEmailHtml(String name, String title, String company,
                                        double score, String label,
                                        String goodUrl, String potUrl,
                                        String skipUrl, String viewUrl) {
        String scoreColor = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#94a3b8";
        return """
            <!DOCTYPE html>
            <html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>CareerFit — Cơ hội mới</title></head>
            <body style="font-family:Inter,Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:20px;">
            <div style="max-width:600px;margin:0 auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
              <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:24px;">🎯 CareerFit AutoPilot</h1>
                <p style="color:#c4b5fd;margin:8px 0 0;">Phát hiện cơ hội phù hợp với bạn</p>
              </div>
              <div style="padding:32px;">
                <p>Xin chào <strong>%s</strong>,</p>
                <div style="background:#0f172a;border-radius:12px;padding:20px;margin:16px 0;border:1px solid #334155;">
                  <h2 style="color:#818cf8;margin:0 0 8px;font-size:18px;">%s</h2>
                  <p style="color:#94a3b8;margin:0;">🏢 %s</p>
                  <div style="margin-top:12px;display:flex;align-items:center;gap:8px;">
                    <span style="background:%s;color:#fff;padding:4px 12px;border-radius:99px;font-size:13px;font-weight:600;">%s</span>
                    <span style="color:#64748b;font-size:13px;">%.1f%%  phù hợp</span>
                  </div>
                </div>
                <p style="font-size:14px;color:#64748b;">Hành động nhanh — đánh giá phù hợp:</p>
                <table style="width:100%%;border-collapse:separate;border-spacing:8px;">
                  <tr>
                    <td style="text-align:center;"><a href="%s" style="display:block;background:#22c55e;color:#fff;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;">✅ Rất phù hợp</a></td>
                    <td style="text-align:center;"><a href="%s" style="display:block;background:#f59e0b;color:#fff;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;">🌟 Tiềm năng</a></td>
                    <td style="text-align:center;"><a href="%s" style="display:block;background:#475569;color:#fff;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;">⏭️ Bỏ qua</a></td>
                  </tr>
                </table>
                <div style="text-align:center;margin-top:20px;">
                  <a href="%s" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Xem chi tiết →</a>
                </div>
              </div>
              <div style="background:#0f172a;padding:16px;text-align:center;">
                <p style="color:#475569;font-size:12px;margin:0;">CareerFit IT AutoPilot · Bạn nhận được email này vì đã bật thông báo tự động.</p>
              </div>
            </div>
            </body></html>
            """.formatted(name, title, company, scoreColor, label, score,
                goodUrl, potUrl, skipUrl, viewUrl);
    }

    private String buildDigestSection(Matching m, String baseUrl,
                                       String goodToken, String skipToken) {
        var job = m.getJob();
        double score = m.getNormalizedScore().doubleValue();
        String scoreColor = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#94a3b8";
        return """
            <div style="border:1px solid #334155;border-radius:8px;padding:16px;margin:8px 0;background:#0f172a;">
              <h3 style="color:#818cf8;margin:0 0 4px;font-size:15px;">%s</h3>
              <p style="color:#64748b;margin:0 0 8px;font-size:13px;">🏢 %s</p>
              <span style="background:%s;color:#fff;padding:2px 10px;border-radius:99px;font-size:12px;">%.0f%%  phù hợp</span>
              <div style="margin-top:10px;">
                <a href="%s?token=%s" style="background:#22c55e;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:13px;margin-right:6px;">✅ Phù hợp</a>
                <a href="%s?token=%s" style="background:#475569;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:13px;">⏭️ Bỏ qua</a>
              </div>
            </div>
            """.formatted(job.getTitle(), job.getCompany(), scoreColor, score,
                baseUrl, goodToken, baseUrl, skipToken);
    }

    private String buildDigestHtml(String name, List<String> sections, String unsubUrl) {
        String body = String.join("\n", sections);
        return """
            <!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"></head>
            <body style="font-family:Inter,Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:20px;">
            <div style="max-width:600px;margin:0 auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
              <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px;text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:22px;">📬 Digest hàng ngày</h1>
                <p style="color:#c4b5fd;margin:6px 0 0;">Cơ hội phù hợp với bạn hôm nay</p>
              </div>
              <div style="padding:24px;">
                <p>Xin chào <strong>%s</strong>,</p>
                %s
              </div>
              <div style="background:#0f172a;padding:16px;text-align:center;">
                <a href="%s" style="color:#475569;font-size:12px;">Hủy nhận digest</a>
              </div>
            </div></body></html>
            """.formatted(name, body, unsubUrl);
    }
}
