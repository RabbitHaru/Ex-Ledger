package me.projectexledger.domain.exchange.dto;

import lombok.Builder;
import lombok.Getter;
import me.projectexledger.domain.exchange.entity.ExchangeRate;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

@Getter
@Builder
public class ExchangeRateResponseDTO {
    private Long id;
    private String curUnit;
    private String curNm;
    private BigDecimal rate;
    private String provider;
    private String updatedAt;
    private String date;

    public static ExchangeRateResponseDTO from(ExchangeRate entity) {
        return ExchangeRateResponseDTO.builder()
                .id(entity.getId())
                .curUnit(entity.getCurUnit())
                .curNm(entity.getCurNm())
                .rate(entity.getRate())
                .provider(entity.getProvider())
                .updatedAt(entity.getUpdatedAt().toString())
                .date(entity.getUpdatedAt().format(java.time.format.DateTimeFormatter.ofPattern("MM-dd")))
                .build();
    }
}