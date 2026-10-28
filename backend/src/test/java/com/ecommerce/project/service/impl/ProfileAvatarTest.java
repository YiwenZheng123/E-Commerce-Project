package com.ecommerce.project.service.impl;

import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.model.User;
import com.ecommerce.project.repositories.UserRepository;
import com.ecommerce.project.security.services.UserDetailsImpl;
import com.ecommerce.project.util.AuthUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProfileAvatarTest {
    @TempDir
    Path imageDirectory;
    private final AuthServiceImpl service = new AuthServiceImpl();
    private final AuthUtil authUtil = mock(AuthUtil.class);
    private final UserRepository repository = mock(UserRepository.class);
    private User user;

    @BeforeEach
    void setUp() {
        user = new User("buyer", "buyer@example.com", "password");
        user.setUserId(7L);
        when(authUtil.loggedInUser()).thenReturn(user);
        ReflectionTestUtils.setField(service, "authUtil", authUtil);
        ReflectionTestUtils.setField(service, "userRepository", repository);
        ReflectionTestUtils.setField(service, "imagePath", imageDirectory.toString());
        ReflectionTestUtils.setField(service, "imageBaseUrl", "http://localhost:8080/images");
    }

    @Test
    void uploadStoresImageForCurrentUserAndReturnsItOnProfileLoad() throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", bytes);
        var result = service.updateAvatar(new MockMultipartFile("image", "photo.png", "image/png", bytes.toByteArray()));
        assertTrue(Files.isRegularFile(imageDirectory.resolve(user.getAvatar())));
        assertTrue(result.getAvatarUrl().endsWith("/" + user.getAvatar()));
        verify(repository).save(user);
        var authentication = new UsernamePasswordAuthenticationToken(UserDetailsImpl.build(user), null);
        assertEquals(result.getAvatarUrl(), service.getCurrentUserDetails(authentication).getAvatarUrl());
    }

    @Test
    void rejectsInvalidOrOversizedFiles() {
        assertThrows(APIException.class, () -> service.updateAvatar(new MockMultipartFile("image", "photo.png", "image/png", "not an image".getBytes())));
        assertThrows(APIException.class, () -> service.updateAvatar(new MockMultipartFile("image", "photo.png", "image/png", new byte[1024 * 1024 + 1])));
        verify(repository, never()).save(any());
    }
}
