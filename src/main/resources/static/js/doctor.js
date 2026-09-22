/**
 * CURA - Doctor Clinical Dashboard Logic
 * Handles appointment queue, prescription notes modal, vitals review,
 * and 15/30-day follow-up reminder tracker with Firebase Firestore integration.
 */

let activeAppointmentForRx = null;
let currentFilter = 'ALL';

async function loadDoctorAppointments() {
    // 1. FETCH APPOINTMENTS (ASYNC FIRESTORE / LOCAL CACHE)
    let list = await CuraData.fetchAppointments();
    const container = document.getElementById('doctorAppointmentsContainer');
    const followUpsContainer = document.getElementById('followUpsContainer');
    if (!container) return;

    // 2. ROLE-BASED FILTERING
    const currentUser = CuraAuth.getCurrentUser();
    if (currentUser && currentUser.role === 'DOCTOR') {
        // Doctor only sees appointments assigned to them
        list = list.filter(apt => {
            if (!apt.doctorName || !currentUser.fullName) return false;
            const docName = apt.doctorName.toLowerCase();
            const userFullName = currentUser.fullName.toLowerCase();
            return docName.includes(userFullName) || userFullName.includes(docName);
        });
    }
    // Note: If currentUser.role === 'ADMIN', no role filter is applied and admin sees everything.

    // 3. STATUS FILTER CHIPS
    if (currentFilter === 'READY') {
        list = list.filter(a => a.vitals && a.status !== 'COMPLETED');
    } else if (currentFilter === 'COMPLETED') {
        list = list.filter(a => a.status === 'COMPLETED');
    } else if (currentFilter === 'PENDING') {
        list = list.filter(a => a.status !== 'COMPLETED');
    }

    // 4. RENDER APPOINTMENT QUEUE
    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted); background: var(--surface-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
                <i class="fa-solid fa-user-clock" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 12px;"></i>
                <p>No appointments found for your schedule under this filter.</p>
            </div>
        `;
    } else {
        container.innerHTML = list.map(apt => {
            let statusClass = 'status-booked';
            if (apt.status === 'ONGOING') statusClass = 'status-ongoing';
            else if (apt.status === 'COMPLETED') statusClass = 'status-completed';
            else if (apt.status === 'CANCELLED') statusClass = 'status-cancelled';

            const hasVitals = apt.vitals != null;

            return `
                <div class="card" style="padding: 1.5rem; margin-bottom: 1.25rem; border-left: 5px solid ${hasVitals ? 'var(--primary)' : 'var(--border-color)'};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 15px;">
                        <div style="flex: 1; min-width: 250px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                                <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${apt.patientName}</h3>
                                <span class="status-badge ${statusClass}">${apt.status}</span>
                                ${apt.firstTimePatient ? '<span class="nav-badge">1st Visit</span>' : ''}
                            </div>
                            
                            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 6px;">
                                <i class="fa-solid fa-phone" style="font-size: 0.8rem; color: var(--primary);"></i> ${apt.patientPhone || 'N/A'} &bull;
                                <i class="fa-regular fa-calendar" style="color: var(--primary);"></i> ${apt.dayOfWeek} &bull;
                                <i class="fa-regular fa-clock" style="color: var(--accent-peach);"></i> ${apt.timeSlot} &bull;
                                ⏱️ <strong>${apt.allocatedDurationMinutes || 30} mins</strong>
                            </p>

                            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
                                <span class="followup-pill"><i class="fa-solid fa-disease"></i> ${apt.healthIssue || 'General'}</span>
                                <span class="followup-pill"><i class="fa-solid fa-user-group"></i> Group: ${apt.groupSize || 1}</span>
                            </div>

                            ${apt.symptomsDescription ? `
                                <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px; font-style: italic;">
                                    "${apt.symptomsDescription}"
                                </p>
                            ` : ''}
                        </div>

                        <!-- Vitals Section -->
                        <div style="background: var(--bg-app); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); min-width: 200px;">
                            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 6px;">
                                <i class="fa-solid fa-heart-pulse" style="color: ${hasVitals ? 'var(--status-completed)' : 'var(--text-muted)'};"></i> Vitals Triage
                            </div>
                            ${hasVitals ? `
                                <div style="font-size: 0.85rem; line-height: 1.5;">
                                    <div><strong>BP:</strong> ${apt.vitals.bloodPressure || 'N/A'} mmHg</div>
                                    <div><strong>Temp:</strong> ${apt.vitals.temperature ? apt.vitals.temperature + '°F' : 'N/A'}</div>
                                    <div><strong>Pulse:</strong> ${apt.vitals.pulseRate ? apt.vitals.pulseRate + ' bpm' : 'N/A'}</div>
                                </div>
                            ` : `
                                <span style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">Pending Assistant Triage</span>
                            `}
                        </div>

                        <!-- Action Buttons -->
                        <div style="display: flex; flex-direction: column; gap: 8px; min-width: 170px;">
                            <button type="button" class="btn btn-peach btn-sm" onclick="openPrescriptionModal('${apt.id}')">
                                <i class="fa-solid fa-prescription"></i> Write Prescription
                            </button>
                            
                            <select class="form-select" style="padding: 6px 10px; font-size: 0.82rem;" onchange="updateAppointmentStatus('${apt.id}', this.value)">
                                <option value="BOOKED" ${apt.status === 'BOOKED' ? 'selected' : ''}>Booked</option>
                                <option value="ONGOING" ${apt.status === 'ONGOING' ? 'selected' : ''}>In Consultation</option>
                                <option value="COMPLETED" ${apt.status === 'COMPLETED' ? 'selected' : ''}>Completed</option>
                                <option value="NO_SHOW" ${apt.status === 'NO_SHOW' ? 'selected' : ''}>No Show</option>
                                <option value="CANCELLED" ${apt.status === 'CANCELLED' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                    </div>

                    ${apt.prescriptionSummary ? `
                        <div style="margin-top: 14px; padding: 12px 16px; background: var(--primary-light); border-radius: var(--radius-md); font-size: 0.88rem; border-left: 4px solid var(--primary); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong><i class="fa-solid fa-file-medical"></i> Prescription Notes:</strong> ${apt.prescriptionSummary}${apt.followUpIntervalDays ? `<span style="margin-left: 10px; font-weight: 700; color: var(--accent-peach);">&bull; Follow-up in ${apt.followUpIntervalDays} days</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // 5. LOAD FOLLOW-UPS DUE TRACKER
    if (followUpsContainer) {
        const completedApts = list.filter(a => a.status === 'COMPLETED');
        if (completedApts.length === 0) {
            followUpsContainer.innerHTML = `<p style="font-size: 0.9rem; color: var(--text-muted); padding: 1rem 0;">No patient follow-ups scheduled yet.</p>`;
        } else {
            followUpsContainer.innerHTML = completedApts.map(apt => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <strong>${apt.patientName}</strong> (${apt.healthIssue || 'General'})
                        <div style="font-size: 0.8rem; color: var(--text-muted);">
                            Last visit: ${apt.dayOfWeek} &bull; Interval: <strong>${apt.followUpIntervalDays || 30} days</strong>
                        </div>
                    </div>
                    <button class="btn btn-outline-peach btn-sm" onclick="sendFollowUpReminder('${apt.patientName}')">
                        <i class="fa-solid fa-bell"></i> Send Reminder
                    </button>
                </div>
            `).join('');
        }
    }
}

function filterAppointments(type) {
    currentFilter = type;
    document.querySelectorAll('.filter-chip').forEach(el => {
        el.classList.toggle('active', el.dataset.filter === type);
    });
    loadDoctorAppointments();
}

async function updateAppointmentStatus(id, newStatus) {
    await CuraData.updateAppointment(id, { 
        status: newStatus,
        completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : null
    });
    showToast(`Appointment status updated to ${newStatus}`, 'success');
    loadDoctorAppointments();
}

function openPrescriptionModal(aptId) {
    const apt = CuraData.getAppointments().find(a => a.id === aptId);
    if (!apt) return;

    activeAppointmentForRx = apt;
    document.getElementById('rxPatientName').textContent = apt.patientName;
    document.getElementById('rxHealthIssue').textContent = `${apt.healthIssue || 'General'} (${apt.allocatedDurationMinutes || 30} mins)`;
    
    // Clear / Prepopulate form
    document.getElementById('rxDiagnosis').value = '';
    document.getElementById('rxRemedies').value = '';
    document.getElementById('rxInstructions').value = '';
    document.getElementById('rxDiet').value = '';
    document.getElementById('rxFollowUpDays').value = apt.followUpIntervalDays || '30';

    const modal = document.getElementById('prescriptionModal');
    if (modal) modal.classList.add('active');
}

function closePrescriptionModal() {
    const modal = document.getElementById('prescriptionModal');
    if (modal) modal.classList.remove('active');
    activeAppointmentForRx = null;
}

async function handlePrescriptionSubmit(e) {
    e.preventDefault();
    if (!activeAppointmentForRx) return;

    const diagnosis = document.getElementById('rxDiagnosis').value.trim();
    const remedies = document.getElementById('rxRemedies').value.trim();
    const instructions = document.getElementById('rxInstructions').value.trim();
    const diet = document.getElementById('rxDiet').value.trim();
    const followUpDays = parseInt(document.getElementById('rxFollowUpDays').value) || 30;

    const rx = {
        id: "rx-" + Date.now(),
        appointmentId: activeAppointmentForRx.id,
        patientName: activeAppointmentForRx.patientName,
        doctorName: activeAppointmentForRx.doctorName,
        specialization: activeAppointmentForRx.specialization,
        date: new Date().toISOString().split('T')[0],
        diagnosis,
        remediesOrMedicines: remedies,
        dosageInstructions: instructions,
        dietaryLifestyleAdvice: diet,
        followUpIntervalDays: followUpDays,
        createdAt: new Date().toISOString()
    };

    if (typeof CuraData.addPrescription === 'function') {
        await CuraData.addPrescription(rx);
    }

    // Update appointment status to COMPLETED in Firebase Cloud Firestore
    await CuraData.updateAppointment(activeAppointmentForRx.id, {
        status: 'COMPLETED',
        prescriptionSummary: `${diagnosis} &bull; ${remedies}`,
        followUpIntervalDays: followUpDays,
        completedAt: new Date().toISOString()
    });

    showToast(`Prescription saved! Follow-up set for ${followUpDays} days.`, 'success');
    closePrescriptionModal();
    loadDoctorAppointments();
}

function sendFollowUpReminder(patientName) {
    showToast(`Follow-up notification queued for ${patientName}!`, 'peach');
}

async function resetDemoData() {
    localStorage.removeItem('cura_appointments');
    localStorage.removeItem('cura_prescriptions');
    showToast('Demo data refreshed to default schedule', 'peach');
    await loadDoctorAppointments();
}

document.addEventListener('DOMContentLoaded', loadDoctorAppointments);