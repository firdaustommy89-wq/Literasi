import { User, LiteracyEntry, SchoolProfileSettings, DEFAULT_SCHOOL_PROFILE, RombelItem, DEFAULT_ROMBELS } from '../types';
import { INITIAL_USERS, INITIAL_LITERACY_ENTRIES } from '../data/initialData';

const USERS_KEY = 'si_literasi_users_v1';
const ENTRIES_KEY = 'si_literasi_entries_v1';
const CURRENT_USER_KEY = 'si_literasi_current_user_v1';

export function isLegacyMipaIpsBahasa(name?: string, username?: string, rombel?: string): boolean {
  // Seluruh data pengguna dan riwayat jurnal murid yang telah diperbarui dikembalikan secara utuh
  return false;
}

export const isXiMipaIpsBahasa = isLegacyMipaIpsBahasa;

export function normalizeRombelName(rombel: string): string;
export function normalizeRombelName(rombel: undefined): undefined;
export function normalizeRombelName(rombel?: string): string | undefined;
export function normalizeRombelName(rombel?: string): string | undefined {
  if (!rombel) return rombel;
  // Convert X-1 -> X-A, X-10 -> X-J, XI-1 -> XI-A, XII-1 -> XII-A
  const match = rombel.trim().match(/^(X|XI|XII)-(\d+)$/);
  if (match) {
    const prefix = match[1];
    const num = parseInt(match[2], 10);
    if (num >= 1 && num <= 10) {
      const letter = String.fromCharCode(64 + num); // 1->A, 2->B, ..., 10->J
      return `${prefix}-${letter}`;
    }
  }
  return rombel;
}

export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      return INITIAL_USERS.filter((u) => !isXiMipaIpsBahasa(u.name, u.username, u.rombel));
    }
    const parsed = JSON.parse(raw);
    let userList: User[] = [];
    if (Array.isArray(parsed) && parsed.length >= INITIAL_USERS.length) {
      userList = parsed;
    } else {
      // If stored array is smaller than the bundled restored base (e.g. from previous quota crash), merge them
      const userMap = new Map<string, User>();
      INITIAL_USERS.forEach((u) => userMap.set(u.id, u));
      if (Array.isArray(parsed)) {
        parsed.forEach((u: User) => {
          if (u && u.id) userMap.set(u.id, u);
        });
      }
      userList = Array.from(userMap.values());
    }

    // Auto-normalize rombels to X-A, X-B, etc.
    const normalized = userList.map((u) => ({
      ...u,
      rombel: normalizeRombelName(u.rombel),
    }));
    saveUsers(normalized);
    return normalized.filter((u) => !isXiMipaIpsBahasa(u.name, u.username, u.rombel));
  } catch {
    return INITIAL_USERS.filter((u) => !isXiMipaIpsBahasa(u.name, u.username, u.rombel));
  }
}

export function saveUsers(users: User[]): void {
  try {
    const sanitized = users.map((u) => ({
      ...u,
      rombel: normalizeRombelName(u.rombel),
    })).filter((u) => !isXiMipaIpsBahasa(u.name, u.username, u.rombel));
    localStorage.setItem(USERS_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Failed to save users', err);
  }
}

export function getStoredEntries(): LiteracyEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) {
      return INITIAL_LITERACY_ENTRIES.filter((e) => !isXiMipaIpsBahasa(e.studentName, undefined, e.studentRombel));
    }
    const parsed = JSON.parse(raw);
    let entryList: LiteracyEntry[] = [];
    if (Array.isArray(parsed) && parsed.length >= INITIAL_LITERACY_ENTRIES.length) {
      entryList = parsed;
    } else {
      // Merge existing stored entries with the full restored 167 entries
      const entryMap = new Map<string, LiteracyEntry>();
      INITIAL_LITERACY_ENTRIES.forEach((e) => entryMap.set(e.id, e));
      if (Array.isArray(parsed)) {
        parsed.forEach((e: LiteracyEntry) => {
          if (e && e.id) entryMap.set(e.id, e);
        });
      }
      entryList = Array.from(entryMap.values());
    }

    const normalized = entryList.map((e) => ({
      ...e,
      studentRombel: normalizeRombelName(e.studentRombel) || e.studentRombel,
    }));
    saveEntries(normalized);
    return normalized.filter((e) => !isXiMipaIpsBahasa(e.studentName, undefined, e.studentRombel));
  } catch {
    return INITIAL_LITERACY_ENTRIES.filter((e) => !isXiMipaIpsBahasa(e.studentName, undefined, e.studentRombel));
  }
}

export function saveEntries(entries: LiteracyEntry[]): void {
  try {
    const sanitized = entries.filter((e) => !isXiMipaIpsBahasa(e.studentName, undefined, e.studentRombel));
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Failed to save entries', err);
  }
}

export function getStoredCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      if (raw === 'null' || raw === 'undefined') return null;
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read current user', err);
  }
  return null;
}

export function saveCurrentUser(user: User | null): void {
  try {
    if (!user) {
      localStorage.removeItem(CURRENT_USER_KEY);
    } else {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }
  } catch (err) {
    console.error('Failed to save current user', err);
  }
}

const ACADEMIC_YEAR_KEY = 'si_literasi_academic_year_v1';
const SEMESTER_KEY = 'si_literasi_semester_v1';

export function getStoredAcademicYear(): string {
  try {
    return localStorage.getItem(ACADEMIC_YEAR_KEY) || '2026/2027';
  } catch {
    return '2026/2027';
  }
}

export function saveAcademicYear(year: string): void {
  try {
    localStorage.setItem(ACADEMIC_YEAR_KEY, year);
  } catch (err) {
    console.error('Failed to save academic year', err);
  }
}

export function getStoredSemester(): 'Ganjil' | 'Genap' {
  try {
    const val = localStorage.getItem(SEMESTER_KEY);
    return val === 'Genap' ? 'Genap' : 'Ganjil';
  } catch {
    return 'Ganjil';
  }
}

export function saveSemester(semester: 'Ganjil' | 'Genap'): void {
  try {
    localStorage.setItem(SEMESTER_KEY, semester);
  } catch (err) {
    console.error('Failed to save semester', err);
  }
}

const SCHOOL_PROFILE_KEY = 'si_literasi_school_profile_v1';

export function getStoredSchoolProfile(): SchoolProfileSettings {
  try {
    const raw = localStorage.getItem(SCHOOL_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.namaSekolah) {
        return {
          ...DEFAULT_SCHOOL_PROFILE,
          ...parsed,
        };
      }
    }
  } catch (err) {
    console.warn('Could not read school profile from localStorage:', err);
  }
  return DEFAULT_SCHOOL_PROFILE;
}

export function saveSchoolProfile(profile: SchoolProfileSettings): void {
  try {
    localStorage.setItem(SCHOOL_PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save school profile to localStorage', err);
  }
}

const ROMBELS_KEY = 'si_literasi_rombels_v1';

export function getStoredRombels(existingUsers?: User[]): RombelItem[] {
  try {
    const raw = localStorage.getItem(ROMBELS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned: RombelItem[] = [];
        const seen = new Set<string>();
        for (const item of parsed) {
          if (!item || !item.name) continue;
          const normalizedName = normalizeRombelName(item.name);
          if (isXiMipaIpsBahasa(normalizedName, undefined, normalizedName)) continue;
          const key = normalizedName.toUpperCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            cleaned.push({
              ...item,
              name: normalizedName,
            });
          }
        }
        // Ensure default 30 rombels (X-A..J, XI-A..J, XII-A..J) are always present
        DEFAULT_ROMBELS.forEach((defRombel) => {
          const key = defRombel.name.toUpperCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            cleaned.push(defRombel);
          }
        });
        if (cleaned.length > 0) {
          return cleaned;
        }
      }
    }
  } catch (err) {
    console.warn('Could not read rombels from localStorage:', err);
  }

  // Fallback: merge DEFAULT_ROMBELS with any existing rombels from users list
  const rombelMap = new Map<string, RombelItem>();
  DEFAULT_ROMBELS.filter((r) => !isXiMipaIpsBahasa(r.name, undefined, r.name))
    .forEach((r) => {
      const norm = normalizeRombelName(r.name);
      rombelMap.set(norm.toLowerCase().trim(), { ...r, name: norm });
    });

  if (existingUsers && existingUsers.length > 0) {
    existingUsers.forEach((u) => {
      if (u.role === 'siswa' && u.rombel && !isXiMipaIpsBahasa(u.name, u.username, u.rombel)) {
        const norm = normalizeRombelName(u.rombel);
        const key = norm.toLowerCase().trim();
        if (!rombelMap.has(key)) {
          rombelMap.set(key, {
            id: `rombel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: norm.trim(),
            grade: (u.kelas || '10') as any,
          });
        }
      }
    });
  }

  return Array.from(rombelMap.values()).filter((r) => !isXiMipaIpsBahasa(r.name, undefined, r.name));
}

export function saveStoredRombels(rombels: RombelItem[]): void {
  try {
    const sanitized = rombels.filter((r) => !isXiMipaIpsBahasa(r.name, undefined, r.name));
    localStorage.setItem(ROMBELS_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Failed to save rombels to localStorage', err);
  }
}

const JOURNAL_CUTOFF_KEY = 'si_literasi_journal_cutoff_v1';

export function getStoredJournalCutoff(): import('../types').JournalCutoffConfig {
  try {
    const raw = localStorage.getItem(JOURNAL_CUTOFF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.cutoffDate === 'string') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read journal cutoff from localStorage:', err);
  }
  // Default cutoff: 30 November 2026 23:59
  return {
    cutoffDate: '2026-11-30',
    cutoffTime: '23:59',
    isEnabled: true,
    announcementText: 'Cut Off Pengisian Jurnal Oleh Murid',
    additionalNote: 'Mohon seluruh siswa menyelesaikan pengisian jurnal literasi sebelum batas waktu penutupan.',
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin Sekolah',
  };
}

export function saveStoredJournalCutoff(config: import('../types').JournalCutoffConfig): void {
  try {
    localStorage.setItem(JOURNAL_CUTOFF_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save journal cutoff to localStorage:', err);
  }
}


