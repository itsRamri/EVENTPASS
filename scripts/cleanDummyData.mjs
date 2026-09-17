import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBi0SGNVXJN6xzN_zaUpZYQUfADaiP-joA",
  authDomain: "eventpass-ad141.firebaseapp.com",
  projectId: "eventpass-ad141",
  storageBucket: "eventpass-ad141.firebasestorage.app",
  messagingSenderId: "464339617563",
  appId: "1:464339617563:android:0bab8a4ed84718b9c575be"
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
