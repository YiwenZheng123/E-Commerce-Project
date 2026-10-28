package com.ecommerce.project.service.impl;

import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.model.User;
import com.ecommerce.project.repositories.UserRepository;
import com.ecommerce.project.security.jwt.JwtUtils;
import com.ecommerce.project.security.request.PasswordUpdateRequest;
import com.ecommerce.project.security.request.ProfileUpdateRequest;
import com.ecommerce.project.security.services.UserDetailsImpl;
import com.ecommerce.project.util.AuthUtil;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProfileTest {
    private final AuthServiceImpl service = new AuthServiceImpl();
    private final UserRepository repository = mock(UserRepository.class);
    private final AuthUtil authUtil = mock(AuthUtil.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final JwtUtils jwtUtils = new JwtUtils();
    private User user;

    @BeforeEach
    void setUp() {
        user = new User("buyer", "buyer@example.com", encoder.encode("oldPassword"));
        user.setUserId(7L);
        when(authUtil.loggedInUser()).thenReturn(user);
        ReflectionTestUtils.setField(service, "authUtil", authUtil);
        ReflectionTestUtils.setField(service, "userRepository", repository);
        ReflectionTestUtils.setField(service, "encoder", encoder);
        ReflectionTestUtils.setField(service, "jwtUtils", jwtUtils);
        ReflectionTestUtils.setField(jwtUtils, "jwtSecret", Base64.getEncoder().encodeToString(new byte[32]));
        ReflectionTestUtils.setField(jwtUtils, "jwtExpirationMs", 60000);
        ReflectionTestUtils.setField(jwtUtils, "jwtCookie", "testJwt");
    }

    @Test
    void renamePreservesEmailAndReplacesToken() {
        String oldToken = jwtUtils.generateJwtCookie(UserDetailsImpl.build(user)).getValue();
        ProfileUpdateRequest request = new ProfileUpdateRequest();
        request.setUsername("newBuyer");
        var result = service.updateProfile(request);
        assertEquals("newBuyer", result.getResponse().getUsername());
        assertEquals("buyer@example.com", user.getEmail());
        assertEquals(7L, user.getUserId());
        assertFalse(jwtUtils.matchesUser(oldToken, UserDetailsImpl.build(user)));
        assertTrue(jwtUtils.matchesUser(result.getJwtCookie().getValue(), UserDetailsImpl.build(user)));
        assertNull(result.getResponse().getJwtToken());
        verify(repository).save(user);
    }

    @Test
    void duplicateUsernameDoesNotChangeUser() {
        when(repository.existsByUserName("taken")).thenReturn(true);
        ProfileUpdateRequest request = new ProfileUpdateRequest();
        request.setUsername("taken");
        assertThrows(APIException.class, () -> service.updateProfile(request));
        assertEquals("buyer", user.getUserName());
        verify(repository, never()).save(any());
    }

    @Test
    void passwordChangeInvalidatesOldTokensAndClearsCookie() {
        String token = jwtUtils.generateJwtCookie(UserDetailsImpl.build(user)).getValue();
        PasswordUpdateRequest request = new PasswordUpdateRequest();
        request.setCurrentPassword("oldPassword");
        request.setNewPassword("newPassword");
        request.setConfirmPassword("newPassword");
        var cookie = service.updatePassword(request);
        assertTrue(encoder.matches("newPassword", user.getPassword()));
        assertFalse(encoder.matches("oldPassword", user.getPassword()));
        assertFalse(jwtUtils.matchesUser(token, UserDetailsImpl.build(user)));
        assertEquals(0, cookie.getMaxAge().getSeconds());
        verify(repository).save(user);
    }

    @Test
    void invalidPasswordRequestsDoNotSave() {
        PasswordUpdateRequest request = new PasswordUpdateRequest();
        request.setCurrentPassword("wrongPassword");
        request.setNewPassword("newPassword");
        request.setConfirmPassword("newPassword");
        assertThrows(APIException.class, () -> service.updatePassword(request));
        request.setCurrentPassword("oldPassword");
        request.setConfirmPassword("differentPassword");
        assertThrows(APIException.class, () -> service.updatePassword(request));
        assertTrue(encoder.matches("oldPassword", user.getPassword()));
        verify(repository, never()).save(any());
    }

    @Test
    void tokenCannotAuthenticateAnotherUserWithReusedUsername() {
        String token = jwtUtils.generateJwtCookie(UserDetailsImpl.build(user)).getValue();
        user.setUserId(8L);
        assertFalse(jwtUtils.matchesUser(token, UserDetailsImpl.build(user)));
    }

    @Test
    void requestValidationRejectsBlankUsernameAndShortPassword() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            ProfileUpdateRequest profile = new ProfileUpdateRequest();
            profile.setUsername(" ");
            assertFalse(validator.validate(profile).isEmpty());
            PasswordUpdateRequest password = new PasswordUpdateRequest();
            password.setCurrentPassword("oldPassword");
            password.setNewPassword("123");
            password.setConfirmPassword("123");
            assertFalse(validator.validate(password).isEmpty());
        }
    }
}
