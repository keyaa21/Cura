/**
 * CURA - Doctor Clinical Dashboard Logic
 * Handles role-guarded appointment queues, prescription writing,
 * vitals reviews, and PWA system follow-up notifications.
 */

// 1. Enforce Role Guard Immediately on Page Load
CuraAuth.guard(['DOCTOR', 'ADMIN']);

let activeAppointmentForRx = null;
let currentFilter = 'ALL';

async function loadDoctorAppointments() {
    // Fetch fresh appointments (Firestore or local fallback)
    let list = await CuraData.fetchAppointments();
    const container = document.getElementById('doctorAppointmentsContainer');
    const followUpsContainer = document.getElementById('followUpsContainer');
    if (!container) return;

    // Filter appointments for the logged-in doctor (Admins see everything)
    const currentUser = CuraAuth.getCurrentUser();
    if (currentUser && currentUser.role === 'DOCTOR') {
        list = list.filter(apt => {
            if (!apt.doctorName || !currentUser.fullName) return false;
            const docName = apt.doctorName.toLowerCase();
            const userFullName = currentUser.fullName.toLowerCase();
            return docName.includes(userFullName) || userFullName.includes(docName);
        });
    }

    // Apply Status Filter Chips
    if (currentFilter === 'READY') {
        list = list.filter(a => a.vitals && a.status !== 'COMPLETED');
    } else if (currentFilter === 'COMPLETED') {
        list = list.filter(a => a.status === 'COMPLETED');
    } else if (currentFilter === 'PENDING') {
        list = list.filter(a => a.status !== 'COMPLETED');
    }

    // Render Appointment Queue Cards
    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2.5rem; color: var(--text-muted); background: var(--surface-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
                <i class="fa-solid fa-user-clock" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 10px;"></i>
                <p>No appointments found under this filter.</p>
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
                <div class="card" style="padding: 1.25rem; margin-bottom: 1rem; border-left: 4px solid ${hasVitals ? 'var(--palette-sage)' : 'var(--border-color)'};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
                        <div style="flex: 1; min-width: 240px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${apt.patientName}</h3>
                                <span class="status-badge ${statusClass}">${apt.status}</span>
                                ${apt.firstTimePatient ? '<span class="nav-badge">1st Visit</span>' : ''}
                            </div>
                            
                            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px;">
                                <i class="fa-solid fa-phone" style="font-size: 0.78rem;"></i> ${apt.patientPhone || 'N/A'} &bull;
                                <i class="fa-regular fa-calendar"></i> ${apt.dayOfWeek} &bull;
                                <i class="fa-regular fa-clock"></i> ${apt.timeSlot} &bull;
                                ⏱️ <strong>${apt.allocatedDurationMinutes || 30} mins</strong>
                            </p>

                            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
                                <span class="followup-pill"><i class="fa-solid fa-disease"></i> ${apt.healthIssue || 'General'}</span>
                                <span class="followup-pill"><i class="fa-solid fa-user-group"></i> Group: ${apt.groupSize || 1}</span>
                            </div>

                            ${apt.symptomsDescription ? `
                                <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 6px; font-style: italic;">
                                    "${apt.symptomsDescription}"
                                </p>
                            ` : ''}
                        </div>

                        <!-- Vitals Triage Display -->
                        <div style="background: var(--bg-app); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); min-width: 190px;">
                            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">
                                <i class="fa-solid fa-heart-pulse" style="color: ${hasVitals ? 'var(--status-completed)' : 'var(--text-muted)'};"></i> Vitals Triage
                            </div>
                            ${hasVitals ? `
                                <div style="font-size: 0.82rem; line-height: 1.4;">
                                    <div><strong>BP:</strong> ${apt.vitals.bloodPressure || 'N/A'} mmHg</div>
                                    <div><strong>Temp:</strong> ${apt.vitals.temperature ? apt.vitals.temperature + '°F' : 'N/A'}</div>
                                    <div><strong>Pulse:</strong> ${apt.vitals.pulseRate ? apt.vitals.pulseRate + ' bpm' : 'N/A'}</div>
                                </div>
                            ` : `
                                <span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Pending Assistant Triage</span>
                            `}
                        </div>

                        <!-- Consultation Actions -->
                        <div style="display: flex; flex-direction: column; gap: 6px; min-width: 160px;">
                            <button type="button" class="btn btn-peach btn-sm" onclick="openPrescriptionModal('${apt.id}')">
                                <i class="fa-solid fa-prescription"></i> Write Rx Note
                            </button>
                            
                            <select class="form-select" style="padding: 5px 8px; font-size: 0.8rem;" onchange="updateAppointmentStatus('${apt.id}', this.value)">
                                <option value="BOOKED" ${apt.status === 'BOOKED' ? 'selected' : ''}>Booked</option>
                                <option value="ONGOING" ${apt.status === 'ONGOING' ? 'selected' : ''}>In Consultation</option>
                                <option value="COMPLETED" ${apt.status === 'COMPLETED' ? 'selected' : ''}>Completed</option>
                                <option value="NO_SHOW" ${apt.status === 'NO_SHOW' ? 'selected' : ''}>No Show</option>
                                <option value="CANCELLED" ${apt.status === 'CANCELLED' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                    </div>

                    ${apt.prescriptionSummary ? `
                        <div style="margin-top: 10px; padding: 10px 14px; background: var(--palette-sage-light); border-radius: var(--radius-sm); font-size: 0.84rem; border-left: 3px solid var(--palette-sage); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong><i class="fa-solid fa-file-medical"></i> Clinical Rx:</strong> ${apt.prescriptionSummary}${apt.followUpIntervalDays ? `<span style="margin-left: 8px; font-weight: 700; color: var(--palette-peach-dark);">&bull; Follow-up: ${apt.followUpIntervalDays} days</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // Render Follow-ups Due Tracker
    if (followUpsContainer) {
        const completedApts = list.filter(a => a.status === 'COMPLETED');
        if (completedApts.length === 0) {
            followUpsContainer.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); padding: 0.8rem 0;">No patient follow-ups scheduled yet.</p>`;
        } else {
            followUpsContainer.innerHTML = completedApts.map(apt => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <strong style="color: var(--text-primary); font-size: 0.9rem;">${apt.patientName}</strong> 
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">(${apt.healthIssue || 'General'})</span>
                        <div style="font-size: 0.78rem; color: var(--text-muted);">
                            Last Visit: ${apt.dayOfWeek} &bull; Interval: <strong>${apt.followUpIntervalDays || 30} days</strong>
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
    showToast(`Status updated to ${newStatus}`, 'success');
    await loadDoctorAppointments();
}

function openPrescriptionModal(aptId) {
    const apt = CuraData.getAppointments().find(a => a.id === aptId);
    if (!apt) return;

    activeAppointmentForRx = apt;
    document.getElementById('rxPatientName').textContent = apt.patientName;
    document.getElementById('rxHealthIssue').textContent = `${apt.healthIssue || 'General'} (${apt.allocatedDurationMinutes || 30} mins)`;
    
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

    await CuraData.updateAppointment(activeAppointmentForRx.id, {
        status: 'COMPLETED',
        prescriptionSummary: `${diagnosis} &bull; ${remedies}`,
        followUpIntervalDays: followUpDays,
        completedAt: new Date().toISOString()
    });

    showToast(`Prescription saved! Follow-up set for ${followUpDays} days.`, 'success');
    closePrescriptionModal();
    await loadDoctorAppointments();
}

async function sendFollowUpReminder(patientName) {
    // 1. Show UI Toast in Dashboard
    showToast(`Follow-up notification queued for ${patientName}!`, 'peach');

    // 2. Request Notification Permission if not yet granted
    if ('Notification' in window && Notification.permission !== 'granted') {
        await Notification.requestPermission();
    }

    // 3. Trigger Native PWA Screen Notification
    if ('Notification' in window && Notification.permission === 'granted') {
        const title = `Cura Clinic: Follow-up Reminder`;
        const options = {
            body: `Hello ${patientName}, your 30-day routine clinic consultation is due! Please check your portal to confirm schedule.`,
            icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063176.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063176.png',
            tag: 'cura-followup-' + Date.now(),
            vibrate: [200, 100, 200],
            requireInteraction: true
        };

        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(title, options);
        } else {
            new Notification(title, options);
        }
    }
}

async function resetDemoData() {
    localStorage.removeItem('cura_appointments');
    localStorage.removeItem('cura_prescriptions');
    showToast('Demo data refreshed to default schedule', 'peach');
    await loadDoctorAppointments();
}

document.addEventListener('DOMContentLoaded', loadDoctorAppointments);