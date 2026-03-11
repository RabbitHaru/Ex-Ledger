package me.projectexledger.domain.wallet.service;

import java.util.Map;

public interface WalletService {
    Map<String, Object> activateCorporateMasterAccount();
    Map<String, Object> getWalletSummary();
    Map<String, Object> activatePersonalAccount(String impUid); // 개인 지갑 활성화
}