package com.ecommerce.project.service.impl;

import com.ecommerce.project.model.Order;
import com.ecommerce.project.model.User;
import com.ecommerce.project.repositories.OrderRepository;
import com.ecommerce.project.util.AuthUtil;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SellerOrderPaginationTest {
    @Test
    void usesSellerQueryAndPreservesItsPagination() {
        OrderRepository repository = mock(OrderRepository.class);
        AuthUtil authUtil = mock(AuthUtil.class);
        User seller = new User();
        seller.setUserId(2L);
        when(authUtil.loggedInUser()).thenReturn(seller);
        var pageable = PageRequest.of(1, 2,
                Sort.by("orderDate").ascending().and(Sort.by("orderId").ascending()));
        Order first = new Order();
        first.setOrderId(10L);
        Order second = new Order();
        second.setOrderId(11L);
        when(repository.findOrdersBySellerId(2L, pageable))
                .thenReturn(new PageImpl<>(List.of(first, second), pageable, 4));
        OrderServiceImpl service = new OrderServiceImpl();
        ReflectionTestUtils.setField(service, "orderRepository", repository);
        ReflectionTestUtils.setField(service, "authUtil", authUtil);
        ReflectionTestUtils.setField(service, "modelMapper", new ModelMapper());

        var response = service.getAllSellerOrders(1, 2, "orderDate", "asc");

        assertEquals(List.of(10L, 11L), response.getContent().stream()
                .map(order -> order.getOrderId()).toList());
        assertEquals(4L, response.getTotalElements());
        assertEquals(2, response.getTotalPages());
        assertEquals(1, response.getPageNumber());
        assertEquals(2, response.getPageSize());
        assertTrue(response.getLastPage());
        verify(repository).findOrdersBySellerId(2L, pageable);
        verifyNoMoreInteractions(repository);
    }
}
