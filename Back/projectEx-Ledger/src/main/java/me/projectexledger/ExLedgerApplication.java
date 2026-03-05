package me.projectexledger;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class ExLedgerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ExLedgerApplication.class, args);
    }
}