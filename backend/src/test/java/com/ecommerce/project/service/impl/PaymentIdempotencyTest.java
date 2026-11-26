package com.ecommerce.project.service.impl;

import com.ecommerce.project.model.*;
import com.ecommerce.project.repositories.*;
import com.stripe.model.PaymentIntent;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:payment-idempotency;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect", "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "stripe.secret.key=sk_test_unused", "paypal.client-id=sandbox-client", "paypal.client-secret=sandbox-secret", "spring.jpa.show-sql=false"
})
class PaymentIdempotencyTest {
    @Autowired OrderServiceImpl service;
    @Autowired PayPalService paypal;
    @Autowired PayPalCheckoutRepository paypalCheckouts;
    @MockitoSpyBean OrderSnapshotService snapshots;
    @Autowired ProductRepository products;
    @Autowired UserRepository users;
    @Autowired AddressRepository addresses;
    @Autowired CartRepository carts;
    @Autowired CartItemRepository cartItems;
    @Autowired OrderRepository orders;
    @Autowired PaymentRepository payments;
    @Autowired StripeCheckoutRepository checkouts;
    @Autowired PlatformTransactionManager transactions;

    record Fixture(String intent, String username, String email, Long address, Long product, Long cart) {}
    Fixture fixture(int stock, boolean legacy) {
        return new TransactionTemplate(transactions).execute(tx -> {
            String id = UUID.randomUUID().toString();
            User user = users.save(new User("buyer" + id.substring(0, 8), id.substring(0, 8) + "@example.com", "unused-password"));
            var address = new Address("Original Street", "Building One", "Toronto", "ON", "Canada", "M1M1M1");
            address.setUser(user); addresses.save(address);
            var product = new Product(); product.setProductName("Original product"); product.setDescription("Product description");
            product.setStock(stock); product.setSpecialPrice(10); product.setImage("original.png"); products.save(product);
            var cart = new Cart(); cart.setUser(user); cart.setTotalPrice(10.0); carts.save(cart);
            var item = new CartItem(); item.setCart(cart); item.setProduct(product); item.setQuantity(1); item.setProductPrice(10); cartItems.save(item);
            if (!legacy) {
                var checkout = new StripeCheckout(); checkout.setPaymentIntentId("pi_" + id); checkout.setUserId(user.getUserId());
                checkout.setAmount(1130L); checkout.setSnapshot(snapshots.encode(snapshots.capture(address, List.of(item)))); checkouts.save(checkout);
            }
            return new Fixture("pi_" + id, user.getUserName(), user.getEmail(), address.getAddressId(), product.getProductId(), cart.getCartId());
        });
    }

    PaymentIntent paid(Fixture f) {
        var intent = new PaymentIntent(); intent.setId(f.intent()); intent.setStatus("succeeded");
        intent.setCurrency("usd"); intent.setAmount(1130L); intent.setAmountReceived(1130L);
        intent.setMetadata(Map.of("email", f.email(), "addressId", f.address().toString(), "selection", f.product() + ":1"));
        return intent;
    }

    com.ecommerce.project.payload.OrderDTO confirm(Fixture f, PaymentIntent intent, String actor) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(actor, "unused", List.of()));
        try (var stripe = mockStatic(PaymentIntent.class)) {
            stripe.when(() -> PaymentIntent.retrieve(f.intent())).thenReturn(intent);
            return service.placeOrder(users.findByUserName(actor).orElseThrow().getEmail(), f.address(), "online", "Stripe", f.intent(), "succeeded", "ok");
        } finally { SecurityContextHolder.clearContext(); }
    }

    List<Long> concurrent(Fixture f) throws Exception {
        return concurrent(() -> confirm(f, paid(f), f.username()).getOrderId());
    }

    List<Long> concurrent(Callable<Long> action) throws Exception {
        var executor = Executors.newFixedThreadPool(2); var ready = new CountDownLatch(2); var start = new CountDownLatch(1);
        try {
            var futures = new ArrayList<Future<Long>>();
            for (int i = 0; i < 2; i++) futures.add(executor.submit(() -> {
                ready.countDown(); assertTrue(start.await(10, TimeUnit.SECONDS));
                return action.call();
            }));
            assertTrue(ready.await(10, TimeUnit.SECONDS)); start.countDown();
            return List.of(futures.get(0).get(20, TimeUnit.SECONDS), futures.get(1).get(20, TimeUnit.SECONDS));
        } finally { executor.shutdownNow(); }
    }

    void assertSingleOrder(Fixture f, Long orderId, int remaining, boolean attention) {
        assertEquals(1, orders.findByEmail(f.email(), org.springframework.data.domain.PageRequest.of(0, 10)).getTotalElements());
        assertEquals(orderId, payments.findByPgNameAndPgPaymentId("Stripe", f.intent()).orElseThrow().getOrder().getOrderId());
        assertEquals(orderId, checkouts.findById(f.intent()).orElseThrow().getOrderId());
        assertEquals(remaining, products.findById(f.product()).orElseThrow().getStock());
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            var item = cartItems.findCartItemByProductIdAndCartId(f.cart(), f.product());
            if (attention) assertEquals(1, item.getQuantity()); else assertNull(item);
            assertEquals(attention ? 10.0 : 0.0, carts.findById(f.cart()).orElseThrow().getTotalPrice());
            assertEquals(attention ? "Paid, needs attention" : "Accepted", orders.findById(orderId).orElseThrow().getOrderStatus());
        });
    }

    @Test
    void concurrentAndLaterStripeConfirmationsReuseOneOrder() throws Exception {
        var f = fixture(5, false); var ids = concurrent(f);
        assertEquals(ids.get(0), ids.get(1));
        assertEquals(ids.get(0), confirm(f, paid(f), f.username()).getOrderId());
        assertSingleOrder(f, ids.get(0), 4, false);
    }

    @Test
    void concurrentLegacyConfirmationsWithoutCheckoutRowAlsoReuseOneOrder() throws Exception {
        var f = fixture(5, true); var ids = concurrent(f);
        assertEquals(ids.get(0), ids.get(1)); assertSingleOrder(f, ids.get(0), 4, false);
        assertTrue(confirm(f, paid(f), f.username()).getSnapshotBackfilled());
    }

    @Test
    void shortageOrderIsNotRecreatedOrFulfilledWhenRetriedAfterRestock() {
        var f = fixture(0, false); var first = confirm(f, paid(f), f.username());
        new TransactionTemplate(transactions).executeWithoutResult(tx -> products.findById(f.product()).orElseThrow().setStock(5));
        var again = confirm(f, paid(f), f.username());
        assertEquals(first.getOrderId(), again.getOrderId()); assertSingleOrder(f, first.getOrderId(), 5, true);
    }

    @Test
    void failedCommitPathRollsBackThenCanBeConfirmedAgain() {
        var f = fixture(5, false);
        doAnswer(call -> { call.callRealMethod(); throw new IllegalStateException("Simulated failure after order writes"); })
                .when(snapshots).complete(any(), anyString(), anyDouble(), any());
        try {
            assertThrows(IllegalStateException.class, () -> confirm(f, paid(f), f.username()));
        } finally { reset(snapshots); }
        assertTrue(payments.findByPgNameAndPgPaymentId("Stripe", f.intent()).isEmpty());
        assertNull(checkouts.findById(f.intent()).orElseThrow().getOrderId());
        assertEquals(5, products.findById(f.product()).orElseThrow().getStock());
        var retry = confirm(f, paid(f), f.username()); assertSingleOrder(f, retry.getOrderId(), 4, false);
    }

    @Test
    void wrongBuyerAndWrongPaymentDetailsCannotCreateOrders() {
        var f = fixture(5, false);
        assertThrows(com.ecommerce.project.exceptions.APIException.class, () -> confirm(f, paid(f), "user1"));
        var invalid = paid(f); invalid.setAmountReceived(1L);
        assertThrows(com.ecommerce.project.exceptions.APIException.class, () -> confirm(f, invalid, f.username()));
        var unpaid = paid(f); unpaid.setStatus("processing");
        assertThrows(com.ecommerce.project.exceptions.APIException.class, () -> confirm(f, unpaid, f.username()));
        assertTrue(payments.findByPgNameAndPgPaymentId("Stripe", f.intent()).isEmpty());
        assertEquals(5, products.findById(f.product()).orElseThrow().getStock());
    }

    @Test
    void concurrentPayPalCapturesCallGatewayOnceAndReturnOneOrder() throws Exception {
        var f = fixture(5, false); String paypalId = "pp_" + f.intent();
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            var stripe = checkouts.findById(f.intent()).orElseThrow();
            var checkout = new PayPalCheckout(); checkout.setPaypalOrderId(paypalId); checkout.setUserId(stripe.getUserId());
            checkout.setAmount("11.30"); checkout.setSnapshot(stripe.getSnapshot()); paypalCheckouts.save(checkout);
        });
        var builder = org.springframework.web.client.RestClient.builder().baseUrl("https://api-m.sandbox.paypal.com");
        var server = org.springframework.test.web.client.MockRestServiceServer.bindTo(builder).build();
        server.expect(org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo("https://api-m.sandbox.paypal.com/v1/oauth2/token"))
                .andRespond(org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess("{\"access_token\":\"test-token\"}", org.springframework.http.MediaType.APPLICATION_JSON));
        server.expect(org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo("https://api-m.sandbox.paypal.com/v2/checkout/orders/" + paypalId))
                .andRespond(org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess("{\"status\":\"APPROVED\"}", org.springframework.http.MediaType.APPLICATION_JSON));
        server.expect(org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo("https://api-m.sandbox.paypal.com/v2/checkout/orders/" + paypalId + "/capture"))
                .andExpect(org.springframework.test.web.client.match.MockRestRequestMatchers.header("PayPal-Request-Id", "capture-" + paypalId))
                .andRespond(org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess("""
                    {"status":"COMPLETED","purchase_units":[{"payments":{"captures":[{"id":"CAPTURE_TEST","status":"COMPLETED","amount":{"currency_code":"USD","value":"11.30"}}]}}]}
                    """, org.springframework.http.MediaType.APPLICATION_JSON));
        var original = org.springframework.test.util.ReflectionTestUtils.getField(paypal, "client");
        org.springframework.test.util.ReflectionTestUtils.setField(paypal, "client", builder.build());
        try {
            var ids = concurrent(() -> {
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(f.username(), "unused", List.of()));
                try { return paypal.captureOrder(paypalId); } finally { SecurityContextHolder.clearContext(); }
            });
            assertEquals(ids.get(0), ids.get(1)); server.verify();
            assertEquals(4, products.findById(f.product()).orElseThrow().getStock());
            assertEquals(1, orders.findByEmail(f.email(), org.springframework.data.domain.PageRequest.of(0, 10)).getTotalElements());
            assertEquals(ids.get(0), paypalCheckouts.findById(paypalId).orElseThrow().getOrderId());
            assertEquals(ids.get(0), payments.findByPgNameAndPgPaymentId("PayPal", "CAPTURE_TEST").orElseThrow().getOrder().getOrderId());
            assertEquals(0.0, carts.findById(f.cart()).orElseThrow().getTotalPrice());
        } finally { org.springframework.test.util.ReflectionTestUtils.setField(paypal, "client", original); }
    }

    @Test
    void databaseRejectsDuplicateGatewayPaymentButAllowsDifferentGateways() {
        String id = "shared_" + UUID.randomUUID();
        payments.saveAndFlush(new Payment("online", id, "succeeded", "ok", "Stripe"));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                payments.saveAndFlush(new Payment("online", id, "succeeded", "ok", "Stripe")));
        assertNotNull(payments.saveAndFlush(new Payment("online", id, "COMPLETED", "ok", "PayPal")).getPaymentId());
    }
}
