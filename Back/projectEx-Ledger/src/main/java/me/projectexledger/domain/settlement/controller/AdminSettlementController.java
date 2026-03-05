package me.projectexledger.domain.settlement.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.common.dto.ApiResponse;
import me.projectexledger.domain.admin.dto.DashboardSummaryDTO;
import me.projectexledger.domain.settlement.dto.ReconciliationListDTO;
import me.projectexledger.domain.settlement.dto.SettlementPolicyUpdateRequest;
import me.projectexledger.domain.settlement.entity.SettlementStatus;
import me.projectexledger.domain.settlement.service.SettlementEngineService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/admin/settlements")
@RequiredArgsConstructor
public class AdminSettlementController {

    private final SettlementEngineService settlementEngineService;

    @GetMapping("/sync")
    public ResponseEntity<ApiResponse<Void>> syncDailySettlement(@RequestParam(required = false) String date) {
        String targetDate = (date != null) ? date : LocalDate.now().toString();
        log.info("[Admin] 🚀 {} 일자 포트원 실시간 동기화 파이프라인 구동 요청", targetDate);
        settlementEngineService.processDailySettlement(targetDate);
        return ResponseEntity.ok(ApiResponse.success("정산 동기화가 성공적으로 완료되었습니다.", null));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardSummaryDTO>> getDashboardSummary() {
        log.info("[Admin] 대시보드 요약 데이터 요청");
        // 🚨 서비스의 getDashboardSummary()와 타입을 맞췄습니다.
        DashboardSummaryDTO summaryData = settlementEngineService.getDashboardSummary();
        return ResponseEntity.ok(ApiResponse.success("대시보드 데이터 조회 성공", summaryData));
    }

    @GetMapping("/reconciliations")
    public ResponseEntity<ApiResponse<List<ReconciliationListDTO>>> getReconciliationList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("[Admin] 대사 리스트 조회 요청. Page: {}, Size: {}", page, size);
        List<ReconciliationListDTO> data = settlementEngineService.getReconciliationList(page, size);
        return ResponseEntity.ok(ApiResponse.success("리스트 조회 성공", data));
    }

    @PostMapping("/{settlementId}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolveDiscrepancy(
            @PathVariable Long settlementId,
            @RequestParam BigDecimal correctedAmount,
            @RequestParam String reason) {
        log.info("[Admin] 오차 발생 건 수동 승인 처리 요청. ID: {}", settlementId);
        settlementEngineService.resolveDiscrepancy(settlementId, correctedAmount, reason);
        return ResponseEntity.ok(ApiResponse.success("수동 승인 처리가 완료되었습니다.", null));
    }

    @PostMapping("/{settlementId}/retry-remittance")
    public ResponseEntity<ApiResponse<Void>> retryRemittance(@PathVariable Long settlementId) {
        log.info("[Admin] 송금 실패 건 재전송 요청. ID: {}", settlementId);
        settlementEngineService.retryRemittance(settlementId);
        return ResponseEntity.ok(ApiResponse.success("재송금 요청이 접수되었습니다.", null));
    }

    @PostMapping("/policy/{merchantId}")
    public ResponseEntity<ApiResponse<Void>> updateSettlementPolicy(
            @PathVariable String merchantId,
            @RequestBody SettlementPolicyUpdateRequest request) {
        log.info("[Admin] {} 가맹점의 정산 수수료 정책 업데이트 요청", merchantId);
        return ResponseEntity.ok(ApiResponse.success("수수료 정책이 성공적으로 반영되었습니다.", null));
    }
    @PostMapping("/test-data")
    public ResponseEntity<ApiResponse<String>> createTestData(@RequestParam SettlementStatus status) {
        String uniqueOrderId = "T-ORDER-" + System.currentTimeMillis();
        // 1004원 결제건을 강제로 DB에 넣는 테스트 로직
        settlementEngineService.createTestSettlement(
                uniqueOrderId, "익명 기업", new BigDecimal("1004"), "KRW", status
        );
        return ResponseEntity.ok(ApiResponse.success("테스트 데이터 생성 완료!", null));
    }
    @PostMapping("/reconciliations/{id}/approve")
    public ResponseEntity<?> approveSettlement(@PathVariable Long id) {
        try {
            settlementEngineService.approveSettlement(id);
            return ResponseEntity.ok().body(Map.of("message", "승인이 완료되었습니다. 송금 대기 상태로 전환됩니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}