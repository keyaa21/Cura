package com.cura.cura.dto;

import com.cura.cura.model.User;

public class AuthResponse {
    private boolean success;
    private String message;
    private String token;
    private User user;

    public AuthResponse() {}

    public AuthResponse(boolean success, String message, String token, User user) {
        this.success = success;
        this.message = message;
        this.token = token;
        this.user = user;
    }

    public static AuthResponseBuilder builder() {
        return new AuthResponseBuilder();
    }

    public static class AuthResponseBuilder {
        private boolean success;
        private String message;
        private String token;
        private User user;

        public AuthResponseBuilder success(boolean success) { this.success = success; return this; }
        public AuthResponseBuilder message(String message) { this.message = message; return this; }
        public AuthResponseBuilder token(String token) { this.token = token; return this; }
        public AuthResponseBuilder user(User user) { this.user = user; return this; }

        public AuthResponse build() {
            return new AuthResponse(success, message, token, user);
        }
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
