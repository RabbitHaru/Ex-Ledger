package me.projectexledger.domain.wallet.repository;

import me.projectexledger.domain.wallet.entity.Wallet;
import me.projectexledger.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface WalletRepository extends JpaRepository<Wallet, Long> {
    Optional<Wallet> findByMember(Member member);
}