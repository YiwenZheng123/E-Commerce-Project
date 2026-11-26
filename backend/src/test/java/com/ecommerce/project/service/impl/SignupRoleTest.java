package com.ecommerce.project.service.impl;

import com.ecommerce.project.controller.AuthController;
import com.ecommerce.project.exceptions.MyGlobalExceptionHandler;
import com.ecommerce.project.model.AppRole;
import com.ecommerce.project.model.Role;
import com.ecommerce.project.model.User;
import com.ecommerce.project.repositories.RoleRepository;
import com.ecommerce.project.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SignupRoleTest {
    private final UserRepository users = mock(UserRepository.class);
    private final RoleRepository roles = mock(RoleRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        AuthServiceImpl service = new AuthServiceImpl();
        ReflectionTestUtils.setField(service, "userRepository", users);
        ReflectionTestUtils.setField(service, "roleRepository", roles);
        ReflectionTestUtils.setField(service, "encoder", encoder);
        AuthController controller = new AuthController();
        ReflectionTestUtils.setField(controller, "authService", service);
        mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new MyGlobalExceptionHandler()).build();
    }

    @ParameterizedTest
    @CsvSource({"user,ROLE_USER", "seller,ROLE_SELLER", "omitted,ROLE_USER", "null,ROLE_USER"})
    void assignsOnlyTheSelectedPublicRole(String input, AppRole expected) throws Exception {
        when(roles.findByRoleName(expected)).thenReturn(Optional.of(new Role(expected)));
        String roleField = input.equals("omitted") ? "" : input.equals("null")
                ? ",\"roles\":null" : ",\"roles\":[\"" + input + "\"]";
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"newuser\",\"email\":\"new@example.com\",\"password\":\"secret123\"" + roleField + "}"))
                .andExpect(status().isOk());
        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertEquals(1, saved.getValue().getRoles().size());
        assertEquals(expected, saved.getValue().getRoles().iterator().next().getRoleName());
        assertTrue(encoder.matches("secret123", saved.getValue().getPassword()));
        verify(roles, never()).findByRoleName(AppRole.ROLE_ADMIN);
    }

    @ParameterizedTest
    @ValueSource(strings = {"[\"admin\"]", "[\"ROLE_ADMIN\"]", "[\"unknown\"]", "[]", "[null]",
            "[\"user\",\"seller\"]", "[\"seller\",\"admin\"]", "[\"\"]", "[\"Seller\"]"})
    void rejectsInvalidRolesBeforeAnyDatabaseWrite(String input) throws Exception {
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"newuser\",\"email\":\"new@example.com\",\"password\":\"secret123\",\"roles\":" + input + "}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(users, roles);
    }
}
