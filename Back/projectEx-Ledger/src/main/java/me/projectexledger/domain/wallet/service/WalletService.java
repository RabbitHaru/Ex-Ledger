package me.projectexledger.domain.wallet.service;

import java.util.Map;

public interface WalletService {
    Map<String, Object> activateCorporateMasterAccount();
    Map<String, Object> getWalletSummary();
    Map<String, Object> activatePersonalAccount(String impUid);
    Map<String, Object> processCharge(Map<String, Object> request);
    Map<String, Object> chargeSuccess(Map<String, Object> request);
    Map<String, Object> executeTransfer(Map<String, Object> request);
    Map<String, Object> exchangeCurrency(Map<String, Object> request);
}