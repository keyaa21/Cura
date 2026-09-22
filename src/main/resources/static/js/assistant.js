/**
 * CURA - Assistant Triage Station Logic
 * Records patient vitals (BP, Temperature, Pulse, Oxygen), handles triage queue,
 * and enables quick walk-in patient check-in with Firebase Firestore integration.
 */

async function loadAssistantTriageData() {
    // 1. FETCH APPOINTMENTS (ASYNC FIRESTORE / LOCAL CACHE)
    let appointments = await CuraData.fetchAppointments();
    const selectEl = document.getElementById('patientSelect');
    const tableBody = document.getElementById('queueTableBody');
    
    // 2. ROLE-BASED FILTERING
    const currentUser = CuraAuth.getCurrentUser();
    if (currentUser && currentUser.role === 'ASSISTANT') {
        // Filter by assistant's assigned clinic specialization if specified
        if (currentUser.specialization && currentUser.specialization !== 'Clinical Triage') {
            appointments = appointments.filter(apt => 
                apt.specialization && 
                apt.specialization.toLowerCase() === currentUser.specialization.toLowerCase()
            );
        }
    }
    // Note: If currentUser.role === 'ADMIN', no role filter is applied and admin sees all queues.
    
    // 3. POPULATE PATIENT SELECT DROPDOWN
    if (selectEl) {
        selectEl.innerHTML = `
            <option value="">-- Select Arrived Patient --</option>
            ${appointments.map(apt => `
                <option value="${apt.id}">
                    ${apt.patientName} (${apt.dayOfWeek} &bull; ${apt.timeSlot}) -${apt.healthIssue || 'General'}
                </option>
            `).join('')}
        `;
    }

    // 4. POPULATE QUEUE TABLE
    if (tableBody) {
        if (appointments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No patients in queue today.</td></tr>`;
            return;
        }

        tableBody.innerHTML = appointments.map(apt => {
            const hasVitals = apt.vitals != null;
            let statusBadge = hasVitals 
                ? '<span class="status-badge status-ongoing"><i class="fa-solid fa-check"></i> Ready for Doctor</span>'
                : '<span class="status-badge status-booked"><i class="fa-solid fa-clock"></i> Waiting Triage</span>';

            if (apt.status === 'COMPLETED') {
                statusBadge = '<span class="status-badge status-completed"><i class="fa-solid fa-circle-check"></i> Completed</span>';
            }

            return `
                <tr>
                    <td>
                        <strong>${apt.patientName}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Phone: ${apt.patientPhone || 'N/A'}</div>
                    </td>
                    <td>
                        ${apt.doctorName}
                        <div style="font-size: 0.78rem; color: var(--accent-peach);">${apt.specialization || ''}</div>
                    </td>
                    <td>
                        <span class="followup-pill">${apt.healthIssue || 'General'}</span>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">
                            ${apt.dayOfWeek} at ${apt.timeSlot} (⏱️ ${apt.allocatedDurationMinutes || 30}m)
                        </div>
                    </td>
                    <td>
                        ${hasVitals ? `
                            <div style="font-size: 0.85rem;">
                                <strong>${apt.vitals.bloodPressure}</strong> mmHg &bull; ${apt.vitals.temperature}°F &bull; ${apt.vitals.pulseRate} bpm
                            </div>
                            ${apt.vitals.triageNotes ? `<div style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">${apt.vitals.triageNotes}</div>` : ''}
                        ` : `
                            <span style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">Pending vitals entry</span>
                        `}
                    </td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }).join('');
    }
}

async function handleTriageSubmit(e) {
    e.preventDefault();

    const selectedId = document.getElementById('patientSelect').value;
    const bp = document.getElementById('vitalsBP').value.trim();
    const temp = parseFloat(document.getElementById('vitalsTemp').value) || 98.6;
    const pulse = parseInt(document.getElementById('vitalsPulse').value) || 72;
    const oxygen = parseFloat(document.getElementById('vitalsOxygen').value) || 99.0;
    const notes = document.getElementById('vitalsNotes').value.trim();

    if (!selectedId) {
        showToast('Please select a patient from the schedule', 'error');
        return;
    }

    const vitals = {
        bloodPressure: bp,
        temperature: temp,
        pulseRate: pulse,
        bloodOxygen: oxygen,
        triageNotes: notes,
        recordedBy: 'Clinical Assistant',
        recordedAt: new Date().toISOString()
    };

    // Save vitals and route patient to Doctor consultation in Firestore
    await CuraData.updateAppointment(selectedId, {
        vitals: vitals,
        status: 'ONGOING' // Route to doctor consultation queue
    });

    showToast('Vitals recorded! Patient routed to Doctor queue.', 'success');
    document.getElementById('triageForm').reset();
    await loadAssistantTriageData();
}

async function handleWalkInSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('walkinName').value.trim();
    const phone = document.getElementById('walkinPhone').value.trim();
    const doctor = document.getElementById('walkinDoctor').value;
    const issue = document.getElementById('walkinIssue').value;
    const isFirst = document.getElementById('walkinFirstTime').checked;

    if (!name) {
        showToast('Please enter patient name', 'error');
        return;
    }

    const duration = isFirst ? 60 : (issue === 'ACUTE' ? 30 : 45);

    const walkInApt = {
        id: String(Date.now()),
        patientName: name + ' (Walk-In)',
        patientPhone: phone || '+91 9800000000',
        doctorName: doctor,
        specialization: doctor.includes('Ashwini') ? 'Homoeopathy' : doctor.includes('Priya') ? 'Psychology' : 'Allopathy',
        dayOfWeek: 'Today',
        timeSlot: 'Immediate (Walk-In)',
        allocatedDurationMinutes: duration,
        healthIssue: issue,
        firstTimePatient: isFirst,
        groupSize: 1,
        symptomsDescription: 'Direct clinic walk-in triage',
        status: 'BOOKED',
        vitals: null,
        followUpIntervalDays: 30,
        createdAt: new Date().toISOString()
    };

    // Save new walk-in appointment to Firebase Cloud Firestore
    await CuraData.addAppointment(walkInApt);
    showToast(`Walk-in patient ${name} registered into triage queue!`, 'success');
    document.getElementById('walkinForm').reset();
    await loadAssistantTriageData();
}

document.addEventListener('DOMContentLoaded', loadAssistantTriageData);