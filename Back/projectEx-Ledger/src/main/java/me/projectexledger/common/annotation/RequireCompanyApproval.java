package me.projectexledger.common.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 이 어노테이션이 붙은 컨트롤러 메서드는 사용자가 속한 기업의 관리자로부터 가입 승인을 받은 상태여야 접근할 수 있습니다.
 */
@Target({ ElementType.METHOD, ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireCompanyApproval {
}
