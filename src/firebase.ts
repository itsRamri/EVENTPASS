import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBi0SGNVXJN6xzN_zaUpZYQUfADaiP-joA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "eventpass-ad141.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "eventpass-ad141",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "eventpass-ad141.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "464339617563",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:464339617563:android:0bab8a4ed84718b9c575be"
};

// Initialize Firebase App singleton safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
