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
import me.projectexledger.domain.notification.service.SseEmitters;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeRateService {

    private final KoreaEximClient koreaEximClient;
    private final FrankfurterClient frankfurterClient;
    private final ExchangeRateRepository exchangeRateRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final SseEmitters sseEmitters;

    private static final String REDIS_KEY = "LATEST_RATES";
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Transactional
    public List<ExchangeRateDTO> updateAndCacheRates() {
        LocalDate today = LocalDate.now();

        if (today.getDayOfWeek() == DayOfWeek.SATURDAY || today.getDayOfWeek() == DayOfWeek.SUNDAY) {
            log.info("⏩ 주말이므로 환율 수집을 건너뜁니다: {}", today);
            return getLatestRatesFromCacheOrDb();
        }

        if (isEximDataExists(today)) {
            log.info("✅ 오늘자 최신 수출입은행 데이터가 이미 존재합니다.");
            return getLatestRatesFromCacheOrDb();
        }

        List<ExchangeRateDTO> dtos = fetchFromBestSource(today.toString());
        if (dtos != null && !dtos.isEmpty()) {
            processAndSaveRates(dtos);
            sseEmitters.broadcastExchangeUpdate(dtos);
        } else {
            log.warn("⚠️ 모든 API 소스로부터 환율 데이터를 가져오지 못했습니다.");
        }

        return getLatestRatesFromCacheOrDb();
    }

    @Transactional(readOnly = true)
    public List<ExchangeRateResponseDTO> getExchangeRateHistory(String curUnit, int days) {
        LocalDateTime start = LocalDateTime.now().minusDays(days + 7);

        List<ExchangeRate> rates = exchangeRateRepository.findByCurUnitAndUpdatedAtAfterOrderByUpdatedAtAsc(curUnit, start);

        return rates.stream()
                .collect(Collectors.toMap(
                        rate -> rate.getUpdatedAt().toLocalDate(),
                        rate -> rate,
                        (existing, replacement) -> replacement,
                        TreeMap::new
                ))
                .values().stream()
                .map(entity -> ExchangeRateResponseDTO.builder()
                        .date(entity.getUpdatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
                        .rate(entity.getRate())
                        .build())
                .collect(Collectors.toList());
    }

    // 🌟 [추가] TransactionService에서 사용하는 최신 환율 1건 조회 메서드
    public BigDecimal getLatestRate(String currency) {
        return getLatestRatesFromCacheOrDb().stream()
                .filter(dto -> dto.getCurUnit().equals(currency))
                .map(ExchangeRateDTO::getRate)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("지원하지 않는 통화이거나 데이터를 찾을 수 없습니다: " + currency));
    }

    private void processAndSaveRates(List<ExchangeRateDTO> dtos) {
        if (dtos == null || dtos.isEmpty()) return;

        String updatedAtStr = dtos.get(0).getUpdatedAt();
        LocalDate dataDate = parseLocalDate(updatedAtStr);
        String provider = dtos.get(0).getProvider();

        if (exchangeRateRepository.existsByCurUnitAndProviderAndUpdatedAtBetween(
                "USD", provider, dataDate.atStartOfDay(), dataDate.atTime(LocalTime.MAX))) return;

        if (provider.equals("FRANKFURTER") && isAnyDataExists(dataDate)) {
            log.info("⏩ [{}] 이미 데이터가 존재하여 프랑크푸르터 데이터 저장을 생략합니다.", dataDate);
            return;
        }

        deleteRatesByDate(dataDate);
        saveToDatabaseTransactional(dtos);
        log.info("✅ [{}] 환율 데이터 업데이트 성공 (제공처: {})", dataDate, provider);
    }

    private List<ExchangeRateDTO> fetchFromBestSource(String dateStr) {
        try {
            List<ExchangeRateDTO> eximDtos = koreaEximClient.fetchHistoricalRates(dateStr);
            if (eximDtos != null && !eximDtos.isEmpty()) return eximDtos;
        } catch (Exception e) {
            log.warn("⚠️ [수출입은행] 호출 실패: {}", dateStr);
        }

        log.info("🔄 [대체수집] 프랑크푸르터 API를 시도합니다.");
        return frankfurterClient.fetchHistoricalRates(dateStr);
    }

    private boolean isEximDataExists(LocalDate date) {
        return exchangeRateRepository.existsByCurUnitAndProviderAndUpdatedAtBetween(
                "USD", "KOREAEXIM", date.atStartOfDay(), date.atTime(LocalTime.MAX));
    }

    private boolean isAnyDataExists(LocalDate date) {
        return exchangeRateRepository.existsByCurUnitAndUpdatedAtBetween(
                "USD", date.atStartOfDay(), date.atTime(LocalTime.MAX));
    }

    @Transactional
    public void deleteRatesByDate(LocalDate date) {
        exchangeRateRepository.deleteByUpdatedAtBetween(date.atStartOfDay(), date.atTime(LocalTime.MAX));
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

    @Transactional
    public void cleanupOldRates(LocalDateTime threshold) {
        log.info("🧹 오래된 환율 데이터 삭제 중 (기준일: {})", threshold);
        exchangeRateRepository.deleteOldRates(threshold);
    }

    private LocalDateTime parseDateTime(String dtStr) {
        try {
            return LocalDateTime.parse(dtStr, formatter);
        } catch (Exception e) {
            return LocalDate.parse(dtStr.substring(0, 10)).atStartOfDay();
        }
    }

    private LocalDate parseLocalDate(String dtStr) {
        return LocalDate.parse(dtStr.substring(0, 10));
    }

    public List<ExchangeRateDTO> getLatestRatesFromCacheOrDb() {
        try {
            @SuppressWarnings("unchecked")
            List<ExchangeRateDTO> cachedRates = (List<ExchangeRateDTO>) redisTemplate.opsForValue().get(REDIS_KEY);
            if (cachedRates != null && !cachedRates.isEmpty()) return cachedRates;
        } catch (Exception e) {
            log.warn("⚠️ 레디스 연결 불가, DB에서 직접 조회합니다.");
        }

        List<ExchangeRate> entities = exchangeRateRepository.findAllLatestRates();
        List<ExchangeRateDTO> dtos = calculateChangeStats(entities);
        if (!dtos.isEmpty()) saveToCache(dtos);
        return dtos;
    }

    private List<ExchangeRateDTO> calculateChangeStats(List<ExchangeRate> entities) {
        List<ExchangeRateDTO> dtos = new ArrayList<>();
        for (ExchangeRate today : entities) {
            List<ExchangeRate> history = exchangeRateRepository.findRecentByCurUnit(today.getCurUnit(), PageRequest.of(0, 2));
            BigDecimal changeAmount = BigDecimal.ZERO;
            BigDecimal changeRate = BigDecimal.ZERO;

            if (history.size() >= 2) {
                ExchangeRate yesterday = history.get(1);
                changeAmount = today.getRate().subtract(yesterday.getRate());
                if (yesterday.getRate().compareTo(BigDecimal.ZERO) != 0) {
                    changeRate = changeAmount.divide(yesterday.getRate(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
                }
            }
            dtos.add(ExchangeRateDTO.builder()
                    .curUnit(today.getCurUnit()).curNm(today.getCurNm()).rate(today.getRate()).provider(today.getProvider())
                    .updatedAt(today.getUpdatedAt().format(formatter)).changeAmount(changeAmount).changeRate(changeRate).build());
        }
        return dtos;
    }

    private void saveToCache(List<ExchangeRateDTO> rates) {
        try {
            redisTemplate.opsForValue().set(REDIS_KEY, rates, Duration.ofHours(1));
        } catch (Exception e) {
            log.error("❌ 레디스 캐싱 실패");
        }
    }

    @PostConstruct
    public void init() {
        backfillHistoricalData();
    }

    public void backfillHistoricalData() {
        log.info("=== 📂 지능형 데이터 점검 및 보완 시작 (최근 20일) ===");
        int failureCount = 0;
        for (int i = 20; i >= 0; i--) {
            LocalDate targetDate = LocalDate.now().minusDays(i);
            if (isEximDataExists(targetDate)) continue;

            List<ExchangeRateDTO> dtos = fetchFromBestSource(targetDate.toString());
            if (dtos == null || dtos.isEmpty()) {
                failureCount++;
                if (failureCount >= 3) {
                    log.warn("⚠️ API 연속 실패로 과거 데이터 보완을 중단합니다.");
                    break;
                }
            } else {
                failureCount = 0; // reset on success
                processAndSaveRates(dtos);
            }
        }
    }
}