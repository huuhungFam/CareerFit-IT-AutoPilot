package com.careerfit.backend.auth.repository;

import com.careerfit.backend.auth.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {
    Optional<UserAccount> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByRole(UserAccount.Role role);

    @org.springframework.data.jpa.repository.Query("""
        SELECT u FROM UserAccount u
        WHERE (:role IS NULL OR u.role = :role)
          AND (:isActive IS NULL OR u.isActive = :isActive)
          AND (:keyword IS NULL OR :keyword = '' OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')))
    """)
    org.springframework.data.domain.Page<UserAccount> searchUsers(
        @org.springframework.data.repository.query.Param("role") UserAccount.Role role,
        @org.springframework.data.repository.query.Param("isActive") Boolean isActive,
        @org.springframework.data.repository.query.Param("keyword") String keyword,
        org.springframework.data.domain.Pageable pageable
    );
}
