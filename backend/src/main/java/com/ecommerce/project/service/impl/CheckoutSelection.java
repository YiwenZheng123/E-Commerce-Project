package com.ecommerce.project.service.impl;

import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.model.Cart;
import com.ecommerce.project.model.CartItem;
import java.util.List;
import java.util.HashSet;

public class CheckoutSelection {
    public static List<CartItem> items(Cart cart, List<Long> productIds) {
        if (cart == null || productIds == null || productIds.isEmpty()) {
            throw new APIException("Select at least one product before checkout");
        }
        var ids = new HashSet<>(productIds);
        var items = cart.getCartItems().stream()
                .filter(item -> ids.contains(item.getProduct().getProductId())).toList();
        if (items.size() != ids.size()) throw new APIException("Selected product is not in your cart");
        for (var item : items) {
            if (item.getQuantity() == null || item.getQuantity() <= 0 || item.getQuantity() > item.getProduct().getStock()) {
                throw new APIException("Please check product quantities and stock before paying");
            }
        }
        return items;
    }
}
