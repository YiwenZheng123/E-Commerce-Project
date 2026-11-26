package com.ecommerce.project.repositories;

import com.ecommerce.project.model.StripeCheckout;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StripeCheckoutRepository extends JpaRepository<StripeCheckout, String> {}
