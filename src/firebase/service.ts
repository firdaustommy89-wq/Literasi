import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  onSnapshot 
} from 'firebase/firestore';
import { signInWithPopup, signOut as fbSignOut, User as FbUser } from 'firebase/auth';
import { db, auth, googleProvider } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { User, LiteracyEntry, MonthlyVerification, SchoolProfileSettings, RombelItem, JournalCutoffConfig } from '../types';
import { INITIAL_USERS, INITIAL_LITERACY_ENTRIES } from '../data/initialData';

const USERS_COL = 'users';
const ENTRIES_COL = 'literacy_entries';
const MONTHLY_VERIFICATIONS_COL = 'monthly_verifications';
const SYSTEM_CONFIG_COL = 'system_config';
const ACADEMIC_DOC_ID = 'academic_settings';
export const SCHOOL_PROFILE_DOC_ID = 'school_profile';
export const ROMBEL_LIST_DOC_ID = 'rombel_list';
export const JOURNAL_CUTOFF_DOC_ID = 'journal_cutoff';

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
 * If Firestore is empty (new project/device), automatically boots and syncs initial data
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

    // If Firestore has no users yet (brand new setup or first cloud connect),
    // seed initial users and initial literacy entries so all devices immediately have them!
    if (users.length === 0 && INITIAL_USERS.length > 0) {
      console.log('Seeding initial data to Cloud Firestore for cross-device availability...');
      saveBatchUsersToFirestore(INITIAL_USERS).catch((e) => console.warn('User seed error:', e));
      saveBatchEntriesToFirestore(INITIAL_LITERACY_ENTRIES).catch((e) => console.warn('Entries seed error:', e));
      return { users: INITIAL_USERS, entries: INITIAL_LITERACY_ENTRIES };
    }

    entries.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));

    return { users, entries };
  } catch (err) {
    console.warn('Failed to fetch all from Firestore, using initial fallback:', err);
    return { users: INITIAL_USERS, entries: INITIAL_LITERACY_ENTRIES };
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

/**
 * Save multiple literacy entries in batch (e.g. after academic year rombel synchronization)
 */
export async function saveBatchEntriesToFirestore(entries: LiteracyEntry[]): Promise<void> {
  for (const entry of entries) {
    try {
      const cleaned = cleanUndefined(entry);
      await setDoc(doc(db, ENTRIES_COL, entry.id), cleaned, { merge: true });
      if (entries.length > 5) {
        await new Promise((r) => setTimeout(r, 40));
      }
    } catch (err) {
      console.warn(`Failed to sync entry ${entry.id} in batch:`, err);
    }
  }
}

/**
 * Save multiple monthly verifications in batch
 */
export async function saveBatchMonthlyVerificationsToFirestore(
  verifications: MonthlyVerification[]
): Promise<void> {
  for (const v of verifications) {
    try {
      await saveMonthlyVerificationToFirestore(v);
      if (verifications.length > 5) {
        await new Promise((r) => setTimeout(r, 40));
      }
    } catch (err) {
      console.warn(`Failed to sync verification ${v.id} in batch:`, err);
    }
  }
}

/**
 * Academic Settings Sync for all devices & browsers
 */
export interface AcademicSettingsPayload {
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  updatedAt?: string;
  updatedBy?: string;
}

export async function saveAcademicSettingsToFirestore(payload: AcademicSettingsPayload): Promise<void> {
  const path = `${SYSTEM_CONFIG_COL}/${ACADEMIC_DOC_ID}`;
  try {
    const cleaned = cleanUndefined({
      ...payload,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, SYSTEM_CONFIG_COL, ACADEMIC_DOC_ID), cleaned, { merge: true });
    broadcastDatabaseChange('academic_settings', cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchAcademicSettingsFromFirestore(): Promise<AcademicSettingsPayload | null> {
  try {
    const snap = await getDoc(doc(db, SYSTEM_CONFIG_COL, ACADEMIC_DOC_ID));
    if (snap.exists()) {
      return snap.data() as AcademicSettingsPayload;
    }
  } catch (err) {
    console.warn('Failed to fetch academic settings from Firestore:', err);
  }
  return null;
}

export function subscribeAcademicSettings(
  onUpdate: (settings: AcademicSettingsPayload) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    doc(db, SYSTEM_CONFIG_COL, ACADEMIC_DOC_ID),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AcademicSettingsPayload;
        if (data.academicYear) {
          onUpdate(data);
        }
      }
    },
    (error) => {
      console.warn('Real-time academic settings subscription notice:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * School Profile & Leadership Sync for all devices & browsers
 */
export async function saveSchoolProfileToFirestore(profile: SchoolProfileSettings): Promise<void> {
  const path = `${SYSTEM_CONFIG_COL}/${SCHOOL_PROFILE_DOC_ID}`;
  try {
    const cleaned = cleanUndefined({
      ...profile,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, SYSTEM_CONFIG_COL, SCHOOL_PROFILE_DOC_ID), cleaned, { merge: true });
    broadcastDatabaseChange('school_profile', cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchSchoolProfileFromFirestore(): Promise<SchoolProfileSettings | null> {
  try {
    const snap = await getDoc(doc(db, SYSTEM_CONFIG_COL, SCHOOL_PROFILE_DOC_ID));
    if (snap.exists()) {
      return snap.data() as SchoolProfileSettings;
    }
  } catch (err) {
    console.warn('Failed to fetch school profile from Firestore:', err);
  }
  return null;
}

export function subscribeSchoolProfile(
  onUpdate: (profile: SchoolProfileSettings) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    doc(db, SYSTEM_CONFIG_COL, SCHOOL_PROFILE_DOC_ID),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SchoolProfileSettings;
        if (data.namaSekolah) {
          onUpdate(data);
        }
      }
    },
    (error) => {
      console.warn('Real-time school profile subscription notice:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Rombel List Sync for all devices & browsers
 */
export async function saveRombelsToFirestore(rombels: RombelItem[]): Promise<void> {
  const path = `${SYSTEM_CONFIG_COL}/${ROMBEL_LIST_DOC_ID}`;
  try {
    const payload = cleanUndefined({
      rombels,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, SYSTEM_CONFIG_COL, ROMBEL_LIST_DOC_ID), payload, { merge: true });
    broadcastDatabaseChange('rombel_list', payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchRombelsFromFirestore(): Promise<RombelItem[] | null> {
  try {
    const snap = await getDoc(doc(db, SYSTEM_CONFIG_COL, ROMBEL_LIST_DOC_ID));
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.rombels)) {
        return data.rombels as RombelItem[];
      }
    }
  } catch (err) {
    console.warn('Failed to fetch rombels from Firestore:', err);
  }
  return null;
}

export function subscribeRombels(
  onUpdate: (rombels: RombelItem[]) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    doc(db, SYSTEM_CONFIG_COL, ROMBEL_LIST_DOC_ID),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.rombels)) {
          onUpdate(data.rombels as RombelItem[]);
        }
      }
    },
    (error) => {
      console.warn('Real-time rombels subscription notice:', error);
      if (onError) onError(error);
    }
  );
}

/**
  * Journal Submission Cut-Off Configuration Sync for all devices & browsers
  */
export async function saveJournalCutoffToFirestore(config: JournalCutoffConfig): Promise<void> {
  const path = `${SYSTEM_CONFIG_COL}/${JOURNAL_CUTOFF_DOC_ID}`;
  try {
    const payload = cleanUndefined({
      ...config,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, SYSTEM_CONFIG_COL, JOURNAL_CUTOFF_DOC_ID), payload, { merge: true });
    broadcastDatabaseChange('journal_cutoff', payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchJournalCutoffFromFirestore(): Promise<JournalCutoffConfig | null> {
  try {
    const snap = await getDoc(doc(db, SYSTEM_CONFIG_COL, JOURNAL_CUTOFF_DOC_ID));
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.cutoffDate === 'string') {
        return data as JournalCutoffConfig;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch journal cutoff from Firestore:', err);
  }
  return null;
}

export function subscribeJournalCutoff(
  onUpdate: (config: JournalCutoffConfig) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    doc(db, SYSTEM_CONFIG_COL, JOURNAL_CUTOFF_DOC_ID),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && typeof data.cutoffDate === 'string') {
          onUpdate(data as JournalCutoffConfig);
        }
      }
    },
    (error) => {
      console.warn('Real-time journal cutoff subscription notice:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Cross-tab and cross-window instantaneous synchronization using BroadcastChannel
 */
export const dbBroadcastChannel = 
  typeof window !== 'undefined' && 'BroadcastChannel' in window 
    ? new BroadcastChannel('si_literasi_live_db') 
    : null;

export function broadcastDatabaseChange(type: string, data?: any): void {
  try {
    dbBroadcastChannel?.postMessage({ type, data, timestamp: Date.now() });
  } catch (err) {
    console.warn('Broadcast failed:', err);
  }
}




