package me.projectexledger.domain.company.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import me.projectexledger.common.dto.ApiResponse;
import me.projectexledger.domain.company.dto.JoinCompanyRequest;
import me.projectexledger.domain.company.dto.PendingUserResponse;
import me.projectexledger.domain.company.service.CompanyService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/company")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

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

    @PostMapping("/users/{userId}/approve")
    @PreAuthorize("hasAnyRole('COMPANY_ADMIN', 'INTEGRATED_ADMIN')")
    public ApiResponse<Void> approveUser(@PathVariable Long userId) {
        companyService.approveUser(userId);
        return ApiResponse.success("사용자 승인이 완료되었습니다.", null);
    }
}
