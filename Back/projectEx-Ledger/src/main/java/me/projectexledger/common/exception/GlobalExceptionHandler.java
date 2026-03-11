package me.projectexledger.common.exception;

import lombok.extern.slf4j.Slf4j;
import me.projectexledger.common.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 전역 예외 처리기
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<ApiResponse<Object>> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException e) {
        log.error("handleMethodArgumentNotValidException", e);
        ApiResponse<Object> response = ApiResponse.fail(ErrorCode.INVALID_INPUT_VALUE.getMessage());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    protected ResponseEntity<ApiResponse<Object>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("handleIllegalArgumentException: {}", e.getMessage());
        ApiResponse<Object> response = ApiResponse.fail(e.getMessage());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(IllegalStateException.class)
    protected ResponseEntity<ApiResponse<Object>> handleIllegalStateException(IllegalStateException e) {
        log.warn("handleIllegalStateException: {}", e.getMessage());
        ApiResponse<Object> response = ApiResponse.fail(e.getMessage());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(RuntimeException.class)
    protected ResponseEntity<ApiResponse<Object>> handleRuntimeException(RuntimeException e) {
        log.error("RuntimeException occurred", e);
        ApiResponse<Object> response = ApiResponse.fail("런타임 오류: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ApiResponse<Object>> handleException(Exception e) {
        log.error("Unhandled Exception occurred", e);
        String message = e.getMessage() != null ? e.getMessage() : "상세 메시지 없음 (" + e.getClass().getSimpleName() + ")";
        ApiResponse<Object> response = ApiResponse.fail("서버 오류: " + message);
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
