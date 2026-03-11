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

    @PostMapping("/activate-personal")
    public ResponseEntity<Map<String, Object>> activatePersonalAccount(@RequestBody Map<String, String> request) {
        String impUid = request.get("impUid");
        return ResponseEntity.ok(walletService.activatePersonalAccount(impUid));
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