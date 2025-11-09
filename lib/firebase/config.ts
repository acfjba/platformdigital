// src/lib/firebase/config.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-L2Zx9FSDysCO6OypaaswfsQX4F4q73s",
  authDomain: "school-platform-kc9uh.firebaseapp.com",
  projectId: "school-platform-kc9uh",
  storageBucket: "school-platform-kc9uh.firebasestorage.app",
  messagingSenderId: "840322255670",
  appId: "1:840322255670:web:98e2f0f3ef1774a850c197"
};

function isFirebaseConfigValid(config: any): boolean {
    return !!(config.apiKey && config.authDomain && config.projectId);
}

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

const isFirebaseConfigured = isFirebaseConfigValid(firebaseConfig);

if (isFirebaseConfigured) {
    if (!getApps().length) {
        try {
            app = initializeApp(firebaseConfig);
        } catch (error) {
            console.error("Firebase initialization error:", error);
            app = undefined; // Ensure app is undefined on error
        }
    } else {
        app = getApps()[0];
    }
    
    if (app) {
        try {
            db = getFirestore(app);
        } catch (error) {
            console.error("Firestore initialization error:", error);
            db = undefined; // Ensure db is undefined on error
        }
    }
} else {
    console.warn("Firebase configuration is missing or incomplete. The app will run in a limited, offline mode.");
}

export { db, isFirebaseConfigured };
