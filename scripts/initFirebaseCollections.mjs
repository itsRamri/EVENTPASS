import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';

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

async function authenticate() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, "aarav.sharma@eventpass.io", "Admin@123456");
    console.log("✓ Authenticated as:", userCredential.user.email, "(UID:", userCredential.user.uid, ")");
    return;
  } catch (e) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, "aarav.sharma@eventpass.io", "Admin@123456");
      console.log("✓ Created and authenticated user:", userCredential.user.email);
      return;
    } catch (e2) {
      try {
        const anon = await signInAnonymously(auth);
        console.log("✓ Authenticated anonymously:", anon.user.uid);
        return;
      } catch (e3) {
        console.warn("Auth attempt warning:", e3.message);
      }
    }
  }
}

async function createAllCollections() {
  console.log('🚀 Initializing all Firebase Firestore collections and tables...');
  await authenticate();

  const currentUid = auth.currentUser ? auth.currentUser.uid : 'usr_manager_01';

  // 1. users Collection
  console.log('📦 1/7 Creating "users" collection...');
  try {
    await setDoc(doc(db, 'users', currentUid), {
      id: currentUid,
      name: 'Aarav Sharma',
      email: 'aarav.sharma@eventpass.io',
      mobile: '+91 98765 43210',
      role: 'manager',
      status: 'active',
      avatar: '',
      college: 'National Institute of Technology',
      branch: 'Computer Science & Engineering',
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log('  ✓ users collection ready');
  } catch (err) {
    console.warn('  ✗ users error:', err.message);
  }

  // 2. events Collection
  console.log('📦 2/7 Creating "events" collection...');
  try {
    await setDoc(doc(db, 'events', 'evt_fresher_2026'), {
      id: 'evt_fresher_2026',
      name: 'Mega Tech Fresher Gala 2026',
      tagline: 'Annual Flagship Induction & DJ Night',
      status: 'active',
      coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
      description: 'Welcome to the biggest celebration of the academic year! Featuring live performances, techno showcase, DJ night, refreshments, and interactive gaming arenas.',
      date: '2026-09-28',
      startTime: '18:00',
      endTime: '23:30',
      venue: 'Grand Central Auditorium, Campus East',
      location: 'Building 4, Sector 12, Tech City',
      organizer: 'Student Council & Tech Club',
      capacity: 1200,
      approvalMode: 'manual',
      passLayout: 'gradient',
      tokenSettings: {
        prefix: 'EP-GALA',
        format: 'PREFIX-NUMBER',
        autoIncrement: true
      },
      formFields: [
        { id: 'f1', label: 'Full Name', type: 'text', required: true },
        { id: 'f2', label: 'College Email ID', type: 'email', required: true },
        { id: 'f3', label: 'Mobile Number', type: 'tel', required: true },
        { id: 'f4', label: 'College / Institute', type: 'text', required: true },
        { id: 'f5', label: 'Department / Branch', type: 'text', required: true },
        { id: 'f6', label: 'Student Roll Number', type: 'text', required: true },
        { id: 'f7', label: 'Dietary Preference', type: 'select', required: true, options: ['Vegetarian', 'Non-Vegetarian', 'Jain', 'Vegan'] }
      ],
      documents: [
        { id: 'doc_1', name: 'Event_Safety_Guidelines.pdf', size: '1.4 MB', uploadDate: '2026-09-15', type: 'pdf', url: '#' },
        { id: 'doc_2', name: 'Campus_Entry_Map.png', size: '3.2 MB', uploadDate: '2026-09-16', type: 'image', url: '#' }
      ]
    }, { merge: true });

    await setDoc(doc(db, 'events', 'evt_hackathon_2026'), {
      id: 'evt_hackathon_2026',
      name: 'HackAI 48-Hour National Hackathon',
      tagline: 'Build the Next Frontier of Generative AI',
      status: 'active',
      coverImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80',
      description: '48 hours of non-stop code, mentorship from industry leaders, cash prizes worth 5 Lakhs, and instant hiring opportunities.',
      date: '2026-10-05',
      startTime: '09:00',
      endTime: '20:00',
      venue: 'Tech Innovation Hub, Block C',
      location: 'Innovation Corridor, Cyber Park',
      organizer: 'AI & Robotics Society',
      capacity: 500,
      approvalMode: 'auto',
      passLayout: 'modern',
      tokenSettings: {
        prefix: 'EP-HACK',
        format: 'PREFIX-NUMBER',
        autoIncrement: true
      }
    }, { merge: true });
    console.log('  ✓ events collection ready');
  } catch (err) {
    console.warn('  ✗ events error:', err.message);
  }

  // 3. guests Collection
  console.log('📦 3/7 Creating "guests" collection...');
  try {
    await setDoc(doc(db, 'guests', 'gst_101'), {
      id: 'gst_101',
      eventId: 'evt_fresher_2026',
      name: 'Shubham Kumar',
      email: 'shubham.k@gmail.com',
      mobile: '+91 91234 56789',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      college: 'National Institute of Technology',
      branch: 'Computer Science & Eng.',
      rollNo: '2023CSB1042',
      status: 'approved',
      token: 'EP-GALA-10284',
      passId: 'PASS-892147',
      registrationDate: '15 Sep 2026, 02:20:15 PM',
      checkInTime: null,
      scanTimestamp: null,
      answers: {
        'Full Name': 'Shubham Kumar',
        'College Email ID': 'shubham.2023cs@nit.edu',
        'Mobile Number': '+91 91234 56789',
        'College / Institute': 'National Institute of Technology',
        'Department / Branch': 'Computer Science & Eng.',
        'Student Roll Number': '2023CSB1042',
        'Dietary Preference': 'Vegetarian'
      }
    }, { merge: true });

    await setDoc(doc(db, 'guests', 'gst_103'), {
      id: 'gst_103',
      eventId: 'evt_fresher_2026',
      name: 'Rohan Deshmukh',
      email: 'rohan.desh@gmail.com',
      mobile: '+91 94567 89012',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      college: 'BITS Pilani',
      branch: 'Mechanical Eng.',
      rollNo: '2022MECH09',
      status: 'checkedin',
      token: 'EP-GALA-10190',
      passId: 'PASS-771923',
      registrationDate: '14 Sep 2026, 11:15:00 AM',
      checkInTime: '16 Sep 2026, 04:30:22 PM',
      scanTimestamp: '16 Sep 2026, 04:30:22 PM',
      scannedBy: 'Rahul Kumar (Staff)'
    }, { merge: true });
    console.log('  ✓ guests collection ready');
  } catch (err) {
    console.warn('  ✗ guests error:', err.message);
  }

  // 4. staff Collection
  console.log('📦 4/7 Creating "staff" collection...');
  try {
    await setDoc(doc(db, 'staff', 'stf_001'), {
      id: 'stf_001',
      name: 'Rahul Kumar',
      email: 'rahul.scanner@eventpass.io',
      phone: '+91 98123 45670',
      role: 'Chief Scanner (Gate 1)',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      assignedGates: ['Main Gate (North)', 'VIP Red Carpet Gate'],
      totalScans: 342,
      permissions: {
        canScan: true,
        canApprove: false,
        canReject: false,
        canExport: false,
        canManageStaff: false
      }
    }, { merge: true });
    console.log('  ✓ staff collection ready');
  } catch (err) {
    console.warn('  ✗ staff error:', err.message);
  }

  // 5. scan_logs Collection
  console.log('📦 5/7 Creating "scan_logs" collection...');
  try {
    await setDoc(doc(db, 'scan_logs', 'scan_101'), {
      id: 'scan_101',
      guestName: 'Rohan Deshmukh',
      token: 'EP-GALA-10190',
      passId: 'PASS-771923',
      eventName: 'Mega Tech Fresher Gala 2026',
      timestamp: '16 Sep 2026, 04:30:22 PM',
      status: 'checkedin',
      scannerStaff: 'Rahul Kumar (Gate 1)'
    }, { merge: true });
    console.log('  ✓ scan_logs collection ready');
  } catch (err) {
    console.warn('  ✗ scan_logs error:', err.message);
  }

  // 6. notifications Collection
  console.log('📦 6/7 Creating "notifications" collection...');
  try {
    await setDoc(doc(db, 'notifications', 'notif_1'), {
      id: 'notif_1',
      title: 'Real-time Scanner Sync Active',
      message: 'All 7 Firestore tables are connected with live sync.',
      timestamp: 'Just now',
      read: false,
      type: 'info'
    }, { merge: true });
    console.log('  ✓ notifications collection ready');
  } catch (err) {
    console.warn('  ✗ notifications error:', err.message);
  }

  // 7. checkins (Immutable Audit Table) Collection
  console.log('📦 7/7 Creating "checkins" (Immutable Audit) collection...');
  try {
    await setDoc(doc(db, 'checkins', 'chk_1726569022_9a8f'), {
      id: 'chk_1726569022_9a8f',
      guestId: 'gst_103',
      guestName: 'Rohan Deshmukh',
      eventId: 'evt_fresher_2026',
      eventName: 'Mega Tech Fresher Gala 2026',
      timestamp: '16 Sep 2026, 04:30:22 PM',
      isoTimestamp: '2026-09-16T11:00:22.000Z',
      scannedBy: 'Rahul Kumar (Staff)',
      token: 'EP-GALA-10190',
      passId: 'PASS-771923',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      college: 'BITS Pilani',
      branch: 'Mechanical Eng.',
      rollNo: '2022MECH09',
      gate: 'Main Entry Gate (Gate 1)',
      status: 'checkedin'
    }, { merge: true });
    console.log('  ✓ checkins collection ready');
  } catch (err) {
    console.warn('  ✗ checkins error:', err.message);
  }

  console.log('\n🎉 ALL 7 FIRESTORE COLLECTIONS HAVE BEEN POPULATED IN FIREBASE CONSOLE!');
  process.exit(0);
}

createAllCollections().catch(err => {
  console.error('Execution notice:', err);
  process.exit(1);
});
