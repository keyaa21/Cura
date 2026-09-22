/**
 * CURA - Core Application Logic & Database Adapter
 * Handles Theme Management, Toast Notifications, Role Access Guards,
 * and Firebase Cloud Firestore Data Synchronization with Dual Document Lookup.
 */

// --- THEME CONTROLLER ---
(function initTheme() {
    const savedTheme = localStorage.getItem('cura_theme') || 
         (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cura_theme', next);
    updateThemeIcons(next);
}

function updateThemeIcons(theme) {
    document.querySelectorAll('.theme-toggle-btn i').forEach(icon => {
        icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `cura-toast ${type === 'peach' || type === 'accent' ? 'toast-peach' : ''} ${type === 'error' ? 'toast-error' : ''}`;
    let iconClass = type === 'error' ? 'fa-circle-exclamation' : (type === 'peach' || type === 'accent' ? 'fa-bell' : 'fa-check-circle');
    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// --- AUTHENTICATION & ROLE ACCESS ---
const CuraAuth = {
    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('cura_user')) || null;
        } catch (e) {
            return null;
        }
    },
    setUser(user) {
        localStorage.setItem('cura_user', JSON.stringify(user));
    },
    logout() {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.auth()) {
            CuraFirebase.auth().signOut().catch(e => console.warn(e));
        }
        localStorage.removeItem('cura_user');
        showToast('Logged out successfully', 'accent');
        setTimeout(() => { window.location.href = 'index.html'; }, 300);
    },
    redirectBasedOnRole(role) {
        switch ((role || '').toUpperCase()) {
            case 'DOCTOR': window.location.href = 'doctor-dashboard.html'; break;
            case 'ASSISTANT': window.location.href = 'assistant-dashboard.html'; break;
            case 'PATIENT': window.location.href = 'patient-dashboard.html'; break;
            case 'ADMIN':
            default: window.location.href = 'dashboard.html'; break;
        }
    },
    guard(allowedRoles) {
        const user = this.getCurrentUser();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        if (user.role === 'ADMIN') return; // Admin can access all portals
        if (!allowedRoles.includes(user.role)) {
            this.redirectBasedOnRole(user.role);
        }
    }
};

// --- DATA SERVICE (FIRESTORE DATABASE ADAPTER) ---
let localAppointmentsCache = [];
let localPrescriptionsCache = [];
let localTestOrdersCache = [];

const CuraData = {
    async fetchAppointments() {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                const snapshot = await CuraFirebase.db().collection('appointments').get();
                localAppointmentsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort by date/createdAt descending
                localAppointmentsCache.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
                localStorage.setItem('cura_appointments', JSON.stringify(localAppointmentsCache));
                return localAppointmentsCache;
            } catch (e) {
                console.error("Firestore fetch error:", e);
            }
        }
        const stored = localStorage.getItem('cura_appointments');
        localAppointmentsCache = stored ? JSON.parse(stored) : [];
        return localAppointmentsCache;
    },

    getAppointments() {
        return localAppointmentsCache;
    },

    async fetchAppointmentsByDoctor(doctorIdentifier) {
        const all = await this.fetchAppointments();
        if (!doctorIdentifier) return all;
        const target = doctorIdentifier.toLowerCase().trim();

        return all.filter(apt => {
            const docId = (apt.doctorId || '').toLowerCase().trim();
            const docEmail = (apt.doctorEmail || '').toLowerCase().trim();
            const docName = (apt.doctorName || '').toLowerCase().trim();
            return docId === target || docEmail === target || (docName && target.includes(docName)) || (docName && docName.includes(target));
        });
    },

    async fetchAppointmentsByPatient(patientIdentifier) {
        const all = await this.fetchAppointments();
        if (!patientIdentifier) return all;
        const target = patientIdentifier.toLowerCase().trim();

        return all.filter(apt => {
            const pId = (apt.patientId || '').toLowerCase().trim();
            const pEmail = (apt.patientEmail || '').toLowerCase().trim();
            const pName = (apt.patientName || '').toLowerCase().trim();
            return pId === target || pEmail === target || (pName && target.includes(pName)) || (pName && pName.includes(target));
        });
    },

    async addAppointment(apt) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                await CuraFirebase.db().collection('appointments').doc(apt.id).set(apt);
            } catch (e) {
                console.error("Firestore save appointment error:", e);
            }
        }
        localAppointmentsCache.unshift(apt);
        localStorage.setItem('cura_appointments', JSON.stringify(localAppointmentsCache));
        return apt;
    },

    async updateAppointment(id, updates) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                await CuraFirebase.db().collection('appointments').doc(id).update(updates);
            } catch (e) {
                console.error("Firestore update appointment error:", e);
            }
        }
        localAppointmentsCache = localAppointmentsCache.map(a => a.id === id ? { ...a, ...updates } : a);
        localStorage.setItem('cura_appointments', JSON.stringify(localAppointmentsCache));
    },

    async fetchPrescriptions() {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                const snapshot = await CuraFirebase.db().collection('prescriptions').get();
                localPrescriptionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                localStorage.setItem('cura_prescriptions', JSON.stringify(localPrescriptionsCache));
                return localPrescriptionsCache;
            } catch (e) {
                console.error("Firestore fetch prescriptions error:", e);
            }
        }
        const stored = localStorage.getItem('cura_prescriptions');
        localPrescriptionsCache = stored ? JSON.parse(stored) : [];
        return localPrescriptionsCache;
    },

    async fetchPrescriptionsByDoctor(doctorIdentifier) {
        const all = await this.fetchPrescriptions();
        if (!doctorIdentifier) return all;
        const target = doctorIdentifier.toLowerCase().trim();
        return all.filter(p => {
            const dId = (p.doctorId || '').toLowerCase().trim();
            const dEmail = (p.doctorEmail || '').toLowerCase().trim();
            const dName = (p.doctorName || '').toLowerCase().trim();
            return dId === target || dEmail === target || (dName && target.includes(dName)) || (dName && dName.includes(target));
        });
    },

    async fetchPrescriptionsByPatient(patientIdentifier) {
        const all = await this.fetchPrescriptions();
        if (!patientIdentifier) return all;
        const target = patientIdentifier.toLowerCase().trim();
        return all.filter(p => {
            const pId = (p.patientId || '').toLowerCase().trim();
            const pEmail = (p.patientEmail || '').toLowerCase().trim();
            const pName = (p.patientName || '').toLowerCase().trim();
            return pId === target || pEmail === target || (pName && target.includes(pName)) || (pName && pName.includes(target));
        });
    },

    async addPrescription(rx) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                await CuraFirebase.db().collection('prescriptions').doc(rx.id).set(rx);
            } catch (e) {
                console.error("Firestore save prescription error:", e);
            }
        }
        localPrescriptionsCache.unshift(rx);
        localStorage.setItem('cura_prescriptions', JSON.stringify(localPrescriptionsCache));
        return rx;
    },

    async deleteAppointment(id) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                await CuraFirebase.db().collection('appointments').doc(id).delete();
            } catch (e) {
                console.error("Firestore delete appointment error:", e);
            }
        }
        localAppointmentsCache = localAppointmentsCache.filter(a => a.id !== id);
        localStorage.setItem('cura_appointments', JSON.stringify(localAppointmentsCache));
    },

    async fetchPatients() {
        let patientsMap = new Map();

        // 1. Fetch from Firestore users collection
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                const snapshot = await CuraFirebase.db().collection('users').where('role', '==', 'PATIENT').get();
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const key = (data.email || doc.id).toLowerCase();
                    patientsMap.set(key, {
                        uid: doc.id,
                        fullName: data.fullName || data.name || key.split('@')[0],
                        email: data.email || doc.id,
                        phone: data.phone || data.phoneNumber || 'N/A',
                        createdAt: data.createdAt || new Date().toISOString()
                    });
                });
            } catch (e) {
                console.warn("Firestore fetchPatients error:", e);
            }
        }

        // 2. Also extract patients from appointments
        const apts = await this.fetchAppointments();
        apts.forEach(apt => {
            const email = (apt.patientEmail || apt.patientPhone || apt.patientName || '').toLowerCase().trim();
            if (email && !patientsMap.has(email)) {
                patientsMap.set(email, {
                    uid: apt.patientId || ('p-' + Math.abs(email.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0))),
                    fullName: apt.patientName || 'Patient',
                    email: apt.patientEmail || (email.includes('@') ? email : 'N/A'),
                    phone: apt.patientPhone || 'N/A',
                    createdAt: apt.createdAt || new Date().toISOString()
                });
            } else if (email && patientsMap.has(email)) {
                const existing = patientsMap.get(email);
                if (existing.phone === 'N/A' && apt.patientPhone) existing.phone = apt.patientPhone;
            }
        });

        // 3. Include default demo patient if not present
        if (!patientsMap.has("keya@example.com")) {
            patientsMap.set("keya@example.com", {
                uid: "pat-keya",
                fullName: "Keya Joshi",
                email: "keya@example.com",
                phone: "+91 98230 67890",
                createdAt: "2026-09-01T10:00:00Z"
            });
        }

        return Array.from(patientsMap.values());
    },

    async updatePatientContact(patientId, email, updates) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                if (patientId) {
                    await CuraFirebase.db().collection('users').doc(patientId).set(updates, { merge: true });
                }
                if (email) {
                    await CuraFirebase.db().collection('users').doc(email.toLowerCase()).set(updates, { merge: true });
                }
            } catch (e) {
                console.error("Firestore update patient error:", e);
            }
        }

        // Update in appointments cache as well
        let apts = await this.fetchAppointments();
        for (let apt of apts) {
            const matchesId = patientId && apt.patientId === patientId;
            const matchesEmail = email && apt.patientEmail && apt.patientEmail.toLowerCase() === email.toLowerCase();
            const matchesName = apt.patientName && apt.patientName.toLowerCase() === (updates.previousName || '').toLowerCase();
            if (matchesId || matchesEmail || matchesName) {
                const aptUpdates = {};
                if (updates.fullName) aptUpdates.patientName = updates.fullName;
                if (updates.email) aptUpdates.patientEmail = updates.email;
                if (updates.phone) aptUpdates.patientPhone = updates.phone;
                await this.updateAppointment(apt.id, aptUpdates);
            }
        }
    },

    async deletePatient(patientId, email, patientName) {
        // 1. Delete from Firestore users collection
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                if (patientId) {
                    await CuraFirebase.db().collection('users').doc(patientId).delete();
                }
                if (email) {
                    await CuraFirebase.db().collection('users').doc(email.toLowerCase()).delete();
                }
            } catch (e) {
                console.error("Firestore delete patient error:", e);
            }
        }

        // 2. Remove/Delete patient's appointments
        let apts = await this.fetchAppointments();
        for (let apt of apts) {
            const matchesId = patientId && apt.patientId === patientId;
            const matchesEmail = email && apt.patientEmail && apt.patientEmail.toLowerCase() === email.toLowerCase();
            const matchesName = patientName && apt.patientName && apt.patientName.toLowerCase() === patientName.toLowerCase();
            if (matchesId || matchesEmail || matchesName) {
                await this.deleteAppointment(apt.id);
            }
        }
    },

    async updateStaffMember(uid, origEmail, updates) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                if (uid) {
                    await CuraFirebase.db().collection('users').doc(uid).set(updates, { merge: true });
                }
                if (origEmail) {
                    await CuraFirebase.db().collection('users').doc(origEmail.toLowerCase()).set(updates, { merge: true });
                }
                if (updates.email && updates.email.toLowerCase() !== (origEmail || '').toLowerCase()) {
                    await CuraFirebase.db().collection('users').doc(updates.email.toLowerCase()).set(updates, { merge: true });
                }
            } catch (e) {
                console.error("Firestore update staff error:", e);
            }
        }

        // Update local storage staff cache
        let localStaff = JSON.parse(localStorage.getItem('cura_staff_accounts') || '[]');
        let updated = false;
        localStaff = localStaff.map(s => {
            if ((uid && s.uid === uid) || (origEmail && s.email.toLowerCase() === origEmail.toLowerCase())) {
                updated = true;
                return { ...s, ...updates };
            }
            return s;
        });
        if (!updated) {
            localStaff.push({ uid: uid || ('staff-' + Date.now()), ...updates });
        }
        localStorage.setItem('cura_staff_accounts', JSON.stringify(localStaff));
    },

    async deleteStaffMember(uid, email) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                if (uid) {
                    await CuraFirebase.db().collection('users').doc(uid).delete();
                }
                if (email) {
                    await CuraFirebase.db().collection('users').doc(email.toLowerCase()).delete();
                }
            } catch (e) {
                console.error("Firestore delete staff error:", e);
            }
        }

        // Remove from local staff cache
        let localStaff = JSON.parse(localStorage.getItem('cura_staff_accounts') || '[]');
        localStaff = localStaff.filter(s => {
            const matchesUid = uid && s.uid === uid;
            const matchesEmail = email && s.email && s.email.toLowerCase() === email.toLowerCase();
            return !matchesUid && !matchesEmail;
        });
        localStorage.setItem('cura_staff_accounts', JSON.stringify(localStaff));

        // Mark as deleted in localStorage so seed staff don't re-appear
        let deletedStaff = JSON.parse(localStorage.getItem('cura_deleted_staff') || '[]');
        if (email && !deletedStaff.includes(email.toLowerCase())) {
            deletedStaff.push(email.toLowerCase());
            localStorage.setItem('cura_deleted_staff', JSON.stringify(deletedStaff));
        }
    },

    async fetchTestOrders() {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                const snapshot = await CuraFirebase.db().collection('test_orders').get();
                localTestOrdersCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                localTestOrdersCache.sort((a, b) => (b.orderedAt || '').localeCompare(a.orderedAt || ''));
                localStorage.setItem('cura_test_orders', JSON.stringify(localTestOrdersCache));
                return localTestOrdersCache;
            } catch (e) {
                console.error("Firestore fetch test orders error:", e);
            }
        }
        const stored = localStorage.getItem('cura_test_orders');
        localTestOrdersCache = stored ? JSON.parse(stored) : [];
        return localTestOrdersCache;
    },

    async fetchTestOrdersByDoctor(doctorIdentifier) {
        const all = await this.fetchTestOrders();
        if (!doctorIdentifier) return all;
        const target = doctorIdentifier.toLowerCase().trim();
        return all.filter(o => {
            const dId = (o.doctorId || '').toLowerCase().trim();
            const dEmail = (o.doctorEmail || '').toLowerCase().trim();
            const dName = (o.doctorName || '').toLowerCase().trim();
            return dId === target || dEmail === target || (dName && target.includes(dName)) || (dName && dName.includes(target));
        });
    },

    async fetchTestOrdersByPatient(patientIdentifier) {
        const all = await this.fetchTestOrders();
        if (!patientIdentifier) return all;
        const target = patientIdentifier.toLowerCase().trim();
        return all.filter(o => {
            const pId = (o.patientId || '').toLowerCase().trim();
            const pEmail = (o.patientEmail || '').toLowerCase().trim();
            const pName = (o.patientName || '').toLowerCase().trim();
            return pId === target || pEmail === target || (pName && target.includes(pName)) || (pName && pName.includes(target));
        });
    },

    async addTestOrder(order) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                await CuraFirebase.db().collection('test_orders').doc(order.id).set(order);
            } catch (e) {
                console.error("Firestore save test order error:", e);
            }
        }
        localTestOrdersCache.unshift(order);
        localStorage.setItem('cura_test_orders', JSON.stringify(localTestOrdersCache));
        return order;
    },

    async updateTestOrder(id, updates) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                await CuraFirebase.db().collection('test_orders').doc(id).update(updates);
            } catch (e) {
                console.error("Firestore update test order error:", e);
            }
        }
        localTestOrdersCache = localTestOrdersCache.map(o => o.id === id ? { ...o, ...updates } : o);
        localStorage.setItem('cura_test_orders', JSON.stringify(localTestOrdersCache));
    },

    async deleteTestOrder(id) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                await CuraFirebase.db().collection('test_orders').doc(id).delete();
            } catch (e) {
                console.error("Firestore delete test order error:", e);
            }
        }
        localTestOrdersCache = localTestOrdersCache.filter(o => o.id !== id);
        localStorage.setItem('cura_test_orders', JSON.stringify(localTestOrdersCache));
    }
};

// Seed metadata mapping for default clinic staff
const DEFAULT_STAFF_METADATA = {
    "ashwini.joshi@cura.clinic": { fullName: "Dr. Ashwini Joshi", role: "DOCTOR", specialization: "Homoeopathy", doctorEmail: null },
    "aarav.sharma@cura.clinic": { fullName: "Dr. Aarav Sharma", role: "DOCTOR", specialization: "Allopathy", doctorEmail: null },
    "priya.gupta@cura.clinic": { fullName: "Dr. Priya Gupta", role: "DOCTOR", specialization: "Psychology", doctorEmail: null },
    "assistant@cura.clinic": { fullName: "Sister Maya Patel", role: "ASSISTANT", specialization: "Clinical Triage", doctorEmail: "ashwini.joshi@cura.clinic" },
    "admin@cura.clinic": { fullName: "Cura Clinic Admin", role: "ADMIN", specialization: "Administration", doctorEmail: null },
    "keya@example.com": { fullName: "Keya Joshi", role: "PATIENT", specialization: null, doctorEmail: null }
};

// Fallback inference for role assignment
function inferRoleFromEmail(email, defaultRole = 'PATIENT') {
    const e = (email || '').toLowerCase().trim();
    if (DEFAULT_STAFF_METADATA[e]) {
        return DEFAULT_STAFF_METADATA[e].role;
    }
    if (e.includes('doctor') || e.includes('ashwini') || e.includes('aarav') || e.includes('priya')) {
        return 'DOCTOR';
    }
    if (e.includes('assistant') || e.includes('maya')) {
        return 'ASSISTANT';
    }
    if (e.includes('admin')) {
        return 'ADMIN';
    }
    return defaultRole;
}

// --- DOM INITIALIZATION & AUTH HANDLER ---
document.addEventListener('DOMContentLoaded', () => {
    updateThemeIcons(document.documentElement.getAttribute('data-theme'));
    
    // Auto-fetch appointment records on page load
    CuraData.fetchAppointments();

    const authForm = document.getElementById('auth-form');
    if (authForm) {
        const toggleBtn = document.getElementById('toggle-btn');
        const nameField = document.getElementById('name-field');
        const formTitle = document.getElementById('form-title');
        const formSubtitle = document.getElementById('form-subtitle');
        const submitBtn = document.getElementById('submit-btn');
        const registrationNote = document.getElementById('registration-note');
        let isSignInMode = true;

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                isSignInMode = !isSignInMode;
                if (nameField) nameField.style.display = isSignInMode ? 'none' : 'block';
                if (registrationNote) registrationNote.style.display = isSignInMode ? 'none' : 'block';
                if (formTitle) formTitle.textContent = isSignInMode ? 'Sign In' : 'Patient Registration';
                if (formSubtitle) formSubtitle.textContent = isSignInMode 
                    ? 'Enter your credentials to access the clinic environment' 
                    : 'Create your personal patient account to book appointments';
                if (submitBtn) submitBtn.innerHTML = isSignInMode 
                    ? '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In' 
                    : '<i class="fa-solid fa-user-plus"></i> Create Account';
                toggleBtn.textContent = isSignInMode ? 'Register' : 'Back to Sign In';
            });
        }

        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('user-email').value.trim().toLowerCase();
            const password = document.getElementById('user-password').value;
            const fullName = document.getElementById('user-name') ? document.getElementById('user-name').value.trim() : '';

            const seedMeta = DEFAULT_STAFF_METADATA[email] || {};
            const targetRole = isSignInMode ? (seedMeta.role || inferRoleFromEmail(email, 'PATIENT')) : 'PATIENT';
            const targetFullName = fullName || seedMeta.fullName || email.split('@')[0];
            const targetDoctorEmail = seedMeta.doctorEmail || (targetRole === 'ASSISTANT' ? 'ashwini.joshi@cura.clinic' : null);
            const targetSpec = seedMeta.specialization || (targetRole === 'DOCTOR' ? 'General Medicine' : null);

            if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.auth()) {
                let cred = null;
                try {
                    if (isSignInMode) {
                        try {
                            cred = await CuraFirebase.auth().signInWithEmailAndPassword(email, password);
                        } catch (signInErr) {
                            // If user is not yet created in this Firebase Auth project, automatically provision the account!
                            if (signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/user-not-found') {
                                try {
                                    cred = await CuraFirebase.auth().createUserWithEmailAndPassword(email, password);
                                } catch (createErr) {
                                    if (createErr.code === 'auth/email-already-in-use') {
                                        showToast('Incorrect password for ' + email, 'error');
                                        return;
                                    }
                                    // If Firebase console does not have email/password enabled, fall through to mock login
                                    console.warn('Firebase user auto-provision failed:', createErr);
                                    loginLocalUser(email, targetFullName, targetRole, targetDoctorEmail, targetSpec);
                                    return;
                                }
                            } else {
                                throw signInErr;
                            }
                        }
                    } else {
                        // Registration mode: Patient account creation
                        try {
                            cred = await CuraFirebase.auth().createUserWithEmailAndPassword(email, password);
                        } catch (regErr) {
                            if (regErr.code === 'auth/email-already-in-use') {
                                showToast('An account with this email already exists. Please sign in.', 'error');
                                return;
                            }
                            throw regErr;
                        }
                    }

                    // Look up user document in Firestore
                    let userObj = null;
                    if (cred && cred.user) {
                        let userDoc = null;
                        if (CuraFirebase.db()) {
                            try {
                                userDoc = await CuraFirebase.db().collection('users').doc(cred.user.uid).get();
                                if (!userDoc.exists) {
                                    userDoc = await CuraFirebase.db().collection('users').doc(email).get();
                                }
                            } catch (docErr) {
                                console.warn('Firestore doc read error:', docErr);
                            }
                        }

                        if (userDoc && userDoc.exists) {
                            const data = userDoc.data();
                            userObj = {
                                uid: cred.user.uid,
                                email: email,
                                fullName: data.fullName || targetFullName,
                                role: data.role || targetRole,
                                doctorEmail: data.doctorEmail || targetDoctorEmail,
                                specialization: data.specialization || targetSpec
                            };
                        } else {
                            // Initialize document in Firestore
                            userObj = {
                                uid: cred.user.uid,
                                email: email,
                                fullName: targetFullName,
                                role: targetRole,
                                doctorEmail: targetDoctorEmail,
                                specialization: targetSpec,
                                createdAt: new Date().toISOString()
                            };
                            if (CuraFirebase.db()) {
                                CuraFirebase.db().collection('users').doc(cred.user.uid).set(userObj, { merge: true }).catch(err => console.warn(err));
                            }
                        }

                        CuraAuth.setUser(userObj);
                        showToast(`Welcome, ${userObj.fullName}!`, 'success');
                        setTimeout(() => CuraAuth.redirectBasedOnRole(userObj.role), 400);
                        return;
                    }
                } catch (err) {
                    console.error('Firebase Auth Exception:', err);
                    // If error is about invalid-credential or network/service, check if seed account
                    if (seedMeta.role) {
                        loginLocalUser(email, targetFullName, targetRole, targetDoctorEmail, targetSpec);
                        return;
                    }
                    showToast(err.message || 'Authentication error', 'error');
                    return;
                }
            }

            // Local Mock Login fallback
            loginLocalUser(email, targetFullName, targetRole, targetDoctorEmail, targetSpec);
        });
    }

    function loginLocalUser(email, fullName, role, doctorEmail, specialization) {
        const userObj = {
            uid: "local-" + Math.abs(email.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)),
            fullName: fullName,
            email: email,
            role: role,
            doctorEmail: doctorEmail,
            specialization: specialization
        };
        CuraAuth.setUser(userObj);
        showToast(`Welcome, ${userObj.fullName}! (${userObj.role})`, 'success');
        setTimeout(() => CuraAuth.redirectBasedOnRole(userObj.role), 400);
    }
});