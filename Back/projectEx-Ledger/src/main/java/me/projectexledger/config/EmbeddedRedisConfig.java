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
            // 윈도우나 Mac ARM 환경에서는 단순 생성자가 더 안정적입니다.
            boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");

            if (isArmMac() || isWindows) {
                redisServer = new RedisServer(redisPort);
                log.info("ℹ️ Using simple RedisServer constructor for {}", isWindows ? "Windows" : "Mac ARM");
            } else {
                redisServer = RedisServer.builder()
                        .port(redisPort)
                        .setting("maxmemory 128M")
                        .build();
            }

            redisServer.start();
            log.info("✅ Embedded Redis Server started on port {}", redisPort);
        } catch (Exception e) {
            log.error("❌ Embedded Redis 시작 실패: {}", e.getMessage());
            log.error("💡 해결방법: 윈도우용 Redis(.msi)를 직접 설치하거나, WSL2에서 redis-server를 실행해 주세요.");
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
