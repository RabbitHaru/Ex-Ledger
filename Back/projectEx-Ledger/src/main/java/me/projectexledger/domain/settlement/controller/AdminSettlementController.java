package me.projectexledger.domain.settlement.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.common.dto.ApiResponse;
import me.projectexledger.domain.admin.dto.DashboardSummaryDTO;
import me.projectexledger.domain.client.entity.ClientGrade;
import me.projectexledger.domain.company.service.SettlementPolicyService;
import me.projectexledger.domain.company.entity.SettlementPolicy;
import me.projectexledger.domain.settlement.dto.ReconciliationListDTO;
import me.projectexledger.domain.settlement.dto.SettlementDetailDTO;
import me.projectexledger.domain.settlement.dto.SettlementPolicyUpdateRequest;
import me.projectexledger.domain.settlement.entity.SettlementStatus;
import me.projectexledger.domain.settlement.service.SettlementEngineService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.security.access.prepost.PreAuthorize;
import me.projectexledger.common.annotation.RequireMfa;

@Slf4j
@RestController
@RequestMapping("/api/admin/settlements")
@RequiredArgsConstructor
@PreAuthorize("hasRole('INTEGRATED_ADMIN')")
public class AdminSettlementController {

    private final SettlementEngineService settlementEngineService;
    private final SettlementPolicyService policyService;

    @RequireMfa
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
    public ResponseEntity<ApiResponse<Page<ReconciliationListDTO>>> getReconciliationList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("[Admin] 대사 리스트 조회 요청. Page: {}, Size: {}", page, size);
        Page<ReconciliationListDTO> data = settlementEngineService.getReconciliationList(page, size);
        return ResponseEntity.ok(ApiResponse.success("리스트 조회 성공", data));
    }

    @RequireMfa
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

    @RequireMfa
    @PostMapping("/{id}/retry")
    public ResponseEntity<ApiResponse<Void>> retrySettlement(@PathVariable Long id) {
        log.info("[Admin] 송금 실패 건 재전송(retry) 요청. ID: {}", id);
        settlementEngineService.retryRemittance(id);
        return ResponseEntity.ok(ApiResponse.success("재송금 요청이 접수되었습니다.", null));
    }

    @RequireMfa
    @PostMapping("/policy/{merchantId}")
    public ResponseEntity<ApiResponse<Void>> updateSettlementPolicy(
            @PathVariable String merchantId,
            @RequestBody SettlementPolicyUpdateRequest request) {
        log.info("[Admin] {} 가맹점의 정산 수수료 정책 업데이트 요청", merchantId);
        policyService.updatePolicy(merchantId, request);
        return ResponseEntity.ok(ApiResponse.success("수수료 정책이 성공적으로 반영되었습니다.", null));
    }

    @PostMapping("/test-data/random")
    public ResponseEntity<ApiResponse<Void>> createRandomTestData(@RequestParam(defaultValue = "10") int count) {
        log.info("[Admin] 랜덤 테스트 데이터 {}개 생성 요청", count);
        settlementEngineService.createRandomTestSettlements(count);
        return ResponseEntity.ok(ApiResponse.success("랜덤 데이터 생성이 완료되었습니다.", null));
    }

    // 수동 정산 승인
    @RequireMfa
    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveSettlement(@PathVariable Long id) {
        log.info("[Admin] 정산 건 승인 요청. ID: {}", id);
        try {
            settlementEngineService.approveSettlement(id);
            return ResponseEntity.ok(ApiResponse.success("승인이 완료되었습니다. 금액 동의 대기 상태로 전환됩니다.", null));
        } catch (Exception e) {
            log.error("[Admin] 승인 중 에러 발생: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.fail(e.getMessage()));
        }
    }

    // 🌟 [추가됨] 수동 정산 반려
    @RequireMfa
    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectSettlement(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {

        String reason = request.get("reason");
        log.info("[Admin] 정산 건 반려 요청. ID: {}, 사유: {}", id, reason);

        try {
            settlementEngineService.rejectSettlement(id, reason);
            return ResponseEntity.ok(ApiResponse.success("반려 처리가 완료되었습니다.", null));
        } catch (Exception e) {
            log.error("[Admin] 반려 중 에러 발생: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.fail(e.getMessage()));
        }
    }

    @GetMapping("/policy/{merchantId}")
    public ResponseEntity<ApiResponse<SettlementPolicy>> getSettlementPolicy(@PathVariable String merchantId) {
        log.info("[Admin] {} 가맹점의 현재 수수료 정책 조회 요청", merchantId);
        SettlementPolicy policy = policyService.getPolicy(merchantId);
        return ResponseEntity.ok(ApiResponse.success("정책 조회 성공", policy));
    }

    @GetMapping("/{id}/receipt")
    public ResponseEntity<ApiResponse<SettlementDetailDTO>> getReceiptDetail(@PathVariable Long id) {
        log.info("[Admin] 정산 건 영수증 상세 조회 요청. ID: {}", id);
        SettlementDetailDTO data = settlementEngineService.getSettlementDetail(id);
        return ResponseEntity.ok(ApiResponse.success("상세 영수증 명세 조회 성공", data));
    }

    @RequireMfa
    @PatchMapping("/grades/policy")
    public ResponseEntity<ApiResponse<Void>> updateGradePolicy(
            @RequestParam ClientGrade grade,
            @RequestBody SettlementPolicyUpdateRequest request) {
        log.info("[Admin] {} 등급 전역 수수료 정책 일괄 업데이트 요청", grade);
        policyService.updateGradePolicy(grade, request);
        return ResponseEntity.ok(ApiResponse.success(grade + " 등급 정책이 일괄 반영되었습니다.", null));
    }
}