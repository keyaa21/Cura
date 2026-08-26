package com.cura.cura.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class Prescription {
    private String id;
    private String appointmentId;
    private String patientId;
    private String patientName;
    private String doctorId;
    private String doctorName;
    private String specialization;

    private LocalDate date;
    private String diagnosis;
    private String remediesOrMedicines;
    private String dosageInstructions;
    private String dietaryLifestyleAdvice;
    private int followUpIntervalDays;

    private LocalDateTime createdAt = LocalDateTime.now();

    public Prescription() {}

    public Prescription(String id, String appointmentId, String patientId, String patientName, String doctorId,
                        String doctorName, String specialization, LocalDate date, String diagnosis,
                        String remediesOrMedicines, String dosageInstructions, String dietaryLifestyleAdvice,
                        int followUpIntervalDays, LocalDateTime createdAt) {
        this.id = id;
        this.appointmentId = appointmentId;
        this.patientId = patientId;
        this.patientName = patientName;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.specialization = specialization;
        this.date = date;
        this.diagnosis = diagnosis;
        this.remediesOrMedicines = remediesOrMedicines;
        this.dosageInstructions = dosageInstructions;
        this.dietaryLifestyleAdvice = dietaryLifestyleAdvice;
        this.followUpIntervalDays = followUpIntervalDays;
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
    }

    public static PrescriptionBuilder builder() {
        return new PrescriptionBuilder();
    }

    public static class PrescriptionBuilder {
        private String id;
        private String appointmentId;
        private String patientId;
        private String patientName;
        private String doctorId;
        private String doctorName;
        private String specialization;
        private LocalDate date;
        private String diagnosis;
        private String remediesOrMedicines;
        private String dosageInstructions;
        private String dietaryLifestyleAdvice;
        private int followUpIntervalDays;
        private LocalDateTime createdAt = LocalDateTime.now();

        public PrescriptionBuilder id(String id) { this.id = id; return this; }
        public PrescriptionBuilder appointmentId(String appointmentId) { this.appointmentId = appointmentId; return this; }
        public PrescriptionBuilder patientId(String patientId) { this.patientId = patientId; return this; }
        public PrescriptionBuilder patientName(String patientName) { this.patientName = patientName; return this; }
        public PrescriptionBuilder doctorId(String doctorId) { this.doctorId = doctorId; return this; }
        public PrescriptionBuilder doctorName(String doctorName) { this.doctorName = doctorName; return this; }
        public PrescriptionBuilder specialization(String specialization) { this.specialization = specialization; return this; }
        public PrescriptionBuilder date(LocalDate date) { this.date = date; return this; }
        public PrescriptionBuilder diagnosis(String diagnosis) { this.diagnosis = diagnosis; return this; }
        public PrescriptionBuilder remediesOrMedicines(String remediesOrMedicines) { this.remediesOrMedicines = remediesOrMedicines; return this; }
        public PrescriptionBuilder dosageInstructions(String dosageInstructions) { this.dosageInstructions = dosageInstructions; return this; }
        public PrescriptionBuilder dietaryLifestyleAdvice(String dietaryLifestyleAdvice) { this.dietaryLifestyleAdvice = dietaryLifestyleAdvice; return this; }
        public PrescriptionBuilder followUpIntervalDays(int followUpIntervalDays) { this.followUpIntervalDays = followUpIntervalDays; return this; }
        public PrescriptionBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public Prescription build() {
            return new Prescription(id, appointmentId, patientId, patientName, doctorId, doctorName, specialization,
                    date, diagnosis, remediesOrMedicines, dosageInstructions, dietaryLifestyleAdvice, followUpIntervalDays, createdAt);
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAppointmentId() { return appointmentId; }
    public void setAppointmentId(String appointmentId) { this.appointmentId = appointmentId; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getRemediesOrMedicines() { return remediesOrMedicines; }
    public void setRemediesOrMedicines(String remediesOrMedicines) { this.remediesOrMedicines = remediesOrMedicines; }

    public String getDosageInstructions() { return dosageInstructions; }
    public void setDosageInstructions(String dosageInstructions) { this.dosageInstructions = dosageInstructions; }

    public String getDietaryLifestyleAdvice() { return dietaryLifestyleAdvice; }
    public void setDietaryLifestyleAdvice(String dietaryLifestyleAdvice) { this.dietaryLifestyleAdvice = dietaryLifestyleAdvice; }

    public int getFollowUpIntervalDays() { return followUpIntervalDays; }
    public void setFollowUpIntervalDays(int followUpIntervalDays) { this.followUpIntervalDays = followUpIntervalDays; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
