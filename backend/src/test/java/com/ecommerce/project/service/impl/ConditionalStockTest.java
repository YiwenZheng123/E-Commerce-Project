package com.ecommerce.project.service.impl;

import com.ecommerce.project.model.*;
import com.ecommerce.project.payload.CheckoutSnapshot;
import com.ecommerce.project.repositories.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:conditional-stock;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect", "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "stripe.secret.key=sk_test_unused", "spring.jpa.show-sql=false"
})
class ConditionalStockTest {
    @Autowired OrderSnapshotService snapshots;
    @Autowired ProductRepository products;
    @Autowired UserRepository users;
    @Autowired AddressRepository addresses;
    @Autowired CartRepository carts;
    @Autowired CartItemRepository cartItems;
    @Autowired OrderRepository orders;
    @Autowired PlatformTransactionManager transactions;

    record Buyer(String email, Long cartId, CheckoutSnapshot snapshot) {}
    record Fixture(List<Long> products, List<Buyer> buyers) {}

    Fixture fixture(int... stocks) {
        return new TransactionTemplate(transactions).execute(tx -> {
            var goods = new ArrayList<Product>();
            for (int stock : stocks) {
                Product product = new Product(); product.setProductName("Stock product"); product.setDescription("Stock description");
                product.setStock(stock); product.setSpecialPrice(10); goods.add(products.save(product));
            }
            var buyers = new ArrayList<Buyer>();
            for (int i = 0; i < 2; i++) {
                String id = UUID.randomUUID().toString();
                User user = users.save(new User("buyer" + id.substring(0, 8), id + "@example.com", "unused-password"));
                Address address = new Address("Original Street", "Building One", "Toronto", "ON", "Canada", "M1M1M1");
                address.setUser(user); addresses.save(address);
                Cart cart = new Cart(); cart.setUser(user); cart.setTotalPrice(10.0 * stocks.length); carts.save(cart);
                var lines = new ArrayList<CartItem>();
                for (Product product : goods) {
                    CartItem item = new CartItem(); item.setCart(cart); item.setProduct(product); item.setQuantity(1); item.setProductPrice(10);
                    lines.add(cartItems.save(item));
                }
                buyers.add(new Buyer(user.getEmail(), cart.getCartId(), snapshots.capture(address, lines)));
            }
            return new Fixture(goods.stream().map(Product::getProductId).toList(), buyers);
        });
    }

    Order complete(Buyer buyer) {
        return snapshots.complete(buyer.snapshot(), buyer.email(), buyer.snapshot().items().size() * 11.30,
                new Payment("online", UUID.randomUUID().toString(), "succeeded", "ok", "Stripe"));
    }

    @Test
    void twoBuyersCompetingForLastItemHaveOnlyOneFulfilledOrder() throws Exception {
        var f = fixture(1);
        var executor = Executors.newFixedThreadPool(2);
        var ready = new CountDownLatch(2); var start = new CountDownLatch(1);
        try {
            var futures = new ArrayList<Future<Order>>();
            for (Buyer buyer : f.buyers()) futures.add(executor.submit(() -> {
                ready.countDown(); assertTrue(start.await(10, TimeUnit.SECONDS)); return complete(buyer);
            }));
            assertTrue(ready.await(10, TimeUnit.SECONDS)); start.countDown();
            var results = List.of(futures.get(0).get(20, TimeUnit.SECONDS), futures.get(1).get(20, TimeUnit.SECONDS));
            assertEquals(Set.of("Accepted", "Paid, needs attention"), new HashSet<>(results.stream().map(Order::getOrderStatus).toList()));
            assertEquals(0, products.findById(f.products().get(0)).orElseThrow().getStock());
            new TransactionTemplate(transactions).executeWithoutResult(tx -> {
                for (int i = 0; i < 2; i++) {
                    boolean fulfilled = "Accepted".equals(results.get(i).getOrderStatus());
                    var buyer = f.buyers().get(i);
                    assertEquals(fulfilled ? 0.0 : 10.0, carts.findById(buyer.cartId()).orElseThrow().getTotalPrice());
                    var item = cartItems.findCartItemByProductIdAndCartId(buyer.cartId(), f.products().get(0));
                    if (fulfilled) assertNull(item); else assertEquals(1, item.getQuantity());
                    var stored = orders.findById(results.get(i).getOrderId()).orElseThrow();
                    assertEquals(1, stored.getOrderItems().size()); assertEquals("succeeded", stored.getPayment().getPgStatus());
                }
            });
        } finally { executor.shutdownNow(); }
    }

    @Test
    void laterShortageRestoresEarlierDeductionsAndKeepsWholeCart() {
        var f = fixture(5, 0); var buyer = f.buyers().get(0);
        Order order = complete(buyer);
        assertEquals("Paid, needs attention", order.getOrderStatus());
        assertEquals(5, products.findById(f.products().get(0)).orElseThrow().getStock());
        assertEquals(0, products.findById(f.products().get(1)).orElseThrow().getStock());
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            assertEquals(20.0, carts.findById(buyer.cartId()).orElseThrow().getTotalPrice());
            for (Long product : f.products()) assertEquals(1, cartItems.findCartItemByProductIdAndCartId(buyer.cartId(), product).getQuantity());
            assertEquals(2, orders.findById(order.getOrderId()).orElseThrow().getOrderItems().size());
        });
    }

    @Test
    void failedOrderWriteRollsBackStockDeduction() {
        var f = fixture(1); var buyer = f.buyers().get(0); long before = orders.count();
        assertThrows(RuntimeException.class, () -> snapshots.complete(buyer.snapshot(), buyer.email(), 11.30,
                new Payment("", "invalid-payment", "succeeded", "ok", "Stripe")));
        assertEquals(1, products.findById(f.products().get(0)).orElseThrow().getStock());
        assertEquals(before, orders.count());
        assertEquals(10.0, carts.findById(buyer.cartId()).orElseThrow().getTotalPrice());
    }

    @Test
    void managedProductLoadedBeforeDeductionCannotOverwriteNewStock() {
        var f = fixture(1);
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            products.findById(f.products().get(0)).orElseThrow();
            assertEquals("Accepted", complete(f.buyers().get(0)).getOrderStatus());
        });
        assertEquals(0, products.findById(f.products().get(0)).orElseThrow().getStock());
    }
}
