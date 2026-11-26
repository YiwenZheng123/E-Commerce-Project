package com.ecommerce.project.payload;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PayPalCheckoutRequest {
    private java.util.List<Long> productIds;
    @NotNull
    private Long addressId;
}
