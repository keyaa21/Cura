package com.cura.cura.service;

import com.cura.cura.dto.AuthRequest;
import com.cura.cura.dto.AuthResponse;
import com.cura.cura.model.Role;
import com.cura.cura.model.User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserService {

    private final Map<String, User> usersByEmail = new ConcurrentHashMap<>();
    private final Map<String, User> usersById = new ConcurrentHashMap<>();

    public UserService() {
        // Operational storage for registered clinic accounts
    }

    private void registerSeedUser(String name, String email, String password, Role role, String phone, String spec) {
        String id = UUID.randomUUID().toString();
        User user = User.builder()
                .id(id)
                .fullName(name)
                .email(email.toLowerCase().trim())
                .passwordHash(password) // For demo/starter project
                .role(role)
                .phoneNumber(phone)
                .specialization(spec)
                .createdAt(LocalDateTime.now())
                .build();
        usersByEmail.put(user.getEmail(), user);
        usersById.put(user.getId(), user);
    }

    public AuthResponse authenticate(AuthRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        User user = usersByEmail.get(email);

        if (user == null || !user.getPasswordHash().equals(request.getPassword())) {
            return AuthResponse.builder()
                    .success(false)
                    .message("Invalid email or password.")
                    .build();
        }

        return AuthResponse.builder()
                .success(true)
                .message("Login successful.")
                .token("mock-jwt-token-" + user.getId())
                .user(user)
                .build();
    }

    public AuthResponse register(AuthRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        if (usersByEmail.containsKey(email)) {
            return AuthResponse.builder()
                    .success(false)
                    .message("User with email " + email + " already exists.")
                    .build();
        }

        String id = UUID.randomUUID().toString();
        User user = User.builder()
                .id(id)
                .fullName(request.getFullName() != null && !request.getFullName().isBlank() ? request.getFullName() : "Patient")
                .email(email)
                .passwordHash(request.getPassword())
                .role(request.getRole() != null ? request.getRole() : Role.PATIENT)
                .phoneNumber(request.getPhoneNumber())
                .specialization(request.getSpecialization())
                .createdAt(LocalDateTime.now())
                .build();

        usersByEmail.put(user.getEmail(), user);
        usersById.put(user.getId(), user);

        return AuthResponse.builder()
                .success(true)
                .message("Registration successful.")
                .token("mock-jwt-token-" + user.getId())
                .user(user)
                .build();
    }

    public List<User> getDoctors() {
        List<User> doctors = new ArrayList<>();
        for (User u : usersById.values()) {
            if (u.getRole() == Role.DOCTOR) {
                doctors.add(u);
            }
        }
        return doctors;
    }

    public Optional<User> getUserById(String id) {
        return Optional.ofNullable(usersById.get(id));
    }
}
