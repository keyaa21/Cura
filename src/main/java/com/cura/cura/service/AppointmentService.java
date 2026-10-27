package com.cura.cura.service;

import com.cura.cura.dto.AppointmentRequest;
import com.cura.cura.dto.VitalsRequest;
import com.cura.cura.model.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class AppointmentService {

    private final Map<String, Appointment> appointmentsById = new ConcurrentHashMap<>();

    public AppointmentService() {
        // Operational in-memory storage for appointments
    }

    private void seedInitialAppointments() {
        createSample(
                "Keya Joshi",
                "+91 9823067890",
                "Dr. Ashwini Joshi",
                "Homoeopathy",
                "Monday",
                "09:00 AM",
                HealthIssueType.CHRONIC,
                true, // First time
                1,
                "Persistent migraine and digestive discomfort",
                AppointmentStatus.BOOKED,
                null,
                30
        );

        createSample(
                "Ananya Kumar",
                "+91 9823011223",
                "Dr. Priya Gupta",
                "Psychology",
                "Wednesday",
                "11:00 AM",
                HealthIssueType.PSYCHOLOGICAL,
                false,
                1,
                "Anxiety and stress management follow-up",
                AppointmentStatus.COMPLETED,
                Vitals.builder().bloodPressure("118/78").temperature(98.4).pulseRate(76).bloodOxygen(99.0).triageNotes("Normal vitals, calm").build(),
                15
        );

        createSample(
                "Kartik Swami",
                "+91 9823099887",
                "Dr. Aarav Sharma",
                "Allopathy",
                "Friday",
                "05:00 PM",
                HealthIssueType.ACUTE,
                false,
                2, // 2 people
                "Seasonal flu and throat irritation for 2 family members",
                AppointmentStatus.ONGOING,
                Vitals.builder().bloodPressure("124/82").temperature(100.2).pulseRate(88).bloodOxygen(97.5).triageNotes("Mild fever detected").build(),
                15
        );
    }

    private void createSample(
            String patient, String phone, String doctor, String spec,
            String day, String time, HealthIssueType issue, boolean firstTime,
            int groupSize, String symptoms, AppointmentStatus status, Vitals vitals, int followUpDays) {

        String id = String.valueOf(System.currentTimeMillis() + new Random().nextInt(1000));
        int duration = calculateDuration(firstTime, issue, groupSize);

        LocalDate appDate = LocalDate.now();
        LocalDateTime completedTime = (status == AppointmentStatus.COMPLETED) ? LocalDateTime.now().minusDays(10) : null;
        LocalDate followUpDate = (completedTime != null) ? completedTime.toLocalDate().plusDays(followUpDays) : null;

        Appointment apt = Appointment.builder()
                .id(id)
                .patientId("pat-" + Math.abs(patient.hashCode()))
                .patientName(patient)
                .patientPhone(phone)
                .doctorId("doc-" + Math.abs(doctor.hashCode()))
                .doctorName(doctor)
                .specialization(spec)
                .date(appDate)
                .dayOfWeek(day)
                .timeSlot(time)
                .allocatedDurationMinutes(duration)
                .healthIssue(issue)
                .firstTimePatient(firstTime)
                .groupSize(Math.max(1, groupSize))
                .symptomsDescription(symptoms)
                .status(status)
                .vitals(vitals)
                .followUpIntervalDays(followUpDays)
                .followUpDueDate(followUpDate)
                .followUpNotificationSent(false)
                .createdAt(LocalDateTime.now().minusDays(2))
                .completedAt(completedTime)
                .build();

        appointmentsById.put(apt.getId(), apt);
    }

    /**
     * Calculates appointment duration based on 3-Question Quiz:
     * 1) First-time patient -> Base 60 minutes
     *    Returning patient -> ACUTE: 30m, CHRONIC: 45m, PSYCHOLOGICAL: 50m
     * 2) Group size -> +15 minutes for each additional person
     */
    public int calculateDuration(boolean isFirstTime, HealthIssueType issueType, int groupSize) {
        int baseMinutes;
        if (isFirstTime) {
            baseMinutes = 60; // 1 full hour for comprehensive constitutional/initial intake
        } else {
            if (issueType == null) issueType = HealthIssueType.ACUTE;
            baseMinutes = switch (issueType) {
                case ACUTE -> 30;
                case CHRONIC -> 45;
                case PSYCHOLOGICAL -> 50;
            };
        }

        int groupBonus = Math.max(0, groupSize - 1) * 15;
        return baseMinutes + groupBonus;
    }

    public Appointment createAppointment(AppointmentRequest request) {
        String id = String.valueOf(System.currentTimeMillis());
        int duration = calculateDuration(request.isFirstTimePatient(), request.getHealthIssue(), request.getGroupSize());

        Appointment appointment = Appointment.builder()
                .id(id)
                .patientId(UUID.randomUUID().toString())
                .patientName(request.getPatientName())
                .patientPhone(request.getPatientPhone())
                .patientEmail(request.getPatientEmail())
                .doctorId(request.getDoctorId() != null ? request.getDoctorId() : "doc-" + Math.abs(request.getDoctorName().hashCode()))
                .doctorName(request.getDoctorName())
                .specialization(request.getSpecialization())
                .date(request.getDate() != null ? request.getDate() : LocalDate.now())
                .dayOfWeek(request.getDayOfWeek() != null ? request.getDayOfWeek() : "Today")
                .timeSlot(request.getTimeSlot())
                .allocatedDurationMinutes(duration)
                .healthIssue(request.getHealthIssue())
                .firstTimePatient(request.isFirstTimePatient())
                .groupSize(Math.max(1, request.getGroupSize()))
                .symptomsDescription(request.getSymptomsDescription())
                .status(AppointmentStatus.BOOKED)
                .followUpIntervalDays(30)
                .createdAt(LocalDateTime.now())
                .build();

        appointmentsById.put(id, appointment);
        return appointment;
    }

    public List<Appointment> getAllAppointments() {
        return appointmentsById.values().stream()
                .sorted(Comparator.comparing(Appointment::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public Optional<Appointment> getById(String id) {
        return Optional.ofNullable(appointmentsById.get(id));
    }

    public List<Appointment> getByDoctor(String doctorQuery) {
        if (doctorQuery == null || doctorQuery.isBlank()) return getAllAppointments();
        String q = doctorQuery.toLowerCase();
        return appointmentsById.values().stream()
                .filter(a -> a.getDoctorName() != null && a.getDoctorName().toLowerCase().contains(q))
                .sorted(Comparator.comparing(Appointment::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public List<Appointment> getByPatient(String patientQuery) {
        if (patientQuery == null || patientQuery.isBlank()) return getAllAppointments();
        String q = patientQuery.toLowerCase();
        return appointmentsById.values().stream()
                .filter(a -> a.getPatientName() != null && a.getPatientName().toLowerCase().contains(q))
                .sorted(Comparator.comparing(Appointment::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public Optional<Appointment> updateStatus(String id, AppointmentStatus newStatus) {
        Appointment apt = appointmentsById.get(id);
        if (apt != null) {
            apt.setStatus(newStatus);
            if (newStatus == AppointmentStatus.COMPLETED && apt.getCompletedAt() == null) {
                apt.setCompletedAt(LocalDateTime.now());
                apt.setFollowUpDueDate(LocalDate.now().plusDays(apt.getFollowUpIntervalDays()));
            }
            return Optional.of(apt);
        }
        return Optional.empty();
    }

    public Optional<Appointment> recordVitals(String id, VitalsRequest vitalsReq) {
        Appointment apt = appointmentsById.get(id);
        if (apt != null) {
            Vitals vitals = Vitals.builder()
                    .bloodPressure(vitalsReq.getBloodPressure())
                    .temperature(vitalsReq.getTemperature())
                    .pulseRate(vitalsReq.getPulseRate())
                    .bloodOxygen(vitalsReq.getBloodOxygen())
                    .triageNotes(vitalsReq.getTriageNotes())
                    .recordedBy(vitalsReq.getRecordedBy())
                    .recordedAt(LocalDateTime.now())
                    .build();

            apt.setVitals(vitals);
            apt.setStatus(AppointmentStatus.ONGOING); // Ready for doctor consultation
            return Optional.of(apt);
        }
        return Optional.empty();
    }

    public List<Appointment> getFollowUpsDue() {
        LocalDate today = LocalDate.now();
        return appointmentsById.values().stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED && a.getFollowUpDueDate() != null)
                .sorted(Comparator.comparing(Appointment::getFollowUpDueDate))
                .collect(Collectors.toList());
    }

    public List<Appointment> getPendingTriage() {
        return appointmentsById.values().stream()
                .filter(a -> a.getStatus() == AppointmentStatus.BOOKED && a.getVitals() == null)
                .sorted(Comparator.comparing(Appointment::getCreatedAt))
                .collect(Collectors.toList());
    }
}
