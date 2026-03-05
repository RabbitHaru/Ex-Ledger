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

    @Modifying
    @Transactional
    void deleteByUpdatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Modifying
    @Transactional
    @Query("DELETE FROM ExchangeRate er WHERE er.updatedAt < :threshold")
    void deleteOldRates(@Param("threshold") LocalDateTime threshold);

    List<ExchangeRate> findByCurUnitAndUpdatedAtAfterOrderByUpdatedAtAsc(String curUnit, LocalDateTime updatedAt);

    Optional<ExchangeRate> findFirstByCurUnitOrderByUpdatedAtDesc(String curUnit);

    List<ExchangeRate> findByCurUnitAndUpdatedAtBetweenOrderByUpdatedAtAsc(String curUnit, LocalDateTime start, LocalDateTime end);

    @Query(value = "SELECT * FROM exchange_rates er1 WHERE er1.id IN (SELECT MAX(er2.id) FROM exchange_rates er2 GROUP BY er2.cur_unit)", nativeQuery = true)
    List<ExchangeRate> findAllLatestRates();

    @Query("SELECT er FROM ExchangeRate er WHERE er.curUnit = :curUnit ORDER BY er.updatedAt DESC")
    List<ExchangeRate> findRecentByCurUnit(@Param("curUnit") String curUnit, Pageable pageable);

    boolean existsByCurUnitAndProviderAndUpdatedAtBetween(String curUnit, String provider, LocalDateTime start, LocalDateTime end);
}