# 🌿 Cura — Clinical Practice & Appointment Management PWA

> **Cura** is a modern, lightweight, and responsive Progressive Web App (PWA) designed for local clinics (Homoeopathy, Allopathy, Psychology, and multidisciplinary practices) to streamline patient appointments, assistant triage, clinical consultations, and prescription tracking.

---

## 🎨 Aesthetics & Design
- **Theme**: Peachy Sage Green palette with warm creams, botanical tones, and peachy accents.
- **Dark Mode**: Complete dark mode toggle (`☀️ / 🌙`) with persistent user preference in `localStorage`.
- **PWA Ready**: Works offline, installable on mobile/desktop via `manifest.json` and `service-worker.js`.

---

## 🚀 Key Features Implemented

### 1. 📋 3-Question Intake & Duration Quiz
When a patient books an appointment, they answer a 3-question triage quiz:
1. **Health Issue Type**:
   - `Acute` (Fever, pain, infection)
   - `Chronic` (Long-standing migraine, skin, joints)
   - `Psychological` (Mental wellness, anxiety, counseling)
2. **First-Time vs. Returning Patient**:
   - First-time patients are automatically allocated **60 minutes (1 hour)** for detailed constitutional case-taking.
   - Returning patients are allocated **30 to 50 minutes** based on issue complexity.
3. **Group Size**:
   - 1 person, 2 people (+15 min), or 3+ people (+30 min).
- The allocated time duration badge updates **live in real time** as choices change!

### 2. 💊 Clinical Prescription & Notes Modal
- Physicians can write and save digital prescription notes with diagnosis, remedies/medicines & potencies, dosage, and dietary advice.
- Automatically completes the appointment and marks follow-up dates.

### 3. 🔔 15 & 30-Day Follow-Up Tracker
- Automatically schedules next follow-up dates (15 days for acute review, 30 days for constitutional assessment).
- Doctors can view due follow-ups and trigger patient notifications.

### 4. 🩺 Clinical Assistant Triage Station
- Record preliminary vitals: **Blood Pressure (mmHg), Temperature (°F), Pulse (bpm), SpO2 (%)**, and triage notes.
- Quick walk-in registration to dynamically route arriving patients directly into the live doctor queue.

### 5. 📊 Real-Time Analytics Dashboard
- Live counters for total appointments, pending triage, ongoing consultations, and follow-ups due.

---

## 📁 Project Architecture & Clean File Structure

```
cura/
├── pom.xml                                      # Maven config with Spring Boot 3.3.4 & Firebase Admin SDK
├── mvnw / mvnw.cmd                              # Maven wrapper
├── src/
│   ├── main/
│   │   ├── java/com/cura/cura/
│   │   │   ├── CuraApplication.java             # Spring Boot Application entrypoint
│   │   │   ├── config/
│   │   │   │   ├── SecurityConfig.java          # Spring Security 6 & CORS config
│   │   │   │   └── FirebaseConfig.java          # Firebase Admin SDK initialization
│   │   │   ├── controller/
│   │   │   │   ├── AuthController.java          # /api/auth/login, /api/auth/register
│   │   │   │   ├── AppointmentController.java   # /api/appointments, vitals, follow-ups
│   │   │   │   ├── PrescriptionController.java  # /api/prescriptions
│   │   │   │   ├── AnalyticsController.java     # /api/analytics/summary
│   │   │   │   └── DoctorController.java        # /api/doctors
│   │   │   ├── dto/                             # Request/Response DTOs
│   │   │   ├── model/                           # Domain Models (Appointment, User, Vitals, etc.)
│   │   │   └── service/                         # Business logic & seed data
│   │   └── resources/
│   │       ├── application.properties           # Server properties & Firebase settings
│   │       └── static/
│   │           ├── index.html                   # Sign In / Sign Up page
│   │           ├── dashboard.html               # Admin Router & Analytics
│   │           ├── patient-dashboard.html       # Patient Booking with 3-Question Quiz
│   │           ├── doctor-dashboard.html        # Doctor Consultations & Prescriptions
│   │           ├── assistant-dashboard.html     # Assistant Vitals & Triage Station
│   │           ├── manifest.json                # PWA configuration & icons
│   │           ├── service-worker.js            # Offline asset caching
│   │           ├── css/
│   │           │   └── style.css                # Unified Peachy Sage & Dark Mode stylesheet
│   │           └── js/
│   │               ├── app.js                   # Auth routing, toasts, dark mode
│   │               ├── patient.js               # Quiz calculator & booking flow
│   │               ├── doctor.js                # Queue, prescriptions & follow-ups
│   │               ├── assistant.js             # Vitals entry & walk-in triage
│   │               └── firebase-config.js       # Firebase SDK bridge
```

---

## 🛠️ How to Run Locally

### Option A: Run with Spring Boot Backend
```bash
# In the project root:
.\mvnw.cmd spring-boot:run
```
Then visit: `http://localhost:8080/index.html`

### Option B: Quick Static / Frontend Testing
Open any `.html` file (e.g. `src/main/resources/static/index.html`) directly in your web browser or use Live Server!

---

## 🔥 How to Connect Firebase for FREE (Spark Plan)

1. Open the [Firebase Console](https://console.firebase.google.com/) and click **Add Project** (e.g., `cura-clinic`).
2. Under **Build > Authentication**, enable **Email/Password**.
3. Under **Build > Firestore Database**, click **Create Database** (choose Test Mode).
4. In **Project Settings**, register a Web App (`</>`) and copy the `firebaseConfig` keys.
5. Paste them into `src/main/resources/static/js/firebase-config.js`.

---

## ☁️ 100% Free Deployment Options (For Students)
- **Frontend (PWA)**: Deploy to **Firebase Hosting** (free command: `firebase deploy`).
- **Backend (Spring Boot)**: Deploy to **Render.com** (Free Web Service tier) or **Railway.app** starter tier.
