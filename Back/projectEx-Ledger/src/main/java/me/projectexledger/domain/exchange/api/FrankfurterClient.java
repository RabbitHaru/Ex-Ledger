package me.projectexledger.domain.exchange.api;

import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.exchange.dto.ExchangeRateDTO;
import me.projectexledger.domain.exchange.utils.CurrencyMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

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

    private final RestTemplate restTemplate;
    private final String BASE_URL = "https://api.frankfurter.app/";
    private static final DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss");

    public FrankfurterClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(2000);
        this.restTemplate = new RestTemplate(factory);
    }

    @Override
    public List<ExchangeRateDTO> fetchRates() {
        return fetchHistoricalRates("latest");
    }

    public List<ExchangeRateDTO> fetchHistoricalRates(String datePath) {
        String url = BASE_URL + datePath + "?from=KRW";

        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            // 🌟 [핵심 보완] 특정 날짜 데이터가 없으면 'latest'로 재시도하여 누락 방지
            if (response == null || !response.containsKey("rates")) {
                if (!"latest".equals(datePath)) {
                    log.warn("⚠️ [{}] 데이터가 아직 공시되지 않았습니다. 최신(latest) 데이터 조회를 시도합니다.", datePath);
                    return fetchHistoricalRates("latest");
                }
                return List.of();
            }

            String apiDate = response.get("date").toString();
            String timestamp = apiDate + " " + LocalDateTime.now().format(timeFormatter);

            @SuppressWarnings("unchecked")
            Map<String, Object> rates = (Map<String, Object>) response.get("rates");

            return rates.entrySet().stream()
                    .filter(entry -> !entry.getKey().equals("KRW"))
                    .map(entry -> {
                        String curUnit = entry.getKey();
                        if (curUnit.equals("CNY")) curUnit = "CNH";

                        // 역산 로직 (1 외화당 KRW)
                        BigDecimal rateValue = BigDecimal.ONE.divide(
                                new BigDecimal(entry.getValue().toString()), 4, RoundingMode.HALF_UP);

                        return ExchangeRateDTO.builder()
                                .curUnit(curUnit).curNm(CurrencyMapper.getName(curUnit))
                                .rate(rateValue).provider(getProviderName()).updatedAt(timestamp)
                                .changeAmount(BigDecimal.ZERO).changeRate(BigDecimal.ZERO).build();
                    })
                    .filter(dto -> CurrencyMapper.isSupported(dto.getCurUnit()))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("❌ 프랑크푸르터 API 호출 에러: {}", e.getMessage());
            // 에러 발생 시에도 'latest'로 마지막 시도
            if (!"latest".equals(datePath)) return fetchHistoricalRates("latest");
            return List.of();
        }
    }

    @Override
    public String getProviderName() {
        return "FRANKFURTER";
    }
}