package me.projectexledger.domain.transaction.api;

import lombok.RequiredArgsConstructor;
import me.projectexledger.common.dto.ApiResponse;
import me.projectexledger.domain.transaction.dto.TransactionRequest;
import me.projectexledger.domain.transaction.entity.Transaction;
import me.projectexledger.domain.transaction.service.TransactionService;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping
    public ApiResponse<Long> createTransaction(Principal principal, @RequestBody TransactionRequest request) {
        // B님의 AuthController 방식대로 로그인한 사용자의 ID를 가져옵니다.
        String userId = principal.getName();

        Transaction transaction = transactionService.createTransaction(
                userId, request.getAmount(), request.getCurrency(), request.getDescription()
        );

        return ApiResponse.success("거래 및 정산이 완료되었습니다.", transaction.getId());
    }

        @GetMapping("/my")
    public ApiResponse<List<Transaction>> getMyTransactions(Principal principal) {
        String userId = principal.getName();
        List<Transaction> transactions = transactionService.getMyTransactions(userId);
        return ApiResponse.success("거래 내역 조회 성공", transactions);
    }
}