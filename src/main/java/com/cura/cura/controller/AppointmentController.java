package com.cura.cura.controller;

import com.cura.cura.dto.AppointmentRequest;
import com.cura.cura.dto.VitalsRequest;
import com.cura.cura.model.Appointment;
import com.cura.cura.model.AppointmentStatus;
import com.cura.cura.service.AppointmentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    public ResponseEntity<Appointment> createAppointment(@Valid @RequestBody AppointmentRequest request) {
        Appointment created = appointmentService.createAppointment(request);
        return ResponseEntity.ok(created);
    }

    @GetMapping
    public ResponseEntity<List<Appointment>> getAppointments(
            @RequestParam(required = false) String doctor,
            @RequestParam(required = false) String patient) {
        if (doctor != null && !doctor.isBlank()) {
            return ResponseEntity.ok(appointmentService.getByDoctor(doctor));
        }
        if (patient != null && !patient.isBlank()) {
            return ResponseEntity.ok(appointmentService.getByPatient(patient));
        }
        return ResponseEntity.ok(appointmentService.getAllAppointments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getAppointmentById(@PathVariable String id) {
        return appointmentService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Appointment> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        try {
            AppointmentStatus status = AppointmentStatus.valueOf(body.get("status").toUpperCase());
            return appointmentService.updateStatus(id, status)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException | NullPointerException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/vitals")
    public ResponseEntity<Appointment> recordVitals(
            @PathVariable String id,
            @Valid @RequestBody VitalsRequest vitalsRequest) {
        return appointmentService.recordVitals(id, vitalsRequest)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/follow-ups")
    public ResponseEntity<List<Appointment>> getFollowUps() {
        return ResponseEntity.ok(appointmentService.getFollowUpsDue());
    }

    @GetMapping("/pending-triage")
    public ResponseEntity<List<Appointment>> getPendingTriage() {
        return ResponseEntity.ok(appointmentService.getPendingTriage());
    }
}
