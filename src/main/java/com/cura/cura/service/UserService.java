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
        // Seed default clinic staff & sample users
        registerSeedUser("Dr. Ashwini Joshi", "ashwini.joshi@cura.clinic", "password123", Role.DOCTOR, "+91 9823012345", "Homoeopathy");
        registerSeedUser("Dr. Aarav Sharma", "aarav.sharma@cura.clinic", "password123", Role.DOCTOR, "+91 9823023456", "Allopathy");
        registerSeedUser("Dr. Priya Gupta", "priya.gupta@cura.clinic", "password123", Role.DOCTOR, "+91 9823034567", "Psychology");
        registerSeedUser("Sister Maya Patel", "assistant@cura.clinic", "password123", Role.ASSISTANT, "+91 9823045678", "Clinical Triage");
        registerSeedUser("Admin Cura", "admin@cura.clinic", "password123", Role.ADMIN, "+91 9823056789", "Administration");
        registerSeedUser("Keya Joshi", "keya@example.com", "password123", Role.PATIENT, "+91 9823067890", null);
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
