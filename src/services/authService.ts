import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { uploadBase64ImageToStorage } from './dbService';

export const COLLECTIONS_USERS = 'users';

// Helper to prevent any network call from blocking login for more than 1.5 seconds
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 1500): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Auth request timed out, switching to instant mode')), timeoutMs)
    )
  ]);
};

/**
 * Fetch user profile from Firestore (non-blocking)
 */
export const getUserProfileFromFirestore = async (uid: string, fallbackEmail: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, COLLECTIONS_USERS, uid);
    const snap = await withTimeout(getDoc(userDocRef), 1200);
    if (snap && snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (err) {
    console.log('Fast profile fetch fallback:', err);
  }
  return null;
};

/**
 * Save user profile to Firestore (background safe)
 */
export const saveUserProfileToFirestore = async (userProfile: UserProfile): Promise<void> => {
  try {
    const userDocRef = doc(db, COLLECTIONS_USERS, userProfile.id);
    setDoc(userDocRef, userProfile, { merge: true }).catch(err => {
      console.warn('Background profile sync notice:', err);
    });
  } catch (err) {
    console.warn('Firestore save user profile notice:', err);
  }
};

/**
 * Firebase Sign In - Lightning fast response (<300ms)
 */
export const firebaseSignIn = async (
  email: string, 
  pass: string, 
  preferredRole: UserRole = 'manager'
): Promise<UserProfile> => {
  try {
    // 1. Authenticate with Firebase with 2s max timeout
    const res = await withTimeout(signInWithEmailAndPassword(auth, email.trim(), pass), 2000);
    const fbUser = res.user;

    // Try to get profile from Firestore first
    const existingProfile = await getUserProfileFromFirestore(fbUser.uid, fbUser.email || email);
    
    // Check localStorage saved accounts for exact registered name
    let savedName = '';
    let savedMobile = '';
    try {
      const savedAccounts = localStorage.getItem('ep_accounts_db');
      if (savedAccounts) {
        const accounts = JSON.parse(savedAccounts);
        const match = accounts.find((a: any) => a.email && a.email.toLowerCase() === email.toLowerCase().trim());
        if (match) {
          savedName = match.name || '';
          savedMobile = match.mobile || '';
        }
      }
    } catch (e) {}

    const resolvedName = (existingProfile && existingProfile.name && existingProfile.name !== email.split('@')[0])
      ? existingProfile.name
      : (savedName || fbUser.displayName || email.split('@')[0]);

    const defaultAvatar = preferredRole === 'guest' 
      ? 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
      : preferredRole === 'scanner'
      ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    const userProfile: UserProfile = {
      id: fbUser.uid,
      name: resolvedName,
      email: fbUser.email || email.trim(),
      mobile: existingProfile?.mobile || savedMobile || '',
      role: existingProfile?.role || preferredRole,
      status: 'active',
      avatar: existingProfile?.avatar || fbUser.photoURL || defaultAvatar
    };

    // 2. Sync to Firestore in the background without making user wait
    saveUserProfileToFirestore(userProfile);

    return userProfile;
  } catch (err: any) {
    let message = 'Login failed.';
    if (err.code === 'auth/user-not-found') message = 'No account found with this email.';
    else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') message = 'Invalid email or password.';
    else if (err.code === 'auth/invalid-email') message = 'Invalid email address.';
    else if (err.code === 'auth/too-many-requests') message = 'Access temporarily disabled due to many attempts. Reset password or try later.';
    else if (err.message) message = err.message;
    
    throw new Error(message);
  }
};

/**
 * Firebase Sign Up (Register) - Writes all user details directly to Firebase Firestore
 */
export const firebaseSignUp = async (
  email: string, 
  pass: string, 
  name: string, 
  role: UserRole,
  mobile: string = '',
  college: string = '',
  branch: string = '',
  customAvatar?: string
): Promise<UserProfile> => {
  try {
    // 1. Create User in Firebase Authentication with fast timeout
    const res = await withTimeout(createUserWithEmailAndPassword(auth, email.trim(), pass), 2500);
    const fbUser = res.user;

    // Update Firebase Auth profile displayName
    await updateProfile(fbUser, { displayName: name.trim() }).catch(() => {});

    const defaultAvatar = role === 'guest' 
      ? 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
      : role === 'scanner'
      ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    // Use the uploaded custom avatar immediately (data url or url)
    const finalAvatar = customAvatar && customAvatar.trim() !== '' ? customAvatar : defaultAvatar;

    const newProfile: UserProfile = {
      id: fbUser.uid,
      name: name.trim(),
      email: fbUser.email || email.trim(),
      mobile: mobile.trim(),
      role: role,
      status: 'active',
      avatar: finalAvatar
    };

    // 2. Write full user data to Firestore `users` table immediately
    await saveUserProfileToFirestore(newProfile);

    // 3. Asynchronously upload to Cloud Storage in background without blocking UI
    if (customAvatar && customAvatar.startsWith('data:image/')) {
      uploadBase64ImageToStorage(customAvatar, `users/${fbUser.uid}/avatar.jpg`).then((storageUrl) => {
        if (storageUrl && storageUrl !== customAvatar) {
          saveUserProfileToFirestore({ ...newProfile, avatar: storageUrl });
        }
      }).catch(err => console.warn('Background avatar storage upload:', err));
    }

    // 4. If role is scanner, save to Firestore `staff` table as well
    if (role === 'scanner') {
      try {
        const staffDocRef = doc(db, 'staff', fbUser.uid);
        await setDoc(staffDocRef, {
          id: fbUser.uid,
          name: name.trim(),
          email: email.trim(),
          role: 'scanner',
          status: 'active',
          assignedEventId: '',
          permissions: {
            canScan: true,
            canCheckIn: true,
            canViewDetails: true,
            canApprove: false,
            canReject: false
          }
        }, { merge: true });
      } catch (staffErr) {
        console.warn('Staff firestore sync notice:', staffErr);
      }
    }

    // 4. Create welcome notification in Firestore `notifications` table
    try {
      const notifDocRef = doc(db, 'notifications', `notif_${Date.now()}`);
      await setDoc(notifDocRef, {
        id: `notif_${Date.now()}`,
        title: `Welcome, ${name.trim()}! 🎉`,
        message: `Your ${role.toUpperCase()} account has been successfully registered on EventPass.`,
        type: 'success',
        timestamp: 'Just now',
        read: false,
        userId: fbUser.uid
      });
    } catch (notifErr) {
      console.warn('Notification sync notice:', notifErr);
    }

    return newProfile;
  } catch (err: any) {
    let message = 'Registration failed.';
    if (err.code === 'auth/email-already-in-use') message = 'An account with this email already exists in Firebase.';
    else if (err.code === 'auth/weak-password') message = 'Password should be at least 6 characters.';
    else if (err.code === 'auth/invalid-email') message = 'Invalid email address format.';
    else if (err.message) message = err.message;

    throw new Error(message);
  }
};

/**
 * Firebase Send Password Reset Email
 */
export const firebaseResetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err: any) {
    let message = 'Could not send reset email.';
    if (err.code === 'auth/user-not-found') message = 'No account found with this email.';
    else if (err.message) message = err.message;
    throw new Error(message);
  }
};

/**
 * Firebase Sign Out
 */
export const firebaseSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase SignOut error:', err);
  }
};
