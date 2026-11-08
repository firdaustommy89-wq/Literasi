import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_USERS, INITIAL_LITERACY_ENTRIES } from './src/data/initialData.ts';
import { DEFAULT_ROMBELS, DEFAULT_SCHOOL_PROFILE, DEFAULT_JOURNAL_CUTOFF, User, LiteracyEntry, MonthlyVerification, RombelItem, SchoolProfileSettings, JournalCutoffConfig } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'siliterasi_db.json');

// Interface for persistent database
interface DatabaseState {
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

// In-memory cache of database
let dbState: DatabaseState;

function initializeDatabase(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content) as Partial<DatabaseState>;
      
      // Use persisted users from disk; only fallback to INITIAL_USERS if file has no users
      const loadedUsers = Array.isArray(parsed.users) && parsed.users.length > 0
        ? parsed.users
        : [...INITIAL_USERS];

      // Use persisted entries from disk; only fallback to INITIAL_LITERACY_ENTRIES if entries property is absent
      const loadedEntries = Array.isArray(parsed.entries)
        ? parsed.entries
        : [...INITIAL_LITERACY_ENTRIES];

      dbState = {
        users: loadedUsers,
        entries: loadedEntries,
        monthlyVerifications: Array.isArray(parsed.monthlyVerifications) ? parsed.monthlyVerifications : [],
        rombels: Array.isArray(parsed.rombels) && parsed.rombels.length > 0 ? parsed.rombels : DEFAULT_ROMBELS,
        academicYear: parsed.academicYear || '2026/2027',
        semester: parsed.semester || 'Ganjil',
        schoolProfile: parsed.schoolProfile || DEFAULT_SCHOOL_PROFILE,
        journalCutoff: parsed.journalCutoff || DEFAULT_JOURNAL_CUTOFF,
        version: (parsed.version || 1) + 1,
        lastUpdated: new Date().toISOString(),
      };
      saveDatabaseToDisk();
      console.log(`[DB] Database loaded from disk: ${dbState.users.length} users, ${dbState.entries.length} entries`);
      return;
    } catch (err) {
      console.warn('[DB] Failed to read existing db.json, generating fresh from initial data:', err);
    }
  }

  // Fresh setup
  dbState = {
    users: [...INITIAL_USERS],
    entries: [...INITIAL_LITERACY_ENTRIES],
    monthlyVerifications: [],
    rombels: [...DEFAULT_ROMBELS],
    academicYear: '2026/2027',
    semester: 'Ganjil',
    schoolProfile: { ...DEFAULT_SCHOOL_PROFILE },
    journalCutoff: { ...DEFAULT_JOURNAL_CUTOFF },
    version: 1,
    lastUpdated: new Date().toISOString(),
  };
  saveDatabaseToDisk();
  console.log(`[DB] Database initialized: ${dbState.users.length} users, ${dbState.entries.length} entries`);
}

function saveDatabaseToDisk(): void {
  try {
    dbState.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Error saving database to disk:', err);
  }
}

// Background sync to Firestore if configured
let firestoreDb: any = null;
async function initFirestoreBackground() {
  try {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const { initializeApp, getApps } = await import('firebase/app');
      const { getFirestore } = await import('firebase/firestore');
      const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
      firestoreDb = getFirestore(app, config.firestoreDatabaseId);
      console.log('[Firestore] Background cloud Firestore bridge ready');
    }
  } catch (err) {
    console.warn('[Firestore] Notice initializing background cloud bridge:', err);
  }
}

async function syncDocToFirestore(collectionName: string, docId: string, data: any) {
  if (!firestoreDb) return;
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(firestoreDb, collectionName, docId), data, { merge: true });
  } catch (err: any) {
    // Silent fail if quota or network issue, disk db handles it
    if (err?.message?.includes?.('Quota limit exceeded')) {
      // Don't spam logs
    } else {
      console.warn(`[Firestore Sync] Cloud update notice for ${collectionName}/${docId}:`, err?.message || err);
    }
  }
}

async function deleteDocFromFirestore(collectionName: string, docId: string) {
  if (!firestoreDb) return;
  try {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(firestoreDb, collectionName, docId));
  } catch (err: any) {
    console.warn(`[Firestore Sync] Delete notice for ${collectionName}/${docId}:`, err?.message || err);
  }
}

// Connected SSE clients for live synchronization across all devices & browsers
const sseClients = new Set<Response>();

function broadcastLiveEvent(eventType: string, payload: any) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

async function hydrateFromFirestoreCloud() {
  if (!firestoreDb) return;
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    
    // 1. Hydrate literacy entries
    try {
      const snap = await getDocs(collection(firestoreDb, 'literacy_entries'));
      if (!snap.empty) {
        const entryMap = new Map<string, LiteracyEntry>();
        dbState.entries.forEach((e) => entryMap.set(e.id, e));
        snap.forEach((d) => {
          const data = d.data() as LiteracyEntry;
          if (data && data.id) {
            entryMap.set(data.id, data);
          }
        });
        dbState.entries = Array.from(entryMap.values());
        dbState.entries.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
        console.log(`[Firestore Hydration] Synced ${dbState.entries.length} literacy entries from Firestore to server disk`);
      }
    } catch (e: any) {
      if (!e?.message?.includes?.('Quota limit exceeded')) {
        console.warn('[Firestore Hydration] Entries sync notice:', e?.message || e);
      }
    }

    // 2. Hydrate users
    try {
      const userSnap = await getDocs(collection(firestoreDb, 'users'));
      if (!userSnap.empty) {
        const userMap = new Map<string, User>();
        dbState.users.forEach((u) => userMap.set(u.id, u));
        userSnap.forEach((d) => {
          const data = d.data() as User;
          if (data && data.id) {
            userMap.set(data.id, data);
          }
        });
        dbState.users = Array.from(userMap.values());
        console.log(`[Firestore Hydration] Synced ${dbState.users.length} users from Firestore to server disk`);
      }
    } catch (e: any) {
      if (!e?.message?.includes?.('Quota limit exceeded')) {
        console.warn('[Firestore Hydration] Users sync notice:', e?.message || e);
      }
    }

    // 3. Hydrate monthly verifications
    try {
      const mvSnap = await getDocs(collection(firestoreDb, 'monthly_verifications'));
      if (!mvSnap.empty) {
        const mvMap = new Map<string, MonthlyVerification>();
        dbState.monthlyVerifications.forEach((m) => mvMap.set(m.id, m));
        mvSnap.forEach((d) => {
          const data = d.data() as MonthlyVerification;
          if (data && data.id) {
            mvMap.set(data.id, data);
          }
        });
        dbState.monthlyVerifications = Array.from(mvMap.values());
        console.log(`[Firestore Hydration] Synced ${dbState.monthlyVerifications.length} verifications from Firestore to server disk`);
      }
    } catch (e: any) {
      if (!e?.message?.includes?.('Quota limit exceeded')) {
        console.warn('[Firestore Hydration] Verifications sync notice:', e?.message || e);
      }
    }

    dbState.version++;
    saveDatabaseToDisk();

    // Broadcast live event to all connected browsers so they immediately reflect cloud entries
    broadcastLiveEvent('SYNC_TRIGGER', {
      action: 'firestore_hydrated',
      entryCount: dbState.entries.length,
      userCount: dbState.users.length,
      version: dbState.version,
    });
  } catch (err: any) {
    console.warn('[Firestore Hydration] Cloud entry fetch note:', err?.message || err);
  }
}

async function startServer() {
  initializeDatabase();
  await initFirestoreBackground();
  await hydrateFromFirestoreCloud().catch((e) => console.warn('Background hydration note:', e));

  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // SSE Real-time Synchronization Stream
  app.get('/api/live-stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    sseClients.add(res);

    // Initial greeting and current state metadata
    res.write(`event: connected\ndata: ${JSON.stringify({
      version: dbState.version,
      lastUpdated: dbState.lastUpdated,
      userCount: dbState.users.length,
      entryCount: dbState.entries.length,
    })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Keep-alive heartbeat every 20 seconds
  const keepaliveTimer = setInterval(() => {
    for (const client of sseClients) {
      try {
        client.write(': keepalive\n\n');
      } catch {
        sseClients.delete(client);
      }
    }
  }, 20000);
  if (keepaliveTimer.unref) keepaliveTimer.unref();

  // Health check endpoints for dev server supervisor and container readiness
  app.get(['/health', '/healthz'], (_req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      userCount: dbState?.users?.length || 0,
      entryCount: dbState?.entries?.length || 0,
    });
  });

  // GET Entire Database State (Ultra fast, <20ms)
  app.get('/api/database', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: dbState,
    });
  });

  // GET Summary counts
  app.get('/api/summary', (_req: Request, res: Response) => {
    res.json({
      success: true,
      userCount: dbState.users.length,
      entryCount: dbState.entries.length,
      rombelCount: dbState.rombels.length,
      academicYear: dbState.academicYear,
      semester: dbState.semester,
      lastUpdated: dbState.lastUpdated,
      activeClients: sseClients.size,
    });
  });

  // POST Upsert Single Entry or Batch Entries
  app.post('/api/entries', (req: Request, res: Response) => {
    const body = req.body;
    const entriesToSave: LiteracyEntry[] = Array.isArray(body) ? body : [body];

    if (entriesToSave.length === 0) {
      return res.status(400).json({ success: false, error: 'No entries provided' });
    }

    const entryMap = new Map<string, LiteracyEntry>();
    dbState.entries.forEach((e) => entryMap.set(e.id, e));
    for (const entry of entriesToSave) {
      if (entry && entry.id) {
        entryMap.set(entry.id, entry);
        // Sync to cloud Firestore in background
        syncDocToFirestore('literacy_entries', entry.id, entry);
      }
    }

    dbState.entries = Array.from(entryMap.values());
    dbState.entries.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
    dbState.version++;
    saveDatabaseToDisk();

    // Broadcast update to all other connected browsers and devices immediately!
    broadcastLiveEvent('ENTRIES_UPDATED', {
      entries: entriesToSave,
      version: dbState.version,
      lastUpdated: dbState.lastUpdated,
    });

    res.json({
      success: true,
      count: entriesToSave.length,
      totalEntries: dbState.entries.length,
    });
  });

  // DELETE Single Entry
  app.delete('/api/entries/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const initialLen = dbState.entries.length;
    dbState.entries = dbState.entries.filter((e) => e.id !== id);

    if (dbState.entries.length !== initialLen) {
      dbState.version++;
      saveDatabaseToDisk();
      deleteDocFromFirestore('literacy_entries', id);
      broadcastLiveEvent('ENTRY_DELETED', { id, version: dbState.version });
    }

    res.json({ success: true, totalEntries: dbState.entries.length });
  });

  // POST Batch Delete Entries
  app.post('/api/entries/batch-delete', (req: Request, res: Response) => {
    const { ids } = req.body;
    if (Array.isArray(ids) && ids.length > 0) {
      const idSet = new Set(ids);
      const initialLen = dbState.entries.length;
      dbState.entries = dbState.entries.filter((e) => !idSet.has(e.id));

      if (dbState.entries.length !== initialLen) {
        dbState.version++;
        saveDatabaseToDisk();
        ids.forEach((id) => {
          deleteDocFromFirestore('literacy_entries', id);
          broadcastLiveEvent('ENTRY_DELETED', { id, version: dbState.version });
        });
      }
    }

    res.json({ success: true, totalEntries: dbState.entries.length });
  });

  // POST Upsert User or Batch Users
  app.post('/api/users', (req: Request, res: Response) => {
    const body = req.body;
    const usersToSave: User[] = Array.isArray(body) ? body : [body];

    if (usersToSave.length === 0) {
      return res.status(400).json({ success: false, error: 'No users provided' });
    }

    const userMap = new Map<string, User>();
    dbState.users.forEach((u) => userMap.set(u.id, u));
    for (const user of usersToSave) {
      if (user && user.id) {
        userMap.set(user.id, user);
        syncDocToFirestore('users', user.id, user);
      }
    }

    dbState.users = Array.from(userMap.values());
    dbState.version++;
    saveDatabaseToDisk();

    broadcastLiveEvent('USERS_UPDATED', {
      users: usersToSave,
      version: dbState.version,
      lastUpdated: dbState.lastUpdated,
    });

    res.json({
      success: true,
      count: usersToSave.length,
      totalUsers: dbState.users.length,
    });
  });

  // DELETE User
  app.delete('/api/users/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const initialLen = dbState.users.length;
    dbState.users = dbState.users.filter((u) => u.id !== id);

    if (dbState.users.length !== initialLen) {
      dbState.version++;
      saveDatabaseToDisk();
      deleteDocFromFirestore('users', id);
      broadcastLiveEvent('USER_DELETED', { id, version: dbState.version });
    }

    res.json({ success: true, totalUsers: dbState.users.length });
  });

  // POST Monthly Verification
  app.post('/api/monthly-verifications', (req: Request, res: Response) => {
    const verification = req.body as MonthlyVerification;
    if (!verification || !verification.id) {
      return res.status(400).json({ success: false, error: 'Invalid verification object' });
    }

    const index = dbState.monthlyVerifications.findIndex((v) => v.id === verification.id);
    if (index >= 0) {
      dbState.monthlyVerifications[index] = verification;
    } else {
      dbState.monthlyVerifications.push(verification);
    }

    dbState.version++;
    saveDatabaseToDisk();
    syncDocToFirestore('monthly_verifications', verification.id, verification);

    broadcastLiveEvent('MONTHLY_VERIFICATION_UPDATED', {
      verification,
      version: dbState.version,
    });

    res.json({ success: true });
  });

  // POST Settings (Academic, School, Rombels, Cutoff)
  app.post('/api/settings', (req: Request, res: Response) => {
    const { academicYear, semester, schoolProfile, rombels, journalCutoff } = req.body;

    let changed = false;
    if (academicYear) {
      dbState.academicYear = academicYear;
      changed = true;
    }
    if (semester) {
      dbState.semester = semester;
      changed = true;
    }
    if (schoolProfile) {
      dbState.schoolProfile = schoolProfile;
      changed = true;
      syncDocToFirestore('system_config', 'school_profile', schoolProfile);
    }
    if (rombels && Array.isArray(rombels)) {
      dbState.rombels = rombels;
      changed = true;
      syncDocToFirestore('system_config', 'rombel_list', { rombels });
    }
    if (journalCutoff) {
      dbState.journalCutoff = journalCutoff;
      changed = true;
      syncDocToFirestore('system_config', 'journal_cutoff', journalCutoff);
    }

    if (changed) {
      dbState.version++;
      saveDatabaseToDisk();
      broadcastLiveEvent('SETTINGS_UPDATED', {
        academicYear: dbState.academicYear,
        semester: dbState.semester,
        schoolProfile: dbState.schoolProfile,
        rombels: dbState.rombels,
        journalCutoff: dbState.journalCutoff,
        version: dbState.version,
      });
    }

    res.json({ success: true, data: dbState });
  });

  // POST Trigger Sync Beacon
  app.post('/api/sync/touch', (req: Request, res: Response) => {
    const { action } = req.body || { action: 'manual_sync' };
    dbState.version++;
    saveDatabaseToDisk();

    broadcastLiveEvent('SYNC_TRIGGER', {
      action,
      version: dbState.version,
      lastUpdated: dbState.lastUpdated,
      timestamp: Date.now(),
    });

    syncDocToFirestore('system_config', 'sync_beacon', {
      action,
      timestamp: Date.now(),
      lastUpdated: new Date().toISOString(),
    });

    res.json({ success: true, version: dbState.version });
  });

  // Mount Vite or Serve Static Files
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite middleware mounted in development mode');
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Server] Serving production static files from dist');
  }

  // Determine port: accept CLI argument --port if provided, otherwise default to 3000
  const args = process.argv.slice(2);
  const portArgIdx = args.indexOf('--port');
  const cliPort = portArgIdx !== -1 && args[portArgIdx + 1] ? parseInt(args[portArgIdx + 1], 10) : null;
  const PORT = (cliPort && !isNaN(cliPort)) ? cliPort : 3000;

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SI-LITERASI Server] Running at http://0.0.0.0:${PORT}`);
    console.log(`[SI-LITERASI Server] All devices and web browsers will synchronize with this persistent database`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server Error] Port ${PORT} is already in use. Retrying or waiting...`);
    } else {
      console.error('[Server Error] Socket error:', err);
    }
  });

  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, shutting down gracefully...');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('[Server] SIGINT received, shutting down gracefully...');
    server.close(() => process.exit(0));
  });
}

startServer().catch((err) => {
  console.error('[Server Error] Fatal startup exception:', err);
  process.exit(1);
});
