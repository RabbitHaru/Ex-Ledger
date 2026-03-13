package me.projectexledger.domain.admin.controller;

import lombok.RequiredArgsConstructor;
import me.projectexledger.common.annotation.AuditLog;
import me.projectexledger.common.dto.ApiResponse;
import me.projectexledger.domain.admin.dto.AdminMemberResponse;
import me.projectexledger.domain.admin.service.IntegratedAdminService;
import me.projectexledger.domain.member.entity.Member;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/members")
@RequiredArgsConstructor
public class AdminMemberController {

    private final IntegratedAdminService integratedAdminService;

    @PreAuthorize("hasRole('INTEGRATED_ADMIN')")
    @GetMapping
    public ApiResponse<List<AdminMemberResponse>> getAllMembers() {
        return ApiResponse.success("전체 회원 목록 조회 성공", integratedAdminService.getAllMembers());
    }

    @PreAuthorize("hasRole('INTEGRATED_ADMIN')")
    @AuditLog(action = "사이트 관리자가 회원 권한 변경")
    @PostMapping("/{userId}/role")
    public ApiResponse<Void> updateMemberRole(@PathVariable Long userId, @RequestBody Map<String, String> body) {
        String roleStr = body.get("role");
        Member.Role newRole = Member.Role.valueOf(roleStr);
        integratedAdminService.updateMemberRole(userId, newRole);
        return ApiResponse.success("회원 권한이 성공적으로 변경되었습니다.", null);
    }

    @PreAuthorize("hasRole('INTEGRATED_ADMIN')")
    @AuditLog(action = "사이트 관리자가 회원 승인 상태 변경")
    @PostMapping("/{userId}/approval")
    public ApiResponse<Void> updateMemberApproval(@PathVariable Long userId, @RequestBody Map<String, Boolean> body) {
        boolean isApproved = body.get("isApproved");
        integratedAdminService.updateMemberApproval(userId, isApproved);
        return ApiResponse.success("회원 승인 상태가 업데이트되었습니다.", null);
    }

    @PreAuthorize("hasRole('INTEGRATED_ADMIN')")
    @AuditLog(action = "사이트 관리자가 회원 삭제")
    @DeleteMapping("/{userId}")
    public ApiResponse<Void> deleteMember(@PathVariable Long userId) {
        integratedAdminService.deleteMember(userId);
        return ApiResponse.success("회원이 성공적으로 삭제되었습니다.", null);
    }
}
