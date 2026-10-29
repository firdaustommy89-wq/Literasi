import React, { useState, useMemo } from 'react';
import { User, LiteracyEntry, JenjangKelas } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronRight, 
  Copy, 
  Check, 
  X, 
  FileSpreadsheet, 
  Sparkles, 
  BookOpen, 
  Clock, 
  LayoutGrid, 
  List,
  GraduationCap,
  Calendar,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface RombelProgressStat {
  rombel: string;
  grade: JenjangKelas | 'Lainnya';
  totalStudents: number;
  submittedStudentsCount: number;
  unsubmittedStudentsCount: number;
  percentage: number;
  totalEntriesCount: number;
  studentsSubmitted: User[];
  studentsUnsubmitted: User[];
}

interface RombelProgressMonitoringProps {
  users: User[];
  entries: LiteracyEntry[];
  selectedMonth?: string; // e.g. '2026-10' or 'all'
  formatMonthLabel?: (ym: string) => string;
  schoolName?: string;
  onFilterRombelInTable?: (rombel: string) => void;
}

export const RombelProgressMonitoring: React.FC<RombelProgressMonitoringProps> = ({
  users,
  entries,
  selectedMonth = 'all',
  formatMonthLabel,
  schoolName = 'SMAN 1 SUNGAY RUMBAI',
  onFilterRombelInTable,
}) => {
  // Filter & search states
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'optimal' | 'moderate' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'lowest' | 'highest' | 'name' | 'students'>('lowest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Detail Modal State
  const [activeRombelDetail, setActiveRombelDetail] = useState<RombelProgressStat | null>(null);
  const [detailTab, setDetailTab] = useState<'unsubmitted' | 'submitted'>('unsubmitted');
  const [detailSearch, setDetailSearch] = useState<string>('');
  const [copiedRombelMsg, setCopiedRombelMsg] = useState<boolean>(false);
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  // Filter students (only role === 'siswa')
  const students = useMemo(() => {
    return users.filter((u) => u.role === 'siswa');
  }, [users]);

  // Entries for the chosen period
  const periodEntries = useMemo(() => {
    if (!selectedMonth || selectedMonth === 'all') return entries;
    return entries.filter((e) => {
      const d = e.date || e.createdAt;
      return d ? d.startsWith(selectedMonth) : false;
    });
  }, [entries, selectedMonth]);

  // Set of identifiers for students who submitted at least 1 entry in the period
  const submittedStudentMap = useMemo(() => {
    const ids = new Set<string>();
    const nisns = new Set<string>();
    const names = new Set<string>();
    const entriesByStudentId = new Map<string, LiteracyEntry[]>();

    periodEntries.forEach((e) => {
      if (e.studentId) {
        ids.add(e.studentId);
        const list = entriesByStudentId.get(e.studentId) || [];
        list.push(e);
        entriesByStudentId.set(e.studentId, list);
      }
      if (e.studentNisn) {
        nisns.add(e.studentNisn);
      }
      if (e.studentName) {
        names.add(e.studentName.toLowerCase().trim());
      }
    });

    return { ids, nisns, names, entriesByStudentId };
  }, [periodEntries]);

  // Calculate statistics grouped by Rombel
  const allRombelStats = useMemo(() => {
    const rombelMap = new Map<string, {
      grade: JenjangKelas | 'Lainnya';
      students: User[];
    }>();

    // Group all active students into rombels
    students.forEach((s) => {
      const rombelKey = (s.rombel || `Kelas ${s.kelas || '10'}`).trim();
      if (!rombelMap.has(rombelKey)) {
        rombelMap.set(rombelKey, {
          grade: (s.kelas as JenjangKelas) || '10',
          students: [],
        });
      }
      rombelMap.get(rombelKey)!.students.push(s);
    });

    const statsList: RombelProgressStat[] = [];

    rombelMap.forEach((val, rombelName) => {
      const submitted: User[] = [];
      const unsubmitted: User[] = [];

      val.students.forEach((student) => {
        const hasId = submittedStudentMap.ids.has(student.id);
        const hasNisn = student.nisn && submittedStudentMap.nisns.has(student.nisn);
        const hasName = submittedStudentMap.names.has(student.name.toLowerCase().trim());

        if (hasId || hasNisn || hasName) {
          submitted.push(student);
        } else {
          unsubmitted.push(student);
        }
      });

      // Total entries submitted by students belonging to this rombel
      let totalEntriesCount = 0;
      val.students.forEach((s) => {
        const studentEntries = submittedStudentMap.entriesByStudentId.get(s.id);
        if (studentEntries) {
          totalEntriesCount += studentEntries.length;
        }
      });

      const totalStudents = val.students.length;
      const submittedStudentsCount = submitted.length;
      const unsubmittedStudentsCount = unsubmitted.length;
      const percentage = totalStudents > 0 ? Math.round((submittedStudentsCount / totalStudents) * 100) : 0;

      statsList.push({
        rombel: rombelName,
        grade: val.grade,
        totalStudents,
        submittedStudentsCount,
        unsubmittedStudentsCount,
        percentage,
        totalEntriesCount,
        studentsSubmitted: submitted,
        studentsUnsubmitted: unsubmitted,
      });
    });

    return statsList;
  }, [students, submittedStudentMap]);

  // Overall and Grade Macro Statistics
  const macroStats = useMemo(() => {
    const totalStudentsAll = students.length;
    let submittedStudentsAll = 0;

    students.forEach((s) => {
      if (
        submittedStudentMap.ids.has(s.id) ||
        (s.nisn && submittedStudentMap.nisns.has(s.nisn)) ||
        submittedStudentMap.names.has(s.name.toLowerCase().trim())
      ) {
        submittedStudentsAll++;
      }
    });

    const overallPercentage = totalStudentsAll > 0 ? Math.round((submittedStudentsAll / totalStudentsAll) * 100) : 0;

    // Grade specific
    const gradeBreakdown: Record<JenjangKelas, { total: number; submitted: number; percentage: number; rombelCount: number }> = {
      '10': { total: 0, submitted: 0, percentage: 0, rombelCount: 0 },
      '11': { total: 0, submitted: 0, percentage: 0, rombelCount: 0 },
      '12': { total: 0, submitted: 0, percentage: 0, rombelCount: 0 },
    };

    allRombelStats.forEach((r) => {
      if (r.grade === '10' || r.grade === '11' || r.grade === '12') {
        gradeBreakdown[r.grade].total += r.totalStudents;
        gradeBreakdown[r.grade].submitted += r.submittedStudentsCount;
        gradeBreakdown[r.grade].rombelCount += 1;
      }
    });

    (['10', '11', '12'] as JenjangKelas[]).forEach((g) => {
      const item = gradeBreakdown[g];
      item.percentage = item.total > 0 ? Math.round((item.submitted / item.total) * 100) : 0;
    });

    return {
      totalStudentsAll,
      submittedStudentsAll,
      unsubmittedStudentsAll: totalStudentsAll - submittedStudentsAll,
      overallPercentage,
      gradeBreakdown,
      totalRombel: allRombelStats.length,
    };
  }, [students, submittedStudentMap, allRombelStats]);

  // Filtered & Sorted Rombel List
  const filteredRombels = useMemo(() => {
    return allRombelStats
      .filter((item) => {
        // Grade filter
        if (gradeFilter !== 'all' && item.grade !== gradeFilter) return false;

        // Status filter
        if (statusFilter === 'complete' && item.percentage < 100) return false;
        if (statusFilter === 'optimal' && (item.percentage < 75 || item.percentage >= 100)) return false;
        if (statusFilter === 'moderate' && (item.percentage < 50 || item.percentage >= 75)) return false;
        if (statusFilter === 'low' && item.percentage >= 50) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchRombel = item.rombel.toLowerCase().includes(q);
          const matchGrade = item.grade.toLowerCase().includes(q);
          if (!matchRombel && !matchGrade) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'lowest') {
          // Lowest percentage first (prioritize low compliance)
          if (a.percentage !== b.percentage) return a.percentage - b.percentage;
          return a.rombel.localeCompare(b.rombel);
        }
        if (sortBy === 'highest') {
          if (a.percentage !== b.percentage) return b.percentage - a.percentage;
          return a.rombel.localeCompare(b.rombel);
        }
        if (sortBy === 'name') {
          return a.rombel.localeCompare(b.rombel, undefined, { numeric: true, sensitivity: 'base' });
        }
        if (sortBy === 'students') {
          return b.totalStudents - a.totalStudents;
        }
        return 0;
      });
  }, [allRombelStats, gradeFilter, statusFilter, searchQuery, sortBy]);

  // Helper colors and badges based on percentage
  const getProgressVisuals = (pct: number) => {
    if (pct >= 100) {
      return {
        label: 'Tuntas 100%',
        badgeClass: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
        barGradient: 'from-emerald-500 via-teal-500 to-emerald-600',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        trackClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900',
        icon: CheckCircle2,
      };
    }
    if (pct >= 75) {
      return {
        label: 'Optimal',
        badgeClass: 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
        barGradient: 'from-blue-600 via-indigo-500 to-blue-700',
        textClass: 'text-blue-600 dark:text-blue-400',
        trackClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900',
        icon: Sparkles,
      };
    }
    if (pct >= 50) {
      return {
        label: 'Sedang',
        badgeClass: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        barGradient: 'from-amber-400 via-yellow-500 to-amber-600',
        textClass: 'text-amber-600 dark:text-amber-400',
        trackClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900',
        icon: Clock,
      };
    }
    return {
      label: 'Perlu Perhatian',
      badgeClass: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700',
      barGradient: 'from-rose-500 via-red-500 to-rose-700',
      textClass: 'text-rose-600 dark:text-rose-400',
      trackClass: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900',
      icon: AlertTriangle,
    };
  };

  // Export Rombel Progress Table to Excel
  const handleExportAllRombelStats = () => {
    const periodLabel = formatMonthLabel ? formatMonthLabel(selectedMonth) : selectedMonth;
    const exportData = filteredRombels.map((r, idx) => ({
      'No': idx + 1,
      'Nama Rombel': r.rombel,
      'Jenjang Kelas': r.grade,
      'Total Siswa': r.totalStudents,
      'Siswa Sudah Mengisi': r.submittedStudentsCount,
      'Siswa Belum Mengisi': r.unsubmittedStudentsCount,
      'Persentase Kepatuhan (%)': `${r.percentage}%`,
      'Status Kepatuhan': getProgressVisuals(r.percentage).label,
      'Total Jurnal Dikumpulkan': r.totalEntriesCount,
      'Periode Monitoring': periodLabel,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monitoring Rombel Literasi');
    XLSX.writeFile(wb, `Monitoring_Progress_Literasi_Rombel_${selectedMonth}.xlsx`);
  };

  // Export specific rombel student detail
  const handleExportRombelDetail = (rombelStat: RombelProgressStat) => {
    const periodLabel = formatMonthLabel ? formatMonthLabel(selectedMonth) : selectedMonth;

    const unsubmittedRows = rombelStat.studentsUnsubmitted.map((s, idx) => ({
      'No': idx + 1,
      'Nama Siswa': s.name,
      'NISN': s.nisn || '-',
      'Username': s.username,
      'Rombel': rombelStat.rombel,
      'Status': 'BELUM MENGISI',
      'Periode': periodLabel,
    }));

    const submittedRows = rombelStat.studentsSubmitted.map((s, idx) => {
      const studentEntries = submittedStudentMap.entriesByStudentId.get(s.id) || [];
      const latest = studentEntries[0];
      return {
        'No': idx + 1,
        'Nama Siswa': s.name,
        'NISN': s.nisn || '-',
        'Username': s.username,
        'Rombel': rombelStat.rombel,
        'Status': 'SUDAH MENGISI',
        'Jumlah Jurnal': studentEntries.length,
        'Judul Terakhir': latest ? latest.bookTitle : '-',
        'Periode': periodLabel,
      };
    });

    const wb = XLSX.utils.book_new();
    if (unsubmittedRows.length > 0) {
      const wsUnsub = XLSX.utils.json_to_sheet(unsubmittedRows);
      XLSX.utils.book_append_sheet(wb, wsUnsub, 'Belum Mengisi');
    }
    if (submittedRows.length > 0) {
      const wsSub = XLSX.utils.json_to_sheet(submittedRows);
      XLSX.utils.book_append_sheet(wb, wsSub, 'Sudah Mengisi');
    }

    const safeName = rombelStat.rombel.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `Rincian_Siswa_${safeName}_${selectedMonth}.xlsx`);
  };

  // Generate polite WhatsApp announcement for class unsubmitted students
  const handleCopyRombelReminder = (rombelStat: RombelProgressStat) => {
    const periodLabel = formatMonthLabel 
      ? formatMonthLabel(selectedMonth).replace(' (Bulan Ini)', '') 
      : selectedMonth;

    const unsubmittedList = rombelStat.studentsUnsubmitted
      .map((s, i) => `${i + 1}. ${s.name} ${s.nisn ? `(NISN: ${s.nisn})` : ''}`)
      .join('\n');

    const message = `*PEMBERITAHUAN MONITORING JURNAL LITERASI*\n${schoolName}\n\n` +
      `*Rombel:* ${rombelStat.rombel}\n` +
      `*Periode:* ${periodLabel}\n` +
      `*Progres Pengisian:* ${rombelStat.submittedStudentsCount} dari ${rombelStat.totalStudents} siswa (${rombelStat.percentage}%)\n\n` +
      `Halo rekan-rekan siswa kelas ${rombelStat.rombel},\n` +
      `Berikut daftar ${rombelStat.unsubmittedStudentsCount} siswa yang *belum mengumpulkan jurnal literasi* periode ${periodLabel}:\n\n` +
      `${unsubmittedList}\n\n` +
      `Mohon segera login ke aplikasi SI-LITERASI dan melengkapi jurnal bacaan serta refleksi karakter mandiri. Terima kasih atas kerja sama dan kedisiplinannya! 📚✨`;

    navigator.clipboard.writeText(message);
    setCopiedRombelMsg(true);
    setTimeout(() => setCopiedRombelMsg(false), 2500);
  };

  // Individual copy student reminder
  const handleCopySingleStudentReminder = (student: User, rombelName: string) => {
    const periodLabel = formatMonthLabel 
      ? formatMonthLabel(selectedMonth).replace(' (Bulan Ini)', '') 
      : selectedMonth;

    const message = `Halo ${student.name} (${rombelName}), mengingatkan untuk segera mengisi Jurnal Literasi sekolah periode ${periodLabel} ya. Buka aplikasi SI-LITERASI dan kumpulkan catatan bacamu. Terima kasih! 📚✨`;

    navigator.clipboard.writeText(message);
    setCopiedStudentId(student.id);
    setTimeout(() => setCopiedStudentId(null), 2500);
  };

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl sm:rounded-3xl border border-blue-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 transition-colors">
      {/* ======================================================== */}
      {/* 1. SECTION HEADER & QUICK METRICS */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <BarChart3 className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Monitoring Progres Pengisian Jurnal per Rombel / Kelas
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                Visualisasi Bar Kemajuan
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pantau persentase kepatuhan dan jumlah siswa yang telah mengisi jurnal literasi pada setiap rombel untuk mempermudah monitoring wali kelas dan pengawas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          <button
            type="button"
            onClick={handleExportAllRombelStats}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            title="Unduh seluruh data monitoring rombel ke Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Data Rombel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MACRO OVERVIEW & GRADE PROGRESS STRIPS */}
      {/* ======================================================== */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Total Overall Progress Card */}
        <div className="lg:col-span-1 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-950 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                Seluruh Sekolah
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-400 text-blue-950">
                {macroStats.totalRombel} Rombel
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono tabular-nums text-white">
                {macroStats.overallPercentage}%
              </span>
              <span className="text-xs font-semibold text-blue-200">Partisipasi Siswa</span>
            </div>

            <p className="text-xs text-blue-100/90 mt-1 font-medium">
              <strong className="text-white font-mono tabular-nums">{macroStats.submittedStudentsAll}</strong> dari {macroStats.totalStudentsAll} siswa sudah mengumpulkan jurnal.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            {/* Overall Progress Bar */}
            <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-amber-300 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-xs"
                style={{ width: `${Math.min(100, Math.max(0, macroStats.overallPercentage))}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-blue-200/80 mt-1.5 font-mono">
              <span>0%</span>
              <span className="text-amber-300 font-bold">{macroStats.unsubmittedStudentsAll} Siswa Belum Setor</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Grade 10, 11, 12 Mini Progress Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['10', '11', '12'] as JenjangKelas[]).map((grade) => {
            const gStat = macroStats.gradeBreakdown[grade];
            const visuals = getProgressVisuals(gStat.percentage);
            const isFilterActive = gradeFilter === grade;

            return (
              <button
                key={grade}
                type="button"
                onClick={() => setGradeFilter(isFilterActive ? 'all' : grade)}
                className={`text-left rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                  isFilterActive
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 ring-2 ring-blue-400/30'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Kelas {grade}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${visuals.badgeClass}`}>
                      {gStat.percentage}%
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 mt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Siswa Sudah Mengisi:
                    </span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono tabular-nums">
                      {gStat.submitted} / {gStat.total}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden mt-2.5">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${visuals.barGradient} transition-all duration-700 ease-out`}
                      style={{ width: `${Math.min(100, Math.max(0, gStat.percentage))}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    {gStat.rombelCount} Rombel
                  </span>
                  <span className={`font-bold ${isFilterActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                    {isFilterActive ? 'Aktif Terfilter ✓' : 'Klik Filter'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. CONTROLS, SEARCH, AND FILTERS */}
      {/* ======================================================== */}
      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Grade Tab Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 hidden sm:inline">
              Filter Jenjang:
            </span>
            <button
              type="button"
              onClick={() => setGradeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                gradeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Semua Jenjang ({allRombelStats.length} Rombel)
            </button>
            {(['10', '11', '12'] as JenjangKelas[]).map((g) => {
              const count = allRombelStats.filter((r) => r.grade === g).length;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGradeFilter(g)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    gradeFilter === g
                      ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Kelas {g} ({count})
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Tampilan Kartu Grid"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Tampilan Baris Rapat / List"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List Rapat</span>
            </button>
          </div>
        </div>

        {/* Search, Status Filter, and Sort Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama rombel (mis. X MIPA 1)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Semua Status Kepatuhan</option>
                <option value="complete">Tuntas (100%)</option>
                <option value="optimal">Optimal (75% - 99%)</option>
                <option value="moderate">Sedang (50% - 74%)</option>
                <option value="low">Perlu Perhatian (&lt; 50%)</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="lowest">Prioritas: % Terendah Dulu</option>
                <option value="highest">% Tertinggi Dulu</option>
                <option value="name">Nama Rombel (A - Z)</option>
                <option value="students">Jumlah Siswa Terbanyak</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MAIN PROGRESS BAR VISUALIZATION: GRID OR LIST VIEW */}
      {/* ======================================================== */}
      <div className="mt-5">
        {filteredRombels.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Tidak Ada Rombel yang Sesuai Filter
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Coba atur ulang kata kunci pencarian atau ubah filter jenjang kelas dan status kepatuhan.
            </p>
            <button
              type="button"
              onClick={() => {
                setGradeFilter('all');
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="mt-3 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRombels.map((item) => {
              const visuals = getProgressVisuals(item.percentage);
              const IconComponent = visuals.icon;

              return (
                <div
                  key={item.rombel}
                  className="bg-white dark:bg-[#131d33] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Rombel Name & Status Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.rombel}
                          </h4>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Kelas {item.grade}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Total: <strong className="text-slate-700 dark:text-slate-300 font-bold">{item.totalStudents} Siswa</strong>
                        </p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1 shrink-0 ${visuals.badgeClass}`}>
                        <IconComponent className="w-3 h-3" />
                        <span>{visuals.label}</span>
                      </span>
                    </div>

                    {/* Percentage Display */}
                    <div className="flex items-baseline justify-between gap-2 my-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100">
                          {item.percentage}%
                        </span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          kepatuhan
                        </span>
                      </div>

                      <div className="text-right text-xs font-bold">
                        <span className="text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                          {item.submittedStudentsCount}
                        </span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-slate-500 font-mono tabular-nums">
                          {item.totalStudents} Siswa
                        </span>
                      </div>
                    </div>

                    {/* The Visual Progress Bar */}
                    <div className="relative mt-2">
                      <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${visuals.barGradient} transition-all duration-700 ease-out shadow-xs`}
                          style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                        />
                      </div>

                      {/* Milestone tick marks at 25%, 50%, 75% */}
                      <div className="absolute inset-0 pointer-events-none flex justify-between px-1.5">
                        <div className="w-0.5 h-3.5 bg-white/40 dark:bg-black/30" style={{ marginLeft: '25%' }} />
                        <div className="w-0.5 h-3.5 bg-white/40 dark:bg-black/30" style={{ marginLeft: '25%' }} />
                        <div className="w-0.5 h-3.5 bg-white/40 dark:bg-black/30" style={{ marginLeft: '25%' }} />
                      </div>
                    </div>

                    {/* Summary row under bar */}
                    <div className="flex items-center justify-between gap-2 mt-2.5 text-[11px]">
                      {item.unsubmittedStudentsCount > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>{item.unsubmittedStudentsCount} siswa belum mengisi</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>Seluruh siswa tuntas</span>
                        </span>
                      )}

                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {item.totalEntriesCount} Jurnal Masuk
                      </span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRombelDetail(item);
                        setDetailTab(item.unsubmittedStudentsCount > 0 ? 'unsubmitted' : 'submitted');
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Rincian Siswa ({item.unsubmittedStudentsCount} Belum)</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {item.unsubmittedStudentsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleCopyRombelReminder(item)}
                        title="Salin Pesan Pengingat WhatsApp untuk Rombel Ini"
                        className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* COMPACT LIST VIEW */
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Nama Rombel</th>
                  <th className="py-3 px-3">Jenjang</th>
                  <th className="py-3 px-4 min-w-[220px]">Bar Kemajuan Pengisian</th>
                  <th className="py-3 px-3 text-center">Persentase</th>
                  <th className="py-3 px-3 text-center">Sudah / Total</th>
                  <th className="py-3 px-3 text-center">Belum Setor</th>
                  <th className="py-3 px-3 text-center">Total Jurnal</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRombels.map((item) => {
                  const visuals = getProgressVisuals(item.percentage);
                  const IconComponent = visuals.icon;

                  return (
                    <tr
                      key={item.rombel}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-slate-100">
                        {item.rombel}
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Kelas {item.grade}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${visuals.barGradient} transition-all duration-700 ease-out`}
                            style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-black font-mono text-sm text-slate-800 dark:text-slate-100">
                        <span className={`px-2 py-0.5 rounded-lg border text-xs ${visuals.badgeClass}`}>
                          {item.percentage}%
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300 font-mono">
                        {item.submittedStudentsCount} / {item.totalStudents}
                      </td>

                      <td className="py-3 px-3 text-center font-bold">
                        {item.unsubmittedStudentsCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                            {item.unsubmittedStudentsCount} Siswa
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                            Tuntas ✓
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-mono font-medium">
                        {item.totalEntriesCount}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRombelDetail(item);
                              setDetailTab(item.unsubmittedStudentsCount > 0 ? 'unsubmitted' : 'submitted');
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                          >
                            Rincian
                          </button>
                          {item.unsubmittedStudentsCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleCopyRombelReminder(item)}
                              title="Salin Pesan Pengingat WA"
                              className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast Notification when WhatsApp text is copied */}
      {copiedRombelMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-700 text-white shadow-2xl flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
          <div className="text-xs font-bold">
            Pesan pengingat WhatsApp untuk rombel berhasil disalin ke papan klip!
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. INTERACTIVE DETAIL MODAL FOR A SELECTED ROMBEL */}
      {/* ======================================================== */}
      {activeRombelDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-800 dark:text-slate-100">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <BarChart3 className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Rincian Monitoring: {activeRombelDetail.rombel}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 dark:bg-blue-900/80 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                      Kelas {activeRombelDetail.grade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Periode: <strong className="text-slate-700 dark:text-slate-200">{formatMonthLabel ? formatMonthLabel(selectedMonth) : selectedMonth}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveRombelDetail(null)}
                className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Subheader: Progress bar and Quick Actions */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                    {activeRombelDetail.percentage}%
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Siswa Sudah Mengisi ({activeRombelDetail.submittedStudentsCount} dari {activeRombelDetail.totalStudents} Siswa)
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {activeRombelDetail.unsubmittedStudentsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleCopyRombelReminder(activeRombelDetail)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Pesan WA Pengingat</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleExportRombelDetail(activeRombelDetail)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ekspor (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar inside modal */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${getProgressVisuals(activeRombelDetail.percentage).barGradient} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.min(100, Math.max(0, activeRombelDetail.percentage))}%` }}
                />
              </div>
            </div>

            {/* Modal Tab Switcher & Search */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailTab('unsubmitted')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    detailTab === 'unsubmitted'
                      ? 'bg-rose-600 text-white shadow-xs font-black'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Belum Mengisi ({activeRombelDetail.unsubmittedStudentsCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('submitted')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    detailTab === 'submitted'
                      ? 'bg-emerald-600 text-white shadow-xs font-black'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sudah Mengisi ({activeRombelDetail.submittedStudentsCount})</span>
                </button>
              </div>

              {/* Search Inside Modal */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari siswa dalam rombel ini..."
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none w-full sm:w-56"
                />
              </div>
            </div>

            {/* Modal Body: Student List Table */}
            <div className="flex-1 overflow-y-auto p-4 max-h-96">
              {detailTab === 'unsubmitted' ? (
                /* Unsubmitted Students List */
                activeRombelDetail.studentsUnsubmitted.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      Semua Siswa di Rombel Ini Sudah Mengisi Jurnal!
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tingkat kepatuhan literasi kelas ini mencapai 100%.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeRombelDetail.studentsUnsubmitted
                      .filter((s) => {
                        if (!detailSearch.trim()) return true;
                        const q = detailSearch.toLowerCase();
                        return (
                          s.name.toLowerCase().includes(q) ||
                          (s.nisn && s.nisn.toLowerCase().includes(q)) ||
                          s.username.toLowerCase().includes(q)
                        );
                      })
                      .map((student, idx) => (
                        <div
                          key={student.id}
                          className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center text-xs shrink-0">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                                {student.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                NISN: {student.nisn || '-'} • @{student.username}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              Belum Setor
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopySingleStudentReminder(student, activeRombelDetail.rombel)}
                              className={`p-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                copiedStudentId === student.id
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                              }`}
                              title="Salin pesan WA khusus siswa ini"
                            >
                              {copiedStudentId === student.id ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span className="hidden sm:inline text-[10px]">
                                {copiedStudentId === student.id ? 'Tersalin' : 'Chat WA'}
                              </span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )
              ) : (
                /* Submitted Students List */
                activeRombelDetail.studentsSubmitted.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      Belum Ada Siswa yang Mengisi Jurnal pada Periode Ini
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeRombelDetail.studentsSubmitted
                      .filter((s) => {
                        if (!detailSearch.trim()) return true;
                        const q = detailSearch.toLowerCase();
                        return (
                          s.name.toLowerCase().includes(q) ||
                          (s.nisn && s.nisn.toLowerCase().includes(q)) ||
                          s.username.toLowerCase().includes(q)
                        );
                      })
                      .map((student, idx) => {
                        const studentEntries = submittedStudentMap.entriesByStudentId.get(student.id) || [];
                        const latest = studentEntries[0];

                        return (
                          <div
                            key={student.id}
                            className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0">
                                {idx + 1}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                                  {student.name}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  NISN: {student.nisn || '-'} • {studentEntries.length} Jurnal Dikirim
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              {latest ? (
                                <div>
                                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[180px] sm:max-w-xs">
                                    "{latest.bookTitle}"
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {latest.date || latest.createdAt?.substring(0, 10)}
                                    {latest.totalFinalScore !== undefined && (
                                      <span className="ml-1.5 font-bold text-blue-600 dark:text-blue-400">
                                        • Nilai: {latest.totalFinalScore}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-emerald-600 font-bold">
                                  Sudah Mengisi ✓
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>
                Rombel <strong>{activeRombelDetail.rombel}</strong> • {activeRombelDetail.totalStudents} Siswa Terdaftar
              </span>
              <button
                type="button"
                onClick={() => setActiveRombelDetail(null)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
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
