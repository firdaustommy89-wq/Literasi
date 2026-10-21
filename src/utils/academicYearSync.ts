import { User, LiteracyEntry, MonthlyVerification, JenjangKelas } from '../types';

export const AVAILABLE_ACADEMIC_YEARS = [
  '2024/2025',
  '2025/2026',
  '2026/2027',
  '2027/2028',
  '2028/2029',
  '2029/2030',
];

/**
 * Logika cerdas pemetaan rombel ketika naik tingkat kelas di SMA Negeri 2 Samarinda:
 * - Kelas 10 -> Kelas 11 (X MIPA 1 -> XI MIPA 1, X-1 -> XI-1, dsb)
 * - Kelas 11 -> Kelas 12 (XI MIPA 1 -> XII MIPA 1, XI-1 -> XII-1, dsb)
 * - Kelas 12 -> Lulus / Alumni (XII MIPA 1 -> Alumni (XII MIPA 1) tetap dengan kelas: '12')
 */
export function promoteRombelName(
  currentRombel: string,
  currentGrade: JenjangKelas
): { newKelas: JenjangKelas; newRombel: string; isGraduated: boolean } {
  const rombel = currentRombel.trim();

  if (currentGrade === '10') {
    let newRombel = rombel;
    if (/^X\s+/i.test(rombel)) {
      newRombel = rombel.replace(/^X\s+/i, 'XI ');
    } else if (/^Kelas\s+10\b/i.test(rombel)) {
      newRombel = rombel.replace(/^Kelas\s+10\b/i, 'Kelas 11');
    } else if (/^X-/i.test(rombel)) {
      newRombel = rombel.replace(/^X-/i, 'XI-');
    } else {
      newRombel = `XI (${rombel})`;
    }
    return { newKelas: '11', newRombel, isGraduated: false };
  }

  if (currentGrade === '11') {
    let newRombel = rombel;
    if (/^XI\s+/i.test(rombel)) {
      newRombel = rombel.replace(/^XI\s+/i, 'XII ');
    } else if (/^Kelas\s+11\b/i.test(rombel)) {
      newRombel = rombel.replace(/^Kelas\s+11\b/i, 'Kelas 12');
    } else if (/^XI-/i.test(rombel)) {
      newRombel = rombel.replace(/^XI-/i, 'XII-');
    } else {
      newRombel = `XII (${rombel})`;
    }
    return { newKelas: '12', newRombel, isGraduated: false };
  }

  // Kelas 12 -> Lulus / Alumni
  const alumniLabel = rombel.toLowerCase().includes('alumni')
    ? rombel
    : `Alumni (${rombel})`;
  return { newKelas: '12', newRombel: alumniLabel, isGraduated: true };
}

export interface PromotionPreviewSummary {
  totalStudents: number;
  grade10To11Count: number;
  grade11To12Count: number;
  graduatedCount: number;
  unchangedStaffCount: number;
  studentPreviews: Array<{
    id: string;
    name: string;
    nisn: string;
    oldGrade: string;
    oldRombel: string;
    newGrade: string;
    newRombel: string;
    status: 'Naik ke Kelas 11' | 'Naik ke Kelas 12' | 'Lulus / Alumni';
  }>;
}

/**
 * Simulasi preview kenaikan kelas sebelum dieksekusi oleh Administrator
 */
export function previewAcademicYearPromotion(
  users: User[]
): PromotionPreviewSummary {
  const students = users.filter((u) => u.role === 'siswa');
  const staff = users.filter((u) => u.role !== 'siswa');

  let grade10To11Count = 0;
  let grade11To12Count = 0;
  let graduatedCount = 0;

  const studentPreviews = students.map((s) => {
    const oldGrade = (s.kelas || '10') as JenjangKelas;
    const oldRombel = s.rombel || `Kelas ${oldGrade}`;

    const { newKelas, newRombel, isGraduated } = promoteRombelName(oldRombel, oldGrade);

    let statusLabel: 'Naik ke Kelas 11' | 'Naik ke Kelas 12' | 'Lulus / Alumni' = 'Naik ke Kelas 11';
    if (oldGrade === '10') {
      grade10To11Count++;
      statusLabel = 'Naik ke Kelas 11';
    } else if (oldGrade === '11') {
      grade11To12Count++;
      statusLabel = 'Naik ke Kelas 12';
    } else {
      graduatedCount++;
      statusLabel = 'Lulus / Alumni';
    }

    return {
      id: s.id,
      name: s.name,
      nisn: s.nisn || '-',
      oldGrade: `Kelas ${oldGrade}`,
      oldRombel,
      newGrade: isGraduated ? 'Alumni' : `Kelas ${newKelas}`,
      newRombel,
      status: statusLabel,
    };
  });

  return {
    totalStudents: students.length,
    grade10To11Count,
    grade11To12Count,
    graduatedCount,
    unchangedStaffCount: staff.length,
    studentPreviews,
  };
}

/**
 * Sinkronkan seluruh data (Jurnal dan Verifikasi Bulanan) dengan rombongan kelas
 * masing-masing siswa yang ada di database users saat ini.
 * Memastikan keharmonisan 100% di semua tabel dan laporan.
 */
export function synchronizeRombelAcrossAllData(
  users: User[],
  entries: LiteracyEntry[],
  monthlyVerifications: MonthlyVerification[] = []
): {
  syncedEntries: LiteracyEntry[];
  syncedVerifications: MonthlyVerification[];
  entriesUpdatedCount: number;
  verificationsUpdatedCount: number;
} {
  const studentMap = new Map<string, User>();
  users.forEach((u) => {
    if (u.role === 'siswa') {
      studentMap.set(u.id, u);
      if (u.nisn) studentMap.set(`nisn_${u.nisn}`, u);
      studentMap.set(`name_${u.name.toLowerCase().trim()}`, u);
    }
  });

  let entriesUpdatedCount = 0;
  const syncedEntries = entries.map((e) => {
    const student =
      studentMap.get(e.studentId) ||
      (e.studentNisn ? studentMap.get(`nisn_${e.studentNisn}`) : undefined) ||
      studentMap.get(`name_${e.studentName.toLowerCase().trim()}`);

    if (!student) return e;

    const targetKelas = student.kelas || e.studentKelas;
    const targetRombel = student.rombel || e.studentRombel;

    if (e.studentKelas !== targetKelas || e.studentRombel !== targetRombel) {
      entriesUpdatedCount++;
      return {
        ...e,
        studentKelas: targetKelas,
        studentRombel: targetRombel,
      };
    }
    return e;
  });

  let verificationsUpdatedCount = 0;
  const syncedVerifications = monthlyVerifications.map((v) => {
    const student =
      studentMap.get(v.studentId) ||
      (v.studentNisn ? studentMap.get(`nisn_${v.studentNisn}`) : undefined) ||
      (v.studentName ? studentMap.get(`name_${v.studentName.toLowerCase().trim()}`) : undefined);

    if (!student) return v;

    const targetKelas = student.kelas || v.studentKelas;
    const targetRombel = student.rombel || v.studentRombel;

    if (v.studentKelas !== targetKelas || v.studentRombel !== targetRombel) {
      verificationsUpdatedCount++;
      return {
        ...v,
        studentKelas: targetKelas,
        studentRombel: targetRombel,
      };
    }
    return v;
  });

  return {
    syncedEntries,
    syncedVerifications,
    entriesUpdatedCount,
    verificationsUpdatedCount,
  };
}

/**
 * Eksekusi Kenaikan Kelas & Pergantian Tahun Ajaran ke Semua Rombongan Kelas:
 * 1. Update data User (siswa kelas 10 -> 11, 11 -> 12, 12 -> alumni)
 * 2. Update seluruh entri jurnal membaca milik siswa agar sinkron dengan rombel barunya
 * 3. Update seluruh verifikasi rapor bulanan siswa
 */
export function executeAcademicYearPromotion(
  users: User[],
  entries: LiteracyEntry[],
  monthlyVerifications: MonthlyVerification[],
  targetAcademicYear: string
): {
  updatedUsers: User[];
  updatedEntries: LiteracyEntry[];
  updatedVerifications: MonthlyVerification[];
  stats: PromotionPreviewSummary;
  totalDataSynced: number;
} {
  const stats = previewAcademicYearPromotion(users);

  // 1. Update Users
  const updatedUsers: User[] = users.map((u) => {
    if (u.role !== 'siswa') return u;

    const currentGrade = (u.kelas || '10') as JenjangKelas;
    const currentRombel = u.rombel || `Kelas ${currentGrade}`;
    const { newKelas, newRombel } = promoteRombelName(currentRombel, currentGrade);

    return {
      ...u,
      kelas: newKelas,
      rombel: newRombel,
      academicYear: targetAcademicYear,
    };
  });

  // 2. Synchronize all entries and verifications with the newly updated users
  const syncResult = synchronizeRombelAcrossAllData(
    updatedUsers,
    entries,
    monthlyVerifications
  );

  return {
    updatedUsers,
    updatedEntries: syncResult.syncedEntries,
    updatedVerifications: syncResult.syncedVerifications,
    stats,
    totalDataSynced: syncResult.entriesUpdatedCount + syncResult.verificationsUpdatedCount,
  };
}
