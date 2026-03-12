package me.projectexledger.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import redis.embedded.RedisServer;

@Slf4j
@Profile("local")
@Configuration
public class EmbeddedRedisConfig {

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    @Value("${embedded.redis.enabled:false}")
    private boolean embeddedRedisEnabled;

    private RedisServer redisServer;

    @PostConstruct
    public void redisServer() {
        if (!embeddedRedisEnabled) {
            return;
        }

        try {
            if (isArmMac()) {
                redisServer = new RedisServer(redisPort);
            } else {
                redisServer = RedisServer.builder()
                        .port(redisPort)
                        .setting("maxmemory 128M")
                        .build();
            }

            redisServer.start();
            log.info("✅ Embedded Redis Server started on port {}", redisPort);
        } catch (Exception e) {
            log.warn("⚠️ Embedded Redis 시작 실패(외부 Redis 사용 권장): {}", e.getMessage());
            redisServer = null;
        }
    }

    @PreDestroy
    public void stopRedis() {
        if (redisServer != null) {
            redisServer.stop();
            log.info("⛔ Embedded Redis Server stopped.");
        }
    }

    private boolean isArmMac() {
        return System.getProperty("os.arch").equals("aarch64") &&
                System.getProperty("os.name").equals("Mac OS X");
    }
}
