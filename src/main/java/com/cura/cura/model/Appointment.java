package com.cura.cura.model;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;


public class Appointment
{
@Id
private String Id;
private String patientId;
private String doctorId;
private LocalDate date;
private String timeSlot;

//booking quiz
private HealthIssueType healthIssue;
private int groupSize;
private boolean FirstTimePatient;

private AppointmentStatus status= AppointmentStatus.BOOKED;
private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime completedAt;
    // when doctor/admin marked it COMPLETED
    private int followUpIntervalDays = 30;
    // 15 or 30

    private boolean followUpNotificationSent = false;
}
