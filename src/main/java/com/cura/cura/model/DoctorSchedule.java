package com.cura.cura.model;

import java.time.LocalDate;
import java.util.List;

public class DoctorSchedule {
    private String id;
    private String doctorId;
    private String doctorName;
    private String specialization;
    private LocalDate date;
    private List<String> availableSlots;

    public DoctorSchedule() {}

    public DoctorSchedule(String id, String doctorId, String doctorName, String specialization, LocalDate date, List<String> availableSlots) {
        this.id = id;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.specialization = specialization;
        this.date = date;
        this.availableSlots = availableSlots;
    }

    public static DoctorScheduleBuilder builder() {
        return new DoctorScheduleBuilder();
    }

    public static class DoctorScheduleBuilder {
        private String id;
        private String doctorId;
        private String doctorName;
        private String specialization;
        private LocalDate date;
        private List<String> availableSlots;

        public DoctorScheduleBuilder id(String id) { this.id = id; return this; }
        public DoctorScheduleBuilder doctorId(String doctorId) { this.doctorId = doctorId; return this; }
        public DoctorScheduleBuilder doctorName(String doctorName) { this.doctorName = doctorName; return this; }
        public DoctorScheduleBuilder specialization(String specialization) { this.specialization = specialization; return this; }
        public DoctorScheduleBuilder date(LocalDate date) { this.date = date; return this; }
        public DoctorScheduleBuilder availableSlots(List<String> availableSlots) { this.availableSlots = availableSlots; return this; }

        public DoctorSchedule build() {
            return new DoctorSchedule(id, doctorId, doctorName, specialization, date, availableSlots);
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public List<String> getAvailableSlots() { return availableSlots; }
    public void setAvailableSlots(List<String> availableSlots) { this.availableSlots = availableSlots; }
}
