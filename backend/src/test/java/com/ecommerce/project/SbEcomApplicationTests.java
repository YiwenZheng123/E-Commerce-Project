package com.ecommerce.project;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.UUID;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@SpringBootTest
class SbEcomApplicationTests {

	@Autowired
	private WebApplicationContext context;
	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc = MockMvcBuilders.webAppContextSetup(context)
				.apply(springSecurity())
				.build();
	}

	@Test
	void contextLoads() {
	}

	@Test
	void addressPreflightAllowsFrontendWithoutLogin() throws Exception {
		mockMvc.perform(options("/api/addresses")
				.header("Origin", "http://localhost:5173")
				.header("Access-Control-Request-Method", "POST")
				.header("Access-Control-Request-Headers", "content-type"))
				.andExpect(status().isOk())
				.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
				.andExpect(header().string("Access-Control-Allow-Credentials", "true"));
	}

	@Test
	void addressPostStillRequiresLogin() throws Exception {
		mockMvc.perform(post("/api/addresses")
				.header("Origin", "http://localhost:5173")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{}"))
				.andExpect(status().isUnauthorized())
				.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
	}

	@Test
	@WithMockUser(username = "admin", roles = "ADMIN")
	@Transactional
	void createCategoryReturnsCreated() throws Exception {
		String categoryName = "TestCategory-" + UUID.randomUUID();
		mockMvc.perform(post("/api/public/categories")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"categoryName\":\"" + categoryName + "\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.categoryName").value(categoryName))
				.andExpect(jsonPath("$.categoryId").isNumber());
	}

}
