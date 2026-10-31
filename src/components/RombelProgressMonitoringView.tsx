import React, { useState, useMemo } from 'react';
import { User, LiteracyEntry, RombelItem, JenjangKelas, SchoolProfileSettings } from '../types';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { 
  BarChart3, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  ArrowUpDown, 
  FileSpreadsheet, 
  Printer, 
  ChevronRight, 
  GraduationCap, 
  Sparkles, 
  BookOpen, 
  Eye, 
  X, 
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { getWeekNumberFromDate } from '../utils/accumulation';

interface RombelProgressMonitoringViewProps {
  currentUser: User;
  users: User[];
  entries: LiteracyEntry[];
  rombels: RombelItem[];
  schoolProfile: SchoolProfileSettings;
  academicYear: string;
  semester: string;
  onOpenReportModal?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const RombelProgressMonitoringView: React.FC<RombelProgressMonitoringViewProps> = ({
  currentUser,
  users,
  entries,
  rombels,
  schoolProfile,
  academicYear,
  semester,
  onOpenReportModal,
  onNavigateTab,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<'all' | JenjangKelas>('all');
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<'all' | number>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'percentage_desc' | 'percentage_asc' | 'name_asc' | 'total_students'>('percentage_desc');
  
  // Drill-down detail modal state
  const [selectedRombelDetail, setSelectedRombelDetail] = useState<{
    rombelName: string;
    grade: string;
    waliKelas?: string;
  } | null>(null);
  const [studentListFilter, setStudentListFilter] = useState<'all' | 'filled' | 'not_filled'>('all');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

  // All student users
  const studentUsers = useMemo(() => {
    return users.filter((u) => u.role === 'siswa');
  }, [users]);

  // Filter entries if specific week is selected
  const activeEntries = useMemo(() => {
    if (selectedWeekFilter === 'all') return entries;
    return entries.filter((e) => {
      const w = e.weekNumber || getWeekNumberFromDate(e.date || e.createdAt);
      return w === selectedWeekFilter;
    });
  }, [entries, selectedWeekFilter]);

  // Master Rombel Progress Calculation
  const rombelStats = useMemo(() => {
    const rombelMap = new Map<string, {
      rombelName: string;
      grade: string;
      waliKelas?: string;
      students: User[];
      filledStudents: User[];
      unfilledStudents: User[];
      totalJournals: number;
      validatedJournals: number;
    }>();

    // 1. Initialize with all registered rombel items
    rombels.forEach((r) => {
      rombelMap.set(r.name, {
        rombelName: r.name,
        grade: r.grade,
        waliKelas: r.waliKelas,
        students: [],
        filledStudents: [],
        unfilledStudents: [],
        totalJournals: 0,
        validatedJournals: 0,
      });
    });

    // 2. Populate students into their rombels
    studentUsers.forEach((student) => {
      const rName = student.rombel || `Kelas ${student.kelas}`;
      let item = rombelMap.get(rName);
      if (!item) {
        item = {
          rombelName: rName,
          grade: (student.kelas || '10') as string,
          waliKelas: undefined,
          students: [],
          filledStudents: [],
          unfilledStudents: [],
          totalJournals: 0,
          validatedJournals: 0,
        };
        rombelMap.set(rName, item);
      }
      item.students.push(student);

      // Check if student has filled journal in active entries
      const studentEntries = activeEntries.filter(
        (e) => e.studentId === student.id || (student.nisn && e.studentNisn === student.nisn)
      );

      if (studentEntries.length > 0) {
        item.filledStudents.push(student);
        item.totalJournals += studentEntries.length;
        item.validatedJournals += studentEntries.filter((e) => !!e.teacherValidation).length;
      } else {
        item.unfilledStudents.push(student);
      }
    });

    // Convert map to array and compute percentages
    const list = Array.from(rombelMap.values()).map((r) => {
      const total = r.students.length;
      const filled = r.filledStudents.length;
      const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
      return {
        ...r,
        total,
        filled,
        percentage,
      };
    });

    return list;
  }, [rombels, studentUsers, activeEntries]);

  // Overall School Metrics
  const overallMetrics = useMemo(() => {
    const totalRombel = rombelStats.length;
    const totalStudents = studentUsers.length;
    
    // Count unique students with at least 1 journal
    const filledStudentIds = new Set(
      activeEntries.map((e) => e.studentId || e.studentNisn).filter(Boolean)
    );
    const totalFilled = studentUsers.filter((s) => 
      filledStudentIds.has(s.id) || (s.nisn && filledStudentIds.has(s.nisn))
    ).length;
    const totalUnfilled = Math.max(0, totalStudents - totalFilled);
    const overallPercentage = totalStudents > 0 ? Math.round((totalFilled / totalStudents) * 100) : 0;

    // Top performing rombels
    const sorted = [...rombelStats].filter((r) => r.total > 0).sort((a, b) => b.percentage - a.percentage);
    const topRombel = sorted[0];

    return {
      totalRombel,
      totalStudents,
      totalFilled,
      totalUnfilled,
      overallPercentage,
      topRombel,
    };
  }, [rombelStats, studentUsers, activeEntries]);

  // Filtered and Sorted Rombels
  const filteredRombels = useMemo(() => {
    return rombelStats
      .filter((r) => {
        if (selectedGrade !== 'all' && r.grade !== selectedGrade) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = r.rombelName.toLowerCase().includes(q);
          const matchWali = r.waliKelas?.toLowerCase().includes(q) || false;
          const matchGrade = r.grade.toLowerCase().includes(q);
          if (!matchName && !matchWali && !matchGrade) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'percentage_desc') return b.percentage - a.percentage;
        if (sortBy === 'percentage_asc') return a.percentage - b.percentage;
        if (sortBy === 'name_asc') return a.rombelName.localeCompare(b.rombelName);
        if (sortBy === 'total_students') return b.total - a.total;
        return 0;
      });
  }, [rombelStats, selectedGrade, searchQuery, sortBy]);

  // Grade Counts for filter buttons
  const gradeCounts = useMemo(() => {
    return {
      all: rombelStats.length,
      '10': rombelStats.filter((r) => r.grade === '10').length,
      '11': rombelStats.filter((r) => r.grade === '11').length,
      '12': rombelStats.filter((r) => r.grade === '12').length,
    };
  }, [rombelStats]);

  // Active Rombel Detail Data
  const currentRombelDetail = useMemo(() => {
    if (!selectedRombelDetail) return null;
    return rombelStats.find((r) => r.rombelName === selectedRombelDetail.rombelName) || null;
  }, [selectedRombelDetail, rombelStats]);

  // Filtered Students in Drill-down Modal
  const detailedStudentList = useMemo(() => {
    if (!currentRombelDetail) return [];

    let list = currentRombelDetail.students;
    if (studentListFilter === 'filled') {
      list = currentRombelDetail.filledStudents;
    } else if (studentListFilter === 'not_filled') {
      list = currentRombelDetail.unfilledStudents;
    }

    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase().trim();
      list = list.filter((s) => 
        s.name.toLowerCase().includes(q) || 
        (s.nisn && s.nisn.toLowerCase().includes(q))
      );
    }

    return list;
  }, [currentRombelDetail, studentListFilter, studentSearchQuery]);

  // Helper to get progress bar style based on percentage
  const getProgressVisuals = (pct: number) => {
    if (pct >= 85) {
      return {
        barGradient: 'from-emerald-500 to-teal-400',
        badgeBg: 'bg-emerald-500 text-white',
        borderAccent: 'border-emerald-300 dark:border-emerald-800',
        statusLabel: 'Sangat Tinggi',
      };
    }
    if (pct >= 60) {
      return {
        barGradient: 'from-blue-600 to-indigo-500',
        badgeBg: 'bg-blue-600 text-white',
        borderAccent: 'border-blue-300 dark:border-blue-800',
        statusLabel: 'Baik',
      };
    }
    if (pct >= 35) {
      return {
        barGradient: 'from-amber-500 to-yellow-400',
        badgeBg: 'bg-amber-500 text-white',
        borderAccent: 'border-amber-300 dark:border-amber-800',
        statusLabel: 'Sedang',
      };
    }
    return {
      barGradient: 'from-rose-500 to-pink-500',
      badgeBg: 'bg-rose-500 text-white',
      borderAccent: 'border-rose-300 dark:border-rose-800',
      statusLabel: 'Perlu Perhatian',
    };
  };

  // Export Rombel Progress Table to Excel
  const handleExportRombelExcel = () => {
    const exportData = filteredRombels.map((r, idx) => ({
      'No': idx + 1,
      'Nama Rombel / Kelas': r.rombelName,
      'Jenjang': `Kelas ${r.grade}`,
      'Wali Kelas': r.waliKelas || '-',
      'Total Siswa Terdaftar': r.total,
      'Siswa Sudah Mengisi': r.filled,
      'Siswa Belum Mengisi': r.total - r.filled,
      'Persentase Partisipasi (%)': `${r.percentage}%`,
      'Total Jurnal Masuk': r.totalJournals,
      'Jurnal Telah Divalidasi': r.validatedJournals,
      'Kategori Progres': getProgressVisuals(r.percentage).statusLabel,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Progres Rombel');
    XLSX.writeFile(wb, `Rekap_Progres_Literasi_Rombel_${academicYear.replace('/', '-')}.xlsx`);

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {
      // ignore
    }
  };

  // Export specific rombel student details to Excel
  const handleExportSingleRombelStudents = (r: typeof currentRombelDetail) => {
    if (!r) return;
    const data = r.students.map((student, idx) => {
      const studentEntries = activeEntries.filter(
        (e) => e.studentId === student.id || (student.nisn && e.studentNisn === student.nisn)
      );
      const hasFilled = studentEntries.length > 0;
      const latestEntry = studentEntries[0];

      return {
        'No': idx + 1,
        'Nama Lengkap Siswa': student.name,
        'NISN': student.nisn || '-',
        'Rombel': r.rombelName,
        'Jenjang': `Kelas ${r.grade}`,
        'Status Pengisian': hasFilled ? 'Sudah Mengisi' : 'Belum Mengisi',
        'Jumlah Jurnal Diisi': studentEntries.length,
        'Judul Buku Terakhir': latestEntry?.bookTitle || '-',
        'Tanggal Terakhir Mengisi': latestEntry?.date || latestEntry?.createdAt?.substring(0, 10) || '-',
        'Status Validasi Terakhir': latestEntry?.teacherValidation ? 'Sudah Divalidasi' : (hasFilled ? 'Menunggu Validasi' : '-'),
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Siswa ${r.rombelName}`);
    XLSX.writeFile(wb, `Detail_Siswa_${r.rombelName.replace(/\s+/g, '_')}_Literasi.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto py-2 sm:py-3 px-2 sm:px-4 lg:px-6">
      {/* 1. Header Hero Banner: Modern Corporate Clean & Glassmorphism */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#071d49] via-[#0f3478] to-[#144299] text-white p-4 sm:p-5 mb-3.5 shadow-xl border-2 border-blue-400/30">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-blue-950 inline-flex items-center gap-1 shadow-xs">
                <BarChart3 className="w-3.5 h-3.5" />
                Menu Utama Monitoring
              </span>
              <span className="text-[11px] text-blue-200 font-semibold bg-white/10 px-2 py-0.5 rounded-full border border-white/15">
                {schoolProfile.namaSekolah}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">
              Monitoring Progres Pengisian Jurnal per Rombel / Kelas
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-2xl leading-relaxed">
              Pantau persentase partisipasi siswa di setiap rombongan belajar secara real-time, temukan rombel paling aktif, dan pantau siswa yang belum melengkapi jurnal.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleExportRombelExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 text-blue-950 font-bold text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-950" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
            {onOpenReportModal && (
              <button
                onClick={onOpenReportModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 font-bold text-xs border border-white/20 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>Cetak Rekap</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards: 4 Key Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-3.5">
        {/* Card 1: Total Rombel */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Total Rombel</span>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
              {overallMetrics.totalRombel} <span className="text-xs font-normal text-slate-400">Kelas</span>
            </div>
          </div>
        </div>

        {/* Card 2: Persentase Partisipasi Sekolah */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Rata-rata Sekolah</span>
            <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {overallMetrics.overallPercentage}% <span className="text-xs font-normal text-slate-400">partisipasi</span>
            </div>
          </div>
        </div>

        {/* Card 3: Siswa Mengisi vs Belum */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Siswa Sudah Mengisi</span>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
              {overallMetrics.totalFilled} <span className="text-xs font-normal text-slate-400">/ {overallMetrics.totalStudents}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Rombel Terbaik */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div className="min-w-0 truncate">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Rombel Teraktif</span>
            <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight truncate">
              {overallMetrics.topRombel ? `${overallMetrics.topRombel.rombelName} (${overallMetrics.topRombel.percentage}%)` : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Search Controls */}
      <div className="p-3 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-2xs mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left: Grade Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Jenjang:
          </span>
          <button
            onClick={() => setSelectedGrade('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Semua ({gradeCounts.all})
          </button>
          <button
            onClick={() => setSelectedGrade('10')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === '10'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Kelas 10 ({gradeCounts['10']})
          </button>
          <button
            onClick={() => setSelectedGrade('11')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === '11'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Kelas 11 ({gradeCounts['11']})
          </button>
          <button
            onClick={() => setSelectedGrade('12')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === '12'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Kelas 12 ({gradeCounts['12']})
          </button>
        </div>

        {/* Right: Search & Sorting */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Week Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <select
              value={selectedWeekFilter}
              onChange={(e) => setSelectedWeekFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
            >
              <option value="all">Sepanjang Semester</option>
              <option value="1">Minggu 1</option>
              <option value="2">Minggu 2</option>
              <option value="3">Minggu 3</option>
              <option value="4">Minggu 4</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari rombel / wali..."
              className="w-full pl-8 pr-3 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
            >
              <option value="percentage_desc">Persentase Tertinggi</option>
              <option value="percentage_asc">Persentase Terendah</option>
              <option value="name_asc">Nama Rombel (A-Z)</option>
              <option value="total_students">Jumlah Siswa Terbanyak</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Rombel Cards Grid (Single Screen with Internal Scroll) */}
      <div className="space-y-2.5 max-h-[calc(100vh-290px)] sm:max-h-[calc(100vh-310px)] overflow-y-auto pr-1 scrollbar-thin">
        {filteredRombels.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Tidak ada rombel yang sesuai</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Coba sesuaikan kata kunci pencarian atau ubah filter jenjang kelas di atas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {filteredRombels.map((rombel) => {
              const visuals = getProgressVisuals(rombel.percentage);
              const unfilledCount = Math.max(0, rombel.total - rombel.filled);

              return (
                <div
                  key={rombel.rombelName}
                  className={`bg-white dark:bg-[#0c1424] rounded-xl border ${visuals.borderAccent} p-3.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group`}
                >
                  {/* Top: Rombel Name & Percentage Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                            Kelas {rombel.grade}
                          </span>
                          <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {rombel.rombelName}
                          </h3>
                        </div>
                        {rombel.waliKelas && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            Wali: <strong className="font-medium text-slate-700 dark:text-slate-300">{rombel.waliKelas}</strong>
                          </p>
                        )}
                      </div>

                      <div className={`px-2.5 py-1 rounded-lg text-xs font-black shadow-2xs shrink-0 ${visuals.badgeBg}`}>
                        {rombel.percentage}%
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 p-0.5 mb-2.5 overflow-hidden">
                      <div
                        className={`bg-gradient-to-r ${visuals.barGradient} h-full rounded-full transition-all duration-700 ease-out shadow-xs`}
                        style={{ width: `${Math.max(4, Math.min(100, rombel.percentage))}%` }}
                      />
                    </div>

                    {/* Stats details */}
                    <div className="grid grid-cols-3 gap-1.5 text-center bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] mb-2.5">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Siswa</span>
                        <strong className="text-slate-800 dark:text-slate-200">{rombel.total}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">Sudah Isi</span>
                        <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{rombel.filled}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-500 dark:text-rose-400 block font-semibold">Belum Isi</span>
                        <strong className="text-rose-600 dark:text-rose-300 font-bold">{unfilledCount}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action: Click to inspect students */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 gap-2">
                    <span className="text-[10px] font-semibold text-slate-400 truncate">
                      {rombel.totalJournals} Jurnal • {rombel.validatedJournals} Tervalidasi
                    </span>
                    <button
                      onClick={() => {
                        setSelectedRombelDetail({
                          rombelName: rombel.rombelName,
                          grade: rombel.grade,
                          waliKelas: rombel.waliKelas,
                        });
                        setStudentListFilter('all');
                        setStudentSearchQuery('');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer group-hover:underline shrink-0"
                    >
                      <span>Lihat Siswa</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Drill-Down Detail Modal: Daftar Siswa per Rombel */}
      {selectedRombelDetail && currentRombelDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c1424] w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-[#071d49] via-[#0f3478] to-[#144299] text-white flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-blue-950 uppercase">
                    Detail Rombel
                  </span>
                  <h3 className="text-base sm:text-lg font-black tracking-tight truncate">
                    {currentRombelDetail.rombelName} (Kelas {currentRombelDetail.grade})
                  </h3>
                </div>
                <p className="text-[11px] text-blue-100 mt-0.5">
                  Wali Kelas: <strong className="text-white">{currentRombelDetail.waliKelas || 'Belum Ditetapkan'}</strong> • {currentRombelDetail.total} Siswa Terdaftar
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleExportSingleRombelStudents(currentRombelDetail)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold"
                  title="Unduh data siswa rombel ini ke Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-300" />
                  <span className="hidden sm:inline">Ekspor Excel</span>
                </button>
                <button
                  onClick={() => setSelectedRombelDetail(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Tutup Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Sub-Header Stats & Filter Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setStudentListFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      studentListFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Semua ({currentRombelDetail.total})
                  </button>
                  <button
                    onClick={() => setStudentListFilter('filled')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      studentListFilter === 'filled'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Sudah Mengisi ({currentRombelDetail.filled})
                  </button>
                  <button
                    onClick={() => setStudentListFilter('not_filled')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      studentListFilter === 'not_filled'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Belum Mengisi ({Math.max(0, currentRombelDetail.total - currentRombelDetail.filled)})
                  </button>
                </div>

                {/* Modal Student Search Box */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Cari siswa atau NISN..."
                    className="w-full pl-8 pr-3 py-1 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Body: Scrollable Student List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {detailedStudentList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Tidak ada data siswa yang memenuhi filter yang dipilih.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {detailedStudentList.map((student, idx) => {
                    const studentEntries = activeEntries.filter(
                      (e) => e.studentId === student.id || (student.nisn && e.studentNisn === student.nisn)
                    );
                    const hasFilled = studentEntries.length > 0;
                    const latestEntry = studentEntries[0];

                    return (
                      <div
                        key={student.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                          hasFilled
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                            : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {student.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <span>NISN: {student.nisn || '-'}</span>
                              {hasFilled && latestEntry && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">Buku: {latestEntry.bookTitle}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {hasFilled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Sudah ({studentEntries.length} Jurnal)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              Belum Mengisi
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>Menampilkan {detailedStudentList.length} dari {currentRombelDetail.total} siswa</span>
              <button
                onClick={() => setSelectedRombelDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold transition-colors cursor-pointer"
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
