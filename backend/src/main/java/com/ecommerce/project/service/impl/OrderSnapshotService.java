package com.ecommerce.project.service.impl;

import com.ecommerce.project.model.*;
import com.ecommerce.project.payload.*;
import com.ecommerce.project.repositories.*;
import com.ecommerce.project.exceptions.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.modelmapper.ModelMapper;
import jakarta.transaction.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.List;

@Service
public class OrderSnapshotService {
    @Autowired private OrderRepository orders;
    @Autowired private OrderItemRepository orderItems;
    @Autowired private ProductRepository products;
    @Autowired private AddressRepository addresses;
    @Autowired private PaymentRepository payments;
    @Autowired private CartRepository carts;
    @Autowired private CartItemRepository cartItems;
    @Autowired private ModelMapper modelMapper;
    private final ObjectMapper mapper = new ObjectMapper();

    public CheckoutSnapshot capture(Address address, List<CartItem> items) {
        return new CheckoutSnapshot(modelMapper.map(address, AddressDTO.class), items.stream().map(item -> {
            Product product = item.getProduct();
            return new CheckoutSnapshot.Item(product.getProductId(), product.getUser() == null ? null : product.getUser().getUserId(),
                    product.getProductName(), product.getImage(), item.getQuantity(), product.getSpecialPrice(), product.getDiscount());
        }).toList(), false);
    }

    public String encode(CheckoutSnapshot snapshot) { return mapper.writeValueAsString(snapshot); }
    public CheckoutSnapshot decode(String snapshot) { return mapper.readValue(snapshot, CheckoutSnapshot.class); }

    @Transactional
    public Order complete(CheckoutSnapshot snapshot, String email, double amount, Payment payment) {
        var deducted = new java.util.ArrayList<CheckoutSnapshot.Item>();
        boolean fulfilled = true;
        for (var item : snapshot.items().stream().sorted(java.util.Comparator.comparing(CheckoutSnapshot.Item::productId)).toList()) {
            if (products.deductStock(item.productId(), item.quantity()) == 0) {
                fulfilled = false;
                break;
            }
            deducted.add(item);
        }
        if (!fulfilled) {
            for (var item : deducted) products.restoreStock(item.productId(), item.quantity());
        }
        Order order = new Order();
        order.setEmail(email);
        order.setOrderDate(LocalDate.now());
        order.setTotalAmount(amount);
        order.setOrderStatus(fulfilled ? "Accepted" : "Paid, needs attention");
        order.setAddressSnapshot(mapper.writeValueAsString(snapshot.address()));
        order.setSnapshotBackfilled(snapshot.backfilled());
        order.setAddress(addresses.findById(snapshot.address().getAddressId()).orElse(null));
        payment.setOrder(order);
        payments.save(payment);
        order.setPayment(payment);
        orders.save(order);
        Cart cart = carts.findCartByEmail(email);
        for (CheckoutSnapshot.Item item : snapshot.items()) {
            Product product = products.findById(item.productId()).orElse(null);
            OrderItem line = new OrderItem();
            line.setOrder(order);
            line.setProduct(product);
            line.setSnapshotProductId(item.productId());
            line.setSnapshotSellerId(item.sellerId());
            line.setSnapshotProductName(item.productName());
            line.setSnapshotImage(item.image());
            line.setQuantity(item.quantity());
            line.setOrderedProductPrice(item.price());
            line.setDiscount(item.discount());
            orderItems.save(line);
            order.getOrderItems().add(line);
            // Bulk stock updates bypass managed Product instances; do not save their stale stock here.
            if (fulfilled && cart != null) {
                CartItem current = cartItems.findCartItemByProductIdAndCartId(cart.getCartId(), item.productId());
                if (current != null) {
                    int removed = Math.min(current.getQuantity(), item.quantity());
                    cart.setTotalPrice(cart.getTotalPrice() - current.getProductPrice() * removed);
                    if (current.getQuantity() == removed) cartItems.deleteCartItemByProductIdAndCartId(cart.getCartId(), item.productId());
                    else { current.setQuantity(current.getQuantity() - removed); cartItems.save(current); }
                }
            }
        }
        return order;
    }

    @Transactional
    public void backfillOrders() {
        for (Order order : orders.findBySnapshotBackfilledIsNull()) {
            order.setAddressSnapshot(mapper.writeValueAsString(order.getAddress() == null ? null : modelMapper.map(order.getAddress(), AddressDTO.class)));
            for (OrderItem item : order.getOrderItems()) {
                Product product = item.getProduct();
                if (product != null) {
                    item.setSnapshotProductId(product.getProductId());
                    item.setSnapshotSellerId(product.getUser() == null ? null : product.getUser().getUserId());
                    item.setSnapshotProductName(product.getProductName());
                    item.setSnapshotImage(product.getImage());
                }
            }
            order.setSnapshotBackfilled(true);
        }
    }
}
