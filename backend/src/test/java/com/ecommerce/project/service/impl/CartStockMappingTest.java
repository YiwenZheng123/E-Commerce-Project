package com.ecommerce.project.service.impl;

import com.ecommerce.project.model.Cart;
import com.ecommerce.project.model.CartItem;
import com.ecommerce.project.model.Product;
import com.ecommerce.project.payload.ProductDTO;
import com.ecommerce.project.repositories.CartRepository;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CartStockMappingTest {
    @Test
    void cartResponsesPreserveProductStock() {
        Product product = new Product();
        product.setStock(90);
        product.setImage("default.png");
        CartItem item = new CartItem();
        item.setProduct(product);
        item.setQuantity(2);
        Cart cart = new Cart();
        cart.setCartItems(List.of(item));

        CartRepository repository = mock(CartRepository.class);
        when(repository.findCartByEmailAndCartId("buyer@example.com", 1L)).thenReturn(cart);
        when(repository.findAll()).thenReturn(List.of(cart));
        CartServiceImpl service = new CartServiceImpl();
        service.cartRepository = repository;
        ReflectionTestUtils.setField(service, "modelMapper", new ModelMapper());
        ReflectionTestUtils.setField(service, "imageBaseUrl", "http://localhost:8080/images");

        ProductDTO single = service.getCart("buyer@example.com", 1L).getProducts().get(0);
        ProductDTO listed = service.getAllCarts().get(0).getProducts().get(0);
        assertEquals(90, single.getStock());
        assertEquals(2, single.getQuantity());
        assertEquals("http://localhost:8080/images/default.png", single.getImage());
        assertEquals(90, listed.getStock());
        assertEquals(90, product.getStock());
    }
}
