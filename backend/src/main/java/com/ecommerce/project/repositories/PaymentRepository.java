package com.ecommerce.project.repositories;

import com.ecommerce.project.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long>{
    java.util.Optional<Payment> findByPgNameAndPgPaymentId(String pgName, String pgPaymentId);
}
