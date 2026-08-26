package com.cura.cura.dto;

import jakarta.validation.constraints.NotBlank;

public class VitalsRequest {
    @NotBlank(message = "Blood pressure is required")
    private String bloodPressure;
    private Double temperature;
    private Integer pulseRate;
    private Double bloodOxygen;
    private String triageNotes;
    private String recordedBy;

    public VitalsRequest() {}

    public String getBloodPressure() { return bloodPressure; }
    public void setBloodPressure(String bloodPressure) { this.bloodPressure = bloodPressure; }

    public Double getTemperature() { return temperature; }
    public void setTemperature(Double temperature) { this.temperature = temperature; }

    public Integer getPulseRate() { return pulseRate; }
    public void setPulseRate(Integer pulseRate) { this.pulseRate = pulseRate; }

    public Double getBloodOxygen() { return bloodOxygen; }
    public void setBloodOxygen(Double bloodOxygen) { this.bloodOxygen = bloodOxygen; }

    public String getTriageNotes() { return triageNotes; }
    public void setTriageNotes(String triageNotes) { this.triageNotes = triageNotes; }

    public String getRecordedBy() { return recordedBy; }
    public void setRecordedBy(String recordedBy) { this.recordedBy = recordedBy; }
}
