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

    // 🚨 1. 오차 수정 API (React 연동을 위해 @PatchMapping 및 @RequestBody로 개선)
    @PatchMapping("/{settlementId}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolveDiscrepancy(
            @PathVariable Long settlementId,
            @RequestBody Map<String, Object> request) {

        BigDecimal correctedAmount = new BigDecimal(request.get("correctedAmount").toString());
        String reason = request.get("reason").toString();

        log.info("[Admin] 오차 발생 건 수동 수정 처리 요청. ID: {}, 수정금액: {}, 사유: {}", settlementId, correctedAmount, reason);
        settlementEngineService.resolveDiscrepancy(settlementId, correctedAmount, reason);
        return ResponseEntity.ok(ApiResponse.success("수동 오차 수정 처리가 완료되었습니다.", null));
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
        // 이제 서비스가 알아서 랜덤으로 만들 거니까, 여기서는 그냥 '실행'만 시킵니다!
        log.info("[Admin] 발표용 랜덤 테스트 데이터 생성 요청 (상태: {})", status);

        // 파라미터는 아무거나 넣어도 서비스가 무시하고 랜덤으로 생성할 겁니다.
        settlementEngineService.createTestSettlement(
                "T-ORDER-" + System.currentTimeMillis(),
                "RANDOM",
                BigDecimal.ZERO,
                "KRW",
                status
        );

        return ResponseEntity.ok(ApiResponse.success("랜덤 테스트 데이터가 생성되었습니다!", null));
    }

    // 🚨 2. 수동 승인 API (공통 응답 포맷인 ApiResponse 적용 및 주소 단순화)
    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveSettlement(@PathVariable Long id) {
        log.info("[Admin] 정산 건 수동 승인 처리 요청. ID: {}", id);
        try {
            settlementEngineService.approveSettlement(id);
            return ResponseEntity.ok(ApiResponse.success("승인이 완료되었습니다. 송금 대기 상태로 전환됩니다.", null));
        } catch (Exception e) {
            // 예외 발생 시 에러 메시지를 프론트엔드로 전달
            return ResponseEntity.badRequest().body(ApiResponse.fail(e.getMessage()));
        }
    }
}