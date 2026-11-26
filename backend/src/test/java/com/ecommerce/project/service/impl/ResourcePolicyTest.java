package com.ecommerce.project.service.impl;

import com.ecommerce.project.model.*;
import com.ecommerce.project.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.mock.web.MockMultipartFile;
import java.util.List;
import java.util.UUID;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:resource-policy;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect", "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "stripe.secret.key=sk_test_unused", "spring.jpa.show-sql=false"
})
class ResourcePolicyTest {
    @Autowired WebApplicationContext web;
    @Autowired PlatformTransactionManager transactions;
    @Autowired UserRepository users;
    @Autowired ProductRepository products;
    @Autowired CategoryRepository categories;
    @Autowired AddressRepository addresses;
    @Autowired CartRepository carts;
    @Autowired CartItemRepository cartItems;
    @Autowired OrderRepository orders;
    @Autowired OrderSnapshotService snapshots;
    MockMvc mvc;
    Long ownProduct, otherProduct, addressId, cartId, orderId, categoryId;
    String productBody = """
        {"productName":"Updated product","description":"Updated description","stock":10,"price":10,"discount":0}
        """;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(web).apply(springSecurity()).build();
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            var category = new Category(); category.setCategoryName("Test category"); category.setProducts(new java.util.ArrayList<>());
            categories.save(category); categoryId = category.getCategoryId();
            var buyer = users.findByUserName("user1").orElseThrow();
            var seller = users.findByUserName("seller1").orElseThrow();
            var admin = users.findByUserName("admin").orElseThrow();
            var address = new Address("Private Street", "Building One", "Toronto", "ON", "Canada", "M1M1M1");
            address.setUser(buyer); addresses.save(address); addressId = address.getAddressId();
            var first = new Product(); first.setProductName("Seller-owned item"); first.setDescription("Product description");
            first.setStock(10); first.setSpecialPrice(10); first.setUser(seller); products.save(first); ownProduct = first.getProductId();
            var second = new Product(); second.setProductName("Other private item"); second.setDescription("Product description");
            second.setStock(10); second.setSpecialPrice(20); second.setUser(admin); products.save(second); otherProduct = second.getProductId();
            var a = new CartItem(); a.setProduct(first); a.setQuantity(1);
            var b = new CartItem(); b.setProduct(second); b.setQuantity(1);
            var order = snapshots.complete(snapshots.capture(address, List.of(a, b)), buyer.getEmail(), 33.9,
                    new Payment("online", UUID.randomUUID().toString(), "succeeded", "ok", "Stripe")); orderId = order.getOrderId();
            var cart = carts.findCartByEmail(admin.getEmail());
            if (cart == null) { cart = new Cart(); cart.setUser(admin); carts.save(cart); }
            cart.setTotalPrice(cart.getTotalPrice() + 10); cartId = cart.getCartId();
            var item = new CartItem(); item.setProduct(first); item.setCart(cart); item.setQuantity(1); item.setProductPrice(10); cartItems.save(item);
        });
    }

    @Test
    void suppliedProductIdCannotOverwriteAnotherOwnersProductDuringCreation() throws Exception {
        String body = productBody.replace("{", "{\"productId\":" + otherProduct + ",");
        var response = mvc.perform(post("/api/seller/categories/" + categoryId + "/product").with(user("seller1").roles("SELLER"))
                .contentType("application/json").content(body)).andExpect(status().isCreated()).andReturn();
        long created = new tools.jackson.databind.ObjectMapper().readTree(response.getResponse().getContentAsString()).path("productId").asLong();
        assertNotEquals(otherProduct.longValue(), created);
        assertEquals("Other private item", products.findById(otherProduct).orElseThrow().getProductName());
        assertEquals(users.findByUserName("seller1").orElseThrow().getUserId(), products.findById(created).orElseThrow().getUser().getUserId());
    }

    @Test
    void sellerDirectoryIsAdminOnlyAndNeverExposesPasswordOrPrivateResources() throws Exception {
        mvc.perform(get("/api/auth/sellers")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/sellers").with(user("seller1").roles("SELLER"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/auth/sellers").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].username").value("seller1"))
                .andExpect(jsonPath("$.content[0].password").doesNotExist())
                .andExpect(jsonPath("$.content[0].address").doesNotExist()).andExpect(jsonPath("$.content[0].cart").doesNotExist());
    }

    @Test
    void sellerCannotEditDeleteOrUploadImagesForAnotherOwner() throws Exception {
        mvc.perform(put("/api/seller/products/" + otherProduct).with(user("seller1").roles("SELLER")).contentType("application/json").content(productBody)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/seller/products/" + otherProduct).with(user("seller1").roles("SELLER"))).andExpect(status().isNotFound());
        mvc.perform(multipart(org.springframework.http.HttpMethod.PUT, "/api/seller/products/" + otherProduct + "/image")
                .file(new MockMultipartFile("image", "test.png", "image/png", new byte[]{1})).with(user("seller1").roles("SELLER"))).andExpect(status().isNotFound());
        assertEquals("Other private item", products.findById(otherProduct).orElseThrow().getProductName());
    }

    @Test
    void ownerCanEditAndAdminCanManageAnyProduct() throws Exception {
        mvc.perform(put("/api/seller/products/" + ownProduct).with(user("seller1").roles("SELLER")).contentType("application/json").content(productBody)).andExpect(status().isOk());
        mvc.perform(put("/api/admin/products/" + otherProduct).with(user("admin").roles("ADMIN")).contentType("application/json").content(productBody)).andExpect(status().isOk());
        mvc.perform(delete("/api/admin/products/" + ownProduct).with(user("admin").roles("ADMIN"))).andExpect(status().isOk());
        assertFalse(products.existsById(ownProduct));
    }

    @Test
    void ordinaryBuyerCannotUseSellerOrAdminMutations() throws Exception {
        mvc.perform(put("/api/seller/products/" + ownProduct).with(user("user1").roles("USER")).contentType("application/json").content(productBody)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/orders").with(user("seller1").roles("SELLER"))).andExpect(status().isForbidden());
    }

    @Test
    void sellerOrderResponseContainsOnlyOwnLinesAndSubtotal() throws Exception {
        mvc.perform(get("/api/seller/orders?pageSize=100").with(user("seller1").roles("SELLER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].orderItems.length()").value(1))
                .andExpect(jsonPath("$.content[0].orderItems[0].product.productName").value("Seller-owned item"))
                .andExpect(jsonPath("$.content[0].itemsSubtotal").value(10.0))
                .andExpect(jsonPath("$.content[0].totalAmount").isEmpty()).andExpect(jsonPath("$.content[0].email").isEmpty())
                .andExpect(jsonPath("$.content[0].address").isEmpty()).andExpect(jsonPath("$.content[0].payment").isEmpty());
    }

    @Test
    void sellerStatusEndpointIsForbiddenAndBuyerOrdersAreScoped() throws Exception {
        mvc.perform(put("/api/seller/orders/" + orderId + "/status").with(user("seller1").roles("SELLER")).contentType("application/json").content("{\"status\":\"Processing\"}")).andExpect(status().isForbidden());
        mvc.perform(get("/api/orders/" + orderId).with(user("seller1").roles("SELLER"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/orders/" + orderId).with(user("user1").roles("USER"))).andExpect(status().isOk()).andExpect(jsonPath("$.orderItems.length()").value(2));
    }

    @Test
    void addressesAndCartDeletionAreOwnerScoped() throws Exception {
        mvc.perform(get("/api/addresses/" + addressId).with(user("seller1").roles("SELLER"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/addresses").with(user("seller1").roles("SELLER"))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/addresses/" + addressId).with(user("user1").roles("USER"))).andExpect(status().isOk());
        mvc.perform(delete("/api/carts/" + cartId + "/product/" + ownProduct).with(user("seller1").roles("SELLER"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/carts").with(user("user1").roles("USER"))).andExpect(status().isForbidden());
        mvc.perform(delete("/api/carts/" + cartId + "/product/" + ownProduct).with(user("admin").roles("ADMIN"))).andExpect(status().isOk());
    }

    @Test
    void adminStatusChangesMustFollowTheSequence() throws Exception {
        mvc.perform(put("/api/admin/orders/" + orderId + "/status").with(user("admin").roles("ADMIN")).contentType("application/json").content("{\"status\":\"Delivered\"}")).andExpect(status().isBadRequest());
        for (String next : List.of("Processing", "Shipped", "Delivered")) {
            mvc.perform(put("/api/admin/orders/" + orderId + "/status").with(user("admin").roles("ADMIN")).contentType("application/json").content("{\"status\":\"" + next + "\"}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.orderStatus").value(next));
        }
        mvc.perform(put("/api/admin/orders/" + orderId + "/status").with(user("admin").roles("ADMIN")).contentType("application/json").content("{\"status\":\"Processing\"}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/admin/orders/" + orderId + "/status").with(user("admin").roles("ADMIN")).contentType("application/json").content("{}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/admin/orders/" + orderId + "/status").with(user("admin").roles("ADMIN")).contentType("application/json").content("{\"status\":\"Cancelled\"}")).andExpect(status().isBadRequest());
    }

    @Test
    void attentionOrdersCannotBePromotedAndLegacyAcceptedIsSupported() throws Exception {
        new TransactionTemplate(transactions).executeWithoutResult(tx -> orders.findById(orderId).orElseThrow().setOrderStatus("Paid, needs attention"));
        mvc.perform(put("/api/admin/orders/" + orderId + "/status").with(user("admin").roles("ADMIN")).contentType("application/json").content("{\"status\":\"Processing\"}")).andExpect(status().isBadRequest());
        new TransactionTemplate(transactions).executeWithoutResult(tx -> orders.findById(orderId).orElseThrow().setOrderStatus("Accepted !"));
        mvc.perform(put("/api/admin/orders/" + orderId + "/status").with(user("admin").roles("ADMIN")).contentType("application/json").content("{\"status\":\"Processing\"}")).andExpect(status().isOk());
    }
}
