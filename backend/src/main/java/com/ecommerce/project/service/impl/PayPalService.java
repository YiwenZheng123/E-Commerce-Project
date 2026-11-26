package com.ecommerce.project.service.impl;

import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.exceptions.ResourceNotFoundException;
import com.ecommerce.project.model.*;
import com.ecommerce.project.repositories.*;
import com.ecommerce.project.util.AuthUtil;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class PayPalService {
    @Autowired
    private AuthUtil authUtil;
    @Autowired
    private CartRepository cartRepository;
    @Autowired
    private CartItemRepository cartItemRepository;
    @Autowired
    private AddressRepository addressRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private PaymentRepository paymentRepository;
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private OrderItemRepository orderItemRepository;
    @Autowired
    private PayPalCheckoutRepository checkoutRepository;

    @Autowired
    private OrderSnapshotService snapshots;

    @Value("${paypal.client-id:}")
    private String clientId;
    @Value("${paypal.client-secret:}")
    private String clientSecret;

    private final RestClient client = RestClient.create("https://api-m.sandbox.paypal.com");
    private final ObjectMapper mapper = new ObjectMapper();

    private record CheckoutItem(Long productId, int quantity, double price, double discount) {}

    private String accessToken() {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            throw new APIException("PayPal sandbox credentials are not configured");
        }
        JsonNode response = client.post().uri("/v1/oauth2/token")
                .headers(headers -> headers.setBasicAuth(clientId, clientSecret))
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body("grant_type=client_credentials").retrieve().body(JsonNode.class);
        return response.path("access_token").asText();
    }

    @Transactional
    public String createOrder(Long addressId, List<Long> productIds) {
        User user = authUtil.loggedInUser();
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "addressId", addressId));
        if (!address.getUser().getUserId().equals(user.getUserId())) {
            throw new ResourceNotFoundException("Address", "addressId", addressId);
        }
        Cart cart = cartRepository.findCartByEmail(user.getEmail());
        if (cart == null || cart.getCartItems().isEmpty()) {
            throw new APIException("Cart is empty");
        }
        var snapshot = snapshots.capture(address, CheckoutSelection.items(cart, productIds));
        var items = snapshot.items();
        BigDecimal subtotal = items.stream().map(item -> BigDecimal.valueOf(item.price()).multiply(BigDecimal.valueOf(item.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        String amount = subtotal.multiply(new BigDecimal("1.13")).setScale(2, RoundingMode.HALF_UP).toPlainString();
        if (subtotal.signum() <= 0) {
            throw new APIException("Cart total must be greater than zero");
        }
        JsonNode result = client.post().uri("/v2/checkout/orders")
                .headers(headers -> headers.setBearerAuth(accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("intent", "CAPTURE", "purchase_units", List.of(Map.of("amount", Map.of("currency_code", "USD", "value", amount)))))
                .retrieve().body(JsonNode.class);
        PayPalCheckout checkout = new PayPalCheckout();
        checkout.setPaypalOrderId(result.path("id").asText());
        checkout.setUserId(user.getUserId());
        checkout.setAddressId(addressId);
        checkout.setAmount(amount);
        checkout.setSnapshot(snapshots.encode(snapshot));
        checkoutRepository.save(checkout);
        return checkout.getPaypalOrderId();
    }

    @Transactional
    public Long captureOrder(String paypalOrderId) {
        User user = authUtil.loggedInUser();
        PayPalCheckout checkout = checkoutRepository.findForUpdate(paypalOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("PayPal order", "id", paypalOrderId));
        if (!checkout.getUserId().equals(user.getUserId())) {
            throw new ResourceNotFoundException("PayPal order", "id", paypalOrderId);
        }
        if (checkout.getOrderId() != null) {
            return checkout.getOrderId();
        }
        if (checkout.getSnapshot() == null) {
            // Older pending payments can only be backfilled from the remaining live records.
            Address address = addressRepository.findById(checkout.getAddressId()).orElseThrow(() -> new APIException("Legacy payment address is unavailable. Please contact support."));
            var oldItems = mapper.readValue(checkout.getItems(), CheckoutItem[].class);
            var items = java.util.Arrays.stream(oldItems).map(item -> {
                Product product = productRepository.findById(item.productId()).orElseThrow(() -> new APIException("Legacy payment product is unavailable. Please contact support."));
                return new com.ecommerce.project.payload.CheckoutSnapshot.Item(item.productId(), product.getUser() == null ? null : product.getUser().getUserId(),
                        product.getProductName(), product.getImage(), item.quantity(), item.price(), item.discount());
            }).toList();
            checkout.setSnapshot(snapshots.encode(new com.ecommerce.project.payload.CheckoutSnapshot(
                    new org.modelmapper.ModelMapper().map(address, com.ecommerce.project.payload.AddressDTO.class), items, true)));
        }
        var snapshot = snapshots.decode(checkout.getSnapshot());
        var items = snapshot.items();
        String token = accessToken();
        JsonNode result = client.get().uri("/v2/checkout/orders/{id}", paypalOrderId)
                .headers(headers -> headers.setBearerAuth(token)).retrieve().body(JsonNode.class);
        if (!"COMPLETED".equals(result.path("status").asText())) {
            for (var item : items) {
                Product product = productRepository.findById(item.productId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product", "productId", item.productId()));
                if (product.getStock() < item.quantity()) {
                    throw new APIException("A product is out of stock. Please update your cart before paying.");
                }
            }
            try {
                result = client.post().uri("/v2/checkout/orders/{id}/capture", paypalOrderId)
                        .headers(headers -> {
                            headers.setBearerAuth(token);
                            headers.set("PayPal-Request-Id", "capture-" + paypalOrderId);
                            headers.set("Prefer", "return=representation");
                        })
                        .contentType(MediaType.APPLICATION_JSON).body(Map.of())
                        .retrieve().body(JsonNode.class);
            } catch (RestClientResponseException e) {
                if (e.getStatusCode().value() == 422 && "INSTRUMENT_DECLINED".equals(
                        mapper.readTree(e.getResponseBodyAsString()).path("details").path(0).path("issue").asText())) {
                    throw new APIException("INSTRUMENT_DECLINED");
                }
                result = client.get().uri("/v2/checkout/orders/{id}", paypalOrderId)
                        .headers(headers -> headers.setBearerAuth(token)).retrieve().body(JsonNode.class);
            }
        }
        JsonNode capture = result.path("purchase_units").path(0).path("payments").path("captures").path(0);
        if (!"COMPLETED".equals(result.path("status").asText())
                || !"COMPLETED".equals(capture.path("status").asText())
                || !"USD".equals(capture.path("amount").path("currency_code").asText())
                || new BigDecimal(checkout.getAmount()).compareTo(new BigDecimal(capture.path("amount").path("value").asText("0"))) != 0) {
            throw new APIException("PayPal payment was not completed. Please try again.");
        }
        Order savedOrder = snapshots.complete(snapshot, user.getEmail(), Double.parseDouble(checkout.getAmount()),
                new Payment("online", capture.path("id").asText(), "COMPLETED", "Payment successful", "PayPal"));
        checkout.setOrderId(savedOrder.getOrderId());
        checkoutRepository.save(checkout);
        return savedOrder.getOrderId();
    }
}
