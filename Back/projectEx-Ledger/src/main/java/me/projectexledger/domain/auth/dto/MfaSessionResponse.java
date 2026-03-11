package me.projectexledger.domain.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class MfaSessionResponse {
    private boolean active;
    private long remainingSeconds;
    private String email;
}
