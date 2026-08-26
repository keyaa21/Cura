/**
 * CURA - Core Application Framework
 * Theme management, Auth state, Toast notifications, and API adapters.
 */

// ==========================================
// 1. THEME CONTROLLER (Dark Mode / Light Mode)
// ==========================================
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
        if (theme === 'dark') {
            icon.className = 'fa-solid fa-sun';
        } else {
            icon.className = 'fa-solid fa-moon';
        }
    });
}

// ==========================================
// 2. TOAST NOTIFICATION SYSTEM
// ==========================================
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `cura-toast ${type === 'peach' ? 'toast-peach' : ''} ${type === 'error' ? 'toast-error' : ''}`;
    
    let iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    else if (type === 'peach') iconClass = 'fa-bell';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass}" style="color: ${type === 'error' ? 'var(--status-cancelled)' : type === 'peach' ? 'var(--accent-peach)' : 'var(--primary)'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3800);
}

// ==========================================
// 3. AUTHENTICATION & SESSION MANAGEMENT
// ==========================================
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
        localStorage.removeItem('cura_user');
        localStorage.removeItem('cura_token');
        showToast('Logged out successfully', 'peach');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    },

    redirectBasedOnRole(role) {
        switch ((role || '').toUpperCase()) {
            case 'DOCTOR':
                window.location.href = 'doctor-dashboard.html';
                break;
            case 'ASSISTANT':
                window.location.href = 'assistant-dashboard.html';
                break;
            case 'PATIENT':
                window.location.href = 'patient-dashboard.html';
                break;
            case 'ADMIN':
            default:
                window.location.href = 'dashboard.html';
                break;
        }
    }
};

// ==========================================
// 4. API / LOCAL DATA ADAPTER
// ==========================================
const CuraData = {
    // Default seed appointments for offline/client fallback
    defaultAppointments: [
        {
            id: "101",
            patientName: "Keya Joshi",
            patientPhone: "+91 9823067890",
            doctorName: "Dr. Ashwini Joshi",
            specialization: "Homoeopathy",
            dayOfWeek: "Monday",
            timeSlot: "09:00 AM",
            allocatedDurationMinutes: 60,
            healthIssue: "CHRONIC",
            firstTimePatient: true,
            groupSize: 1,
            symptomsDescription: "Migraines and digestive distress for 6 months",
            status: "BOOKED",
            vitals: null,
            followUpIntervalDays: 30,
            followUpDueDate: null,
            createdAt: new Date().toISOString()
        },
        {
            id: "102",
            patientName: "Ananya Kumar",
            patientPhone: "+91 9823011223",
            doctorName: "Dr. Priya Gupta",
            specialization: "Psychology",
            dayOfWeek: "Wednesday",
            timeSlot: "11:00 AM",
            allocatedDurationMinutes: 50,
            healthIssue: "PSYCHOLOGICAL",
            firstTimePatient: false,
            groupSize: 1,
            symptomsDescription: "Follow-up for anxiety management",
            status: "COMPLETED",
            vitals: { bloodPressure: "118/78", temperature: 98.4, pulseRate: 76, bloodOxygen: 99.0, triageNotes: "Vitals normal" },
            prescriptionSummary: "Cognitive reframing exercises; Chamomilla 30C",
            followUpIntervalDays: 15,
            followUpDueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
            completedAt: new Date().toISOString(),
            createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: "103",
            patientName: "Kartik Swami",
            patientPhone: "+91 9823099887",
            doctorName: "Dr. Aarav Sharma",
            specialization: "Allopathy",
            dayOfWeek: "Friday",
            timeSlot: "05:00 PM",
            allocatedDurationMinutes: 45,
            healthIssue: "ACUTE",
            firstTimePatient: false,
            groupSize: 2,
            symptomsDescription: "Acute fever and sore throat for 2 family members",
            status: "ONGOING",
            vitals: { bloodPressure: "124/82", temperature: 100.2, pulseRate: 88, bloodOxygen: 97.5, triageNotes: "Mild fever detected" },
            followUpIntervalDays: 15,
            followUpDueDate: null,
            createdAt: new Date().toISOString()
        }
    ],

    getAppointments() {
        const stored = localStorage.getItem('cura_appointments');
        if (!stored) {
            localStorage.setItem('cura_appointments', JSON.stringify(this.defaultAppointments));
            return this.defaultAppointments;
        }
        return JSON.parse(stored);
    },

    saveAppointments(appointments) {
        localStorage.setItem('cura_appointments', JSON.stringify(appointments));
    },

    addAppointment(apt) {
        const list = this.getAppointments();
        list.unshift(apt);
        this.saveAppointments(list);
        return apt;
    },

    updateAppointment(id, updates) {
        let list = this.getAppointments();
        list = list.map(a => a.id === id ? { ...a, ...updates } : a);
        this.saveAppointments(list);
        return list.find(a => a.id === id);
    },

    getPrescriptions() {
        const stored = localStorage.getItem('cura_prescriptions');
        if (!stored) {
            const seed = [
                {
                    id: "rx-102",
                    appointmentId: "102",
                    patientName: "Ananya Kumar",
                    doctorName: "Dr. Priya Gupta",
                    specialization: "Psychology",
                    date: new Date().toISOString().split('T')[0],
                    diagnosis: "Generalized Anxiety & Sleep Disruption",
                    remediesOrMedicines: "Chamomilla 30C (2 drops bedtime), Ignatia Amara 200CH weekly",
                    dosageInstructions: "Daily 15 min mindful breathing before sleep; avoid screens after 10 PM",
                    dietaryLifestyleAdvice: "Reduce caffeine, chamomile herbal tea in evenings",
                    followUpIntervalDays: 15,
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem('cura_prescriptions', JSON.stringify(seed));
            return seed;
        }
        return JSON.parse(stored);
    },

    addPrescription(rx) {
        const list = this.getPrescriptions();
        list.unshift(rx);
        localStorage.setItem('cura_prescriptions', JSON.stringify(list));
        return rx;
    }
};

// ==========================================
// 5. SERVICE WORKER REGISTRATION (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('🌿 Cura PWA: ServiceWorker active with scope:', reg.scope))
            .catch(err => console.log('🌿 Cura PWA: ServiceWorker registration skipped/failed:', err));
    });
}

// Initial UI setup on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateThemeIcons(currentTheme);

    // Setup sign-in / sign-up auth form if on index.html
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        const toggleBtn = document.getElementById('toggle-btn');
        const nameField = document.getElementById('name-field');
        const roleField = document.getElementById('role-field');
        const formTitle = document.getElementById('form-title');
        const formSubtitle = document.getElementById('form-subtitle');
        const submitBtn = document.getElementById('submit-btn');

        let isSignInMode = true;

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                isSignInMode = !isSignInMode;
                if (nameField) nameField.style.display = isSignInMode ? 'none' : 'block';
                if (roleField) roleField.style.display = isSignInMode ? 'none' : 'block';
                if (formTitle) formTitle.textContent = isSignInMode ? 'Welcome Back' : 'Create an Account';
                if (formSubtitle) formSubtitle.textContent = isSignInMode 
                    ? 'Enter your credentials to access the clinic portal' 
                    : 'Register as a patient or clinic team member';
                if (submitBtn) submitBtn.textContent = isSignInMode ? 'Sign In' : 'Create Account';
                toggleBtn.textContent = isSignInMode ? 'Sign Up' : 'Sign In';
            });
        }

        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('user-email').value.trim();
            const password = document.getElementById('user-password').value;
            const fullName = document.getElementById('user-name') ? document.getElementById('user-name').value.trim() : '';
            const role = document.getElementById('user-role') ? document.getElementById('user-role').value : 'PATIENT';

            // Check mock / backend
            let user = {
                id: "user-" + Date.now(),
                fullName: fullName || email.split('@')[0],
                email: email,
                role: role
            };

            // Detect role from email for easy demo testing
            if (email.includes('doctor') || email.includes('joshi') || email.includes('sharma') || email.includes('gupta')) {
                user.role = 'DOCTOR';
            } else if (email.includes('assistant') || email.includes('nurse')) {
                user.role = 'ASSISTANT';
            } else if (email.includes('admin')) {
                user.role = 'ADMIN';
            }

            CuraAuth.setUser(user);
            showToast(`Welcome, ${user.fullName}!`, 'success');
            
            setTimeout(() => {
                CuraAuth.redirectBasedOnRole(user.role);
            }, 600);
        });
    }
});