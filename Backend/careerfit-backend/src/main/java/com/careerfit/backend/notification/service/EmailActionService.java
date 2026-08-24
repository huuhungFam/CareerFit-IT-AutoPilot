package com.careerfit.backend.notification.service;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.config.AppProperties;
import com.careerfit.backend.cv.entity.CV;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.matching.repository.MatchingRepository;
import com.careerfit.backend.notification.entity.EmailAction;
import com.careerfit.backend.notification.repository.EmailActionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Builds and sends email action tokens.
 * Each relevant email includes one-click token links for GOOD_MATCH / BAD_MATCH / NOT_INTERESTED.
 */
@Service
public class EmailActionService {
    public java.util.Collection<com.careerfit.backend.notification.dto.EmailSample> buildSampleCatalog() { return java.util.List.of(); }

    private static final Logger log = LoggerFactory.getLogger(EmailActionService.class);

    /** How long email action tokens stay valid. */
    private static final int TOKEN_VALIDITY_HOURS = 72;

    private final EmailActionRepository emailActionRepo;
    private final IMailService mailService;
    private final AppProperties props;
    private final NotificationPolicyGuard notificationPolicyGuard;
    private final ObjectMapper objectMapper;
    private final MatchingRepository matchingRepository;

    public EmailActionService(EmailActionRepository emailActionRepo,
                              IMailService mailService,
                              AppProperties props,
                              NotificationPolicyGuard notificationPolicyGuard,
                              ObjectMapper objectMapper,
                              MatchingRepository matchingRepository) {
        this.emailActionRepo = emailActionRepo;
        this.mailService = mailService;
        this.props = props;
        this.notificationPolicyGuard = notificationPolicyGuard;
        this.objectMapper = objectMapper;
        this.matchingRepository = matchingRepository;
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

        try {
            deliverMatchNotification(candidate, matching);
            notificationPolicyGuard.logSent(candidate, emailType, contextKey);
        } catch (Exception e) {
            notificationPolicyGuard.logFailed(candidate, emailType, contextKey, e.getMessage());
            log.error("Match notification email failed to {} matching={}: {}", candidate.getEmail(), matching.getId(), e.getMessage());
        }
    }

    /** Called by the durable dispatcher after its row has been exclusively claimed. */
    public void deliverMatchNotification(UserAccount candidate, Matching matching) {
        String email = candidate.getEmail();
        String name = candidate.getFullName() != null ? candidate.getFullName() : email;
        var job = matching.getJob();
        String goodToken = createToken(candidate, matching, EmailAction.ActionType.GOOD_MATCH);
        String potToken = createToken(candidate, matching, EmailAction.ActionType.POTENTIAL);
        String skipToken = createToken(candidate, matching, EmailAction.ActionType.NOT_INTERESTED);
        String applyToken = createToken(candidate, matching, EmailAction.ActionType.APPLY);
        String baseUrl = props.getEmailActionBaseUrl();
        String body = buildMatchEmailHtml(name, job,
                skillsForEmail(job.getRequiredSkillsJson(), 6),
                skillsForEmail(matching.getMatchReasonsJson(), 4),
                formatSalary(job),
                matching.getNormalizedScore().doubleValue(), matching.getLabel().name(),
                baseUrl + "?token=" + goodToken, baseUrl + "?token=" + potToken,
                baseUrl + "?token=" + skipToken,
                baseUrl + "?token=" + applyToken,
                props.getFrontendJobUrl(job.getId()));
        // Persist action tokens before calling SMTP. A database constraint error must
        // prevent sending, rather than rolling back the outbox after the mail arrives.
        emailActionRepo.flush();
        mailService.deliverOutboxHtml(email,
                "CareerFit: Cơ hội mới phù hợp - " + job.getTitle() + " tại " + job.getCompany(), body);
    }

    /**
     * One CV-ready email for one matching. It deliberately reuses the table-based
     * layout of HIGH_MATCH so Gmail receives a complete, standalone action email.
     */
    @Transactional
    public void deliverCvMatchNotification(UserAccount candidate, Matching matching) {
        String email = candidate.getEmail();
        String name = candidate.getFullName() != null ? candidate.getFullName() : email;
        var job = matching.getJob();
        String baseUrl = props.getEmailActionBaseUrl();
        String body = buildMatchEmailHtml(name, job,
                skillsForEmail(job.getRequiredSkillsJson(), 6),
                skillsForEmail(matching.getMatchReasonsJson(), 4),
                formatSalary(job),
                matching.getNormalizedScore().doubleValue(), matching.getLabel().name(),
                baseUrl + "?token=" + createToken(candidate, matching, EmailAction.ActionType.GOOD_MATCH),
                baseUrl + "?token=" + createToken(candidate, matching, EmailAction.ActionType.POTENTIAL),
                baseUrl + "?token=" + createToken(candidate, matching, EmailAction.ActionType.NOT_INTERESTED),
                baseUrl + "?token=" + createToken(candidate, matching, EmailAction.ActionType.APPLY),
                props.getFrontendJobUrl(job.getId()));
        // See deliverMatchNotification: token persistence must succeed before SMTP.
        emailActionRepo.flush();
        mailService.deliverOutboxHtml(email,
                "CareerFit: Kết quả matching - " + job.getTitle() + " tại " + job.getCompany(), body);
    }

    /** Compatibility-only delivery for legacy CV-targeted outbox rows. */
    @Transactional
    public void deliverLegacyCvMatchNotification(UserAccount candidate, CV cv) {
        List<Matching> matches = matchingRepository.findTopMatchesByCvId(cv.getId(),
                org.springframework.data.domain.PageRequest.of(0, 3));
        if (matches.isEmpty()) return;
        String baseUrl = props.getEmailActionBaseUrl();
        StringBuilder sections = new StringBuilder();
        for (Matching matching : matches) {
            String apply = baseUrl + "?token=" + createToken(candidate, matching, EmailAction.ActionType.APPLY);
            String good = baseUrl + "?token=" + createToken(candidate, matching, EmailAction.ActionType.GOOD_MATCH);
            String potential = baseUrl + "?token=" + createToken(candidate, matching, EmailAction.ActionType.POTENTIAL);
            String skip = baseUrl + "?token=" + createToken(candidate, matching, EmailAction.ActionType.NOT_INTERESTED);
            sections.append(buildCvMatchSection(matching, apply, good, potential, skip));
        }
        String name = candidate.getFullName() == null ? candidate.getEmail() : candidate.getFullName();
        emailActionRepo.flush();
        mailService.deliverOutboxHtml(candidate.getEmail(), "CareerFit: Kết quả matching CV của bạn",
                wrapActionEmail("Kết quả matching CV", "Các JD phù hợp vừa được quét từ CV của bạn.",
                        "Xin chào " + escape(name) + ",", sections.toString()));
    }

    /** Invitation is an action email; accepting creates/activates the existing invitation application. */
    @Transactional
    public void sendRecruiterInvitation(Application invitation) {
        if (invitation == null || invitation.getStatus() != Application.ApplicationStatus.INVITED) return;
        UserAccount candidate = invitation.getCandidate().getUser();
        String baseUrl = props.getEmailActionBaseUrl();
        String accept = baseUrl + "?token=" + createToken(candidate, invitation, EmailAction.ActionType.ACCEPT_INVITATION);
        String decline = baseUrl + "?token=" + createToken(candidate, invitation, EmailAction.ActionType.DECLINE_INVITATION);
        var job = invitation.getJob();
        String detail = "<p style=\"color:#cbd5e1;line-height:1.5;\">Nhà tuyển dụng đã mời bạn ứng tuyển. "
                + "Bạn có thể chấp nhận và ứng tuyển hoàn toàn qua mail.</p>"
                + jobSummary(job, invitation.getMatching())
                + actionButtons(accept, "Chấp nhận & ứng tuyển", "#22c55e", decline, "Từ chối", "#64748b");
        emailActionRepo.flush();
        mailService.sendHtml(candidate.getEmail(), "CareerFit: Lời mời ứng tuyển - " + job.getTitle(),
                wrapActionEmail("Lời mời ứng tuyển", "Xác nhận trực tiếp từ mail, không cần đăng nhập.",
                        "Xin chào " + escape(candidate.getFullName() == null ? candidate.getEmail() : candidate.getFullName()) + ",", detail));
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

        String unsubToken = createToken(candidate, (Matching) null, EmailAction.ActionType.UNSUBSCRIBE_DIGEST);

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
                    "CareerFit Daily Digest - " + topMatches.size() + " cơ hội phù hợp hôm nay",
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
        var action = new EmailAction(hashToken(token), recipient, matching, type, expires);
        emailActionRepo.save(action);
        return token;
    }

    private String createToken(UserAccount recipient, Application application, EmailAction.ActionType type) {
        String token = UUID.randomUUID().toString().replace("-", "").substring(0, 32);
        EmailAction action = new EmailAction(hashToken(token), recipient, application, type,
                Instant.now().plus(TOKEN_VALIDITY_HOURS, ChronoUnit.HOURS));
        emailActionRepo.save(action);
        return token;
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to hash email action token", e);
        }
    }

    // ── HTML Builders ─────────────────────────────────────────────────────

    private String buildMatchEmailHtml(String name, com.careerfit.backend.job.entity.Job job,
                                        String requiredSkills, String matchReasons, String salary,
                                        double score, String label,
                                        String goodUrl, String potUrl,
                                        String skipUrl, String applyUrl, String viewUrl) {
        String scoreColor = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#94a3b8";
        String nameEscaped = escape(name);
        String title = escape(job.getTitle());
        String company = escape(job.getCompany());
        String location = escape(orFallback(job.getLocation(), "Chưa cập nhật"));
        String employment = escape(formatEmployment(job.getEmploymentType(), job.getRemoteType()));
        String salaryEscaped = escape(salary);
        String requiredSkillsEscaped = escape(requiredSkills);
        String matchReasonsEscaped = escape(matchReasons);
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
                              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;border-collapse:collapse;margin-top:16px;font-size:13px;line-height:1.5;color:#cbd5e1;">
                                <tr><td style="padding:4px 0;color:#94a3b8;width:130px;">Địa điểm</td><td style="padding:4px 0;color:#e2e8f0;">%s</td></tr>
                                <tr><td style="padding:4px 0;color:#94a3b8;">Hình thức</td><td style="padding:4px 0;color:#e2e8f0;">%s</td></tr>
                                <tr><td style="padding:4px 0;color:#94a3b8;">Lương</td><td style="padding:4px 0;color:#e2e8f0;">%s</td></tr>
                                <tr><td style="padding:4px 0;color:#94a3b8;vertical-align:top;">Kỹ năng yêu cầu</td><td style="padding:4px 0;color:#e2e8f0;">%s</td></tr>
                                <tr><td style="padding:4px 0;color:#94a3b8;vertical-align:top;">Lý do phù hợp</td><td style="padding:4px 0;color:#e2e8f0;">%s</td></tr>
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
                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;border-collapse:collapse;margin-top:14px;">
                          <tr><td align="center"><a href="%s" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 30px;border-radius:8px;">Ứng tuyển ngay</a></td></tr>
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
            """.formatted(nameEscaped, title, company, scoreColor, scoreColor, escape(matchLabel(label)), score,
                location, employment, salaryEscaped, requiredSkillsEscaped, matchReasonsEscaped,
                goodUrl, potUrl, skipUrl, applyUrl, viewUrl);
    }

    private String buildCvMatchSection(Matching matching, String applyUrl, String goodUrl,
                                       String potentialUrl, String skipUrl) {
        var job = matching.getJob();
        return """
            <div style="margin:16px 0;padding:18px;border:1px solid #334155;border-radius:12px;background:#0f172a;">
              <h2 style="margin:0 0 6px;color:#93c5fd;font-size:18px;">%s</h2>
              <p style="margin:0 0 10px;color:#cbd5e1;">%s · %s · %s</p>
              <p style="margin:0 0 8px;color:#e2e8f0;"><strong>%.1f%% phù hợp</strong> · %s</p>
              <p style="margin:0 0 12px;color:#cbd5e1;line-height:1.5;">Kỹ năng: %s<br>Lý do phù hợp: %s</p>
              <a href="%s" style="display:inline-block;margin:0 8px 8px 0;padding:10px 13px;border-radius:7px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;">Ứng tuyển ngay</a>
              <a href="%s" style="display:inline-block;margin:0 8px 8px 0;padding:10px 13px;border-radius:7px;background:#22c55e;color:#fff;text-decoration:none;font-weight:700;">Rất phù hợp</a>
              <a href="%s" style="display:inline-block;margin:0 8px 8px 0;padding:10px 13px;border-radius:7px;background:#f59e0b;color:#111827;text-decoration:none;font-weight:700;">Tiềm năng</a>
              <a href="%s" style="display:inline-block;margin:0 8px 8px 0;padding:10px 13px;border-radius:7px;background:#64748b;color:#fff;text-decoration:none;font-weight:700;">Bỏ qua</a>
              <a href="%s" style="display:inline-block;margin:0 0 8px 0;padding:10px 13px;border-radius:7px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;">Xem chi tiết</a>
            </div>
            """.formatted(escape(job.getTitle()), escape(job.getCompany()),
                escape(orFallback(job.getLocation(), "Chưa cập nhật")),
                escape(formatEmployment(job.getEmploymentType(), job.getRemoteType())),
                matching.getNormalizedScore().doubleValue(), escape(matchLabel(matching.getLabel().name())),
                escape(skillsForEmail(job.getRequiredSkillsJson(), 6)),
                escape(skillsForEmail(matching.getMatchReasonsJson(), 4)),
                applyUrl, goodUrl, potentialUrl, skipUrl, props.getFrontendJobUrl(job.getId()));
    }

    private String jobSummary(com.careerfit.backend.job.entity.Job job, Matching matching) {
        String reasons = matching == null ? "Chưa cập nhật" : skillsForEmail(matching.getMatchReasonsJson(), 4);
        return "<div style=\"margin:16px 0;padding:16px;border:1px solid #334155;border-radius:10px;background:#0f172a;color:#e2e8f0;line-height:1.55;\">"
                + "<strong style=\"color:#93c5fd;font-size:18px;\">" + escape(job.getTitle()) + "</strong><br>"
                + escape(job.getCompany()) + "<br>Địa điểm: " + escape(orFallback(job.getLocation(), "Chưa cập nhật"))
                + "<br>Hình thức: " + escape(formatEmployment(job.getEmploymentType(), job.getRemoteType()))
                + "<br>Lương: " + escape(formatSalary(job))
                + "<br>Kỹ năng: " + escape(skillsForEmail(job.getRequiredSkillsJson(), 6))
                + "<br>Lý do phù hợp: " + escape(reasons) + "</div>";
    }

    private String actionButtons(String firstUrl, String firstLabel, String firstColor,
                                 String secondUrl, String secondLabel, String secondColor) {
        return "<p style=\"margin:18px 0;text-align:center;\"><a href=\"" + firstUrl + "\" style=\"display:inline-block;padding:12px 16px;margin:4px;background:" + firstColor + ";color:#fff;border-radius:8px;text-decoration:none;font-weight:700;\">" + escape(firstLabel) + "</a>"
                + "<a href=\"" + secondUrl + "\" style=\"display:inline-block;padding:12px 16px;margin:4px;background:" + secondColor + ";color:#fff;border-radius:8px;text-decoration:none;font-weight:700;\">" + escape(secondLabel) + "</a></p>";
    }

    private String wrapActionEmail(String title, String subtitle, String greeting, String content) {
        return "<!doctype html><html lang=\"vi\"><meta charset=\"UTF-8\"><body style=\"margin:0;padding:24px;background:#0f172a;font-family:Arial,sans-serif;\"><div style=\"max-width:640px;margin:auto;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px;color:#e2e8f0;\"><h1 style=\"margin:0;color:#fff;font-size:24px;\">" + escape(title) + "</h1><p style=\"color:#bfdbfe;\">" + escape(subtitle) + "</p><p style=\"color:#e2e8f0;\">" + greeting + "</p>" + content + "</div></body></html>";
    }

    private String skillsForEmail(String json, int limit) {
        if (json == null || json.isBlank()) return "Chưa cập nhật";
        try {
            List<String> values = objectMapper.readValue(json, new TypeReference<List<String>>() {});
            String summary = values.stream().filter(value -> value != null && !value.isBlank())
                    .limit(limit).map(String::trim).collect(java.util.stream.Collectors.joining(", "));
            return summary.isBlank() ? "Chưa cập nhật" : summary;
        } catch (Exception ignored) {
            return "Chưa cập nhật";
        }
    }

    private String formatSalary(com.careerfit.backend.job.entity.Job job) {
        if (!job.isSalaryIsVisible() || job.getSalaryMode() == com.careerfit.backend.job.entity.Job.SalaryMode.HIDDEN) return "Không công khai";
        if (job.getSalaryDisplayText() != null && !job.getSalaryDisplayText().isBlank()) return job.getSalaryDisplayText();
        if (job.getSalaryMode() == com.careerfit.backend.job.entity.Job.SalaryMode.NEGOTIABLE) return "Thỏa thuận";
        String currency = orFallback(job.getSalaryCurrency(), "VND");
        if (job.getSalaryMin() != null && job.getSalaryMax() != null) return job.getSalaryMin() + " – " + job.getSalaryMax() + " " + currency;
        if (job.getSalaryMin() != null) return "Từ " + job.getSalaryMin() + " " + currency;
        if (job.getSalaryMax() != null) return "Đến " + job.getSalaryMax() + " " + currency;
        return "Thỏa thuận";
    }

    private String formatEmployment(String employmentType, String remoteType) {
        return orFallback(employmentType, "Chưa cập nhật") + (remoteType == null || remoteType.isBlank() ? "" : " · " + remoteType);
    }

    private String matchLabel(String label) {
        if (label == null) return "Chưa cập nhật";
        return switch (label) {
            case "HIGH" -> "Phù hợp cao";
            case "MEDIUM" -> "Phù hợp trung bình";
            case "LOW" -> "Phù hợp thấp";
            case "POTENTIAL" -> "Tiềm năng";
            default -> label;
        };
    }

    private String orFallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String escape(String value) {
        return HtmlUtils.htmlEscape(orFallback(value, "Chưa cập nhật"));
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
