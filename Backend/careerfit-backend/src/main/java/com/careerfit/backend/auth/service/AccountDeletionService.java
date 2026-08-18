package com.careerfit.backend.auth.service;

import com.careerfit.backend.auth.entity.UserAccount;
import com.careerfit.backend.common.util.StorageService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.UUID;

/** Removes account-owned data before deleting the user row and releasing its email address. */
@Service
public class AccountDeletionService {

    private final JdbcTemplate jdbcTemplate;
    private final StorageService storageService;

    public AccountDeletionService(JdbcTemplate jdbcTemplate, StorageService storageService) {
        this.jdbcTemplate = jdbcTemplate;
        this.storageService = storageService;
    }

    @Transactional
    public void delete(UserAccount user) {
        UUID userId = user.getId();
        List<String> storedFiles = findStoredCvFiles(userId);

        if (user.getRole() == UserAccount.Role.CANDIDATE) {
            deleteCandidateContent(userId);
        } else if (user.getRole() == UserAccount.Role.RECRUITER) {
            deleteRecruiterContent(userId);
        }

        deleteAccountReferences(userId);
        int deleted = jdbcTemplate.update("DELETE FROM user_account WHERE id = ?", userId);
        if (deleted != 1) {
            throw new IllegalStateException("Expected one account to be deleted");
        }

        deleteFilesAfterCommit(storedFiles);
    }

    private List<String> findStoredCvFiles(UUID userId) {
        return jdbcTemplate.queryForList("""
                SELECT cv.file_path
                FROM cv
                JOIN candidate ON candidate.id = cv.candidate_id
                WHERE candidate.user_id = ? AND cv.file_path IS NOT NULL
                """, String.class, userId);
    }

    private void deleteCandidateContent(UUID userId) {
        deleteReportsForTarget("CV", "SELECT id FROM cv WHERE candidate_id IN (SELECT id FROM candidate WHERE user_id = ?)", userId);
        deleteEmailActionsForTarget("CV", "SELECT id FROM cv WHERE candidate_id IN (SELECT id FROM candidate WHERE user_id = ?)", userId);
        deleteOutboxForMatching("SELECT id FROM matching WHERE cv_id IN (SELECT id FROM cv WHERE candidate_id IN (SELECT id FROM candidate WHERE user_id = ?))", userId);
        jdbcTemplate.update("DELETE FROM application WHERE candidate_id IN (SELECT id FROM candidate WHERE user_id = ?)", userId);
        jdbcTemplate.update("DELETE FROM recommendation_interaction WHERE candidate_id IN (SELECT id FROM candidate WHERE user_id = ?)", userId);
    }

    private void deleteRecruiterContent(UUID userId) {
        deleteReportsForTarget("JOB", "SELECT id FROM job WHERE recruiter_id = ?", userId);
        deleteEmailActionsForTarget("JOB", "SELECT id FROM job WHERE recruiter_id = ?", userId);
        deleteOutboxForMatching("SELECT id FROM matching WHERE job_id IN (SELECT id FROM job WHERE recruiter_id = ?)", userId);
        jdbcTemplate.update("DELETE FROM application WHERE job_id IN (SELECT id FROM job WHERE recruiter_id = ?)", userId);
        jdbcTemplate.update("DELETE FROM recommendation_interaction WHERE job_id IN (SELECT id FROM job WHERE recruiter_id = ?)", userId);
        jdbcTemplate.update("DELETE FROM job WHERE recruiter_id = ?", userId);
    }

    private void deleteReportsForTarget(String targetType, String targetIdQuery, UUID userId) {
        jdbcTemplate.update("""
                DELETE FROM content_report
                WHERE reporter_id = ?
                   OR resolved_by = ?
                   OR (target_type = ? AND target_id IN (%s))
                """.formatted(targetIdQuery), userId, userId, targetType, userId);
    }

    private void deleteEmailActionsForTarget(String targetType, String targetIdQuery, UUID userId) {
        jdbcTemplate.update("""
                DELETE FROM email_action
                WHERE recipient_user_id = ?
                   OR (UPPER(COALESCE(target_type, '')) = ? AND target_id IN (%s))
                """.formatted(targetIdQuery), userId, targetType, userId);
    }

    private void deleteOutboxForMatching(String matchingIdQuery, UUID userId) {
        jdbcTemplate.update("""
                DELETE FROM notification_outbox
                WHERE UPPER(target_type) = 'MATCHING'
                  AND target_key IN (SELECT id::text FROM matching WHERE id IN (%s))
                """.formatted(matchingIdQuery), userId);
    }

    private void deleteAccountReferences(UUID userId) {
        jdbcTemplate.update("DELETE FROM content_report WHERE reporter_id = ? OR resolved_by = ?", userId, userId);
        jdbcTemplate.update("DELETE FROM feedback WHERE actor_id = ?", userId);
        jdbcTemplate.update("DELETE FROM email_action WHERE recipient_user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM audit_log WHERE actor_id = ?", userId);
    }

    private void deleteFilesAfterCommit(List<String> storedFiles) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                storedFiles.forEach(storageService::delete);
            }
        });
    }
}
