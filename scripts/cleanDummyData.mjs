import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      const val = (match[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "eventpass-ad141.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "eventpass-ad141",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "eventpass-ad141.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "464339617563",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:464339617563:android:0bab8a4ed84718b9c575be"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function cleanDummyData() {
  console.log('🧹 Cleaning dummy collections from Firestore...');
  try {
    const cred = await signInWithEmailAndPassword(auth, "aarav.sharma@eventpass.io", "Admin@123456");
    console.log("✓ Authenticated as:", cred.user.email);
  } catch (e) {
    console.log('Auth note:', e.message);
  }

  // Delete known dummy events
  const dummyEventIds = ['evt_fresher_2026', 'evt_hackathon_2026'];
  for (const id of dummyEventIds) {
    try {
      await deleteDoc(doc(db, 'events', id));
      console.log(`✓ Removed dummy event: ${id}`);
    } catch (err) {
      console.warn(`Could not delete event ${id}:`, err.message);
    }
  }

  // Delete known dummy guests
  const dummyGuestIds = ['gst_101', 'gst_103'];
  for (const id of dummyGuestIds) {
    try {
      await deleteDoc(doc(db, 'guests', id));
      console.log(`✓ Removed dummy guest: ${id}`);
    } catch (err) {
      console.warn(`Could not delete guest ${id}:`, err.message);
    }
  }

  // Delete known dummy users
  const dummyUserIds = ['usr_manager_01', 'usr_manager_aarav'];
  for (const id of dummyUserIds) {
    try {
      await deleteDoc(doc(db, 'users', id));
      console.log(`✓ Removed dummy user: ${id}`);
    } catch (err) {
      console.warn(`Could not delete user ${id}:`, err.message);
    }
  }

  console.log('✨ All dummy items erased from Firestore!');
  process.exit(0);
}

cleanDummyData();
