/**
 * CURA - Patient Booking Portal Logic
 * Implements 3-Question Triage Quiz, dynamic duration calculation,
 * slot selection, and strictly isolated personal appointment/Rx history.
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

// Calculate duration as specified:
// First time -> 60 min (1 hr comprehensive intake)
// Returning patient -> Acute: 30m, Chronic: 45m, Psychological: 50m
// Group size -> +15m per additional person
function calculateAllocatedMinutes() {
    let base = 30;
    if (quizState.isFirstTime) {
        base = 60;
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

async function handleBookingSubmit(e) {
    e.preventDefault();
    const currentUser = CuraAuth.getCurrentUser();

    const name = document.getElementById('patientName').value.trim();
    const phone = document.getElementById('patientPhone').value.trim();
    const doctorSelect = document.getElementById('doctorSelect');
    const selectedOption = doctorSelect.selectedOptions[0];
    const doctorName = doctorSelect.value;
    const doctorEmail = selectedOption.dataset.email || 'ashwini.joshi@cura.clinic';
    const specialization = selectedOption.dataset.spec || 'General';
    const symptoms = document.getElementById('symptomsDesc').value.trim();

    if (!name) {
        showToast('Please enter your full name', 'error');
        return;
    }

    const duration = calculateAllocatedMinutes();

    const age = parseInt(document.getElementById('patientAge').value) || null;
    const gender = document.getElementById('patientGender').value;
    const bloodGroup = document.getElementById('patientBloodGroup').value;
    const allergies = document.getElementById('patientAllergies').value.trim();
    const chronicConditions = document.getElementById('patientChronic').value.trim();
    const currentMedications = document.getElementById('patientMedications').value.trim();

    const newAppointment = {
        id: "apt-" + Date.now(),
        patientId: currentUser ? currentUser.uid : null,
        patientEmail: currentUser ? currentUser.email : null,
        patientName: name,
        patientPhone: phone || '+91 9823000000',
        doctorName: doctorName,
        doctorEmail: doctorEmail,
        specialization: specialization,
        age: age,
        gender: gender,
        bloodGroup: bloodGroup,
        allergies: allergies,
        chronicConditions: chronicConditions,
        currentMedications: currentMedications,
        dayOfWeek: selectedDay,
        timeSlot: selectedTime,
        allocatedDurationMinutes: duration,
        healthIssue: quizState.healthIssue,
        firstTimePatient: quizState.isFirstTime,
        groupSize: quizState.groupSize,
        symptomsDescription: symptoms || 'Standard consultation',
        status: 'BOOKED',
        vitals: null,
        followUpIntervalDays: 30,
        createdAt: new Date().toISOString()
    };

    await CuraData.addAppointment(newAppointment);
    showToast(`Appointment booked successfully! (${duration} mins on ${selectedDay} at ${selectedTime})`, 'success');
    document.getElementById('symptomsDesc').value = '';
    await loadPatientHistory();

    const historySection = document.getElementById('patientHistorySection');
    if (historySection) {
        historySection.scrollIntoView({ behavior: 'smooth' });
    }
}

async function loadPatientHistory() {
    const currentUser = CuraAuth.getCurrentUser();
    const container = document.getElementById('patientAppointmentsList');
    if (!container) return;

    let list = [];
    if (currentUser && currentUser.role === 'PATIENT') {
        const identifier = currentUser.email || currentUser.uid || currentUser.fullName;
        list = await CuraData.fetchAppointmentsByPatient(identifier);
    } else {
        list = await CuraData.fetchAppointments();
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); background: var(--bg-app); border-radius: var(--radius-sm); border: 1px dashed var(--border-color);">
                <i class="fa-regular fa-calendar-check" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 8px; display: block;"></i>
                No appointments booked yet. Complete the form above to schedule your visit.
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(apt => `
        <div class="card" style="padding: 1.2rem; margin-bottom: 0.9rem; border-left: 4px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h4 style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary);">
                        ${apt.doctorName} <span style="font-size: 0.8rem; font-weight: 400; color: var(--accent);">(${apt.specialization})</span>
                    </h4>
                    <p style="font-size: 0.84rem; color: var(--text-secondary); margin-top: 3px;">
                        <i class="fa-regular fa-calendar" style="color: var(--primary);"></i> ${apt.dayOfWeek || 'Scheduled'} &bull;
                        <i class="fa-regular fa-clock" style="color: var(--accent);"></i> ${apt.timeSlot} &bull;
                        ⏱️ <strong>${apt.allocatedDurationMinutes || 30} mins</strong>
                    </p>
                    <div style="margin-top: 6px; display: flex; gap: 6px;">
                        <span class="followup-pill">${apt.healthIssue || 'General'}</span>
                        ${apt.firstTimePatient ? '<span class="nav-badge">1st Visit</span>' : ''}
                    </div>
                </div>
                <span class="status-badge status-${(apt.status || 'booked').toLowerCase()}">${apt.status || 'BOOKED'}</span>
            </div>

            ${apt.prescriptionSummary ? `
                <div style="margin-top: 10px; padding: 10px 12px; background: var(--primary-light); border-radius: var(--radius-sm); font-size: 0.82rem; border-left: 3px solid var(--primary);">
                    <strong><i class="fa-solid fa-file-medical"></i> Doctor's Prescription Notes:</strong>
                    <div style="margin-top: 2px;">${apt.prescriptionSummary}</div>
                </div>
            ` : ''}
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const currentUser = CuraAuth.getCurrentUser();
    if (currentUser) {
        const nameInput = document.getElementById('patientName');
        const badge = document.getElementById('patientBadge');
        if (nameInput && currentUser.fullName) nameInput.value = currentUser.fullName;
        if (badge) badge.textContent = currentUser.fullName || currentUser.email || 'Patient';
    }

    updateDurationDisplay();
    renderDays();
    renderSlots();
    loadPatientHistory();
    loadPatientTestOrders();
});

// --- DIAGNOSTIC INVESTIGATION ORDERS & REPORT UPLOADS ---

let activeUploadFile = null;

async function loadPatientTestOrders() {
    const currentUser = CuraAuth.getCurrentUser();
    const container = document.getElementById('patientTestOrdersList');
    if (!container) return;

    let orders = [];
    if (currentUser && currentUser.role === 'PATIENT') {
        const identifier = currentUser.email || currentUser.uid || currentUser.fullName;
        orders = await CuraData.fetchTestOrdersByPatient(identifier);
    } else {
        orders = await CuraData.fetchTestOrders();
    }

    if (orders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2.2rem 1rem; color: var(--text-muted); background: var(--bg-app); border-radius: var(--radius-sm); border: 1px dashed var(--border-color);">
                <i class="fa-solid fa-flask" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 8px; display: block;"></i>
                No diagnostic tests or X-rays currently prescribed for you.
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(ord => {
        let statusBadge = '<span class="status-badge status-ordered"><i class="fa-regular fa-clock"></i> Prescribed</span>';
        if (ord.status === 'SAMPLE_COLLECTED') {
            statusBadge = '<span class="status-badge status-sample-collected"><i class="fa-solid fa-vial"></i> Sample Collected</span>';
        } else if (ord.status === 'REPORT_ATTACHED') {
            statusBadge = '<span class="status-badge status-report-attached"><i class="fa-solid fa-file-circle-check"></i> Report Attached</span>';
        } else if (ord.status === 'COMPLETED') {
            statusBadge = '<span class="status-badge status-completed"><i class="fa-solid fa-circle-check"></i> Doctor Reviewed</span>';
        }

        const safeId = ord.id.replace(/'/g, "\\'");
        const safeTestName = (ord.testName || 'Test').replace(/'/g, "\\'");
        const safeDocName = (ord.doctorName || 'Doctor').replace(/'/g, "\\'");

        return `
            <div class="card" style="padding: 1.2rem; margin-bottom: 0.9rem; border-left: 4px solid var(--accent);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <h4 style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary);">
                                <i class="fa-solid fa-vial-virus" style="color: var(--accent);"></i> ${ord.testName}
                            </h4>
                            ${statusBadge}
                            ${ord.urgency === 'URGENT' || ord.urgency === 'STAT' ? '<span class="status-badge status-cancelled">URGENT</span>' : ''}
                        </div>

                        <p style="font-size: 0.82rem; color: var(--text-secondary);">
                            <strong>Category:</strong> ${ord.category || 'General'} &bull;
                            <strong>Ordered by:</strong> ${ord.doctorName || 'Physician'} &bull;
                            <strong>Date:</strong> ${ord.orderedAt ? ord.orderedAt.split('T')[0] : 'Recent'}
                        </p>

                        ${ord.instructions ? `
                            <p style="font-size: 0.8rem; color: var(--warning); margin-top: 4px; font-weight: 500;">
                                <i class="fa-solid fa-circle-info"></i> Instructions: ${ord.instructions}
                            </p>
                        ` : ''}

                        ${ord.reportDataUrl ? `
                            <div style="margin-top: 8px;">
                                <a href="${ord.reportDataUrl}" target="_blank" class="report-preview-chip">
                                    <i class="fa-solid fa-file-medical"></i> View Uploaded Report: <strong>${ord.reportFileName || 'Diagnostic Report'}</strong>
                                </a>
                            </div>
                        ` : ''}
                    </div>

                    <div>
                        <button type="button" class="btn btn-primary btn-sm" onclick="openUploadReportModal('${safeId}', '${safeTestName}', '${safeDocName}')">
                            <i class="fa-solid fa-cloud-arrow-up"></i> ${ord.reportDataUrl ? 'Re-upload Report' : 'Upload Report / Scan'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openUploadReportModal(orderId, testName, doctorName) {
    document.getElementById('uploadReportOrderId').value = orderId;
    document.getElementById('uploadReportTestName').textContent = testName;
    document.getElementById('uploadReportDoctorInfo').textContent = 'Ordered by ' + doctorName;
    document.getElementById('reportFileInput').value = '';
    document.getElementById('reportNotes').value = '';
    document.getElementById('selectedFileNameDisplay').style.display = 'none';
    activeUploadFile = null;
    document.getElementById('uploadReportModal').classList.add('active');
}

function closeUploadReportModal() {
    document.getElementById('uploadReportModal').classList.remove('active');
    activeUploadFile = null;
}

function handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('File size exceeds 5MB limit. Please choose a smaller file.', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        activeUploadFile = {
            dataUrl: e.target.result,
            fileName: file.name,
            fileType: file.type
        };
        document.getElementById('selectedFileNameText').textContent = file.name;
        document.getElementById('selectedFileNameDisplay').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function handleReportUploadSubmit(e) {
    e.preventDefault();
    const orderId = document.getElementById('uploadReportOrderId').value;
    const notes = document.getElementById('reportNotes').value.trim();

    if (!activeUploadFile) {
        showToast('Please select a report file or scan to upload', 'error');
        return;
    }

    const updates = {
        status: 'REPORT_ATTACHED',
        reportDataUrl: activeUploadFile.dataUrl,
        reportFileName: activeUploadFile.fileName,
        reportFileType: activeUploadFile.fileType,
        patientNotes: notes || null,
        uploadedAt: new Date().toISOString()
    };

    try {
        await CuraData.updateTestOrder(orderId, updates);
        showToast('Report uploaded and attached! Your physician can now review it.', 'success');
        closeUploadReportModal();
        await loadPatientTestOrders();
    } catch (err) {
        console.error("Upload error:", err);
        showToast('Failed to upload report: ' + err.message, 'error');
    }
}
