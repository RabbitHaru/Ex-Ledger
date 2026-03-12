package me.projectexledger.common.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * 데이터 암호화 유틸리티 (AES-256-CBC)
 */
@Slf4j
@Component
public class EncryptionUtil {

    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";
    private static final String DEFAULT_IV = "ExLedgerIV123456"; // 16 bytes fixed IV for deterministic encryption

    private final SecretKeySpec keySpec;
    private final IvParameterSpec ivSpec;

    public EncryptionUtil(@Value("${DB_ENCRYPTION_KEY}") String secretKey) {
        // Ensure key is 32 bytes for AES-256
        byte[] keyBytes = new byte[32];
        byte[] secretBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        System.arraycopy(secretBytes, 0, keyBytes, 0, Math.min(secretBytes.length, 32));

        this.keySpec = new SecretKeySpec(keyBytes, "AES");
        this.ivSpec = new IvParameterSpec(DEFAULT_IV.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 문자열 암호화
     */
    public String encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty())
            return plainText;
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, ivSpec);
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            log.error("Encryption failed: {}", e.getMessage());
            return plainText;
        }
    }

    /**
     * 문자열 복호화
     */
    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isEmpty())
            return encryptedText;
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSpec);
            byte[] decoded = Base64.getDecoder().decode(encryptedText);
            byte[] decrypted = cipher.doFinal(decoded);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            // If decryption fails, it might be plain text (for existing data)
            log.warn("Decryption failed, returning original text. (Might be unencrypted data)");
            return encryptedText;
        }
    }
}
