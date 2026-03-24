package me.projectexledger.domain.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class EmailService {

    // [TODO] 실제 SMTP 설정 전까지는 콘솔 로그 출력으로 작동을 대체합니다.
    public void sendVerificationCode(String toAddress, String code) {
        log.info("============== [EMAIL STUB: 인증 코드] ==============");
        log.info("수신자: {}", toAddress);
        log.info("내용: 귀하의 Ex-Ledger 가입 인증 코드는 [{}] 입니다.", code);
        log.info("==========================================");
    }

    public void sendPasswordResetLink(String toAddress, String token) {
        log.info("============== [EMAIL STUB: 비밀번호 재설정] ==============");
        log.info("수신자: {}", toAddress);
        log.info("내용: 비밀번호 재설정을 위해 다음 토큰을 사용하거나 링크를 클릭하세요: [{}]", token);
        log.info("URL: http://localhost:5173/reset-password?token={}", token);
        log.info("==========================================");
    }

    public void sendApprovalEmail(String toAddress, String name, String role) {
        String subject = "";
        String body = "";

        if ("COMPANY_ADMIN".equals(role)) {
            subject = "[Ex-Ledger] 신규 기업 등록 및 가입이 승인되었습니다.";
            body = "안녕하세요, " + name + " 관리자님.\n" +
                    "요청하신 기업의 서류 검토가 완료되어 정식으로 승인되었습니다.\n" +
                    "이제 플랫폼의 모든 관리 기능을 즉시 사용할 수 있습니다.";
        } else if ("COMPANY_USER".equals(role)) {
            subject = "[Ex-Ledger] 사내 멤버 합류가 승인되었습니다.";
            body = "안녕하세요, " + name + " 님.\n" +
                    "사내 관리자로부터 소속 확인 및 가입 승인이 완료되었습니다.\n" +
                    "이제 정산 및 환전 등 주요 기능을 즉시 사용할 수 있습니다.";
        }

        log.info("============== [EMAIL STUB] ==============");
        log.info("수신자: {}", toAddress);
        log.info("제목: {}", subject);
        log.info("내용: {}", body);
        log.info("==========================================");
    }
}
