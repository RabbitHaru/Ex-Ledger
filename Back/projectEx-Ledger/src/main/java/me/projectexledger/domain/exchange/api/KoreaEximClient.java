package me.projectexledger.domain.exchange.api;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.config.KoreaEximProperties;
import me.projectexledger.domain.exchange.dto.ExchangeRateDTO;
import me.projectexledger.domain.exchange.utils.CurrencyMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class KoreaEximClient implements ExchangeRateProvider {

    private final KoreaEximProperties properties;
    private final RestTemplate restTemplate = new RestTemplate();
    private static final DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss");

    @Override
    public List<ExchangeRateDTO> fetchRates() {
        // 기본적으로 오늘 날짜의 환율을 요청합니다.
        return fetchHistoricalRates(LocalDate.now().toString());
    }

    /**
     * 특정 날짜의 환율 데이터를 수출입은행 API로부터 가져옵니다.
     */
    public List<ExchangeRateDTO> fetchHistoricalRates(String dateStr) {
        // API 규격에 맞게 하이픈 제거 (예: 2026-03-12 -> 20260312)
        String searchDate = dateStr.replace("-", "");
        try {
            String url = UriComponentsBuilder.fromUriString(properties.getBaseUrl())
                    .queryParam("authkey", properties.getServiceKey())
                    .queryParam("data", properties.getDataType())
                    .queryParam("searchdate", searchDate)
                    .build()
                    .toUriString();

            Map<String, Object>[] response = restTemplate.getForObject(url, Map[].class);

            // 데이터가 없는 경우 (주말, 공휴일, 혹은 아직 공시 전) 빈 리스트 반환
            if (response == null || response.length == 0) {
                log.warn("⚠️ [{}] 수출입은행 데이터가 존재하지 않습니다. (주말/공휴일 가능성)", dateStr);
                return Collections.emptyList();
            }

            // 🌟 [핵심 개선] 기준 날짜(dateStr)와 실제 수집 시각을 조합하여 타임스탬프 생성
            // DB의 updated_at 필드가 이 날짜를 기준으로 저장되어 중복 체크의 기준이 됩니다.
            String timestamp = dateStr + " " + LocalDateTime.now().format(timeFormatter);

            return Arrays.stream(response)
                    .filter(map -> !map.get("cur_unit").toString().contains("KRW"))
                    .map(map -> convertToDto(map, timestamp))
                    .filter(dto -> CurrencyMapper.isSupported(dto.getCurUnit()))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("❌ KoreaExim API 호출 에러: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public String getProviderName() {
        return "KOREAEXIM";
    }

    private ExchangeRateDTO convertToDto(Map<String, Object> map, String timestamp) {
        String curUnit = map.get("cur_unit").toString();
        // 쉼표 제거 후 BigDecimal 변환
        String rateStr = map.get("deal_bas_r").toString().replace(",", "");
        BigDecimal rate = new BigDecimal(rateStr);

        return ExchangeRateDTO.builder()
                .curUnit(curUnit)
                .curNm(CurrencyMapper.getName(curUnit))
                .rate(rate)
                .provider(getProviderName())
                .updatedAt(timestamp) // 조합된 타임스탬프 적용
                .changeAmount(BigDecimal.ZERO)
                .changeRate(BigDecimal.ZERO)
                .build();
    }
}