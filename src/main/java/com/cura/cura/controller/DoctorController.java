package com.cura.cura.controller;

import com.cura.cura.model.DoctorSchedule;
import com.cura.cura.model.User;
import com.cura.cura.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@CrossOrigin(origins = "*")
public class DoctorController {

    private final UserService userService;

    public DoctorController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllDoctors() {
        return ResponseEntity.ok(userService.getDoctors());
    }

    @GetMapping("/{doctorId}/schedule")
    public ResponseEntity<DoctorSchedule> getDoctorSchedule(
            @PathVariable String doctorId,
            @RequestParam(required = false) String date) {
        DoctorSchedule schedule = DoctorSchedule.builder()
                .id("sched-" + doctorId)
                .doctorId(doctorId)
                .doctorName(doctorId)
                .date(date != null ? LocalDate.parse(date) : LocalDate.now())
                .availableSlots(Arrays.asList(
                        "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM",
                        "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"
                ))
                .build();
        return ResponseEntity.ok(schedule);
    }
}
