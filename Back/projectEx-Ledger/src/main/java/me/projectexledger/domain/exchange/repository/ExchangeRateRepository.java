package me.projectexledger.domain.exchange.repository;

import me.projectexledger.domain.exchange.entity.ExchangeRate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {

    // 🌟 1. [추가] 특정 기간의 데이터를 삭제 (데이터 소스 업그레이드/Overwrite 용)
    @Modifying
    @Transactional
    void deleteByUpdatedAtBetween(LocalDateTime start, LocalDateTime end);

    // 🌟 2. 14일이 지난 오래된 데이터를 삭제하는 쿼리
    @Modifying
    @Transactional
    @Query("DELETE FROM ExchangeRate er WHERE er.updatedAt < :threshold")
    void deleteOldRates(@Param("threshold") LocalDateTime threshold);

    // 3. 특정 통화의 기준 시간 이후 데이터 조회 (차트용)
    List<ExchangeRate> findByCurUnitAndUpdatedAtAfterOrderByUpdatedAtAsc(
            String curUnit,
            LocalDateTime updatedAt
    );

    // 4. 특정 통화의 가장 최신 고시 정보 조회
    Optional<ExchangeRate> findFirstByCurUnitOrderByUpdatedAtDesc(String curUnit);

    // 5. 특정 통화의 기간별 환율 조회
    List<ExchangeRate> findByCurUnitAndUpdatedAtBetweenOrderByUpdatedAtAsc(
            String curUnit, LocalDateTime start, LocalDateTime end);

    // 6. 전광판용: 각 통화별 가장 최신 행 추출 (Native Query)
    @Query(value = "SELECT * FROM exchange_rates er1 " +
            "WHERE er1.id IN (SELECT MAX(er2.id) FROM exchange_rates er2 GROUP BY er2.cur_unit)",
            nativeQuery = true)
    List<ExchangeRate> findAllLatestRates();

    // 7. 특정 통화의 최근 이력을 N개 가져오기
    @Query("SELECT er FROM ExchangeRate er WHERE er.curUnit = :curUnit ORDER BY er.updatedAt DESC")
    List<ExchangeRate> findRecentByCurUnit(@Param("curUnit") String curUnit, Pageable pageable);

    // 8. 특정 시간 범위 내 데이터 존재 여부 확인
    boolean existsByCurUnitAndUpdatedAtBetween(String curUnit, LocalDateTime start, LocalDateTime end);
}