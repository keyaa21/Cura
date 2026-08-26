package com.cura.cura.service;

import com.cura.cura.dto.AnalyticsSummary;
import com.cura.cura.model.Appointment;
import com.cura.cura.model.AppointmentStatus;
import com.cura.cura.model.HealthIssueType;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final AppointmentService appointmentService;

    public AnalyticsService(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    public AnalyticsSummary getSummary() {
        List<Appointment> all = appointmentService.getAllAppointments();
        LocalDate today = LocalDate.now();

        long total = all.size();
        long todayCount = all.stream()
                .filter(a -> a.getDate() != null && a.getDate().isEqual(today))
                .count();

        long pendingTriage = all.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.BOOKED && a.getVitals() == null)
                .count();

        long readyForDoctor = all.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.ONGOING || (a.getVitals() != null && a.getStatus() != AppointmentStatus.COMPLETED))
                .count();

        long completed = all.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED)
                .count();

        long followUpsDue = appointmentService.getFollowUpsDue().size();

        long acute = all.stream().filter(a -> a.getHealthIssue() == HealthIssueType.ACUTE).count();
        long chronic = all.stream().filter(a -> a.getHealthIssue() == HealthIssueType.CHRONIC).count();
        long psychological = all.stream().filter(a -> a.getHealthIssue() == HealthIssueType.PSYCHOLOGICAL).count();

        Map<String, Long> specCounts = all.stream()
                .filter(a -> a.getSpecialization() != null && !a.getSpecialization().isBlank())
                .collect(Collectors.groupingBy(Appointment::getSpecialization, Collectors.counting()));

        return AnalyticsSummary.builder()
                .totalAppointments(total)
                .todayAppointments(todayCount)
                .pendingTriageCount(pendingTriage)
                .readyForDoctorCount(readyForDoctor)
                .completedAppointments(completed)
                .followUpsDueCount(followUpsDue)
                .acuteCount(acute)
                .chronicCount(chronic)
                .psychologicalCount(psychological)
                .specializationCounts(specCounts)
                .build();
    }
}
