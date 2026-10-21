export type UserRole = 'siswa' | 'guru' | 'admin';

export type JenjangKelas = '10' | '11' | '12';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  nisn?: string;
  nip?: string;
  kelas?: JenjangKelas;
  rombel?: string;
  avatar?: string;
  email?: string;
  createdAt?: string;
}

export type JenisLiterasi = 'Kitab Suci' | 'Non Mapel';

export interface SelfReflection {
  q1: number; // 1-5: Saya memahami dengan baik pesan utama, cerita, atau ajaran dari bacaan hari ini.
  q2: number; // 1-5: Saya menemukan nilai kebaikan, hikmah, atau inspirasi positif dari apa yang saya baca.
  q3: number; // 1-5: Bacaan hari ini mendorong saya untuk menjadi pribadi yang lebih baik dalam kehidupan sehari-hari.
  q4: number; // 1-5: Saya membaca dan merenungkan isi bacaan hari ini dengan penuh kesadaran dan tanpa paksaan.
  totalScore: number; // max 20
}

export interface TeacherValidation {
  teacherId: string;
  teacherName: string;
  teacherNip?: string;
  validationScore: number; // 0 - 80 poin
  feedbackNotes: string;
  validatedAt: string;
  status: 'validated' | 'needs_revision' | 'rejected';
}

export interface LiteracyEntry {
  id: string;
  studentId: string;
  studentName: string;
  studentNisn: string;
  studentKelas: JenjangKelas;
  studentRombel: string;
  date: string; // YYYY-MM-DD
  weekNumber?: 1 | 2 | 3 | 4; // Target mingguan ke 1 - 4
  literacyType: JenisLiterasi;
  readingCategory: string; // misal: Al-Qur'an / Alkitab / Novel Fiksi / Buku Biografi / Sains Populer / Filosofi / dll
  bookTitle: string;
  pagesRead: string; // e.g. "Hal 20 - 45" atau "Juz 3, QS Al-Baqarah 253-286"
  durationMinutes: number; // dalam menit
  summary: string; // Ringkasan bacaan
  moralValue: string; // Pesan atau nilai moral
  peerDiscussion: boolean; // Ya / Tidak
  peerDiscussionNotes?: string; // Catatan diskusi rekan
  photoUrl: string; // URL foto kegiatan atau base64
  reflection: SelfReflection;
  teacherValidation?: TeacherValidation;
  totalFinalScore?: number; // Skor Refleksi (max 20) + Skor Validasi Guru (max 80) = Max 100
  isLateSubmission?: boolean; // Indikator jika jurnal diinput setelah jadwal tanggal/minggu seharusnya sudah lewat
  lateReason?: string; // Alasan pengisian susulan (misal: sakit/izin/keterbatasan gawai/tugas susulan)
  systemInputDate?: string; // Tanggal & waktu input otomatis dari komputer yang tidak dapat diedit siswa (e.g. "19 Okt 2026, 13:36 WIB")
  createdAt: string;
}

export interface MonthlyVerification {
  id: string; // format: `${studentId}_${monthKey}`
  studentId: string;
  studentName?: string;
  studentNisn?: string;
  studentKelas?: JenjangKelas;
  studentRombel?: string;
  monthKey: string; // format: 'YYYY-MM'
  completedWeeks?: number; // 0 - 4
  accumulatedScore: number; // 0 - 100
  predicate?: 'A' | 'B' | 'C' | 'D';
  teacherId: string;
  teacherName: string;
  teacherNotes?: string;
  verifiedAt: string;
  status: 'verified' | 'draft';
}

export interface StudentWeeklySummary {
  student: User;
  monthKey: string;
  weekNumber: 1 | 2 | 3 | 4;
  weekLabel: string;
  entries: LiteracyEntry[];
  entriesCount: number;
  hasSubmission: boolean;
  isValidated: boolean;
  selfReflectionAvg: number; // 0 - 20
  teacherValidationScore?: number; // 0 - 80
  weeklyFinalScore: number; // 0 - 100
  feedbackNotes?: string;
  status: 'sudah_dinilai' | 'menunggu_penilaian' | 'belum_mengisi';
}

export interface WeeklyAverageBreakdown {
  w1Score?: number;
  w2Score?: number;
  w3Score?: number;
  w4Score?: number;
  w1Validated: boolean;
  w2Validated: boolean;
  w3Validated: boolean;
  w4Validated: boolean;
  sumValidatedScores: number;
  validatedCount: number;
  averageScore: number;
  formula: string;
  all4WeeksCompleted: boolean;
  all4WeeksValidated: boolean;
  finalMonthlyScore: number;
  predicate: 'A' | 'B' | 'C' | 'D';
  fourWeeksSum?: number;
  fourWeeksAverage?: number;
}

export interface StudentMonthlyAccumulationSummary {
  student: User;
  monthKey: string;
  week1Entry?: LiteracyEntry;
  week2Entry?: LiteracyEntry;
  week3Entry?: LiteracyEntry;
  week4Entry?: LiteracyEntry;
  week1Summary?: StudentWeeklySummary;
  week2Summary?: StudentWeeklySummary;
  week3Summary?: StudentWeeklySummary;
  week4Summary?: StudentWeeklySummary;
  allMonthEntries?: LiteracyEntry[];
  completedWeeks: number; // 0 - 4
  validatedWeeksCount?: number; // 0 - 4 minggu yang sudah divalidasi guru
  isFullyValidated?: boolean; // True jika tuntas 4 minggu dan seluruhnya telah divalidasi guru
  totalEntriesInMonth: number;
  calculatedAccumulatedScore: number; // 0 - 100 (Rata-rata nilai akumulasi 4 minggu)
  weeklyBreakdown?: WeeklyAverageBreakdown;
  monthlyVerification?: MonthlyVerification;
}

export interface StudentLeaderboardStat {
  studentId: string;
  studentName: string;
  studentNisn: string;
  kelas: JenjangKelas;
  rombel: string;
  totalEntries: number;
  totalValidatedEntries: number;
  totalMinutesRead: number;
  avgTotalScore: number; // Nilai rata-rata dari 100
  highestScore: number;
  rank?: number;
}

