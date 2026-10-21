import { User, LiteracyEntry } from '../types';
import { INITIAL_USERS, INITIAL_LITERACY_ENTRIES } from '../data/initialData';

const USERS_KEY = 'si_literasi_users_v1';
const ENTRIES_KEY = 'si_literasi_entries_v1';
const CURRENT_USER_KEY = 'si_literasi_current_user_v1';

export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
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
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
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

