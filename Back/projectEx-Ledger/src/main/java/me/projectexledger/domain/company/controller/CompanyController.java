package me.projectexledger.domain.company.controller;
 
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import me.projectexledger.common.annotation.AuditLog;
import me.projectexledger.common.dto.ApiResponse;
import me.projectexledger.domain.company.dto.JoinCompanyRequest;
import me.projectexledger.domain.company.dto.PendingUserResponse;
import me.projectexledger.domain.company.dto.CompanyUserResponse;
import me.projectexledger.domain.company.service.CompanyService;
import me.projectexledger.common.annotation.RequireCompanyApproval;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/company")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    @AuditLog(action = "기업 가입 요청")
    @PostMapping("/join")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> requestJoinCompany(@Valid @RequestBody JoinCompanyRequest request) {
        companyService.requestJoinCompany(request);
        return ApiResponse.success("소속 기업 승인 요청이 완료되었습니다.", null);
    }

    @GetMapping("/users/pending")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'INTEGRATED_ADMIN')")
    public ApiResponse<List<PendingUserResponse>> getPendingUsers() {
        return ApiResponse.success("승인 대기 중인 사용자 목록 조회 성공", companyService.getPendingUsers());
    }

    @AuditLog(action = "기업 멤버 승인")
    @PostMapping("/users/{userId}/approve")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'INTEGRATED_ADMIN')")
    public ApiResponse<Void> approveUser(@PathVariable Long userId) {
        companyService.approveUser(userId);
        return ApiResponse.success("사용자 승인이 완료되었습니다.", null);
    }

    @GetMapping("/users/approved")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'INTEGRATED_ADMIN')")
    public ApiResponse<List<CompanyUserResponse>> getCompanyUsers() {
        return ApiResponse.success("소속 사용자 목록 조회 성공", companyService.getCompanyUsers());
    }

    @AuditLog(action = "기업 멤버 권한 박탈")
    @PostMapping("/users/{userId}/revoke")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'INTEGRATED_ADMIN')")
    public ApiResponse<Void> revokeUser(@PathVariable Long userId) {
        companyService.revokeUser(userId);
        return ApiResponse.success("사용자 권한 박탈이 완료되었습니다.", null);
    }

    @AuditLog(action = "기업 소속 스스로 해제")
    @PostMapping("/users/revoke-me")
    @PreAuthorize("hasRole('COMPANY_USER')")
    @RequireCompanyApproval
    public ApiResponse<Void> revokeMe() {
        companyService.revokeMe();
        return ApiResponse.success("기업 소속 해제가 완료되었습니다.", null);
    }

    @PostMapping("/resubmit-license")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ApiResponse<Void> resubmitLicense(@RequestBody java.util.Map<String, String> body) {
        String licenseFileUuid = body.get("licenseFileUuid");
        if (licenseFileUuid == null || licenseFileUuid.isBlank()) {
            throw new IllegalArgumentException("사업자등록증 파일이 필요합니다.");
        }
        companyService.resubmitLicense(licenseFileUuid);
        return ApiResponse.success("사업자등록증이 재제출되었습니다. 심사가 다시 진행됩니다.", null);
    }
}
