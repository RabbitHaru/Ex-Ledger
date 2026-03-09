package me.projectexledger.common.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
public class ReconciliationUtil {

    /**
     * 내부 거래 내역과 외부(포트원) 결제 내역을 대조하여 오차를 찾아냅니다.
     * 시간 복잡도: O(N)
     */

    public List<String> reconcile(List<InternalTxDto> internalData, List<ExternalTxDto> externalData) {

        List<String> matchedTxIds = new ArrayList<>(); // 성공한 ID를 담을 바구니 준비

        // 1. 외부 데이터 HashMap 변환 (Member A님의 훌륭한 기존 로직 그대로 유지)
        Map<String, ExternalTxDto> externalDataMap = externalData.stream()
                .collect(Collectors.toMap(ExternalTxDto::getTransactionId, ext -> ext));

        // 2. 대조 작업
        for (InternalTxDto internal : internalData) {
            ExternalTxDto external = externalDataMap.get(internal.getTransactionId());

            if (external == null) {
                log.error("누락 발생...");
                continue;
            }

            if (internal.getAmount().compareTo(external.getAmount()) != 0) {
                log.error("금액 불일치...");
            } else {
                log.info("대조 일치: TX_ID: {}", internal.getTransactionId());

                matchedTxIds.add(internal.getTransactionId());
            }
        }

        return matchedTxIds;
    }

    public me.projectexledger.domain.settlement.entity.Settlement verifyAndProcess(
            me.projectexledger.domain.settlement.entity.Settlement pendingSettlement,
            Map<String, BigDecimal> portOneDataMap) {

        BigDecimal externalAmount = portOneDataMap.get(pendingSettlement.getTransactionId());

        if (externalAmount == null) {
            log.error("누락 발생: 포트원 측에 거래 내역이 없습니다. TX_ID: {}", pendingSettlement.getTransactionId());
            pendingSettlement.markAsDiscrepancy();
            return pendingSettlement;
        }

        if (pendingSettlement.getAmount().compareTo(externalAmount) != 0) {
            log.error("금액 불일치: 내부 금액 {}, 외부 금액 {}. TX_ID: {}",
                    pendingSettlement.getAmount(), externalAmount, pendingSettlement.getTransactionId());
            pendingSettlement.markAsDiscrepancy();
        } else {
            log.info("대조 일치: TX_ID: {}", pendingSettlement.getTransactionId());
            pendingSettlement.markAsCompleted();
        }

        return pendingSettlement;
    }

    public interface InternalTxDto {
        String getTransactionId();

        BigDecimal getAmount();
    }

    public interface ExternalTxDto {
        String getTransactionId();

        BigDecimal getAmount();
    }
}