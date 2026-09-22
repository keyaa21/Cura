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
        if (CuraFirebase.isReady()) {
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
        if (user.role === 'ADMIN') return; // Admin has access to all pages
        if (!allowedRoles.includes(user.role)) {
            this.redirectBasedOnRole(user.role);
        }
    }
};

// --- DATA SERVICE (FIRESTORE DATABASE ADAPTER) ---
let localAppointmentsCache = [];

const CuraData = {
    // 1. FETCH CODE GOES HERE (Inside fetchAppointments)
    async fetchAppointments() {
        if (CuraFirebase.isReady()) {
            try {
                // <--- FETCH / READ FROM FIRESTORE --->
                const snapshot = await db.collection('appointments').orderBy('createdAt', 'desc').get();
                localAppointmentsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                return localAppointmentsCache;
            } catch (e) {
                console.error("Firestore fetch error:", e);
            }
        }
        // Fallback to localStorage if offline
        const stored = localStorage.getItem('cura_appointments');
        localAppointmentsCache = stored ? JSON.parse(stored) : [];
        return localAppointmentsCache;
    },

    getAppointments() {
        return localAppointmentsCache;
    },

    // 2. SAVE CODE GOES HERE (Inside addAppointment)
    async addAppointment(apt) {
        if (CuraFirebase.isReady()) {
            try {
                // <--- SAVE / WRITE TO FIRESTORE --->
                await db.collection('appointments').doc(apt.id).set(apt);
            } catch (e) {
                console.error("Firestore save error:", e);
            }
        }
        // Save to local cache as well
        localAppointmentsCache.unshift(apt);
        localStorage.setItem('cura_appointments', JSON.stringify(localAppointmentsCache));
        return apt;
    },

    // 3. UPDATE CODE (For vitals or prescriptions)
    async updateAppointment(id, updates) {
        if (CuraFirebase.isReady()) {
            await db.collection('appointments').doc(id).update(updates);
        }
        localAppointmentsCache = localAppointmentsCache.map(a => a.id === id ? { ...a, ...updates } : a);
        localStorage.setItem('cura_appointments', JSON.stringify(localAppointmentsCache));
    }
};

// --- AUTH FORM SUBMIT HANDLER ---
document.addEventListener('DOMContentLoaded', () => {
    updateThemeIcons(document.documentElement.getAttribute('data-theme'));
    
    // Auto-fetch data on page load
    CuraData.fetchAppointments();

    const authForm = document.getElementById('auth-form');
    if (authForm) {
        const toggleBtn = document.getElementById('toggle-btn');
        const nameField = document.getElementById('name-field');
        const roleField = document.getElementById('role-field');
        const formTitle = document.getElementById('form-title');
        const submitBtn = document.getElementById('submit-btn');
        let isSignInMode = true;

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                isSignInMode = !isSignInMode;
                if (nameField) nameField.style.display = isSignInMode ? 'none' : 'block';
                if (roleField) roleField.style.display = isSignInMode ? 'none' : 'block';
                if (formTitle) formTitle.textContent = isSignInMode ? 'Sign In' : 'Create Account';
                if (submitBtn) submitBtn.textContent = isSignInMode ? 'Sign In' : 'Register';
                toggleBtn.textContent = isSignInMode ? 'Sign Up' : 'Sign In';
            });
        }

        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('user-email').value.trim();
            const password = document.getElementById('user-password').value;
            const fullName = document.getElementById('user-name') ? document.getElementById('user-name').value.trim() : '';
            const role = document.getElementById('user-role') ? document.getElementById('user-role').value : 'PATIENT';

            if (CuraFirebase.isReady()) {
                try {
                    let userObj = null;
                    if (isSignInMode) {
                        const cred = await CuraFirebase.auth().signInWithEmailAndPassword(email, password);
                        const doc = await CuraFirebase.db().collection('users').doc(cred.user.uid).get();
                        userObj = doc.exists ? doc.data() : { uid: cred.user.uid, email, fullName: email.split('@')[0], role: 'PATIENT' };
                    } else {
                        const cred = await CuraFirebase.auth().createUserWithEmailAndPassword(email, password);
                        userObj = { uid: cred.user.uid, email, fullName: fullName || email.split('@')[0], role, createdAt: new Date().toISOString() };
                        await CuraFirebase.db().collection('users').doc(cred.user.uid).set(userObj);
                    }
                    CuraAuth.setUser(userObj);
                    showToast(`Welcome, ${userObj.fullName}!`);
                    setTimeout(() => CuraAuth.redirectBasedOnRole(userObj.role), 500);
                    return;
                } catch (err) {
                    showToast(err.message, 'error');
                    return;
                }
            }

            // Fallback for local testing
            let userObj = { id: "u-" + Date.now(), fullName: fullName || email.split('@')[0], email, role };
            CuraAuth.setUser(userObj);
            showToast(`Welcome, ${userObj.fullName}!`);
            setTimeout(() => CuraAuth.redirectBasedOnRole(userObj.role), 500);
        });
    }
});