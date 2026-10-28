package com.ecommerce.project.service.impl;

import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.exceptions.ResourceNotFoundException;
import com.ecommerce.project.model.*;
import com.ecommerce.project.repositories.*;
import com.ecommerce.project.util.AuthUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class PayPalServiceTest {
    private final PayPalService service = new PayPalService();
    private final AuthUtil auth = mock(AuthUtil.class);
    private final CartRepository carts = mock(CartRepository.class);
    private final CartItemRepository cartItems = mock(CartItemRepository.class);
    private final AddressRepository addresses = mock(AddressRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final PaymentRepository payments = mock(PaymentRepository.class);
    private final OrderRepository orders = mock(OrderRepository.class);
    private final OrderItemRepository orderItems = mock(OrderItemRepository.class);
    private final PayPalCheckoutRepository checkouts = mock(PayPalCheckoutRepository.class);
    private MockRestServiceServer server;
    private User user;
    private Address address;
    private Product product;
    private Cart cart;
    private CartItem item;
    private PayPalCheckout checkout;

    @BeforeEach
    void setUp() {
        for (var entry : java.util.Map.of("authUtil", auth, "cartRepository", carts,
                "cartItemRepository", cartItems, "addressRepository", addresses, "productRepository", products,
                "paymentRepository", payments, "orderRepository", orders, "orderItemRepository", orderItems,
                "checkoutRepository", checkouts).entrySet()) {
            ReflectionTestUtils.setField(service, entry.getKey(), entry.getValue());
        }
        ReflectionTestUtils.setField(service, "clientId", "sandbox-client");
        ReflectionTestUtils.setField(service, "clientSecret", "sandbox-secret");
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api-m.sandbox.paypal.com");
        server = MockRestServiceServer.bindTo(builder).build();
        ReflectionTestUtils.setField(service, "client", builder.build());
        user = new User();
        user.setUserId(7L);
        user.setEmail("buyer@example.com");
        address = new Address();
        address.setAddressId(2L);
        address.setUser(user);
        product = new Product();
        product.setProductId(3L);
        product.setStock(10);
        cart = new Cart();
        cart.setCartId(4L);
        cart.setTotalPrice(20.0);
        item = new CartItem();
        item.setProduct(product);
        item.setQuantity(2);
        item.setProductPrice(10.0);
        cart.setCartItems(List.of(item));
        checkout = new PayPalCheckout();
        checkout.setPaypalOrderId("PAYPAL123");
        checkout.setUserId(7L);
        checkout.setAddressId(2L);
        checkout.setAmount("22.60");
        checkout.setItems("[{\"productId\":3,\"quantity\":2,\"price\":10.0,\"discount\":0}]");
        when(auth.loggedInUser()).thenReturn(user);
        when(addresses.findById(2L)).thenReturn(Optional.of(address));
        when(carts.findCartByEmail(user.getEmail())).thenReturn(cart);
        when(products.findById(3L)).thenReturn(Optional.of(product));
        when(checkouts.findForUpdate("PAYPAL123")).thenReturn(Optional.of(checkout));
    }

    private void token() {
        server.expect(requestTo("https://api-m.sandbox.paypal.com/v1/oauth2/token"))
                .andRespond(withSuccess("{\"access_token\":\"token\"}", MediaType.APPLICATION_JSON));
    }

    @Test
    void createUsesServerCartAndIncludesTax() {
        token();
        server.expect(requestTo("https://api-m.sandbox.paypal.com/v2/checkout/orders"))
                .andExpect(content().json("{\"intent\":\"CAPTURE\",\"purchase_units\":[{\"amount\":{\"currency_code\":\"USD\",\"value\":\"22.60\"}}]}"))
                .andRespond(withSuccess("{\"id\":\"PAYPAL123\"}", MediaType.APPLICATION_JSON));
        assertEquals("PAYPAL123", service.createOrder(2L));
        verify(checkouts).save(argThat(saved -> saved.getAmount().equals("22.60") && saved.getUserId().equals(7L)));
        server.verify();
    }

    @Test
    void rejectsAnotherUsersAddressAndCheckout() {
        user.setUserId(8L);
        User owner = new User();
        owner.setUserId(7L);
        address.setUser(owner);
        assertThrows(ResourceNotFoundException.class, () -> service.createOrder(2L));
        assertThrows(ResourceNotFoundException.class, () -> service.captureOrder("PAYPAL123"));
        verifyNoInteractions(payments, orders);
    }

    @Test
    void retriesExistingCompletedPaymentWithoutCapturingAgain() {
        token();
        server.expect(requestTo("https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL123"))
                .andRespond(withSuccess("{\"status\":\"COMPLETED\",\"purchase_units\":[{\"payments\":{\"captures\":[{\"id\":\"CAPTURE1\",\"status\":\"COMPLETED\",\"amount\":{\"currency_code\":\"USD\",\"value\":\"22.60\"}}]}}]}", MediaType.APPLICATION_JSON));
        when(orders.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setOrderId(99L);
            return order;
        });
        when(cartItems.findCartItemByProductIdAndCartId(4L, 3L)).thenReturn(item);
        assertEquals(99L, service.captureOrder("PAYPAL123"));
        assertEquals(8, product.getStock());
        assertEquals(99L, checkout.getOrderId());
        assertEquals(0.0, cart.getTotalPrice());
        assertEquals(99L, service.captureOrder("PAYPAL123"));
        verify(orders, times(1)).save(any());
        server.verify();
    }

    @Test
    void rejectsWrongCapturedAmount() {
        token();
        server.expect(requestTo("https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL123"))
                .andRespond(withSuccess("{\"status\":\"COMPLETED\",\"purchase_units\":[{\"payments\":{\"captures\":[{\"status\":\"COMPLETED\",\"amount\":{\"currency_code\":\"USD\",\"value\":\"1.00\"}}]}}]}", MediaType.APPLICATION_JSON));
        assertThrows(APIException.class, () -> service.captureOrder("PAYPAL123"));
        verifyNoInteractions(payments, orders);
    }

    @Test
    void approvedOrderIsCapturedBeforeCreatingOrder() {
        token();
        server.expect(requestTo("https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL123"))
                .andRespond(withSuccess("{\"status\":\"APPROVED\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL123/capture"))
                .andExpect(header("PayPal-Request-Id", "capture-PAYPAL123"))
                .andExpect(header("Prefer", "return=representation"))
                .andRespond(withSuccess("{\"status\":\"COMPLETED\",\"purchase_units\":[{\"payments\":{\"captures\":[{\"id\":\"CAPTURE1\",\"status\":\"COMPLETED\",\"amount\":{\"currency_code\":\"USD\",\"value\":\"22.60\"}}]}}]}", MediaType.APPLICATION_JSON));
        when(orders.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setOrderId(99L);
            assertEquals(22.60, order.getTotalAmount());
            return order;
        });
        assertEquals(99L, service.captureOrder("PAYPAL123"));
        verify(payments).save(argThat(payment -> "CAPTURE1".equals(payment.getPgPaymentId()) && "PayPal".equals(payment.getPgName())));
        server.verify();
    }

    @Test
    void declinedFundingDoesNotCreateOrder() {
        token();
        server.expect(requestTo("https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL123"))
                .andRespond(withSuccess("{\"status\":\"APPROVED\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL123/capture"))
                .andRespond(withStatus(org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"details\":[{\"issue\":\"INSTRUMENT_DECLINED\"}]}"));
        assertEquals("INSTRUMENT_DECLINED", assertThrows(APIException.class, () -> service.captureOrder("PAYPAL123")).getMessage());
        verifyNoInteractions(payments, orders);
        server.verify();
    }
}
