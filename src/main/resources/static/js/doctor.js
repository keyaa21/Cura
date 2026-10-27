/**
 * CURA - Doctor Clinical Dashboard Logic
 * Handles role-guarded appointment queues, prescription writing,
 * vitals reviews, and PWA system follow-up notifications.
 * 
 * Follow-up System:
 *   - When a prescription is written, a followUpDate is calculated
 *     (completedAt + followUpIntervalDays)
 *   - The follow-ups tracker shows upcoming, due today, and overdue items
 *   - Automatic notification on page load for due/overdue follow-ups
 */

// 1. Enforce Role Guard Immediately on Page Load
CuraAuth.guard(['DOCTOR', 'ADMIN']);

let activeAppointmentForRx = null;
let currentFilter = 'ALL';

// --- FOLLOW-UP DATE HELPERS ---

/**
 * Calculate the follow-up date from a completion timestamp and interval in days.
 * Returns an ISO date string (YYYY-MM-DD).
 */
function calculateFollowUpDate(completedAt, intervalDays) {
    if (!completedAt || !intervalDays) return null;
    const completed = new Date(completedAt);
    if (isNaN(completed.getTime())) return null;
    const followUp = new Date(completed);
    followUp.setDate(followUp.getDate() + intervalDays);
    return followUp.toISOString().split('T')[0];
}

/**
 * Get the number of days between today and a target date.
 * Positive = days in the future, Negative = days overdue, 0 = today.
 */
function daysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

/**
 * Format a date string into a readable format like "Mon, 15 Nov 2026".
 */
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Get follow-up status label and color class.
 */
function getFollowUpStatus(daysRemaining) {
    if (daysRemaining === null) return { label: 'No date set', cssClass: 'muted', icon: 'fa-circle-question' };
    if (daysRemaining < 0) return { label: `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} overdue`, cssClass: 'overdue', icon: 'fa-triangle-exclamation' };
    if (daysRemaining === 0) return { label: 'Due today!', cssClass: 'due-today', icon: 'fa-bell' };
    if (daysRemaining <= 3) return { label: `In ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`, cssClass: 'due-soon', icon: 'fa-clock' };
    return { label: `In ${daysRemaining} days`, cssClass: 'upcoming', icon: 'fa-calendar-check' };
}

async function loadDoctorAppointments() {
    // Fetch fresh appointments (Firestore or local fallback)
    let list = await CuraData.fetchAppointments();
    const container = document.getElementById('doctorAppointmentsContainer');
    const followUpsContainer = document.getElementById('followUpsContainer');
    if (!container) return;

    // Filter appointments for the logged-in doctor (Admins see everything)
    const currentUser = CuraAuth.getCurrentUser();
    if (currentUser && currentUser.role === 'DOCTOR') {
        const userEmail = (currentUser.email || '').toLowerCase().trim();
        const userFullName = (currentUser.fullName || '').toLowerCase().trim();
        list = list.filter(apt => {
            const aptEmail = (apt.doctorEmail || '').toLowerCase().trim();
            const docName = (apt.doctorName || '').toLowerCase().trim();
            if (userEmail && aptEmail && userEmail === aptEmail) return true;
            if (userFullName && docName && (docName.includes(userFullName) || userFullName.includes(docName))) return true;
            return false;
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

            // Calculate follow-up info for display
            let followUpInfo = '';
            if (apt.followUpDate) {
                const remaining = daysUntil(apt.followUpDate);
                const status = getFollowUpStatus(remaining);
                followUpInfo = `<span style="margin-left: 8px; font-weight: 700; color: var(--palette-peach-dark);">&bull; Follow-up: ${formatDate(apt.followUpDate)} (${status.label})</span>`;
            } else if (apt.followUpIntervalDays) {
                followUpInfo = `<span style="margin-left: 8px; font-weight: 700; color: var(--palette-peach-dark);">&bull; Follow-up: ${apt.followUpIntervalDays} days</span>`;
            }

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
                            <button type="button" class="btn btn-secondary btn-sm" onclick="openOrderTestModal('${apt.id}')" style="font-size: 0.8rem; padding: 5px 8px;">
                                <i class="fa-solid fa-flask-vial"></i> Order Lab / Scan
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
                                <strong><i class="fa-solid fa-file-medical"></i> Clinical Rx:</strong> ${apt.prescriptionSummary}${followUpInfo}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // --- RENDER FOLLOW-UPS DUE TRACKER ---
    if (followUpsContainer) {
        renderFollowUpsTracker(followUpsContainer);
    }
}

/**
 * Render the Follow-Ups Due tracker panel.
 * Shows completed appointments that have follow-up dates, sorted by urgency.
 */
function renderFollowUpsTracker(container) {
    const allApts = CuraData.getAppointments();
    const currentUser = CuraAuth.getCurrentUser();
    let scopedApts = allApts;

    if (currentUser && currentUser.role === 'DOCTOR') {
        const userEmail = (currentUser.email || '').toLowerCase().trim();
        const userFullName = (currentUser.fullName || '').toLowerCase().trim();
        scopedApts = allApts.filter(apt => {
            const aptEmail = (apt.doctorEmail || '').toLowerCase().trim();
            const docName = (apt.doctorName || '').toLowerCase().trim();
            if (userEmail && aptEmail && userEmail === aptEmail) return true;
            if (userFullName && docName && (docName.includes(userFullName) || userFullName.includes(docName))) return true;
            return false;
        });
    }
    
    // Get appointments that have follow-ups set (completed with followUpDate or followUpIntervalDays)
    const followUpApts = scopedApts
        .filter(a => a.status === 'COMPLETED' && (a.followUpDate || a.followUpIntervalDays))
        .map(a => {
            // Ensure followUpDate is set (migrate older records that only have interval)
            let followUpDate = a.followUpDate;
            if (!followUpDate && a.completedAt && a.followUpIntervalDays) {
                followUpDate = calculateFollowUpDate(a.completedAt, a.followUpIntervalDays);
            }
            const remaining = daysUntil(followUpDate);
            const status = getFollowUpStatus(remaining);
            return { ...a, followUpDate, daysRemaining: remaining, followUpStatus: status };
        })
        // Sort: overdue first, then due today, then upcoming
        .sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999));

    if (followUpApts.length === 0) {
        container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); padding: 0.8rem 0;">No patient follow-ups scheduled yet.</p>`;
        return;
    }

    container.innerHTML = followUpApts.map(apt => {
        const s = apt.followUpStatus;
        
        // Color coding based on urgency
        let borderColor = 'var(--border-color)';
        let bgColor = 'transparent';
        let textColor = 'var(--text-secondary)';
        if (s.cssClass === 'overdue') {
            borderColor = 'var(--status-cancelled)';
            bgColor = 'var(--status-cancelled-bg)';
            textColor = 'var(--status-cancelled)';
        } else if (s.cssClass === 'due-today') {
            borderColor = 'var(--palette-peach)';
            bgColor = 'var(--accent-peach-light, rgba(238, 122, 81, 0.1))';
            textColor = 'var(--palette-peach-dark, #C94F24)';
        } else if (s.cssClass === 'due-soon') {
            borderColor = 'var(--status-ongoing)';
            bgColor = 'var(--status-ongoing-bg)';
            textColor = 'var(--status-ongoing)';
        }

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; border-radius: var(--radius-sm); border: 1px solid ${borderColor}; background: ${bgColor};">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <strong style="color: var(--text-primary); font-size: 0.92rem;">${apt.patientName}</strong>
                        <span style="font-size: 0.78rem; color: var(--text-secondary);">(${apt.healthIssue || 'General'})</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                        Last Visit: ${apt.completedAt ? new Date(apt.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : apt.dayOfWeek}
                        &bull; Interval: <strong>${apt.followUpIntervalDays || 30} days</strong>
                        &bull; Due: <strong>${apt.followUpDate ? formatDate(apt.followUpDate) : 'Not calculated'}</strong>
                    </div>
                    <div style="font-size: 0.82rem; font-weight: 700; color: ${textColor}; margin-top: 4px;">
                        <i class="fa-solid ${s.icon}"></i> ${s.label}
                    </div>
                </div>
                <button class="btn btn-outline-peach btn-sm" onclick="sendFollowUpReminder('${apt.patientName}', ${apt.followUpIntervalDays || 30})">
                    <i class="fa-solid fa-bell"></i> Remind
                </button>
            </div>
        `;
    }).join('');
}

function filterAppointments(type) {
    currentFilter = type;
    document.querySelectorAll('.filter-chip').forEach(el => {
        el.classList.toggle('active', el.dataset.filter === type);
    });
    loadDoctorAppointments();
}

async function updateAppointmentStatus(id, newStatus) {
    const updates = { 
        status: newStatus,
        completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : null
    };
    await CuraData.updateAppointment(id, updates);
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

    const completedAt = new Date().toISOString();
    const followUpDate = calculateFollowUpDate(completedAt, followUpDays);

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
        followUpDate: followUpDate,
        createdAt: completedAt
    };

    if (typeof CuraData.addPrescription === 'function') {
        await CuraData.addPrescription(rx);
    }

    // ✅ Store followUpDate on the appointment for the tracker
    await CuraData.updateAppointment(activeAppointmentForRx.id, {
        status: 'COMPLETED',
        prescriptionSummary: `${diagnosis} \u2022 ${remedies}`,
        followUpIntervalDays: followUpDays,
        followUpDate: followUpDate,
        completedAt: completedAt
    });

    showToast(`Prescription saved! Follow-up scheduled for ${formatDate(followUpDate)} (${followUpDays} days).`, 'success');
    closePrescriptionModal();
    await loadDoctorAppointments();

    // Schedule automatic follow-up notification check
    scheduleFollowUpCheck();
}

/**
 * Send a follow-up reminder notification for a patient.
 */
async function sendFollowUpReminder(patientName, intervalDays) {
    // 1. Show UI Toast in Dashboard
    showToast(`Follow-up notification sent for ${patientName}!`, 'peach');

    // 2. Request Notification Permission if not yet granted
    if ('Notification' in window && Notification.permission !== 'granted') {
        await Notification.requestPermission();
    }

    // 3. Trigger Native PWA Screen Notification
    if ('Notification' in window && Notification.permission === 'granted') {
        const title = `Cura Clinic: Follow-up Reminder`;
        const options = {
            body: `Hello ${patientName}, your ${intervalDays}-day follow-up consultation is due! Please check your portal to confirm your schedule.`,
            icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063176.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063176.png',
            tag: 'cura-followup-' + patientName.replace(/\s+/g, '-').toLowerCase(),
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

/**
 * Check all appointments for due/overdue follow-ups and show notifications.
 * Runs automatically on page load and after prescription saves.
 */
function scheduleFollowUpCheck() {
    const allApts = CuraData.getAppointments();
    const currentUser = CuraAuth.getCurrentUser();
    let scopedApts = allApts;

    if (currentUser && currentUser.role === 'DOCTOR') {
        const userEmail = (currentUser.email || '').toLowerCase().trim();
        const userFullName = (currentUser.fullName || '').toLowerCase().trim();
        scopedApts = allApts.filter(apt => {
            const aptEmail = (apt.doctorEmail || '').toLowerCase().trim();
            const docName = (apt.doctorName || '').toLowerCase().trim();
            if (userEmail && aptEmail && userEmail === aptEmail) return true;
            if (userFullName && docName && (docName.includes(userFullName) || userFullName.includes(docName))) return true;
            return false;
        });
    }

    const dueFollowUps = scopedApts.filter(a => {
        if (a.status !== 'COMPLETED') return false;
        let fDate = a.followUpDate;
        if (!fDate && a.completedAt && a.followUpIntervalDays) {
            fDate = calculateFollowUpDate(a.completedAt, a.followUpIntervalDays);
        }
        if (!fDate) return false;
        const remaining = daysUntil(fDate);
        return remaining !== null && remaining <= 0; // Due today or overdue
    });

    if (dueFollowUps.length > 0) {
        // Notify about due/overdue follow-ups (only once per session)
        const notifiedKey = 'cura_followup_notified_' + new Date().toISOString().split('T')[0];
        if (!sessionStorage.getItem(notifiedKey)) {
            sessionStorage.setItem(notifiedKey, 'true');
            
            const overdueCount = dueFollowUps.length;
            const names = dueFollowUps.slice(0, 3).map(a => a.patientName).join(', ');
            const extra = overdueCount > 3 ? ` and ${overdueCount - 3} more` : '';
            
            showToast(`⚠️ ${overdueCount} follow-up${overdueCount > 1 ? 's' : ''} due/overdue: ${names}${extra}`, 'peach');

            // Also trigger a browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
                const notif = new Notification('Cura: Follow-ups Due', {
                    body: `${overdueCount} patient follow-up${overdueCount > 1 ? 's are' : ' is'} due or overdue. Check your dashboard.`,
                    icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063176.png',
                    tag: 'cura-followup-due-alert'
                });
                setTimeout(() => notif.close(), 10000);
            }
        }
    }
}

// --- DIAGNOSTIC INVESTIGATION MODAL HANDLERS ---
function openOrderTestModal(aptId) {
    const apt = CuraData.getAppointments().find(a => a.id === aptId);
    if (!apt) return;

    document.getElementById('orderAptId').value = apt.id;
    document.getElementById('orderPatientId').value = apt.patientId || '';
    document.getElementById('orderPatientEmail').value = apt.patientEmail || '';
    document.getElementById('orderPatientNameVal').value = apt.patientName;
    document.getElementById('orderModalPatientName').textContent = apt.patientName;
    document.getElementById('orderModalPatientSub').textContent = 
        `${apt.patientPhone || apt.patientEmail || 'Patient'} • Visit: ${apt.dayOfWeek || 'Today'} at ${apt.timeSlot}`;

    document.getElementById('orderCategory').value = 'RADIOLOGY_XRAY';
    document.getElementById('orderTestName').value = '';
    document.getElementById('orderUrgency').value = 'ROUTINE';
    document.getElementById('orderInstructions').value = '';

    const modal = document.getElementById('orderTestModal');
    if (modal) modal.classList.add('active');
}

function closeOrderTestModal() {
    const modal = document.getElementById('orderTestModal');
    if (modal) modal.classList.remove('active');
}

async function handleTestOrderSubmit(e) {
    e.preventDefault();
    const aptId = document.getElementById('orderAptId').value;
    const patientId = document.getElementById('orderPatientId').value;
    const patientEmail = document.getElementById('orderPatientEmail').value;
    const patientName = document.getElementById('orderPatientNameVal').value;
    const category = document.getElementById('orderCategory').value;
    const testName = document.getElementById('orderTestName').value.trim();
    const urgency = document.getElementById('orderUrgency').value;
    const instructions = document.getElementById('orderInstructions').value.trim();

    if (!testName) {
        showToast('Please enter the diagnostic test or scan name', 'error');
        return;
    }

    const currentUser = CuraAuth.getCurrentUser();

    const order = {
        id: "tst-" + Date.now(),
        appointmentId: aptId,
        patientId: patientId || null,
        patientEmail: patientEmail || null,
        patientName: patientName,
        doctorId: currentUser ? (currentUser.uid || currentUser.id) : null,
        doctorEmail: currentUser ? (currentUser.email || '') : '',
        doctorName: currentUser ? (currentUser.fullName || currentUser.email) : 'Physician',
        category: category,
        testName: testName,
        urgency: urgency,
        instructions: instructions || null,
        status: 'ORDERED',
        orderedAt: new Date().toISOString()
    };

    try {
        if (typeof CuraData.addTestOrder === 'function') {
            await CuraData.addTestOrder(order);
        }
        showToast(`Diagnostic order placed for ${testName}!`, 'success');
        closeOrderTestModal();
        await loadDoctorAppointments();
    } catch (err) {
        console.error("Order test error:", err);
        showToast('Failed to order diagnostic test: ' + err.message, 'error');
    }
}

async function reviewTestOrder(orderId) {
    try {
        if (typeof CuraData.updateTestOrder === 'function') {
            await CuraData.updateTestOrder(orderId, {
                status: 'COMPLETED',
                doctorReviewedAt: new Date().toISOString()
            });
        }
        showToast('Investigation report marked as reviewed by physician.', 'success');
        await loadDoctorAppointments();
    } catch (err) {
        console.error("Error reviewing test order:", err);
        showToast('Failed to update status: ' + err.message, 'error');
    }
}

async function refreshDoctorDashboard() {
    showToast('Refreshing consultation queue from Firebase...', 'peach');
    await loadDoctorAppointments();
}

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof CuraFirebase !== 'undefined' && typeof CuraFirebase.waitForAuth === 'function') {
        await CuraFirebase.waitForAuth();
    }
    const user = CuraAuth.getCurrentUser();
    const greetingEl = document.getElementById('doctorGreeting');
    if (greetingEl && user) {
        greetingEl.textContent = user.fullName ? `Dr. ${user.fullName.replace(/^Dr\.?\s*/i, '')}` : 'Physician Workstation';
    }
    await loadDoctorAppointments();
    // Auto-check for due follow-ups on page load
    setTimeout(scheduleFollowUpCheck, 1500);
});
