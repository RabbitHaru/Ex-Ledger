package me.projectexledger.domain.remittance.controller;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.remittance.dto.FeeDTO; // 👈 수수료 DTO 임포트 추가
import me.projectexledger.domain.remittance.dto.RemittanceDTO;
import me.projectexledger.domain.remittance.service.RemittanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/remittance")
@RequiredArgsConstructor
public class RemittanceController {

    private final RemittanceService remittanceService;

    // 🚨 API 개요: 사용자가 입력한 송금 정보를 서버에 전달하여 프로세스 시작
    @PostMapping("/request")
    public ResponseEntity<RemittanceDTO.Response> requestRemittance(
            @RequestBody RemittanceDTO.Request requestDTO,
            @AuthenticationPrincipal UserDetails userDetails // JWT 권한 확인용
    ) {
        // 로그인된 사용자의 ID 추출 (예: 이메일 또는 사번)
        String requesterId = userDetails.getUsername();

        // 서비스 로직 호출 및 응답 반환
        RemittanceDTO.Response response = remittanceService.processRemittanceRequest(requesterId, requestDTO);

        return ResponseEntity.ok(response);
    }

    // 🚨 수수료 사전 계산 API: 프론트엔드에서 금액 입력 시 실시간 호출
    @PostMapping("/fee/calculate")
    public ResponseEntity<FeeDTO.Response> calculateFee(@RequestBody FeeDTO.Request requestDTO) {

        // 서비스의 수수료 계산 로직 호출
        FeeDTO.Response feeResponse = remittanceService.calculateRemittanceFee(
                requestDTO.getAmount(),
                requestDTO.getExchangeRate(),
                requestDTO.getCurrency(),
                requestDTO.getClientGrade()
        );

        return ResponseEntity.ok(feeResponse);
    }
    // 🚨 관리자 전용 API: 전체 해외 송금 신청 내역 조회
    @GetMapping("/list")
    public ResponseEntity<List<RemittanceDTO.ListResponse>> getRemittanceList() {

        List<RemittanceDTO.ListResponse> responseList = remittanceService.getAllRemittances();

        return ResponseEntity.ok(responseList);
    }
}