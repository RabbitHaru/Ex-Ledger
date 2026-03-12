package me.projectexledger.domain.exchange.api;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.config.KoreaEximProperties;
import me.projectexledger.domain.exchange.dto.ExchangeRateDTO;
import me.projectexledger.domain.exchange.utils.CurrencyMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

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
public class KoreaEximClient implements ExchangeRateProvider {

    private final KoreaEximProperties properties;
    private final RestTemplate restTemplate;
    private static final DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss");

    @org.springframework.beans.factory.annotation.Autowired
    public KoreaEximClient(KoreaEximProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(2000);
        this.restTemplate = new RestTemplate(factory);
    }

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
                log.warn("⚠️ [{}] 수출입은행 공시 데이터가 없습니다. (휴일 또는 공시 시간 전)", dateStr);
                return Collections.emptyList();
            }

            String timestamp = dateStr + " " + LocalDateTime.now().format(timeFormatter);

            return Arrays.stream(response)
                    .filter(map -> !map.get("cur_unit").toString().contains("KRW"))
                    .map(map -> convertToDto(map, timestamp))
                    .filter(dto -> CurrencyMapper.isSupported(dto.getCurUnit()))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("❌ [수출입은행] API 호출 오류 발생: {}", e.getMessage());
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