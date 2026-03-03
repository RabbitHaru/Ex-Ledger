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

    // 🚨 application.properties의 설정값과 완벽하게 매핑
    @Value("${koreaexim.api.base-url}")
    private String baseUrl;

    @Value("${koreaexim.api.service-key}")
    private String serviceKey;

    @Value("${koreaexim.api.data-type}")
    private String dataType;

    /**
     * 한국수출입은행 API를 호출하여 오늘자 USD 실시간 매매기준율을 가져옵니다.
     */
    public BigDecimal getUsdExchangeRate() {
        try {
            RestTemplate restTemplate = new RestTemplate();
            // 오늘 날짜를 yyyyMMdd 포맷으로 변환
            String searchDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

            // 🚨 properties에서 주입받은 값들을 조합하여 최종 URL 생성
            String url = String.format("%s?authkey=%s&searchdate=%s&data=%s",
                    baseUrl, serviceKey, searchDate, dataType);

            log.info("[FX] 수출입은행 환율 API 호출 중... (조회일자: {})", searchDate);

            // API 호출 결과 받아오기
            List<Map<String, Object>> responses = restTemplate.getForObject(url, List.class);

            // 응답 데이터 파싱
            if (responses != null && !responses.isEmpty()) {
                for (Map<String, Object> rateInfo : responses) {
                    if ("USD".equals(rateInfo.get("cur_unit"))) {
                        // "1,350.50" 처럼 콤마가 포함된 문자열에서 콤마 제거 후 변환
                        String rateStr = ((String) rateInfo.get("deal_bas_r")).replace(",", "");
                        BigDecimal liveRate = new BigDecimal(rateStr);
                        log.info("[FX] 오늘자 실시간 USD 환율 조회 성공: {}원", liveRate);
                        return liveRate;
                    }
                }
                log.warn("[FX] API 응답은 정상이나 USD 통화 정보가 없습니다.");
            } else {
                // 수출입은행 API는 주말이나 공휴일에는 빈 리스트([])를 반환합니다.
                log.warn("[FX] API 응답이 비어있습니다. (주말/공휴일 또는 영업시간 외일 수 있음)");
            }
        } catch (Exception e) {
            log.error("[FX] 환율 API 호출 중 서버 오류 발생: {}", e.getMessage());
        }

        // 🚨 API 호출 실패 또는 주말이라 데이터가 없을 때를 대비한 '안전 기본값'
        log.info("[FX] 안전 기본 환율(1,350.00원)을 적용하여 정산을 진행합니다.");
        return new BigDecimal("1350.00");
    }
}