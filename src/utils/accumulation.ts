import { LiteracyEntry, User, MonthlyVerification, StudentMonthlyAccumulationSummary, StudentWeeklySummary } from '../types';

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

  // Active weekly scores for accumulation
  const activeWeeklyScores = [w1Sum, w2Sum, w3Sum, w4Sum]
    .filter((w) => w.hasSubmission)
    .map((w) => w.weeklyFinalScore);

  let calculatedScore = 0;
  if (activeWeeklyScores.length > 0) {
    const sum = activeWeeklyScores.reduce((a, b) => a + b, 0);
    calculatedScore = Math.round((sum / activeWeeklyScores.length) * 10) / 10;
  }

  // Find existing monthly verification saved by teacher
  const existingVerification = verifications.find(
    (v) => (v.studentId === student.id || v.id === `${student.id}_${monthKey}`) && v.monthKey === monthKey
  );

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
    totalEntriesInMonth: monthEntries.length,
    calculatedAccumulatedScore: existingVerification ? existingVerification.accumulatedScore : calculatedScore,
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

