import { User, LiteracyEntry, MonthlyVerification, RombelItem, SchoolProfileSettings, JournalCutoffConfig } from '../types';

export interface FullDatabasePayload {
  users: User[];
  entries: LiteracyEntry[];
  monthlyVerifications: MonthlyVerification[];
  rombels: RombelItem[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  schoolProfile: SchoolProfileSettings;
  journalCutoff: JournalCutoffConfig;
  version: number;
  lastUpdated: string;
}

export type LiveStreamCallback = (event: {
  type: string;
  data: any;
}) => void;

/**
 * Fetch full database state from server
 */
export async function fetchServerDatabase(): Promise<FullDatabasePayload | null> {
  try {
    const res = await fetch('/api/database');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && json.data) {
      return json.data as FullDatabasePayload;
    }
  } catch (err) {
    console.warn('[Sync API] Could not fetch server database, using cached local/initial data:', err);
  }
  return null;
}

/**
 * Connect to SSE live stream for real-time synchronization across all devices and browsers
 */
export function connectLiveDatabaseStream(callback: LiveStreamCallback): () => void {
  if (typeof window === 'undefined' || !('EventSource' in window)) {
    return () => {};
  }

  let eventSource: EventSource | null = null;
  let isClosed = false;
  let retryTimeout: any = null;

  function connect() {
    if (isClosed) return;
    try {
      eventSource = new EventSource('/api/live-stream');

      eventSource.addEventListener('connected', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          callback({ type: 'CONNECTED', data });
        } catch {}
      });

      eventSource.addEventListener('ENTRIES_UPDATED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          callback({ type: 'ENTRIES_UPDATED', data });
        } catch {}
      });

      eventSource.addEventListener('ENTRY_DELETED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          callback({ type: 'ENTRY_DELETED', data });
        } catch {}
      });

      eventSource.addEventListener('USERS_UPDATED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          callback({ type: 'USERS_UPDATED', data });
        } catch {}
      });

      eventSource.addEventListener('USER_DELETED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          callback({ type: 'USER_DELETED', data });
        } catch {}
      });

      eventSource.addEventListener('MONTHLY_VERIFICATION_UPDATED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          callback({ type: 'MONTHLY_VERIFICATION_UPDATED', data });
        } catch {}
      });

      eventSource.addEventListener('SETTINGS_UPDATED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          callback({ type: 'SETTINGS_UPDATED', data });
        } catch {}
      });

      eventSource.addEventListener('SYNC_TRIGGER', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          callback({ type: 'SYNC_TRIGGER', data });
        } catch {}
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!isClosed) {
          retryTimeout = setTimeout(connect, 3000);
        }
      };
    } catch (err) {
      console.warn('[Sync API] SSE connection notice:', err);
      if (!isClosed) {
        retryTimeout = setTimeout(connect, 5000);
      }
    }
  }

  connect();

  return () => {
    isClosed = true;
    if (retryTimeout) clearTimeout(retryTimeout);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

/**
 * Post single or multiple entries to persistent server database
 */
export async function pushEntriesToServer(entries: LiteracyEntry | LiteracyEntry[]): Promise<boolean> {
  try {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Sync API] Failed to push entries to server:', err);
    return false;
  }
}

/**
 * Delete entry on server
 */
export async function deleteEntryOnServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/entries/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('[Sync API] Failed to delete entry on server:', err);
    return false;
  }
}

/**
 * Batch delete entries on server
 */
export async function deleteBatchEntriesOnServer(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  try {
    const res = await fetch('/api/entries/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Sync API] Failed to batch delete entries on server:', err);
    return false;
  }
}

/**
 * Push user or multiple users to persistent server database
 */
export async function pushUsersToServer(users: User | User[]): Promise<boolean> {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Sync API] Failed to push users to server:', err);
    return false;
  }
}

/**
 * Delete user on server
 */
export async function deleteUserOnServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('[Sync API] Failed to delete user on server:', err);
    return false;
  }
}

/**
 * Push monthly verification to persistent server database
 */
export async function pushMonthlyVerificationToServer(verification: MonthlyVerification): Promise<boolean> {
  try {
    const res = await fetch('/api/monthly-verifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verification),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Sync API] Failed to push verification to server:', err);
    return false;
  }
}

/**
 * Push settings to persistent server database
 */
export async function pushSettingsToServer(settings: {
  academicYear?: string;
  semester?: 'Ganjil' | 'Genap';
  schoolProfile?: SchoolProfileSettings;
  rombels?: RombelItem[];
  journalCutoff?: JournalCutoffConfig;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Sync API] Failed to push settings to server:', err);
    return false;
  }
}

/**
 * Trigger immediate multi-device sync beacon across all connected browsers
 */
export async function triggerMultiDeviceSyncBeacon(action: string = 'manual_sync'): Promise<void> {
  try {
    await fetch('/api/sync/touch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
  } catch (err) {
    console.warn('[Sync API] Notice triggering sync beacon:', err);
  }
}
