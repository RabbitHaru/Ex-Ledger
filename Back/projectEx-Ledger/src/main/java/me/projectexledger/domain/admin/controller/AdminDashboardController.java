package me.projectexledger.domain.admin.controller;

import lombok.RequiredArgsConstructor;
import me.projectexledger.common.dto.ApiResponse;
import me.projectexledger.domain.admin.dto.DashboardSummaryDTO;
import me.projectexledger.domain.admin.service.AdminDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 어드민 대시보드 API
 * AdminDashboard.tsx에 전체 결제 합계 및 송금 현황 요약을 전달합니다.
 */
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardSummaryDTO>> getDashboardSummary() {
        DashboardSummaryDTO summary = adminDashboardService.getDashboardSummary();
        return ResponseEntity.ok(ApiResponse.success("대시보드 통계 조회 성공", summary));
    }
}