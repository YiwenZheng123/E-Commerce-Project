package com.ecommerce.project.service.impl;

import com.ecommerce.project.controller.OrderController;
import com.ecommerce.project.exceptions.MyGlobalExceptionHandler;
import com.ecommerce.project.model.*;
import com.ecommerce.project.repositories.OrderRepository;
import com.ecommerce.project.util.AuthUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.time.LocalDate;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class BuyerOrdersTest {
    private final OrderRepository repository = mock(OrderRepository.class);
    private final AuthUtil auth = mock(AuthUtil.class);
    private MockMvc mvc;
    private Order order;

    @BeforeEach
    void setup() {
        OrderServiceImpl service = new OrderServiceImpl();
        ReflectionTestUtils.setField(service, "orderRepository", repository);
        ReflectionTestUtils.setField(service, "authUtil", auth);
        ReflectionTestUtils.setField(service, "modelMapper", new ModelMapper());
        ReflectionTestUtils.setField(service, "imageBaseUrl", "http://localhost:8080/images/");
        when(auth.loggedInEmail()).thenReturn("buyer@example.com");
        OrderController controller = new OrderController();
        ReflectionTestUtils.setField(controller, "orderService", service);
        mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new MyGlobalExceptionHandler()).build();
        order = new Order(); order.setOrderId(8L); order.setEmail("buyer@example.com");
        order.setOrderDate(LocalDate.of(2026, 10, 29)); order.setTotalAmount(22.60);
        Address address = new Address(); address.setAddressId(4L); address.setCity("Toronto"); order.setAddress(address);
        order.setAddressSnapshot(new tools.jackson.databind.ObjectMapper().writeValueAsString(new ModelMapper().map(address, com.ecommerce.project.payload.AddressDTO.class)));
        order.setSnapshotBackfilled(true);
        Product product = new Product(); product.setProductId(2L); product.setImage("shoe.png"); product.setSpecialPrice(99.0);
        OrderItem item = new OrderItem(); item.setOrderItemId(1L); item.setProduct(product); item.setQuantity(2); item.setOrderedProductPrice(10.0);
        item.setSnapshotProductId(2L); item.setSnapshotImage("shoe.png"); item.setSnapshotProductName("Original shoes");
        order.setOrderItems(List.of(item));
    }

    @Test
    void listUsesAuthenticatedBuyerAndStableNewestFirstPagination() throws Exception {
        var page = PageRequest.of(1, 2, Sort.by(Sort.Order.desc("orderDate"), Sort.Order.desc("orderId")));
        when(repository.findByEmail("buyer@example.com", page)).thenReturn(new PageImpl<>(List.of(order), page, 3));
        mvc.perform(get("/api/orders?pageNumber=1&pageSize=2&email=other@example.com"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].orderId").value(8))
                .andExpect(jsonPath("$.pageNumber").value(1)).andExpect(jsonPath("$.totalPages").value(2));
        verify(repository).findByEmail("buyer@example.com", page);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void detailUsesHistoricalPriceAndReturnsAddressAndImageUrl() throws Exception {
        when(repository.findByOrderIdAndEmail(8L, "buyer@example.com")).thenReturn(Optional.of(order));
        mvc.perform(get("/api/orders/8")).andExpect(status().isOk())
                .andExpect(jsonPath("$.orderItems[0].orderedProductPrice").value(10.0))
                .andExpect(jsonPath("$.orderItems[0].product.image").value("http://localhost:8080/images/shoe.png"))
                .andExpect(jsonPath("$.address.city").value("Toronto"))
                .andExpect(jsonPath("$.totalAmount").value(22.60));
    }

    @Test
    void changingBuyerCannotReadSameOrder() throws Exception {
        when(auth.loggedInEmail()).thenReturn("other@example.com");
        mvc.perform(get("/api/orders/8")).andExpect(status().isNotFound());
        verify(repository).findByOrderIdAndEmail(8L, "other@example.com");
        verify(repository, never()).findById(anyLong());
    }

    @Test
    void emptyListUsesBackendDefaults() throws Exception {
        var page = PageRequest.of(0, 10, Sort.by(Sort.Order.desc("orderDate"), Sort.Order.desc("orderId")));
        when(repository.findByEmail("buyer@example.com", page)).thenReturn(Page.empty(page));
        mvc.perform(get("/api/orders")).andExpect(status().isOk()).andExpect(jsonPath("$.content").isEmpty());
    }

    @Test
    void rejectsInvalidPaginationBeforeQuerying() throws Exception {
        mvc.perform(get("/api/orders?pageNumber=-1")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/orders?pageSize=101")).andExpect(status().isBadRequest());
        verifyNoInteractions(repository);
    }
}
