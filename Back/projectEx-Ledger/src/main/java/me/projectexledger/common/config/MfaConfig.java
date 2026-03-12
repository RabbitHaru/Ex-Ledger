package me.projectexledger.common.config;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MfaConfig {

    @Bean
    public GoogleAuthenticator googleAuthenticator() {
        // 기본 윈도우 사이즈 3(+-30초)에서 5(+-60초 이상)로 늘려 시간 오차 허용
        com.warrenstrange.googleauth.GoogleAuthenticatorConfig config = 
            new com.warrenstrange.googleauth.GoogleAuthenticatorConfig.GoogleAuthenticatorConfigBuilder()
                .setWindowSize(20)
                .build();
        return new GoogleAuthenticator(config);
    }
}
