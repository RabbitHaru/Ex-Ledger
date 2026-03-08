package me.projectexledger.domain.settlement.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class ExchangeRateCalculator {

    @Value("${koreaexim.api.base-url}")
    private String baseUrl;

    @Value("${koreaexim.api.service-key}")
    private String serviceKey;

    @Value("${koreaexim.api.data-type}")
    private String dataType;

    /**
     * [1순위] 한국수출입은행 API를 호출하여 요청한 외화의 실시간 매매기준율을 가져옵니다.
     * 메서드명을 getUsdExchangeRate -> getExchangeRate 로 범용적으로 변경했습니다.
     */
    public BigDecimal getExchangeRate(String targetCurrency) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String searchDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

            String url = String.format("%s?authkey=%s&searchdate=%s&data=%s",
                    baseUrl, serviceKey, searchDate, dataType);

            log.info("[FX] 수출입은행 환율 API 호출 중... (통화: {}, 조회일자: {})", targetCurrency, searchDate);

            List<Map<String, Object>> responses = restTemplate.getForObject(url, List.class);

            if (responses != null && !responses.isEmpty()) {
                for (Map<String, Object> rateInfo : responses) {
                    String curUnit = (String) rateInfo.get("cur_unit");

                    // 🌟 핵심 방어 로직: JPY(100), VND(100) 등 100단위 표기 통화를 잡아내기 위해 startsWith 사용!
                    if (curUnit != null && curUnit.startsWith(targetCurrency.toUpperCase())) {
                        String rateStr = ((String) rateInfo.get("deal_bas_r")).replace(",", "");
                        BigDecimal liveRate = new BigDecimal(rateStr);
                        log.info("[FX] 오늘자 실시간 {} 환율 조회 성공: {}원 (단위: {})", targetCurrency, liveRate, curUnit);
                        return liveRate; // 이 값은 나중에 SettlementEngineService의 normalizeRate에서 1단위로 쪼개집니다.
                    }
                }
                log.warn("[FX] API 응답은 정상이나 {} 통화 정보가 없습니다.", targetCurrency);
            } else {
                log.warn("[FX] API 응답이 비어있습니다. (주말/공휴일 또는 영업시간 외일 수 있음)");
            }
        } catch (Exception e) {
            log.error("[FX] 환율 API 호출 중 서버 오류 발생: {}", e.getMessage());
        }

        return null;
    }

    /**
     * [2순위 방어] 일일 고시 환율 (Frankfurter API 등) 조회
     */
    public BigDecimal getDailyStandardRate(String targetCurrency) {
        log.info("[FX-Fallback] 2순위: 일일 고시 환율(Frankfurter 등)을 시도합니다. (통화: {})", targetCurrency);
        // 임시 더미 데이터 (각 통화별 대략적인 환율 세팅)
        if ("JPY".equalsIgnoreCase(targetCurrency)) return new BigDecimal("900.00");
        if ("VND".equalsIgnoreCase(targetCurrency)) return new BigDecimal("5.50");
        return new BigDecimal("1400.00"); // 기본 USD
    }

    /**
     * [3순위 방어] 시스템 DB 최신 저장 환율 조회
     */
    public BigDecimal getLatestStoredRate(String targetCurrency) {
        log.info("[FX-Fallback] 3순위: 시스템에 마지막으로 저장된 환율을 꺼내옵니다. (통화: {})", targetCurrency);
        if ("JPY".equalsIgnoreCase(targetCurrency)) return new BigDecimal("890.00");
        if ("VND".equalsIgnoreCase(targetCurrency)) return new BigDecimal("5.40");
        return new BigDecimal("1380.00"); // 기본 USD
    }
}