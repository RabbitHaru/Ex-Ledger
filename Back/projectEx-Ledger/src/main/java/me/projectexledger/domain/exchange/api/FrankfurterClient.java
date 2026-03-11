package me.projectexledger.domain.exchange.api;

import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.exchange.dto.ExchangeRateDTO;
import me.projectexledger.domain.exchange.utils.CurrencyMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
public class FrankfurterClient implements ExchangeRateProvider {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String BASE_URL = "https://api.frankfurter.app/";
    private static final DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss");

    @Override
    public List<ExchangeRateDTO> fetchRates() {
        return fetchHistoricalRates("latest");
    }

    /**
     * 유럽 중앙은행 데이터를 기반으로 환율을 가져옵니다.
     */
    public List<ExchangeRateDTO> fetchHistoricalRates(String datePath) {
        // 원화(KRW)를 기준으로 역산하기 위해 ?from=KRW 쿼리 사용
        String url = BASE_URL + datePath + "?from=KRW";

        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null || !response.containsKey("rates")) {
                return List.of();
            }

            // 🌟 [핵심 개선] API 응답에 포함된 실제 환율 기준 날짜(date) 추출 (예: "2026-03-11")
            // 시스템 시각이 12일이라도 API가 11일 데이터를 주면 11일로 타임스탬프를 찍습니다.
            String apiDate = response.get("date").toString();
            String timestamp = apiDate + " " + LocalDateTime.now().format(timeFormatter);

            @SuppressWarnings("unchecked")
            Map<String, Object> rates = (Map<String, Object>) response.get("rates");

            return rates.entrySet().stream()
                    .filter(entry -> !entry.getKey().equals("KRW"))
                    .map(entry -> {
                        String curUnit = entry.getKey();
                        // 내부 매퍼 기준에 맞춰 중국 위안화 코드 조정
                        if (curUnit.equals("CNY")) curUnit = "CNH";

                        // 1 KRW당 외화 수치를 역산하여 1 외화당 KRW 수치로 변환
                        BigDecimal rateValue = BigDecimal.ONE.divide(
                                new BigDecimal(entry.getValue().toString()), 4, RoundingMode.HALF_UP);

                        return ExchangeRateDTO.builder()
                                .curUnit(curUnit)
                                .curNm(CurrencyMapper.getName(curUnit))
                                .rate(rateValue)
                                .provider(getProviderName())
                                .updatedAt(timestamp) // 실제 데이터 날짜가 포함된 타임스탬프
                                .changeAmount(BigDecimal.ZERO)
                                .changeRate(BigDecimal.ZERO)
                                .build();
                    })
                    .filter(dto -> CurrencyMapper.isSupported(dto.getCurUnit()))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("❌ Frankfurter API 호출 에러: {}", e.getMessage());
            return List.of();
        }
    }

    @Override
    public String getProviderName() {
        return "FRANKFURTER";
    }
}