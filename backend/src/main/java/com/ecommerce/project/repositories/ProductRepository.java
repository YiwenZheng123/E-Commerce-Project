package com.ecommerce.project.repositories;

import com.ecommerce.project.model.Category;
import com.ecommerce.project.model.Product;
import com.ecommerce.project.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    Page<Product> findByCategoryOrderByPriceAsc(Category category, Pageable pageDetails);

    Page<Product> findByProductNameLikeIgnoreCase(String keyword, Pageable pageDetails);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true)
    @Query("update Product p set p.stock = p.stock - :quantity where p.productId = :productId and p.stock >= :quantity")
    int deductStock(Long productId, int quantity);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true)
    @Query("update Product p set p.stock = p.stock + :quantity where p.productId = :productId")
    int restoreStock(Long productId, int quantity);

    Page<Product> findByUser(User user, Pageable pageDetails);
}
