/**
 * CURA - Firebase Configuration & Bridge
 * Provides connection to Firebase Authentication and Cloud Firestore.
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

function isFirebaseConfigured() {
    return !!(firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_FIREBASE_API_KEY"));
}

if (typeof firebase !== 'undefined' && isFirebaseConfigured()) {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        firebaseInitialized = true;
        console.log("Cura: Firebase initialized successfully.");
    } catch (e) {
        console.warn("Cura: Firebase initialization skipped/failed. Using local store fallback.", e);
    }
} else {
    console.log("Cura: Running with local fallback storage.");
}

window.CuraFirebase = {
    isReady: () => firebaseInitialized && typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0,
    config: firebaseConfig,
    auth: () => (typeof firebase !== 'undefined' ? firebase.auth() : null),
    db: () => (typeof firebase !== 'undefined' ? firebase.firestore() : null),
    waitForAuth: () => {
        return new Promise((resolve) => {
            if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
                resolve(null);
                return;
            }
            try {
                const auth = firebase.auth();
                if (!auth) {
                    resolve(null);
                    return;
                }
                if (auth.currentUser) {
                    resolve(auth.currentUser);
                    return;
                }
                let resolved = false;
                const unsubscribe = auth.onAuthStateChanged((user) => {
                    if (!resolved) {
                        resolved = true;
                        unsubscribe();
                        resolve(user);
                    }
                });
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        resolve(auth.currentUser);
                    }
                }, 1800);
            } catch (err) {
                resolve(null);
            }
        });
    }
};
