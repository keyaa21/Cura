/**
 * CURA - Assistant Triage Station Logic
 * Doctor-Specific Scoping: Assistant strictly views and manages triage intake
 * for their designated physician (linked via doctorEmail).
 */

CuraAuth.guard(['ASSISTANT', 'ADMIN']);

let assignedDoctorEmail = null;
let activeAssistantLabFile = null;

// BMI Auto-Calculation Helper
function calculateTriageBMI() {
    const height = parseFloat(document.getElementById('vitalsHeight')?.value) || 0;
    const weight = parseFloat(document.getElementById('vitalsWeight')?.value) || 0;
    const badge = document.getElementById('triageBmiBadge');
    if (!badge) return null;

    if (height > 0 && weight > 0) {
        const heightM = height / 100;
        const bmi = weight / (heightM * heightM);
        let category = 'Normal';
        let color = 'var(--primary)';

        if (bmi < 18.5) {
            category = 'Underweight';
            color = 'var(--warning)';
        } else if (bmi < 25.0) {
            category = 'Normal';
            color = 'var(--status-completed)';
        } else if (bmi < 30.0) {
            category = 'Overweight';
            color = 'var(--warning)';
        } else {
            category = 'Obese';
            color = 'var(--danger)';
        }

        badge.innerHTML = `<span style="color: ${color}; font-weight: 700;">${bmi.toFixed(1)} kg/m²</span> (${category})`;
        return parseFloat(bmi.toFixed(1));
    } else {
        badge.textContent = '—';
        return null;
    }
}

// Pain Scale Selector Helper
function selectPainScore(score) {
    const input = document.getElementById('vitalsPainScore');
    if (input) input.value = score;
    const btns = document.querySelectorAll('#painPicker .pain-btn');
    btns.forEach(btn => {
        if (parseInt(btn.getAttribute('data-val')) === score) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

async function loadAssistantTriageData() {
    let currentUser = CuraAuth.getCurrentUser();
    const selectEl = document.getElementById('patientSelect');
    const tableBody = document.getElementById('queueTableBody');
    const doctorScopeBadge = document.getElementById('doctorScopeBadge');
    const walkinDoctorInput = document.getElementById('walkinDoctor');

    if (!currentUser) return;

    // Check if assistant user doc has doctorEmail in Firestore if missing in localStorage
    if (currentUser.role === 'ASSISTANT' && !currentUser.doctorEmail) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                let doc = await CuraFirebase.db().collection('users').doc(currentUser.uid).get();
                if (!doc.exists && currentUser.email) {
                    doc = await CuraFirebase.db().collection('users').doc(currentUser.email.toLowerCase()).get();
                }
                if (doc.exists && doc.data().doctorEmail) {
                    currentUser.doctorEmail = doc.data().doctorEmail;
                    CuraAuth.setUser(currentUser);
                }
            } catch (e) {
                console.warn("Could not fetch assistant doc relation:", e);
            }
        }
    }

    assignedDoctorEmail = currentUser.doctorEmail || 'ashwini.joshi@cura.clinic';

    if (doctorScopeBadge) {
        if (currentUser.role === 'ADMIN') {
            doctorScopeBadge.innerHTML = `<i class="fa-solid fa-crown" style="color: var(--warning);"></i> Admin Oversight: Viewing All Physicians`;
        } else {
            doctorScopeBadge.innerHTML = `<i class="fa-solid fa-user-doctor" style="color: var(--primary);"></i> Assisting Doctor: <strong>${assignedDoctorEmail}</strong>`;
        }
    }

    if (walkinDoctorInput && currentUser.role === 'ASSISTANT') {
        walkinDoctorInput.value = assignedDoctorEmail;
    }

    // Role-based filtering: Assistant ONLY sees appointments for their specific doctor
    let appointments = [];
    if (currentUser.role === 'ASSISTANT') {
        appointments = await CuraData.fetchAppointmentsByDoctor(assignedDoctorEmail);
    } else {
        // Admin sees all
        appointments = await CuraData.fetchAppointments();
    }

    // Populate Patient Select Dropdown for Vitals Recording
    if (selectEl) {
        if (appointments.length === 0) {
            selectEl.innerHTML = `<option value="">-- No scheduled patients found --</option>`;
        } else {
            selectEl.innerHTML = `
                <option value="">-- Select Arrived Patient for Vitals --</option>
                ${appointments.map(apt => `
                    <option value="${apt.id}">
                        ${apt.patientName} (${apt.dayOfWeek || 'Today'} &bull; ${apt.timeSlot}) — ${apt.healthIssue || 'General'}
                    </option>
                `).join('')}
            `;
        }
    }

    // Populate Queue Table
    if (tableBody) {
        if (appointments.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
                        <i class="fa-solid fa-user-clock" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 8px; display: block;"></i>
                        No scheduled patients currently in queue for <strong>${assignedDoctorEmail}</strong>.
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = appointments.map(apt => {
                const hasVitals = apt.vitals != null;
                let statusBadge = hasVitals 
                    ? '<span class="status-badge status-ongoing"><i class="fa-solid fa-check"></i> Ready for Doctor</span>'
                    : '<span class="status-badge status-booked"><i class="fa-solid fa-clock"></i> Waiting Triage</span>';

                if (apt.status === 'COMPLETED') {
                    statusBadge = '<span class="status-badge status-completed"><i class="fa-solid fa-circle-check"></i> Completed</span>';
                } else if (apt.status === 'CANCELLED') {
                    statusBadge = '<span class="status-badge status-cancelled">Cancelled</span>';
                }

                return `
                    <tr>
                        <td>
                            <strong>${apt.patientName}</strong>
                            <div style="font-size: 0.78rem; color: var(--text-muted);">Phone: ${apt.patientPhone || apt.patientEmail || 'N/A'}</div>
                            ${apt.allergies ? `<span class="allergy-alert-badge" style="margin-top: 4px; font-size: 0.72rem; padding: 2px 6px;"><i class="fa-solid fa-triangle-exclamation"></i> Allergy: ${apt.allergies}</span>` : ''}
                        </td>
                        <td>
                            ${apt.doctorName || assignedDoctorEmail}
                            <div style="font-size: 0.75rem; color: var(--accent);">${apt.specialization || 'Clinical Care'}</div>
                        </td>
                        <td>
                            <span class="followup-pill">${apt.healthIssue || 'General'}</span>
                            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 3px;">
                                ${apt.dayOfWeek || 'Today'} at ${apt.timeSlot} (⏱️ ${apt.allocatedDurationMinutes || 30}m)
                            </div>
                        </td>
                        <td>
                            ${hasVitals ? `
                                <div style="font-size: 0.82rem; line-height: 1.45;">
                                    <strong>BP:</strong> ${apt.vitals.bloodPressure || '—'} mmHg &bull; <strong>Temp:</strong> ${apt.vitals.temperature ? apt.vitals.temperature + '°F' : '—'}
                                    <div style="color: var(--text-secondary); font-size: 0.76rem;">
                                        Pulse: ${apt.vitals.pulseRate || '—'} bpm &bull; SpO2: ${apt.vitals.bloodOxygen || '—'}% &bull; RR: ${apt.vitals.respiratoryRate || '—'}/m
                                    </div>
                                    <div style="color: var(--text-secondary); font-size: 0.76rem;">
                                        BMI: ${apt.vitals.bmi ? apt.vitals.bmi + ' kg/m²' : '—'} &bull; Glucose: ${apt.vitals.bloodSugar ? apt.vitals.bloodSugar + ' mg/dL' : '—'} &bull; Pain: ${apt.vitals.painScore != null ? apt.vitals.painScore + '/10' : '—'}
                                    </div>
                                </div>
                                ${apt.vitals.triageNotes ? `<div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic; margin-top: 2px;">Note: ${apt.vitals.triageNotes}</div>` : ''}
                            ` : `
                                <span style="font-size: 0.78rem; color: var(--warning); font-weight: 500;">
                                    <i class="fa-solid fa-triangle-exclamation"></i> Vitals pending entry
                                </span>
                            `}
                        </td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Also load diagnostic lab orders for this assigned doctor
    await loadAssistantTestOrders();
}

async function handleTriageSubmit(e) {
    e.preventDefault();

    const selectedId = document.getElementById('patientSelect').value;
    const bp = document.getElementById('vitalsBP').value.trim();
    const temp = parseFloat(document.getElementById('vitalsTemp').value) || 98.6;
    const pulse = parseInt(document.getElementById('vitalsPulse').value) || 72;
    const oxygen = parseFloat(document.getElementById('vitalsOxygen').value) || 99.0;
    const respRate = parseInt(document.getElementById('vitalsRespRate')?.value) || 16;
    const glucose = parseFloat(document.getElementById('vitalsGlucose')?.value) || null;
    const height = parseFloat(document.getElementById('vitalsHeight')?.value) || null;
    const weight = parseFloat(document.getElementById('vitalsWeight')?.value) || null;
    const bmi = calculateTriageBMI();
    const pain = parseInt(document.getElementById('vitalsPainScore')?.value) || 0;
    const notes = document.getElementById('vitalsNotes').value.trim();

    if (!selectedId) {
        showToast('Please select a scheduled patient from the list', 'error');
        return;
    }

    const currentUser = CuraAuth.getCurrentUser();

    const vitals = {
        bloodPressure: bp || '120/80',
        temperature: temp,
        pulseRate: pulse,
        bloodOxygen: oxygen,
        respiratoryRate: respRate,
        bloodSugar: glucose,
        heightCm: height,
        weightKg: weight,
        bmi: bmi,
        painScore: pain,
        triageNotes: notes,
        recordedBy: currentUser ? (currentUser.fullName || currentUser.email) : 'Assistant',
        recordedAt: new Date().toISOString()
    };

    // Update appointment status to ONGOING (routed to doctor)
    await CuraData.updateAppointment(selectedId, {
        vitals: vitals,
        status: 'ONGOING'
    });

    showToast('Triage vitals recorded! Patient routed to Doctor consultation queue.', 'success');
    document.getElementById('triageForm').reset();
    calculateTriageBMI();
    await loadAssistantTriageData();
}

async function handleWalkInSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('walkinName').value.trim();
    const phone = document.getElementById('walkinPhone').value.trim();
    const issue = document.getElementById('walkinIssue').value;
    const isFirst = document.getElementById('walkinFirstTime').checked;

    if (!name) {
        showToast('Please enter patient name', 'error');
        return;
    }

    const currentUser = CuraAuth.getCurrentUser();
    const duration = isFirst ? 60 : (issue === 'ACUTE' ? 30 : 45);

    const walkInApt = {
        id: "apt-" + Date.now(),
        patientName: name + ' (Walk-In)',
        patientPhone: phone || '+91 9800000000',
        doctorEmail: assignedDoctorEmail,
        doctorName: assignedDoctorEmail.split('@')[0].replace('.', ' '),
        specialization: 'Clinical Practice',
        dayOfWeek: 'Today',
        timeSlot: 'Immediate (Walk-In)',
        allocatedDurationMinutes: duration,
        healthIssue: issue,
        firstTimePatient: isFirst,
        groupSize: 1,
        symptomsDescription: 'Immediate triage intake by clinic assistant',
        status: 'BOOKED',
        vitals: null,
        followUpIntervalDays: 30,
        createdAt: new Date().toISOString()
    };

    await CuraData.addAppointment(walkInApt);
    showToast(`Walk-in patient ${name} registered for ${assignedDoctorEmail}!`, 'success');
    document.getElementById('walkinForm').reset();
    await loadAssistantTriageData();
}

// --- DIAGNOSTIC ORDERS & LAB WORKSTATION LOGIC ---

async function loadAssistantTestOrders() {
    const currentUser = CuraAuth.getCurrentUser();
    const tableBody = document.getElementById('assistantTestOrdersBody');
    if (!tableBody) return;

    let orders = [];
    if (currentUser && currentUser.role === 'ASSISTANT' && assignedDoctorEmail) {
        orders = await CuraData.fetchTestOrdersByDoctor(assignedDoctorEmail);
    } else {
        // Admin or fallback sees all
        orders = await CuraData.fetchTestOrders();
    }

    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2.2rem 1rem; color: var(--text-muted);">
                    <i class="fa-solid fa-flask" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 8px; display: block;"></i>
                    No lab investigations or diagnostic imaging orders currently active for <strong>${assignedDoctorEmail || 'this practice'}</strong>.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = orders.map(ord => {
        let statusBadge = '<span class="status-badge status-ordered"><i class="fa-regular fa-clock"></i> Prescribed</span>';
        if (ord.status === 'SAMPLE_COLLECTED') {
            statusBadge = '<span class="status-badge status-sample-collected"><i class="fa-solid fa-vial"></i> Sample Collected</span>';
        } else if (ord.status === 'REPORT_ATTACHED') {
            statusBadge = '<span class="status-badge status-report-attached"><i class="fa-solid fa-file-circle-check"></i> Report Attached</span>';
        } else if (ord.status === 'COMPLETED') {
            statusBadge = '<span class="status-badge status-completed"><i class="fa-solid fa-circle-check"></i> Doctor Reviewed</span>';
        }

        const safeId = (ord.id || '').replace(/'/g, "\\'");
        const safeTestName = (ord.testName || 'Investigation').replace(/'/g, "\\'");
        const safePatientName = (ord.patientName || 'Patient').replace(/'/g, "\\'");

        return `
            <tr>
                <td>
                    <strong>${ord.patientName}</strong>
                    <div style="font-size: 0.76rem; color: var(--text-muted);">${ord.patientEmail || ord.patientPhone || 'ID: ' + (ord.patientId || 'N/A')}</div>
                </td>
                <td>
                    <strong style="color: var(--text-primary);"><i class="fa-solid fa-vial-virus" style="color: var(--accent);"></i> ${ord.testName}</strong>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">${ord.category || 'General'}</div>
                </td>
                <td>
                    <span class="status-badge ${ord.urgency === 'URGENT' || ord.urgency === 'STAT' ? 'status-cancelled' : 'status-booked'}">
                        ${ord.urgency || 'ROUTINE'}
                    </span>
                    <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 3px;">
                        Ordered: ${ord.orderedAt ? ord.orderedAt.split('T')[0] : 'Today'}
                    </div>
                </td>
                <td>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); max-width: 260px;">
                        ${ord.instructions ? `<em>"${ord.instructions}"</em>` : '<span style="color: var(--text-muted);">None</span>'}
                    </div>
                    ${ord.labFindings ? `
                        <div style="margin-top: 4px; font-size: 0.76rem; color: var(--status-completed); font-weight: 500;">
                            <strong>Findings:</strong> ${ord.labFindings}
                        </div>
                    ` : ''}
                </td>
                <td>
                    ${statusBadge}
                    ${ord.reportDataUrl ? `
                        <div style="margin-top: 4px;">
                            <a href="${ord.reportDataUrl}" target="_blank" class="report-preview-chip" style="font-size: 0.74rem; padding: 2px 8px;">
                                <i class="fa-solid fa-paperclip"></i> View Report
                            </a>
                        </div>
                    ` : ''}
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        ${ord.status === 'ORDERED' ? `
                            <button type="button" class="btn btn-secondary btn-sm" onclick="markSampleCollected('${safeId}')" title="Mark Sample Collected">
                                <i class="fa-solid fa-vial"></i> Collected
                            </button>
                        ` : ''}
                        <button type="button" class="btn btn-primary btn-sm" onclick="openAttachLabModal('${safeId}', '${safeTestName}', '${safePatientName}')">
                            <i class="fa-solid fa-file-waveform"></i> ${ord.reportDataUrl || ord.labFindings ? 'Edit Report' : 'Attach Report'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function markSampleCollected(orderId) {
    try {
        await CuraData.updateTestOrder(orderId, {
            status: 'SAMPLE_COLLECTED',
            sampleCollectedAt: new Date().toISOString()
        });
        showToast('Sample marked as collected for processing.', 'success');
        await loadAssistantTestOrders();
    } catch (e) {
        console.error("Error marking sample collected:", e);
        showToast('Failed to update order: ' + e.message, 'error');
    }
}

function openAttachLabModal(orderId, testName, patientName) {
    document.getElementById('labOrderId').value = orderId;
    document.getElementById('labModalTestName').textContent = testName;
    document.getElementById('labModalPatientInfo').textContent = 'Patient: ' + patientName;
    document.getElementById('labFindings').value = '';
    document.getElementById('labFileInput').value = '';
    document.getElementById('labFileNameDisplay').style.display = 'none';
    activeAssistantLabFile = null;

    const modal = document.getElementById('attachLabModal');
    if (modal) modal.classList.add('active');
}

function closeAttachLabModal() {
    const modal = document.getElementById('attachLabModal');
    if (modal) modal.classList.remove('active');
    activeAssistantLabFile = null;
}

function handleAssistantFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('File size exceeds 5MB limit. Please choose a smaller file.', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        activeAssistantLabFile = {
            dataUrl: e.target.result,
            fileName: file.name,
            fileType: file.type
        };
        document.getElementById('labFileNameText').textContent = file.name;
        document.getElementById('labFileNameDisplay').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function handleAssistantReportSubmit(event) {
    event.preventDefault();
    const orderId = document.getElementById('labOrderId').value;
    const findings = document.getElementById('labFindings').value.trim();
    const currentUser = CuraAuth.getCurrentUser();

    if (!orderId) {
        showToast('Missing order reference', 'error');
        return;
    }

    if (!findings && !activeAssistantLabFile) {
        showToast('Please provide clinical findings or attach a report document/scan', 'error');
        return;
    }

    const updates = {
        status: 'REPORT_ATTACHED',
        labFindings: findings || null,
        resultsRecordedAt: new Date().toISOString(),
        recordedBy: currentUser ? (currentUser.fullName || currentUser.email) : 'Assistant'
    };

    if (activeAssistantLabFile) {
        updates.reportDataUrl = activeAssistantLabFile.dataUrl;
        updates.reportFileName = activeAssistantLabFile.fileName;
        updates.reportFileType = activeAssistantLabFile.fileType;
    }

    try {
        await CuraData.updateTestOrder(orderId, updates);
        showToast('Diagnostic findings & report saved! Physician notified.', 'success');
        closeAttachLabModal();
        await loadAssistantTestOrders();
    } catch (err) {
        console.error("Error saving lab report:", err);
        showToast('Failed to save lab report: ' + err.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    calculateTriageBMI();
    loadAssistantTriageData();
});