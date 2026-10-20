import { 
  LiteracyEntry, 
  User, 
  MonthlyVerification, 
  StudentMonthlyAccumulationSummary, 
  StudentWeeklySummary,
  WeeklyAverageBreakdown 
} from '../types';

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Determine which week (1, 2, 3, or 4) a date belongs to in its month.
 * Rule:
 * - Day 1 - 7: Minggu 1
 * - Day 8 - 14: Minggu 2
 * - Day 15 - 21: Minggu 3
 * - Day 22 - end of month: Minggu 4
 */
export function getWeekNumberFromDate(dateStr: string): 1 | 2 | 3 | 4 {
  if (!dateStr) return 1;
  const parts = dateStr.split('-');
  const day = parseInt(parts[2] || '1', 10);
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

/**
 * Get readable week label and date range for a specific week
 */
export function getWeekPeriodLabel(monthKey: string, weekNum: 1 | 2 | 3 | 4): string {
  const [y, m] = monthKey.split('-');
  const monthName = MONTH_NAMES_ID[parseInt(m, 10) - 1] || m;
  
  // Calculate total days in month
  const totalDays = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();

  switch (weekNum) {
    case 1:
      return `1 - 7 ${monthName}`;
    case 2:
      return `8 - 14 ${monthName}`;
    case 3:
      return `15 - 21 ${monthName}`;
    case 4:
      return `22 - ${totalDays} ${monthName}`;
  }
}

/**
 * Get the date range (start & end YYYY-MM-DD) for a specific week of a month
 */
export function getWeekDateRange(monthKey: string, weekNum: 1 | 2 | 3 | 4): { start: string; end: string; totalDays: number } {
  const [y, m] = monthKey.split('-');
  const totalDays = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
  switch (weekNum) {
    case 1:
      return { start: `${monthKey}-01`, end: `${monthKey}-07`, totalDays };
    case 2:
      return { start: `${monthKey}-08`, end: `${monthKey}-14`, totalDays };
    case 3:
      return { start: `${monthKey}-15`, end: `${monthKey}-21`, totalDays };
    case 4:
      return { start: `${monthKey}-22`, end: `${monthKey}-${String(totalDays).padStart(2, '0')}`, totalDays };
  }
}

/**
 * Suggest a representative default date for a specific week
 */
export function getDefaultDateForWeek(monthKey: string, weekNum: 1 | 2 | 3 | 4): string {
  const range = getWeekDateRange(monthKey, weekNum);
  switch (weekNum) {
    case 1:
      return `${monthKey}-05`;
    case 2:
      return `${monthKey}-12`;
    case 3:
      return `${monthKey}-19`;
    case 4:
      return `${monthKey}-26`;
  }
}

/**
 * Check if the calendar period of a specific week has already passed relative to today
 */
export function isWeekPeriodPassed(monthKey: string, weekNum: 1 | 2 | 3 | 4): boolean {
  const range = getWeekDateRange(monthKey, weekNum);
  const today = new Date().toISOString().split('T')[0];
  return range.end < today;
}

/**
 * Format a computer system timestamp (systemInputDate or createdAt) into a readable Indonesian format.
 * Example output: "19 Okt 2026, 13:36 WIB"
 */
export function formatSystemInputDate(systemInputDate?: string, createdAt?: string, fallbackDate?: string): string {
  const raw = systemInputDate || createdAt || fallbackDate;
  if (!raw) return '-';

  if (raw.includes('WIB') || raw.includes('WITA') || raw.includes('WIT')) {
    return raw;
  }

  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      return raw;
    }
    const day = d.getDate();
    const month = MONTH_NAMES_ID[d.getMonth()]?.substring(0, 3) || String(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
  } catch {
    return raw;
  }
}

/**
 * Format live computer timestamp for display in locked forms
 * Example: "Senin, 19 Oktober 2026 • 13:36:49 WIB"
 */
export function getLiveSystemTimestampString(dateObj: Date = new Date()): string {
  const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = DAYS[dateObj.getDay()];
  const day = dateObj.getDate();
  const monthName = MONTH_NAMES_ID[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  return `${dayName}, ${day} ${monthName} ${year} • ${hours}:${minutes}:${seconds} WIB`;
}

/**
 * Get effective score of an entry (0 - 100)
 */
export function getEntryScore(entry: LiteracyEntry): number {
  if (entry.totalFinalScore !== undefined && entry.totalFinalScore !== null) {
    return entry.totalFinalScore;
  }
  if (entry.teacherValidation) {
    return Math.min(100, (entry.reflection?.totalScore || 0) + Number(entry.teacherValidation.validationScore || 0));
  }
  // Self reflection score scaled up if not validated yet
  return (entry.reflection?.totalScore || 0) * 5;
}

/**
 * Calculate weekly summary for a single student in a specific week of a month.
 * Combines/aggregates all journals submitted by the student in that week.
 */
export function calculateStudentWeeklySummary(
  student: User,
  monthKey: string,
  weekNumber: 1 | 2 | 3 | 4,
  entries: LiteracyEntry[]
): StudentWeeklySummary {
  const weekLabel = `Minggu ${weekNumber} (${getWeekPeriodLabel(monthKey, weekNumber)})`;

  // Find all entries for this student in this specific week of the month
  const weekEntries = entries.filter((e) => {
    const isThisStudent = e.studentId === student.id || 
      (student.nisn && e.studentNisn === student.nisn) || 
      e.studentName.toLowerCase().trim() === student.name.toLowerCase().trim();
    
    if (!isThisStudent) return false;
    const d = e.date || e.createdAt;
    if (!d || !d.startsWith(monthKey)) return false;
    const w = e.weekNumber || getWeekNumberFromDate(d);
    return w === weekNumber;
  });

  const entriesCount = weekEntries.length;
  const hasSubmission = entriesCount > 0;

  if (!hasSubmission) {
    return {
      student,
      monthKey,
      weekNumber,
      weekLabel,
      entries: [],
      entriesCount: 0,
      hasSubmission: false,
      isValidated: false,
      selfReflectionAvg: 0,
      weeklyFinalScore: 0,
      status: 'belum_mengisi',
    };
  }

  // Calculate self-reflection average
  const totalSelf = weekEntries.reduce((acc, curr) => acc + (curr.reflection?.totalScore || 0), 0);
  const selfReflectionAvg = Math.round((totalSelf / entriesCount) * 10) / 10;

  // Check validation status
  const validatedEntries = weekEntries.filter((e) => !!e.teacherValidation);
  const isValidated = validatedEntries.length > 0;

  let weeklyFinalScore = 0;
  let teacherValidationScore: number | undefined = undefined;
  let feedbackNotes: string | undefined = undefined;

  if (isValidated) {
    // Average final scores across validated entries
    const sumFinal = validatedEntries.reduce((acc, curr) => acc + getEntryScore(curr), 0);
    weeklyFinalScore = Math.round((sumFinal / validatedEntries.length) * 10) / 10;

    const sumTeacher = validatedEntries.reduce((acc, curr) => acc + (curr.teacherValidation?.validationScore || 0), 0);
    teacherValidationScore = Math.round((sumTeacher / validatedEntries.length) * 10) / 10;

    // Pick latest feedback note
    const latestValidated = validatedEntries[validatedEntries.length - 1];
    feedbackNotes = latestValidated.teacherValidation?.feedbackNotes;
  } else {
    // Projected score based on reflection (max 100)
    const sumProjected = weekEntries.reduce((acc, curr) => acc + getEntryScore(curr), 0);
    weeklyFinalScore = Math.round((sumProjected / entriesCount) * 10) / 10;
  }

  const status = isValidated
    ? 'sudah_dinilai'
    : 'menunggu_penilaian';

  return {
    student,
    monthKey,
    weekNumber,
    weekLabel,
    entries: weekEntries,
    entriesCount,
    hasSubmission: true,
    isValidated,
    selfReflectionAvg,
    teacherValidationScore,
    weeklyFinalScore,
    feedbackNotes,
    status,
  };
}

/**
 * Calculate 4-weekly accumulation for a single student in a specific month
 */
export function calculateStudentMonthlyAccumulation(
  student: User,
  monthKey: string,
  entries: LiteracyEntry[],
  verifications: MonthlyVerification[] = []
): StudentMonthlyAccumulationSummary {
  // Weekly summaries for weeks 1, 2, 3, and 4
  const w1Sum = calculateStudentWeeklySummary(student, monthKey, 1, entries);
  const w2Sum = calculateStudentWeeklySummary(student, monthKey, 2, entries);
  const w3Sum = calculateStudentWeeklySummary(student, monthKey, 3, entries);
  const w4Sum = calculateStudentWeeklySummary(student, monthKey, 4, entries);

  // Best/representative entry per week
  const week1Entry = w1Sum.entries[w1Sum.entries.length - 1];
  const week2Entry = w2Sum.entries[w2Sum.entries.length - 1];
  const week3Entry = w3Sum.entries[w3Sum.entries.length - 1];
  const week4Entry = w4Sum.entries[w4Sum.entries.length - 1];

  const monthEntries = [
    ...w1Sum.entries,
    ...w2Sum.entries,
    ...w3Sum.entries,
    ...w4Sum.entries,
  ];

  // Completed weeks count (0 - 4)
  const completedWeeks = [w1Sum, w2Sum, w3Sum, w4Sum].filter((w) => w.hasSubmission).length;

  // Validated weeks count (minggu yang telah dinilai dan divalidasi oleh guru)
  const w1Validated = w1Sum.hasSubmission && w1Sum.isValidated;
  const w2Validated = w2Sum.hasSubmission && w2Sum.isValidated;
  const w3Validated = w3Sum.hasSubmission && w3Sum.isValidated;
  const w4Validated = w4Sum.hasSubmission && w4Sum.isValidated;

  const validatedList = [w1Sum, w2Sum, w3Sum, w4Sum].filter((w) => w.hasSubmission && w.isValidated);
  const validatedWeeksCount = validatedList.length;
  const all4WeeksCompleted = completedWeeks >= 4;
  const all4WeeksValidated = validatedWeeksCount >= 4;
  const isFullyValidated = all4WeeksCompleted && all4WeeksValidated;

  // Hitung rata-rata dari seluruh nilai yang diinput dan divalidasi guru
  const sumValidatedScores = validatedList.reduce((acc, curr) => acc + curr.weeklyFinalScore, 0);

  let averageScore = 0;
  let formula = '-';

  if (all4WeeksValidated) {
    // Siswa telah mengumpulkan 4 minggu dan seluruh 4 minggu telah divalidasi oleh guru
    const total4Weeks = w1Sum.weeklyFinalScore + w2Sum.weeklyFinalScore + w3Sum.weeklyFinalScore + w4Sum.weeklyFinalScore;
    averageScore = Math.round((total4Weeks / 4) * 10) / 10;
    formula = `(${w1Sum.weeklyFinalScore} + ${w2Sum.weeklyFinalScore} + ${w3Sum.weeklyFinalScore} + ${w4Sum.weeklyFinalScore}) ÷ 4`;
  } else if (validatedWeeksCount > 0) {
    // Sebagian minggu telah divalidasi oleh guru
    averageScore = Math.round((sumValidatedScores / validatedWeeksCount) * 10) / 10;
    formula = `(${validatedList.map((w) => w.weeklyFinalScore).join(' + ')}) ÷ ${validatedWeeksCount}`;
  } else {
    // Belum divalidasi guru, hitung rata-rata proyeksi mandiri jika ada
    const submittedList = [w1Sum, w2Sum, w3Sum, w4Sum].filter((w) => w.hasSubmission);
    if (submittedList.length > 0) {
      const sumSubmitted = submittedList.reduce((acc, curr) => acc + curr.weeklyFinalScore, 0);
      averageScore = Math.round((sumSubmitted / submittedList.length) * 10) / 10;
      formula = `(${submittedList.map((w) => w.weeklyFinalScore).join(' + ')}) ÷ ${submittedList.length} (refleksi)`;
    }
  }

  // Find existing monthly verification saved by teacher
  const existingVerification = verifications.find(
    (v) => (v.studentId === student.id || v.id === `${student.id}_${monthKey}`) && v.monthKey === monthKey
  );

  const finalMonthlyScore = existingVerification ? existingVerification.accumulatedScore : averageScore;
  const predicate = existingVerification?.predicate || getPredicateFromScore(finalMonthlyScore);

  const weeklyBreakdown: WeeklyAverageBreakdown = {
    w1Score: w1Sum.hasSubmission ? w1Sum.weeklyFinalScore : undefined,
    w2Score: w2Sum.hasSubmission ? w2Sum.weeklyFinalScore : undefined,
    w3Score: w3Sum.hasSubmission ? w3Sum.weeklyFinalScore : undefined,
    w4Score: w4Sum.hasSubmission ? w4Sum.weeklyFinalScore : undefined,
    w1Validated,
    w2Validated,
    w3Validated,
    w4Validated,
    sumValidatedScores,
    validatedCount: validatedWeeksCount,
    averageScore,
    formula,
    all4WeeksCompleted,
    all4WeeksValidated,
    finalMonthlyScore,
    predicate,
  };

  return {
    student,
    monthKey,
    week1Entry,
    week2Entry,
    week3Entry,
    week4Entry,
    week1Summary: w1Sum,
    week2Summary: w2Sum,
    week3Summary: w3Sum,
    week4Summary: w4Sum,
    allMonthEntries: monthEntries,
    completedWeeks,
    validatedWeeksCount,
    isFullyValidated,
    totalEntriesInMonth: monthEntries.length,
    calculatedAccumulatedScore: finalMonthlyScore,
    weeklyBreakdown,
    monthlyVerification: existingVerification,
  };
}

/**
 * Get monthly accumulation summaries for all students
 */
export function getAllStudentsMonthlySummary(
  students: User[],
  monthKey: string,
  entries: LiteracyEntry[],
  verifications: MonthlyVerification[] = []
): StudentMonthlyAccumulationSummary[] {
  // 1. Gather all student users
  const studentMap = new Map<string, User>();
  students.forEach((s) => {
    studentMap.set(s.id, s);
    if (s.nisn) studentMap.set(`nisn_${s.nisn}`, s);
    studentMap.set(`name_${s.name.toLowerCase().trim()}`, s);
  });

  const allActiveStudents = [...students];

  // 2. Discover any students from entries in this month that aren't in the registered user list
  entries.forEach((e) => {
    const d = e.date || e.createdAt;
    if (d && d.startsWith(monthKey)) {
      const matchById = studentMap.get(e.studentId);
      const matchByNisn = e.studentNisn ? studentMap.get(`nisn_${e.studentNisn}`) : undefined;
      const matchByName = studentMap.get(`name_${e.studentName.toLowerCase().trim()}`);

      if (!matchById && !matchByNisn && !matchByName) {
        const syntheticStudent: User = {
          id: e.studentId || `student-${e.studentNisn || Date.now()}`,
          name: e.studentName,
          nisn: e.studentNisn,
          kelas: e.studentKelas,
          rombel: e.studentRombel,
          role: 'siswa',
          username: e.studentNisn || e.studentName.toLowerCase().replace(/\s+/g, '.'),
        };
        allActiveStudents.push(syntheticStudent);
        studentMap.set(syntheticStudent.id, syntheticStudent);
        if (syntheticStudent.nisn) studentMap.set(`nisn_${syntheticStudent.nisn}`, syntheticStudent);
        studentMap.set(`name_${syntheticStudent.name.toLowerCase().trim()}`, syntheticStudent);
      }
    }
  });

  // 3. Map each student to their monthly accumulation summary
  return allActiveStudents.map((s) =>
    calculateStudentMonthlyAccumulation(s, monthKey, entries, verifications)
  );
}

/**
 * Calculate suggested predicate from score
 */
export function getPredicateFromScore(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

/**
 * Get weekly summary for all students in a specific week of a month.
 * Collapses each student's weekly entries into 1 representative weekly summary row.
 */
export function getAllStudentsWeeklySummary(
  students: User[],
  monthKey: string,
  weekNumber: 1 | 2 | 3 | 4,
  entries: LiteracyEntry[]
): StudentWeeklySummary[] {
  // 1. Gather all student users
  const studentMap = new Map<string, User>();
  students.forEach((s) => {
    studentMap.set(s.id, s);
    if (s.nisn) studentMap.set(`nisn_${s.nisn}`, s);
    studentMap.set(`name_${s.name.toLowerCase().trim()}`, s);
  });

  const allActiveStudents = [...students];

  // 2. Discover any students from entries in this month and week that aren't in the registered user list
  entries.forEach((e) => {
    const d = e.date || e.createdAt;
    if (d && d.startsWith(monthKey)) {
      const w = e.weekNumber || getWeekNumberFromDate(d);
      if (w === weekNumber) {
        const matchById = studentMap.get(e.studentId);
        const matchByNisn = e.studentNisn ? studentMap.get(`nisn_${e.studentNisn}`) : undefined;
        const matchByName = studentMap.get(`name_${e.studentName.toLowerCase().trim()}`);

        if (!matchById && !matchByNisn && !matchByName) {
          const syntheticStudent: User = {
            id: e.studentId || `student-${e.studentNisn || Date.now()}`,
            name: e.studentName,
            nisn: e.studentNisn,
            kelas: e.studentKelas,
            rombel: e.studentRombel,
            role: 'siswa',
            username: e.studentNisn || e.studentName.toLowerCase().replace(/\s+/g, '.'),
          };
          allActiveStudents.push(syntheticStudent);
          studentMap.set(syntheticStudent.id, syntheticStudent);
          if (syntheticStudent.nisn) studentMap.set(`nisn_${syntheticStudent.nisn}`, syntheticStudent);
          studentMap.set(`name_${syntheticStudent.name.toLowerCase().trim()}`, syntheticStudent);
        }
      }
    }
  });

  return allActiveStudents.map((s) =>
    calculateStudentWeeklySummary(s, monthKey, weekNumber, entries)
  );
}

