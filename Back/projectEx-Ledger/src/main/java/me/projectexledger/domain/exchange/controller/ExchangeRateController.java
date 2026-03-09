package me.projectexledger.domain.exchange.controller; // 🌟 패키지명 변경

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.exchange.dto.ExchangeRateResponseDTO;
import me.projectexledger.domain.exchange.service.ExchangeRateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/exchange")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    @GetMapping("/history/{curUnit}")
    public ResponseEntity<List<ExchangeRateResponseDTO>> getHistory(
            @PathVariable String curUnit,
            @RequestParam(defaultValue = "30") int days) {

        return ResponseEntity.ok(exchangeRateService.getExchangeRateHistory(curUnit, days));
    }
}