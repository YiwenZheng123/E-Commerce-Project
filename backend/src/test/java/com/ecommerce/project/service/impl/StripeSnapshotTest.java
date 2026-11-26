package com.ecommerce.project.service.impl;

import com.ecommerce.project.model.*;
import com.ecommerce.project.payload.StripePaymentDTO;
import com.ecommerce.project.repositories.*;
import com.ecommerce.project.util.AuthUtil;
import com.stripe.model.*;
import com.stripe.param.*;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class StripeSnapshotTest {
    @Test
    void createsSnapshotWithOwnedAddressAndServerPrice() throws Exception {
        StripeServiceImpl service = new StripeServiceImpl();
        CartRepository carts = mock(CartRepository.class); AddressRepository addresses = mock(AddressRepository.class);
        StripeCheckoutRepository checkouts = mock(StripeCheckoutRepository.class); AuthUtil auth = mock(AuthUtil.class);
        OrderSnapshotService snapshots = new OrderSnapshotService(); ReflectionTestUtils.setField(snapshots, "modelMapper", new ModelMapper());
        for (var field : Map.of("cartRepository", carts, "addressRepository", addresses, "checkoutRepository", checkouts, "authUtil", auth, "snapshots", snapshots).entrySet()) ReflectionTestUtils.setField(service, field.getKey(), field.getValue());
        User user = new User(); user.setUserId(7L); user.setEmail("buyer@example.com");
        when(auth.loggedInUser()).thenReturn(user); when(auth.loggedInEmail()).thenReturn(user.getEmail());
        com.ecommerce.project.model.Address address = new com.ecommerce.project.model.Address(); address.setAddressId(2L); address.setUser(user); address.setStreet("Server Street");
        when(addresses.findById(2L)).thenReturn(Optional.of(address));
        com.ecommerce.project.model.Product product = new com.ecommerce.project.model.Product(); product.setProductId(3L); product.setProductName("Original name"); product.setImage("old.jpg"); product.setSpecialPrice(10); product.setStock(10);
        CartItem item = new CartItem(); item.setProduct(product); item.setQuantity(2); Cart cart = new Cart(); cart.setCartItems(List.of(item));
        when(carts.findCartByEmail(user.getEmail())).thenReturn(cart);
        StripePaymentDTO request = new StripePaymentDTO(); request.setProductIds(List.of(3L)); request.setAmount(1L); request.setEmail("forged@example.com");
        com.ecommerce.project.model.Address supplied = new com.ecommerce.project.model.Address(); supplied.setAddressId(2L); supplied.setStreet("Client Street"); request.setAddress(supplied);
        Customer customer = new Customer(); customer.setId("cus_test"); CustomerSearchResult search = new CustomerSearchResult(); search.setData(List.of(customer));
        PaymentIntent intent = new PaymentIntent(); intent.setId("pi_test");
        try (var customers = mockStatic(Customer.class); var intents = mockStatic(PaymentIntent.class)) {
            customers.when(() -> Customer.search(any(CustomerSearchParams.class))).thenReturn(search);
            intents.when(() -> PaymentIntent.create(any(PaymentIntentCreateParams.class))).thenAnswer(call -> {
                PaymentIntentCreateParams params = call.getArgument(0); assertEquals(2260L, params.getAmount()); assertEquals("usd", params.getCurrency()); return intent;
            });
            service.paymentIntent(request);
            verify(checkouts).save(argThat(saved -> {
                var frozen = snapshots.decode(saved.getSnapshot());
                return saved.getUserId().equals(7L) && saved.getAmount() == 2260 && frozen.address().getStreet().equals("Server Street") && frozen.items().get(0).productName().equals("Original name");
            }));
            User another = new User(); another.setUserId(8L); address.setUser(another);
            assertThrows(com.ecommerce.project.exceptions.APIException.class, () -> service.paymentIntent(request));
        }
    }
}
