package com.ecommerce.project.payload;

import java.util.List;

public record CheckoutSnapshot(AddressDTO address, List<Item> items, boolean backfilled) {
    public record Item(Long productId, Long sellerId, String productName, String image,
                       int quantity, double price, double discount) {}
}
