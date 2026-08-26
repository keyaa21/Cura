package com.cura.cura.service;

import com.cura.cura.dto.PrescriptionRequest;
import com.cura.cura.model.Appointment;
import com.cura.cura.model.AppointmentStatus;
import com.cura.cura.model.Prescription;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class PrescriptionService {

    private final Map<String, Prescription> prescriptionsById = new ConcurrentHashMap<>();
    private final AppointmentService appointmentService;

    public PrescriptionService(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
        seedPrescriptions();
    }

    private void seedPrescriptions() {
        Prescription p1 = Prescription.builder()
                .id("rx-" + System.currentTimeMillis())
                .appointmentId("102")
                .patientId("pat-102")
                .patientName("Ananya Kumar")
                .doctorId("doc-priya")
                .doctorName("Dr. Priya Gupta")
                .specialization("Psychology")
                .date(LocalDate.now().minusDays(10))
                .diagnosis("Moderate Generalized Anxiety & Work Stress")
                .remediesOrMedicines("Cognitive Reframing exercises; Chamomilla 30C (2 drops evening)")
                .dosageInstructions("Daily 15 min progressive muscle relaxation; journal triggers")
                .dietaryLifestyleAdvice("Reduce caffeine after 4 PM; regular sleep schedule")
                .followUpIntervalDays(15)
                .createdAt(LocalDateTime.now().minusDays(10))
                .build();
        prescriptionsById.put(p1.getId(), p1);
    }

    public Prescription createPrescription(PrescriptionRequest request) {
        String rxId = "rx-" + UUID.randomUUID().toString().substring(0, 8);

        Prescription rx = Prescription.builder()
                .id(rxId)
                .appointmentId(request.getAppointmentId())
                .patientId(request.getPatientId())
                .patientName(request.getPatientName())
                .doctorId(request.getDoctorId())
                .doctorName(request.getDoctorName())
                .specialization(request.getSpecialization())
                .date(LocalDate.now())
                .diagnosis(request.getDiagnosis())
                .remediesOrMedicines(request.getRemediesOrMedicines())
                .dosageInstructions(request.getDosageInstructions())
                .dietaryLifestyleAdvice(request.getDietaryLifestyleAdvice())
                .followUpIntervalDays(request.getFollowUpIntervalDays() > 0 ? request.getFollowUpIntervalDays() : 30)
                .createdAt(LocalDateTime.now())
                .build();

        prescriptionsById.put(rxId, rx);

        // Update the parent appointment
        if (request.getAppointmentId() != null) {
            Optional<Appointment> optApt = appointmentService.getById(request.getAppointmentId());
            if (optApt.isPresent()) {
                Appointment apt = optApt.get();
                apt.setPrescriptionId(rxId);
                apt.setPrescriptionSummary(rx.getDiagnosis() + " - " + rx.getRemediesOrMedicines());
                apt.setStatus(AppointmentStatus.COMPLETED);
                apt.setCompletedAt(LocalDateTime.now());
                apt.setFollowUpIntervalDays(rx.getFollowUpIntervalDays());
                apt.setFollowUpDueDate(LocalDate.now().plusDays(rx.getFollowUpIntervalDays()));
            }
        }

        return rx;
    }

    public List<Prescription> getAllPrescriptions() {
        return prescriptionsById.values().stream()
                .sorted(Comparator.comparing(Prescription::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public Optional<Prescription> getById(String id) {
        return Optional.ofNullable(prescriptionsById.get(id));
    }

    public List<Prescription> getByPatientName(String patientName) {
        if (patientName == null || patientName.isBlank()) return getAllPrescriptions();
        String q = patientName.toLowerCase();
        return prescriptionsById.values().stream()
                .filter(p -> p.getPatientName() != null && p.getPatientName().toLowerCase().contains(q))
                .sorted(Comparator.comparing(Prescription::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public List<Prescription> getByAppointmentId(String appointmentId) {
        return prescriptionsById.values().stream()
                .filter(p -> appointmentId.equals(p.getAppointmentId()))
                .collect(Collectors.toList());
    }
}
