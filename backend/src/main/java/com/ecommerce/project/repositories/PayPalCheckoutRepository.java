package com.ecommerce.project.repositories;

import com.ecommerce.project.model.PayPalCheckout;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PayPalCheckoutRepository extends JpaRepository<PayPalCheckout, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PayPalCheckout p WHERE p.paypalOrderId = :id")
    Optional<PayPalCheckout> findForUpdate(@Param("id") String id);
}
