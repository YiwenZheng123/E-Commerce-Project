package com.ecommerce.project.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "stripe_checkouts")
@Data
public class StripeCheckout {
    @Id
    private String paymentIntentId;
    private Long userId;
    private Long amount;
    @Column(columnDefinition = "text")
    private String snapshot;
    private Long orderId;
}
