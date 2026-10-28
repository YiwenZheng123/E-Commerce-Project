package com.ecommerce.project.controller;

import com.ecommerce.project.config.AppConstants;
import com.ecommerce.project.payload.AuthenticationResult;
import com.ecommerce.project.security.request.LoginRequest;
import com.ecommerce.project.security.request.SignupRequest;
import com.ecommerce.project.security.request.ProfileUpdateRequest;
import com.ecommerce.project.security.request.PasswordUpdateRequest;
import com.ecommerce.project.security.response.MessageResponse;
import com.ecommerce.project.security.response.UserInfoResponse;
import com.ecommerce.project.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    private AuthService authService;

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        AuthenticationResult result = authService.login(loginRequest);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE,
                        result.getJwtCookie().toString())
                .body(result.getResponse());
    }
    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        return authService.register(signUpRequest);
    }
    @GetMapping("/username")
    public String currentUserName(Authentication authentication) {
        if(authentication != null)
            return authentication.getName();
        return "";
    }

    @GetMapping("/user")
    public ResponseEntity<UserInfoResponse> getUserDetails(Authentication authentication) {
        return ResponseEntity.ok().body(authService.getCurrentUserDetails(authentication));
    }

    @PostMapping("/signout")
    public ResponseEntity<?> signoutUser() {
        ResponseCookie cookie = authService.logoutUser();
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new MessageResponse("User signed out successfully!"));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserInfoResponse> updateProfile(@Valid @RequestBody ProfileUpdateRequest profileUpdateRequest) {
        AuthenticationResult result = authService.updateProfile(profileUpdateRequest);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, result.getJwtCookie().toString())
                .body(result.getResponse());
    }

    @PutMapping("/password")
    public ResponseEntity<MessageResponse> updatePassword(@Valid @RequestBody PasswordUpdateRequest passwordUpdateRequest) {
        ResponseCookie cookie = authService.updatePassword(passwordUpdateRequest);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new MessageResponse("Password updated successfully. Please sign in again."));
    }

    @PutMapping("/profile/avatar")
    public ResponseEntity<UserInfoResponse> updateAvatar(@RequestParam("image") MultipartFile image) throws IOException {
        return ResponseEntity.ok(authService.updateAvatar(image));
    }

    @GetMapping("/sellers")
    public ResponseEntity<?> getSellers(
            @RequestParam(name = "pageNumber", defaultValue = AppConstants.PAGE_NUMBER, required = false) Integer pageNumber
    ) {
        Sort sortByAndOrder = Sort.by(AppConstants.SORT_USER_BY).descending();
        Pageable pageDetails =  PageRequest.of(pageNumber, Integer.parseInt(AppConstants.PAGE_SIZE), sortByAndOrder);
        return ResponseEntity.ok(authService.getAllSellers(pageDetails));
    }
}
