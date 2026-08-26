package com.cura.cura.dto;

import com.cura.cura.model.HealthIssueType;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public class AppointmentRequest {
    @NotBlank(message = "Patient name is required")
    private String patientName;
    private String patientPhone;
    private String patientEmail;

    private String doctorId;
    @NotBlank(message = "Doctor selection is required")
    private String doctorName;
    private String specialization;

    private LocalDate date;
    private String dayOfWeek;
    @NotBlank(message = "Time slot is required")
    private String timeSlot;

    // 3-Question Quiz
    private HealthIssueType healthIssue = HealthIssueType.ACUTE;
    private boolean firstTimePatient = false;
    private int groupSize = 1;
    private String symptomsDescription;

    public AppointmentRequest() {}

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getPatientPhone() { return patientPhone; }
    public void setPatientPhone(String patientPhone) { this.patientPhone = patientPhone; }

    public String getPatientEmail() { return patientEmail; }
    public void setPatientEmail(String patientEmail) { this.patientEmail = patientEmail; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public String getTimeSlot() { return timeSlot; }
    public void setTimeSlot(String timeSlot) { this.timeSlot = timeSlot; }

    public HealthIssueType getHealthIssue() { return healthIssue; }
    public void setHealthIssue(HealthIssueType healthIssue) { this.healthIssue = healthIssue; }

    public boolean isFirstTimePatient() { return firstTimePatient; }
    public void setFirstTimePatient(boolean firstTimePatient) { this.firstTimePatient = firstTimePatient; }

    public int getGroupSize() { return groupSize; }
    public void setGroupSize(int groupSize) { this.groupSize = groupSize; }

    public String getSymptomsDescription() { return symptomsDescription; }
    public void setSymptomsDescription(String symptomsDescription) { this.symptomsDescription = symptomsDescription; }
}
