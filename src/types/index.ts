export type UserRole = 'siswa' | 'guru' | 'admin';

export type JenjangKelas = '10' | '11' | '12';

export type SemesterType = 'Ganjil' | 'Genap';

export interface AcademicYearConfig {
  academicYear: string; // misal "2026/2027"
  semester: SemesterType;
  updatedAt: string;
  updatedBy?: string;
}

export interface SchoolProfileSettings {
  namaSekolah: string; // misal "SMA Negeri 2 Samarinda"
  npsn?: string; // misal "30401234"
  alamatSekolah?: string; // misal "Jl. K.H. Samanhudi No. 9, Pelabuhan, Kec. Samarinda Kota, Kota Samarinda, Kalimantan Timur"
  teleponSekolah?: string; // misal "(0541) 741639"
  emailSekolah?: string; // misal "info@sman2samarinda.sch.id"
  namaKepalaSekolah: string; // misal "Drs. H. Mulyadi, M.Pd"
  nipKepalaSekolah?: string; // misal "197508101999031004"
  namaKoordinatorLiterasi: string; // misal "Hendra Wijaya, M.Pd"
  nipKoordinatorLiterasi?: string; // misal "198504122010011008"
  jabatanKoordinator?: string; // misal "Koordinator Guru Penilai Literasi"
  kotaPenerbitan?: string; // misal "Samarinda"
  dinasPendidikan?: string; // misal "DINAS PENDIDIKAN DAN KEBUDAYAAN"
  pemerintahProvinsi?: string; // misal "PEMERINTAH PROVINSI KALIMANTAN TIMUR"
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SCHOOL_PROFILE: SchoolProfileSettings = {
  namaSekolah: 'SMA Negeri 2 Samarinda',
  npsn: '30401234',
  alamatSekolah: 'Jl. K.H. Samanhudi No. 9, Pelabuhan, Kec. Samarinda Kota, Kota Samarinda, Kalimantan Timur • Telp: (0541) 741639',
  teleponSekolah: '(0541) 741639',
  emailSekolah: 'info@sman2samarinda.sch.id',
  namaKepalaSekolah: 'Drs. H. Mulyadi, M.Pd',
  nipKepalaSekolah: '197508101999031004',
  namaKoordinatorLiterasi: 'Hendra Wijaya, M.Pd',
  nipKoordinatorLiterasi: '198504122010011008',
  jabatanKoordinator: 'Koordinator Guru Penilai Literasi',
  kotaPenerbitan: 'Samarinda',
  dinasPendidikan: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
  pemerintahProvinsi: 'PEMERINTAH PROVINSI KALIMANTAN TIMUR',
};

export interface RombelItem {
  id: string;
  name: string; // e.g. "X MIPA 1"
  grade: JenjangKelas; // "10" | "11" | "12"
  waliKelas?: string; // e.g. "Dra. Hj. Sri Rahayu"
  description?: string;
  createdAt?: string;
}

export const DEFAULT_ROMBELS: RombelItem[] = [
  // Kelas 10 (10 Rombel: X-A s/d X-J)
  { id: 'rombel-10-A', name: 'X-A', grade: '10', waliKelas: 'Hendra Wijaya, M.Pd' },
  { id: 'rombel-10-B', name: 'X-B', grade: '10', waliKelas: 'Dra. Hj. Sri Rahayu' },
  { id: 'rombel-10-C', name: 'X-C', grade: '10', waliKelas: 'Nurhayati, M.Pd' },
  { id: 'rombel-10-D', name: 'X-D', grade: '10', waliKelas: 'Budi Santoso, S.Pd' },
  { id: 'rombel-10-E', name: 'X-E', grade: '10', waliKelas: 'Ratna Dewi, M.Pd' },
  { id: 'rombel-10-F', name: 'X-F', grade: '10', waliKelas: 'Bambang Sutejo, S.Pd' },
  { id: 'rombel-10-G', name: 'X-G', grade: '10', waliKelas: 'Dewi Sartika, M.Pd' },
  { id: 'rombel-10-H', name: 'X-H', grade: '10', waliKelas: 'Agus Setiawan, S.Pd' },
  { id: 'rombel-10-I', name: 'X-I', grade: '10', waliKelas: 'Rina Kusuma, M.Pd' },
  { id: 'rombel-10-J', name: 'X-J', grade: '10', waliKelas: 'Eko Prasetyo, S.Pd' },

  // Kelas 11 (10 Rombel: XI-A s/d XI-J)
  { id: 'rombel-11-A', name: 'XI-A', grade: '11', waliKelas: 'Fitri Handayani, M.Pd' },
  { id: 'rombel-11-B', name: 'XI-B', grade: '11', waliKelas: 'Tri Wahyuni, S.Pd' },
  { id: 'rombel-11-C', name: 'XI-C', grade: '11', waliKelas: 'Andi Saputra, M.Pd' },
  { id: 'rombel-11-D', name: 'XI-D', grade: '11', waliKelas: 'Maya Indah, S.Pd' },
  { id: 'rombel-11-E', name: 'XI-E', grade: '11', waliKelas: 'Yudi Hermawan, M.Pd' },
  { id: 'rombel-11-F', name: 'XI-F', grade: '11', waliKelas: 'Siti Aminah, S.Pd' },
  { id: 'rombel-11-G', name: 'XI-G', grade: '11', waliKelas: 'Hendra Wijaya, M.Pd' },
  { id: 'rombel-11-H', name: 'XI-H', grade: '11', waliKelas: 'Dra. Hj. Sri Rahayu' },
  { id: 'rombel-11-I', name: 'XI-I', grade: '11', waliKelas: 'Nurhayati, M.Pd' },
  { id: 'rombel-11-J', name: 'XI-J', grade: '11', waliKelas: 'Budi Santoso, S.Pd' },

  // Kelas 12 (10 Rombel: XII-A s/d XII-J)
  { id: 'rombel-12-A', name: 'XII-A', grade: '12', waliKelas: 'Drs. H. Mulyadi, M.Pd' },
  { id: 'rombel-12-B', name: 'XII-B', grade: '12', waliKelas: 'Ratna Dewi, M.Pd' },
  { id: 'rombel-12-C', name: 'XII-C', grade: '12', waliKelas: 'Bambang Sutejo, S.Pd' },
  { id: 'rombel-12-D', name: 'XII-D', grade: '12', waliKelas: 'Dewi Sartika, M.Pd' },
  { id: 'rombel-12-E', name: 'XII-E', grade: '12', waliKelas: 'Agus Setiawan, S.Pd' },
  { id: 'rombel-12-F', name: 'XII-F', grade: '12', waliKelas: 'Rina Kusuma, M.Pd' },
  { id: 'rombel-12-G', name: 'XII-G', grade: '12', waliKelas: 'Eko Prasetyo, S.Pd' },
  { id: 'rombel-12-H', name: 'XII-H', grade: '12', waliKelas: 'Fitri Handayani, M.Pd' },
  { id: 'rombel-12-I', name: 'XII-I', grade: '12', waliKelas: 'Tri Wahyuni, S.Pd' },
  { id: 'rombel-12-J', name: 'XII-J', grade: '12', waliKelas: 'Andi Saputra, M.Pd' },
];

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
  academicYear?: string;
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
  w1JournalScore?: number; // 0 - 20 (Skor Refleksi Jurnal Siswa M1)
  w2JournalScore?: number;
  w3JournalScore?: number;
  w4JournalScore?: number;
  w1TeacherScore?: number; // 0 - 80 (Skor Validasi Guru M1)
  w2TeacherScore?: number;
  w3TeacherScore?: number;
  w4TeacherScore?: number;
  avgJournalScore?: number; // 0 - 20 (Rata-rata 4 Minggu Komponen Jurnal Siswa)
  avgTeacherScore?: number; // 0 - 80 (Rata-rata 4 Minggu Komponen Validasi Guru)
  w1Validated: boolean;
  w2Validated: boolean;
  w3Validated: boolean;
  w4Validated: boolean;
  sumValidatedScores: number;
  validatedCount: number;
  averageScore: number;
  formula: string;
  formulaFull?: string;
  componentFormula?: string;
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
  isEligibleForMonthlyValidation?: boolean; // True jika siswa telah mengisi minimal 3 minggu (diizinkan untuk divalidasi guru)
  isFullyValidated?: boolean; // True jika telah tuntas minimal 3-4 minggu dan seluruhnya telah divalidasi guru
  totalEntriesInMonth: number;
  autoAccumulatedScore?: number; // 0 - 100 (Nilai otomatis terakumulasi dari minggu terisi)
  calculatedAccumulatedScore: number; // 0 - 100 (Nilai akumulasi akhir bulan)
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

export interface JournalCutoffConfig {
  cutoffDate: string; // 'YYYY-MM-DD' e.g. '2026-11-30'
  cutoffTime: string; // 'HH:mm' e.g. '23:59'
  isEnabled: boolean;
  announcementText?: string;
  additionalNote?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_JOURNAL_CUTOFF: JournalCutoffConfig = {
  cutoffDate: '2026-11-30',
  cutoffTime: '23:59',
  isEnabled: true,
  announcementText: 'Cut Off Pengisian Jurnal Oleh Murid',
  additionalNote: 'Mohon seluruh siswa menyelesaikan pengisian jurnal literasi sebelum batas waktu penutupan.',
  updatedAt: '2026-11-01T00:00:00.000Z',
  updatedBy: 'Admin Sekolah',
};

