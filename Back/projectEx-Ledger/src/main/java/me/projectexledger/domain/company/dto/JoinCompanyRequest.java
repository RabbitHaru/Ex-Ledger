package me.projectexledger.domain.company.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class JoinCompanyRequest {
    @NotBlank(message = "사업자등록번호는 필수입니다.")
    private String businessNumber;
}
