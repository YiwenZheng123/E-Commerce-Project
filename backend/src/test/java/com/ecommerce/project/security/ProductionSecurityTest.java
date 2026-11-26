package com.ecommerce.project.security;

import com.ecommerce.project.controller.AuthController;
import com.ecommerce.project.model.AppRole;
import com.ecommerce.project.model.Role;
import com.ecommerce.project.repositories.RoleRepository;
import com.ecommerce.project.repositories.UserRepository;
import com.ecommerce.project.security.jwt.JwtUtils;
import com.ecommerce.project.security.services.UserDetailsImpl;
import com.ecommerce.project.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Base64;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ProductionSecurityTest {
    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void initializesRolesWithoutCreatingDemoAccounts() throws Exception {
        RoleRepository roles = mock(RoleRepository.class);
        UserRepository users = mock(UserRepository.class);

        new WebSecurityConfig().initData(roles, users, false).run();

        for (AppRole role : AppRole.values()) verify(roles).findByRoleName(role);
        verify(roles, times(3)).save(any(Role.class));
        verifyNoInteractions(users);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void loginSendsTokenOnlyInHttpOnlyCookie(boolean secure) throws Exception {
        JwtUtils jwt = new JwtUtils();
        ReflectionTestUtils.setField(jwt, "jwtSecret", Base64.getEncoder().encodeToString(new byte[32]));
        ReflectionTestUtils.setField(jwt, "jwtExpirationMs", 60000);
        ReflectionTestUtils.setField(jwt, "jwtCookie", "testJwt");
        ReflectionTestUtils.setField(jwt, "cookieSecure", secure);
        UserDetailsImpl principal = new UserDetailsImpl(7L, "buyer", "buyer@example.com", "unused",
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        AuthenticationManager manager = mock(AuthenticationManager.class);
        when(manager.authenticate(any())).thenReturn(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        AuthServiceImpl service = new AuthServiceImpl();
        ReflectionTestUtils.setField(service, "authenticationManager", manager);
        ReflectionTestUtils.setField(service, "jwtUtils", jwt);
        AuthController controller = new AuthController();
        ReflectionTestUtils.setField(controller, "authService", service);

        MockMvcBuilders.standaloneSetup(controller).build()
                .perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"buyer\",\"password\":\"testPassword\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("buyer"))
                .andExpect(jsonPath("$.jwtToken").value(nullValue()))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie", containsString("SameSite=Lax")))
                .andExpect(cookie().secure("testJwt", secure));

        var cleared = jwt.getCleanJwtCookie();
        assertEquals("/api", cleared.getPath());
        assertEquals(0, cleared.getMaxAge().getSeconds());
        assertTrue(cleared.isHttpOnly());
        assertEquals(secure, cleared.isSecure());
        assertEquals("Lax", cleared.getSameSite());
    }
}
