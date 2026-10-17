import { JenjangKelas, LiteracyEntry, StudentLeaderboardStat, User } from '../types';

export function computeLeaderboardByGrade(
  entries: LiteracyEntry[],
  users: User[],
  grade: JenjangKelas
): StudentLeaderboardStat[] {
  // Find all students for this grade
  const studentsInGrade = users.filter((u) => u.role === 'siswa' && u.kelas === grade);

  const statsMap = new Map<string, StudentLeaderboardStat>();

  // Initialize for all known students in this grade
  for (const s of studentsInGrade) {
    statsMap.set(s.id, {
      studentId: s.id,
      studentName: s.name,
      studentNisn: s.nisn || '-',
      kelas: grade,
      rombel: s.rombel || `Kelas ${grade}`,
      totalEntries: 0,
      totalValidatedEntries: 0,
      totalMinutesRead: 0,
      avgTotalScore: 0,
      highestScore: 0,
    });
  }

  // Aggregate from entries
  for (const entry of entries) {
    if (entry.studentKelas !== grade) continue;

    let stat = statsMap.get(entry.studentId);
    if (!stat) {
      stat = {
        studentId: entry.studentId,
        studentName: entry.studentName,
        studentNisn: entry.studentNisn,
        kelas: grade,
        rombel: entry.studentRombel,
        totalEntries: 0,
        totalValidatedEntries: 0,
        totalMinutesRead: 0,
        avgTotalScore: 0,
        highestScore: 0,
      };
      statsMap.set(entry.studentId, stat);
    }

    stat.totalEntries += 1;
    stat.totalMinutesRead += Number(entry.durationMinutes) || 0;

    // If validated, count score
    if (entry.totalFinalScore !== undefined && entry.totalFinalScore !== null) {
      stat.totalValidatedEntries += 1;
      if (entry.totalFinalScore > stat.highestScore) {
        stat.highestScore = entry.totalFinalScore;
      }
    }
  }

  // Calculate averages
  const list: StudentLeaderboardStat[] = [];
  statsMap.forEach((stat) => {
    // Collect all scores for this student
    const studentEntries = entries.filter(
      (e) => e.studentId === stat.studentId && e.totalFinalScore !== undefined && e.totalFinalScore !== null
    );

    if (studentEntries.length > 0) {
      const sum = studentEntries.reduce((acc, curr) => acc + (curr.totalFinalScore || 0), 0);
      stat.avgTotalScore = Math.round((sum / studentEntries.length) * 10) / 10;
    } else {
      stat.avgTotalScore = 0;
    }

    // Only include students who have submitted at least 1 entry or are registered
    list.push(stat);
  });

  // Sort by:
  // 1. avgTotalScore DESC
  // 2. totalMinutesRead DESC
  // 3. totalEntries DESC
  list.sort((a, b) => {
    if (b.avgTotalScore !== a.avgTotalScore) {
      return b.avgTotalScore - a.avgTotalScore;
    }
    if (b.totalMinutesRead !== a.totalMinutesRead) {
      return b.totalMinutesRead - a.totalMinutesRead;
    }
    return b.totalEntries - a.totalEntries;
  });

  // Assign ranks
  list.forEach((item, index) => {
    item.rank = index + 1;
  });

  return list;
}

export function getTop3ByGrade(
  entries: LiteracyEntry[],
  users: User[],
  grade: JenjangKelas
): StudentLeaderboardStat[] {
  const ranked = computeLeaderboardByGrade(entries, users, grade);
  return ranked.slice(0, 3);
}

export function getAllTop3(
  entries: LiteracyEntry[],
  users: User[]
): Record<JenjangKelas, StudentLeaderboardStat[]> {
  return {
    '10': getTop3ByGrade(entries, users, '10'),
    '11': getTop3ByGrade(entries, users, '11'),
    '12': getTop3ByGrade(entries, users, '12'),
  };
}
