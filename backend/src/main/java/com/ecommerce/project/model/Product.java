package com.ecommerce.project.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "products")
@ToString
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long productId;
    @NotBlank
    @Size(min = 3, message = "Product Name must contain at least 3 characters")
    private String productName;
    private String image;
    @NotBlank
    @Size(min = 6, message = "Description must contain at least 6 characters")
    private String description;
    private Integer stock;
    private double price; // 100
    private double discount; // 25
    private double specialPrice; // 75

    @ManyToOne
    @JoinColumn(name = "category_id")
    @ToString.Exclude
    private Category category;


    @ManyToOne
    @JoinColumn(name = "seller_id")
    @ToString.Exclude
    private User user;


    @OneToMany(mappedBy = "product", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, fetch = FetchType.EAGER)
    @ToString.Exclude
    private List<CartItem> products = new ArrayList<>();

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        return other instanceof Product product
                && getProductId() != null
                && getProductId().equals(product.getProductId());
    }

    @Override
    public int hashCode() {
        // Keep Set membership stable when the generated ID or inventory changes.
        return Product.class.hashCode();
    }

}
