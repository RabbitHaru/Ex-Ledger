package me.projectexledger.domain.client.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.common.dto.ApiResponse;
import me.projectexledger.domain.client.dto.ClientPendingDTO;
import me.projectexledger.domain.client.entity.Client;
import me.projectexledger.domain.client.entity.ClientGrade;
import me.projectexledger.domain.client.service.ClientService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
// 🌟 프론트엔드와 통신하기 위해 경로를 맞춥니다.
@RequestMapping("/api/admin/clients")
@RequiredArgsConstructor
// @PreAuthorize("hasRole('ADMIN')") // 임시 주석 처리
public class AdminClientController {

    private final ClientService clientService;

    // =========================================================================
    // 🚀 [수정됨] 프론트엔드(ClientManagement.tsx) 가맹점 전체 목록 조회 API
    // GET /api/admin/clients
    // =========================================================================
    @GetMapping
    public ResponseEntity<ApiResponse<List<Client>>> getAllClients() {
        log.info("[Admin] DB에서 실제 가맹점 전체 목록 조회 요청");

        // 🌟 임시 하드코딩 데이터를 지우고, 진짜 DB에서 목록을 가져옵니다.
        List<Client> clients = clientService.getAllClients();

        return ResponseEntity.ok(ApiResponse.success("가맹점 목록 조회 성공", clients));
    }

    // =========================================================================
    // 🚀 [수정됨] 가맹점 등급(VIP/GENERAL) 및 수수료 정책 저장 API
    // POST /api/admin/clients/{merchantId}/policy
    // =========================================================================
    @PostMapping("/{merchantId}/policy")
    public ResponseEntity<ApiResponse<Void>> updateClientPolicy(
            @PathVariable String merchantId,
            @RequestBody Map<String, Object> policyData) {

        log.info("[Admin] 가맹점 정책 업데이트 요청 - 가맹점 ID: {}", merchantId);

        // 1. 프론트에서 넘어온 JSON 데이터에서 값들을 하나씩 꺼냅니다.
        ClientGrade grade = ClientGrade.valueOf((String) policyData.get("grade"));
        BigDecimal platformFeeRate = new BigDecimal(policyData.get("platformFeeRate").toString());
        BigDecimal preferenceRate = new BigDecimal(policyData.get("preferenceRate").toString());

        // 🌟 [추가] 누락되었던 두 값을 마저 꺼냅니다.
        BigDecimal networkFee = new BigDecimal(policyData.get("networkFee").toString());
        BigDecimal exchangeSpread = new BigDecimal(policyData.get("exchangeSpread").toString());

        // 2. 서비스 로직을 호출할 때 6개의 파라미터를 모두 순서대로 넘겨줍니다.
        // 🌟 이제 서비스의 메서드 구조와 일치하므로 빨간 줄이 사라집니다!
        clientService.updateClientPolicy(
                merchantId,
                grade,
                platformFeeRate,
                preferenceRate,
                networkFee,
                exchangeSpread
        );

        return ResponseEntity.ok(ApiResponse.success("가맹점 등급 및 수수료 정책이 성공적으로 반영되었습니다!", null));
    }

    // -------------------------------------------------------------------------
    // 기존에 작성하신 코드 유지
    // -------------------------------------------------------------------------

    // 1. 가입 승인 대기 리스트 조회
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<ClientPendingDTO>>> getPendingClients() {
        log.info("가입 승인 대기 중인 기업 고객 리스트 조회");

        List<ClientPendingDTO> realList = clientService.getPendingClients().stream()
                .map(client -> new ClientPendingDTO(
                        client.getId(),
                        client.getName(),
                        client.getBusinessNumber(),
                        "admin@example.com",
                        client.getStatus().name(),
                        client.getFeeRate(),
                        null
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("승인 대기 리스트 조회 성공", realList));
    }

    // 2. 특정 기업 고객 가입 승인 및 수수료 설정
    @PostMapping("/{clientId}/approve")
    public ResponseEntity<ApiResponse<Void>> approveClient(
            @PathVariable Long clientId,
            @RequestParam BigDecimal feeRate) {

        log.info("기업 고객 가입 승인 및 수수료 설정. ID: {}, 수수료: {}", clientId, feeRate);
        clientService.approveClient(clientId, feeRate);
        return ResponseEntity.ok(ApiResponse.success("고객 승인 및 수수료 설정이 완료되었습니다.", null));
    }

    // 3. 기업 고객 수수료 변경
    @PatchMapping("/{clientId}/fee")
    public ResponseEntity<ApiResponse<Void>> updateClientFee(
            @PathVariable Long clientId,
            @RequestParam BigDecimal feeRate) {

        log.info("기업 고객 수수료 변경. ID: {}, 수수료: {}", clientId, feeRate);
        // clientService.updateClientFee(clientId, feeRate);
        return ResponseEntity.ok(ApiResponse.success("수수료가 성공적으로 변경되었습니다.", null));
    }
}