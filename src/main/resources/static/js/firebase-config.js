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
    apiKey: "AIzaSy_YOUR_FIREBASE_API_KEY_HERE",
    authDomain: "cura-clinic-app.firebaseapp.com",
    projectId: "cura-clinic-app",
    storageBucket: "cura-clinic-app.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
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
