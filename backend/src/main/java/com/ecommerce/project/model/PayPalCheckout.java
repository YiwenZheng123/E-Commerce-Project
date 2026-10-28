package com.ecommerce.project.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "paypal_checkouts")
@Data
@NoArgsConstructor
public class PayPalCheckout {
    @Id
    private String paypalOrderId;
    private Long userId;
    private Long addressId;
    private String amount;
    @Column(columnDefinition = "text")
    private String items;
    private Long orderId;
}
