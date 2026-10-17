import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';
import { signInWithPopup, signOut as fbSignOut, User as FbUser } from 'firebase/auth';
import { db, auth, googleProvider } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { User, LiteracyEntry, MonthlyVerification } from '../types';

const USERS_COL = 'users';
const ENTRIES_COL = 'literacy_entries';
const MONTHLY_VERIFICATIONS_COL = 'monthly_verifications';

/**
 * Recursively remove keys with undefined values because Firestore rejects undefined
 */
export function cleanUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanUndefined(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as Partial<T>;
}

/**
 * Real-time listener for users collection
 * Triggers callback immediately on any insert, update, or delete
 */
export function subscribeUsers(
  onUsersUpdate: (users: User[]) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    collection(db, USERS_COL),
    (snapshot) => {
      const list: User[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as User);
      });
      onUsersUpdate(list);
    },
    (error) => {
      console.warn('Real-time users subscription error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Real-time listener for literacy entries collection
 * Triggers callback immediately on any new journal submission, grading, or deletion
 */
export function subscribeEntries(
  onEntriesUpdate: (entries: LiteracyEntry[]) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    collection(db, ENTRIES_COL),
    (snapshot) => {
      const list: LiteracyEntry[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as LiteracyEntry);
      });
      // Sort newest date / createdAt first
      list.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
      onEntriesUpdate(list);
    },
    (error) => {
      console.warn('Real-time entries subscription error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Save / Upsert a user document
 */
export async function saveUserToFirestore(user: User): Promise<void> {
  const path = `${USERS_COL}/${user.id}`;
  try {
    const cleaned = cleanUndefined(user);
    await setDoc(doc(db, USERS_COL, user.id), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch all users and entries directly from Firestore (one-time fast sync)
 */
export async function fetchAllFromFirestore(): Promise<{ users: User[]; entries: LiteracyEntry[] }> {
  try {
    const [userSnap, entrySnap] = await Promise.all([
      getDocs(collection(db, USERS_COL)),
      getDocs(collection(db, ENTRIES_COL)),
    ]);

    const users: User[] = [];
    userSnap.forEach((d) => {
      users.push(d.data() as User);
    });

    const entries: LiteracyEntry[] = [];
    entrySnap.forEach((d) => {
      entries.push(d.data() as LiteracyEntry);
    });
    entries.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));

    return { users, entries };
  } catch (err) {
    console.warn('Failed to fetch all from Firestore:', err);
    return { users: [], entries: [] };
  }
}

/**
 * Save batch users (e.g. from Excel/CSV import) with gentle pacing
 */
export async function saveBatchUsersToFirestore(users: User[]): Promise<void> {
  for (const u of users) {
    await saveUserToFirestore(u);
    if (users.length > 5) {
      await new Promise((r) => setTimeout(r, 60));
    }
  }
}

/**
 * Delete a user from Firestore
 */
export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const path = `${USERS_COL}/${userId}`;
  try {
    await deleteDoc(doc(db, USERS_COL, userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Delete multiple users in batch from Firestore
 */
export async function deleteBatchUsersFromFirestore(userIds: string[]): Promise<void> {
  for (const userId of userIds) {
    try {
      await deleteDoc(doc(db, USERS_COL, userId));
    } catch (err) {
      console.warn(`Failed to delete user ${userId} in batch:`, err);
    }
  }
}

/**
 * Create a literacy journal entry
 */
export async function createEntryInFirestore(entry: LiteracyEntry): Promise<void> {
  const path = `${ENTRIES_COL}/${entry.id}`;
  try {
    const cleaned = cleanUndefined(entry);
    await setDoc(doc(db, ENTRIES_COL, entry.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Update an existing literacy journal entry (e.g. teacher validation, student editing)
 */
export async function updateEntryInFirestore(
  entryId: string, 
  updates: Partial<LiteracyEntry>
): Promise<void> {
  const path = `${ENTRIES_COL}/${entryId}`;
  try {
    const cleaned = cleanUndefined(updates);
    await updateDoc(doc(db, ENTRIES_COL, entryId), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete an entry from Firestore
 */
export async function deleteEntryFromFirestore(entryId: string): Promise<void> {
  const path = `${ENTRIES_COL}/${entryId}`;
  try {
    await deleteDoc(doc(db, ENTRIES_COL, entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Initial data seeding is permanently disabled per system requirements:
 * Data is persistent and must never be reset back to default demo data.
 */
export async function seedInitialFirestoreDataIfEmpty(
  _initialUsers: User[],
  _initialEntries: LiteracyEntry[]
): Promise<void> {
  // No-op: do not seed or overwrite live Firestore records
  return Promise.resolve();
}

/**
 * Sign in using Google popup
 */
export async function signInWithGoogle(): Promise<{ fbUser: FbUser; appUser: User }> {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;
  const isBootstrappedAdmin = fbUser.email?.toLowerCase() === 'firdaustommy89@gmail.com';

  const appUser: User = {
    id: fbUser.uid,
    username: fbUser.email?.split('@')[0] || `user_${fbUser.uid.slice(0, 6)}`,
    name: fbUser.displayName || 'Pengguna Google',
    role: isBootstrappedAdmin ? 'admin' : 'guru',
    email: fbUser.email || undefined,
    avatar: fbUser.photoURL || undefined,
  };

  // Upsert user into Firestore
  await saveUserToFirestore(appUser);

  return { fbUser, appUser };
}

/**
 * Sign out from Firebase Auth
 */
export async function signOutFirebase(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Real-time listener for monthly verifications collection
 */
export function subscribeMonthlyVerifications(
  onUpdate: (verifications: MonthlyVerification[]) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    collection(db, MONTHLY_VERIFICATIONS_COL),
    (snapshot) => {
      const list: MonthlyVerification[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as MonthlyVerification);
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Real-time monthly verifications subscription error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Save / Upsert monthly verification and accumulated score by teacher
 */
export async function saveMonthlyVerificationToFirestore(
  verification: MonthlyVerification
): Promise<void> {
  const docId = verification.id || `${verification.studentId}_${verification.monthKey}`;
  const path = `${MONTHLY_VERIFICATIONS_COL}/${docId}`;
  try {
    const cleaned = cleanUndefined({ ...verification, id: docId });
    await setDoc(doc(db, MONTHLY_VERIFICATIONS_COL, docId), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

