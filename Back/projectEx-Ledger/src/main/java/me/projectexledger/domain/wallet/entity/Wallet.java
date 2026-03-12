package me.projectexledger.domain.wallet.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.BaseEntity;
import me.projectexledger.domain.member.entity.Member;

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

    @Builder
    public Wallet(Member member, String bankName, String accountNumber, String accountHolder, String portoneImpUid) {
        this.member = member;
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.accountHolder = accountHolder;
        this.portoneImpUid = portoneImpUid;
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
}