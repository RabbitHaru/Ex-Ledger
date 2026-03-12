package me.projectexledger.domain.wallet.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.BaseEntity;
import me.projectexledger.domain.member.entity.Member;

import java.math.BigDecimal;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Wallet extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    @Column(length = 50)
    private String bankName;

    @Column(length = 50)
    private String accountNumber;

    @Column(length = 50)
    private String accountHolder;

    @Column(length = 100)
    private String portoneImpUid;

    private Long balanceKrw;

    @Column(name = "balance_usd", precision = 15, scale = 2)
    private BigDecimal balanceUsd = BigDecimal.ZERO;

    @Column(name = "balance_eur", precision = 15, scale = 2)
    private BigDecimal balanceEur = BigDecimal.ZERO;

    @Column(name = "balance_jpy", precision = 15, scale = 2)
    private BigDecimal balanceJpy = BigDecimal.ZERO;

    @Builder
    public Wallet(Member member, String bankName, String accountNumber, String accountHolder, String portoneImpUid) {
        this.member = member;
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.accountHolder = accountHolder;
        this.portoneImpUid = portoneImpUid;
        this.balanceKrw = 0L;
    }

    public void updateAccountInfo(String bankName, String accountNumber, String accountHolder) {
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.accountHolder = accountHolder;
    }

    public void updatePersonalAccount(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public void updatePortOneInfo(String impUid) {
        this.portoneImpUid = impUid;
    }

    public void addBalance(Long amount) {
        if (this.balanceKrw == null) this.balanceKrw = 0L;
        this.balanceKrw += amount;
    }

    public void deductBalance(Long amount) {
        if (this.balanceKrw == null || this.balanceKrw < amount) {
            throw new IllegalArgumentException("잔액이 부족합니다.");
        }
        this.balanceKrw -= amount;
    }

    public void addForeignBalance(String currency, BigDecimal amount) {
        if ("USD".equals(currency)) {
            this.balanceUsd = (this.balanceUsd != null ? this.balanceUsd : BigDecimal.ZERO).add(amount);
        } else if ("EUR".equals(currency)) {
            this.balanceEur = (this.balanceEur != null ? this.balanceEur : BigDecimal.ZERO).add(amount);
        } else if ("JPY".equals(currency)) {
            this.balanceJpy = (this.balanceJpy != null ? this.balanceJpy : BigDecimal.ZERO).add(amount);
        } else {
            throw new IllegalArgumentException("지원하지 않는 외화입니다.");
        }
    }

    public void deductForeignBalance(String currency, BigDecimal amount) {
        if ("USD".equals(currency)) {
            if (this.balanceUsd == null || this.balanceUsd.compareTo(amount) < 0) throw new IllegalArgumentException("USD 잔액이 부족합니다.");
            this.balanceUsd = this.balanceUsd.subtract(amount);
        } else if ("EUR".equals(currency)) {
            if (this.balanceEur == null || this.balanceEur.compareTo(amount) < 0) throw new IllegalArgumentException("EUR 잔액이 부족합니다.");
            this.balanceEur = this.balanceEur.subtract(amount);
        } else if ("JPY".equals(currency)) {
            if (this.balanceJpy == null || this.balanceJpy.compareTo(amount) < 0) throw new IllegalArgumentException("JPY 잔액이 부족합니다.");
            this.balanceJpy = this.balanceJpy.subtract(amount);
        } else {
            throw new IllegalArgumentException("지원하지 않는 외화입니다.");
        }
    }
}