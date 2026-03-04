package me.projectexledger.domain.exchange.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.exchange.api.FrankfurterClient;
import me.projectexledger.domain.exchange.api.KoreaEximClient;
import me.projectexledger.domain.exchange.dto.ExchangeRateDTO;
import me.projectexledger.domain.exchange.dto.ExchangeRateResponseDTO;
import me.projectexledger.domain.exchange.entity.ExchangeRate;
import me.projectexledger.domain.exchange.repository.ExchangeRateRepository;
import me.projectexledger.domain.exchange.utils.CurrencyMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeRateService {

    private final KoreaEximClient koreaEximClient;
    private final FrankfurterClient frankfurterClient;
    private final ExchangeRateRepository exchangeRateRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String REDIS_KEY = "LATEST_RATES";
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Transactional
    public List<ExchangeRateDTO> updateAndCacheRates() {
        LocalDate today = LocalDate.now();

        if (isEximDataAlreadyExists(today)) {
            log.info("⏩ 오늘자 KOREAEXIM 데이터가 이미 존재합니다.");
            return getLatestRatesFromCacheOrDb();
        }

        List<ExchangeRateDTO> dtos = fetchFromBestSource(today.toString());

        if (dtos != null && !dtos.isEmpty()) {
            deleteRatesByDate(today); // 기존 하위 우선순위 데이터 삭제
            saveToDatabaseTransactional(dtos);
            log.info("✅ 환율 데이터 업데이트 성공 (Provider: {})", dtos.get(0).getProvider());
            return getLatestRatesFromCacheOrDb();
        }

        return new ArrayList<>();
    }

    @Transactional
    public void cleanupOldRates(LocalDateTime threshold) {
        exchangeRateRepository.deleteOldRates(threshold);
    }

    public List<ExchangeRateDTO> getLatestRatesFromCacheOrDb() {
        try {
            @SuppressWarnings("unchecked")
            List<ExchangeRateDTO> cachedRates = (List<ExchangeRateDTO>) redisTemplate.opsForValue().get(REDIS_KEY);
            if (cachedRates != null && !cachedRates.isEmpty()) return cachedRates;
        } catch (Exception e) {
            log.warn("⚠️ Redis 연결 불가: {}", e.getMessage());
        }

        List<ExchangeRate> entities = exchangeRateRepository.findAllLatestRates();
        List<ExchangeRateDTO> dtos = calculateChangeStats(entities); // 🌟 에러 발생 지점 해결!

        if (!dtos.isEmpty()) saveToCache(dtos);
        return dtos;
    }

    @Transactional(readOnly = true)
    public List<ExchangeRateResponseDTO> getExchangeRateHistory(String curUnit, int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        return exchangeRateRepository.findByCurUnitAndUpdatedAtAfterOrderByUpdatedAtAsc(curUnit, startDate)
                .stream()
                .map(ExchangeRateResponseDTO::from)
                .collect(Collectors.toList());
    }

    public void backfillHistoricalData() {
        log.info("=== 📂 데이터 백필/업그레이드 프로세스 시작 (14일) ===");
        for (int i = 14; i >= 0; i--) {
            LocalDate targetDate = LocalDate.now().minusDays(i);
            if (isEximDataAlreadyExists(targetDate)) continue;

            List<ExchangeRateDTO> finalDtos = fetchFromBestSource(targetDate.toString());
            if (!finalDtos.isEmpty()) {
                deleteRatesByDate(targetDate);
                saveToDatabaseTransactional(finalDtos);
                log.info("📥 [{}] 데이터 확보/업그레이드 완료 ({})", targetDate, finalDtos.get(0).getProvider());
            }
        }
    }

    // --- 내부 지원 메서드 (Private Helpers) ---

    private boolean isEximDataAlreadyExists(LocalDate date) {
        // "USD" 기준으로 해당 날짜에 KOREAEXIM 데이터가 있는지 확인
        return exchangeRateRepository.findFirstByCurUnitOrderByUpdatedAtDesc("USD")
                .map(rate -> "KOREAEXIM".equals(rate.getProvider()) &&
                        rate.getUpdatedAt().toLocalDate().equals(date))
                .orElse(false);
    }

    @Transactional
    public void deleteRatesByDate(LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);
        exchangeRateRepository.deleteByUpdatedAtBetween(start, end); // Repository에 추가한 메서드 사용
    }

    private List<ExchangeRateDTO> fetchFromBestSource(String dateStr) {
        try {
            List<ExchangeRateDTO> eximDtos = koreaEximClient.fetchHistoricalRates(dateStr);
            if (eximDtos != null && !eximDtos.isEmpty()) return eximDtos;
        } catch (Exception e) {
            log.warn("⚠️ KOREAEXIM 호출 실패: {}", e.getMessage());
        }
        return frankfurterClient.fetchHistoricalRates(dateStr).stream()
                .filter(dto -> CurrencyMapper.isSupported(dto.getCurUnit()))
                .collect(Collectors.toList());
    }

    // 🌟 [핵심 복구] 전일 대비 등락 통계 계산 메서드
    private List<ExchangeRateDTO> calculateChangeStats(List<ExchangeRate> entities) {
        List<ExchangeRateDTO> dtos = new ArrayList<>();
        for (ExchangeRate today : entities) {
            // 해당 통화의 최신 2개 데이터를 가져옴 (오늘, 어제)
            List<ExchangeRate> history = exchangeRateRepository.findRecentByCurUnit(
                    today.getCurUnit(), PageRequest.of(0, 2));

            BigDecimal changeAmount = BigDecimal.ZERO;
            BigDecimal changeRate = BigDecimal.ZERO;

            if (history.size() >= 2) {
                ExchangeRate yesterday = history.get(1);
                changeAmount = today.getRate().subtract(yesterday.getRate());
                if (yesterday.getRate().compareTo(BigDecimal.ZERO) != 0) {
                    changeRate = changeAmount.divide(yesterday.getRate(), 4, RoundingMode.HALF_UP)
                            .multiply(new BigDecimal("100"));
                }
            }

            dtos.add(ExchangeRateDTO.builder()
                    .curUnit(today.getCurUnit()).curNm(today.getCurNm())
                    .rate(today.getRate()).provider(today.getProvider())
                    .updatedAt(today.getUpdatedAt().format(formatter))
                    .changeAmount(changeAmount).changeRate(changeRate).build());
        }
        return dtos;
    }

    @Transactional
    public void saveToDatabaseTransactional(List<ExchangeRateDTO> dtos) {
        List<ExchangeRate> entities = dtos.stream()
                .map(dto -> ExchangeRate.builder()
                        .curUnit(dto.getCurUnit()).curNm(dto.getCurNm())
                        .rate(dto.getRate()).provider(dto.getProvider())
                        .updatedAt(parseDateTime(dto.getUpdatedAt())).build())
                .collect(Collectors.toList());
        exchangeRateRepository.saveAll(entities);
    }

    private LocalDateTime parseDateTime(String dateTimeStr) {
        try {
            return LocalDateTime.parse(dateTimeStr, formatter);
        } catch (Exception e) {
            try {
                return LocalDate.parse(dateTimeStr).atStartOfDay();
            } catch (Exception e2) {
                return LocalDateTime.now();
            }
        }
    }

    private void saveToCache(List<ExchangeRateDTO> rates) {
        try {
            redisTemplate.opsForValue().set(REDIS_KEY, rates, Duration.ofMinutes(10));
        } catch (Exception ignored) {}
    }

    @PostConstruct
    public void init() {
        if (!isEximDataAlreadyExists(LocalDate.now())) {
            backfillHistoricalData();
        }
    }

    public BigDecimal getLatestRate(String currency) {
        return getLatestRatesFromCacheOrDb().stream()
                .filter(dto -> dto.getCurUnit().equals(currency))
                .map(ExchangeRateDTO::getRate)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("지원하지 않는 통화입니다: " + currency));
    }
}