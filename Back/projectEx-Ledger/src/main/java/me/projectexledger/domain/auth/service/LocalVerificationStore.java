package me.projectexledger.domain.auth.service;

import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

/**
 * [레디스 대체용] 이메일 인증 코드를 서버 메모리에 임시 저장합니다. (서버 재시작 시 초기화됨)
 */
@Service
public class LocalVerificationStore {

    private final Map<String, VerificationInfo> codeStore = new ConcurrentHashMap<>();
    private final Map<String, Boolean> verifiedStore = new ConcurrentHashMap<>();
    private final Map<String, LocalDateTime> rateLimitStore = new ConcurrentHashMap<>();

    private static class VerificationInfo {
        String code;
        LocalDateTime expiry;

        VerificationInfo(String code, int minutes) {
            this.code = code;
            this.expiry = LocalDateTime.now().plusMinutes(minutes);
        }

        boolean isExpired() {
            return LocalDateTime.now().isAfter(expiry);
        }
    }

    public void saveCode(String email, String code) {
        codeStore.put(email, new VerificationInfo(code, 5));
        rateLimitStore.put(email, LocalDateTime.now().plusMinutes(1));
    }

    public boolean isRateLimited(String email) {
        LocalDateTime limit = rateLimitStore.get(email);
        return limit != null && LocalDateTime.now().isBefore(limit);
    }

    public boolean verifyCode(String email, String code) {
        VerificationInfo info = codeStore.get(email);
        if (info != null && !info.isExpired() && info.code.equals(code)) {
            codeStore.remove(email);
            verifiedStore.put(email, true);
            return true;
        }
        return false;
    }

    public boolean isEmailVerified(String email) {
        return Boolean.TRUE.equals(verifiedStore.getOrDefault(email, false));
    }

    public void clearVerifiedStatus(String email) {
        verifiedStore.remove(email);
    }
}
