package me.projectexledger.domain.exchange.utils;

import java.util.HashMap;
import java.util.Map;

public class CurrencyMapper {
    private static final Map<String, String> CURRENCY_MAP = new HashMap<>();

    static {
        CURRENCY_MAP.put("AED", "아랍에미리트 디르함");
        CURRENCY_MAP.put("AUD", "호주 달러");
        CURRENCY_MAP.put("BHD", "바레인 디나르");
        CURRENCY_MAP.put("BND", "브루나이 달러");
        CURRENCY_MAP.put("CAD", "캐나다 달러");
        CURRENCY_MAP.put("CHF", "스위스 프랑");
        CURRENCY_MAP.put("CNH", "위안화");
        CURRENCY_MAP.put("DKK", "덴마크 크로네");
        CURRENCY_MAP.put("EUR", "유로");
        CURRENCY_MAP.put("GBP", "영국 파운드");
        CURRENCY_MAP.put("HKD", "홍콩 달러");

        CURRENCY_MAP.put("IDR(100)", "인도네시아 루피아");
        CURRENCY_MAP.put("JPY(100)", "일본 엔");

        CURRENCY_MAP.put("KWD", "쿠웨이트 디나르");
        CURRENCY_MAP.put("MYR", "말레이시아 링깃");
        CURRENCY_MAP.put("NOK", "노르웨이 크로네");
        CURRENCY_MAP.put("NZD", "뉴질랜드 달러");
        CURRENCY_MAP.put("SAR", "사우디 리얄");
        CURRENCY_MAP.put("SEK", "스위스 크로나");
        CURRENCY_MAP.put("SGD", "싱가포르 달러");
        CURRENCY_MAP.put("THB", "태국 바트");
        CURRENCY_MAP.put("USD", "미국 달러");
    }

    public static String getName(String unit) {
        return CURRENCY_MAP.getOrDefault(unit.trim().toUpperCase(), unit);
    }

    public static boolean isSupported(String unit) {
        return CURRENCY_MAP.containsKey(unit.trim().toUpperCase());
    }
}