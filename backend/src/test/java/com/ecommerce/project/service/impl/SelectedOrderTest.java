package com.ecommerce.project.service.impl;

import com.ecommerce.project.model.*;
import com.ecommerce.project.repositories.*;
import com.ecommerce.project.service.CartService;
import com.ecommerce.project.payload.OrderDTO;
import com.stripe.model.PaymentIntent;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class SelectedOrderTest {
    @Test
    void onlyPaidSelectionBecomesOrderAndIsRemoved() {
        OrderServiceImpl service = new OrderServiceImpl();
        CartRepository carts = mock(CartRepository.class);
        AddressRepository addresses = mock(AddressRepository.class);
        PaymentRepository payments = mock(PaymentRepository.class);
        OrderRepository orders = mock(OrderRepository.class);
        OrderItemRepository items = mock(OrderItemRepository.class);
        ProductRepository products = mock(ProductRepository.class);
        CartService cartService = mock(CartService.class);
        CartItemRepository cartItems = mock(CartItemRepository.class);
        StripeCheckoutRepository checkouts = mock(StripeCheckoutRepository.class);
        com.ecommerce.project.util.AuthUtil auth = mock(com.ecommerce.project.util.AuthUtil.class);
        when(auth.loggedInUserId()).thenReturn(7L);
        OrderSnapshotService snapshots = new OrderSnapshotService();
        for (var entry : Map.of("carts", carts, "cartItems", cartItems, "addresses", addresses, "products", products,
                "payments", payments, "orders", orders, "orderItems", items, "modelMapper", new ModelMapper()).entrySet()) {
            ReflectionTestUtils.setField(snapshots, entry.getKey(), entry.getValue());
        }
        ReflectionTestUtils.setField(service, "snapshots", snapshots);
        ReflectionTestUtils.setField(service, "stripeCheckouts", checkouts);
        ReflectionTestUtils.setField(service, "authUtil", auth);
        ReflectionTestUtils.setField(service, "imageBaseUrl", "http://localhost/images");
        for (var entry : Map.of("cartRepository", carts, "addressRepository", addresses,
                "paymentRepository", payments, "orderRepository", orders, "orderItemRepository", items,
                "productRepository", products, "cartService", cartService, "modelMapper", new ModelMapper()).entrySet()) {
            ReflectionTestUtils.setField(service, entry.getKey(), entry.getValue());
        }
        User user = new User(); user.setEmail("buyer@example.com");
        UserRepository users = mock(UserRepository.class);
        when(users.lockForPaymentConfirmation(7L)).thenReturn(Optional.of(user));
        ReflectionTestUtils.setField(service, "userRepository", users);
        Address address = new Address(); address.setAddressId(2L); address.setUser(user);
        Product a = new Product(); a.setProductId(10L); a.setStock(10); a.setSpecialPrice(5.0); a.setProductName("Original A"); a.setImage("original.png");
        Product b = new Product(); b.setProductId(20L); b.setStock(10);
        CartItem first = new CartItem(); first.setProduct(a); first.setQuantity(2); first.setProductPrice(5.0);
        CartItem second = new CartItem(); second.setProduct(b); second.setQuantity(1); second.setProductPrice(8.0);
        Cart cart = new Cart(); cart.setCartId(1L); cart.setCartItems(List.of(first, second)); cart.setTotalPrice(18.0);
        var frozen = snapshots.capture(address, List.of(first));
        StripeCheckout checkout = new StripeCheckout(); checkout.setUserId(7L); checkout.setAmount(1130L); checkout.setSnapshot(snapshots.encode(frozen));
        when(checkouts.findById("pi_test")).thenReturn(Optional.of(checkout));
        when(products.deductStock(10L, 2)).thenReturn(1);
        when(products.findById(10L)).thenReturn(Optional.of(a));
        when(cartItems.findCartItemByProductIdAndCartId(1L, 10L)).thenReturn(first);
        a.setProductName("Changed name"); a.setSpecialPrice(999.0); address.setCity("Changed city");
        when(carts.findCartByEmail(user.getEmail())).thenReturn(cart);
        when(addresses.findById(2L)).thenReturn(Optional.of(address));
        when(orders.save(any())).thenAnswer(call -> call.getArgument(0));
        when(items.saveAll(anyList())).thenAnswer(call -> call.getArgument(0));
        PaymentIntent intent = new PaymentIntent(); intent.setStatus("succeeded"); intent.setAmount(1130L); intent.setAmountReceived(1130L); intent.setCurrency("usd");
        intent.setMetadata(Map.of("email", user.getEmail(), "addressId", "2", "selection", "10:2"));
        try (var stripe = mockStatic(PaymentIntent.class)) {
            stripe.when(() -> PaymentIntent.retrieve("pi_test")).thenReturn(intent);
            OrderDTO order = service.placeOrder(user.getEmail(), 2L, "online", "Stripe", "pi_test", "succeeded", "ok");
            assertEquals(11.30, order.getTotalAmount());
            assertEquals(1, order.getOrderItems().size());
            verify(products).deductStock(10L, 2);
            verify(products, never()).save(any());
            assertEquals("Original A", order.getOrderItems().get(0).getProduct().getProductName());
            assertEquals(5.0, order.getOrderItems().get(0).getOrderedProductPrice());
            assertNull(order.getAddress().getCity());
            verify(cartItems).deleteCartItemByProductIdAndCartId(1L, 10L);
            verify(cartItems, never()).deleteCartItemByProductIdAndCartId(1L, 20L);
            stripe.when(() -> PaymentIntent.retrieve("pi_legacy")).thenReturn(intent);
            OrderDTO legacy = service.placeOrder(user.getEmail(), 2L, "online", "Stripe", "pi_legacy", "succeeded", "ok");
            assertTrue(legacy.getSnapshotBackfilled());
            assertEquals(11.30, legacy.getTotalAmount());
            assertEquals(2, legacy.getOrderItems().get(0).getQuantity());
        }
    }
}
