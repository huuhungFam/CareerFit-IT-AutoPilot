package com.careerfit.backend.notification.service;

import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.config.AppProperties;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.matching.entity.Matching;
import com.careerfit.backend.cv.entity.CV;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.util.List;

/**
 * Sends user-facing lifecycle emails with mobile-safe HTML.
 *
 * These messages are intentionally separate from one-click feedback emails:
 * - EmailActionService owns tokenized feedback/digest emails.
 * - NotificationEmailService owns application and lifecycle status emails.
 */
@Service
public class NotificationEmailService {
    public java.util.Collection<com.careerfit.backend.notification.dto.EmailSample> buildSampleCatalog() { return java.util.List.of(); }

    private static final Logger log = LoggerFactory.getLogger(NotificationEmailService.class);

    private final IMailService mailService;
    private final AppProperties props;
    private final NotificationPolicyGuard notificationPolicyGuard;
    private final ObjectMapper objectMapper;

    public NotificationEmailService(IMailService mailService,
                                    AppProperties props,
                                    NotificationPolicyGuard notificationPolicyGuard,
                                    ObjectMapper objectMapper) {
        this.mailService = mailService;
        this.props = props;
        this.notificationPolicyGuard = notificationPolicyGuard;
        this.objectMapper = objectMapper;
    }

    // Candidate lifecycle

    public void sendNoMatches(UserAccount candidate, String cvName) {
        String body = paragraph("CareerFit đã quét CV của bạn nhưng hiện chưa có JD nào thật sự phù hợp.")
                + paragraph("Hệ thống sẽ tiếp tục theo dõi các JD mới và báo cho bạn khi có cơ hội tốt hơn.")
                + infoBox("Hồ sơ đang theo dõi", cvName);
        send(candidate, "NO_MATCHES", cvName,
                "CareerFit: Đang chờ JD phù hợp hơn",
                "Đang chờ JD phù hợp hơn", "CareerFit sẽ tiếp tục theo dõi cơ hội mới cho bạn.",
                body, "Cập nhật hồ sơ", appUrl("/candidate/profile"));
    }

    public void sendLowMatches(UserAccount candidate, double bestScore) {
        String body = paragraph("CareerFit đã tìm thấy một vài JD, nhưng điểm phù hợp hiện còn thấp.")
                + paragraph("Bạn có thể cập nhật kỹ năng, kinh nghiệm và mục tiêu công việc để hệ thống gợi ý chính xác hơn.")
                + infoBox("Điểm tốt nhất hiện tại", String.format("%.0f%%", bestScore));
        send(candidate, "LOW_MATCHES", null,
                "CareerFit: Chưa có match đủ mạnh",
                "Chưa có match đủ mạnh", "Hãy cập nhật CV để tăng độ phù hợp.",
                body, "Cập nhật CV", appUrl("/candidate/profile"));
    }

    public void sendAfterSkip(UserAccount candidate, Matching matching) {
        if (matching == null) return;
        Job job = matching.getJob();
        String body = paragraph("CareerFit đã ghi nhận lựa chọn bỏ qua của bạn.")
                + paragraph("Các gợi ý tương tự sẽ được giảm ưu tiên, và thuật toán sẽ tiếp tục tìm JD phù hợp hơn.")
                + jobCard(job, matching.getNormalizedScore().doubleValue(), matching.getLabel().name());
        send(candidate, "AFTER_SKIP", matching.getId().toString(),
                "CareerFit: Đã ghi nhận phản hồi bỏ qua",
                "Đã ghi nhận phản hồi", "Hệ thống sẽ điều chỉnh gợi ý tiếp theo.",
                body, "Xem việc khác", appUrl("/candidate/jobs"));
    }

    public void sendApplicationSubmitted(Application app) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Hồ sơ của bạn đã được gửi thành công đến nhà tuyển dụng.")
                + paragraph("CareerFit chúc bạn may mắn. Bạn có thể theo dõi trạng thái trong lịch sử ứng tuyển.")
                + applicationCard(app);
        send(candidate, "APPLICATION_SUBMITTED", app.getId().toString(),
                "CareerFit: Đã gửi hồ sơ ứng tuyển",
                "Đã gửi hồ sơ ứng tuyển", "Chúc bạn may mắn với cơ hội này.",
                body, "Xem ứng tuyển", appUrl("/candidate/applications"));
    }

    public void sendAutoApplied(Application app) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("AutoPilot đã tự động ứng tuyển theo chính sách bạn đã bật.")
                + paragraph("Ứng tuyển này đạt ngưỡng điểm của bạn và đã được gửi đến nhà tuyển dụng.")
                + applicationCard(app);
        send(candidate, "AUTO_APPLIED", app.getId().toString(),
                "CareerFit AutoPilot: Đã tự động ứng tuyển",
                "AutoPilot đã ứng tuyển", "Hồ sơ đã được gửi theo chính sách của bạn.",
                body, "Xem ứng tuyển", appUrl("/candidate/applications"));
    }

    public void sendApplicationWithdrawn(Application app) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Bạn đã rút hồ sơ khỏi vị trí này.")
                + paragraph("CareerFit sẽ tiếp tục gợi ý các cơ hội khác phù hợp hơn.")
                + applicationCard(app);
        send(candidate, "APPLICATION_WITHDRAWN", app.getId().toString(),
                "CareerFit: Đã rút hồ sơ ứng tuyển",
                "Đã rút hồ sơ", "Ứng tuyển này đã được cập nhật.",
                body, "Tìm việc khác", appUrl("/candidate/jobs"));
    }

    public void sendInvitationWithdrawn(Application app) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Nhà tuyển dụng đã rút lời mời ứng tuyển cho vị trí này.")
                + paragraph("Lời mời sẽ không còn hiện trong danh sách ứng tuyển của bạn.")
                + applicationCard(app);
        send(candidate, "INVITATION_WITHDRAWN", app.getId().toString(),
                "CareerFit: Lời mời tuyển dụng đã được rút lại",
                "Lời mời đã được rút lại", "Bạn có thể tiếp tục khám phá các cơ hội khác.",
                body, "Tìm việc khác", appUrl("/candidate/jobs"));
    }

    public void sendApplicationApproved(Application app) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Chúc mừng, CV của bạn đã được nhà tuyển dụng đánh giá tích cực.")
                + paragraph("Hãy theo dõi email/ứng dụng để nhận bước tiếp theo từ nhà tuyển dụng.")
                + applicationCard(app);
        send(candidate, "APPLICATION_APPROVED", app.getId().toString(),
                "CareerFit: CV của bạn đã được chấp nhận",
                "Chúc mừng!", "CV của bạn đã qua vòng lọc.",
                body, "Xem chi tiết", appUrl("/candidate/applications"));
    }

    public void sendInterviewInvited(Application app) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Chúc mừng, nhà tuyển dụng đã gửi lời mời phỏng vấn.")
                + paragraph("Hãy kiểm tra thông tin và phản hồi sớm để không bỏ lỡ cơ hội.")
                + applicationCard(app);
        send(candidate, "INTERVIEW_INVITED", app.getId().toString(),
                "CareerFit: Bạn có lời mời phỏng vấn",
                "Lời mời phỏng vấn", "Nhà tuyển dụng muốn trao đổi thêm với bạn.",
                body, "Xem lời mời", appUrl("/candidate/applications"));
    }

    public void sendApplicationRejected(Application app) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Cảm ơn bạn đã ứng tuyển. Lần này nhà tuyển dụng chưa chọn hồ sơ của bạn.")
                + paragraph("CareerFit sẽ tiếp tục tìm các JD phù hợp hơn. Bạn cũng có thể cập nhật CV để tăng cơ hội lần sau.")
                + applicationCard(app);
        send(candidate, "APPLICATION_REJECTED", app.getId().toString(),
                "CareerFit: Cập nhật trạng thái ứng tuyển",
                "Chưa phù hợp lần này", "CareerFit sẽ tiếp tục đồng hành cùng bạn.",
                body, "Xem gợi ý khác", appUrl("/candidate/jobs"));
    }

    public void sendInterviewRescheduled(Application app, String scheduleText) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Lịch phỏng vấn của bạn đã được cập nhật.")
                + infoBox("Lịch mới", blankToDefault(scheduleText, "Vui lòng xem ghi chú từ nhà tuyển dụng."))
                + applicationCard(app);
        send(candidate, "INTERVIEW_RESCHEDULED", app.getId().toString(),
                "CareerFit: Lịch phỏng vấn đã thay đổi",
                "Lịch phỏng vấn đã thay đổi", "Vui lòng kiểm tra lịch mới.",
                body, "Xem chi tiết", appUrl("/candidate/applications"));
    }

    public void sendInterviewCancelled(Application app, String reason) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Lịch phỏng vấn cho vị trí này đã bị hủy.")
                + infoBox("Ghi chú", blankToDefault(reason, "Nhà tuyển dụng chưa thêm lý do chi tiết."))
                + paragraph("CareerFit sẽ tiếp tục theo dõi và gợi ý cơ hội khác cho bạn.")
                + applicationCard(app);
        send(candidate, "INTERVIEW_CANCELLED", app.getId().toString(),
                "CareerFit: Lịch phỏng vấn đã bị hủy",
                "Lịch phỏng vấn đã bị hủy", "CareerFit đã cập nhật trạng thái ứng tuyển.",
                body, "Xem ứng tuyển", appUrl("/candidate/applications"));
    }

    public void sendProfileOrCvNeedsUpdate(UserAccount candidate, String reason) {
        String body = paragraph("CareerFit cần thêm thông tin để gợi ý JD chính xác hơn.")
                + infoBox("Gợi ý cập nhật", blankToDefault(reason, "Bổ sung kỹ năng, kinh nghiệm và mục tiêu công việc mới nhất."))
                + paragraph("CV càng rõ về stack, level và domain mong muốn thì điểm matching càng ổn định.");
        send(candidate, "PROFILE_CV_NEEDS_UPDATE", reason,
                "CareerFit: Hãy cập nhật CV để có match tốt hơn",
                "Cần cập nhật CV", "Bổ sung thông tin để hệ thống gợi ý đúng hơn.",
                body, "Cập nhật CV", appUrl("/candidate/profile"));
    }

    public void sendNewHighMatchFound(UserAccount candidate, Matching matching) {
        Job job = matching.getJob();
        String body = paragraph("CareerFit vừa tìm thấy một JD có điểm phù hợp cao với hồ sơ của bạn.")
                + jobCard(job, matching.getNormalizedScore().doubleValue(), matching.getLabel().name());
        send(candidate, "NEW_HIGH_MATCH", matching.getId().toString(),
                "CareerFit: Có JD mới phù hợp cao",
                "Có JD mới phù hợp cao", "Hãy xem chi tiết và quyết định bước tiếp theo.",
                body, "Xem JD", appUrl("/jobs/" + job.getId()));
    }

    public void sendDigestSummary(UserAccount candidate, int newJobs, int applied, int skipped) {
        String body = paragraph("Đây là tóm tắt hoạt động CareerFit gần đây của bạn.")
                + infoBox("JD mới", String.valueOf(newJobs))
                + infoBox("Đã ứng tuyển", String.valueOf(applied))
                + infoBox("Đã bỏ qua", String.valueOf(skipped));
        send(candidate, "DIGEST_SUMMARY", null,
                "CareerFit: Tổng hợp hoạt động",
                "Tổng hợp hoạt động", "Các cập nhật mới từ CareerFit.",
                body, "Mở CareerFit", appUrl("/candidate"));
    }

    public void sendApplicationStatusChanged(Application app) {
        switch (app.getStatus()) {
            case APPROVED -> sendApplicationApproved(app);
            case REJECTED -> sendApplicationRejected(app);
            case INVITED -> sendInterviewInvited(app);
            case AUTO_APPLIED -> sendAutoApplied(app);
            case NOT_INTERESTED -> sendApplicationWithdrawn(app);
            case INTERVIEW_RESCHEDULED -> sendInterviewRescheduled(app, app.getRecruiterNotes());
            case INTERVIEW_CANCELLED -> sendInterviewCancelled(app, app.getRecruiterNotes());
            case PENDING -> { /* no lifecycle email; submit flow handles the initial message */ }
        }
    }

    // Recruiter lifecycle

    public void sendRecruiterNewApplication(Application app) {
        UserAccount recruiter = app.getJob().getRecruiter();
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Bạn vừa nhận được một hồ sơ ứng tuyển mới.")
                + infoBox("Ứng viên", displayName(candidate))
                + candidateCvSnapshot(app.getCv())
                + applicationCard(app);
        send(recruiter, "RECRUITER_NEW_APPLICATION", app.getId().toString(),
                "CareerFit: Có ứng viên mới ứng tuyển",
                "Ứng viên mới", "Một ứng viên vừa ứng tuyển vào JD của bạn.",
                body, "Xem ứng viên", appUrl("/recruiter/jobs/" + app.getJob().getId() + "/applicants"));
    }

    public void sendRecruiterHighMatchCandidateFound(UserAccount recruiter, Matching matching) {
        UserAccount candidate = matching.getCv().getCandidate().getUser();
        String body = paragraph("CareerFit tìm thấy một ứng viên có điểm cao cho JD của bạn.")
                + infoBox("Ứng viên", displayName(candidate))
                + jobCard(matching.getJob(), matching.getNormalizedScore().doubleValue(), matching.getLabel().name());
        send(recruiter, "RECRUITER_HIGH_MATCH", matching.getId().toString(),
                "CareerFit: Ứng viên điểm cao cho JD của bạn",
                "Ứng viên điểm cao", "Hãy xem hồ sơ và quyết định lời mời.",
                body, "Xem xếp hạng", appUrl("/recruiter/jobs/" + matching.getJob().getId() + "/applicants"));
    }

    public void sendRecruiterCandidateRespondedToInvite(Application app, String response) {
        UserAccount recruiter = app.getJob().getRecruiter();
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Ứng viên đã phản hồi lời mời của bạn.")
                + infoBox("Ứng viên", displayName(candidate))
                + infoBox("Phản hồi", blankToDefault(response, applicationStatusLabel(app.getStatus())))
                + candidateCvSnapshot(app.getCv())
                + applicationCard(app);
        send(recruiter, "RECRUITER_INVITE_RESPONSE", app.getId().toString(),
                "CareerFit: Ứng viên đã phản hồi lời mời",
                "Ứng viên đã phản hồi", "Lời mời của bạn đã có cập nhật.",
                body, "Xem ứng viên", appUrl("/recruiter/jobs/" + app.getJob().getId() + "/applicants"));
    }

    public void sendRecruiterCandidateFeedback(Matching matching, String response) {
        if (matching == null) return;
        UserAccount recruiter = matching.getJob().getRecruiter();
        UserAccount candidate = matching.getCv().getCandidate().getUser();
        String body = paragraph("Ứng viên đã phản hồi từ email matching.")
                + infoBox("Ứng viên", displayName(candidate))
                + infoBox("Phản hồi", blankToDefault(response, "MATCH_RESPONSE"))
                + candidateCvSnapshot(matching.getCv())
                + jobCard(matching.getJob(), matching.getNormalizedScore().doubleValue(), matching.getLabel().name());
        send(recruiter, "RECRUITER_MATCH_FEEDBACK", matching.getId() + ":" + response,
                "CareerFit: Ứng viên đã phản hồi matching",
                "Ứng viên đã phản hồi", "Xem bản chụp CV và xếp hạng trong CareerFit.",
                body, "Xem xếp hạng", appUrl("/recruiter/jobs/" + matching.getJob().getId() + "/applicants"));
    }

    // HTML helpers

    private void send(UserAccount recipient, String emailType, String contextKey,
                      String subject, String title, String preheader,
                      String bodyHtml, String primaryLabel, String primaryUrl) {
        String to = recipient != null ? recipient.getEmail() : null;
        if (to == null || to.isBlank()) return;
        var decision = notificationPolicyGuard.evaluate(recipient, emailType, contextKey);
        if (!decision.allowed()) {
            notificationPolicyGuard.logSkipped(recipient, emailType, contextKey, decision.reason());
            log.info("Skipping lifecycle email type={} user={} reason={}",
                    emailType, recipient.getId(), decision.reason());
            return;
        }
        try {
            mailService.sendHtml(to, subject, layout(title, preheader,
                    bodyHtml + button(primaryLabel, primaryUrl)));
            notificationPolicyGuard.logSent(recipient, emailType, contextKey);
        } catch (Exception e) {
            notificationPolicyGuard.logFailed(recipient, emailType, contextKey, e.getMessage());
            log.error("Lifecycle email failed to {} subject={}: {}", to, subject, e.getMessage());
        }
    }

    private String layout(String title, String preheader, String bodyHtml) {
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta name="color-scheme" content="light dark">
              <meta name="supported-color-schemes" content="light dark">
              <title>%s</title>
              <style>
                @media only screen and (max-width: 480px) {
                  .email-shell { width: 100%% !important; border-radius: 12px !important; }
                  .email-outer { padding: 14px !important; }
                  .email-pad { padding: 22px 20px !important; }
                  .email-title { font-size: 22px !important; line-height: 1.25 !important; }
                  .email-copy { font-size: 15px !important; line-height: 1.55 !important; }
                  .primary-button { display: block !important; width: 100%% !important; box-sizing: border-box !important; }
                }
              </style>
            </head>
            <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
            <div style="display:none;max-height:0;overflow:hidden;color:transparent;">%s</div>
            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;background:#0f172a;border-collapse:collapse;">
              <tr>
                <td class="email-outer" align="center" style="padding:20px;">
                  <table role="presentation" class="email-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#1e293b;border:1px solid #334155;border-radius:16px;overflow:hidden;border-collapse:separate;">
                    <tr>
                      <td class="email-pad" bgcolor="#4f46e5" style="background:#4f46e5;padding:32px;text-align:center;">
                        <h1 class="email-title" style="color:#ffffff;margin:0;font-size:24px;line-height:1.3;font-weight:700;">%s</h1>
                        <p style="color:#dbeafe;margin:8px 0 0;font-size:14px;line-height:1.45;">%s</p>
                      </td>
                    </tr>
                    <tr>
                      <td class="email-pad" bgcolor="#1e293b" style="background:#1e293b;padding:32px;color:#e2e8f0;">
                        %s
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            </body></html>
            """.formatted(esc(title), esc(preheader), esc(title), esc(preheader), bodyHtml);
    }

    private String paragraph(String text) {
        return """
            <p class="email-copy" style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#cbd5e1;">%s</p>
            """.formatted(esc(text));
    }

    private String infoBox(String label, String value) {
        return """
            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;background:#0f172a;border:1px solid #334155;border-radius:10px;border-collapse:separate;margin:10px 0;">
              <tr><td style="padding:16px;">
                <p style="margin:0 0 5px;color:#94a3b8;font-size:12px;line-height:1.4;text-transform:uppercase;letter-spacing:.04em;">%s</p>
                <strong style="display:block;color:#ffffff;font-size:16px;line-height:1.4;">%s</strong>
              </td></tr>
            </table>
            """.formatted(esc(label), esc(value));
    }

    private String jobCard(Job job, double score, String label) {
        String skills = skillsForEmail(job.getRequiredSkillsJson(), 6);
        return """
            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;background:#0f172a;border:1px solid #334155;border-radius:12px;border-collapse:separate;margin:14px 0;">
              <tr><td style="padding:18px;">
                <h2 style="color:#93c5fd;margin:0 0 8px;font-size:18px;line-height:1.35;font-weight:700;">%s</h2>
                <p style="color:#cbd5e1;margin:0 0 12px;font-size:14px;line-height:1.4;">%s</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td bgcolor="#22c55e" style="background:#22c55e;border-radius:999px;padding:5px 12px;color:#ffffff;font-size:13px;font-weight:700;line-height:1;">%s</td>
                    <td style="padding-left:10px;color:#94a3b8;font-size:13px;line-height:1.4;">%.0f%% phù hợp</td>
                  </tr>
                </table>
                %s
              </td></tr>
            </table>
            """.formatted(esc(job.getTitle()), esc(job.getCompany()), esc(matchLabel(label)), score,
                jobFacts(job, skills));
    }

    private String applicationCard(Application app) {
        Job job = app.getJob();
        return infoBox("Vị trí", job.getTitle())
                + infoBox("Công ty", job.getCompany())
                + infoBox("Trạng thái", applicationStatusLabel(app.getStatus()))
                + jobFacts(job, skillsForEmail(job.getRequiredSkillsJson(), 6));
    }

    private String candidateCvSnapshot(CV cv) {
        if (cv == null) return infoBox("CV", "Chưa cập nhật");
        String skills = "Chưa cập nhật";
        try {
            List<String> values = objectMapper.readValue(cv.getTopSkillsJson(), new TypeReference<List<String>>() {});
            skills = values.stream().filter(value -> value != null && !value.isBlank()).limit(6)
                    .collect(java.util.stream.Collectors.joining(", "));
        } catch (Exception ignored) { }
        return infoBox("CV sử dụng", cv.getDisplayName())
                + infoBox("Kỹ năng nổi bật", blankToDefault(skills, "Chưa cập nhật"))
                + infoBox("Tóm tắt CV", blankToDefault(cv.getParsedSummary(), "Chưa cập nhật"));
    }

    private String skillsForEmail(String json, int limit) {
        if (json == null || json.isBlank()) return "Chưa cập nhật";
        try {
            List<String> values = objectMapper.readValue(json, new TypeReference<List<String>>() {});
            String skills = values.stream().filter(value -> value != null && !value.isBlank()).limit(limit)
                    .map(String::trim).collect(java.util.stream.Collectors.joining(", "));
            return blankToDefault(skills, "Chưa cập nhật");
        } catch (Exception ignored) {
            return "Chưa cập nhật";
        }
    }

    private String formatEmployment(Job job) {
        String employment = blankToDefault(job.getEmploymentType(), "Chưa cập nhật");
        return job.getRemoteType() == null || job.getRemoteType().isBlank()
                ? employment : employment + " · " + job.getRemoteType();
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

    private String applicationStatusLabel(Application.ApplicationStatus status) {
        if (status == null) return "Chưa cập nhật";
        return switch (status) {
            case PENDING -> "Đang chờ xử lý";
            case AUTO_APPLIED -> "Đã tự động ứng tuyển";
            case APPROVED -> "Đã được chấp nhận";
            case REJECTED -> "Chưa được chọn";
            case INVITED -> "Đã nhận lời mời ứng tuyển";
            case NOT_INTERESTED -> "Đã rút hoặc từ chối";
            case INTERVIEW_RESCHEDULED -> "Lịch phỏng vấn đã thay đổi";
            case INTERVIEW_CANCELLED -> "Lịch phỏng vấn đã bị hủy";
        };
    }

    private String formatSalary(Job job) {
        if (!job.isSalaryIsVisible() || job.getSalaryMode() == Job.SalaryMode.HIDDEN) return "Không công khai";
        if (job.getSalaryDisplayText() != null && !job.getSalaryDisplayText().isBlank()) return job.getSalaryDisplayText();
        if (job.getSalaryMode() == Job.SalaryMode.NEGOTIABLE) return "Thỏa thuận";
        String currency = blankToDefault(job.getSalaryCurrency(), "VND");
        if (job.getSalaryMin() != null && job.getSalaryMax() != null) return job.getSalaryMin() + " – " + job.getSalaryMax() + " " + currency;
        if (job.getSalaryMin() != null) return "Từ " + job.getSalaryMin() + " " + currency;
        if (job.getSalaryMax() != null) return "Đến " + job.getSalaryMax() + " " + currency;
        return "Thỏa thuận";
    }

    private String jobFacts(Job job, String skills) {
        return "<p style=\"color:#cbd5e1;margin:14px 0 0;font-size:13px;line-height:1.55;\">"
                + "Địa điểm: " + esc(blankToDefault(job.getLocation(), "Chưa cập nhật")) + "<br>"
                + "Hình thức: " + esc(formatEmployment(job)) + "<br>"
                + "Lương: " + esc(formatSalary(job)) + "<br>"
                + "Kỹ năng yêu cầu: " + esc(skills) + "</p>";
    }

    private String button(String label, String url) {
        return """
            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;border-collapse:collapse;margin-top:22px;">
              <tr><td align="center">
                <a class="primary-button" href="%s" style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;line-height:1.2;padding:13px 26px;border-radius:8px;">%s</a>
              </td></tr>
            </table>
            """.formatted(esc(url), esc(label));
    }

    private String appUrl(String path) {
        return props.getFrontendUrl(path);
    }

    private String displayName(UserAccount user) {
        return user.getFullName() != null && !user.getFullName().isBlank()
                ? user.getFullName()
                : user.getEmail();
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String esc(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }

    @SuppressWarnings("unused")
    private String listItems(List<String> items) {
        if (items == null || items.isEmpty()) return "";
        StringBuilder builder = new StringBuilder("<ul style=\"margin:0 0 16px;padding-left:20px;color:#cbd5e1;\">");
        for (String item : items) {
            builder.append("<li style=\"margin:0 0 6px;\">").append(esc(item)).append("</li>");
        }
        builder.append("</ul>");
        return builder.toString();
    }
}
