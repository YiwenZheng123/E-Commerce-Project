package com.ecommerce.project.service.impl;

import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.exceptions.ResourceNotFoundException;
import com.ecommerce.project.model.*;
import com.ecommerce.project.payload.OrderDTO;
import com.ecommerce.project.payload.OrderItemDTO;
import com.ecommerce.project.payload.OrderResponse;
import com.ecommerce.project.repositories.*;
import com.ecommerce.project.service.CartService;
import com.ecommerce.project.service.OrderService;
import com.ecommerce.project.util.AuthUtil;
import jakarta.transaction.Transactional;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;




@Service
public class OrderServiceImpl implements OrderService {
    @Autowired
    AuthUtil authUtil;
    @Autowired
    private CartRepository cartRepository;
    @Autowired
    private AddressRepository addressRepository;
    @Autowired
    private PaymentRepository paymentRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private OrderItemRepository orderItemRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private CartService cartService;
    @Autowired
    private ModelMapper modelMapper;

    @Override
    @Transactional
    public OrderDTO placeOrder(String email, Long addressId, String paymentMethod, String pgName, String pgPaymentId, String pgStatus, String pgResponseMessage) {
        com.stripe.model.PaymentIntent intent;
        try {
            intent = com.stripe.model.PaymentIntent.retrieve(pgPaymentId);
        } catch (com.stripe.exception.StripeException e) {
            throw new APIException("Could not verify Stripe payment");
        }
        if (!"succeeded".equals(intent.getStatus()) || !email.equals(intent.getMetadata().get("email"))) {
            throw new APIException("Payment is not completed for this account");
        }
        Long userId = authUtil.loggedInUserId();
        // The buyer row also serializes legacy confirmations that have no checkout row yet.
        userRepository.lockForPaymentConfirmation(userId).orElseThrow(() -> new APIException("Account not found"));
        var existingPayment = paymentRepository.findByPgNameAndPgPaymentId("Stripe", pgPaymentId);
        if (existingPayment.isPresent()) {
            Order order = existingPayment.get().getOrder();
            if (!email.equals(order.getEmail())) throw new APIException("Payment does not belong to this account");
            return buyerOrderDTO(order);
        }
        var checkout = stripeCheckouts.findById(pgPaymentId).orElse(null);
        if (checkout == null) {
            // Payments started before snapshots existed are explicitly marked as backfilled.
            String selection = intent.getMetadata().get("selection");
            String oldAddressId = intent.getMetadata().get("addressId");
            if (selection == null || oldAddressId == null) throw new APIException("Legacy payment details are unavailable. Please contact support.");
            Address address = addressRepository.findById(Long.valueOf(oldAddressId))
                    .orElseThrow(() -> new APIException("Legacy payment address is unavailable. Please contact support."));
            if (!address.getUser().getEmail().equals(email)) throw new APIException("Address does not belong to this account");
            var lines = new ArrayList<com.ecommerce.project.payload.CheckoutSnapshot.Item>();
            for (String entry : selection.split(",")) {
                String[] parts = entry.split(":");
                Product product = productRepository.findById(Long.valueOf(parts[0]))
                        .orElseThrow(() -> new APIException("Legacy payment product is unavailable. Please contact support."));
                lines.add(new com.ecommerce.project.payload.CheckoutSnapshot.Item(product.getProductId(), product.getUser() == null ? null : product.getUser().getUserId(),
                        product.getProductName(), product.getImage(), Integer.parseInt(parts[1]), product.getSpecialPrice(), product.getDiscount()));
            }
            checkout = new StripeCheckout();
            checkout.setPaymentIntentId(pgPaymentId);
            checkout.setUserId(userId);
            checkout.setAmount(intent.getAmount());
            checkout.setSnapshot(snapshots.encode(new com.ecommerce.project.payload.CheckoutSnapshot(
                    modelMapper.map(address, com.ecommerce.project.payload.AddressDTO.class), lines, true)));
        }
        if (!checkout.getUserId().equals(userId) || !"usd".equals(intent.getCurrency())
                || !checkout.getAmount().equals(intent.getAmountReceived())) throw new APIException("Payment does not match checkout");
        var snapshot = snapshots.decode(checkout.getSnapshot());
        Order order = snapshots.complete(snapshot, email, checkout.getAmount() / 100.0,
                new Payment("online", pgPaymentId, "succeeded", "Payment successful", "Stripe"));
        checkout.setOrderId(order.getOrderId());
        stripeCheckouts.save(checkout);
        return buyerOrderDTO(order);
    }

    @Autowired
    private StripeCheckoutRepository stripeCheckouts;
    @Autowired
    private OrderSnapshotService snapshots;

    @org.springframework.beans.factory.annotation.Value("${image.base.url}")
    private String imageBaseUrl;

    @Override
    @Transactional
    public OrderResponse getMyOrders(Integer pageNumber, Integer pageSize) {
        Pageable pageable = PageRequest.of(pageNumber, pageSize,
                Sort.by(Sort.Order.desc("orderDate"), Sort.Order.desc("orderId")));
        Page<Order> page = orderRepository.findByEmail(authUtil.loggedInEmail(), pageable);
        OrderResponse response = new OrderResponse();
        response.setContent(page.getContent().stream().map(this::buyerOrderDTO).toList());
        response.setPageNumber(page.getNumber());
        response.setPageSize(page.getSize());
        response.setTotalElements(page.getTotalElements());
        response.setTotalPages(page.getTotalPages());
        response.setLastPage(page.isLast());
        return response;
    }

    @Override
    @Transactional
    public OrderDTO getMyOrder(Long orderId) {
        Order order = orderRepository.findByOrderIdAndEmail(orderId, authUtil.loggedInEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "orderId", orderId));
        return buyerOrderDTO(order);
    }

    private OrderDTO buyerOrderDTO(Order order) {
        return orderDTO(order, order.getOrderItems());
    }

    private OrderDTO orderDTO(Order order, List<OrderItem> lines) {
        OrderDTO dto = modelMapper.map(order, OrderDTO.class);
        if ("Accepted !".equals(dto.getOrderStatus()) || "Order Accepted !".equals(dto.getOrderStatus())) dto.setOrderStatus("Accepted");
        var mapper = new tools.jackson.databind.ObjectMapper();
        dto.setAddress(order.getAddressSnapshot() == null ? null : mapper.readValue(order.getAddressSnapshot(), com.ecommerce.project.payload.AddressDTO.class));
        dto.setAddressId(dto.getAddress() == null ? null : dto.getAddress().getAddressId());
        dto.setOrderItems(lines.stream().map(line -> {
            OrderItemDTO item = modelMapper.map(line, OrderItemDTO.class);
            var product = new com.ecommerce.project.payload.ProductDTO();
            product.setProductId(line.getSnapshotProductId());
            product.setProductName(line.getSnapshotProductName());
            String image = line.getSnapshotImage();
            if (image != null && !image.startsWith("http://") && !image.startsWith("https://")) {
                image = imageBaseUrl.endsWith("/") ? imageBaseUrl + image : imageBaseUrl + "/" + image;
            }
            product.setImage(image);
            product.setSpecialPrice(line.getOrderedProductPrice());
            item.setProduct(product);
            return item;
        }).toList());
        return dto;
    }

    @Override
    public OrderResponse getAllOrders(Integer pageNumber, Integer pageSize, String sortBy, String sortOrder) {
        Sort sortByAndOrder = sortOrder.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending()
                .and(Sort.by("orderId").ascending());
        Pageable pageDetails = PageRequest.of(pageNumber, pageSize, sortByAndOrder);
        Page<Order> pageOrders = orderRepository.findAll(pageDetails);

        List<Order> orders = pageOrders.getContent();
        List<OrderDTO> orderDTOS = orders.stream()
                .map(this::buyerOrderDTO)
                .toList();

        OrderResponse orderResponse = new OrderResponse();
        orderResponse.setContent(orderDTOS);
        orderResponse.setPageNumber(pageOrders.getNumber());
        orderResponse.setPageSize(pageOrders.getSize());
        orderResponse.setTotalElements(pageOrders.getTotalElements());
        orderResponse.setTotalPages(pageOrders.getTotalPages());
        orderResponse.setLastPage(pageOrders.isLast());

        return orderResponse;
    }

    @Override
    @Transactional
    public OrderDTO updateOrder(Long orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order","orderId", orderId));
        String current = order.getOrderStatus();
        if ("Accepted !".equals(current) || "Order Accepted !".equals(current)) current = "Accepted";
        if (status.equals(current)) return buyerOrderDTO(order);
        String next = switch (current == null ? "" : current) {
            case "Accepted" -> "Processing";
            case "Processing" -> "Shipped";
            case "Shipped" -> "Delivered";
            default -> null;
        };
        if (!status.equals(next)) throw new APIException("Order status cannot change from " + current + " to " + status);
        order.setOrderStatus(status);
        orderRepository.save(order);
        return buyerOrderDTO(order);
    }

    @Override
    public OrderResponse getAllSellerOrders(Integer pageNumber, Integer pageSize, String sortBy, String sortOrder) {
        Sort sortByAndOrder = (sortOrder.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending())
                .and(Sort.by("orderId").ascending());
        Pageable pageDetails = PageRequest.of(pageNumber, pageSize, sortByAndOrder);
        User seller = authUtil.loggedInUser();
        Page<Order> pageOrders = orderRepository.findOrdersBySellerId(seller.getUserId(), pageDetails);
        List<OrderDTO> orderDTOS = pageOrders.getContent().stream()
                .map(order -> {
                    var lines = order.getOrderItems().stream()
                            .filter(item -> seller.getUserId().equals(item.getSnapshotSellerId())).toList();
                    var dto = orderDTO(order, lines);
                    dto.setEmail(null);
                    dto.setAddress(null);
                    dto.setAddressId(null);
                    dto.setPayment(null);
                    dto.setTotalAmount(null);
                    dto.setItemsSubtotal(lines.stream().mapToDouble(item -> item.getOrderedProductPrice() * item.getQuantity()).sum());
                    return dto;
                }).toList();

        OrderResponse orderResponse = new OrderResponse();
        orderResponse.setContent(orderDTOS);
        orderResponse.setPageNumber(pageOrders.getNumber());
        orderResponse.setPageSize(pageOrders.getSize());
        orderResponse.setTotalElements(pageOrders.getTotalElements());
        orderResponse.setTotalPages(pageOrders.getTotalPages());
        orderResponse.setLastPage(pageOrders.isLast());

        return orderResponse;
    }
}
