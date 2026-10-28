package com.ecommerce.project.service.impl;

import com.ecommerce.project.exceptions.ResourceNotFoundException;
import com.ecommerce.project.model.Address;
import com.ecommerce.project.model.User;
import com.ecommerce.project.payload.AddressDTO;
import com.ecommerce.project.repositories.AddressRepository;
import com.ecommerce.project.repositories.UserRepository;
import com.ecommerce.project.util.AuthUtil;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProfileAddressTest {
    private final AddressServiceImpl service = new AddressServiceImpl();
    private final AddressRepository repository = mock(AddressRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final AuthUtil authUtil = mock(AuthUtil.class);
    private User owner;
    private Address address;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "addressRepository", repository);
        ReflectionTestUtils.setField(service, "userRepository", users);
        ReflectionTestUtils.setField(service, "authUtil", authUtil);
        ReflectionTestUtils.setField(service, "modelMapper", new ModelMapper());
        owner = new User();
        owner.setUserId(7L);
        address = new Address("Old Street", "Old Building", "Toronto", "ON", "Canada", "A1A1A1");
        address.setAddressId(12L);
        address.setUser(owner);
        owner.getAddresses().add(address);
        when(repository.findById(12L)).thenReturn(Optional.of(address));
        when(repository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void ownerCanUpdateAddressWithoutChangingOwnership() {
        when(authUtil.loggedInUserId()).thenReturn(7L);
        AddressDTO request = new AddressDTO(999L, "New Street", "New Building", "Ottawa", "ON", "Canada", "K1A0B1");
        AddressDTO result = service.updateAddress(12L, request);
        assertEquals(12L, result.getAddressId());
        assertEquals("New Street", result.getStreet());
        assertSame(owner, address.getUser());
        verify(repository).save(address);
    }

    @Test
    void otherUserCannotUpdateAddress() {
        when(authUtil.loggedInUserId()).thenReturn(8L);
        assertThrows(ResourceNotFoundException.class, () -> service.updateAddress(12L, new AddressDTO()));
        assertEquals("Old Street", address.getStreet());
        verify(repository, never()).save(any());
    }

    @Test
    void creationIgnoresSubmittedAddressId() {
        AddressDTO request = new AddressDTO(12L, "New Street", "New Building", "Ottawa", "ON", "Canada", "K1A0B1");
        service.createAddress(request, owner);
        verify(repository).save(argThat(saved -> saved.getAddressId() == null && saved.getUser() == owner));
    }

    @Test
    void blankAddressIsRejectedAtRequestBoundary() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertEquals(6, factory.getValidator().validate(new AddressDTO()).size());
        }
    }
}
