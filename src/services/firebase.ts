import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with specific database ID if specified
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Helper for Google Sign-In
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  await fbSignOut(auth);
}

// Firestore Helper: Save AI Copilot or Audit Note
export async function saveAuditNoteToFirestore(note: {
  author: string;
  category: string;
  content: string;
  shipmentTracking?: string;
  warehouseCode?: string;
}): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'vaxguard_audit_notes'), {
      ...note,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.warn('Firestore write warning:', error);
    return 'local-cached-' + Date.now();
  }
}

// Firestore Helper: Fetch Recent Notes
export async function getRecentAuditNotesFromFirestore(): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'vaxguard_audit_notes'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.warn('Firestore read warning:', error);
    return [];
  }
}
