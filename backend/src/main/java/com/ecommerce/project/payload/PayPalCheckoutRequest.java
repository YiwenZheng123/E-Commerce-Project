package com.ecommerce.project.payload;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PayPalCheckoutRequest {
    @NotNull
    private Long addressId;
}
