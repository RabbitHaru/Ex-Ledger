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

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.security.access.prepost.PreAuthorize;

@Slf4j
@RestController
@RequestMapping("/api/admin/clients")
@RequiredArgsConstructor
@PreAuthorize("hasRole('INTEGRATED_ADMIN')")
public class AdminClientController {

    private final ClientService clientService;

    // 1. 가맹점 전체 목록 조회
    @GetMapping
    public ResponseEntity<ApiResponse<List<Client>>> getAllClients() {
        log.info("[Admin] DB에서 실제 가맹점 전체 목록 조회 요청");
        List<Client> clients = clientService.getAllClients();
        return ResponseEntity.ok(ApiResponse.success("가맹점 목록 조회 성공", clients));
    }

    // 🌟 [수정] 개별 수수료 수정 API(updateClientPolicy)를 폐기하고, 관리자가 예외적으로 '등급만' 바꿀 수 있는 API로 개편
    @PatchMapping("/{merchantId}/grade")
    public ResponseEntity<ApiResponse<Void>> updateClientGrade(
            @PathVariable String merchantId,
            @RequestParam ClientGrade grade) {

        log.info("[Admin] 가맹점 등급 수동 변경 요청 - 가맹점 ID: {}, 변경 등급: {}", merchantId, grade);
        clientService.updateClientGrade(merchantId, grade);

        return ResponseEntity.ok(ApiResponse.success("가맹점 등급이 성공적으로 변경되었습니다!", null));
    }

    // 3. 가입 승인 대기 리스트 조회
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<ClientPendingDTO>>> getPendingClients() {
        log.info("[Admin] 가입 승인 대기 중인 기업 고객 리스트 조회");

        List<ClientPendingDTO> realList = clientService.getPendingClients().stream()
                .map(client -> new ClientPendingDTO(
                        client.getId(),
                        client.getName(),
                        client.getBusinessNumber(),
                        "admin@example.com",
                        client.getStatus().name(),
                        null, // 🌟 [수정] Client 엔티티에서 feeRate가 삭제되었으므로 DTO에 null을 반환합니다.
                        null))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("승인 대기 리스트 조회 성공", realList));
    }

    // 4. 특정 기업 고객 가입 승인
    // 🌟 [수정] feeRate 파라미터 삭제
    @PostMapping("/{clientId}/approve")
    public ResponseEntity<ApiResponse<Void>> approveClient(@PathVariable Long clientId) {
        log.info("[Admin] 기업 고객 가입 승인 처리. ID: {}", clientId);
        clientService.approveClient(clientId);
        return ResponseEntity.ok(ApiResponse.success("고객 승인이 완료되었습니다. (기본 GENERAL 등급 부여)", null));
    }

    /* 🗑️ [삭제됨] updateClientFee (더 이상 쓰지 않는 기존 수수료 수정 API 삭제) */
}