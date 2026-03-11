package me.projectexledger.common.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 이 메서드를 호출하려면 Header (또는 Request Body)에 유효한 MFA(OTP) 코드가 포함되어 있어야 함을 명시합니다.
 * AOP (MfaAspect)에 의해 런타임에 처리됩니다.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireMfa {
    /**
     * 고액 거래 여부. true일 경우 15분 MFA 세션과 상관없이 무조건 실시간 OTP 인증을 요구합니다.
     */
    boolean highValue() default false;
}
