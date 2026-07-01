package com.careerfit.backend.admin.service;

import com.careerfit.backend.audit.entity.AuditLog;
import com.careerfit.backend.audit.repository.AuditLogRepository;
import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.auth.repository.UserAccountRepository;
import com.careerfit.backend.common.exception.AppException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AdminUserService {

    private final UserAccountRepository userRepo;
    private final AuditLogRepository auditRepo;

    public AdminUserService(UserAccountRepository userRepo, AuditLogRepository auditRepo) {
        this.userRepo = userRepo;
        this.auditRepo = auditRepo;
    }

    public Page<UserAccount> searchUsers(String roleStr, String statusStr, String keyword, Pageable pageable) {
        UserAccount.Role role = null;
        if (roleStr != null && !roleStr.isBlank()) {
            try { role = UserAccount.Role.valueOf(roleStr.toUpperCase()); } catch (IllegalArgumentException ignored) {}
        }
        
        Boolean isActive = null;
        if ("ACTIVE".equalsIgnoreCase(statusStr)) isActive = true;
        else if ("SUSPENDED".equalsIgnoreCase(statusStr)) isActive = false;
        
        return userRepo.searchUsers(role, isActive, keyword, pageable);
    }

    public UserAccount getUserById(UUID userId) {
        return userRepo.findById(userId).orElseThrow(() -> AppException.notFound("User", userId));
    }

    @Transactional
    public void suspendUser(UUID userId, UUID adminId) {
        if (userId.equals(adminId)) {
            throw AppException.badRequest("Admin cannot suspend themselves");
        }
        var user = getUserById(userId);
        user.setActive(false);
        userRepo.save(user);

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, adminId, "USER_SUSPENDED")
                .withTarget("USER", userId)
                .withChannel(AuditLog.SourceChannel.WEB)
                .withResult(AuditLog.Result.SUCCESS));
    }

    @Transactional
    public void activateUser(UUID userId, UUID adminId) {
        var user = getUserById(userId);
        user.setActive(true);
        userRepo.save(user);

        auditRepo.save(new AuditLog(AuditLog.ActorType.USER, adminId, "USER_ACTIVATED")
                .withTarget("USER", userId)
                .withChannel(AuditLog.SourceChannel.WEB)
                .withResult(AuditLog.Result.SUCCESS));
    }
}
