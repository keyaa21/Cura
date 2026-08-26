package com.cura.cura.model;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class User
{

 private String id;
 private String fullName;
 private String email;
 private String passwordHash;
 private Role role;
 private String phoneNumber;
 private String specialization; //only when role is doctor
 private LocalDateTime createdAt = LocalDateTime.now();
 //when user clicks register the line stamps current date and time

}
