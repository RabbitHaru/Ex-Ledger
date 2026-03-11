package me.projectexledger.common.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import me.projectexledger.common.util.EncryptionUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * JPA 엔티티 필드 자동 암호화/복호화 컨버터 (AES-256)
 */
@Converter
@Component
public class AesCryptoConverter implements AttributeConverter<String, String> {

    private static EncryptionUtil encryptionUtil;

    @Autowired
    public void setEncryptionUtil(EncryptionUtil encryptionUtil) {
        AesCryptoConverter.encryptionUtil = encryptionUtil;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (encryptionUtil == null || attribute == null) return attribute;
        return encryptionUtil.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (encryptionUtil == null || dbData == null) return dbData;
        return encryptionUtil.decrypt(dbData);
    }
}
