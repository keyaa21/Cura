package com.cura.cura.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class Appointment {
    private String id;
    private String patientId;
    private String patientName;
    private String patientPhone;
    private String patientEmail;

    private String doctorId;
    private String doctorName;
    private String specialization;

    private LocalDate date;
    private String dayOfWeek;
    private String timeSlot;
    private int allocatedDurationMinutes;

    // 3-Question Quiz
    private HealthIssueType healthIssue;
    private boolean firstTimePatient;
    private int groupSize;
    private String symptomsDescription;

    private AppointmentStatus status = AppointmentStatus.BOOKED;
    private Vitals vitals;

    private int followUpIntervalDays = 30;
    private LocalDate followUpDueDate;
    private boolean followUpNotificationSent = false;

    private String prescriptionId;
    private String prescriptionSummary;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime completedAt;

    public Appointment() {}

    public Appointment(String id, String patientId, String patientName, String patientPhone, String patientEmail,
                       String doctorId, String doctorName, String specialization, LocalDate date, String dayOfWeek,
                       String timeSlot, int allocatedDurationMinutes, HealthIssueType healthIssue, boolean firstTimePatient,
                       int groupSize, String symptomsDescription, AppointmentStatus status, Vitals vitals,
                       int followUpIntervalDays, LocalDate followUpDueDate, boolean followUpNotificationSent,
                       String prescriptionId, String prescriptionSummary, LocalDateTime createdAt, LocalDateTime completedAt) {
        this.id = id;
        this.patientId = patientId;
        this.patientName = patientName;
        this.patientPhone = patientPhone;
        this.patientEmail = patientEmail;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.specialization = specialization;
        this.date = date;
        this.dayOfWeek = dayOfWeek;
        this.timeSlot = timeSlot;
        this.allocatedDurationMinutes = allocatedDurationMinutes;
        this.healthIssue = healthIssue;
        this.firstTimePatient = firstTimePatient;
        this.groupSize = groupSize;
        this.symptomsDescription = symptomsDescription;
        this.status = status != null ? status : AppointmentStatus.BOOKED;
        this.vitals = vitals;
        this.followUpIntervalDays = followUpIntervalDays;
        this.followUpDueDate = followUpDueDate;
        this.followUpNotificationSent = followUpNotificationSent;
        this.prescriptionId = prescriptionId;
        this.prescriptionSummary = prescriptionSummary;
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
        this.completedAt = completedAt;
    }

    public static AppointmentBuilder builder() {
        return new AppointmentBuilder();
    }

    public static class AppointmentBuilder {
        private String id;
        private String patientId;
        private String patientName;
        private String patientPhone;
        private String patientEmail;
        private String doctorId;
        private String doctorName;
        private String specialization;
        private LocalDate date;
        private String dayOfWeek;
        private String timeSlot;
        private int allocatedDurationMinutes;
        private HealthIssueType healthIssue;
        private boolean firstTimePatient;
        private int groupSize;
        private String symptomsDescription;
        private AppointmentStatus status = AppointmentStatus.BOOKED;
        private Vitals vitals;
        private int followUpIntervalDays = 30;
        private LocalDate followUpDueDate;
        private boolean followUpNotificationSent = false;
        private String prescriptionId;
        private String prescriptionSummary;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime completedAt;

        public AppointmentBuilder id(String id) { this.id = id; return this; }
        public AppointmentBuilder patientId(String patientId) { this.patientId = patientId; return this; }
        public AppointmentBuilder patientName(String patientName) { this.patientName = patientName; return this; }
        public AppointmentBuilder patientPhone(String patientPhone) { this.patientPhone = patientPhone; return this; }
        public AppointmentBuilder patientEmail(String patientEmail) { this.patientEmail = patientEmail; return this; }
        public AppointmentBuilder doctorId(String doctorId) { this.doctorId = doctorId; return this; }
        public AppointmentBuilder doctorName(String doctorName) { this.doctorName = doctorName; return this; }
        public AppointmentBuilder specialization(String specialization) { this.specialization = specialization; return this; }
        public AppointmentBuilder date(LocalDate date) { this.date = date; return this; }
        public AppointmentBuilder dayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; return this; }
        public AppointmentBuilder timeSlot(String timeSlot) { this.timeSlot = timeSlot; return this; }
        public AppointmentBuilder allocatedDurationMinutes(int allocatedDurationMinutes) { this.allocatedDurationMinutes = allocatedDurationMinutes; return this; }
        public AppointmentBuilder healthIssue(HealthIssueType healthIssue) { this.healthIssue = healthIssue; return this; }
        public AppointmentBuilder firstTimePatient(boolean firstTimePatient) { this.firstTimePatient = firstTimePatient; return this; }
        public AppointmentBuilder groupSize(int groupSize) { this.groupSize = groupSize; return this; }
        public AppointmentBuilder symptomsDescription(String symptomsDescription) { this.symptomsDescription = symptomsDescription; return this; }
        public AppointmentBuilder status(AppointmentStatus status) { this.status = status; return this; }
        public AppointmentBuilder vitals(Vitals vitals) { this.vitals = vitals; return this; }
        public AppointmentBuilder followUpIntervalDays(int followUpIntervalDays) { this.followUpIntervalDays = followUpIntervalDays; return this; }
        public AppointmentBuilder followUpDueDate(LocalDate followUpDueDate) { this.followUpDueDate = followUpDueDate; return this; }
        public AppointmentBuilder followUpNotificationSent(boolean followUpNotificationSent) { this.followUpNotificationSent = followUpNotificationSent; return this; }
        public AppointmentBuilder prescriptionId(String prescriptionId) { this.prescriptionId = prescriptionId; return this; }
        public AppointmentBuilder prescriptionSummary(String prescriptionSummary) { this.prescriptionSummary = prescriptionSummary; return this; }
        public AppointmentBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public AppointmentBuilder completedAt(LocalDateTime completedAt) { this.completedAt = completedAt; return this; }

        public Appointment build() {
            return new Appointment(id, patientId, patientName, patientPhone, patientEmail, doctorId, doctorName, specialization,
                    date, dayOfWeek, timeSlot, allocatedDurationMinutes, healthIssue, firstTimePatient, groupSize, symptomsDescription,
                    status, vitals, followUpIntervalDays, followUpDueDate, followUpNotificationSent, prescriptionId, prescriptionSummary,
                    createdAt, completedAt);
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

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

    public int getAllocatedDurationMinutes() { return allocatedDurationMinutes; }
    public void setAllocatedDurationMinutes(int allocatedDurationMinutes) { this.allocatedDurationMinutes = allocatedDurationMinutes; }

    public HealthIssueType getHealthIssue() { return healthIssue; }
    public void setHealthIssue(HealthIssueType healthIssue) { this.healthIssue = healthIssue; }

    public boolean isFirstTimePatient() { return firstTimePatient; }
    public void setFirstTimePatient(boolean firstTimePatient) { this.firstTimePatient = firstTimePatient; }

    public int getGroupSize() { return groupSize; }
    public void setGroupSize(int groupSize) { this.groupSize = groupSize; }

    public String getSymptomsDescription() { return symptomsDescription; }
    public void setSymptomsDescription(String symptomsDescription) { this.symptomsDescription = symptomsDescription; }

    public AppointmentStatus getStatus() { return status; }
    public void setStatus(AppointmentStatus status) { this.status = status; }

    public Vitals getVitals() { return vitals; }
    public void setVitals(Vitals vitals) { this.vitals = vitals; }

    public int getFollowUpIntervalDays() { return followUpIntervalDays; }
    public void setFollowUpIntervalDays(int followUpIntervalDays) { this.followUpIntervalDays = followUpIntervalDays; }

    public LocalDate getFollowUpDueDate() { return followUpDueDate; }
    public void setFollowUpDueDate(LocalDate followUpDueDate) { this.followUpDueDate = followUpDueDate; }

    public boolean isFollowUpNotificationSent() { return followUpNotificationSent; }
    public void setFollowUpNotificationSent(boolean followUpNotificationSent) { this.followUpNotificationSent = followUpNotificationSent; }

    public String getPrescriptionId() { return prescriptionId; }
    public void setPrescriptionId(String prescriptionId) { this.prescriptionId = prescriptionId; }

    public String getPrescriptionSummary() { return prescriptionSummary; }
    public void setPrescriptionSummary(String prescriptionSummary) { this.prescriptionSummary = prescriptionSummary; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
