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

    @Override
    public List<ExchangeRateDTO> fetchRates() {
        return fetchHistoricalRates(LocalDate.now().toString());
    }

    public List<ExchangeRateDTO> fetchHistoricalRates(String dateStr) {
        String searchDate = dateStr.replace("-", "");
        try {
            String url = UriComponentsBuilder.fromUriString(properties.getBaseUrl())
                    .queryParam("authkey", properties.getServiceKey())
                    .queryParam("data", properties.getDataType())
                    .queryParam("searchdate", searchDate)
                    .build()
                    .toUriString();

            Map<String, Object>[] response = restTemplate.getForObject(url, Map[].class);

            if (response == null || response.length == 0) {
                log.warn("⚠️ [{}] 데이터가 존재하지 않습니다.", dateStr);
                return Collections.emptyList();
            }

            String timestamp = dateStr + " 11:00:00";

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
        String rateStr = map.get("deal_bas_r").toString().replace(",", "");
        BigDecimal rate = new BigDecimal(rateStr);

        return ExchangeRateDTO.builder()
                .curUnit(curUnit)
                .curNm(CurrencyMapper.getName(curUnit))
                .rate(rate)
                .provider(getProviderName())
                .updatedAt(timestamp)
                .changeAmount(BigDecimal.ZERO)
                .changeRate(BigDecimal.ZERO)
                .build();
    }
}