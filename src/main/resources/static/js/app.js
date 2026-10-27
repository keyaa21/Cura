/**
 * CURA - Core Application Logic & Database Adapter
 * Handles Theme Management, Toast Notifications, Role Access Guards,
 * PWA Service Worker & Notifications, and Cloud Firestore Data Synchronization.
 * 
 * Authentication Flow:
 *   - Gmail-only registration with Firebase email verification
 *   - Unverified users are blocked at sign-in with a verification overlay
 *   - Staff accounts provisioned by admin also receive verification emails
 *   - Firestore permission errors are handled gracefully with local fallback
 */

// --- CONFIGURE YOUR PRIMARY ADMIN GMAIL ---
const ADMIN_EMAIL = 'jkeya2106@gmail.com';
const ADMIN_EMAILS = ['jkeya2106@gmail.com', 'joshikeya32@gmail.com', 'admin@cura.clinic'];
function isAdminEmail(email) {
    if (!email) return false;
    const clean = email.toLowerCase().trim();
    return ADMIN_EMAILS.includes(clean);
}

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
    toast.className = `cura-toast ${type === 'peach' ? 'toast-peach' : ''} ${type === 'error' ? 'toast-error' : ''}`;
    let iconClass = type === 'error' ? 'fa-circle-exclamation' : (type === 'peach' ? 'fa-bell' : 'fa-check-circle');
    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// --- PWA NOTIFICATION HELPER ---
async function enableNotifications() {
    if (!('Notification' in window)) {
        showToast('This browser does not support desktop notifications.', 'error');
        return;
    }
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showToast('Screen notifications enabled!', 'success');
        } else if (permission === 'denied') {
            showToast('Notification permission blocked by your browser settings.', 'error');
        }
    } catch (e) {
        console.error('Error requesting notification permission:', e);
    }
}
window.enableNotifications = enableNotifications;

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
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady()) {
            CuraFirebase.auth().signOut();
        }
        localStorage.removeItem('cura_user');
        showToast('Logged out successfully', 'peach');
        setTimeout(() => { window.location.href = 'index.html'; }, 400);
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
        if (user.role === 'ADMIN') return; // Admin retains access to all portals
        if (!allowedRoles.includes(user.role)) {
            this.redirectBasedOnRole(user.role);
        }
    }
};

// --- DATA SERVICE (FIRESTORE ADAPTER) ---
let localAppointmentsCache = [];
let localPrescriptionsCache = [];
let localTestOrdersCache = [];
let localUsersCache = [];

const CuraData = {
    // ── APPOINTMENTS ──
    async fetchAppointments() {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                if (typeof CuraFirebase.waitForAuth === 'function') {
                    await CuraFirebase.waitForAuth();
                }
                let snapshot;
                try {
                    snapshot = await CuraFirebase.db().collection('appointments').orderBy('createdAt', 'desc').get();
                } catch (orderErr) {
                    console.warn("Firestore orderBy failed, fetching un-ordered:", orderErr.message);
                    snapshot = await CuraFirebase.db().collection('appointments').get();
                }
                localAppointmentsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                localAppointmentsCache.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
                localStorage.setItem('cura_appointments', JSON.stringify(localAppointmentsCache));
                return localAppointmentsCache;
            } catch (e) {
                console.warn("Firestore fetch appointments error (falling back to localStorage):", e.message);
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
        return all.filter(a => {
            const dEmail = (a.doctorEmail || '').toLowerCase().trim();
            const dName = (a.doctorName || '').toLowerCase().trim();
            const dId = (a.doctorId || '').toLowerCase().trim();
            return dEmail === target || dId === target || (dName && (dName.includes(target) || target.includes(dName)));
        });
    },

    async fetchAppointmentsByPatient(patientIdentifier) {
        const all = await this.fetchAppointments();
        if (!patientIdentifier) return all;
        const target = patientIdentifier.toLowerCase().trim();
        return all.filter(a => {
            const pEmail = (a.patientEmail || '').toLowerCase().trim();
            const pName = (a.patientName || '').toLowerCase().trim();
            const pId = (a.patientId || '').toLowerCase().trim();
            return pEmail === target || pId === target || (pName && (pName.includes(target) || target.includes(pName)));
        });
    },

    async addAppointment(apt) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                await CuraFirebase.db().collection('appointments').doc(apt.id).set(apt);
            } catch (e) {
                console.warn("Firestore save appointment error (saved locally):", e.message);
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
                console.warn("Firestore update appointment error (updated locally):", e.message);
            }
        }
        localAppointmentsCache = localAppointmentsCache.map(a => a.id === id ? { ...a, ...updates } : a);
        localStorage.setItem('cura_appointments', JSON.stringify(localAppointmentsCache));
    },

    async deleteAppointment(id) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                await CuraFirebase.db().collection('appointments').doc(id).delete();
            } catch (e) {
                console.warn("Firestore delete appointment error:", e.message);
            }
        }
        localAppointmentsCache = localAppointmentsCache.filter(a => a.id !== id);
        localStorage.setItem('cura_appointments', JSON.stringify(localAppointmentsCache));
    },

    // ── USERS & ACCOUNTS (FIRESTORE FIRST) ──
    async fetchUsers() {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                if (typeof CuraFirebase.waitForAuth === 'function') {
                    await CuraFirebase.waitForAuth();
                }
                const snapshot = await CuraFirebase.db().collection('users').get();
                const usersMap = new Map();

                snapshot.docs.forEach(doc => {
                    const data = doc.data() || {};
                    const docId = doc.id;
                    const uid = data.uid || docId;
                    const email = (data.email || (docId.includes('@') ? docId : '')).toLowerCase().trim();

                    if (!email && !uid) return;

                    const key = email || uid;
                    const existing = usersMap.get(key);

                    // If existing doc was keyed by email and this one is keyed by UID, prefer UID
                    if (!existing || (!docId.includes('@') && existing.docId.includes('@'))) {
                        const rawRole = (data.role || (isAdminEmail(email) ? 'ADMIN' : 'PATIENT')).toUpperCase();
                        usersMap.set(key, {
                            id: uid,
                            uid: uid,
                            docId: docId,
                            fullName: data.fullName || data.name || (email ? email.split('@')[0] : 'User'),
                            name: data.fullName || data.name || (email ? email.split('@')[0] : 'User'),
                            email: email,
                            role: rawRole,
                            phoneNumber: data.phoneNumber || data.phone || 'N/A',
                            phone: data.phoneNumber || data.phone || 'N/A',
                            specialization: data.specialization || (rawRole === 'DOCTOR' ? 'General Practice' : (rawRole === 'ASSISTANT' ? 'Clinical Triage' : (rawRole === 'ADMIN' ? 'Clinic Administration' : ''))),
                            doctorEmail: data.doctorEmail || null,
                            createdAt: data.createdAt || new Date().toISOString(),
                            emailVerified: !!(data.emailVerified || data.adminVerified),
                            adminVerified: !!data.adminVerified,
                            favoriteDoctors: data.favoriteDoctors || []
                        });
                    } else if (existing) {
                        // Merge verification and profile fields across documents for same user
                        if (data.adminVerified) existing.adminVerified = true;
                        if (data.emailVerified || data.adminVerified) existing.emailVerified = true;
                        if (data.role && (!existing.role || existing.role === 'PATIENT')) existing.role = data.role.toUpperCase();
                        if (data.fullName && !existing.fullName) existing.fullName = data.fullName;
                        if (data.phone && (!existing.phone || existing.phone === 'N/A')) {
                            existing.phone = data.phone;
                            existing.phoneNumber = data.phone;
                        }
                    }
                });

                let users = Array.from(usersMap.values());

                // Exclude any staff explicitly deleted by admin
                const deletedStaff = JSON.parse(localStorage.getItem('cura_deleted_staff') || '[]');
                users = users.filter(u => !deletedStaff.includes(u.email.toLowerCase()));

                localUsersCache = users;
                localStorage.setItem('cura_users_cache', JSON.stringify(users));
                return users;
            } catch (e) {
                console.warn("Firestore fetchUsers error (permission or network):", e.message);
            }
        }

        // Offline / fallback cache
        const stored = localStorage.getItem('cura_users_cache');
        if (stored) {
            try { localUsersCache = JSON.parse(stored); return localUsersCache; } catch(e) {}
        }
        return [];
    },

    async fetchPatients() {
        const users = await this.fetchUsers();
        return users.filter(u => u.role === 'PATIENT');
    },

    async fetchStaff() {
        const users = await this.fetchUsers();
        return users.filter(u => u.role === 'DOCTOR' || u.role === 'ASSISTANT' || u.role === 'ADMIN');
    },

    async fetchDoctors() {
        const users = await this.fetchUsers();
        return users.filter(u => u.role === 'DOCTOR');
    },

    async updateStaffMember(uid, origEmail, updates) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                if (uid) {
                    await CuraFirebase.db().collection('users').doc(uid).set(updates, { merge: true });
                }
                if (origEmail && origEmail !== uid) {
                    const emailDoc = await CuraFirebase.db().collection('users').doc(origEmail).get();
                    if (emailDoc.exists) {
                        await CuraFirebase.db().collection('users').doc(origEmail).set(updates, { merge: true });
                    }
                }
            } catch (e) {
                console.warn("Firestore update staff error:", e.message);
            }
        }
        // Update local cache
        localUsersCache = localUsersCache.map(u => (u.uid === uid || u.email === origEmail) ? { ...u, ...updates } : u);
        localStorage.setItem('cura_users_cache', JSON.stringify(localUsersCache));
    },

    async deleteStaffMember(uid, email) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                if (uid) {
                    await CuraFirebase.db().collection('users').doc(uid).delete();
                }
                if (email) {
                    await CuraFirebase.db().collection('users').doc(email).delete();
                }
            } catch (e) {
                console.warn("Firestore delete staff error:", e.message);
            }
        }
        if (email) {
            const deleted = JSON.parse(localStorage.getItem('cura_deleted_staff') || '[]');
            if (!deleted.includes(email.toLowerCase())) {
                deleted.push(email.toLowerCase());
                localStorage.setItem('cura_deleted_staff', JSON.stringify(deleted));
            }
        }
        localUsersCache = localUsersCache.filter(u => u.uid !== uid && u.email !== email);
        localStorage.setItem('cura_users_cache', JSON.stringify(localUsersCache));
    },

    async updatePatientContact(uid, origEmail, updates) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                if (uid) {
                    await CuraFirebase.db().collection('users').doc(uid).set(updates, { merge: true });
                }
                if (origEmail && origEmail !== uid) {
                    const emailDoc = await CuraFirebase.db().collection('users').doc(origEmail).get();
                    if (emailDoc.exists) {
                        await CuraFirebase.db().collection('users').doc(origEmail).set(updates, { merge: true });
                    }
                }
                // Cascade update to appointments matching this patient
                const apts = await this.fetchAppointments();
                for (const apt of apts) {
                    if ((apt.patientEmail && apt.patientEmail.toLowerCase() === origEmail.toLowerCase()) || 
                        (updates.previousName && apt.patientName === updates.previousName)) {
                        await this.updateAppointment(apt.id, {
                            patientName: updates.fullName || updates.name,
                            patientEmail: updates.email,
                            patientPhone: updates.phone || updates.phoneNumber || apt.patientPhone
                        });
                    }
                }
            } catch (e) {
                console.warn("Firestore update patient contact error:", e.message);
            }
        }
        localUsersCache = localUsersCache.map(u => (u.uid === uid || u.email === origEmail) ? { ...u, ...updates } : u);
        localStorage.setItem('cura_users_cache', JSON.stringify(localUsersCache));
    },

    async deletePatient(patientId, email, patientName) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                if (patientId) {
                    await CuraFirebase.db().collection('users').doc(patientId).delete();
                }
                if (email) {
                    await CuraFirebase.db().collection('users').doc(email).delete();
                }
                // Cascade delete patient's appointments
                const apts = await this.fetchAppointments();
                for (const apt of apts) {
                    if ((email && apt.patientEmail && apt.patientEmail.toLowerCase() === email.toLowerCase()) ||
                        (patientName && apt.patientName === patientName)) {
                        await this.deleteAppointment(apt.id);
                    }
                }
            } catch (e) {
                console.warn("Firestore delete patient error:", e.message);
            }
        }
        localUsersCache = localUsersCache.filter(u => u.uid !== patientId && u.email !== email);
        localStorage.setItem('cura_users_cache', JSON.stringify(localUsersCache));
    },

    async verifyUserByAdmin(uid, email, verified = true, role = null, fullName = null) {
        const cleanEmail = email ? email.toLowerCase().trim() : '';
        const updates = {
            emailVerified: !!verified,
            adminVerified: !!verified,
            verifiedAt: verified ? new Date().toISOString() : null
        };
        if (role) updates.role = role.toUpperCase();
        if (fullName) {
            updates.fullName = fullName;
            updates.name = fullName;
        }
        if (cleanEmail) updates.email = cleanEmail;
        if (uid) updates.uid = uid;

        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                if (uid && !uid.includes('@')) {
                    await CuraFirebase.db().collection('users').doc(uid).set(updates, { merge: true });
                }
                if (cleanEmail) {
                    await CuraFirebase.db().collection('users').doc(cleanEmail).set(updates, { merge: true });
                    try {
                        const qSnap = await CuraFirebase.db().collection('users').where('email', '==', cleanEmail).get();
                        for (const d of qSnap.docs) {
                            await CuraFirebase.db().collection('users').doc(d.id).set(updates, { merge: true });
                        }
                    } catch(e) {}
                }
            } catch (e) {
                console.warn("Firestore verify user error:", e.message);
            }
        }

        // Update local cache
        let matched = false;
        localUsersCache = localUsersCache.map(u => {
            if ((uid && u.uid === uid) || (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)) {
                matched = true;
                return { ...u, ...updates };
            }
            return u;
        });

        if (!matched && (cleanEmail || uid)) {
            localUsersCache.push({
                uid: uid || 'u-' + Date.now(),
                id: uid || 'u-' + Date.now(),
                email: cleanEmail,
                fullName: fullName || (cleanEmail ? cleanEmail.split('@')[0] : 'User'),
                name: fullName || (cleanEmail ? cleanEmail.split('@')[0] : 'User'),
                role: (role || 'DOCTOR').toUpperCase(),
                ...updates
            });
        }
        localStorage.setItem('cura_users_cache', JSON.stringify(localUsersCache));

        try {
            let localStaff = JSON.parse(localStorage.getItem('cura_staff_accounts') || '[]');
            localStaff = localStaff.map(s => {
                if ((uid && s.uid === uid) || (cleanEmail && s.email && s.email.toLowerCase() === cleanEmail)) {
                    return { ...s, ...updates };
                }
                return s;
            });
            localStorage.setItem('cura_staff_accounts', JSON.stringify(localStaff));
        } catch(e) {}

        return updates;
    },

    // ── PRESCRIPTIONS ──
    async addPrescription(rx) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                await CuraFirebase.db().collection('prescriptions').doc(rx.id).set(rx);
            } catch (e) {
                console.warn("Firestore save prescription error (saved locally):", e.message);
            }
        }
        localPrescriptionsCache.unshift(rx);
        localStorage.setItem('cura_prescriptions', JSON.stringify(localPrescriptionsCache));
        return rx;
    },

    // ── DIAGNOSTIC / TEST ORDERS ──
    async fetchTestOrders() {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                if (typeof CuraFirebase.waitForAuth === 'function') {
                    await CuraFirebase.waitForAuth();
                }
                let snapshot;
                try {
                    snapshot = await CuraFirebase.db().collection('test_orders').orderBy('orderedAt', 'desc').get();
                } catch(err) {
                    snapshot = await CuraFirebase.db().collection('test_orders').get();
                }
                localTestOrdersCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                localTestOrdersCache.sort((a, b) => (b.orderedAt || '').localeCompare(a.orderedAt || ''));
                localStorage.setItem('cura_test_orders', JSON.stringify(localTestOrdersCache));
                return localTestOrdersCache;
            } catch (e) {
                console.warn("Firestore fetch test orders error (saved locally):", e.message);
            }
        }
        const stored = localStorage.getItem('cura_test_orders');
        localTestOrdersCache = stored ? JSON.parse(stored) : [];
        return localTestOrdersCache;
    },

    getTestOrders() {
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
            return dId === target || dEmail === target || (dName && (dName.includes(target) || target.includes(dName)));
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
            return pId === target || pEmail === target || (pName && (target.includes(pName) || pName.includes(target)));
        });
    },

    async addTestOrder(order) {
        if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
            try {
                await CuraFirebase.db().collection('test_orders').doc(order.id).set(order);
            } catch (e) {
                console.warn("Firestore save test order error (saved locally):", e.message);
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
                console.warn("Firestore update test order error (updated locally):", e.message);
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
                console.warn("Firestore delete test order error:", e.message);
            }
        }
        localTestOrdersCache = localTestOrdersCache.filter(o => o.id !== id);
        localStorage.setItem('cura_test_orders', JSON.stringify(localTestOrdersCache));
    }
};

// --- STRICT GMAIL VALIDATOR ---
function validateGmailAddress(email) {
    const clean = email.trim().toLowerCase();
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    
    if (!clean) {
        return { valid: false, message: "Please enter your email address." };
    }

    if (!gmailRegex.test(clean)) {
        if (clean.includes('@')) {
            const domain = clean.split('@')[1];
            return { 
                valid: false, 
                message: `"@${domain}" is not accepted. Only @gmail.com addresses are allowed.`
            };
        }
        return { 
            valid: false, 
            message: "Please enter a valid @gmail.com email address." 
        };
    }
    return { valid: true };
}

// --- EMAIL VERIFICATION: RESEND HANDLER ---
async function resendVerificationEmail() {
    const emailInput = document.getElementById('user-email');
    const passwordInput = document.getElementById('user-password');
    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const password = passwordInput ? passwordInput.value : '';
    
    if (!email || !password) {
        showToast('Please enter your email and password first, then click resend.', 'error');
        return;
    }
    
    if (typeof CuraFirebase === 'undefined' || !CuraFirebase.isReady()) {
        showToast('Firebase is not connected. Cannot resend verification.', 'error');
        return;
    }
    
    try {
        const cred = await CuraFirebase.auth().signInWithEmailAndPassword(email, password);
        const userObj = await tryReadUserDoc(cred.user.uid, email);
        const isVerified = cred.user.emailVerified || (userObj && (userObj.emailVerified || userObj.adminVerified));

        if (isVerified) {
            showToast('Your account is already verified! Signing you in...', 'success');
            hideVerificationOverlay();
            const finalUser = userObj || {
                uid: cred.user.uid,
                email: email,
                role: isAdminEmail(email) ? 'ADMIN' : 'DOCTOR',
                fullName: email.split('@')[0],
                emailVerified: true,
                adminVerified: true
            };
            CuraAuth.setUser(finalUser);
            setTimeout(() => CuraAuth.redirectBasedOnRole(finalUser.role), 500);
            return;
        }

        await cred.user.sendEmailVerification();
        await CuraFirebase.auth().signOut();
        showToast('Verification email resent! Check your Gmail inbox.', 'success');
    } catch (err) {
        const msg = err.code === 'auth/too-many-requests'
            ? 'Too many attempts. Please wait a few minutes before trying again.'
            : (err.message || 'Failed to resend verification email.');
        showToast(msg, 'error');
    }
}
window.resendVerificationEmail = resendVerificationEmail;

// --- EMAIL VERIFICATION: HIDE OVERLAY ---
function hideVerificationOverlay() {
    const overlay = document.getElementById('verification-overlay');
    if (overlay) overlay.style.display = 'none';
}
window.hideVerificationOverlay = hideVerificationOverlay;

// --- HELPER: Look up cached user by UID or email in localStorage ---
function findUserInLocalCache(uid, email) {
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    try {
        const stored = localStorage.getItem('cura_users_cache');
        if (stored) {
            const list = JSON.parse(stored);
            const user = list.find(u => (uid && u.uid === uid) || (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail));
            if (user) return user;
        }
    } catch(e) {}

    try {
        const staffStored = localStorage.getItem('cura_staff_accounts');
        if (staffStored) {
            const staffList = JSON.parse(staffStored);
            const s = staffList.find(st => (uid && st.uid === uid) || (cleanEmail && st.email && st.email.toLowerCase() === cleanEmail));
            if (s) return s;
        }
    } catch(e) {}

    try {
        const curUser = JSON.parse(localStorage.getItem('cura_user') || 'null');
        if (curUser && ((uid && curUser.uid === uid) || (cleanEmail && curUser.email && curUser.email.toLowerCase() === cleanEmail))) {
            return curUser;
        }
    } catch(e) {}

    return null;
}
window.findUserInLocalCache = findUserInLocalCache;

// --- HELPER: Try to read a user document from Firestore (with graceful fallback) ---
async function tryReadUserDoc(uid, email) {
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    let foundData = null;
    let docId = null;

    if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady() && CuraFirebase.db()) {
        try {
            // 1. Try UID document
            if (uid && !uid.includes('@')) {
                try {
                    const uDoc = await CuraFirebase.db().collection('users').doc(uid).get();
                    if (uDoc.exists && uDoc.data()) {
                        foundData = uDoc.data();
                        docId = uDoc.id;
                    }
                } catch(e) {
                    console.warn('tryReadUserDoc UID get notice:', e.message);
                }
            }

            // 2. Try email document ID
            if ((!foundData || !foundData.role) && cleanEmail) {
                try {
                    const eDoc = await CuraFirebase.db().collection('users').doc(cleanEmail).get();
                    if (eDoc.exists && eDoc.data()) {
                        foundData = Object.assign({}, foundData || {}, eDoc.data());
                        docId = docId || eDoc.id;
                    }
                } catch(e) {
                    console.warn('tryReadUserDoc email get notice:', e.message);
                }
            }

            // 3. Try query by email field
            if ((!foundData || !foundData.role) && cleanEmail) {
                try {
                    const qSnap = await CuraFirebase.db().collection('users').where('email', '==', cleanEmail).limit(1).get();
                    if (!qSnap.empty) {
                        const qDoc = qSnap.docs[0];
                        foundData = Object.assign({}, foundData || {}, qDoc.data());
                        docId = docId || qDoc.id;
                    }
                } catch(e) {
                    console.warn('tryReadUserDoc email query notice:', e.message);
                }
            }
        } catch (e) {
            console.warn('tryReadUserDoc Firestore lookup notice:', e.message);
        }
    }

    // 4. Merge with local cache if available
    const cachedUser = findUserInLocalCache(uid, cleanEmail);

    if (foundData || cachedUser) {
        const merged = Object.assign({}, cachedUser || {}, foundData || {});
        merged.uid = uid || merged.uid || docId;
        merged.email = cleanEmail || merged.email;

        // Ensure role is determined properly
        if (!merged.role) {
            if (isAdminEmail(cleanEmail)) {
                merged.role = 'ADMIN';
            } else if (cachedUser && cachedUser.role) {
                merged.role = cachedUser.role;
            } else if (merged.specialization || merged.doctorEmail) {
                merged.role = merged.doctorEmail ? 'ASSISTANT' : 'DOCTOR';
            } else {
                merged.role = 'DOCTOR';
            }
        }
        return merged;
    }

    return null;
}

// --- HELPER: Try to write a user document to Firestore (with graceful fallback) ---
async function tryWriteUserDoc(uid, userObj) {
    if (typeof CuraFirebase === 'undefined' || !CuraFirebase.isReady()) return;
    try {
        await CuraFirebase.db().collection('users').doc(uid).set(userObj, { merge: true });
    } catch (e) {
        console.warn('Firestore user write failed (permission rules may need updating). User data saved locally only.', e.message);
    }
}

// --- ADMIN GLOBAL PORTAL SWITCHER ---
function renderAdminPortalSwitcher() {
    const user = CuraAuth.getCurrentUser();
    if (!user || user.role !== 'ADMIN') return;

    if (document.getElementById('admin-portal-switcher')) return;

    const currentPath = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (currentPath === 'index.html' || currentPath === '') return;

    const navActions = document.querySelector('.navbar .nav-actions') || 
                       document.querySelector('.app-header .header-actions');
    if (!navActions) return;

    const switcher = document.createElement('div');
    switcher.id = 'admin-portal-switcher';
    switcher.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; margin-right: 12px; background: rgba(238, 122, 81, 0.12); border: 1px solid var(--palette-peach, #EE7A51); border-radius: 20px; padding: 4px 10px; font-size: 0.8rem; font-weight: 600;';

    const links = [
        { name: 'Admin Hub', file: 'dashboard.html', icon: 'fa-gauge' },
        { name: 'Doctor', file: 'doctor-dashboard.html', icon: 'fa-user-doctor' },
        { name: 'Assistant', file: 'assistant-dashboard.html', icon: 'fa-user-nurse' },
        { name: 'Patient', file: 'patient-dashboard.html', icon: 'fa-hospital-user' }
    ];

    let html = `<span style="color: var(--palette-peach-dark, #C94F24); display: flex; align-items: center; gap: 5px; margin-right: 4px;">
        <i class="fa-solid fa-shield-halved"></i> <span>Admin View:</span>
    </span>`;

    links.forEach(l => {
        const isActive = currentPath === l.file.toLowerCase();
        const activeStyle = isActive 
            ? 'background: var(--palette-peach, #EE7A51); color: #fff;' 
            : 'background: transparent; color: var(--text-secondary, #94a3b8);';
        html += `<a href="${l.file}" style="text-decoration: none; padding: 3px 8px; border-radius: 12px; ${activeStyle} font-size: 0.78rem; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px;" title="Switch to ${l.name}">
            <i class="fa-solid ${l.icon}" style="font-size: 0.72rem;"></i> ${l.name}
        </a>`;
    });

    switcher.innerHTML = html;
    navActions.insertBefore(switcher, navActions.firstChild);
}
window.renderAdminPortalSwitcher = renderAdminPortalSwitcher;

// --- DOM INITIALIZATION & AUTH HANDLER ---
document.addEventListener('DOMContentLoaded', () => {
    updateThemeIcons(document.documentElement.getAttribute('data-theme'));
    
    // Auto-render Admin Portal Switcher if user is ADMIN
    renderAdminPortalSwitcher();

    // Remove obsolete Clinical Workstations blocks if still in cached DOM
    document.querySelectorAll('.card-title').forEach(el => {
        if (el.textContent && el.textContent.includes('Clinical Workstations')) {
            const section = el.closest('section');
            if (section) section.remove();
        }
    });

    // Clear obsolete PWA caches (keep only current v6)
    if ('caches' in window) {
        caches.keys().then(keys => {
            keys.forEach(k => {
                if (!k.includes('v6')) caches.delete(k);
            });
        });
    }

    // Purge any stale mock demo accounts from localStorage if saved previously
    try {
        const fakeEmails = ['ashwini.joshi@cura.clinic', 'aarav.sharma@cura.clinic', 'priya.gupta@cura.clinic', 'assistant@cura.clinic', 'admin@cura.clinic'];
        const localStaff = JSON.parse(localStorage.getItem('cura_staff_accounts') || '[]');
        if (Array.isArray(localStaff) && localStaff.length > 0) {
            const cleaned = localStaff.filter(s => s && s.email && !fakeEmails.includes(s.email.toLowerCase()));
            if (cleaned.length !== localStaff.length) {
                localStorage.setItem('cura_staff_accounts', JSON.stringify(cleaned));
            }
        }
    } catch(e) {}
    
    // Auto-fetch appointment and user records
    CuraData.fetchAppointments();
    CuraData.fetchUsers();

    // Register Service Worker for PWA Screen Notifications
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Cura ServiceWorker active:', reg.scope))
            .catch(err => console.log('ServiceWorker registration skipped:', err));
    }

    const authForm = document.getElementById('auth-form');
    if (authForm) {
        const toggleBtn = document.getElementById('toggle-btn');
        const nameField = document.getElementById('name-field');
        const phoneField = document.getElementById('phone-field');
        const roleField = document.getElementById('role-field');
        const formTitle = document.getElementById('form-title');
        const formSubtitle = document.getElementById('form-subtitle');
        const submitBtn = document.getElementById('submit-btn');
        
        let isSignInMode = true;

        if (roleField) {
            roleField.style.display = 'none'; // Ensure public role selector is always hidden
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                isSignInMode = !isSignInMode;
                if (nameField) nameField.style.display = isSignInMode ? 'none' : 'block';
                if (phoneField) phoneField.style.display = isSignInMode ? 'none' : 'block';
                if (formTitle) formTitle.textContent = isSignInMode ? 'Sign In' : 'Create Account';
                if (formSubtitle) {
                    formSubtitle.textContent = isSignInMode 
                        ? 'Enter your credentials to access the clinic environment' 
                        : 'Register with your Gmail address and phone number to book appointments';
                }
                if (submitBtn) submitBtn.textContent = isSignInMode ? 'Sign In' : 'Register';
                toggleBtn.textContent = isSignInMode ? 'Register' : 'Sign In';
            });
        }

        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('user-email').value.trim().toLowerCase();
            const password = document.getElementById('user-password').value;
            const fullName = document.getElementById('user-name') ? document.getElementById('user-name').value.trim() : '';
            const phoneInput = document.getElementById('user-phone');
            const countryCodeSelect = document.getElementById('country-code');
            const rawPhone = phoneInput ? phoneInput.value.trim() : '';
            const countryCode = countryCodeSelect ? countryCodeSelect.value.trim() : '+91';

            if (!isSignInMode) {
                if (!fullName) {
                    showToast("Please enter your full name.", 'error');
                    return;
                }
                if (!rawPhone) {
                    showToast("Please enter your mobile phone number.", 'error');
                    return;
                }
                const digits = rawPhone.replace(/\D/g, '');
                if (digits.length < 6 || digits.length > 15) {
                    showToast("Please enter a valid phone number (6 to 15 digits).", 'error');
                    return;
                }
            }

            const formattedPhone = rawPhone ? `${countryCode} ${rawPhone}` : '';

            // 1. Enforce Gmail domain requirement
            const validation = validateGmailAddress(email);
            if (!validation.valid) {
                showToast(validation.message, 'error');
                return;
            }

            if (password.length < 6) {
                showToast("Password must be at least 6 characters.", 'error');
                return;
            }

            // ========== FIREBASE AUTH WITH EMAIL VERIFICATION ==========
            if (typeof CuraFirebase !== 'undefined' && CuraFirebase.isReady()) {
                try {
                    let userObj = null;

                    if (isSignInMode) {
                        // ── SIGN-IN FLOW ──
                        const cred = await CuraFirebase.auth().signInWithEmailAndPassword(email, password);

                        // ✅ Try Firestore lookup first to check profile & admin verification
                        userObj = await tryReadUserDoc(cred.user.uid, email);

                        // An account is verified if:
                        // 1. Firebase Auth email link was clicked (cred.user.emailVerified)
                        // 2. OR verified by admin in Firestore/localStorage (emailVerified or adminVerified)
                        // 3. OR the account is the primary admin account
                        const isAdminAccount = isAdminEmail(email) || (userObj && userObj.role === 'ADMIN');
                        const isVerified = isAdminAccount || cred.user.emailVerified || (userObj && (userObj.emailVerified === true || userObj.adminVerified === true));

                        // Block unverified users from accessing any dashboard
                        if (!isVerified) {
                            showToast('Your email is not verified yet. Please check your Gmail inbox for the link, or request your clinic administrator to verify your account.', 'error');
                            await CuraFirebase.auth().signOut();
                            const overlay = document.getElementById('verification-overlay');
                            if (overlay) overlay.style.display = 'flex';
                            return;
                        }

                        // If verified in Firebase Auth or Admin, synchronize emailVerified: true to Firestore
                        if (isVerified && userObj) {
                            if (!userObj.emailVerified || !userObj.adminVerified) {
                                userObj.emailVerified = true;
                                userObj.adminVerified = true;
                                CuraData.verifyUserByAdmin(cred.user.uid, email, true, userObj.role, userObj.fullName);
                            }
                        }

                        if (!userObj) {
                            // Firestore read had no doc — build from auth info
                            const assignedRole = isAdminAccount ? 'ADMIN' : 'PATIENT';
                            userObj = {
                                uid: cred.user.uid,
                                email: email,
                                fullName: cred.user.displayName || email.split('@')[0],
                                role: assignedRole,
                                emailVerified: cred.user.emailVerified,
                                adminVerified: cred.user.emailVerified,
                                favoriteDoctors: [],
                                createdAt: new Date().toISOString()
                            };
                            tryWriteUserDoc(cred.user.uid, userObj);
                        }

                        if (!userObj.uid) userObj.uid = cred.user.uid;

                    } else {
                        // ── REGISTRATION FLOW (Public sign-ups are always PATIENT) ──
                        const cred = await CuraFirebase.auth().createUserWithEmailAndPassword(email, password);
                        const assignedRole = isAdminEmail(email) ? 'ADMIN' : 'PATIENT';

                        userObj = {
                            uid: cred.user.uid,
                            email: email,
                            fullName: fullName || email.split('@')[0],
                            role: assignedRole,
                            phone: formattedPhone,
                            phoneNumber: formattedPhone,
                            favoriteDoctors: [],
                            createdAt: new Date().toISOString()
                        };

                        // Try to save to Firestore (non-blocking if permission fails)
                        tryWriteUserDoc(cred.user.uid, userObj);

                        // Send verification email before allowing access
                        await cred.user.sendEmailVerification();

                        // Sign out immediately — user must verify first
                        await CuraFirebase.auth().signOut();

                        showToast('Verification email sent! Please check your Gmail inbox and verify before signing in.', 'success');
                        const overlay = document.getElementById('verification-overlay');
                        if (overlay) overlay.style.display = 'flex';

                        // Do NOT redirect or save user to localStorage
                        return;
                    }

                    // Persist session and route to the correct dashboard
                    CuraAuth.setUser(userObj);
                    showToast(`Welcome, ${userObj.fullName || userObj.name || 'User'}!`, 'success');
                    setTimeout(() => CuraAuth.redirectBasedOnRole(userObj.role), 400);
                    return;

                } catch (err) {
                    // Friendly error messages for common Firebase errors
                    let msg = err.message;
                    if (err.code === 'auth/email-already-in-use') {
                        msg = 'This Gmail is already registered. Try signing in instead.';
                    } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                        msg = 'Incorrect password. Please try again.';
                    } else if (err.code === 'auth/user-not-found') {
                        msg = 'No account found with this Gmail. Please register first.';
                    } else if (err.code === 'auth/too-many-requests') {
                        msg = 'Too many failed attempts. Please wait a few minutes.';
                    }
                    showToast(msg, 'error');
                    return;
                }
            }

            // ========== LOCAL SESSION FALLBACK (Offline / Dev mode) ==========
            console.warn('[Cura] Firebase is not connected — email verification is skipped in offline/local fallback mode.');
            const fallbackRole = (email === ADMIN_EMAIL.toLowerCase()) ? 'ADMIN' : 'PATIENT';
            let userObj = { 
                id: "u-" + Date.now(), 
                fullName: fullName || email.split('@')[0], 
                email: email, 
                role: fallbackRole,
                phone: formattedPhone,
                phoneNumber: formattedPhone,
                favoriteDoctors: []
            };
            CuraAuth.setUser(userObj);
            showToast(`Welcome, ${userObj.fullName}! (Offline mode)`, 'success');
            setTimeout(() => CuraAuth.redirectBasedOnRole(userObj.role), 500);
        });
    }
});
