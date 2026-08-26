package com.cura.cura.dto;

import com.cura.cura.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class AuthRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Valid email is required")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    private String fullName;
    private Role role = Role.PATIENT;
    private String phoneNumber;
    private String specialization;

    public AuthRequest() {}

    public AuthRequest(String email, String password, String fullName, Role role, String phoneNumber, String specialization) {
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.role = role != null ? role : Role.PATIENT;
        this.phoneNumber = phoneNumber;
        this.specialization = specialization;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }
}
