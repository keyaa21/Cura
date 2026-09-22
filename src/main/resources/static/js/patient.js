/**
 * CURA - Patient Booking Portal Logic
 * Implements the 3-Question Triage Quiz, dynamic time duration calculation,
 * slot selection, and patient appointment history.
 */
CuraAuth.guard(['PATIENT', 'ADMIN']);
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const morningTimes = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM'];
const eveningTimes = ['05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'];

let quizState = {
    healthIssue: 'ACUTE',
    isFirstTime: true,
    groupSize: 1
};

let selectedDay = 'Monday';
let selectedTime = '09:00 AM';

// Calculate duration as requested:
// First time -> 60 min (1 hr)
// Return visit: Acute -> 30 min, Chronic -> 45 min, Psychological -> 50 min
// Group size -> +15 min per additional person
function calculateAllocatedMinutes() {
    let base = 30;
    if (quizState.isFirstTime) {
        base = 60; // 1 full hour for first time comprehensive intake
    } else {
        if (quizState.healthIssue === 'ACUTE') base = 30;
        else if (quizState.healthIssue === 'CHRONIC') base = 45;
        else if (quizState.healthIssue === 'PSYCHOLOGICAL') base = 50;
    }

    const groupBonus = Math.max(0, quizState.groupSize - 1) * 15;
    return base + groupBonus;
}

function updateDurationDisplay() {
    const minutes = calculateAllocatedMinutes();
    const durationBadge = document.getElementById('allocatedDurationBadge');
    if (durationBadge) {
        let reason = quizState.isFirstTime ? 'Comprehensive 1st-Time Intake' : `${quizState.healthIssue} Consultation`;
        if (quizState.groupSize > 1) reason += ` (${quizState.groupSize} Patients)`;
        durationBadge.innerHTML = `
            <i class="fa-solid fa-stopwatch"></i>
            <span><strong>${minutes} mins</strong> allocated (${reason})</span>
        `;
    }
}

function setHealthIssue(type) {
    quizState.healthIssue = type;
    document.querySelectorAll('.health-issue-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.value === type);
    });
    updateDurationDisplay();
}

function setFirstTime(isFirst) {
    quizState.isFirstTime = isFirst;
    document.querySelectorAll('.first-time-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.value === String(isFirst));
    });
    updateDurationDisplay();
}

function setGroupSize(size) {
    quizState.groupSize = parseInt(size) || 1;
    document.querySelectorAll('.group-size-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.value === String(size));
    });
    updateDurationDisplay();
}

function renderDays() {
    const container = document.getElementById('daysGrid');
    if (!container) return;

    container.innerHTML = days.map(day => `
        <div class="day-chip ${day === selectedDay ? 'active' : ''}" onclick="selectDay('${day}')">
            <div class="day-abbr">${day.substring(0, 3)}</div>
            <div class="day-sub">${day}</div>
        </div>
    `).join('');
}

function selectDay(day) {
    selectedDay = day;
    renderDays();
}

function renderSlots() {
    const morningContainer = document.getElementById('morningSlots');
    const eveningContainer = document.getElementById('eveningSlots');

    if (morningContainer) {
        morningContainer.innerHTML = morningTimes.map(time => `
            <button type="button" class="time-slot-btn ${selectedTime === time ? 'active' : ''}" onclick="selectTime('${time}')">
                <i class="fa-regular fa-clock"></i> ${time}
            </button>
        `).join('');
    }

    if (eveningContainer) {
        eveningContainer.innerHTML = eveningTimes.map(time => `
            <button type="button" class="time-slot-btn ${selectedTime === time ? 'active' : ''}" onclick="selectTime('${time}')">
                <i class="fa-regular fa-moon"></i> ${time}
            </button>
        `).join('');
    }
}

function selectTime(time) {
    selectedTime = time;
    renderSlots();
}

function handleBookingSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('patientName').value.trim();
    const phone = document.getElementById('patientPhone').value.trim();
    const doctorSelect = document.getElementById('doctorSelect');
    const doctorName = doctorSelect.value;
    const specialization = doctorSelect.selectedOptions[0].dataset.spec || 'General';
    const symptoms = document.getElementById('symptomsDesc').value.trim();

    if (!name) {
        showToast('Please enter patient name', 'error');
        return;
    }

    const duration = calculateAllocatedMinutes();

    const newAppointment = {
        id: String(Date.now()),
        patientName: name,
        patientPhone: phone || '+91 9823000000',
        doctorName: doctorName,
        specialization: specialization,
        dayOfWeek: selectedDay,
        timeSlot: selectedTime,
        allocatedDurationMinutes: duration,
        healthIssue: quizState.healthIssue,
        firstTimePatient: quizState.isFirstTime,
        groupSize: quizState.groupSize,
        symptomsDescription: symptoms || 'Standard consultation request',
        status: 'BOOKED',
        vitals: null,
        followUpIntervalDays: 30,
        createdAt: new Date().toISOString()
    };

    CuraData.addAppointment(newAppointment);

    showToast(`Appointment confirmed for ${name} (${duration} mins on ${selectedDay} at ${selectedTime})`, 'success');

    // Reset symptoms and reload list
    document.getElementById('symptomsDesc').value = '';
    loadPatientHistory();

    // Scroll smoothly to history
    const historySection = document.getElementById('patientHistorySection');
    if (historySection) {
        historySection.scrollIntoView({ behavior: 'smooth' });
    }
}

async function loadPatientHistory() {
    const list = await CuraData.fetchAppointments();
    const container = document.getElementById('patientAppointmentsList');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No appointments booked yet.</div>`;
        return;
    }

    container.innerHTML = list.map(apt => `
        <div class="card" style="padding: 1.25rem; margin-bottom: 1rem; border-left: 4px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h4 style="font-size: 1.05rem; font-weight: 700;">${apt.doctorName} <span style="font-size: 0.8rem; font-weight: normal;">(${apt.specialization})</span></h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                        ${apt.dayOfWeek} &bull; ${apt.timeSlot} &bull; <strong>${apt.allocatedDurationMinutes || 30} mins</strong>
                    </p>
                </div>
                <span class="status-badge status-${(apt.status || 'booked').toLowerCase()}">${apt.status}</span>
            </div>
        </div>
    `).join('');
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('patientName').value.trim();
    const phone = document.getElementById('patientPhone').value.trim();
    const doctorSelect = document.getElementById('doctorSelect');
    const doctorName = doctorSelect.value;
    const specialization = doctorSelect.selectedOptions[0].dataset.spec || 'General';
    const symptoms = document.getElementById('symptomsDesc').value.trim();

    const duration = calculateAllocatedMinutes();
    const newAppointment = {
        id: String(Date.now()),
        patientName: name,
        patientPhone: phone || '+91 9823000000',
        doctorName: doctorName,
        specialization: specialization,
        dayOfWeek: selectedDay,
        timeSlot: selectedTime,
        allocatedDurationMinutes: duration,
        healthIssue: quizState.healthIssue,
        firstTimePatient: quizState.isFirstTime,
        groupSize: quizState.groupSize,
        symptomsDescription: symptoms || 'Standard consultation',
        status: 'BOOKED',
        vitals: null,
        createdAt: new Date().toISOString()
    };

    await CuraData.addAppointment(newAppointment);
    showToast(`Appointment booked successfully! (${duration} mins)`);
    document.getElementById('symptomsDesc').value = '';
    loadPatientHistory();
}

document.addEventListener('DOMContentLoaded', () => {
    updateDurationDisplay();
    renderDays();
    renderSlots();
    loadPatientHistory();
});
