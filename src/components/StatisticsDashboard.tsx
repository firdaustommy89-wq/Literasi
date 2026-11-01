import React, { useState, useMemo } from 'react';
import { LiteracyEntry, User, JenjangKelas } from '../types';
import { 
  BookOpen, 
  Award, 
  UserX, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  X, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  ChevronRight, 
  TrendingUp, 
  Sparkles,
  Calendar,
  Users
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { RombelProgressMonitoring } from './RombelProgressMonitoring';

interface StatisticsDashboardProps {
  entries: LiteracyEntry[];
  users: User[];
  variant?: 'guru' | 'admin';
  onFilterGrade?: (grade: string) => void;
  schoolName?: string;
  showRombelProgress?: boolean;
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({
  entries,
  users,
  variant = 'guru',
  onFilterGrade,
  schoolName,
  showRombelProgress = false,
}) => {
  // Current calendar month reference
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1; // 1-12
  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
  
  // Selected month filter (defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  
  // Modal state for students who haven't submitted
  const [showUnsubmittedModal, setShowUnsubmittedModal] = useState<boolean>(false);
  const [modalSearch, setModalSearch] = useState<string>('');
  const [modalGradeFilter, setModalGradeFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Available months from entries + current month
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(currentMonthKey);

    entries.forEach((e) => {
      const d = e.date || e.createdAt;
      if (d && d.length >= 7) {
        const ym = d.substring(0, 7);
        if (/^\d{4}-\d{2}$/.test(ym)) {
          monthSet.add(ym);
        }
      }
    });

    return Array.from(monthSet).sort().reverse();
  }, [entries, currentMonthKey]);

  // Format month key YYYY-MM into Indonesian
  const formatMonthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    const mIdx = parseInt(m, 10) - 1;
    const isCurrent = ym === currentMonthKey;
    const name = MONTH_NAMES_ID[mIdx] || m;
    return `${name} ${y}${isCurrent ? ' (Bulan Ini)' : ''}`;
  };

  // Filter students
  const students = useMemo(() => {
    return users.filter((u) => u.role === 'siswa');
  }, [users]);

  // Entries filtered by selected month
  const monthEntries = useMemo(() => {
    if (selectedMonth === 'all') return entries;
    return entries.filter((e) => {
      const d = e.date || e.createdAt;
      return d ? d.startsWith(selectedMonth) : false;
    });
  }, [entries, selectedMonth]);

  // 1. Total Jurnal Masuk (All-time and selected month)
  const totalEntriesCount = entries.length;
  const monthEntriesCount = monthEntries.length;
  const validatedEntriesCount = entries.filter((e) => !!e.teacherValidation).length;
  const pendingEntriesCount = totalEntriesCount - validatedEntriesCount;

  // 2. Rata-rata Skor Literasi Siswa (Skor Final 0-100)
  const validatedWithScores = entries.filter(
    (e) => e.totalFinalScore !== undefined && e.totalFinalScore !== null
  );
  
  const avgLiteracyScore = useMemo(() => {
    if (validatedWithScores.length === 0) {
      // Fallback: If no validated score yet, check self-reflection
      const withSelf = entries.filter((e) => e.reflection?.totalScore);
      if (withSelf.length === 0) return 0;
      const avgSelf = withSelf.reduce((acc, c) => acc + (c.reflection.totalScore || 0), 0) / withSelf.length;
      return Math.round(avgSelf * 5 * 10) / 10; // scale up to 100 for estimation
    }
    const sum = validatedWithScores.reduce((acc, c) => acc + (c.totalFinalScore || 0), 0);
    return Math.round((sum / validatedWithScores.length) * 10) / 10;
  }, [validatedWithScores, entries]);

  // Average self-reflection score (max 20)
  const avgReflectionScore = useMemo(() => {
    const withReflection = entries.filter((e) => e.reflection?.totalScore);
    if (withReflection.length === 0) return 0;
    const sum = withReflection.reduce((acc, c) => acc + (c.reflection.totalScore || 0), 0);
    return Math.round((sum / withReflection.length) * 10) / 10;
  }, [entries]);

  // 3. Siswa Belum Mengirimkan Jurnal Bulan Ini (atau bulan terpilih)
  const unsubmittedStudents = useMemo(() => {
    // Map entries in selected month to student identifiers
    const submittedStudentIds = new Set<string>();
    const submittedNisns = new Set<string>();
    const submittedNames = new Set<string>();

    monthEntries.forEach((e) => {
      if (e.studentId) submittedStudentIds.add(e.studentId);
      if (e.studentNisn) submittedNisns.add(e.studentNisn);
      if (e.studentName) submittedNames.add(e.studentName.toLowerCase().trim());
    });

    return students.filter((s) => {
      if (submittedStudentIds.has(s.id)) return false;
      if (s.nisn && submittedNisns.has(s.nisn)) return false;
      if (submittedNames.has(s.name.toLowerCase().trim())) return false;
      return true;
    });
  }, [students, monthEntries]);

  // Submitted students in this period
  const submittedStudentsCount = students.length - unsubmittedStudents.length;
  const compliancePercentage = students.length > 0
    ? Math.round((submittedStudentsCount / students.length) * 100)
    : 0;

  // Grade breakdown for unsubmitted students
  const unsubmittedByGrade = useMemo(() => {
    const map: Record<JenjangKelas, number> = { '10': 0, '11': 0, '12': 0 };
    unsubmittedStudents.forEach((s) => {
      if (s.kelas && map[s.kelas] !== undefined) {
        map[s.kelas] += 1;
      }
    });
    return map;
  }, [unsubmittedStudents]);

  // Latest entry date helper for unsubmitted students
  const getLatestEntryForStudent = (student: User) => {
    const studentEntries = entries.filter(
      (e) => e.studentId === student.id || (student.nisn && e.studentNisn === student.nisn)
    );
    if (studentEntries.length === 0) return null;
    // Sort latest first
    studentEntries.sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
    return studentEntries[0];
  };

  // Export unsubmitted students list to Excel
  const handleExportUnsubmitted = () => {
    const exportData = unsubmittedStudents.map((s, idx) => {
      const latest = getLatestEntryForStudent(s);
      return {
        'No': idx + 1,
        'Nama Lengkap Siswa': s.name,
        'NISN': s.nisn || '-',
        'Jenjang Kelas': s.kelas || '-',
        'Rombel': s.rombel || `Kelas ${s.kelas || '-'}`,
        'Status Bulan Ini': `Belum Mengirim (${formatMonthLabel(selectedMonth)})`,
        'Jurnal Terakhir Dikirim': latest ? `${latest.bookTitle} (${latest.date})` : 'Belum pernah mengirim',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Siswa Belum Setor Jurnal');
    XLSX.writeFile(wb, `Siswa_Belum_Kirim_Jurnal_${selectedMonth}.xlsx`);
  };

  // Copy WhatsApp reminder text
  const handleCopyReminder = (student: User) => {
    const monthText = formatMonthLabel(selectedMonth).replace(' (Bulan Ini)', '');
    const message = `Halo ${student.name} (${student.rombel || 'Siswa SMAN 2 Samarinda'}), mengingatkan untuk mengisi Jurnal Literasi sekolah periode ${monthText} ya. Silakan login ke aplikasi SI-LITERASI dan kumpulkan catatan bacamu. Terima kasih! 📚✨`;
    
    navigator.clipboard.writeText(message);
    setCopiedId(student.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtered list for the modal
  const filteredModalStudents = useMemo(() => {
    return unsubmittedStudents.filter((s) => {
      if (modalGradeFilter !== 'all' && s.kelas !== modalGradeFilter) return false;
      if (modalSearch.trim()) {
        const q = modalSearch.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchNisn = s.nisn?.toLowerCase().includes(q);
        const matchRombel = s.rombel?.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchRombel) return false;
      }
      return true;
    });
  }, [unsubmittedStudents, modalGradeFilter, modalSearch]);

  // Score evaluation badge
  const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: 'Sangat Baik (Predikat A)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (score >= 75) return { label: 'Baik (Predikat B)', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (score >= 60) return { label: 'Cukup (Predikat C)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: 'Perlu Bimbingan', color: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  const scoreBadge = getScoreBadge(avgLiteracyScore);

  return (
    <div className="mb-8 space-y-4">
      {/* Top Header & Period Selector */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-blue-100 dark:border-slate-800 shadow-xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-800 text-amber-300 flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Ringkasan Statistik Literasi Siswa
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                variant === 'admin' 
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-blue-950 dark:text-amber-300 border-amber-300 dark:border-amber-700' 
                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-700'
              }`}>
                {variant === 'admin' ? 'Dashboard Admin' : 'Dashboard Guru'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pantau progres partisipasi, skor literasi, dan kepatuhan pengiriman jurnal secara real-time.
            </p>
          </div>
        </div>

        {/* Filter Period / Month */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-1.5 shrink-0" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden md:inline">Periode:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer shadow-2xs"
          >
            {availableMonths.map((ym) => (
              <option key={ym} value={ym}>
                {formatMonthLabel(ym)}
              </option>
            ))}
            <option value="all">Semua Periode (Akumulatif)</option>
          </select>
        </div>
      </div>

      {/* 3 Main Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ======================================================== */}
        {/* CARD 1: JUMLAH TOTAL JURNAL MASUK */}
        {/* ======================================================== */}
        <div className="bg-gradient-to-b from-white dark:from-[#131d33] to-blue-50/20 dark:to-blue-950/20 rounded-2xl p-5 border border-blue-100 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Total Jurnal Masuk
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {selectedMonth === 'all' ? 'Semua Waktu' : formatMonthLabel(selectedMonth).split(' ')[0]}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight font-mono tabular-nums">
                {totalEntriesCount}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">entri jurnal</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {selectedMonth !== 'all' ? (
                <>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold font-mono tabular-nums">{monthEntriesCount} entri</strong> masuk pada periode {formatMonthLabel(selectedMonth).split(' ')[0]}.
                </>
              ) : (
                'Total kumulatif seluruh jurnal yang tersimpan di sistem.'
              )}
            </p>
          </div>

          {/* Sub Metrics */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-blue-50/90 dark:bg-blue-950/40 rounded-xl p-2 border border-blue-100 dark:border-blue-900">
              <div className="text-[10px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                Tervalidasi
              </div>
              <div className="text-base font-black text-blue-800 dark:text-blue-300 mt-0.5 font-mono tabular-nums">
                {validatedEntriesCount}
              </div>
            </div>

            <div className="bg-amber-50/90 dark:bg-amber-950/40 rounded-xl p-2 border border-amber-200 dark:border-amber-900">
              <div className="text-[10px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                Menunggu
              </div>
              <div className="text-base font-black text-amber-800 dark:text-amber-300 mt-0.5 font-mono tabular-nums">
                {pendingEntriesCount}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CARD 2: RATA-RATA SKOR LITERASI SISWA */}
        {/* ======================================================== */}
        <div className="bg-gradient-to-b from-white dark:from-[#131d33] to-amber-50/20 dark:to-amber-950/20 rounded-2xl p-5 border border-amber-200/80 dark:border-slate-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                Rata-rata Skor Literasi
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${scoreBadge.color}`}>
                {scoreBadge.label}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-blue-900 dark:text-blue-300 tracking-tight font-mono tabular-nums">
                {avgLiteracyScore}
              </span>
              <span className="text-xs font-bold text-slate-400">Poin</span>
            </div>

            {/* Score progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-gradient-to-r from-blue-600 via-amber-400 to-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, avgLiteracyScore))}%` }}
              ></div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Rata-rata dinilai berdasarkan refleksi baca dan hasil validasi guru.
            </p>
          </div>

          {/* Sub Metrics */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-amber-50/90 dark:bg-amber-950/40 rounded-xl p-2 border border-amber-200 dark:border-amber-900">
              <div className="text-[10px] font-bold text-amber-900 dark:text-amber-300">Refleksi Mandiri</div>
              <div className="text-base font-black text-amber-800 dark:text-amber-300 mt-0.5 font-mono tabular-nums">
                {avgReflectionScore} <span className="text-[10px] font-normal text-slate-500">Poin</span>
              </div>
            </div>

            <div className="bg-blue-50/90 dark:bg-blue-950/40 rounded-xl p-2 border border-blue-200 dark:border-blue-900">
              <div className="text-[10px] font-bold text-blue-900 dark:text-blue-300">Jurnal Ternilai</div>
              <div className="text-base font-black text-blue-800 dark:text-blue-300 mt-0.5 font-mono tabular-nums">
                {validatedWithScores.length} <span className="text-[10px] font-normal text-slate-500">entri</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CARD 3: JUMLAH SISWA BELUM MENGIRIMKAN JURNAL BULAN INI */}
        {/* ======================================================== */}
        <div className={`rounded-2xl p-5 border shadow-xs transition-all flex flex-col justify-between ${
          unsubmittedStudents.length > 0
            ? 'bg-gradient-to-b from-rose-50/40 dark:from-[#1e131d] via-white dark:via-[#131d33] to-amber-50/30 dark:to-slate-900 border-rose-200 dark:border-rose-900/60 hover:border-rose-300'
            : 'bg-gradient-to-b from-emerald-50/40 dark:from-[#0d1f1d] via-white dark:via-[#131d33] to-emerald-50/20 dark:to-slate-900 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-300'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <UserX className={`w-4 h-4 ${unsubmittedStudents.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                Belum Kirim Jurnal
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                unsubmittedStudents.length > 0
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              }`}>
                {selectedMonth === currentMonthKey ? 'Bulan Ini' : formatMonthLabel(selectedMonth).split(' ')[0]}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className={`text-3xl sm:text-4xl font-black tracking-tight font-mono tabular-nums ${
                unsubmittedStudents.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {unsubmittedStudents.length}
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                dari <span className="font-mono tabular-nums">{students.length}</span> Siswa (<span className="font-mono tabular-nums">{100 - compliancePercentage}%</span>)
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {unsubmittedStudents.length > 0 ? (
                <>
                  <strong className="text-rose-700 dark:text-rose-400 font-bold">{submittedStudentsCount} siswa ({compliancePercentage}%)</strong> sudah mengirimkan jurnal periode ini.
                </>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Luar biasa! Seluruh {students.length} siswa telah mengirim jurnal.
                </span>
              )}
            </p>
          </div>

          {/* Interactive Button */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowUnsubmittedModal(true)}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs ${
                unsubmittedStudents.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                  : 'bg-slate-800 hover:bg-slate-900 text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Lihat Rincian {unsubmittedStudents.length} Siswa Belum Setor</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grade Participation Quick Strip */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Rincian Siswa Belum Setor per Jenjang:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(['10', '11', '12'] as JenjangKelas[]).map((grade) => {
            const count = unsubmittedByGrade[grade];
            const totalInGrade = students.filter((s) => s.kelas === grade).length;
            return (
              <button
                key={grade}
                onClick={() => {
                  setModalGradeFilter(grade);
                  setShowUnsubmittedModal(true);
                  if (onFilterGrade) onFilterGrade(grade);
                }}
                className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  count > 0 
                    ? 'bg-white hover:bg-rose-50 text-slate-800 border-slate-200 hover:border-rose-200' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                <span>Kelas {grade}:</span>
                <span className={`px-1.5 py-0.2 rounded text-[11px] font-black ${
                  count > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {count} belum
                </span>
                <span className="text-[10px] text-slate-400 font-normal">/ {totalInGrade} siswa</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* VISUALISASI BAR KEMAJUAN (PROGRESS BAR) PER ROMBEL / KELAS */}
      {/* ======================================================== */}
      {showRombelProgress && (
        <RombelProgressMonitoring
          users={users}
          entries={entries}
          selectedMonth={selectedMonth}
          formatMonthLabel={formatMonthLabel}
          schoolName={schoolName}
          onFilterRombelInTable={onFilterGrade}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: DAFTAR SISWA BELUM MENGIRIM JURNAL BULAN INI */}
      {/* ======================================================== */}
      {showUnsubmittedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-800 dark:text-slate-100">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-gradient-to-r from-slate-50 to-rose-50/30 dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Siswa Belum Mengirimkan Jurnal
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Periode: <strong className="text-slate-800 dark:text-slate-200">{formatMonthLabel(selectedMonth)}</strong> • Total: <strong className="text-rose-600 dark:text-rose-400 font-bold">{unsubmittedStudents.length} siswa</strong> belum mengumpulkan jurnal.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowUnsubmittedModal(false)}
                className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Cari nama siswa, NISN, atau rombel..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none"
                  />
                </div>

                {/* Grade filter */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                  <button
                    onClick={() => setModalGradeFilter('all')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      modalGradeFilter === 'all'
                        ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-black'
                        : 'hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Semua ({unsubmittedStudents.length})
                  </button>
                  {(['10', '11', '12'] as JenjangKelas[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setModalGradeFilter(g)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        modalGradeFilter === g
                          ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-black'
                          : 'hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Kls {g} ({unsubmittedByGrade[g]})
                    </button>
                  ))}
                </div>

                {/* Export button */}
                <button
                  onClick={handleExportUnsubmitted}
                  disabled={unsubmittedStudents.length === 0}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Unduh Excel</span>
                </button>
              </div>
            </div>

            {/* List Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
              {filteredModalStudents.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Tidak ada siswa yang sesuai filter
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    {unsubmittedStudents.length === 0
                      ? 'Semua siswa telah mengumpulkan jurnal untuk periode ini.'
                      : 'Coba ubah kata kunci pencarian atau filter kelas.'}
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-3">Kelas & Rombel</th>
                        <th className="py-3 px-3 hidden sm:table-cell">Jurnal Terakhir</th>
                        <th className="py-3 px-4 text-right">Aksi Tindak Lanjut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredModalStudents.map((s) => {
                        const latest = getLatestEntryForStudent(s);
                        const isCopied = copiedId === s.id;

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {s.avatar ? (
                                  <img
                                    src={s.avatar}
                                    alt={s.name}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-black flex items-center justify-center text-xs">
                                    {s.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-slate-100">{s.name}</div>
                                  <div className="text-[11px] text-slate-400">
                                    NISN: {s.nisn || '-'} • @{s.username}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span className="inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {s.rombel || `Kelas ${s.kelas || '-'}`}
                              </span>
                            </td>

                            <td className="py-3 px-3 hidden sm:table-cell text-slate-500 dark:text-slate-400 text-[11px]">
                              {latest ? (
                                <div>
                                  <div className="font-medium text-slate-700 dark:text-slate-300 line-clamp-1">
                                    {latest.bookTitle}
                                  </div>
                                  <div className="text-slate-400 text-[10px]">
                                    {latest.date}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 italic">Belum pernah kirim</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleCopyReminder(s)}
                                title="Salin pesan pengingat WA"
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                                  isCopied
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800'
                                }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Tersalin!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Salin Chat Pengingat</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Menampilkan <strong>{filteredModalStudents.length}</strong> dari {unsubmittedStudents.length} siswa belum setor
              </span>
              <button
                onClick={() => setShowUnsubmittedModal(false)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
