package com.ecommerce.project.service.impl;

import com.ecommerce.project.model.*;
import com.ecommerce.project.repositories.*;
import com.ecommerce.project.util.AuthUtil;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:order-snapshots;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect", "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "stripe.secret.key=sk_test_unused", "spring.jpa.show-sql=false"
})
@Transactional
class OrderSnapshotPersistenceTest {
    @Autowired OrderSnapshotService snapshots;
    @Autowired OrderServiceImpl orderService;
    @Autowired AddressServiceImpl addressService;
    @Autowired ProductServiceImpl productService;
    @Autowired OrderRepository orders;
    @Autowired OrderItemRepository orderItems;
    @Autowired UserRepository users;
    @Autowired AddressRepository addresses;
    @Autowired ProductRepository products;
    @Autowired EntityManager em;
    @MockitoBean AuthUtil auth;

    @Test
    void frozenOrderSurvivesEditsAndDeletionOfOriginalResources() {
        User user = users.findByUserName("user1").orElseThrow();
        when(auth.loggedInUser()).thenReturn(user);
        when(auth.loggedInEmail()).thenReturn(user.getEmail());
        when(auth.loggedInUserId()).thenReturn(user.getUserId());
        Address address = new Address("Original Street", "Building One", "Toronto", "ON", "Canada", "M1M1M1");
        address.setUser(user); addresses.save(address); user.getAddresses().add(address);
        Product product = new Product(); product.setProductName("Original product"); product.setDescription("Original description");
        product.setStock(10); product.setSpecialPrice(10); product.setImage("original.jpg"); product.setUser(user); products.save(product);
        CartItem cartItem = new CartItem(); cartItem.setProduct(product); cartItem.setQuantity(2);
        var snapshot = snapshots.capture(address, List.of(cartItem));
        String serialized = snapshots.encode(snapshot);
        product.setProductName("Changed product"); product.setImage("changed.jpg"); product.setSpecialPrice(999);
        address.setStreet("Changed Street");
        Order order = snapshots.complete(snapshots.decode(serialized), user.getEmail(), 22.6,
                new Payment("online", "test-payment", "succeeded", "ok", "Stripe"));
        Long orderId = order.getOrderId(); Long productId = product.getProductId(); Long addressId = address.getAddressId();
        em.flush(); em.clear();
        var dto = orderService.getMyOrder(orderId);
        assertEquals("Original product", dto.getOrderItems().get(0).getProduct().getProductName());
        assertTrue(dto.getOrderItems().get(0).getProduct().getImage().endsWith("original.jpg"));
        assertEquals(10, dto.getOrderItems().get(0).getOrderedProductPrice());
        assertEquals("Original Street", dto.getAddress().getStreet()); assertFalse(dto.getSnapshotBackfilled());
        addressService.deleteAddress(addressId);
        productService.deleteProduct(productId);
        em.flush(); em.clear();
        dto = orderService.getMyOrder(orderId);
        assertEquals(productId, dto.getOrderItems().get(0).getProduct().getProductId());
        assertEquals("Original Street", dto.getAddress().getStreet());
        assertEquals("Original product", dto.getOrderItems().get(0).getProduct().getProductName());
        assertEquals(1, orders.findOrdersBySellerId(user.getUserId(), org.springframework.data.domain.PageRequest.of(0, 10)).getTotalElements());
    }

    @Test
    void backfillIsPersistentAndDoesNotOverwriteAnExistingSnapshot() {
        User user = users.findByUserName("user1").orElseThrow();
        Address address = new Address("Legacy Street", "Building One", "Toronto", "ON", "Canada", "M1M1M1");
        address.setUser(user); addresses.save(address);
        Product product = new Product(); product.setProductName("Legacy product"); product.setDescription("Legacy description"); product.setStock(10); product.setSpecialPrice(999); product.setUser(user); products.save(product);
        Order order = new Order(); order.setEmail(user.getEmail()); order.setAddress(address); order.setOrderDate(LocalDate.now()); orders.save(order);
        OrderItem line = new OrderItem(); line.setOrder(order); line.setProduct(product); line.setQuantity(2); line.setOrderedProductPrice(7.0); orderItems.save(line); order.getOrderItems().add(line);
        snapshots.backfillOrders(); em.flush(); em.clear();
        Order stored = orders.findById(order.getOrderId()).orElseThrow();
        assertTrue(stored.getSnapshotBackfilled()); assertEquals("Legacy product", stored.getOrderItems().get(0).getSnapshotProductName());
        stored.getOrderItems().get(0).getProduct().setProductName("Changed later");
        snapshots.backfillOrders(); em.flush(); em.clear();
        stored = orders.findById(order.getOrderId()).orElseThrow();
        assertEquals("Legacy product", stored.getOrderItems().get(0).getSnapshotProductName());
        assertEquals(7.0, stored.getOrderItems().get(0).getOrderedProductPrice());
    }
}
