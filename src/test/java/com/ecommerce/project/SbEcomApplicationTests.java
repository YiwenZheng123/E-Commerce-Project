package com.ecommerce.project;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@SpringBootTest
class SbEcomApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void contextLoads() {
	}

	@Test
	void createCategoryReturnsCreated() throws Exception {
		mockMvc.perform(post("/api/public/categories")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"categoryName\":\"Electronics\"}"))
				.andExpect(status().isCreated())
				.andExpect(content().string("Category added successfully"));
	}

}
