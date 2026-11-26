package com.ecommerce.project.security.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Set;

@Data
public class SignupRequest {
    @NotBlank
    @Size(min = 3, max = 20)
    private String username;

    @NotBlank
    @Size(max = 50)
    private String email;


    @Size(min = 1, max = 1, message = "Choose one account type: user or seller")
    private Set<@NotNull @Pattern(regexp = "user|seller", message = "Account type must be user or seller") String> roles;

    @NotBlank
    @Size(min = 6, max = 40)
    private String password;
}
