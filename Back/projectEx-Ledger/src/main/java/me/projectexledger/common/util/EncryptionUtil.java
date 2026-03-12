package me.projectexledger.common.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Slf4j
@Component
public class EncryptionUtil {

    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";
    private static final String DEFAULT_IV = "ExLedgerIV123456"; // 16 bytes

    private final SecretKeySpec keySpec;
    private final IvParameterSpec ivSpec;

    public EncryptionUtil(@Value("${DB_ENCRYPTION_KEY:exledger_default_secret_key_32_bytes}") String secretKey) {
        try {
            byte[] keyBytes = new byte[32];
            byte[] secretBytes = secretKey.getBytes(StandardCharsets.UTF_8);
            System.arraycopy(secretBytes, 0, keyBytes, 0, Math.min(secretBytes.length, 32));

            this.keySpec = new SecretKeySpec(keyBytes, "AES");
            this.ivSpec = new IvParameterSpec(DEFAULT_IV.getBytes(StandardCharsets.UTF_8));
            log.info("[보안] 암호화 엔진(AES-256)이 성공적으로 초기화되었습니다.");
        } catch (Exception e) {
            log.error("[보안] 암호화 엔진 초기화 실패: {}", e.getMessage());
            throw new RuntimeException("암호화 유틸리티를 준비하는 중 치명적인 오류가 발생했습니다.", e);
        }
    }

    public String encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty()) return plainText;
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, ivSpec);
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            log.error("[보안] 데이터 암호화 중 오류 발생: {}", e.getMessage());
            return plainText;
        }
    }

    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isEmpty()) return encryptedText;
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSpec);
            byte[] decoded = Base64.getDecoder().decode(encryptedText);
            byte[] decrypted = cipher.doFinal(decoded);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("[보안] 복호화에 실패했습니다. 데이터가 암호화되지 않았거나 키가 일치하지 않을 수 있습니다.");
            return encryptedText;
        }
    }
}