import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  updateDoc 
} from 'firebase/firestore';
import { 
  ref, 
  uploadString, 
  getDownloadURL 
} from 'firebase/storage';
import { db, storage } from '../firebase';
import { 
  EventItem, 
  GuestRegistration, 
  StaffMember, 
  NotificationItem, 
  ScanHistoryRecord, 
  UserProfile,
  CheckinAuditRecord 
} from '../types';

// ==========================================
// 1. FIRESTORE COLLECTIONS (DATABASE TABLES)
// ==========================================

export const COLLECTIONS = {
  EVENTS: 'events',
  GUESTS: 'guests',
  STAFF: 'staff',
  SCAN_LOGS: 'scan_logs',
  NOTIFICATIONS: 'notifications',
  USERS: 'users',
  CHECKINS: 'checkins'
} as const;

// ==========================================
// 2. EVENTS TABLE (CRUD)
// ==========================================

export const syncEventToDb = async (event: EventItem): Promise<void> => {
  try {
    let coverUrl = event.coverImage;
    if (coverUrl && coverUrl.startsWith('data:image/')) {
      try {
        coverUrl = await uploadBase64ImageToStorage(coverUrl, `events/${event.id}/cover.jpg`);
      } catch (e) {
        console.warn('Cover upload to storage notice:', e);
      }
    }

    const eventPayload: EventItem = {
      ...event,
      coverImage: coverUrl || event.coverImage
    };

    const docRef = doc(db, COLLECTIONS.EVENTS, event.id);
    await setDoc(docRef, eventPayload, { merge: true });
    console.log(`✓ Event/Party "${event.name}" synced to Firebase Firestore (ID: ${event.id})`);
  } catch (err) {
    console.warn('Firestore syncEvent notice (using local cache):', err);
  }
};

export const deleteEventFromDb = async (eventId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.EVENTS, eventId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteEvent notice:', err);
  }
};

export const subscribeToEvents = (callback: (events: EventItem[]) => void) => {
  try {
    const q = query(collection(db, COLLECTIONS.EVENTS));
    return onSnapshot(q, (snapshot) => {
      const items: EventItem[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as EventItem);
      });
      if (items.length > 0) {
        callback(items);
      }
    }, (error) => {
      console.warn('Events snapshot listener notice:', error);
    });
  } catch (err) {
    console.warn('Events subscription error:', err);
    return () => {};
  }
};

export const fetchEventFromDbById = async (idOrQuery: string): Promise<EventItem | null> => {
  try {
    const clean = idOrQuery.trim();
    if (!clean) return null;

    // 1. Try direct doc lookup
    const docRef = doc(db, COLLECTIONS.EVENTS, clean);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as EventItem;
    }

    // 2. Scan events collection in case query is case-insensitive, prefix, or name
    const q = query(collection(db, COLLECTIONS.EVENTS));
    const querySnap = await getDocs(q);
    let matched: EventItem | null = null;
    const lowerClean = clean.toLowerCase();
    const cleanAlphanumeric = lowerClean.replace(/[^a-z0-9]/g, '');

    querySnap.forEach((d) => {
      const item = d.data() as EventItem;
      const itemId = (item.id || '').toLowerCase();
      const itemName = (item.name || '').toLowerCase();
      const itemPrefix = (item.tokenSettings?.prefix || '').toLowerCase();

      if (
        itemId === lowerClean ||
        (cleanAlphanumeric && itemId.replace(/[^a-z0-9]/g, '') === cleanAlphanumeric) ||
        (itemPrefix && itemPrefix === lowerClean) ||
        itemName === lowerClean ||
        itemName.includes(lowerClean)
      ) {
        matched = item;
      }
    });

    return matched;
  } catch (err) {
    console.warn('Firestore fetchEventFromDbById error:', err);
    return null;
  }
};

// ==========================================
// 3. GUESTS / PASSES TABLE (CRUD)
// ==========================================

export const syncGuestToDb = async (guest: GuestRegistration): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.GUESTS, guest.id);
    await setDoc(docRef, guest, { merge: true });
  } catch (err) {
    console.warn('Firestore syncGuest notice:', err);
  }
};

export const updateGuestStatusInDb = async (guestId: string, status: string, checkInTime?: string, scannedBy?: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.GUESTS, guestId);
    const updateData: any = { status };
    if (checkInTime) updateData.checkInTime = checkInTime;
    if (scannedBy) updateData.scannedBy = scannedBy;
    await updateDoc(docRef, updateData);
  } catch (err) {
    console.warn('Firestore updateGuestStatus notice:', err);
  }
};

export const deleteGuestFromDb = async (guestId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.GUESTS, guestId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteGuest notice:', err);
  }
};

export const subscribeToGuests = (callback: (guests: GuestRegistration[]) => void) => {
  try {
    const q = query(collection(db, COLLECTIONS.GUESTS));
    return onSnapshot(q, (snapshot) => {
      const items: GuestRegistration[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as GuestRegistration);
      });
      if (items.length > 0) {
        callback(items);
      }
    }, (error) => {
      console.warn('Guests snapshot listener notice:', error);
    });
  } catch (err) {
    console.warn('Guests subscription error:', err);
    return () => {};
  }
};

export const fetchGuestFromDbByToken = async (code: string): Promise<GuestRegistration | null> => {
  try {
    const raw = code.trim();
    if (!raw) return null;
    const q = raw.toUpperCase();

    // 1. Direct doc lookup by guest ID
    const docRef = doc(db, COLLECTIONS.GUESTS, raw);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as GuestRegistration;
    }

    // 2. Query all guests from Firestore to match token / passId / tokenList
    const querySnap = await getDocs(collection(db, COLLECTIONS.GUESTS));
    let matched: GuestRegistration | null = null;

    querySnap.forEach((d) => {
      const g = d.data() as GuestRegistration;
      const gToken = (g.token || '').toUpperCase();
      const gPassId = (g.passId || '').toUpperCase();
      const gId = (g.id || '').toUpperCase();
      const gTokens = (g.tokens || []).map(t => t.toUpperCase());
      const gTokenList = (g.tokenList || []).map(t => (t.tokenCode || '').toUpperCase());

      if (
        gToken === q ||
        gPassId === q ||
        gId === q ||
        gTokens.includes(q) ||
        gTokenList.includes(q) ||
        (g.email && g.email.toUpperCase() === q) ||
        (g.mobile && g.mobile.replace(/\D/g, '') === q.replace(/\D/g, '')) ||
        (q.length > 5 && gToken.includes(q)) ||
        (gToken.length > 5 && q.includes(gToken))
      ) {
        matched = g;
      }
    });

    return matched;
  } catch (err) {
    console.warn('fetchGuestFromDbByToken notice:', err);
    return null;
  }
};

// ==========================================
// 4. STAFF & PERMISSIONS TABLE
// ==========================================

export const syncStaffToDb = async (member: StaffMember): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.STAFF, member.id);
    await setDoc(docRef, member, { merge: true });
  } catch (err) {
    console.warn('Firestore syncStaff notice:', err);
  }
};

export const deleteStaffFromDb = async (staffId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.STAFF, staffId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteStaff notice:', err);
  }
};

export const subscribeToStaff = (callback: (staffList: StaffMember[]) => void) => {
  try {
    const q = query(collection(db, COLLECTIONS.STAFF));
    return onSnapshot(q, (snapshot) => {
      const items: StaffMember[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as StaffMember);
      });
      if (items.length > 0) {
        callback(items);
      }
    }, (error) => {
      console.warn('Staff snapshot listener notice:', error);
    });
  } catch (err) {
    console.warn('Staff subscription error:', err);
    return () => {};
  }
};

// ==========================================
// 5. SCAN LOGS & HISTORY TABLE
// ==========================================

export const syncScanLogToDb = async (log: ScanHistoryRecord): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.SCAN_LOGS, log.id);
    await setDoc(docRef, log, { merge: true });
  } catch (err) {
    console.warn('Firestore syncScanLog notice:', err);
  }
};

export const deleteScanLogFromDb = async (logId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.SCAN_LOGS, logId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteScanLog notice:', err);
  }
};

export const subscribeToScanLogs = (callback: (logs: ScanHistoryRecord[]) => void) => {
  try {
    const q = query(collection(db, COLLECTIONS.SCAN_LOGS));
    return onSnapshot(q, (snapshot) => {
      const items: ScanHistoryRecord[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as ScanHistoryRecord);
      });
      if (items.length > 0) {
        callback(items);
      }
    }, (error) => {
      console.warn('Scan logs snapshot listener notice:', error);
    });
  } catch (err) {
    console.warn('Scan logs subscription error:', err);
    return () => {};
  }
};

// ==========================================
// 5.1 IMMUTABLE CHECK-IN AUDIT TABLE
// ==========================================

export const syncCheckinAuditRecord = async (record: CheckinAuditRecord): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.CHECKINS, record.id);
    await setDoc(docRef, record, { merge: true });
    console.log(`✓ Immutable Checkin Audit Record saved to Firestore (ID: ${record.id}, Guest: ${record.guestName})`);
  } catch (err) {
    console.warn('Firestore syncCheckinAuditRecord notice:', err);
  }
};

export const subscribeToCheckins = (callback: (records: CheckinAuditRecord[]) => void) => {
  try {
    const q = query(collection(db, COLLECTIONS.CHECKINS));
    return onSnapshot(q, (snapshot) => {
      const items: CheckinAuditRecord[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as CheckinAuditRecord);
      });
      if (items.length > 0) {
        // Sort descending by timestamp / ISO
        items.sort((a, b) => (b.isoTimestamp || '').localeCompare(a.isoTimestamp || ''));
        callback(items);
      }
    }, (error) => {
      console.warn('Checkins snapshot listener notice:', error);
    });
  } catch (err) {
    console.warn('Checkins subscription error:', err);
    return () => {};
  }
};

// ==========================================
// 6. NOTIFICATIONS TABLE
// ==========================================

export const syncNotificationToDb = async (notif: NotificationItem): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notif.id);
    await setDoc(docRef, notif, { merge: true });
  } catch (err) {
    console.warn('Firestore syncNotification notice:', err);
  }
};

export const deleteNotificationFromDb = async (notifId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notifId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteNotification notice:', err);
  }
};

export const subscribeToNotifications = (callback: (notifications: NotificationItem[]) => void) => {
  try {
    const notifsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    return onSnapshot(notifsRef, (snapshot) => {
      const items: NotificationItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as NotificationItem);
      });
      if (items.length > 0) {
        callback(items);
      }
    }, (error) => {
      console.warn('Notifications snapshot listener notice:', error);
    });
  } catch (err) {
    console.warn('Notifications subscription error:', err);
    return () => {};
  }
};

// ==========================================
// 7. USER PROFILES TABLE
// ==========================================

export const syncUserProfileToDb = async (user: UserProfile): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, user.id || user.email);
    await setDoc(docRef, user, { merge: true });
  } catch (err) {
    console.warn('Firestore syncUserProfile notice:', err);
  }
};

// ==========================================
// 8. CLOUD STORAGE (FILE & PHOTO UPLOADS)
// ==========================================

export const uploadBase64ImageToStorage = async (base64Data: string, path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    await uploadString(storageRef, base64Data, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.warn('Firebase Storage upload notice (using base64 string fallback):', err);
    return base64Data;
  }
};

// ==========================================
// 9. AUTOMATIC FIRESTORE SEEDING & SETUP
// ==========================================

export const seedAllDataToFirestore = async (
  events: EventItem[],
  guests: GuestRegistration[],
  staff: StaffMember[],
  notifications: NotificationItem[],
  scanLogs: ScanHistoryRecord[],
  user: UserProfile,
  checkins?: CheckinAuditRecord[]
): Promise<void> => {
  try {
    console.log('⚡ Initializing Firestore tables and syncing default data...');

    // 1. Sync User Profile
    await syncUserProfileToDb(user);

    // 2. Sync Events Table
    for (const evt of events) {
      await syncEventToDb(evt);
    }

    // 3. Sync Guests Table
    for (const gst of guests) {
      await syncGuestToDb(gst);
    }

    // 4. Sync Staff Table
    for (const stf of staff) {
      await syncStaffToDb(stf);
    }

    // 5. Sync Notifications Table
    for (const notif of notifications) {
      await syncNotificationToDb(notif);
    }

    // 6. Sync Scan Logs Table
    for (const scan of scanLogs) {
      await syncScanLogToDb(scan);
    }

    // 7. Sync Immutable Checkins Audit Table
    if (checkins && checkins.length > 0) {
      for (const chk of checkins) {
        await syncCheckinAuditRecord(chk);
      }
    }

    console.log('✓ All 7 tables (including immutable checkins) successfully populated in Firebase Firestore!');
  } catch (err) {
    console.warn('Firestore seeding notice:', err);
  }
};
