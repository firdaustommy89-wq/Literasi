import React, { useMemo, useState } from 'react';
import { User, LiteracyEntry, MonthlyVerification, RombelItem, SchoolProfileSettings, SemesterType } from '../types';
import { 
  BookOpen, 
  Clock, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  TrendingUp, 
  Users, 
  FileText, 
  ArrowUpRight, 
  Sparkles, 
  PlusCircle, 
  CheckCheck, 
  ChevronRight, 
  BarChart3, 
  GraduationCap, 
  ShieldCheck, 
  Bookmark, 
  Star,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';

interface DashboardViewProps {
  currentUser: User;
  users: User[];
  entries: LiteracyEntry[];
  monthlyVerifications: MonthlyVerification[];
  rombels: RombelItem[];
  schoolProfile: SchoolProfileSettings;
  academicYear: string;
  semester: SemesterType;
  onNavigateTab: (tab: string) => void;
  onOpenReportModal?: () => void;
  onExportExcel?: () => void;
  onOpenSchoolSettingsModal?: () => void;
  unreadCount?: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  users,
  entries,
  monthlyVerifications,
  rombels,
  schoolProfile,
  academicYear,
  semester,
  onNavigateTab,
  onOpenReportModal,
  onExportExcel,
  onOpenSchoolSettingsModal,
  unreadCount = 0,
}) => {
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'all' | '10' | '11' | '12'>('all');

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  }, []);

  // Filtered entries for current student
  const studentEntries = useMemo(() => {
    if (currentUser.role !== 'siswa') return [];
    return entries.filter(
      (e) => e.studentId === currentUser.id || (currentUser.nisn && e.studentNisn === currentUser.nisn)
    );
  }, [entries, currentUser]);

  // Student metrics
  const studentStats = useMemo(() => {
    const totalEntries = studentEntries.length;
    const validatedEntries = studentEntries.filter((e) => !!e.teacherValidation);
    const pendingEntries = studentEntries.filter((e) => !e.teacherValidation);
    const totalMinutes = studentEntries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    
    // Calculate average score
    const scoredList = studentEntries
      .map((e) => e.totalFinalScore ?? e.teacherValidation?.validationScore)
      .filter((s): s is number => typeof s === 'number');
    const averageScore = scoredList.length > 0 
      ? Math.round(scoredList.reduce((a, b) => a + b, 0) / scoredList.length) 
      : 0;

    // Check 4-week completion (Minggu 1, 2, 3, 4)
    const weeksFilled = new Set(studentEntries.map((e) => e.weekNumber));
    const weeksProgress = ([1, 2, 3, 4] as const).map((w) => ({
      week: w,
      completed: weeksFilled.has(w),
      entry: studentEntries.find((e) => e.weekNumber === w),
    }));

    return {
      totalEntries,
      validatedCount: validatedEntries.length,
      pendingCount: pendingEntries.length,
      totalMinutes,
      totalHours: (totalMinutes / 60).toFixed(1),
      averageScore,
      weeksProgress,
    };
  }, [studentEntries]);

  // Teacher & Admin metrics
  const schoolStats = useMemo(() => {
    const totalStudents = users.filter((u) => u.role === 'siswa').length;
    const totalTeachers = users.filter((u) => u.role === 'guru').length;
    const totalEntriesCount = entries.length;
    const pendingValidationCount = entries.filter((e) => !e.teacherValidation).length;
    const validatedCount = entries.filter((e) => !!e.teacherValidation).length;
    
    // Calculate average score
    const scoredList = entries
      .map((e) => e.totalFinalScore ?? e.teacherValidation?.validationScore)
      .filter((s): s is number => typeof s === 'number');
    const averageScore = scoredList.length > 0 
      ? Math.round(scoredList.reduce((a, b) => a + b, 0) / scoredList.length) 
      : 0;

    // Active students count (at least 1 entry)
    const activeStudentIds = new Set(entries.map((e) => e.studentId || e.studentNisn));
    const participationRate = totalStudents > 0 
      ? Math.round((activeStudentIds.size / totalStudents) * 100) 
      : 0;

    return {
      totalStudents,
      totalTeachers,
      totalEntriesCount,
      pendingValidationCount,
      validatedCount,
      averageScore,
      activeStudentCount: activeStudentIds.size,
      participationRate,
    };
  }, [users, entries]);

  // Rombel progress bars calculation
  const rombelProgressList = useMemo(() => {
    const studentUsers = users.filter((u) => u.role === 'siswa');
    
    // Group students by rombel
    const rombelMap = new Map<string, { total: number; filled: number; grade: string }>();

    // Initialize with all existing rombels
    rombels.forEach((r) => {
      rombelMap.set(r.name, { total: 0, filled: 0, grade: r.grade });
    });

    // Populate with students
    studentUsers.forEach((s) => {
      const rombelName = s.rombel || `Kelas ${s.kelas}`;
      const cur = rombelMap.get(rombelName) || { total: 0, filled: 0, grade: (s.kelas || '10') as string };
      cur.total += 1;
      
      // Check if student has at least one journal entry
      const hasEntry = entries.some(
        (e) => e.studentId === s.id || (s.nisn && e.studentNisn === s.nisn)
      );
      if (hasEntry) {
        cur.filled += 1;
      }
      rombelMap.set(rombelName, cur);
    });

    const result: Array<{
      rombel: string;
      grade: string;
      total: number;
      filled: number;
      percentage: number;
    }> = [];

    rombelMap.forEach((val, key) => {
      if (val.total > 0) {
        result.push({
          rombel: key,
          grade: val.grade,
          total: val.total,
          filled: val.filled,
          percentage: Math.round((val.filled / val.total) * 100),
        });
      }
    });

    // Filter by selected grade
    const filtered = selectedGradeFilter === 'all' 
      ? result 
      : result.filter((r) => r.grade === selectedGradeFilter);

    // Sort descending by percentage
    return filtered.sort((a, b) => b.percentage - a.percentage);
  }, [users, entries, rombels, selectedGradeFilter]);

  // Top 5 recent entries
  const recentEntries = useMemo(() => {
    if (currentUser.role === 'siswa') {
      return [...studentEntries]
        .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
        .slice(0, 5);
    }
    return [...entries]
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
      .slice(0, 6);
  }, [currentUser.role, studentEntries, entries]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. HERO WELCOME BANNER (Modern Clean & Glassmorphism) */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c1836] via-[#10224d] to-[#0f172a] text-white p-6 sm:p-8 shadow-xl border border-blue-900/40">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 rounded-full bg-blue-600/15 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-cyan-300 text-xs font-semibold backdrop-blur-md">
              <Calendar className="w-3.5 h-3.5" />
              <span>{todayFormatted}</span>
              <span className="text-blue-400">•</span>
              <span>TA {academicYear} ({semester})</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Selamat datang kembali, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-amber-300">{currentUser.name}</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {currentUser.role === 'siswa' && (
                <>
                  Pertahankan kebiasaan membaca Anda! Literasi membentuk wawasan, karakter, dan kecerdasan berpikir kritis di {schoolProfile.namaSekolah}.
                </>
              )}
              {currentUser.role === 'guru' && (
                <>
                  Portal Evaluasi & Validasi Literasi Siswa. Pantau pencapaian 4 minggu membaca dan berikan umpan balik konstruktif bagi peserta didik.
                </>
              )}
              {currentUser.role === 'admin' && (
                <>
                  Pusat Kendali Administrasi SI-LITERASI. Pantau repositori pengguna, distribusi rombel, kemajuan literasi sekolah, dan laporan terintegrasi.
                </>
              )}
            </p>
          </div>

          {/* Quick Actions in Banner */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {currentUser.role === 'siswa' ? (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab('input-jurnal')}
                  className="btn-interaction inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-slate-950" />
                  <span>+ Tulis Jurnal Baru</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('jurnal-saya')}
                  className="btn-interaction inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/10 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-cyan-300" />
                  <span>Riwayat Jurnal</span>
                </button>
              </>
            ) : currentUser.role === 'guru' ? (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab('validasi-guru')}
                  className="btn-interaction inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Validasi Jurnal ({schoolStats.pendingValidationCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('leaderboard')}
                  className="btn-interaction inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/10 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Papan Peringkat</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab('upload-admin')}
                  className="btn-interaction inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Kelola Pengguna & Rombel</span>
                </button>
                {onOpenReportModal && (
                  <button
                    type="button"
                    onClick={onOpenReportModal}
                    className="btn-interaction inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/10 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-cyan-300" />
                    <span>Cetak Rapor</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* 2. STATS KPI CARDS GRID */}
      {currentUser.role === 'siswa' ? (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Total Jurnal */}
          <div className="card-modern card-hover p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Jurnal</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {studentStats.totalEntries}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{studentStats.validatedCount} telah dinilai</span>
              </p>
            </div>
          </div>

          {/* Durasi Membaca */}
          <div className="card-modern card-hover p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Waktu Membaca</span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {studentStats.totalHours} <span className="text-lg font-bold text-slate-400">Jam</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Setara {studentStats.totalMinutes} menit membaca
              </p>
            </div>
          </div>

          {/* Rata-rata Skor */}
          <div className="card-modern card-hover p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rata-Rata Nilai</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {studentStats.averageScore > 0 ? studentStats.averageScore : '-'}
                {studentStats.averageScore > 0 && <span className="text-sm font-semibold text-slate-400"> /100</span>}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {studentStats.averageScore >= 85 ? '🌟 Predikat Sangat Baik' : studentStats.averageScore > 0 ? '✨ Predikat Baik' : 'Belum ada penilaian'}
              </p>
            </div>
          </div>

          {/* Status Validasi */}
          <div className="card-modern card-hover p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status Validasi</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {studentStats.validatedCount}
                <span className="text-base font-normal text-slate-400"> / {studentStats.totalEntries}</span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                {studentStats.pendingCount > 0 ? `${studentStats.pendingCount} menunggu guru` : 'Semua telah dinilai'}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Total Siswa */}
          <div className="card-modern card-hover p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Siswa</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {schoolStats.totalStudents}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Terdaftar di {rombels.length} rombel kelas
              </p>
            </div>
          </div>

          {/* Total Jurnal Masuk */}
          <div className="card-modern card-hover p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Jurnal Masuk</span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {schoolStats.totalEntriesCount}
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                {schoolStats.validatedCount} tervalidasi ({Math.round((schoolStats.validatedCount / (schoolStats.totalEntriesCount || 1)) * 100)}%)
              </p>
            </div>
          </div>

          {/* Menunggu Validasi */}
          <div className="card-modern card-hover p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Menunggu Validasi</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {schoolStats.pendingValidationCount}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {schoolStats.pendingValidationCount > 0 ? 'Perlu tindakan review guru' : 'Semua jurnal beres dinilai'}
              </p>
            </div>
          </div>

          {/* Partisipasi Siswa */}
          <div className="card-modern card-hover p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Partisipasi Aktif</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {schoolStats.participationRate}%
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {schoolStats.activeStudentCount} dari {schoolStats.totalStudents} siswa aktif mengisi
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 3. MIDDLE SECTION: PROGRESS 4 MINGGU (SISWA) ATAU PROGRESS PER ROMBEL (GURU/ADMIN) */}
      {currentUser.role === 'siswa' ? (
        <section className="card-modern p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Target Capaian Literasi 4 Minggu</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pastikan Anda menyelesaikan setidaknya 1 catatan jurnal pada setiap minggu jadwal membaca
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('input-jurnal')}
              className="btn-interaction text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Tambah Jurnal Baru</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {studentStats.weeksProgress.map((item) => (
              <div
                key={item.week}
                className={`p-4 rounded-xl border transition-all ${
                  item.completed
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300">
                    Minggu ke-{item.week}
                  </span>
                  {item.completed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Selesai</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      Belum Diisi
                    </span>
                  )}
                </div>

                {item.entry ? (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {item.entry.bookTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>{item.entry.date}</span>
                      {item.entry.teacherValidation ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          Nilai: {item.entry.totalFinalScore ?? item.entry.teacherValidation.validationScore}/100
                        </span>
                      ) : (
                        <span className="text-amber-500 font-medium">Menunggu Nilai</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Belum ada jurnal untuk minggu ini.
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="card-modern p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Monitoring Pengisian Jurnal per Rombel</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Persentase keaktifan siswa yang telah mengisi jurnal literasi berdasarkan rombel
              </p>
            </div>

            {/* Filter Jenjang Kelas */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 self-start sm:self-auto">
              {(['all', '10', '11', '12'] as const).map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSelectedGradeFilter(grade)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedGradeFilter === grade
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {grade === 'all' ? 'Semua' : `Kelas ${grade}`}
                </button>
              ))}
            </div>
          </div>

          {/* Rombel Bars List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rombelProgressList.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                Tidak ada data rombel untuk filter yang dipilih.
              </div>
            ) : (
              rombelProgressList.slice(0, 9).map((r) => (
                <div
                  key={r.rombel}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                      {r.rombel}
                    </span>
                    <span className="text-xs font-black text-blue-700 dark:text-cyan-400 tabular-nums">
                      {r.percentage}%
                    </span>
                  </div>

                  {/* Progress track */}
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        r.percentage >= 80
                          ? 'bg-emerald-500'
                          : r.percentage >= 50
                          ? 'bg-blue-600'
                          : r.percentage >= 25
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${r.percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{r.filled} dari {r.total} siswa aktif</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Kelas {r.grade}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* 4. RECENT ACTIVITY & LITERACY TIPS / QUICK ACTION SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Recent Journals */}
        <section className="lg:col-span-2 card-modern p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>{currentUser.role === 'siswa' ? 'Jurnal Membaca Terakhir' : 'Aktivitas Jurnal Masuk Terbaru'}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentUser.role === 'siswa'
                  ? 'Catatan dan riwayat buku yang baru saja Anda baca'
                  : 'Daftar jurnal yang baru saja dikirim oleh siswa'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (currentUser.role === 'siswa') onNavigateTab('jurnal-saya');
                else onNavigateTab('validasi-guru');
              }}
              className="btn-interaction text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentEntries.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <Bookmark className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                <p className="text-xs font-semibold">Belum ada jurnal membaca</p>
                {currentUser.role === 'siswa' && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('input-jurnal')}
                    className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    + Tulis Jurnal Pertama Anda
                  </button>
                )}
              </div>
            ) : (
              recentEntries.map((entry) => {
                const score = entry.totalFinalScore ?? entry.teacherValidation?.validationScore;
                return (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-900/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                          {entry.readingCategory || entry.literacyType}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Minggu ke-{entry.weekNumber} • {entry.date}
                        </span>
                        {currentUser.role !== 'siswa' && (
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            oleh <strong className="text-blue-600 dark:text-cyan-400">{entry.studentName}</strong> ({entry.studentKelas || entry.studentRombel || 'Siswa'})
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 truncate">
                        {entry.bookTitle}
                      </h4>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {entry.summary || 'Tidak ada ringkasan'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      {score !== undefined ? (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Star className="w-3 h-3 fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400" />
                            <span>{score}/100</span>
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Menunggu Review
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (currentUser.role === 'siswa') onNavigateTab('jurnal-saya');
                          else onNavigateTab('validasi-guru');
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Buka detail"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column (1 Col): Literasi Quick Guide & Institutional Info */}
        <div className="space-y-6">
          {/* Institutional Info Card */}
          <section className="card-modern p-5 space-y-3.5 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                <ShieldCheck className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Institusi Pengelola
                </h3>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {schoolProfile.namaSekolah}
                </h4>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Kepala Sekolah:</span>
                <span className="font-bold text-slate-900 dark:text-white text-right">{schoolProfile.namaKepalaSekolah}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Koordinator Literasi:</span>
                <span className="font-bold text-slate-900 dark:text-white text-right">{schoolProfile.namaKoordinatorLiterasi}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tahun Ajaran:</span>
                <span className="font-bold text-blue-600 dark:text-cyan-400">{academicYear} ({semester})</span>
              </div>
            </div>

            {currentUser.role === 'admin' && onOpenSchoolSettingsModal && (
              <button
                type="button"
                onClick={onOpenSchoolSettingsModal}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Ubah Pengaturan Sekolah
              </button>
            )}
          </section>

          {/* Tips Literasi & Refleksi */}
          <section className="card-modern p-5 space-y-3 bg-gradient-to-br from-amber-500/5 to-cyan-500/5">
            <div className="flex items-center gap-2 text-amber-500">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-wider">
                Panduan Refleksi Literasi
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tuliskan pemahaman orisinal Anda mengenai esensi buku yang telah dibaca. Hindari sekadar menyalin sinopsis buku dari internet. Fokus pada nilai moral, inspirasi tindakan, dan pembelajaran baru yang didapatkan.
            </p>
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Rubrik: 4 Aspek Penilaian Guru</span>
              <span className="font-bold text-blue-600 dark:text-cyan-400">Skor Max 100</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
