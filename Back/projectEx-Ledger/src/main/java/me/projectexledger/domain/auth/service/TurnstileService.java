package me.projectexledger.domain.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TurnstileService {

    private final WebClient.Builder webClientBuilder;

    @Value("${turnstile.secret-key:dummy_secret}")
    private String turnstileSecret;

    public boolean verifyToken(String token) {
        if ("dummy_secret".equals(turnstileSecret) || token == null || token.isEmpty()) {
            log.info("Bypassing Turnstile validation (dummy mode or empty token).");
            return true;
        }

        try {
            log.info("Verifying Turnstile token with Cloudflare...");
            Map response = webClientBuilder.build()
                    .post()
                    .uri("https://challenges.cloudflare.com/turnstile/v0/siteverify")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters.fromFormData("secret", turnstileSecret)
                            .with("response", token))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            boolean success = response != null && Boolean.TRUE.equals(response.get("success"));
            if (!success) {
                log.warn("Turnstile validation failed: {}", response);
            }
            return success;
        } catch (Exception e) {
            log.error("Turnstile API call failed", e);
            return false;
        }
    }
}
