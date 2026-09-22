/**
 * CURA - Firebase Configuration & Bridge
 * 
 * Instructions to connect your real Firebase project for FREE:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a free project named 'Cura' (Spark plan is 100% free)
 * 3. Add a Web App and enable "Firebase Authentication" (Email/Password)
 * 4. Enable "Cloud Firestore" (Start in test mode)
 * 5. Replace the placeholder values below with your credentials.
 */

const firebaseConfig = {
  apiKey: "AIzaSyB6wrdZ2Ua-qO296FyXjMwLk21ypVtafMA",
  authDomain: "cura-clinic-db.firebaseapp.com",
  projectId: "cura-clinic-db",
  storageBucket: "cura-clinic-db.firebasestorage.app",
  messagingSenderId: "125501944441",
  appId: "1:125501944441:web:df664ab629908a68041aa8"
};

let firebaseInitialized = false;

// Check if actual keys are supplied or if running in local mode
function isFirebaseConfigured() {
    return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_FIREBASE_API_KEY");
}

if (typeof firebase !== 'undefined' && isFirebaseConfigured()) {
    try {
        firebase.initializeApp(firebaseConfig);
        firebaseInitialized = true;
        console.log("🌿 Cura: Firebase initialized successfully.");
    } catch (e) {
        console.warn("🌿 Cura: Firebase initialization skipped/failed. Using local store.", e);
    }
} else {
    console.log("🌿 Cura: Running in local Spring Boot / LocalStorage mode (Add Firebase keys in js/firebase-config.js whenever ready).");
}

window.CuraFirebase = {
    isReady: () => firebaseInitialized,
    config: firebaseConfig
};
