package me.projectexledger.domain.admin.controller;

import lombok.RequiredArgsConstructor;
import me.projectexledger.common.annotation.AuditLog;
import me.projectexledger.common.dto.ApiResponse;
import me.projectexledger.domain.admin.dto.PendingCompanyAdminResponse;
import me.projectexledger.domain.admin.service.IntegratedAdminService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.util.List;

@RestController
@RequestMapping("/api/admin/companies")
@RequiredArgsConstructor
public class IntegratedAdminController {

    private final IntegratedAdminService integratedAdminService;

    @PreAuthorize("hasRole('INTEGRATED_ADMIN')")
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<PendingCompanyAdminResponse>>> getPendingCompanyAdmins() {
        List<PendingCompanyAdminResponse> list = integratedAdminService.getPendingCompanyAdmins();
        return ResponseEntity.ok(ApiResponse.success("대기 중인 기업 관리자 목록 조회 성공", list));
    }

    @PreAuthorize("hasRole('INTEGRATED_ADMIN')")
    @AuditLog(action = "기업 관리자 승인")
    @PostMapping("/{userId}/approve")
    public ResponseEntity<ApiResponse<String>> approveCompanyAdmin(@PathVariable Long userId) {
        integratedAdminService.approveCompanyAdmin(userId);
        return ResponseEntity.ok(ApiResponse.success("기업 관리자가 성공적으로 승인되었습니다.", null));
    }

    @PreAuthorize("hasRole('INTEGRATED_ADMIN')")
    @AuditLog(action = "기업 관리자 반려")
    @PostMapping("/{userId}/reject")
    public ResponseEntity<ApiResponse<String>> rejectCompanyAdmin(@PathVariable Long userId) {
        integratedAdminService.rejectCompanyAdmin(userId);
        return ResponseEntity.ok(ApiResponse.success("기업 관리자 요청이 반려되었습니다.", null));
    }

    // 사업자등록증 이미지 보안 다운로드 API
    @PreAuthorize("hasRole('INTEGRATED_ADMIN')")
    @GetMapping("/license/{uuidFile}")
    public ResponseEntity<Resource> downloadLicenseFile(@PathVariable String uuidFile) {
        Resource resource = integratedAdminService.loadLicenseFileAsResource(uuidFile);
        String contentType = "application/octet-stream";
        try {
            contentType = Files.probeContentType(resource.getFile().toPath());
        } catch (IOException ex) {
            // content type을 결정할 수 없는 경우 기본값 사용
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}
