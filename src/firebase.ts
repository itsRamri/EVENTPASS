import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyBi0SGNVXJN6xzN_zaUpZYQUfADaiP-joA",
  authDomain: "eventpass-ad141.firebaseapp.com",
  projectId: "eventpass-ad141",
  storageBucket: "eventpass-ad141.firebasestorage.app",
  messagingSenderId: "464339617563",
  appId: "1:464339617563:android:0bab8a4ed84718b9c575be"
};

// Initialize Firebase App singleton safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
