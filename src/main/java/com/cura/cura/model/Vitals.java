package com.cura.cura.model;

import java.time.LocalDateTime;

public class Vitals {
    private String bloodPressure;
    private Double temperature;
    private Integer pulseRate;
    private Double bloodOxygen;
    private String triageNotes;
    private String recordedBy;
    private LocalDateTime recordedAt = LocalDateTime.now();

    public Vitals() {}

    public Vitals(String bloodPressure, Double temperature, Integer pulseRate, Double bloodOxygen, String triageNotes, String recordedBy, LocalDateTime recordedAt) {
        this.bloodPressure = bloodPressure;
        this.temperature = temperature;
        this.pulseRate = pulseRate;
        this.bloodOxygen = bloodOxygen;
        this.triageNotes = triageNotes;
        this.recordedBy = recordedBy;
        this.recordedAt = recordedAt != null ? recordedAt : LocalDateTime.now();
    }

    public static VitalsBuilder builder() {
        return new VitalsBuilder();
    }

    public static class VitalsBuilder {
        private String bloodPressure;
        private Double temperature;
        private Integer pulseRate;
        private Double bloodOxygen;
        private String triageNotes;
        private String recordedBy;
        private LocalDateTime recordedAt = LocalDateTime.now();

        public VitalsBuilder bloodPressure(String bloodPressure) { this.bloodPressure = bloodPressure; return this; }
        public VitalsBuilder temperature(Double temperature) { this.temperature = temperature; return this; }
        public VitalsBuilder pulseRate(Integer pulseRate) { this.pulseRate = pulseRate; return this; }
        public VitalsBuilder bloodOxygen(Double bloodOxygen) { this.bloodOxygen = bloodOxygen; return this; }
        public VitalsBuilder triageNotes(String triageNotes) { this.triageNotes = triageNotes; return this; }
        public VitalsBuilder recordedBy(String recordedBy) { this.recordedBy = recordedBy; return this; }
        public VitalsBuilder recordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; return this; }

        public Vitals build() {
            return new Vitals(bloodPressure, temperature, pulseRate, bloodOxygen, triageNotes, recordedBy, recordedAt);
        }
    }

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

    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }
}
