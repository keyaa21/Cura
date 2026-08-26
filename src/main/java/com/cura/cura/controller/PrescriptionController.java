package com.cura.cura.controller;

import com.cura.cura.dto.PrescriptionRequest;
import com.cura.cura.model.Prescription;
import com.cura.cura.service.PrescriptionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/prescriptions")
@CrossOrigin(origins = "*")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    public PrescriptionController(PrescriptionService prescriptionService) {
        this.prescriptionService = prescriptionService;
    }

    @PostMapping
    public ResponseEntity<Prescription> createPrescription(@Valid @RequestBody PrescriptionRequest request) {
        Prescription created = prescriptionService.createPrescription(request);
        return ResponseEntity.ok(created);
    }

    @GetMapping
    public ResponseEntity<List<Prescription>> getPrescriptions(
            @RequestParam(required = false) String patient,
            @RequestParam(required = false) String appointmentId) {
        if (appointmentId != null && !appointmentId.isBlank()) {
            return ResponseEntity.ok(prescriptionService.getByAppointmentId(appointmentId));
        }
        if (patient != null && !patient.isBlank()) {
            return ResponseEntity.ok(prescriptionService.getByPatientName(patient));
        }
        return ResponseEntity.ok(prescriptionService.getAllPrescriptions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Prescription> getPrescriptionById(@PathVariable String id) {
        return prescriptionService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
