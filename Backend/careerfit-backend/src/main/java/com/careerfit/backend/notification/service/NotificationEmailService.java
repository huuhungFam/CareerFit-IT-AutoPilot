package com.careerfit.backend.notification.service;

import com.careerfit.backend.application.entity.Application;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.config.AppProperties;
import com.careerfit.backend.job.entity.Job;
import com.careerfit.backend.matching.entity.Matching;
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

    public NotificationEmailService(IMailService mailService,
                                    AppProperties props,
                                    NotificationPolicyGuard notificationPolicyGuard) {
        this.mailService = mailService;
        this.props = props;
        this.notificationPolicyGuard = notificationPolicyGuard;
    }

    // Candidate lifecycle

    public void sendNoMatches(UserAccount candidate, String cvName) {
        String body = paragraph("CareerFit da quet CV cua ban nhung hien chua co JD nao that su phu hop.")
                + paragraph("He thong se tiep tuc theo doi cac JD moi va bao cho ban khi co co hoi tot hon.")
                + infoBox("Ho so dang theo doi", cvName);
        send(candidate, "NO_MATCHES", cvName,
                "CareerFit: Dang cho JD phu hop hon",
                "Dang cho JD phu hop hon", "CareerFit se tiep tuc theo doi co hoi moi cho ban.",
                body, "Cap nhat ho so", appUrl("/candidate/profile"));
    }

    public void sendLowMatches(UserAccount candidate, double bestScore) {
        String body = paragraph("CareerFit da tim thay mot vai JD, nhung diem phu hop hien con thap.")
                + paragraph("Ban co the cap nhat ky nang, kinh nghiem va muc tieu cong viec de he thong goi y chinh xac hon.")
                + infoBox("Diem tot nhat hien tai", String.format("%.0f%%", bestScore));
        send(candidate, "LOW_MATCHES", null,
                "CareerFit: Chua co match du manh",
                "Chua co match du manh", "Hay cap nhat CV de tang do phu hop.",
                body, "Cap nhat CV", appUrl("/candidate/profile"));
    }

    public void sendAfterSkip(UserAccount candidate, Matching matching) {
        if (matching == null) return;
        Job job = matching.getJob();
        String body = paragraph("CareerFit da ghi nhan lua chon bo qua cua ban.")
                + paragraph("Cac goi y tuong tu se duoc giam uu tien, va thuat toan se tiep tuc tim JD phu hop hon.")
                + jobCard(job, matching.getNormalizedScore().doubleValue(), matching.getLabel().name());
        send(candidate, "AFTER_SKIP", matching.getId().toString(),
                "CareerFit: Da ghi nhan feedback bo qua",
                "Da ghi nhan feedback", "He thong se dieu chinh goi y tiep theo.",
                body, "Xem viec khac", appUrl("/candidate/jobs"));
    }

    public void sendApplicationSubmitted(Application app) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Ho so cua ban da duoc gui thanh cong den nha tuyen dung.")
                + paragraph("CareerFit chuc ban may man. Ban co the theo doi trang thai trong lich su ung tuyen.")
                + applicationCard(app);
        send(candidate, "APPLICATION_SUBMITTED", app.getId().toString(),
                "CareerFit: Da gui ho so ung tuyen",
                "Da gui ho so ung tuyen", "Chuc ban may man voi co hoi nay.",
                body, "Xem ung tuyen", appUrl("/candidate/applications"));
    }

    public void sendAutoApplied(Application app) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("AutoPilot da tu dong ung tuyen theo policy ban da bat.")
                + paragraph("Ung tuyen nay dat nguong diem cua ban va da duoc gui den nha tuyen dung.")
                + applicationCard(app);
        send(candidate, "AUTO_APPLIED", app.getId().toString(),
                "CareerFit AutoPilot: Da tu dong ung tuyen",
                "AutoPilot da ung tuyen", "Ho so da duoc gui theo policy cua ban.",
                body, "Xem ung tuyen", appUrl("/candidate/applications"));
    }

    public void sendApplicationWithdrawn(Application app) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Ban da rut ho so khoi vi tri nay.")
                + paragraph("CareerFit se tiep tuc goi y cac co hoi khac phu hop hon.")
                + applicationCard(app);
        send(candidate, "APPLICATION_WITHDRAWN", app.getId().toString(),
                "CareerFit: Da rut ho so ung tuyen",
                "Da rut ho so", "Ung tuyen nay da duoc cap nhat.",
                body, "Tim viec khac", appUrl("/candidate/jobs"));
    }

    public void sendApplicationApproved(Application app) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Chuc mung, CV cua ban da duoc nha tuyen dung danh gia tich cuc.")
                + paragraph("Hay theo doi email/ung dung de nhan buoc tiep theo tu nha tuyen dung.")
                + applicationCard(app);
        send(candidate, "APPLICATION_APPROVED", app.getId().toString(),
                "CareerFit: CV cua ban da duoc accept",
                "Chuc mung!", "CV cua ban da qua vong loc.",
                body, "Xem chi tiet", appUrl("/candidate/applications"));
    }

    public void sendInterviewInvited(Application app) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Chuc mung, nha tuyen dung da gui loi moi phong van.")
                + paragraph("Hay kiem tra thong tin va phan hoi som de khong bo lo co hoi.")
                + applicationCard(app);
        send(candidate, "INTERVIEW_INVITED", app.getId().toString(),
                "CareerFit: Ban co loi moi phong van",
                "Loi moi phong van", "Nha tuyen dung muon trao doi them voi ban.",
                body, "Xem loi moi", appUrl("/candidate/applications"));
    }

    public void sendApplicationRejected(Application app) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Cam on ban da ung tuyen. Lan nay nha tuyen dung chua chon ho so cua ban.")
                + paragraph("CareerFit se tiep tuc tim cac JD phu hop hon. Ban cung co the cap nhat CV de tang co hoi lan sau.")
                + applicationCard(app);
        send(candidate, "APPLICATION_REJECTED", app.getId().toString(),
                "CareerFit: Cap nhat trang thai ung tuyen",
                "Chua phu hop lan nay", "CareerFit se tiep tuc dong hanh cung ban.",
                body, "Xem goi y khac", appUrl("/candidate/jobs"));
    }

    public void sendInterviewRescheduled(Application app, String scheduleText) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Lich phong van cua ban da duoc cap nhat.")
                + infoBox("Lich moi", blankToDefault(scheduleText, "Vui long xem ghi chu tu nha tuyen dung."))
                + applicationCard(app);
        send(candidate, "INTERVIEW_RESCHEDULED", app.getId().toString(),
                "CareerFit: Lich phong van da thay doi",
                "Lich phong van da thay doi", "Vui long kiem tra lich moi.",
                body, "Xem chi tiet", appUrl("/candidate/applications"));
    }

    public void sendInterviewCancelled(Application app, String reason) {
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Lich phong van cho vi tri nay da bi huy.")
                + infoBox("Ghi chu", blankToDefault(reason, "Nha tuyen dung chua them ly do chi tiet."))
                + paragraph("CareerFit se tiep tuc theo doi va goi y co hoi khac cho ban.")
                + applicationCard(app);
        send(candidate, "INTERVIEW_CANCELLED", app.getId().toString(),
                "CareerFit: Lich phong van da bi huy",
                "Lich phong van da bi huy", "CareerFit da cap nhat trang thai ung tuyen.",
                body, "Xem ung tuyen", appUrl("/candidate/applications"));
    }

    public void sendProfileOrCvNeedsUpdate(UserAccount candidate, String reason) {
        String body = paragraph("CareerFit can them thong tin de goi y JD chinh xac hon.")
                + infoBox("Goi y cap nhat", blankToDefault(reason, "Bo sung ky nang, kinh nghiem va muc tieu cong viec moi nhat."))
                + paragraph("CV cang ro ve stack, level va domain mong muon thi diem matching cang on dinh.");
        send(candidate, "PROFILE_CV_NEEDS_UPDATE", reason,
                "CareerFit: Hay cap nhat CV de co match tot hon",
                "Can cap nhat CV", "Bo sung thong tin de he thong goi y dung hon.",
                body, "Cap nhat CV", appUrl("/candidate/profile"));
    }

    public void sendNewHighMatchFound(UserAccount candidate, Matching matching) {
        Job job = matching.getJob();
        String body = paragraph("CareerFit vua tim thay mot JD co diem phu hop cao voi ho so cua ban.")
                + jobCard(job, matching.getNormalizedScore().doubleValue(), matching.getLabel().name());
        send(candidate, "NEW_HIGH_MATCH", matching.getId().toString(),
                "CareerFit: Co JD moi phu hop cao",
                "Co JD moi phu hop cao", "Hay xem chi tiet va quyet dinh buoc tiep theo.",
                body, "Xem JD", appUrl("/jobs/" + job.getId()));
    }

    public void sendDigestSummary(UserAccount candidate, int newJobs, int applied, int skipped) {
        String body = paragraph("Day la tom tat hoat dong CareerFit gan day cua ban.")
                + infoBox("JD moi", String.valueOf(newJobs))
                + infoBox("Da ung tuyen", String.valueOf(applied))
                + infoBox("Da bo qua", String.valueOf(skipped));
        send(candidate, "DIGEST_SUMMARY", null,
                "CareerFit: Tong hop hoat dong",
                "Tong hop hoat dong", "Cac cap nhat moi tu CareerFit.",
                body, "Mo CareerFit", appUrl("/candidate"));
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
        String body = paragraph("Ban vua nhan duoc mot ho so ung tuyen moi.")
                + infoBox("Ung vien", displayName(candidate))
                + applicationCard(app);
        send(recruiter, "RECRUITER_NEW_APPLICATION", app.getId().toString(),
                "CareerFit: Co ung vien moi ung tuyen",
                "Ung vien moi", "Mot candidate vua ung tuyen vao JD cua ban.",
                body, "Xem applicants", appUrl("/recruiter/jobs/" + app.getJob().getId() + "/applicants"));
    }

    public void sendRecruiterHighMatchCandidateFound(UserAccount recruiter, Matching matching) {
        UserAccount candidate = matching.getCv().getCandidate().getUser();
        String body = paragraph("CareerFit tim thay mot candidate diem cao cho JD cua ban.")
                + infoBox("Candidate", displayName(candidate))
                + jobCard(matching.getJob(), matching.getNormalizedScore().doubleValue(), matching.getLabel().name());
        send(recruiter, "RECRUITER_HIGH_MATCH", matching.getId().toString(),
                "CareerFit: Candidate diem cao cho JD cua ban",
                "Candidate diem cao", "Hay xem ho so va quyet dinh loi moi.",
                body, "Xem ranking", appUrl("/recruiter/jobs/" + matching.getJob().getId() + "/applicants"));
    }

    public void sendRecruiterCandidateRespondedToInvite(Application app, String response) {
        UserAccount recruiter = app.getJob().getRecruiter();
        UserAccount candidate = app.getCandidate().getUser();
        String body = paragraph("Candidate da phan hoi loi moi cua ban.")
                + infoBox("Candidate", displayName(candidate))
                + infoBox("Phan hoi", blankToDefault(response, app.getStatus().name()))
                + applicationCard(app);
        send(recruiter, "RECRUITER_INVITE_RESPONSE", app.getId().toString(),
                "CareerFit: Candidate da phan hoi loi moi",
                "Candidate da phan hoi", "Loi moi cua ban da co cap nhat.",
                body, "Xem applicants", appUrl("/recruiter/jobs/" + app.getJob().getId() + "/applicants"));
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
        return """
            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;background:#0f172a;border:1px solid #334155;border-radius:12px;border-collapse:separate;margin:14px 0;">
              <tr><td style="padding:18px;">
                <h2 style="color:#93c5fd;margin:0 0 8px;font-size:18px;line-height:1.35;font-weight:700;">%s</h2>
                <p style="color:#cbd5e1;margin:0 0 12px;font-size:14px;line-height:1.4;">%s</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td bgcolor="#22c55e" style="background:#22c55e;border-radius:999px;padding:5px 12px;color:#ffffff;font-size:13px;font-weight:700;line-height:1;">%s</td>
                    <td style="padding-left:10px;color:#94a3b8;font-size:13px;line-height:1.4;">%.0f%% phu hop</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            """.formatted(esc(job.getTitle()), esc(job.getCompany()), esc(label), score);
    }

    private String applicationCard(Application app) {
        Job job = app.getJob();
        return infoBox("Vi tri", job.getTitle())
                + infoBox("Cong ty", job.getCompany())
                + infoBox("Trang thai", app.getStatus().name());
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
        String base = props.getBaseUrl();
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        if (!path.startsWith("/")) path = "/" + path;
        return base + path;
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
