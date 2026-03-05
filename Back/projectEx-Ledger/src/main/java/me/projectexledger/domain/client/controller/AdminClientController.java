package me.projectexledger.domain.client.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.common.dto.ApiResponse;
import me.projectexledger.domain.client.dto.ClientPendingDTO;
import me.projectexledger.domain.client.service.ClientService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/admin/clients")
@RequiredArgsConstructor
// @PreAuthorize("hasRole('ADMIN')") // 임시 주석 처리
public class AdminClientController {

    private final ClientService clientService;

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
            @RequestParam BigDecimal feeRate) { // 수수료율 파라미터 추가

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

        //  approveClient 로직을 재활용해야 합니다
        // clientService.updateClientFee(clientId, feeRate);

        return ResponseEntity.ok(ApiResponse.success("수수료가 성공적으로 변경되었습니다.", null));
    }
}