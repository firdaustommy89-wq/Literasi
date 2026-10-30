import { User, LiteracyEntry, SchoolProfileSettings, DEFAULT_SCHOOL_PROFILE, RombelItem, DEFAULT_ROMBELS } from '../types';
import { INITIAL_USERS, INITIAL_LITERACY_ENTRIES } from '../data/initialData';

const USERS_KEY = 'si_literasi_users_v1';
const ENTRIES_KEY = 'si_literasi_entries_v1';
const CURRENT_USER_KEY = 'si_literasi_current_user_v1';

export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

export function saveUsers(users: User[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users', err);
  }
}

export function getStoredEntries(): LiteracyEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) {
      return INITIAL_LITERACY_ENTRIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_LITERACY_ENTRIES;
  } catch {
    return INITIAL_LITERACY_ENTRIES;
  }
}

export function saveEntries(entries: LiteracyEntry[]): void {
  try {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
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
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read rombels from localStorage:', err);
  }

  // Fallback: merge DEFAULT_ROMBELS with any existing rombels from users list
  const rombelMap = new Map<string, RombelItem>();
  DEFAULT_ROMBELS.forEach((r) => rombelMap.set(r.name.toLowerCase().trim(), r));

  if (existingUsers && existingUsers.length > 0) {
    existingUsers.forEach((u) => {
      if (u.role === 'siswa' && u.rombel) {
        const key = u.rombel.toLowerCase().trim();
        if (!rombelMap.has(key)) {
          rombelMap.set(key, {
            id: `rombel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: u.rombel.trim(),
            grade: (u.kelas || '10') as any,
          });
        }
      }
    });
  }

  return Array.from(rombelMap.values());
}

export function saveStoredRombels(rombels: RombelItem[]): void {
  try {
    localStorage.setItem(ROMBELS_KEY, JSON.stringify(rombels));
  } catch (err) {
    console.error('Failed to save rombels to localStorage', err);
  }
}


