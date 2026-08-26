package com.cura.cura.dto;

import jakarta.validation.constraints.NotBlank;

public class PrescriptionRequest {
    @NotBlank(message = "Appointment ID is required")
    private String appointmentId;
    private String patientId;
    private String patientName;
    private String doctorId;
    private String doctorName;
    private String specialization;

    @NotBlank(message = "Diagnosis is required")
    private String diagnosis;

    @NotBlank(message = "Remedies or medicines are required")
    private String remediesOrMedicines;

    private String dosageInstructions;
    private String dietaryLifestyleAdvice;
    private int followUpIntervalDays = 30;

    public PrescriptionRequest() {}

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
}
