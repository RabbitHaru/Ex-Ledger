package me.projectexledger.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class AdminSeederConfig {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner seedAdminUser() {
        return args -> {
            String adminEmail = "admin@ex-ledger.com";

            if (!memberRepository.existsByEmail(adminEmail)) {
                log.info("최고 관리자(INTEGRATED_ADMIN) 계정이 존재하지 않아 새로 생성합니다.");

                Member admin = Member.builder()
                        .email(adminEmail)
                        .password(passwordEncoder.encode("admin1234!"))
                        .name("운영관리자")
                        .role(Member.Role.ROLE_INTEGRATED_ADMIN)
                        .build();

                memberRepository.save(admin);
                log.info("최고 관리자 계정 생성 완료 => ID: {}, PW: {}", adminEmail, "admin1234!");
            } else {
                log.info("최고 관리자 계정이 이미 존재합니다.");
            }
        };
    }
}
