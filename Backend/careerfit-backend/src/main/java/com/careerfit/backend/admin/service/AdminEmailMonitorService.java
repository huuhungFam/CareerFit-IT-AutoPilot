package com.careerfit.backend.admin.service;

import com.careerfit.backend.admin.dto.AdminEmailResponse;
import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.common.exception.AppException;
import com.careerfit.backend.notification.entity.EmailAction;
import com.careerfit.backend.notification.repository.EmailActionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AdminEmailMonitorService {

    private final EmailActionRepository emailActionRepo;
    private final AuditLogRepository auditRepo;

    public AdminEmailMonitorService(EmailActionRepository emailActionRepo,
                                    AuditLogRepository auditRepo) {
        this.emailActionRepo = emailActionRepo;
        this.auditRepo = auditRepo;
    }

    public Page<AdminEmailResponse.EmailActionSummary> getEmailActions(Pageable pageable) {
        return emailActionRepo.findAll(pageable)
                .map(a -> new AdminEmailResponse.EmailActionSummary(
                        a.getId(),
                        "ACT-" + a.getId().toString().substring(0, 8), // Redacted
                        a.getRecipient() != null ? a.getRecipient().getEmail() : "UNKNOWN",
                        a.getActionType().name(),
                        a.getStatus().name(),
                        a.getExpiresAt(),
                        a.getRedeemedAt(),
                        a.getCreatedAt()
                ));
    }

    @Transactional
    public void retryEmailAction(UUID actionId, UUID adminId) {
        EmailAction action = emailActionRepo.findById(actionId)
                .orElseThrow(() -> AppException.notFound("EmailAction", actionId));
        
        action.setStatus(EmailAction.ActionStatus.PENDING);
        emailActionRepo.save(action);

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, adminId, "MARK_EMAIL_ACTION_PENDING")
                .withTarget("EMAIL_ACTION", actionId)
                .withChannel(AuditLog.SourceChannel.WEB)
                .withResult(AuditLog.Result.SUCCESS));
    }

}
