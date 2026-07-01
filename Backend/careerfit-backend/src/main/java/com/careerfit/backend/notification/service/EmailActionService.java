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
import java.time.LocalDate;
import java.time.ZoneId;
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
    private final NotificationPolicyGuard notificationPolicyGuard;

    public EmailActionService(EmailActionRepository emailActionRepo,
                              IMailService mailService,
                              AppProperties props,
                              NotificationPolicyGuard notificationPolicyGuard) {
        this.emailActionRepo = emailActionRepo;
        this.mailService = mailService;
        this.props = props;
        this.notificationPolicyGuard = notificationPolicyGuard;
    }

    /**
     * Send a match notification email with one-click feedback buttons.
     * Generates GOOD_MATCH / POTENTIAL / NOT_INTERESTED action tokens.
     */
    @Transactional
    public void sendMatchNotification(UserAccount candidate, Matching matching) {
        String emailType = "MATCH_NOTIFICATION";
        String contextKey = matching.getId().toString();
        var decision = notificationPolicyGuard.evaluate(candidate, emailType, contextKey);
        if (!decision.allowed()) {
            notificationPolicyGuard.logSkipped(candidate, emailType, contextKey, decision.reason());
            log.info("Skipping match notification for user={} matching={} reason={}",
                    candidate.getId(), matching.getId(), decision.reason());
            return;
        }

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

        try {
            mailService.sendHtml(email,
                    "CareerFit: Co hoi moi phu hop - " + job.getTitle() + " tai " + job.getCompany(),
                    body);
            notificationPolicyGuard.logSent(candidate, emailType, contextKey);
        } catch (Exception e) {
            notificationPolicyGuard.logFailed(candidate, emailType, contextKey, e.getMessage());
            log.error("Match notification email failed to {} matching={}: {}", email, matching.getId(), e.getMessage());
        }
    }

    /**
     * Send the daily digest with up to N top matches.
     */
    @Transactional
    public void sendDigest(UserAccount candidate, List<Matching> topMatches) {
        if (topMatches.isEmpty()) return;

        String emailType = "DAILY_DIGEST";
        String contextKey = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).toString();
        var decision = notificationPolicyGuard.evaluate(candidate, emailType, contextKey);
        if (!decision.allowed()) {
            notificationPolicyGuard.logSkipped(candidate, emailType, contextKey, decision.reason());
            log.info("Skipping digest for user={} reason={}", candidate.getId(), decision.reason());
            return;
        }

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

        try {
            mailService.sendHtml(email,
                    "CareerFit Daily Digest - " + topMatches.size() + " co hoi phu hop hom nay",
                    body);
            notificationPolicyGuard.logSent(candidate, emailType, contextKey);
        } catch (Exception e) {
            notificationPolicyGuard.logFailed(candidate, emailType, contextKey, e.getMessage());
            log.error("Digest email failed to {}: {}", email, e.getMessage());
        }
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
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta name="color-scheme" content="light dark">
              <meta name="supported-color-schemes" content="light dark">
              <title>CareerFit - Cơ hội mới</title>
              <style>
                @media only screen and (max-width: 480px) {
                  .email-shell { width: 100%% !important; border-radius: 12px !important; }
                  .email-outer { padding: 14px !important; }
                  .email-pad { padding: 22px 20px !important; }
                  .email-title { font-size: 22px !important; line-height: 1.25 !important; }
                  .email-copy { font-size: 15px !important; line-height: 1.55 !important; }
                  .job-title { font-size: 17px !important; line-height: 1.35 !important; }
                  .action-cell { display: block !important; width: 100%% !important; padding: 0 0 10px 0 !important; }
                  .action-button { display: block !important; width: 100%% !important; box-sizing: border-box !important; }
                  .detail-button { display: block !important; box-sizing: border-box !important; width: 100%% !important; }
                }
              </style>
            </head>
            <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;background:#0f172a;border-collapse:collapse;">
              <tr>
                <td class="email-outer" align="center" style="padding:20px;">
                  <table role="presentation" class="email-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#1e293b;border:1px solid #334155;border-radius:16px;overflow:hidden;border-collapse:separate;">
                    <tr>
                      <td class="email-pad" bgcolor="#4f46e5" style="background:#4f46e5;padding:32px;text-align:center;">
                        <h1 class="email-title" style="color:#ffffff;margin:0;font-size:24px;line-height:1.3;font-weight:700;">CareerFit AutoPilot</h1>
                        <p style="color:#dbeafe;margin:8px 0 0;font-size:14px;line-height:1.45;">Phát hiện cơ hội phù hợp với bạn</p>
                      </td>
                    </tr>
                    <tr>
                      <td class="email-pad" bgcolor="#1e293b" style="background:#1e293b;padding:32px;color:#e2e8f0;">
                        <p class="email-copy" style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#e2e8f0;">Xin chào <strong style="color:#ffffff;">%s</strong>,</p>
                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;background:#0f172a;border:1px solid #334155;border-radius:12px;border-collapse:separate;">
                          <tr>
                            <td style="padding:20px;">
                              <h2 class="job-title" style="color:#93c5fd;margin:0 0 8px;font-size:18px;line-height:1.35;font-weight:700;">%s</h2>
                              <p style="color:#cbd5e1;margin:0 0 12px;font-size:14px;line-height:1.4;">%s</p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                <tr>
                                  <td bgcolor="%s" style="background:%s;border-radius:999px;padding:5px 12px;color:#ffffff;font-size:13px;font-weight:700;line-height:1;">%s</td>
                                  <td style="padding-left:10px;color:#94a3b8;font-size:13px;line-height:1.4;">%.1f%% phù hợp</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        <p style="font-size:14px;line-height:1.45;color:#94a3b8;margin:20px 0 12px;">Hành động nhanh - đánh giá phù hợp:</p>
                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;border-collapse:collapse;">
                          <tr>
                            <td class="action-cell" width="33.33%%" style="width:33.33%%;padding:0 5px 0 0;text-align:center;">
                              <a class="action-button" href="%s" style="display:block;background:#22c55e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;line-height:1.2;padding:13px 10px;border-radius:8px;">Rất phù hợp</a>
                            </td>
                            <td class="action-cell" width="33.33%%" style="width:33.33%%;padding:0 5px;text-align:center;">
                              <a class="action-button" href="%s" style="display:block;background:#f59e0b;color:#111827;text-decoration:none;font-size:14px;font-weight:700;line-height:1.2;padding:13px 10px;border-radius:8px;">Tiềm năng</a>
                            </td>
                            <td class="action-cell" width="33.33%%" style="width:33.33%%;padding:0 0 0 5px;text-align:center;">
                              <a class="action-button" href="%s" style="display:block;background:#64748b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;line-height:1.2;padding:13px 10px;border-radius:8px;">Bỏ qua</a>
                            </td>
                          </tr>
                        </table>
                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;border-collapse:collapse;margin-top:20px;">
                          <tr>
                            <td align="center">
                              <a class="detail-button" href="%s" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;line-height:1.2;padding:13px 30px;border-radius:8px;">Xem chi tiết</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td bgcolor="#0f172a" style="background:#0f172a;padding:16px;text-align:center;">
                        <p style="color:#94a3b8;font-size:12px;line-height:1.4;margin:0;">CareerFit IT AutoPilot - Bạn nhận được email này vì đã bật thông báo tự động.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            </body></html>
            """.formatted(name, title, company, scoreColor, scoreColor, label, score,
                goodUrl, potUrl, skipUrl, viewUrl);
    }

    private String buildDigestSection(Matching m, String baseUrl,
                                       String goodToken, String skipToken) {
        var job = m.getJob();
        double score = m.getNormalizedScore().doubleValue();
        String scoreColor = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#94a3b8";
        return """
            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;background:#0f172a;border:1px solid #334155;border-radius:10px;border-collapse:separate;margin:10px 0;">
              <tr>
                <td style="padding:16px;">
                  <h3 style="color:#93c5fd;margin:0 0 5px;font-size:16px;line-height:1.35;">%s</h3>
                  <p style="color:#cbd5e1;margin:0 0 10px;font-size:13px;line-height:1.4;">%s</p>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin-bottom:12px;">
                    <tr>
                      <td bgcolor="%s" style="background:%s;color:#ffffff;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;">%.0f%% phù hợp</td>
                    </tr>
                  </table>
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;border-collapse:collapse;">
                    <tr>
                      <td class="action-cell" width="50%%" style="width:50%%;padding:0 5px 0 0;">
                        <a class="action-button" href="%s?token=%s" style="display:block;background:#22c55e;color:#ffffff;text-align:center;text-decoration:none;font-size:13px;font-weight:700;padding:10px 12px;border-radius:7px;">Phù hợp</a>
                      </td>
                      <td class="action-cell" width="50%%" style="width:50%%;padding:0 0 0 5px;">
                        <a class="action-button" href="%s?token=%s" style="display:block;background:#64748b;color:#ffffff;text-align:center;text-decoration:none;font-size:13px;font-weight:700;padding:10px 12px;border-radius:7px;">Bỏ qua</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            """.formatted(job.getTitle(), job.getCompany(), scoreColor, scoreColor, score,
                baseUrl, goodToken, baseUrl, skipToken);
    }

    private String buildDigestHtml(String name, List<String> sections, String unsubUrl) {
        String body = String.join("\n", sections);
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta name="color-scheme" content="light dark">
              <meta name="supported-color-schemes" content="light dark">
              <style>
                @media only screen and (max-width: 480px) {
                  .email-shell { width: 100%% !important; border-radius: 12px !important; }
                  .email-outer { padding: 14px !important; }
                  .email-pad { padding: 22px 20px !important; }
                  .email-title { font-size: 22px !important; line-height: 1.25 !important; }
                  .action-cell { display: block !important; width: 100%% !important; padding: 0 0 10px 0 !important; }
                  .action-button { display: block !important; width: 100%% !important; box-sizing: border-box !important; }
                }
              </style>
            </head>
            <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;background:#0f172a;border-collapse:collapse;">
              <tr>
                <td class="email-outer" align="center" style="padding:20px;">
                  <table role="presentation" class="email-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#1e293b;border:1px solid #334155;border-radius:16px;overflow:hidden;border-collapse:separate;">
                    <tr>
                      <td class="email-pad" bgcolor="#4f46e5" style="background:#4f46e5;padding:28px;text-align:center;">
                        <h1 class="email-title" style="color:#ffffff;margin:0;font-size:22px;line-height:1.3;font-weight:700;">Digest hàng ngày</h1>
                        <p style="color:#dbeafe;margin:6px 0 0;font-size:14px;line-height:1.45;">Cơ hội phù hợp với bạn hôm nay</p>
                      </td>
                    </tr>
                    <tr>
                      <td class="email-pad" bgcolor="#1e293b" style="background:#1e293b;padding:24px;color:#e2e8f0;">
                        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#e2e8f0;">Xin chào <strong style="color:#ffffff;">%s</strong>,</p>
                        %s
                      </td>
                    </tr>
                    <tr>
                      <td bgcolor="#0f172a" style="background:#0f172a;padding:16px;text-align:center;">
                        <a href="%s" style="color:#94a3b8;font-size:12px;text-decoration:underline;">Hủy nhận digest</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            </body></html>
            """.formatted(name, body, unsubUrl);
    }
}
