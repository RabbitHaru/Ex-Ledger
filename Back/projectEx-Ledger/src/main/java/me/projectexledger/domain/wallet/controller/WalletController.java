package me.projectexledger.domain.wallet.controller;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.wallet.service.WalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @PostMapping("/verify-identity")
    public ResponseEntity<Map<String, Object>> activatePersonalAccount(@RequestBody Map<String, String> request) {
        String impUid = request.get("impUid");
        return ResponseEntity.ok(walletService.activatePersonalAccount(impUid));
    }

    @PostMapping("/charge")
    public ResponseEntity<Map<String, Object>> chargeKrw(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(walletService.processCharge(request));
    }

    @PostMapping("/charge/success")
    public ResponseEntity<Map<String, Object>> chargeSuccess(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(walletService.chargeSuccess(request));
    }

    @PostMapping("/transfer")
    public ResponseEntity<Map<String, Object>> executeTransfer(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(walletService.executeTransfer(request));
    }

    @PostMapping("/exchange")
    public ResponseEntity<Map<String, Object>> exchangeCurrency(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(walletService.exchangeCurrency(request));
    }

    @PostMapping("/corporate/activate")
    @PreAuthorize("hasRole('ROLE_COMPANY_ADMIN')")
    public ResponseEntity<Map<String, Object>> activateCorporateAccount() {
        return ResponseEntity.ok(walletService.activateCorporateMasterAccount());
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getWalletSummary() {
        return ResponseEntity.ok(walletService.getWalletSummary());
    }
}