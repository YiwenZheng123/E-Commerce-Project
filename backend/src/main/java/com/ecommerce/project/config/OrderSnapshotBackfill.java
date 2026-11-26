package com.ecommerce.project.config;

import com.ecommerce.project.service.impl.OrderSnapshotService;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OrderSnapshotBackfill {
    @Bean
    ApplicationRunner backfillOrderSnapshots(OrderSnapshotService snapshots) {
        return args -> snapshots.backfillOrders();
    }
}
