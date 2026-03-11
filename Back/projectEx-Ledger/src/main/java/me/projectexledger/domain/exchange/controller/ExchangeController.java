package me.projectexledger.domain.exchange.controller;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.exchange.dto.ExchangeRateDTO;
import me.projectexledger.domain.exchange.service.ExchangeRateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import me.projectexledger.common.annotation.RequireMfa;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/exchange")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173"})
public class ExchangeController {

    private final ExchangeRateService exchangeRateService;

    /**
     * 프론트엔드 전광판용 최신 환율 조회
     */
    @GetMapping("/latest")
    public ResponseEntity<List<ExchangeRateDTO>> getLatestRates() {
        List<ExchangeRateDTO> rates = exchangeRateService.getLatestRatesFromCacheOrDb();
        return ResponseEntity.ok(rates);
    }

    /**
     * 비상 버튼: 지난 10일치 데이터를 강제로 수집합니다.
     * 브라우저에서 http://localhost:8080/api/exchange/backfill 입력
     */
    @PreAuthorize("hasRole('INTEGRATED_ADMIN')")
    @RequireMfa
    @GetMapping("/backfill")
    public ResponseEntity<String> forceBackfill() {
        exchangeRateService.backfillHistoricalData();
        return ResponseEntity.ok("과거 데이터 백필 명령이 전송되었습니다. 서버 로그를 확인하세요!");
    }
}