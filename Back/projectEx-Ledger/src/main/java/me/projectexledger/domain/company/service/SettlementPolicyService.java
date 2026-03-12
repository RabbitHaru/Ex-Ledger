package me.projectexledger.domain.company.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.company.entity.SettlementPolicy;
import me.projectexledger.domain.company.repository.SettlementPolicyRepository;
import me.projectexledger.domain.settlement.dto.SettlementPolicyUpdateRequest;
import me.projectexledger.domain.client.entity.ClientGrade;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 🌟 [추가 1] 서버 시작 이벤트를 감지하기 위한 클래스 임포트
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class SettlementPolicyService {

    private final SettlementPolicyRepository policyRepository;

    // 🌟 [수정] 서버 시작 시 파트너십 기반 '원가 환전' 정책을 DB에 강제 주입합니다.
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void syncGradePoliciesToDB() {
        log.info("[Policy] 🚀 파트너십 강화 정책 동기화: DB 수수료를 최신 기획안으로 덮어씁니다.");

        // 1️⃣ [파트너]: 수수료 0.5%, 전신료 0원, 스프레드 2.0 (최소 마진), 우대율 1.0 (100%)
        // "파트너에게는 환전 수익을 남기지 않고 실시간 환율 그대로 정산한다"는 정책 반영
        updateGradePolicy(ClientGrade.PARTNER, new SettlementPolicyUpdateRequest(
                new BigDecimal("0.005"),
                BigDecimal.ZERO,
                new BigDecimal("2.0"),
                new BigDecimal("1.0")
        ));

        // 2️⃣ [일반]: 수수료 1.5%, 전신료 2000원, 스프레드 10.0, 우대율 0.90 (90%)
        // 플랫폼 운영을 위한 표준 수익 구조 반영
        updateGradePolicy(ClientGrade.GENERAL, new SettlementPolicyUpdateRequest(
                new BigDecimal("0.015"),
                new BigDecimal("2000"),
                new BigDecimal("10.0"),
                new BigDecimal("0.90")
        ));
    }

    /**
     * [어드민 전용] 특정 가맹점의 현재 정책 조회 (화면 표시용)
     */
    @Transactional(readOnly = true)
    public SettlementPolicy getPolicy(String merchantId) {
        return policyRepository.findByMerchantId(merchantId)
                .orElseGet(() -> getPolicyOrDefault(merchantId));
    }

    /**
     * [어드민 전용] 가맹점 개별 수수료 정책 업데이트 또는 신규 생성
     */
    @Transactional
    public void updatePolicy(String merchantId, SettlementPolicyUpdateRequest request) {
        SettlementPolicy policy = policyRepository.findByMerchantId(merchantId)
                .orElseGet(() -> {
                    log.info("[Policy] {} 가맹점의 신규 정책을 생성합니다.", merchantId);
                    return SettlementPolicy.builder()
                            .merchantId(merchantId)
                            .platformFeeRate(BigDecimal.ZERO)
                            .networkFee(BigDecimal.ZERO)
                            .exchangeSpread(BigDecimal.ZERO)
                            .preferenceRate(BigDecimal.ONE)
                            .build();
                });

        policy.updatePolicy(
                request.getPlatformFeeRate(),
                request.getNetworkFee(),
                request.getExchangeSpread(),
                request.getPreferenceRate()
        );

        policyRepository.save(policy);
        log.info("[Policy] {} 가맹점의 개별 수수료 정책이 업데이트 되었습니다.", merchantId);
    }

    /**
     * [송금 엔진용] 특정 가맹점의 정책 조회 (없으면 DEFAULT 반환 - 기존 호환용)
     */
    @Transactional(readOnly = true)
    public SettlementPolicy getPolicyOrDefault(String merchantId) {
        return policyRepository.findByMerchantId(merchantId)
                .orElseGet(() -> createDefaultPolicy("DEFAULT"));
    }

    /**
     * [추가] 가맹점의 개별 정책이 없으면 '등급(VIP/GENERAL)' 기본값을 가져오는 핵심 로직
     * 정산 엔진(SettlementEngineService)에서 이 메서드를 호출하게 됩니다.
     */
    @Transactional(readOnly = true)
    public SettlementPolicy getEffectivePolicy(String merchantId, ClientGrade grade) {
        return policyRepository.findByMerchantId(merchantId)
                .orElseGet(() -> getGradeDefaultPolicy(grade));
    }

    @Transactional
    public SettlementPolicy getGradeDefaultPolicy(ClientGrade grade) {
        String gradeMerchantId = "GRADE_" + grade.name(); // 예: GRADE_PARTNER, GRADE_GENERAL

        return policyRepository.findByMerchantId(gradeMerchantId)
                .orElseGet(() -> {
                    SettlementPolicy newGradePolicy;
                    // 🌟 VIP 대신 PARTNER 등급을 체크합니다.
                    if (grade == ClientGrade.PARTNER) {
                        newGradePolicy = SettlementPolicy.builder()
                                .merchantId(gradeMerchantId)
                                .platformFeeRate(new BigDecimal("0.005")) // 파트너 정산 수수료 0.5%
                                .networkFee(BigDecimal.ZERO)              // 파트너 전신료 면제(0원)
                                .exchangeSpread(new BigDecimal("2.0"))    // 🌟 파트너 최소 마진 (원가 정산)
                                .preferenceRate(new BigDecimal("1.0"))    // 🌟 환율 우대율 100%
                                .build();
                    } else {
                        newGradePolicy = SettlementPolicy.builder()
                                .merchantId(gradeMerchantId)
                                .platformFeeRate(new BigDecimal("0.015")) // 일반 정산 수수료 1.5%
                                .networkFee(new BigDecimal("2000"))       // 일반 전신료 2000원
                                .exchangeSpread(new BigDecimal("10.0"))   // 일반 마진 10.0
                                .preferenceRate(new BigDecimal("0.90"))   // 일반 우대율 90%
                                .build();
                    }
                    return policyRepository.save(newGradePolicy);
                });
    }

    /**
     * [추가] "나중에 힘들 때 한 번에 바꾸기" 위한 등급 전역 정책 업데이트 로직
     * 어드민 화면에서 'VIP 등급 수수료 일괄 변경' 버튼을 누르면 작동합니다.
     */
    @Transactional
    public void updateGradePolicy(ClientGrade grade, SettlementPolicyUpdateRequest request) {
        SettlementPolicy policy = getGradeDefaultPolicy(grade); // 기존 등급 정책을 가져옴

        policy.updatePolicy(
                request.getPlatformFeeRate(),
                request.getNetworkFee(),
                request.getExchangeSpread(),
                request.getPreferenceRate()
        );

        policyRepository.save(policy);
        log.info("[Policy]  {} 등급의 전역 수수료 정책이 일괄 업데이트 되었습니다.", grade.name());
    }

    // [수정] 최후의 보루인 시스템 기본 정책도 '일반(GENERAL)' 기준에 맞춰 동기화
    private SettlementPolicy createDefaultPolicy(String id) {
        return SettlementPolicy.builder()
                .merchantId(id)
                .platformFeeRate(new BigDecimal("0.015"))
                .networkFee(new BigDecimal("2000"))       // 기본 송금 수수료 2000원
                .exchangeSpread(new BigDecimal("20.0"))
                .preferenceRate(new BigDecimal("0.90"))
                .build();
    }
}