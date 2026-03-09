package me.projectexledger.portone.Response;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortOnePaymentResponse {
    private List<PortOnePaymentData> items;
    private PageInfo page;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PortOnePaymentData {
        private String id; // 🚨 이제 getId()로 인식됩니다.
        private Amount amount;
        private String currency;
        private String status;
        private CustomerInfo customer;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Amount {
        private BigDecimal total; // 🚨 getTotal() 인식용
        private BigDecimal paid;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerInfo {
        private String name;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PageInfo {
        private Integer totalCount;
        private Integer page;
        private Integer size;
    }
}