/**
 * CURA - Doctor Clinical Dashboard Logic
 * Strict Role Isolation: Doctor only views their own assigned patients,
 * consult queues, triage vitals, and prescription follow-up schedule.
 */

let activeAppointmentForRx = null;
let currentFilter = 'ALL';

CuraAuth.guard(['DOCTOR', 'ADMIN']);

async function loadDoctorAppointments() {
    const currentUser = CuraAuth.getCurrentUser();
    const container = document.getElementById('doctorAppointmentsContainer');
    const followUpsContainer = document.getElementById('followUpsContainer');
    const doctorGreeting = document.getElementById('doctorGreeting');
    if (!container) return;

    if (doctorGreeting && currentUser) {
        doctorGreeting.textContent = currentUser.fullName || currentUser.email || 'Physician';
    }

    // Fetch appointments filtered strictly by this doctor's email or UID (unless ADMIN)
    let list = [];
    let doctorOrders = [];
    const doctorIdentifier = currentUser ? (currentUser.email || currentUser.uid || currentUser.fullName) : null;

    if (currentUser && currentUser.role === 'DOCTOR') {
        list = await CuraData.fetchAppointmentsByDoctor(doctorIdentifier);
        doctorOrders = await CuraData.fetchTestOrdersByDoctor(doctorIdentifier);
    } else {
        // Admin sees all
        list = await CuraData.fetchAppointments();
        doctorOrders = await CuraData.fetchTestOrders();
    }

    // Filter by status chips
    if (currentFilter === 'READY') {
        list = list.filter(a => a.vitals && a.status !== 'COMPLETED');
    } else if (currentFilter === 'COMPLETED') {
        list = list.filter(a => a.status === 'COMPLETED');
    } else if (currentFilter === 'PENDING') {
        list = list.filter(a => a.status !== 'COMPLETED');
    }

    // Render Consultation Queue
    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2.8rem 1rem; color: var(--text-muted); background: var(--surface-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
                <i class="fa-solid fa-calendar-check" style="font-size: 2.2rem; color: var(--text-muted); margin-bottom: 10px; display: block;"></i>
                <h4 style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">No Assigned Appointments</h4>
                <p style="font-size: 0.85rem;">There are currently no patient consultations assigned to your profile (${currentUser ? currentUser.email : 'Doctor'}) under this filter.</p>
            </div>
        `;
    } else {
        container.innerHTML = list.map(apt => {
            let statusClass = 'status-booked';
            if (apt.status === 'ONGOING') statusClass = 'status-ongoing';
            else if (apt.status === 'COMPLETED') statusClass = 'status-completed';
            else if (apt.status === 'CANCELLED') statusClass = 'status-cancelled';

            const hasVitals = apt.vitals != null;

            // Correlate diagnostic orders for this appointment or patient
            const aptOrders = doctorOrders.filter(o => 
                (o.appointmentId && o.appointmentId === apt.id) ||
                (apt.patientEmail && o.patientEmail === apt.patientEmail) ||
                (apt.patientName && o.patientName === apt.patientName)
            );

            return `
                <div class="card" style="padding: 1.3rem; margin-bottom: 1rem; border-left: 4px solid ${hasVitals ? 'var(--primary)' : 'var(--border-color)'};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
                        
                        <!-- Patient Demographics & Health Profile -->
                        <div style="flex: 1.2; min-width: 280px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
                                <h3 style="font-size: 1.15rem; font-weight: 600; color: var(--text-primary);">${apt.patientName}</h3>
                                <span class="status-badge ${statusClass}">${apt.status}</span>
                                ${apt.firstTimePatient ? '<span class="nav-badge">1st Visit</span>' : ''}
                                ${apt.age ? `<span class="clinical-tag">${apt.age} yrs${apt.gender ? ' &bull; ' + apt.gender : ''}</span>` : ''}
                            </div>

                            ${apt.allergies ? `
                                <div class="allergy-alert-badge" style="margin: 6px 0;">
                                    <i class="fa-solid fa-triangle-exclamation"></i> <strong>CLINICAL ALLERGY ALERT:</strong> ${apt.allergies}
                                </div>
                            ` : ''}

                            <p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 6px;">
                                <i class="fa-solid fa-phone" style="font-size: 0.78rem; color: var(--primary);"></i> ${apt.patientPhone || 'N/A'} &bull;
                                <i class="fa-regular fa-calendar" style="color: var(--primary);"></i> ${apt.dayOfWeek || 'Today'} &bull;
                                <i class="fa-regular fa-clock" style="color: var(--accent);"></i> ${apt.timeSlot} &bull;
                                ⏱️ <strong>${apt.allocatedDurationMinutes || 30} mins</strong>
                            </p>

                            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
                                <span class="followup-pill"><i class="fa-solid fa-stethoscope"></i> ${apt.healthIssue || 'General'}</span>
                                ${apt.bloodGroup ? `<span class="clinical-tag"><i class="fa-solid fa-droplet" style="color: var(--danger);"></i> Blood: ${apt.bloodGroup}</span>` : ''}
                                ${apt.chronicConditions ? `<span class="clinical-tag"><i class="fa-solid fa-notes-medical" style="color: var(--warning);"></i> ${apt.chronicConditions}</span>` : ''}
                                ${apt.currentMedications ? `<span class="clinical-tag"><i class="fa-solid fa-pills" style="color: var(--primary);"></i> Meds: ${apt.currentMedications}</span>` : ''}
                            </div>

                            ${apt.symptomsDescription ? `
                                <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 8px; font-style: italic;">
                                    "${apt.symptomsDescription}"
                                </p>
                            ` : ''}
                        </div>

                        <!-- Triage Vitals Matrix -->
                        <div style="flex: 1.4; background: var(--bg-app); padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); min-width: 280px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">
                                    <i class="fa-solid fa-heart-pulse" style="color: ${hasVitals ? 'var(--status-completed)' : 'var(--text-muted)'};"></i> Triage Vitals &amp; Biometrics
                                </span>
                                ${hasVitals && apt.vitals.recordedBy ? `<span style="font-size: 0.72rem; color: var(--text-muted);">Recorded by ${apt.vitals.recordedBy}</span>` : ''}
                            </div>

                            ${hasVitals ? `
                                <div class="vitals-matrix-grid">
                                    <div class="vital-chip">
                                        <span class="vital-label">Blood Pressure</span>
                                        <span class="vital-val">${apt.vitals.bloodPressure || '—'} <small style="font-size: 0.65rem; color: var(--text-muted);">mmHg</small></span>
                                    </div>
                                    <div class="vital-chip">
                                        <span class="vital-label">Pulse Rate</span>
                                        <span class="vital-val">${apt.vitals.pulseRate || '—'} <small style="font-size: 0.65rem; color: var(--text-muted);">bpm</small></span>
                                    </div>
                                    <div class="vital-chip">
                                        <span class="vital-label">Temperature</span>
                                        <span class="vital-val">${apt.vitals.temperature ? apt.vitals.temperature + '°F' : '—'}</span>
                                    </div>
                                    <div class="vital-chip">
                                        <span class="vital-label">SpO2 Oxygen</span>
                                        <span class="vital-val">${apt.vitals.bloodOxygen ? apt.vitals.bloodOxygen + '%' : '—'}</span>
                                    </div>
                                    <div class="vital-chip">
                                        <span class="vital-label">Resp Rate</span>
                                        <span class="vital-val">${apt.vitals.respiratoryRate ? apt.vitals.respiratoryRate + '/m' : '—'}</span>
                                    </div>
                                    <div class="vital-chip">
                                        <span class="vital-label">Blood Sugar</span>
                                        <span class="vital-val">${apt.vitals.bloodSugar ? apt.vitals.bloodSugar + ' <small style="font-size: 0.65rem;">mg/dL</small>' : '—'}</span>
                                    </div>
                                    <div class="vital-chip">
                                        <span class="vital-label">Height &bull; Weight</span>
                                        <span class="vital-val" style="font-size: 0.82rem;">${apt.vitals.heightCm ? apt.vitals.heightCm + 'cm' : '—'} / ${apt.vitals.weightKg ? apt.vitals.weightKg + 'kg' : '—'}</span>
                                    </div>
                                    <div class="vital-chip">
                                        <span class="vital-label">BMI &bull; Pain (0-10)</span>
                                        <span class="vital-val" style="font-size: 0.82rem;">${apt.vitals.bmi ? apt.vitals.bmi : '—'} &bull; ${apt.vitals.painScore != null ? '<strong style="color: var(--danger);">' + apt.vitals.painScore + '</strong>/10' : '—'}</span>
                                    </div>
                                </div>
                                ${apt.vitals.triageNotes ? `
                                    <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 6px; font-style: italic;">
                                        <strong>Assistant Notes:</strong> "${apt.vitals.triageNotes}"
                                    </div>
                                ` : ''}
                            ` : `
                                <div style="padding: 1.2rem; text-align: center; color: var(--text-muted); font-size: 0.82rem;">
                                    <i class="fa-solid fa-hourglass-half" style="margin-bottom: 4px; display: block; font-size: 1.2rem; color: var(--warning);"></i>
                                    Awaiting assistant triage vitals entry
                                </div>
                            `}
                        </div>

                        <!-- Consultation Actions -->
                        <div style="display: flex; flex-direction: column; gap: 8px; min-width: 170px;">
                            <button type="button" class="btn btn-accent btn-sm" onclick="openPrescriptionModal('${apt.id}')">
                                <i class="fa-solid fa-file-prescription"></i> Write Prescription
                            </button>

                            <button type="button" class="btn btn-secondary btn-sm" onclick="openOrderTestModal('${apt.id}')">
                                <i class="fa-solid fa-flask-vial" style="color: var(--primary);"></i> Order Lab / X-Ray
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

                    <!-- Prescribed Diagnostics & Scans Accordion/Strip -->
                    ${aptOrders.length > 0 ? `
                        <div style="margin-top: 12px; padding: 10px 14px; background: var(--bg-app); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                            <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                                <span><i class="fa-solid fa-microscope" style="color: var(--accent);"></i> Prescribed Diagnostic Tests &amp; Imaging Reports (${aptOrders.length})</span>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                ${aptOrders.map(ord => {
                                    let ordStatusBadge = '<span class="status-badge status-ordered"><i class="fa-regular fa-clock"></i> Prescribed</span>';
                                    if (ord.status === 'SAMPLE_COLLECTED') ordStatusBadge = '<span class="status-badge status-sample-collected"><i class="fa-solid fa-vial"></i> Sample Collected</span>';
                                    else if (ord.status === 'REPORT_ATTACHED') ordStatusBadge = '<span class="status-badge status-report-attached"><i class="fa-solid fa-file-circle-check"></i> Report Attached</span>';
                                    else if (ord.status === 'COMPLETED') ordStatusBadge = '<span class="status-badge status-completed"><i class="fa-solid fa-circle-check"></i> Doctor Reviewed</span>';

                                    const safeOrdId = (ord.id || '').replace(/'/g, "\\'");

                                    return `
                                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--surface-card); border-radius: var(--radius-sm); border: 1px solid var(--border-color); flex-wrap: wrap; gap: 6px;">
                                            <div>
                                                <strong>${ord.testName}</strong> <span style="font-size: 0.74rem; color: var(--text-muted);">(${ord.category || 'Diagnostic'})</span>
                                                ${ordStatusBadge}
                                                ${ord.urgency === 'URGENT' || ord.urgency === 'STAT' ? '<span class="status-badge status-cancelled">URGENT</span>' : ''}
                                                ${ord.labFindings ? `<div style="font-size: 0.78rem; color: var(--status-completed); margin-top: 2px;"><strong>Findings:</strong> ${ord.labFindings}</div>` : ''}
                                            </div>
                                            <div style="display: flex; align-items: center; gap: 8px;">
                                                ${ord.reportDataUrl ? `
                                                    <a href="${ord.reportDataUrl}" target="_blank" class="report-preview-chip" style="margin: 0; padding: 3px 8px; font-size: 0.76rem;">
                                                        <i class="fa-solid fa-file-waveform"></i> View ${ord.reportFileName || 'Report'}
                                                    </a>
                                                ` : '<span style="font-size: 0.76rem; color: var(--text-muted); font-style: italic;">Awaiting Results</span>'}

                                                ${ord.status === 'REPORT_ATTACHED' ? `
                                                    <button type="button" class="btn btn-primary btn-sm" style="padding: 2px 8px; font-size: 0.76rem;" onclick="reviewTestOrder('${safeOrdId}')">
                                                        <i class="fa-solid fa-check-double"></i> Mark Reviewed
                                                    </button>
                                                ` : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${apt.prescriptionSummary ? `
                        <div style="margin-top: 10px; padding: 10px 14px; background: var(--primary-light); border-radius: var(--radius-sm); font-size: 0.84rem; border-left: 3px solid var(--primary); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong><i class="fa-solid fa-file-medical"></i> Prescription Notes:</strong> ${apt.prescriptionSummary}${apt.followUpIntervalDays ? `<span style="margin-left: 8px; font-weight: 600; color: var(--accent);">&bull; Follow-up in ${apt.followUpIntervalDays} days</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // Render Follow-Ups Due Tracker (strictly for this doctor)
    if (followUpsContainer) {
        const completedApts = list.filter(a => a.status === 'COMPLETED');
        if (completedApts.length === 0) {
            followUpsContainer.innerHTML = `<p style="font-size: 0.86rem; color: var(--text-muted); padding: 0.8rem 0;">No patient follow-ups currently due under your care.</p>`;
        } else {
            followUpsContainer.innerHTML = completedApts.map(apt => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <strong>${apt.patientName}</strong> (${apt.healthIssue || 'General'})
                        <div style="font-size: 0.78rem; color: var(--text-muted);">
                            Last Visit: ${apt.dayOfWeek || 'Recent'} &bull; Review Interval: <strong>${apt.followUpIntervalDays || 30} days</strong>
                        </div>
                    </div>
                    <button class="btn btn-outline-accent btn-sm" onclick="sendFollowUpReminder('${apt.patientName}')">
                        <i class="fa-solid fa-bell"></i> Notify Patient
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
    loadDoctorAppointments();
}

// --- PRESCRIPTION MODAL HANDLERS ---

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
    const currentUser = CuraAuth.getCurrentUser();

    const diagnosis = document.getElementById('rxDiagnosis').value.trim();
    const remedies = document.getElementById('rxRemedies').value.trim();
    const instructions = document.getElementById('rxInstructions').value.trim();
    const diet = document.getElementById('rxDiet').value.trim();
    const followUpDays = parseInt(document.getElementById('rxFollowUpDays').value) || 30;

    const rx = {
        id: "rx-" + Date.now(),
        appointmentId: activeAppointmentForRx.id,
        patientName: activeAppointmentForRx.patientName,
        patientEmail: activeAppointmentForRx.patientEmail || null,
        patientId: activeAppointmentForRx.patientId || null,
        doctorId: currentUser ? currentUser.uid : null,
        doctorEmail: currentUser ? currentUser.email : activeAppointmentForRx.doctorEmail,
        doctorName: currentUser ? currentUser.fullName : activeAppointmentForRx.doctorName,
        specialization: activeAppointmentForRx.specialization || (currentUser ? currentUser.specialization : 'General'),
        date: new Date().toISOString().split('T')[0],
        diagnosis,
        remediesOrMedicines: remedies,
        dosageInstructions: instructions,
        dietaryLifestyleAdvice: diet,
        followUpIntervalDays: followUpDays,
        createdAt: new Date().toISOString()
    };

    await CuraData.addPrescription(rx);

    await CuraData.updateAppointment(activeAppointmentForRx.id, {
        status: 'COMPLETED',
        prescriptionSummary: `${diagnosis} — ${remedies}`,
        followUpIntervalDays: followUpDays,
        completedAt: new Date().toISOString()
    });

    showToast(`Prescription saved! Follow-up in ${followUpDays} days.`, 'success');
    closePrescriptionModal();
    loadDoctorAppointments();
}

function sendFollowUpReminder(patientName) {
    showToast(`Follow-up notification sent to ${patientName}!`, 'accent');
}

// --- DIAGNOSTIC / LAB / X-RAY ORDERING MODAL HANDLERS ---

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
        doctorId: currentUser ? currentUser.uid : null,
        doctorEmail: currentUser ? currentUser.email : 'ashwini.joshi@cura.clinic',
        doctorName: currentUser ? (currentUser.fullName || currentUser.email) : 'Physician',
        category: category,
        testName: testName,
        urgency: urgency,
        instructions: instructions || null,
        status: 'ORDERED',
        orderedAt: new Date().toISOString()
    };

    try {
        await CuraData.addTestOrder(order);
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
        await CuraData.updateTestOrder(orderId, {
            status: 'COMPLETED',
            doctorReviewedAt: new Date().toISOString()
        });
        showToast('Investigation report marked as reviewed by physician.', 'success');
        await loadDoctorAppointments();
    } catch (err) {
        console.error("Error reviewing test order:", err);
        showToast('Failed to update status: ' + err.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', loadDoctorAppointments);