package me.projectexledger.domain.company.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.company.entity.SettlementPolicy;
import me.projectexledger.domain.company.repository.SettlementPolicyRepository;
import me.projectexledger.domain.settlement.dto.SettlementPolicyUpdateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class SettlementPolicyService {

    private final SettlementPolicyRepository policyRepository;

    /**
     * 🌟 [어드민 전용] 가맹점 수수료 정책 업데이트 또는 신규 생성
     */
    @Transactional
    public void updatePolicy(String merchantId, SettlementPolicyUpdateRequest request) {
        SettlementPolicy policy = policyRepository.findByMerchantId(merchantId)
                .orElseGet(() -> {
                    // 정책이 없으면 새로 생성하여 초기화
                    log.info("[Policy] {} 가맹점의 신규 정책을 생성합니다.", merchantId);
                    return SettlementPolicy.builder()
                            .merchantId(merchantId)
                            .platformFeeRate(BigDecimal.ZERO)
                            .networkFee(BigDecimal.ZERO)
                            .exchangeSpread(BigDecimal.ZERO)
                            .preferenceRate(BigDecimal.ONE)
                            .build();
                });

        // 엔티티의 updatePolicy 메서드를 호출하여 값 변경
        policy.updatePolicy(
                request.getPlatformFeeRate(),
                request.getNetworkFee(),
                request.getExchangeSpread(),
                request.getPreferenceRate()
        ); //

        policyRepository.save(policy);
        log.info("[Policy] {} 가맹점의 수수료 정책이 업데이트 되었습니다.", merchantId);
    }

    /**
     * 🌟 [송금 엔진용] 특정 가맹점의 정책 조회 (없으면 기본 정책 반환)
     */
    @Transactional(readOnly = true)
    public SettlementPolicy getPolicyOrDefault(String merchantId) {
        return policyRepository.findByMerchantId(merchantId)
                .orElseGet(this::createDefaultPolicy);
    }

    // 기본(Default) 일반 가맹점 정책
    private SettlementPolicy createDefaultPolicy() {
        return SettlementPolicy.builder()
                .merchantId("DEFAULT")
                .platformFeeRate(new BigDecimal("0.015")) // 기본 1.5%
                .networkFee(new BigDecimal("3000"))       // 기본 3000원
                .exchangeSpread(new BigDecimal("20.0"))   // 기본 20원 마진
                .preferenceRate(new BigDecimal("0.90"))   // 기본 90% 우대
                .build();
    }
}