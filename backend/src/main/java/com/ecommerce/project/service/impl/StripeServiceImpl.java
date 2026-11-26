package com.ecommerce.project.service.impl;

import com.ecommerce.project.payload.StripePaymentDTO;
import com.ecommerce.project.service.StripeService;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.CustomerSearchResult;
import com.stripe.model.PaymentIntent;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.CustomerSearchParams;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;


@Service
@Transactional
public class StripeServiceImpl implements StripeService {
    @org.springframework.beans.factory.annotation.Autowired
    private com.ecommerce.project.repositories.CartRepository cartRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private com.ecommerce.project.util.AuthUtil authUtil;
    @org.springframework.beans.factory.annotation.Autowired
    private com.ecommerce.project.repositories.AddressRepository addressRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private com.ecommerce.project.repositories.StripeCheckoutRepository checkoutRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private OrderSnapshotService snapshots;
    @Value("${stripe.secret.key}")
    private String stripeApiKey;
    @PostConstruct
    public void init(){
        Stripe.apiKey = stripeApiKey;
    }
    @Override
    public PaymentIntent paymentIntent(StripePaymentDTO stripePaymentDTO) throws StripeException {
        var items = CheckoutSelection.items(cartRepository.findCartByEmail(authUtil.loggedInEmail()), stripePaymentDTO.getProductIds());
        var subtotal = items.stream().map(item -> java.math.BigDecimal.valueOf(item.getProduct().getSpecialPrice())
                .multiply(java.math.BigDecimal.valueOf(item.getQuantity())))
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        long amount = subtotal.multiply(new java.math.BigDecimal("1.13")).movePointRight(2)
                .setScale(0, java.math.RoundingMode.HALF_UP).longValueExact();
        var user = authUtil.loggedInUser();
        var address = addressRepository.findById(stripePaymentDTO.getAddress().getAddressId())
                .orElseThrow(() -> new com.ecommerce.project.exceptions.APIException("Address not found"));
        if (!address.getUser().getUserId().equals(user.getUserId())) throw new com.ecommerce.project.exceptions.APIException("Address not found");
        var snapshot = snapshots.capture(address, items);
        Customer customer;
        // Retrieve and check if customer exist
        CustomerSearchParams searchParams =
                CustomerSearchParams.builder()
                        .setQuery("email:'" + user.getEmail() + "'")
                        .build();
        CustomerSearchResult customers = Customer.search(searchParams);

        if (customers.getData().isEmpty()) {
            CustomerCreateParams customerParams =
                    CustomerCreateParams.builder()
                            .setName(stripePaymentDTO.getName())
                            .setEmail(user.getEmail())
                            .setAddress(
                                    CustomerCreateParams.Address.builder()
                                            .setLine1(address.getStreet())
                                            .setCity(address.getCity())
                                            .setState(address.getState())
                                            .setPostalCode(address.getPincode())
                                            .setCountry(address.getCountry())
                                            .build()
                            )
                            .build();
            customer = Customer.create(customerParams);

        }else{
            // Fetch the customer that exist
            customer = customers.getData().get(0);
        }
        PaymentIntentCreateParams params =
                PaymentIntentCreateParams.builder()
                        .setAmount(amount)
                        .putMetadata("email", authUtil.loggedInEmail())
                        .setCurrency("usd")
                        .setCustomer(customer.getId())
                        .setDescription(stripePaymentDTO.getDescription())
                        .setAutomaticPaymentMethods(
                                PaymentIntentCreateParams.AutomaticPaymentMethods.builder().setEnabled(true).build()
                        )
                        .build();
        PaymentIntent intent = PaymentIntent.create(params);
        var checkout = new com.ecommerce.project.model.StripeCheckout();
        checkout.setPaymentIntentId(intent.getId());
        checkout.setUserId(user.getUserId());
        checkout.setAmount(amount);
        checkout.setSnapshot(snapshots.encode(snapshot));
        checkoutRepository.save(checkout);
        return intent;

    }
}
