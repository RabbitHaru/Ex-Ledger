package me.projectexledger.domain.company.repository;

import me.projectexledger.domain.company.entity.Company;
import me.projectexledger.domain.member.entity.AdminApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    Optional<Company> findByBusinessNumber(String businessNumber);
    boolean existsByBusinessNumber(String businessNumber);
    List<Company> findByAdminApprovalStatus(AdminApprovalStatus status);
}
