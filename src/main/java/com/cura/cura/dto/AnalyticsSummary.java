package com.cura.cura.dto;

import java.util.Map;

public class AnalyticsSummary {
    private long totalAppointments;
    private long todayAppointments;
    private long pendingTriageCount;
    private long readyForDoctorCount;
    private long completedAppointments;
    private long followUpsDueCount;

    // Issue breakdown
    private long acuteCount;
    private long chronicCount;
    private long psychologicalCount;

    // Specialization breakdown
    private Map<String, Long> specializationCounts;

    public AnalyticsSummary() {}

    public AnalyticsSummary(long totalAppointments, long todayAppointments, long pendingTriageCount,
                            long readyForDoctorCount, long completedAppointments, long followUpsDueCount,
                            long acuteCount, long chronicCount, long psychologicalCount,
                            Map<String, Long> specializationCounts) {
        this.totalAppointments = totalAppointments;
        this.todayAppointments = todayAppointments;
        this.pendingTriageCount = pendingTriageCount;
        this.readyForDoctorCount = readyForDoctorCount;
        this.completedAppointments = completedAppointments;
        this.followUpsDueCount = followUpsDueCount;
        this.acuteCount = acuteCount;
        this.chronicCount = chronicCount;
        this.psychologicalCount = psychologicalCount;
        this.specializationCounts = specializationCounts;
    }

    public static AnalyticsSummaryBuilder builder() {
        return new AnalyticsSummaryBuilder();
    }

    public static class AnalyticsSummaryBuilder {
        private long totalAppointments;
        private long todayAppointments;
        private long pendingTriageCount;
        private long readyForDoctorCount;
        private long completedAppointments;
        private long followUpsDueCount;
        private long acuteCount;
        private long chronicCount;
        private long psychologicalCount;
        private Map<String, Long> specializationCounts;

        public AnalyticsSummaryBuilder totalAppointments(long totalAppointments) { this.totalAppointments = totalAppointments; return this; }
        public AnalyticsSummaryBuilder todayAppointments(long todayAppointments) { this.todayAppointments = todayAppointments; return this; }
        public AnalyticsSummaryBuilder pendingTriageCount(long pendingTriageCount) { this.pendingTriageCount = pendingTriageCount; return this; }
        public AnalyticsSummaryBuilder readyForDoctorCount(long readyForDoctorCount) { this.readyForDoctorCount = readyForDoctorCount; return this; }
        public AnalyticsSummaryBuilder completedAppointments(long completedAppointments) { this.completedAppointments = completedAppointments; return this; }
        public AnalyticsSummaryBuilder followUpsDueCount(long followUpsDueCount) { this.followUpsDueCount = followUpsDueCount; return this; }
        public AnalyticsSummaryBuilder acuteCount(long acuteCount) { this.acuteCount = acuteCount; return this; }
        public AnalyticsSummaryBuilder chronicCount(long chronicCount) { this.chronicCount = chronicCount; return this; }
        public AnalyticsSummaryBuilder psychologicalCount(long psychologicalCount) { this.psychologicalCount = psychologicalCount; return this; }
        public AnalyticsSummaryBuilder specializationCounts(Map<String, Long> specializationCounts) { this.specializationCounts = specializationCounts; return this; }

        public AnalyticsSummary build() {
            return new AnalyticsSummary(totalAppointments, todayAppointments, pendingTriageCount, readyForDoctorCount,
                    completedAppointments, followUpsDueCount, acuteCount, chronicCount, psychologicalCount, specializationCounts);
        }
    }

    public long getTotalAppointments() { return totalAppointments; }
    public void setTotalAppointments(long totalAppointments) { this.totalAppointments = totalAppointments; }

    public long getTodayAppointments() { return todayAppointments; }
    public void setTodayAppointments(long todayAppointments) { this.todayAppointments = todayAppointments; }

    public long getPendingTriageCount() { return pendingTriageCount; }
    public void setPendingTriageCount(long pendingTriageCount) { this.pendingTriageCount = pendingTriageCount; }

    public long getReadyForDoctorCount() { return readyForDoctorCount; }
    public void setReadyForDoctorCount(long readyForDoctorCount) { this.readyForDoctorCount = readyForDoctorCount; }

    public long getCompletedAppointments() { return completedAppointments; }
    public void setCompletedAppointments(long completedAppointments) { this.completedAppointments = completedAppointments; }

    public long getFollowUpsDueCount() { return followUpsDueCount; }
    public void setFollowUpsDueCount(long followUpsDueCount) { this.followUpsDueCount = followUpsDueCount; }

    public long getAcuteCount() { return acuteCount; }
    public void setAcuteCount(long acuteCount) { this.acuteCount = acuteCount; }

    public long getChronicCount() { return chronicCount; }
    public void setChronicCount(long chronicCount) { this.chronicCount = chronicCount; }

    public long getPsychologicalCount() { return psychologicalCount; }
    public void setPsychologicalCount(long psychologicalCount) { this.psychologicalCount = psychologicalCount; }

    public Map<String, Long> getSpecializationCounts() { return specializationCounts; }
    public void setSpecializationCounts(Map<String, Long> specializationCounts) { this.specializationCounts = specializationCounts; }
}
