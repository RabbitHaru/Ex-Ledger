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

    /**
     * 실시간 환율 수집 및 캐싱 (SSE 알림 포함)
     */
    @Transactional
    public List<ExchangeRateDTO> updateAndCacheRates() {
        LocalDate today = LocalDate.now();

        // 1. 휴일 및 주말 차단 로직 (C담당 상세 로직)
        if (isWeekend(today) || isPublicHoliday(today)) {
            log.info("⏩ 휴일이므로 환율 수집을 건너뜁니다: {}", today);
            return getLatestRatesFromCacheOrDb();
        }

        // 2. 이미 양질의 데이터가 있는지 확인
        if (isEximDataExists(today)) {
            return getLatestRatesFromCacheOrDb();
        }

        // 3. 데이터 수집 및 처리
        List<ExchangeRateDTO> dtos = fetchFromBestSource(today.toString());
        if (dtos != null && !dtos.isEmpty()) {
            processAndSaveRates(dtos);

            // 🌟 [B담당] 실시간 SSE 브로드캐스트 전송
            sseEmitters.broadcastExchangeUpdate(dtos);
        }

        return getLatestRatesFromCacheOrDb();
    }

    /**
     * 데이터 품질 관리 및 저장 (C담당 핵심 로직)
     */
    private void processAndSaveRates(List<ExchangeRateDTO> dtos) {
        if (dtos == null || dtos.isEmpty()) return;

        String updatedAtStr = dtos.get(0).getUpdatedAt();
        LocalDate dataDate = parseLocalDate(updatedAtStr);
        String provider = dtos.get(0).getProvider();

        // 동일 공급자 중복 저장 방지
        if (exchangeRateRepository.existsByCurUnitAndProviderAndUpdatedAtBetween(
                "USD", provider, dataDate.atStartOfDay(), dataDate.atTime(LocalTime.MAX))) return;

        // Frankfurter 수집 시 이미 다른 데이터가 있다면 건너뜀 (KOREAEXIM 우선순위)
        if (provider.equals("FRANKFURTER") && isAnyDataExists(dataDate)) return;

        // 기존 데이터 삭제 후 새 데이터로 업그레이드 저장
        deleteRatesByDate(dataDate);
        saveToDatabaseTransactional(dtos);
        log.info("✅ [{}] 데이터 저장/업그레이드 완료 (Provider: {})", dataDate, provider);
    }

    /**
     * 차트 시각화를 위한 환율 이력 조회 (B담당 최적화 로직)
     */
    @Transactional(readOnly = true)
    public List<ExchangeRateResponseDTO> getExchangeRateHistory(String curUnit, int days) {
        LocalDateTime start = LocalDateTime.now().minusDays(days + 7); // 여유 있게 조회

        List<ExchangeRate> rates = exchangeRateRepository.findByCurUnitAndUpdatedAtAfterOrderByUpdatedAtAsc(curUnit, start);

        // 🌟 TreeMap을 이용해 날짜별 중복 제거 및 정렬된 차트 데이터 생성
        return rates.stream()
                .collect(Collectors.toMap(
                        rate -> rate.getUpdatedAt().toLocalDate(),
                        rate -> rate,
                        (existing, replacement) -> replacement, // 같은 날 데이터가 여러개면 마지막 것 사용
                        TreeMap::new
                ))
                .values().stream()
                .map(entity -> ExchangeRateResponseDTO.builder()
                        .date(entity.getUpdatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
                        .rate(entity.getRate())
                        .build())
                .collect(Collectors.toList());
    }

    private List<ExchangeRateDTO> fetchFromBestSource(String dateStr) {
        try {
            List<ExchangeRateDTO> eximDtos = koreaEximClient.fetchHistoricalRates(dateStr);
            if (eximDtos != null && !eximDtos.isEmpty()) return eximDtos;
        } catch (Exception e) {
            log.warn("⚠️ KOREAEXIM 호출 실패: {}", dateStr);
        }
        return frankfurterClient.fetchHistoricalRates(dateStr).stream()
                .filter(dto -> CurrencyMapper.isSupported(dto.getCurUnit()))
                .collect(Collectors.toList());
    }

    // 2026년 공휴일 체크 로직 (C담당)
    private boolean isPublicHoliday(LocalDate date) {
        if (date.getYear() != 2026) return false;
        int m = date.getMonthValue();
        int d = date.getDayOfMonth();

        if (m == 1 && d == 1) return true; // 신정
        if (m == 2 && (d == 16 || d == 17 || d == 18)) return true; // 설날
        if (m == 3 && (d == 1 || d == 2)) return true; // 삼일절/대체
        if (m == 5 && (d == 5 || d == d || d == 25)) return true; // 어린이날/석신
        if (m == 6 && d == 6) return true; // 현충일
        if (m == 8 && d == 15) return true; // 광복절
        if (m == 9 && (d == 24 || d == 25 || d == 26)) return true; // 추석
        if (m == 10 && (d == 3 || d == 9)) return true; // 개천절/한글날
        if (m == 12 && d == 25) return true; // 성탄절
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
                        .updatedAt(parseDateTime(dto.getUpdatedAt())).build())
                .collect(Collectors.toList());
        exchangeRateRepository.saveAll(entities);
    }

    private LocalDateTime parseDateTime(String dtStr) {
        try { return LocalDateTime.parse(dtStr, formatter); }
        catch (Exception e) { return LocalDate.parse(dtStr.substring(0, 10)).atStartOfDay(); }
    }

    private LocalDate parseLocalDate(String dtStr) {
        return LocalDate.parse(dtStr.substring(0, 10));
    }

    public List<ExchangeRateDTO> getLatestRatesFromCacheOrDb() {
        try {
            @SuppressWarnings("unchecked")
            List<ExchangeRateDTO> cachedRates = (List<ExchangeRateDTO>) redisTemplate.opsForValue().get(REDIS_KEY);
            if (cachedRates != null && !cachedRates.isEmpty()) return cachedRates;
        } catch (Exception e) { log.warn("⚠️ Redis 연결 불가"); }

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
        catch (Exception e) { log.error("⚠️ Redis 캐싱 실패"); }
    }

    @PostConstruct
    public void init() { backfillHistoricalData(); }

    public void backfillHistoricalData() {
        log.info("=== 📂 지능형 데이터 점검 및 업그레이드 시작 (최근 20일) ===");
        for (int i = 20; i >= 0; i--) {
            LocalDate targetDate = LocalDate.now().minusDays(i);
            if (isWeekend(targetDate) || isPublicHoliday(targetDate)) continue;
            if (isEximDataExists(targetDate)) continue;

            List<ExchangeRateDTO> dtos = fetchFromBestSource(targetDate.toString());
            processAndSaveRates(dtos);
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