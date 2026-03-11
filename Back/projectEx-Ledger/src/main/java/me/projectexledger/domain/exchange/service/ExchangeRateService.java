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
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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

    private static final String REDIS_KEY = "LATEST_RATES";
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Transactional
    public List<ExchangeRateDTO> updateAndCacheRates() {
        LocalDate today = LocalDate.now();

        // 주말 및 공휴일 차단 로직
        if (isWeekend(today) || isPublicHoliday(today)) {
            log.info("휴일이므로 환율 수집 건너뜀: {}", today);
            return getLatestRatesFromCacheOrDb();
        }

        if (isEximDataExists(today)) return getLatestRatesFromCacheOrDb();

        List<ExchangeRateDTO> dtos = fetchFromBestSource(today.toString());
        processAndSaveRates(dtos);

        return getLatestRatesFromCacheOrDb();
    }

    public void backfillHistoricalData() {
        log.info("=== 지능형 데이터 점검 시작 ===");
        for (int i = 20; i >= 0; i--) {
            LocalDate targetDate = LocalDate.now().minusDays(i);
            if (isWeekend(targetDate) || isPublicHoliday(targetDate)) continue;
            if (isEximDataExists(targetDate)) continue;

            List<ExchangeRateDTO> dtos = fetchFromBestSource(targetDate.toString());
            processAndSaveRates(dtos);
        }
    }

    /**
     * 실제 데이터 날짜 기준으로 중복 체크 및 품질 업그레이드
     */
    private void processAndSaveRates(List<ExchangeRateDTO> dtos) {
        if (dtos == null || dtos.isEmpty()) return;

        String updatedAtStr = dtos.get(0).getUpdatedAt();
        LocalDate dataDate = LocalDate.parse(updatedAtStr.substring(0, 10));
        String provider = dtos.get(0).getProvider();

        // 1. 동일 공급자 중복 방지
        if (exchangeRateRepository.existsByCurUnitAndProviderAndUpdatedAtBetween(
                "USD", provider, dataDate.atStartOfDay(), dataDate.atTime(LocalTime.MAX))) return;

        // 2. Frankfurter 수집 시 이미 데이터가 있다면 건너뜀
        if (provider.equals("FRANKFURTER") && isAnyDataExists(dataDate)) return;

        // 3. 기존 데이터 삭제 후 새 데이터 저장 (Upgrade)
        deleteRatesByDate(dataDate);
        saveToDatabaseTransactional(dtos);
        log.info("[{}] 데이터 저장 완료 (Provider: {})", dataDate, provider);
    }

    private List<ExchangeRateDTO> fetchFromBestSource(String dateStr) {
        try {
            List<ExchangeRateDTO> eximDtos = koreaEximClient.fetchHistoricalRates(dateStr);
            if (eximDtos != null && !eximDtos.isEmpty()) return eximDtos;
        } catch (Exception e) { log.warn("KOREAEXIM 실패: {}", dateStr); }
        return frankfurterClient.fetchHistoricalRates(dateStr);
    }

    private boolean isPublicHoliday(LocalDate date) {
        int year = date.getYear();
        int month = date.getMonthValue();
        int day = date.getDayOfMonth();
        if (year == 2026) {
            if (month == 1 && day == 1) return true;
            if (month == 2 && (day == 16 || day == 17 || day == 18)) return true;
            if (month == 3 && (day == 1 || day == 2)) return true;
            if (month == 5 && (day == 5 || day == 24 || day == 25)) return true;
            if (month == 6 && (day == 3 || day == 6)) return true;
            if (month == 8 && (day == 15 || day == 17)) return true;
            if (month == 9 && (day == 24 || day == 25 || day == 26)) return true;
            if (month == 10 && (day == 3 || day == 5 || day == 9)) return true;
            if (month == 12 && day == 25) return true;
        }
        return false;
    }

    private boolean isWeekend(LocalDate date) {
        return date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY;
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
                        .updatedAt(LocalDateTime.parse(dto.getUpdatedAt(), formatter)).build())
                .collect(Collectors.toList());
        exchangeRateRepository.saveAll(entities);
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
        } catch (Exception e) { log.warn("Redis 연결 불가"); }

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
        try { redisTemplate.opsForValue().set(REDIS_KEY, rates, Duration.ofHours(1)); }
        catch (Exception e) { log.error("Redis 캐싱 실패"); }
    }

    @PostConstruct
    public void init() { backfillHistoricalData(); }

    public BigDecimal getLatestRate(String currency) {
        return getLatestRatesFromCacheOrDb().stream().filter(dto -> dto.getCurUnit().equals(currency))
                .map(ExchangeRateDTO::getRate).findFirst().orElseThrow();
    }

    /**
     * 🌟 [추가] 차트 시각화를 위한 최근 N일간의 환율 이력 조회
     * ExchangeRateController에서 발생하는 컴파일 에러를 해결합니다.
     */
    @Transactional(readOnly = true)
    public List<ExchangeRateResponseDTO> getExchangeRateHistory(String curUnit, int days) {
        LocalDateTime start = LocalDateTime.now().minusDays(days);
        LocalDateTime end = LocalDateTime.now();

        // 저장된 데이터 날짜 순으로 정렬하여 조회
        return exchangeRateRepository.findByCurUnitAndUpdatedAtBetweenOrderByUpdatedAtAsc(curUnit, start, end)
                .stream()
                .map(entity -> ExchangeRateResponseDTO.builder()
                        .date(entity.getUpdatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
                        .rate(entity.getRate())
                        .build())
                .collect(Collectors.toList());
    }
}