package com.ecommerce.project.service.impl;

import com.ecommerce.project.controller.CartController;
import com.ecommerce.project.repositories.CartRepository;
import com.ecommerce.project.service.CartService;
import com.ecommerce.project.util.AuthUtil;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class EmptyCartTest {
    @Test
    void newAccountReceivesAnEmptyCartWithoutCreatingDatabaseRecords() throws Exception {
        CartController controller = new CartController();
        AuthUtil auth = mock(AuthUtil.class);
        CartRepository repository = mock(CartRepository.class);
        CartService service = mock(CartService.class);
        when(auth.loggedInEmail()).thenReturn("new@example.com");
        ReflectionTestUtils.setField(controller, "authUtil", auth);
        ReflectionTestUtils.setField(controller, "cartRepository", repository);
        ReflectionTestUtils.setField(controller, "cartService", service);
        MockMvcBuilders.standaloneSetup(controller).build().perform(get("/api/carts/users/cart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products").isEmpty())
                .andExpect(jsonPath("$.totalPrice").value(0));
        verify(repository).findCartByEmail("new@example.com");
        verifyNoMoreInteractions(repository);
        verifyNoInteractions(service);
    }
}
