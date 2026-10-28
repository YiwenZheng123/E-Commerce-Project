package com.ecommerce.project.service.impl;

import com.ecommerce.project.config.AppConstants;
import com.ecommerce.project.model.AppRole;
import com.ecommerce.project.model.Role;
import com.ecommerce.project.model.User;
import com.ecommerce.project.payload.AuthenticationResult;
import com.ecommerce.project.payload.UserDTO;
import com.ecommerce.project.payload.UserResponse;
import com.ecommerce.project.repositories.RoleRepository;
import com.ecommerce.project.repositories.UserRepository;
import com.ecommerce.project.security.jwt.JwtUtils;
import com.ecommerce.project.security.request.LoginRequest;
import com.ecommerce.project.security.request.SignupRequest;
import com.ecommerce.project.security.response.MessageResponse;
import com.ecommerce.project.security.response.UserInfoResponse;
import com.ecommerce.project.security.services.UserDetailsImpl;
import com.ecommerce.project.service.AuthService;
import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.security.request.ProfileUpdateRequest;
import com.ecommerce.project.security.request.PasswordUpdateRequest;
import com.ecommerce.project.util.AuthUtil;
import jakarta.transaction.Transactional;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {
    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    UserRepository userRepository;

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    ModelMapper modelMapper;

    @Autowired
    private AuthUtil authUtil;

    @Value("${project.image}")
    private String imagePath;

    @Value("${image.base.url}")
    private String imageBaseUrl;

    @Override
    public UserInfoResponse updateAvatar(MultipartFile image) throws IOException {
        if (image.isEmpty() || image.getSize() > 1024 * 1024) {
            throw new APIException("Please choose an image up to 1 MB");
        }
        BufferedImage avatar;
        try (ImageInputStream input = ImageIO.createImageInputStream(image.getInputStream())) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new APIException("Please choose a valid JPEG or PNG image");
            }
            ImageReader reader = readers.next();
            try {
                String format = reader.getFormatName();
                if (!format.equalsIgnoreCase("jpeg") && !format.equalsIgnoreCase("png")) {
                    throw new APIException("Please choose a valid JPEG or PNG image");
                }
                reader.setInput(input);
                if (reader.getWidth(0) > 4096 || reader.getHeight(0) > 4096) {
                    throw new APIException("Image dimensions must be at most 4096 x 4096 pixels");
                }
                avatar = reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw new APIException("Please choose a valid JPEG or PNG image");
        }
        User user = authUtil.loggedInUser();
        String fileName = UUID.randomUUID() + ".png";
        Files.createDirectories(Path.of(imagePath));
        ImageIO.write(avatar, "png", Path.of(imagePath, fileName).toFile());
        user.setAvatar(fileName);
        userRepository.save(user);
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());
        UserInfoResponse response = new UserInfoResponse(userDetails.getId(), userDetails.getUsername(), roles, userDetails.getEmail(), null);
        response.setAvatarUrl(imageBaseUrl.replaceAll("/+$", "") + "/" + fileName);
        return response;
    }

    @Override
    public AuthenticationResult updateProfile(ProfileUpdateRequest profileUpdateRequest) {
        User user = authUtil.loggedInUser();
        String username = profileUpdateRequest.getUsername();
        if (!username.equals(user.getUserName())) {
            if (userRepository.existsByUserName(username)) {
                throw new APIException("Username is already taken!");
            }
            user.setUserName(username);
            user.setAuthVersion(user.getAuthVersion() + 1);
            userRepository.save(user);
        }
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        ResponseCookie jwtCookie = jwtUtils.generateJwtCookie(userDetails);
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());
        UserInfoResponse response = new UserInfoResponse(userDetails.getId(),
                userDetails.getUsername(), roles, userDetails.getEmail(), null);
        if (userDetails.getAvatar() != null) {
            response.setAvatarUrl(imageBaseUrl.replaceAll("/+$", "") + "/" + userDetails.getAvatar());
        }
        return new AuthenticationResult(response, jwtCookie);
    }

    @Override
    public ResponseCookie updatePassword(PasswordUpdateRequest passwordUpdateRequest) {
        User user = authUtil.loggedInUser();
        if (!encoder.matches(passwordUpdateRequest.getCurrentPassword(), user.getPassword())) {
            throw new APIException("Current password is incorrect");
        }
        if (!passwordUpdateRequest.getNewPassword().equals(passwordUpdateRequest.getConfirmPassword())) {
            throw new APIException("Passwords do not match");
        }
        user.setPassword(encoder.encode(passwordUpdateRequest.getNewPassword()));
        user.setAuthVersion(user.getAuthVersion() + 1);
        userRepository.save(user);
        return jwtUtils.getCleanJwtCookie();
    }
    @Override
    public AuthenticationResult login(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager
                .authenticate(new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        ResponseCookie jwtCookie = jwtUtils.generateJwtCookie(userDetails);

        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        UserInfoResponse response = new UserInfoResponse(userDetails.getId(),
                userDetails.getUsername(), roles, userDetails.getEmail(), jwtCookie.toString());
        if (userDetails.getAvatar() != null) {
            response.setAvatarUrl(imageBaseUrl.replaceAll("/+$", "") + "/" + userDetails.getAvatar());
        }

        return new AuthenticationResult(response, jwtCookie);


    }

    @Override
    public ResponseEntity<MessageResponse> register(SignupRequest signUpRequest) {
        if (userRepository.existsByUserName(signUpRequest.getUsername())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Username is already taken!"));
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already in use!"));
        }

        // Create new user's account
        User user = new User(signUpRequest.getUsername(),
                signUpRequest.getEmail(),
                encoder.encode(signUpRequest.getPassword()));

        Set<String> strRoles = signUpRequest.getRoles();
        Set<Role> roles = new HashSet<>();

        if (strRoles == null) {
            Role userRole = roleRepository.findByRoleName(AppRole.ROLE_USER)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(userRole);
        } else {
            strRoles.forEach(role -> {
                switch (role) {
                    case "admin":
                        Role adminRole = roleRepository.findByRoleName(AppRole.ROLE_ADMIN)
                                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                        roles.add(adminRole);

                        break;
                    case "seller":
                        Role modRole = roleRepository.findByRoleName(AppRole.ROLE_SELLER)
                                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                        roles.add(modRole);

                        break;
                    default:
                        Role userRole = roleRepository.findByRoleName(AppRole.ROLE_USER)
                                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                        roles.add(userRole);
                }
            });
        }

        user.setRoles(roles);
        userRepository.save(user);
        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }

    @Override
    public UserInfoResponse getCurrentUserDetails(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        UserInfoResponse response = new UserInfoResponse(userDetails.getId(),userDetails.getUsername(), roles, userDetails.getEmail(), null);
        if (userDetails.getAvatar() != null) {
            response.setAvatarUrl(imageBaseUrl.replaceAll("/+$", "") + "/" + userDetails.getAvatar());
        }
        return response;
    }

    @Override
    public ResponseCookie logoutUser() {
        return jwtUtils.getCleanJwtCookie();
    }

    @Override
    public UserResponse getAllSellers(Pageable pageable) {
        Page<User> allUsers = userRepository.findByRoleName(AppRole.ROLE_SELLER, pageable);
        List<UserDTO> userDTOS = allUsers.getContent()
                .stream()
                .map(p -> modelMapper.map(p, UserDTO.class))
                .toList();
        UserResponse response = new UserResponse();
        response.setContent(userDTOS);
        response.setPageNumber(allUsers.getNumber());
        response.setPageSize(allUsers.getSize());
        response.setTotalElements(allUsers.getTotalElements());
        response.setTotalPages(allUsers.getTotalPages());
        response.setLastPage(allUsers.isLast());
        return response;
    }
}
