package me.projectexledger.domain.config.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.config.entity.SystemConfig;
import me.projectexledger.domain.config.repository.SystemConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class SystemConfigService {

    private final SystemConfigRepository systemConfigRepository;

    // 🔍 설정값 가져오기 (핵심 로직: DB에 없으면 코딩된 기본값을 반환하여 서버 다운 방지)
    @Transactional(readOnly = true)
    public BigDecimal getBigDecimalConfig(String key, String defaultValue) {
        return systemConfigRepository.findByConfigKey(key)
                .map(config -> new BigDecimal(config.getConfigValue()))
                .orElse(new BigDecimal(defaultValue));
    }

    // ✍️ 어드민에서 설정값 변경할 때 쓰는 로직
    @Transactional
    public void updateConfig(String key, String value, String description, String adminId) {
        SystemConfig config = systemConfigRepository.findByConfigKey(key)
                .orElse(SystemConfig.builder()
                        .configKey(key)
                        .build());

        config.setConfigValue(value);
        config.setDescription(description);
        config.setUpdatedBy(adminId);

        systemConfigRepository.save(config);
    }
}