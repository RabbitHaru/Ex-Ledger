package me.projectexledger.domain.client.dto.repository;

import me.projectexledger.domain.client.entity.Client;
import me.projectexledger.domain.client.entity.ClientStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional; // 🌟 필수 임포트


public interface ClientRepository extends JpaRepository<Client, Long> {


    List<Client> findByStatus(ClientStatus status);

    Optional<Client> findByName(String name);
}