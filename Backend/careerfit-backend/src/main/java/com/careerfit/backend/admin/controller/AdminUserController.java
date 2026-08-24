package com.careerfit.backend.admin.controller;

import com.careerfit.backend.admin.dto.AdminUserSummary;
import com.careerfit.backend.admin.service.AdminUserService;
import com.careerfit.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@Tag(name = "Admin Users", description = "Admin User Management")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    @Operation(summary = "Search users")
    public ResponseEntity<ApiResponse<Page<AdminUserSummary>>> searchUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        var userPage = adminUserService.searchUsers(role, status, keyword, PageRequest.of(page, size, org.springframework.data.domain.Sort.by("email").ascending()));
        var summaryPage = userPage.map(u -> new AdminUserSummary(
                u.getId(), u.getEmail(), u.getFullName(),
                u.getRole().name(), u.isActive() ? "ACTIVE" : "SUSPENDED",
                u.isEmailVerified(), u.getCreatedAt()
        ));
        
        return ResponseEntity.ok(ApiResponse.ok(summaryPage));
    }

    @GetMapping("/{userId}")
    @Operation(summary = "Get user details")
    public ResponseEntity<ApiResponse<AdminUserSummary>> getUserDetails(@PathVariable UUID userId) {
        var u = adminUserService.getUserById(userId);
        var summary = new AdminUserSummary(
                u.getId(), u.getEmail(), u.getFullName(),
                u.getRole().name(), u.isActive() ? "ACTIVE" : "SUSPENDED",
                u.isEmailVerified(), u.getCreatedAt()
        );
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @PostMapping("/{userId}/suspend")
    @Operation(summary = "Suspend user")
    public ResponseEntity<ApiResponse<Void>> suspendUser(@PathVariable UUID userId, @RequestAttribute("userId") UUID adminId) {
        adminUserService.suspendUser(userId, adminId);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PostMapping("/{userId}/activate")
    @Operation(summary = "Activate user")
    public ResponseEntity<ApiResponse<Void>> activateUser(@PathVariable UUID userId, @RequestAttribute("userId") UUID adminId) {
        adminUserService.activateUser(userId, adminId);
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
