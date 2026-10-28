package com.ecommerce.project.service;

import com.ecommerce.project.payload.AuthenticationResult;
import com.ecommerce.project.security.request.LoginRequest;
import com.ecommerce.project.security.request.SignupRequest;
import com.ecommerce.project.security.request.ProfileUpdateRequest;
import com.ecommerce.project.security.request.PasswordUpdateRequest;
import com.ecommerce.project.security.response.MessageResponse;
import com.ecommerce.project.security.response.UserInfoResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface AuthService {
    AuthenticationResult login(LoginRequest loginRequest);

    ResponseEntity<MessageResponse> register(@Valid SignupRequest signUpRequest);

    UserInfoResponse getCurrentUserDetails(Authentication authentication);

    ResponseCookie logoutUser();

    AuthenticationResult updateProfile(ProfileUpdateRequest profileUpdateRequest);

    UserInfoResponse updateAvatar(MultipartFile image) throws IOException;

    ResponseCookie updatePassword(PasswordUpdateRequest passwordUpdateRequest);

    Object getAllSellers(Pageable pageDetails);
}
