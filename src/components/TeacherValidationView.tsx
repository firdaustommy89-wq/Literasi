import React, { useState, useMemo } from 'react';
import { 
  LiteracyEntry, 
  User, 
  JenjangKelas, 
  TeacherValidation, 
  MonthlyVerification, 
  StudentMonthlyAccumulationSummary,
  StudentWeeklySummary
} from '../types';
import { 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  FileCheck2, 
  BookOpen, 
  MessageSquare, 
  Eye, 
  Star, 
  X, 
  AlertCircle, 
  ThumbsUp, 
  FileSpreadsheet,
  Target,
  Award,
  Check,
  ShieldCheck,
  Users,
  ChevronRight,
  Sparkles,
  Calendar,
  UserCheck,
  History,
  Monitor,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import { Pagination } from './Pagination';
import { StatisticsDashboard } from './StatisticsDashboard';
import { LiteracyTrendChart } from './LiteracyTrendChart';
import { 
  getWeekNumberFromDate, 
  getWeekPeriodLabel, 
  MONTH_NAMES_ID, 
  getEntryScore,
  getAllStudentsMonthlySummary,
  getAllStudentsWeeklySummary,
  calculateStudentWeeklySummary,
  getPredicateFromScore,
  formatSystemInputDate
} from '../utils/accumulation';

interface TeacherValidationViewProps {
  currentUser: User;
  users?: User[];
  entries: LiteracyEntry[];
  monthlyVerifications?: MonthlyVerification[];
  onValidateEntry: (entryId: string, validation: TeacherValidation, totalScore: number) => void;
  onSaveMonthlyVerification?: (verification: MonthlyVerification) => void;
  onExportExcel: () => void;
}

export const TeacherValidationView: React.FC<TeacherValidationViewProps> = ({
  currentUser,
  users = [],
  entries,
  monthlyVerifications = [],
  onValidateEntry,
  onSaveMonthlyVerification,
  onExportExcel,
}) => {
  // Navigation Subtabs: 'monthly' (Tabel Penilaian 4 Minggu per Anak) | 'weekly' (Log Mentah Semua Jurnal)
  const [activeSubTab, setActiveSubTab] = useState<'monthly' | 'weekly'>('monthly');

  // Filters for weekly validation
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedWeeklyWeekFilter, setSelectedWeeklyWeekFilter] = useState<'all' | 1 | 2 | 3 | 4>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected entry for modal review or viewing details
  const [activeReviewEntry, setActiveReviewEntry] = useState<LiteracyEntry | null>(null);
  const [inspectEntry, setInspectEntry] = useState<LiteracyEntry | null>(null);
  const [validationScore, setValidationScore] = useState<number>(75);
  const [validationStatus, setValidationStatus] = useState<'validated' | 'needs_revision'>('validated');
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');

  // Monthly Accumulation Tab State
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedAccumulationMonth, setSelectedAccumulationMonth] = useState<string>(currentMonthKey);
  const [monthlySearch, setMonthlySearch] = useState<string>('');
  const [monthlyGradeFilter, setMonthlyGradeFilter] = useState<string>('all');
  const [monthlyComplianceFilter, setMonthlyComplianceFilter] = useState<'all' | 'complete' | 'incomplete'>('all');

  // Week Selection filter on 4-week view: 'all' | 1 | 2 | 3 | 4
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<'all' | 1 | 2 | 3 | 4>('all');

  // Modal Weekly Assessment State (Per Anak dengan Navigasi 4 Minggu)
  const [activeStudentForWeeklyModal, setActiveStudentForWeeklyModal] = useState<User | null>(null);
  const [activeModalWeek, setActiveModalWeek] = useState<1 | 2 | 3 | 4>(1);
  const [weeklyValidationScore, setWeeklyValidationScore] = useState<number>(75);
  const [weeklyFeedbackNotes, setWeeklyFeedbackNotes] = useState<string>('');

  // Modal Monthly Verification State
  const [activeMonthlyStudentSummary, setActiveMonthlyStudentSummary] = useState<StudentMonthlyAccumulationSummary | null>(null);
  const [monthlyFinalScore, setMonthlyFinalScore] = useState<number>(85);
  const [monthlyPredicate, setMonthlyPredicate] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [monthlyTeacherNotes, setMonthlyTeacherNotes] = useState<string>('');

  // Pagination states for 1-Page Layout
  const [entriesPage, setEntriesPage] = useState<number>(1);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(8);

  const [weeklySumPage, setWeeklySumPage] = useState<number>(1);
  const [weeklySumPerPage, setWeeklySumPerPage] = useState<number>(8);

  const [monthlySumPage, setMonthlySumPage] = useState<number>(1);
  const [monthlySumPerPage, setMonthlySumPerPage] = useState<number>(8);

  // Filter students from users list
  const students = useMemo(() => {
    return users.filter((u) => u.role === 'siswa');
  }, [users]);

  // Available months from entries + current month
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthKey);
    entries.forEach((e) => {
      const d = e.date || e.createdAt;
      if (d && d.length >= 7) {
        set.add(d.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [entries, currentMonthKey]);

  const formatMonthTitle = (ym: string) => {
    const [y, m] = ym.split('-');
    const mName = MONTH_NAMES_ID[parseInt(m, 10) - 1] || m;
    return `${mName} ${y}`;
  };

  // Open modal handler for single weekly entry
  const handleOpenReview = (entry: LiteracyEntry) => {
    setActiveReviewEntry(entry);
    if (entry.teacherValidation) {
      setValidationScore(entry.teacherValidation.validationScore);
      setFeedbackNotes(entry.teacherValidation.feedbackNotes);
      setValidationStatus(entry.teacherValidation.status === 'needs_revision' ? 'needs_revision' : 'validated');
    } else {
      setValidationScore(75);
      setFeedbackNotes('Ulasan dan refleksi membaca sangat baik, nilai moral dipahami secara relevan.');
      setValidationStatus('validated');
    }
  };

  const handleSaveValidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReviewEntry) return;

    const teacherVal: TeacherValidation = {
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      teacherNip: currentUser.nip,
      validationScore: Number(validationScore),
      feedbackNotes: feedbackNotes.trim(),
      validatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: validationStatus,
    };

    const selfScore = activeReviewEntry.reflection?.totalScore || 0;
    const finalTotal = Math.min(100, selfScore + Number(validationScore));

    onValidateEntry(activeReviewEntry.id, teacherVal, finalTotal);
    setActiveReviewEntry(null);

    try {
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }
  };

  // Quick 1-click validation with full 80 points
  const handleQuickValidate = (entry: LiteracyEntry, score = 80) => {
    const teacherVal: TeacherValidation = {
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      teacherNip: currentUser.nip,
      validationScore: score,
      feedbackNotes: 'Validasi cepat: Ringkasan bacaan runtut dan refleksi diri dinilai sangat baik sesuai target mingguan.',
      validatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'validated',
    };

    const selfScore = entry.reflection?.totalScore || 0;
    const finalTotal = Math.min(100, selfScore + score);

    onValidateEntry(entry.id, teacherVal, finalTotal);

    try {
      confetti({
        particleCount: 40,
        spread: 40,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  // Filtered weekly entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedGrade !== 'all' && e.studentKelas !== selectedGrade) return false;
      if (selectedType !== 'all' && e.literacyType !== selectedType) return false;
      if (selectedStatus === 'pending' && e.teacherValidation) return false;
      if (selectedStatus === 'validated' && !e.teacherValidation) return false;
      if (selectedWeeklyWeekFilter !== 'all') {
        const w = e.weekNumber || getWeekNumberFromDate(e.date || e.createdAt);
        if (w !== selectedWeeklyWeekFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = e.studentName.toLowerCase().includes(q);
        const matchNisn = e.studentNisn?.toLowerCase().includes(q);
        const matchBook = e.bookTitle.toLowerCase().includes(q);
        const matchRombel = e.studentRombel?.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchBook && !matchRombel) return false;
      }

      return true;
    });
  }, [entries, selectedGrade, selectedType, selectedStatus, selectedWeeklyWeekFilter, searchQuery]);

  const pendingWeeklyCount = useMemo(() => {
    return entries.filter((e) => !e.teacherValidation).length;
  }, [entries]);

  const validatedWeeklyCount = useMemo(() => {
    return entries.filter((e) => !!e.teacherValidation).length;
  }, [entries]);

  // Calculate monthly accumulation summaries for all students
  const allMonthlySummaries = useMemo(() => {
    return getAllStudentsMonthlySummary(
      students,
      selectedAccumulationMonth,
      entries,
      monthlyVerifications
    );
  }, [students, selectedAccumulationMonth, entries, monthlyVerifications]);

  // Filtered monthly summaries for table (Tabel 1 Halaman 4 Minggu per Anak)
  const filteredMonthlySummaries = useMemo(() => {
    return allMonthlySummaries.filter((sum) => {
      if (monthlyGradeFilter !== 'all' && sum.student.kelas !== monthlyGradeFilter) return false;
      if (monthlyComplianceFilter === 'complete' && sum.completedWeeks < 4) return false;
      if (monthlyComplianceFilter === 'incomplete' && sum.completedWeeks >= 4) return false;

      // Filter berdasarkan minggu tertentu yang memiliki isian
      if (selectedWeekFilter === 1 && !sum.week1Summary?.hasSubmission) return false;
      if (selectedWeekFilter === 2 && !sum.week2Summary?.hasSubmission) return false;
      if (selectedWeekFilter === 3 && !sum.week3Summary?.hasSubmission) return false;
      if (selectedWeekFilter === 4 && !sum.week4Summary?.hasSubmission) return false;

      if (monthlySearch.trim()) {
        const q = monthlySearch.toLowerCase();
        const matchName = sum.student.name.toLowerCase().includes(q);
        const matchNisn = sum.student.nisn?.toLowerCase().includes(q);
        const matchRombel = sum.student.rombel?.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchRombel) return false;
      }
      return true;
    });
  }, [allMonthlySummaries, monthlyGradeFilter, monthlyComplianceFilter, selectedWeekFilter, monthlySearch]);

  // All weekly summaries when a specific week is chosen
  const allWeeklySummaries = useMemo(() => {
    if (selectedWeekFilter === 'all') return [];
    return getAllStudentsWeeklySummary(
      students,
      selectedAccumulationMonth,
      selectedWeekFilter,
      entries
    );
  }, [students, selectedAccumulationMonth, selectedWeekFilter, entries]);

  // Filtered weekly summaries
  const filteredWeeklySummaries = useMemo(() => {
    if (selectedWeekFilter === 'all') return [];
    return allWeeklySummaries.filter((sum) => {
      if (monthlyGradeFilter !== 'all' && sum.student.kelas !== monthlyGradeFilter) return false;
      if (monthlyComplianceFilter === 'complete' && !sum.hasSubmission) return false;
      if (monthlyComplianceFilter === 'incomplete' && sum.hasSubmission) return false;
      if (monthlySearch.trim()) {
        const q = monthlySearch.toLowerCase();
        const matchName = sum.student.name.toLowerCase().includes(q);
        const matchNisn = sum.student.nisn?.toLowerCase().includes(q);
        const matchRombel = sum.student.rombel?.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchRombel) return false;
      }
      return true;
    });
  }, [allWeeklySummaries, selectedWeekFilter, monthlyGradeFilter, monthlyComplianceFilter, monthlySearch]);

  // Paginated slices for 1-Page Layout
  const paginatedEntries = useMemo(() => {
    const start = (entriesPage - 1) * entriesPerPage;
    return filteredEntries.slice(start, start + entriesPerPage);
  }, [filteredEntries, entriesPage, entriesPerPage]);

  const paginatedWeeklySummaries = useMemo(() => {
    const start = (weeklySumPage - 1) * weeklySumPerPage;
    return filteredWeeklySummaries.slice(start, start + weeklySumPerPage);
  }, [filteredWeeklySummaries, weeklySumPage, weeklySumPerPage]);

  const paginatedMonthlySummaries = useMemo(() => {
    const start = (monthlySumPage - 1) * monthlySumPerPage;
    return filteredMonthlySummaries.slice(start, start + monthlySumPerPage);
  }, [filteredMonthlySummaries, monthlySumPage, monthlySumPerPage]);

  // Compute active student's 4-week summaries for the modal tabs
  const studentAll4Weeks = useMemo(() => {
    if (!activeStudentForWeeklyModal) return null;
    return {
      w1: calculateStudentWeeklySummary(activeStudentForWeeklyModal, selectedAccumulationMonth, 1, entries),
      w2: calculateStudentWeeklySummary(activeStudentForWeeklyModal, selectedAccumulationMonth, 2, entries),
      w3: calculateStudentWeeklySummary(activeStudentForWeeklyModal, selectedAccumulationMonth, 3, entries),
      w4: calculateStudentWeeklySummary(activeStudentForWeeklyModal, selectedAccumulationMonth, 4, entries),
    };
  }, [activeStudentForWeeklyModal, selectedAccumulationMonth, entries]);

  // Compute currently active week summary inside the modal
  const currentActiveWeeklyStudentSummary = useMemo(() => {
    if (!activeStudentForWeeklyModal) return null;
    return calculateStudentWeeklySummary(
      activeStudentForWeeklyModal,
      selectedAccumulationMonth,
      activeModalWeek,
      entries
    );
  }, [activeStudentForWeeklyModal, selectedAccumulationMonth, activeModalWeek, entries]);

  // Real-time calculation of monthly average and 4-week final score for the modal
  const modalMonthlyAverage = useMemo(() => {
    if (!studentAll4Weeks) {
      return { score: 0, formula: '-', validatedCount: 0, completedCount: 0, isAll4Validated: false, predicate: 'D' as const };
    }
    const weeks = [studentAll4Weeks.w1, studentAll4Weeks.w2, studentAll4Weeks.w3, studentAll4Weeks.w4];
    const completedCount = weeks.filter((w) => w.hasSubmission).length;
    const validatedWeeks = weeks.filter((w) => w.hasSubmission && w.isValidated);
    const validatedCount = validatedWeeks.length;
    const isAll4Validated = completedCount >= 4 && validatedCount >= 4;

    if (isAll4Validated) {
      const sum = weeks.reduce((acc, w) => acc + w.weeklyFinalScore, 0);
      const score = Math.round((sum / 4) * 10) / 10;
      const formula = `(${weeks.map((w) => w.weeklyFinalScore).join(' + ')}) ÷ 4`;
      return { score, formula, validatedCount, completedCount, isAll4Validated: true, predicate: getPredicateFromScore(score) };
    }

    if (validatedCount > 0) {
      const sum = validatedWeeks.reduce((acc, w) => acc + w.weeklyFinalScore, 0);
      const score = Math.round((sum / validatedCount) * 10) / 10;
      const formula = `(${validatedWeeks.map((w) => w.weeklyFinalScore).join(' + ')}) ÷ ${validatedCount}`;
      return { score, formula, validatedCount, completedCount, isAll4Validated: false, predicate: getPredicateFromScore(score) };
    }

    return { score: 0, formula: 'Belum ada nilai tervalidasi', validatedCount: 0, completedCount, isAll4Validated: false, predicate: 'D' as const };
  }, [studentAll4Weeks]);

  // Open modal for weekly assessment of a student, defaulting to week 1..4
  const handleOpenStudentWeeklyModal = (student: User, week: 1 | 2 | 3 | 4 = 1) => {
    setActiveStudentForWeeklyModal(student);
    setActiveModalWeek(week);
    const sum = calculateStudentWeeklySummary(student, selectedAccumulationMonth, week, entries);
    if (sum.isValidated && sum.teacherValidationScore !== undefined) {
      setWeeklyValidationScore(sum.teacherValidationScore);
      setWeeklyFeedbackNotes(sum.feedbackNotes || '');
    } else {
      setWeeklyValidationScore(75);
      setWeeklyFeedbackNotes(
        'Ulasan jurnal dan refleksi membaca di minggu ini telah dipahami dengan baik, relevan, serta memenuhi target mingguan.'
      );
    }
  };

  // Helper for View A weekly summary card/row click
  const handleOpenWeeklyModal = (wSum: StudentWeeklySummary) => {
    handleOpenStudentWeeklyModal(wSum.student, wSum.weekNumber);
  };

  // Switch week inside modal for the same student
  const handleSwitchModalWeek = (week: 1 | 2 | 3 | 4) => {
    if (!activeStudentForWeeklyModal) return;
    setActiveModalWeek(week);
    const sum = calculateStudentWeeklySummary(activeStudentForWeeklyModal, selectedAccumulationMonth, week, entries);
    if (sum.isValidated && sum.teacherValidationScore !== undefined) {
      setWeeklyValidationScore(sum.teacherValidationScore);
      setWeeklyFeedbackNotes(sum.feedbackNotes || '');
    } else {
      setWeeklyValidationScore(75);
      setWeeklyFeedbackNotes(
        'Ulasan jurnal dan refleksi membaca di minggu ini telah dipahami dengan baik, relevan, serta memenuhi target mingguan.'
      );
    }
  };

  const handleSaveWeeklyValidationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudentForWeeklyModal || !currentActiveWeeklyStudentSummary || currentActiveWeeklyStudentSummary.entries.length === 0) return;

    const teacherVal: TeacherValidation = {
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      teacherNip: currentUser.nip,
      validationScore: Number(weeklyValidationScore),
      feedbackNotes: weeklyFeedbackNotes.trim(),
      validatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'validated',
    };

    currentActiveWeeklyStudentSummary.entries.forEach((entry) => {
      const selfScore = entry.reflection?.totalScore || 0;
      const totalScore = Math.min(100, selfScore + Number(weeklyValidationScore));
      onValidateEntry(entry.id, teacherVal, totalScore);
    });

    try {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  // Monthly stats
  const totalStudentsCount = students.length;
  const completedAll4WeeksCount = allMonthlySummaries.filter((s) => s.completedWeeks >= 4).length;
  const incompleteCount = totalStudentsCount - completedAll4WeeksCount;
  const verifiedCount = allMonthlySummaries.filter((s) => !!s.monthlyVerification).length;

  const schoolMonthlyAvgScore = useMemo(() => {
    const scoredList = allMonthlySummaries.filter((s) => s.calculatedAccumulatedScore > 0);
    if (scoredList.length === 0) return 0;
    const sum = scoredList.reduce((acc, c) => acc + c.calculatedAccumulatedScore, 0);
    return Math.round((sum / scoredList.length) * 10) / 10;
  }, [allMonthlySummaries]);

  // Open modal for monthly verification & final grade
  const handleOpenMonthlyModal = (summary: StudentMonthlyAccumulationSummary) => {
    setActiveMonthlyStudentSummary(summary);
    const existing = summary.monthlyVerification;
    if (existing) {
      setMonthlyFinalScore(existing.accumulatedScore);
      setMonthlyPredicate(existing.predicate || getPredicateFromScore(existing.accumulatedScore));
      setMonthlyTeacherNotes(existing.teacherNotes || '');
    } else {
      const initialScore = summary.calculatedAccumulatedScore > 0 ? summary.calculatedAccumulatedScore : 80;
      setMonthlyFinalScore(initialScore);
      setMonthlyPredicate(getPredicateFromScore(initialScore));
      setMonthlyTeacherNotes(
        summary.completedWeeks >= 4
          ? 'Konsisten memenuhi kewajiban literasi 4x mingguan. Karakter disiplin membaca dan tadabur berkembang sangat baik.'
          : `Telah mengumpulkan ${summary.completedWeeks} dari 4 jurnal wajib. Diharapkan lebih konsisten di bulan berikutnya.`
      );
    }
  };

  const handleSaveMonthlyVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMonthlyStudentSummary) return;

    const verification: MonthlyVerification = {
      id: `${activeMonthlyStudentSummary.student.id}_${selectedAccumulationMonth}`,
      studentId: activeMonthlyStudentSummary.student.id,
      studentName: activeMonthlyStudentSummary.student.name,
      studentNisn: activeMonthlyStudentSummary.student.nisn,
      studentKelas: activeMonthlyStudentSummary.student.kelas,
      studentRombel: activeMonthlyStudentSummary.student.rombel,
      monthKey: selectedAccumulationMonth,
      completedWeeks: activeMonthlyStudentSummary.completedWeeks,
      accumulatedScore: Number(monthlyFinalScore),
      predicate: monthlyPredicate,
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      teacherNotes: monthlyTeacherNotes.trim(),
      verifiedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'verified',
    };

    if (onSaveMonthlyVerification) {
      onSaveMonthlyVerification(verification);
    }

    setActiveMonthlyStudentSummary(null);

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  // Export 4-Weekly Monthly Accumulation or Specific Week to Excel
  const handleExportMonthlyAccumulation = () => {
    if (selectedWeekFilter !== 'all') {
      const data = filteredWeeklySummaries.map((s, idx) => {
        const bookList = s.entries.map((e) => e.bookTitle).join(', ') || 'Belum Ada';
        return {
          'No': idx + 1,
          'Nama Lengkap Siswa': s.student.name,
          'NISN': s.student.nisn || '-',
          'Jenjang': s.student.kelas || '-',
          'Rombel': s.student.rombel || `Kelas ${s.student.kelas}`,
          'Target Minggu': `Minggu ${s.weekNumber} (${getWeekPeriodLabel(selectedAccumulationMonth, s.weekNumber)})`,
          'Jumlah Jurnal Diinput': s.entriesCount,
          'Judul Buku / Aktivitas': bookList,
          'Rata-rata Skor Refleksi': s.hasSubmission ? s.selfReflectionAvg : 0,
          'Skor Validasi Guru': s.teacherValidationScore ?? '-',
          'Nilai Akhir Mingguan': s.hasSubmission ? s.weeklyFinalScore : 0,
          'Predikat': s.hasSubmission ? getPredicateFromScore(s.weeklyFinalScore) : '-',
          'Status Penilaian': s.status === 'sudah_dinilai' ? 'Sudah Dinilai' : s.status === 'menunggu_penilaian' ? 'Menunggu Penilaian' : 'Belum Mengisi',
          'Catatan Feedback Guru': s.feedbackNotes || '-',
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Penilaian Minggu ${selectedWeekFilter}`);
      XLSX.writeFile(wb, `Rekap_Penilaian_Minggu_${selectedWeekFilter}_${selectedAccumulationMonth}.xlsx`);
      return;
    }

    const data = filteredMonthlySummaries.map((s, idx) => {
      const w1 = s.week1Entry ? `${getEntryScore(s.week1Entry)} (${s.week1Entry.bookTitle})` : 'Belum Ada';
      const w2 = s.week2Entry ? `${getEntryScore(s.week2Entry)} (${s.week2Entry.bookTitle})` : 'Belum Ada';
      const w3 = s.week3Entry ? `${getEntryScore(s.week3Entry)} (${s.week3Entry.bookTitle})` : 'Belum Ada';
      const w4 = s.week4Entry ? `${getEntryScore(s.week4Entry)} (${s.week4Entry.bookTitle})` : 'Belum Ada';

      return {
        'No': idx + 1,
        'Nama Lengkap Siswa': s.student.name,
        'NISN': s.student.nisn || '-',
        'Jenjang': s.student.kelas || '-',
        'Rombel': s.student.rombel || `Kelas ${s.student.kelas}`,
        'Minggu 1 (Tgl 1-7)': w1,
        'Minggu 2 (Tgl 8-14)': w2,
        'Minggu 3 (Tgl 15-21)': w3,
        'Minggu 4 (Tgl 22-akhir)': w4,
        'Kelengkapan': `${s.completedWeeks} / 4 Minggu (${s.completedWeeks * 25}%)`,
        'Nilai Akumulasi Akhir': s.calculatedAccumulatedScore,
        'Predikat': s.monthlyVerification?.predicate || getPredicateFromScore(s.calculatedAccumulatedScore),
        'Status Verifikasi': s.monthlyVerification ? 'Terverifikasi' : 'Belum Diverifikasi',
        'Guru Pembina': s.monthlyVerification?.teacherName || '-',
        'Catatan Pembinaan Karakter': s.monthlyVerification?.teacherNotes || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Akumulasi Bulanan Siswa');
    XLSX.writeFile(wb, `Rekap_Akumulasi_Literasi_Bulanan_${selectedAccumulationMonth}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Portal Validasi & Penilaian Guru
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
              Maksimal 100 Poin
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Validasi mingguan isian siswa & tetapkan nilai akumulasi 4 minggu siswa setiap akhir bulan.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={activeSubTab === 'monthly' ? handleExportMonthlyAccumulation : onExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{activeSubTab === 'monthly' ? 'Ekspor Akumulasi 4 Minggu' : 'Ekspor Nilai ke Excel'}</span>
          </button>
        </div>
      </div>

      {/* Comprehensive Statistics Dashboard Component */}
      <StatisticsDashboard
        entries={entries}
        users={users}
        variant="guru"
        onFilterGrade={(grade) => setSelectedGrade(grade)}
      />

      {/* Grafik Garis Tren Rata-rata Skor Literasi Siswa (Recharts) */}
      <LiteracyTrendChart entries={entries} />

      {/* ========================================================= */}
      {/* ATURAN WAJIB LITERASI & SUB-TAB NAVIGATION */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Subtabs Button Group */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl flex-wrap">
          <button
            onClick={() => setActiveSubTab('monthly')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'monthly'
                ? 'bg-indigo-600 text-white shadow-md font-black shadow-indigo-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Penilaian 1 Nama Siswa per Bulan (Terkonsolidasi)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
              Wajib 4x
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('weekly')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'weekly'
                ? 'bg-white text-indigo-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Log Mentah Semua Jurnal ({entries.filter((e) => !e.teacherValidation).length} Menunggu)</span>
          </button>
        </div>

        {/* Info Banner Aturan */}
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Aturan: Siswa wajib mengisi <strong>4 kali/bulan (1x/minggu)</strong>. Nilai diakumulasikan akhir bulan.
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: VALIDASI JURNAL MINGGUAN */}
      {/* ========================================================= */}
      {activeSubTab === 'weekly' && (
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama siswa, NISN, rombel, atau judul buku..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter Jenjang */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                  <span className="px-2 text-slate-400 hidden sm:inline">Jenjang:</span>
                  <button
                    onClick={() => setSelectedGrade('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedGrade === 'all' ? 'bg-white text-indigo-600 shadow-xs font-extrabold' : 'hover:text-slate-900'
                    }`}
                  >
                    Semua
                  </button>
                  {(['10', '11', '12'] as JenjangKelas[]).map((grade) => (
                    <button
                      key={grade}
                      onClick={() => setSelectedGrade(grade)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        selectedGrade === grade ? 'bg-white text-indigo-600 shadow-xs font-extrabold' : 'hover:text-slate-900'
                      }`}
                    >
                      Kls {grade}
                    </button>
                  ))}
                </div>

                {/* Filter Status */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Menunggu Validasi</option>
                  <option value="validated">Sudah Tervalidasi</option>
                </select>

                {/* Filter Jenis */}
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white outline-none"
                >
                  <option value="all">Semua Jenis Literasi</option>
                  <option value="Kitab Suci">Kitab Suci</option>
                  <option value="Non Mapel">Non Mapel</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Weekly Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3.5 px-4">Tanggal & Target Minggu</th>
                    <th className="py-3.5 px-4">Siswa & Kelas</th>
                    <th className="py-3.5 px-4">Buku & Ulasan</th>
                    <th className="py-3.5 px-3 text-center">Refleksi Siswa</th>
                    <th className="py-3.5 px-3 text-center bg-indigo-50/50 text-indigo-900">Validasi Guru</th>
                    <th className="py-3.5 px-3 text-center font-black text-slate-900">Total Nilai</th>
                    <th className="py-3.5 px-4 text-center">Aksi Penilaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Tidak ada jurnal yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    paginatedEntries.map((entry) => {
                      const isPending = !entry.teacherValidation;
                      const selfScore = entry.reflection?.totalScore ?? 0;
                      const teacherScore = entry.teacherValidation?.validationScore;
                      const totalScore = entry.totalFinalScore;
                      const week = entry.weekNumber || getWeekNumberFromDate(entry.date || entry.createdAt);

                      return (
                        <tr 
                          key={entry.id} 
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isPending ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {/* Tanggal & Foto */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <img
                                src={entry.photoUrl}
                                alt="Foto kegiatan"
                                className="w-11 h-11 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0 cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => handleOpenReview(entry)}
                              />
                              <div>
                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <span>{entry.date}</span>
                                  {entry.isLateSubmission && (
                                    <span 
                                      className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300"
                                      title={entry.lateReason ? `Susulan: ${entry.lateReason}` : 'Jurnal Susulan'}
                                    >
                                      Susulan
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1" title="Tanggal & Waktu Input Sistem Komputer (Terkunci)">
                                  <Monitor className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                  <span>{formatSystemInputDate(entry.systemInputDate, entry.createdAt, entry.date)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                                    Minggu {week}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {entry.durationMinutes}m
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Siswa & Kelas */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-sm">{entry.studentName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {entry.studentRombel}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                NISN: {entry.studentNisn}
                              </span>
                            </div>
                          </td>

                          {/* Buku & Ulasan */}
                          <td className="py-3 px-4 max-w-xs">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                entry.literacyType === 'Kitab Suci'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}>
                                {entry.literacyType}
                              </span>
                              <span className="text-[11px] text-slate-500 font-semibold truncate">
                                {entry.readingCategory}
                              </span>
                            </div>
                            <div className="font-bold text-slate-800 truncate" title={entry.bookTitle}>
                              {entry.bookTitle}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 italic mt-0.5">
                              "{entry.moralValue}"
                            </div>
                          </td>

                          {/* Skor Refleksi Siswa (max 20) */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {selfScore} <span className="text-[10px] text-slate-400 font-normal">/ 20</span>
                            </span>
                          </td>

                          {/* Kolom Validasi Guru (max 80) */}
                          <td className="py-3 px-3 text-center whitespace-nowrap bg-indigo-50/30">
                            {entry.teacherValidation ? (
                              <div>
                                <span className="inline-block px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  {entry.teacherValidation.validationScore} <span className="text-[10px] text-indigo-500 font-normal">/ 80</span>
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px] mx-auto">
                                  {entry.teacherValidation.teacherName.split(',')[0]}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                <Clock className="w-3 h-3" /> Belum Dinilai
                              </span>
                            )}
                          </td>

                          {/* Total Nilai (max 100) */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {totalScore !== undefined ? (
                              <div className="inline-flex flex-col items-center">
                                <span className={`px-2.5 py-1 rounded-xl text-sm font-black ${
                                  totalScore >= 90
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : totalScore >= 75
                                    ? 'bg-sky-600 text-white shadow-xs'
                                    : 'bg-amber-500 text-white shadow-xs'
                                }`}>
                                  {totalScore}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                                  {totalScore >= 90 ? 'A (Istimewa)' : totalScore >= 75 ? 'B (Baik)' : 'C (Cukup)'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-semibold italic">
                                Belum divalidasi
                              </span>
                            )}
                          </td>

                          {/* Tombol Aksi Guru */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleOpenReview(entry)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                                isPending
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>{isPending ? 'Tinjau & Nilai' : 'Ubah Skor'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Tab 1 */}
            <Pagination
              currentPage={entriesPage}
              totalPages={Math.ceil(filteredEntries.length / entriesPerPage) || 1}
              totalItems={filteredEntries.length}
              itemsPerPage={entriesPerPage}
              onPageChange={setEntriesPage}
              onItemsPerPageChange={setEntriesPerPage}
              itemLabel="jurnal"
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: REKAPITULASI & VERIFIKASI AKUMULASI BULANAN (WAJIB 4X) */}
      {/* ========================================================= */}
      {activeSubTab === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly Control Toolbar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Rekapitulasi Akumulasi Nilai Literasi Bulanan Siswa</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    Target Wajib: 4x / Bulan
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Setiap siswa wajib mengisi 1 jurnal setiap minggu. Verifikasi dan tetapkan nilai akhir akumulasi untuk rapor literasi.
                </p>
              </div>

              {/* Month Selector Dropdown */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto">
                <Calendar className="w-4 h-4 text-slate-500 ml-2" />
                <span className="text-xs font-bold text-slate-600 hidden sm:inline">Periode Bulan:</span>
                <select
                  value={selectedAccumulationMonth}
                  onChange={(e) => setSelectedAccumulationMonth(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 shadow-2xs cursor-pointer"
                >
                  {availableMonths.map((ym) => (
                    <option key={ym} value={ym}>
                      {formatMonthTitle(ym)} {ym === currentMonthKey ? '(Bulan Ini)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Siswa Terdaftar</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{totalStudentsCount}</div>
                <div className="text-[11px] text-slate-500">Semua kelas (10, 11, 12)</div>
              </div>

              <div className="bg-emerald-50/70 rounded-2xl p-3.5 border border-emerald-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Tuntas 4 Minggu (4/4)</div>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">
                  {completedAll4WeeksCount} <span className="text-xs font-semibold text-emerald-800">siswa ({totalStudentsCount > 0 ? Math.round((completedAll4WeeksCount / totalStudentsCount) * 100) : 0}%)</span>
                </div>
                <div className="text-[11px] text-emerald-700">Lengkap 4x setiap minggu</div>
              </div>

              <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Belum Lengkap (&lt; 4)</div>
                <div className="text-2xl font-black text-amber-700 mt-0.5">
                  {incompleteCount} <span className="text-xs font-semibold text-amber-800">siswa</span>
                </div>
                <div className="text-[11px] text-amber-700">Perlu pengingat mingguan</div>
              </div>

              <div className="bg-indigo-50/70 rounded-2xl p-3.5 border border-indigo-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Sudah Diverifikasi Guru</div>
                <div className="text-2xl font-black text-indigo-700 mt-0.5">
                  {verifiedCount} <span className="text-xs font-semibold text-indigo-800">/ {totalStudentsCount}</span>
                </div>
                <div className="text-[11px] text-indigo-700">Rata-rata: {schoolMonthlyAvgScore} / 100 Poin</div>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              {/* Search */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari siswa, NISN, atau rombel..."
                  value={monthlySearch}
                  onChange={(e) => setMonthlySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Grade & Compliance Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                  <span className="px-2 text-slate-400 hidden sm:inline">Jenjang:</span>
                  <button
                    onClick={() => setMonthlyGradeFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      monthlyGradeFilter === 'all' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'hover:text-slate-900'
                    }`}
                  >
                    Semua
                  </button>
                  {(['10', '11', '12'] as JenjangKelas[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setMonthlyGradeFilter(g)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        monthlyGradeFilter === g ? 'bg-white text-indigo-600 shadow-xs font-black' : 'hover:text-slate-900'
                      }`}
                    >
                      Kls {g}
                    </button>
                  ))}
                </div>

                <select
                  value={monthlyComplianceFilter}
                  onChange={(e) => setMonthlyComplianceFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white outline-none"
                >
                  <option value="all">Semua Status Kepatuhan</option>
                  <option value="complete">Tuntas 4/4 Minggu (100%)</option>
                  <option value="incomplete">Belum Lengkap (&lt; 4 Minggu)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Week Selection Toolbar (Pilihan Minggu pada Bulan Ini) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Pilihan Minggu ({formatMonthTitle(selectedAccumulationMonth)}):
                </span>
                <span className="text-[11px] text-slate-500 block sm:inline sm:ml-2">
                  {selectedWeekFilter === 'all'
                    ? 'Menampilkan rekapitulasi gabungan 4 minggu terakumulasi.'
                    : `Menilai jurnal minggu ke-${selectedWeekFilter} (${getWeekPeriodLabel(selectedAccumulationMonth, selectedWeekFilter)}).`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedWeekFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedWeekFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Minggu (Rekap Gabungan)
              </button>
              {([1, 2, 3, 4] as const).map((w) => {
                const filledCount = allMonthlySummaries.filter((s) => {
                  const ws = [s.week1Summary, s.week2Summary, s.week3Summary, s.week4Summary][w - 1];
                  return ws?.hasSubmission;
                }).length;

                return (
                  <button
                    key={w}
                    onClick={() => setSelectedWeekFilter(w)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedWeekFilter === w
                        ? 'bg-indigo-600 text-white shadow-xs font-black ring-2 ring-indigo-300'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>Minggu {w}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      selectedWeekFilter === w ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {filledCount} Siswa
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================= */}
          {/* VIEW A: PENILAIAN BERDASARKAN MINGGUAN (1 NAMA PER MINGGU) */}
          {/* ========================================================= */}
          {selectedWeekFilter !== 'all' ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-indigo-600" />
                    <span>Penilaian Berdasarkan Mingguan: Minggu {selectedWeekFilter}</span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-700">
                      {getWeekPeriodLabel(selectedAccumulationMonth, selectedWeekFilter)}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    1 baris per nama siswa. Menampilkan gabungan jurnal yang diinput siswa pada minggu ini untuk dinilai langsung oleh guru.
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-semibold self-start sm:self-auto">
                  {filteredWeeklySummaries.length} Siswa Terdaftar
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                      <th className="py-3.5 px-4">Siswa</th>
                      <th className="py-3.5 px-3">Jurnal Minggu {selectedWeekFilter}</th>
                      <th className="py-3.5 px-3 text-center">Refleksi Mandiri</th>
                      <th className="py-3.5 px-3 text-center bg-indigo-50/50 text-indigo-900">Nilai Mingguan Guru</th>
                      <th className="py-3.5 px-3 text-center">Status</th>
                      <th className="py-3.5 px-3">Catatan Feedback Guru</th>
                      <th className="py-3.5 px-4 text-center">Aksi Penilaian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredWeeklySummaries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          Tidak ada data siswa yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedWeeklySummaries.map((wSum) => {
                        return (
                          <tr key={wSum.student.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Siswa */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 text-sm">{wSum.student.name}</div>
                              <div className="text-[11px] text-slate-400">
                                {wSum.student.rombel || `Kelas ${wSum.student.kelas}`} • NISN: {wSum.student.nisn || '-'}
                              </div>
                            </td>

                            {/* Jurnal Minggu Ini */}
                            <td className="py-3 px-3">
                              {wSum.hasSubmission ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      {wSum.entriesCount} Jurnal Diinput
                                    </span>
                                  </div>
                                  <div className="font-semibold text-slate-800 line-clamp-1 max-w-[220px]" title={wSum.entries.map((e) => e.bookTitle).join(', ')}>
                                    {wSum.entries[wSum.entries.length - 1].bookTitle}
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                    <span>Tgl: {wSum.entries[wSum.entries.length - 1].date}</span>
                                    <span>• {wSum.entries[wSum.entries.length - 1].durationMinutes} mnt</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-400">
                                  Belum Mengisi Jurnal
                                </span>
                              )}
                            </td>

                            {/* Refleksi Mandiri */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {wSum.hasSubmission ? (
                                <span className="font-black text-slate-800 text-xs">
                                  {wSum.selfReflectionAvg} <span className="text-[10px] text-slate-400 font-normal">/ 20</span>
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            {/* Nilai Mingguan Guru */}
                            <td className="py-3 px-3 text-center whitespace-nowrap bg-indigo-50/20">
                              {wSum.hasSubmission ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                                    wSum.isValidated
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}>
                                    {wSum.weeklyFinalScore} Poin
                                  </span>
                                  <span className="text-[10px] text-slate-400 mt-0.5">
                                    Predikat: <strong>{getPredicateFromScore(wSum.weeklyFinalScore)}</strong>
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {wSum.status === 'sudah_dinilai' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Sudah Dinilai</span>
                                </span>
                              ) : wSum.status === 'menunggu_penilaian' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Menunggu Nilai</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-400">
                                  <span>Belum Mengisi</span>
                                </span>
                              )}
                            </td>

                            {/* Catatan Feedback Guru */}
                            <td className="py-3 px-3">
                              {wSum.feedbackNotes ? (
                                <p className="text-[11px] text-slate-600 italic line-clamp-2 max-w-[200px]" title={wSum.feedbackNotes}>
                                  "{wSum.feedbackNotes}"
                                </p>
                              ) : (
                                <span className="text-slate-300 text-[11px] italic">-</span>
                              )}
                            </td>

                            {/* Aksi Penilaian */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {wSum.hasSubmission ? (
                                <button
                                  onClick={() => handleOpenWeeklyModal(wSum)}
                                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                                    wSum.isValidated
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                                  }`}
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>{wSum.isValidated ? 'Ubah Nilai Minggu Ini' : 'Nilai Minggu Ini'}</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Tidak ada jurnal</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination for View A Weekly Assessment */}
              <Pagination
                currentPage={weeklySumPage}
                totalPages={Math.ceil(filteredWeeklySummaries.length / weeklySumPerPage) || 1}
                totalItems={filteredWeeklySummaries.length}
                itemsPerPage={weeklySumPerPage}
                onPageChange={setWeeklySumPage}
                onItemsPerPageChange={setWeeklySumPerPage}
                itemLabel="siswa"
              />
            </div>
          ) : (
            /* ========================================================= */
            /* VIEW B: GABUNGAN PENILAIAN HASIL INPUTAN SISWA (4 MINGGU) */
            /* ========================================================= */
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3.5 px-4">Siswa</th>
                    <th className="py-3.5 px-3 text-center">Minggu 1 (Tgl 1-7)</th>
                    <th className="py-3.5 px-3 text-center">Minggu 2 (Tgl 8-14)</th>
                    <th className="py-3.5 px-3 text-center">Minggu 3 (Tgl 15-21)</th>
                    <th className="py-3.5 px-3 text-center">Minggu 4 (Tgl 22-akhir)</th>
                    <th className="py-3.5 px-3 text-center">Kelengkapan 4 Minggu</th>
                    <th className="py-3.5 px-3 text-center bg-indigo-50/70 text-indigo-950 font-black">
                      Nilai Final Akhir Bulan (Rata-rata 4 Minggu)
                    </th>
                    <th className="py-3.5 px-3 text-center">Status Rapor</th>
                    <th className="py-3.5 px-4 text-center">Aksi Penilaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredMonthlySummaries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Tidak ada data siswa yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedMonthlySummaries.map((summary) => {
                      const isComplete = summary.completedWeeks >= 4;
                      const isVerified = !!summary.monthlyVerification;

                      const renderWeekCell = (wSum: StudentWeeklySummary | undefined, weekNum: 1 | 2 | 3 | 4) => {
                        if (!wSum || !wSum.hasSubmission) {
                          return (
                            <div className="flex flex-col items-center justify-center p-1">
                              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-400">
                                Belum Ada
                              </span>
                            </div>
                          );
                        }

                        const latestEntry = wSum.entries[wSum.entries.length - 1];
                        const hasLate = wSum.entries.some((e) => e.isLateSubmission);

                        return (
                          <div className="flex flex-col items-center gap-1 py-1 group">
                            <div className="flex items-center gap-1 flex-wrap justify-center">
                              {wSum.isValidated ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                                  {wSum.weeklyFinalScore} Poin
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                  Belum Dinilai
                                </span>
                              )}
                              {hasLate && (
                                <span
                                  className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200"
                                  title="Jurnal diinput susulan setelah tanggal jadwal lewat"
                                >
                                  Susulan
                                </span>
                              )}
                            </div>

                            <div
                              onClick={() => latestEntry && setInspectEntry(latestEntry)}
                              className="text-[10px] text-slate-600 hover:text-indigo-600 truncate max-w-[110px] font-semibold cursor-pointer text-center"
                              title={`${latestEntry?.bookTitle} (Klik untuk lihat rincian jurnal)`}
                            >
                              {latestEntry?.bookTitle || 'Jurnal Terisi'}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenStudentWeeklyModal(summary.student, weekNum)}
                              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs ${
                                wSum.isValidated
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                              title={`Nilai Jurnal Minggu ke-${weekNum} untuk ${summary.student.name}`}
                            >
                              {wSum.isValidated ? `Ubah M${weekNum}` : `Nilai M${weekNum}`}
                            </button>
                          </div>
                        );
                      };

                      return (
                        <tr key={summary.student.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Siswa */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-sm">{summary.student.name}</div>
                            <div className="text-[11px] text-slate-400">
                              {summary.student.rombel || `Kelas ${summary.student.kelas}`} • NISN: {summary.student.nisn || '-'}
                            </div>
                          </td>

                          {/* W1 */}
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            {renderWeekCell(summary.week1Summary, 1)}
                          </td>

                          {/* W2 */}
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            {renderWeekCell(summary.week2Summary, 2)}
                          </td>

                          {/* W3 */}
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            {renderWeekCell(summary.week3Summary, 3)}
                          </td>

                          {/* W4 */}
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            {renderWeekCell(summary.week4Summary, 4)}
                          </td>

                          {/* Kelengkapan */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${
                              isComplete
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : summary.completedWeeks > 0
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {isComplete && <Check className="w-3 h-3 text-emerald-600" />}
                              {summary.completedWeeks} / 4 Minggu ({summary.completedWeeks * 25}%)
                            </span>
                          </td>

                          {/* Nilai Final Akhir Bulan (Rata-rata 4 Minggu) */}
                          <td className="py-3 px-3 text-center whitespace-nowrap bg-indigo-50/30">
                            {summary.calculatedAccumulatedScore > 0 ? (
                              <div className="inline-flex flex-col items-center">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-base font-black text-indigo-700">
                                    {summary.calculatedAccumulatedScore}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-400 text-slate-950 shadow-2xs">
                                    {summary.weeklyBreakdown?.predicate || summary.monthlyVerification?.predicate || 'A'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium mt-0.5" title={summary.weeklyBreakdown?.formula}>
                                  {summary.weeklyBreakdown?.formula || 'Rata-rata 4 Minggu'}
                                </span>
                                {summary.isFullyValidated ? (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-700 bg-emerald-100/90 px-1.5 py-0.2 rounded-md mt-1 border border-emerald-200">
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>Lengkap 4 Mgu Valid</span>
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-semibold text-slate-400 mt-0.5">
                                    {summary.validatedWeeksCount || 0}/4 Mgu Dinilai
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="inline-flex flex-col items-center text-slate-400">
                                <span className="text-sm font-bold">-</span>
                                <span className="text-[10px]">Belum Dinilai</span>
                              </div>
                            )}
                          </td>

                          {/* Status Verifikasi */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isVerified ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Predikat {summary.monthlyVerification?.predicate}</span>
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[110px] mx-auto">
                                  {summary.monthlyVerification?.teacherName.split(',')[0]}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Belum Final</span>
                              </span>
                            )}
                          </td>

                          {/* Aksi Verifikasi & Penilaian */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenStudentWeeklyModal(summary.student, 1)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                                title="Buka penilaian mingguan (Minggu 1, 2, 3, 4) untuk siswa ini"
                              >
                                <Award className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Nilai Per Minggu</span>
                              </button>
                              <button
                                onClick={() => handleOpenMonthlyModal(summary)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                                  isVerified
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
                                }`}
                                title="Verifikasi rapor nilai akumulasi bulanan siswa ini"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>{isVerified ? 'Ubah Rapor' : 'Rapor Akhir'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for View B Monthly Accumulation */}
            <Pagination
              currentPage={monthlySumPage}
              totalPages={Math.ceil(filteredMonthlySummaries.length / monthlySumPerPage) || 1}
              totalItems={filteredMonthlySummaries.length}
              itemsPerPage={monthlySumPerPage}
              onPageChange={setMonthlySumPage}
              onItemsPerPageChange={setMonthlySumPerPage}
              itemLabel="siswa"
            />
          </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 0: PENILAIAN PER MINGGU DARI 1 SISWA (4 MINGGU)     */}
      {/* ========================================================= */}
      {activeStudentForWeeklyModal && currentActiveWeeklyStudentSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 sm:p-7 relative my-8 max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setActiveStudentForWeeklyModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header: Student Info */}
            <div className="mb-4 pr-8">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                  Penilaian Mingguan Siswa
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                  Periode: {formatMonthTitle(selectedAccumulationMonth)}
                </span>
              </div>

              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Penilaian Jurnal: {activeStudentForWeeklyModal.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeStudentForWeeklyModal.rombel || `Kelas ${activeStudentForWeeklyModal.kelas}`} • NISN: {activeStudentForWeeklyModal.nisn || '-'}
              </p>
            </div>

            {/* Rekapitulasi Rata-rata 4 Minggu & Nilai Final Akhir Bulan */}
            <div className="mb-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-900/50 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-indigo-300 block">
                      Nilai Final Akhir Bulan (Rata-rata 4 Minggu)
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-black text-amber-300">
                        {modalMonthlyAverage.score > 0 ? modalMonthlyAverage.score : '-'}
                      </span>
                      <span className="text-xs text-indigo-200 font-semibold">/ 100 Poin</span>
                      {modalMonthlyAverage.score > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 shadow-2xs">
                          Predikat {modalMonthlyAverage.predicate}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-indigo-200 mt-1 font-mono">
                      Perhitungan Rata-rata: {modalMonthlyAverage.formula}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    modalMonthlyAverage.isAll4Validated
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  }`}>
                    {modalMonthlyAverage.isAll4Validated 
                      ? '✓ 4 Minggu Lengkap & Tervalidasi' 
                      : `${modalMonthlyAverage.validatedCount} dari 4 Minggu Dinilai`}
                  </span>
                  {modalMonthlyAverage.isAll4Validated && (
                    <button
                      type="button"
                      onClick={() => {
                        const sumObj = allMonthlySummaries.find((s) => s.student.id === activeStudentForWeeklyModal.id);
                        if (sumObj) handleOpenMonthlyModal(sumObj);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer shadow-xs"
                      title="Tetapkan nilai ini ke rapor verifikasi akhir bulan siswa"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Buka Rapor Akhir Bulan</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs Minggu 1, 2, 3, 4 */}
            <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 mb-6">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
                <span>Pilih Minggu yang Akan Dinilai:</span>
                <span className="text-[10px] text-indigo-600 font-medium">Navigasi antar minggu untuk anak ini</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([1, 2, 3, 4] as const).map((w) => {
                  const wKey = `w${w}` as 'w1' | 'w2' | 'w3' | 'w4';
                  const sumW = studentAll4Weeks ? studentAll4Weeks[wKey] : null;
                  const isSelected = activeModalWeek === w;
                  const hasSub = sumW?.hasSubmission;
                  const isVal = sumW?.isValidated;

                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleSwitchModalWeek(w)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-extrabold text-xs">Minggu {w}</span>
                        {isVal ? (
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                              isSelected ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {sumW?.weeklyFinalScore} P
                          </span>
                        ) : hasSub ? (
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                              isSelected ? 'bg-amber-300 text-amber-950' : 'bg-amber-100 text-amber-900 animate-pulse'
                            }`}
                          >
                            Perlu Nilai
                          </span>
                        ) : (
                          <span
                            className={`text-[9px] font-medium px-1 rounded ${
                              isSelected ? 'text-indigo-200' : 'text-slate-400'
                            }`}
                          >
                            Kosong
                          </span>
                        )}
                      </div>
                      <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {getWeekPeriodLabel(selectedAccumulationMonth, w)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content for Current Active Week */}
            {currentActiveWeeklyStudentSummary.hasSubmission && currentActiveWeeklyStudentSummary.entries.length > 0 ? (
              <>
                {/* List of Journals Submitted in this Week */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span>Rincian Jurnal Minggu {activeModalWeek} ({currentActiveWeeklyStudentSummary.entriesCount} Jurnal Diinput):</span>
                    </h4>
                    {currentActiveWeeklyStudentSummary.isValidated && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Status: Sudah Diberi Nilai ({currentActiveWeeklyStudentSummary.weeklyFinalScore} Poin)
                      </span>
                    )}
                  </div>

                  {currentActiveWeeklyStudentSummary.entries.map((entry: LiteracyEntry) => (
                    <div key={entry.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <img
                            src={entry.photoUrl}
                            alt={entry.bookTitle}
                            className="w-16 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                {entry.literacyType}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                                {entry.readingCategory}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                                <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span>Tgl Baca: <strong>{entry.date}</strong></span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                                <Monitor className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span>Input Sistem: <strong>{formatSystemInputDate(entry.systemInputDate, entry.createdAt, entry.date)}</strong></span>
                                <span className="text-[9px] text-slate-400 font-sans font-bold">(Otomatis Komputer)</span>
                              </span>
                              <span className="text-[10px] text-slate-400">• {entry.durationMinutes} menit</span>
                            </div>
                            <h5 className="font-extrabold text-sm text-slate-900">{entry.bookTitle}</h5>
                            <p className="text-[11px] text-slate-500">Halaman / Juz: {entry.pagesRead}</p>

                            {/* Indikator Input Susulan / Terlambat */}
                            {entry.isLateSubmission && (
                              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <History className="w-3.5 h-3.5 text-amber-700" />
                                <span>Input Susulan (Jadwal Terlewat)</span>
                                {entry.lateReason && (
                                  <span className="text-amber-800 font-normal border-l border-amber-300 pl-1.5">
                                    Alasan: {entry.lateReason}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right sm:self-start bg-white p-2.5 rounded-xl border border-slate-200 shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Skor Refleksi</span>
                          <span className="text-base font-black text-indigo-600">{entry.reflection?.totalScore || 0}</span>
                          <span className="text-[10px] text-slate-400"> / 20</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 text-xs">
                        <div>
                          <span className="font-bold text-slate-700 block mb-0.5">Ringkasan Bacaan:</span>
                          <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80 leading-relaxed text-[11px]">
                            {entry.summary}
                          </p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 block mb-0.5">Nilai Moral / Hikmah:</span>
                          <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80 leading-relaxed text-[11px]">
                            {entry.moralValue}
                          </p>
                        </div>
                      </div>

                      {/* 4 Reflection Answers */}
                      <div className="pt-2 border-t border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          4 Butir Refleksi Karakter Siswa (Skor 1 - 5):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                            <span className="text-slate-400 block">1. Pesan Utama</span>
                            <strong className="text-indigo-600 text-xs">{entry.reflection?.q1 || 5}/5</strong>
                          </div>
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                            <span className="text-slate-400 block">2. Nilai Kebaikan</span>
                            <strong className="text-indigo-600 text-xs">{entry.reflection?.q2 || 5}/5</strong>
                          </div>
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                            <span className="text-slate-400 block">3. Perilaku Positif</span>
                            <strong className="text-indigo-600 text-xs">{entry.reflection?.q3 || 5}/5</strong>
                          </div>
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                            <span className="text-slate-400 block">4. Kesadaran Mandiri</span>
                            <strong className="text-indigo-600 text-xs">{entry.reflection?.q4 || 5}/5</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weekly Scoring & Feedback Form */}
                <form onSubmit={handleSaveWeeklyValidationSubmit} className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                        Kalkulasi Skor Minggu ke-{activeModalWeek} (Maksimal 100)
                      </div>
                      <div className="text-xs text-indigo-700 mt-0.5">
                        Rata-rata Refleksi Siswa: <strong>{currentActiveWeeklyStudentSummary.selfReflectionAvg} / 20 Poin</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-200 text-right">
                        <span className="text-[10px] text-slate-400 font-bold block">Skor Akhir Minggu</span>
                        <span className="text-lg font-black text-indigo-600">
                          {Math.min(100, Math.round(currentActiveWeeklyStudentSummary.selfReflectionAvg + Number(weeklyValidationScore)))}
                        </span>
                        <span className="text-xs text-slate-500"> / 100</span>
                      </div>
                      <span className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-amber-400 text-slate-950">
                        Predikat: {getPredicateFromScore(Math.min(100, Math.round(currentActiveWeeklyStudentSummary.selfReflectionAvg + Number(weeklyValidationScore))))}
                      </span>
                    </div>
                  </div>

                  {/* Skor Validasi Guru (0 - 80) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Nilai Validasi Guru (0 - 80 Poin):
                      </label>
                      <span className="text-xs font-extrabold text-indigo-600">
                        {weeklyValidationScore} Poin
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="1"
                      value={weeklyValidationScore}
                      onChange={(e) => setWeeklyValidationScore(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {[60, 70, 75, 80].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setWeeklyValidationScore(score)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            weeklyValidationScore === score
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {score === 80 ? 'Maksimal (80)' : `${score} Poin`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Catatan Feedback Guru */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Catatan Pembimbingan & Evaluasi Guru Minggu {activeModalWeek}:
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={weeklyFeedbackNotes}
                      onChange={(e) => setWeeklyFeedbackNotes(e.target.value)}
                      placeholder="Berikan umpan balik positif atau penguatan karakter membaca..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />

                    {/* Quick Presets for Feedback Notes */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-semibold">Template Cepat:</span>
                      {[
                        'Ulasan jurnal dan refleksi membaca sangat baik, nilai moral dipahami secara mendalam.',
                        'Konsisten membaca dan menganalisis buku dengan kritis. Pertahankan target mingguan.',
                        'Refleksi karakter sangat relevan dengan kehidupan sehari-hari siswa.',
                      ].map((tpl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setWeeklyFeedbackNotes(tpl)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 cursor-pointer truncate max-w-[200px]"
                          title={tpl}
                        >
                          {tpl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveStudentForWeeklyModal(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Tutup
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      <span>Simpan Penilaian Minggu {activeModalWeek}</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* State when no journals submitted in this week */
              <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Belum Ada Jurnal di Minggu {activeModalWeek}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                  Siswa ini belum menginputkan jurnal membaca untuk periode Minggu {activeModalWeek} ({currentActiveWeeklyStudentSummary.weekLabel}).
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {([1, 2, 3, 4] as const)
                    .filter((w) => {
                      const k = `w${w}` as 'w1' | 'w2' | 'w3' | 'w4';
                      return studentAll4Weeks && studentAll4Weeks[k]?.hasSubmission;
                    })
                    .map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => handleSwitchModalWeek(w)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                      >
                        Buka Minggu {w} (Ada Jurnal)
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => setActiveStudentForWeeklyModal(null)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: REVIEW & PENILAIAN JURNAL MINGGUAN */}
      {/* ========================================================= */}
      {activeReviewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-7 relative my-8">
            <button
              onClick={() => setActiveReviewEntry(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                Penilaian Guru
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                Minggu ke-{activeReviewEntry.weekNumber || getWeekNumberFromDate(activeReviewEntry.date)}
              </span>
              <span className="text-xs text-slate-400">
                {activeReviewEntry.date}
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Validasi & Penilaian Jurnal Siswa
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Siswa: <strong>{activeReviewEntry.studentName}</strong> ({activeReviewEntry.studentRombel}) • NISN: {activeReviewEntry.studentNisn}
            </p>

            {/* Rincian Bacaan */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-5 space-y-3">
              <div className="flex items-start gap-4">
                <img
                  src={activeReviewEntry.photoUrl}
                  alt={activeReviewEntry.bookTitle}
                  className="w-20 h-24 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {activeReviewEntry.literacyType}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      {activeReviewEntry.readingCategory}
                    </span>
                    {activeReviewEntry.isLateSubmission && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <History className="w-3 h-3 text-amber-600" />
                        <span>Susulan {activeReviewEntry.lateReason ? `(${activeReviewEntry.lateReason})` : ''}</span>
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{activeReviewEntry.bookTitle}</h4>
                  <p className="text-xs text-slate-500">
                    Halaman/Juz: {activeReviewEntry.pagesRead} • Durasi: {activeReviewEntry.durationMinutes} menit
                  </p>
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 font-medium pt-1">
                    <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                      <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span>Tgl Membaca: <strong>{activeReviewEntry.date}</strong></span>
                    </span>
                    <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-mono">
                      <Monitor className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span>Input Sistem: <strong>{formatSystemInputDate(activeReviewEntry.systemInputDate, activeReviewEntry.createdAt, activeReviewEntry.date)}</strong></span>
                      <span className="text-[9px] text-slate-400 font-sans font-bold">(Otomatis Komputer)</span>
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Ringkasan Isi Bacaan:
                </span>
                <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                  {activeReviewEntry.summary}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Nilai Kebaikan / Moral yang Dipetik:
                </span>
                <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed italic">
                  "{activeReviewEntry.moralValue}"
                </p>
              </div>
            </div>

            {/* Form Input Validasi Guru */}
            <form onSubmit={handleSaveValidation} className="space-y-4">
              <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-indigo-950">
                      Kolom Validasi & Penilaian Guru (Maksimal 80 Poin)
                    </h4>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      Berikan skor validasi berdasarkan ringkasan, kedalaman pesan moral, dan refleksi siswa.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-indigo-700">
                      {validationScore} <span className="text-xs font-semibold text-slate-400">/ 80</span>
                    </div>
                  </div>
                </div>

                {/* Score slider & input */}
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="1"
                      value={validationScore}
                      onChange={(e) => setValidationScore(Number(e.target.value))}
                      className="w-full h-2.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <input
                      type="number"
                      min="0"
                      max="80"
                      value={validationScore}
                      onChange={(e) => setValidationScore(Math.min(80, Math.max(0, Number(e.target.value))))}
                      className="w-20 px-3 py-1.5 rounded-xl border border-indigo-300 font-black text-base text-indigo-900 text-center bg-white"
                    />
                  </div>

                  {/* Preset Quick Rubrics */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500 font-semibold">Rubrik Cepat:</span>
                    {[80, 75, 70, 60].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setValidationScore(sc)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          validationScore === sc
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                        }`}
                      >
                        {sc} Poin
                      </button>
                    ))}
                  </div>
                </div>

                {/* Catatan / Feedback Guru */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-950 mb-1">
                    Catatan Validasi & Umpan Balik Guru
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Tuliskan apresiasi, masukan, atau motivasi membaca bagi siswa ini..."
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-indigo-200 text-xs sm:text-sm bg-white focus:border-indigo-500 outline-none"
                  />
                </div>

                {/* Calculation Preview Banner */}
                <div className="bg-white rounded-xl p-3.5 border border-indigo-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Refleksi Siswa</span>
                      <span className="text-sm font-black text-emerald-600">{activeReviewEntry.reflection.totalScore} / 20</span>
                    </div>
                    <span className="text-slate-400 font-bold text-lg">+</span>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Validasi Guru</span>
                      <span className="text-sm font-black text-indigo-600">{validationScore} / 80</span>
                    </div>
                    <span className="text-slate-400 font-bold text-lg">=</span>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">TOTAL AKHIR</span>
                      <span className="text-lg font-black text-indigo-900">
                        {activeReviewEntry.reflection.totalScore + Number(validationScore)} / 100
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                      {activeReviewEntry.reflection.totalScore + Number(validationScore) >= 90 ? 'Predikat A' : 'Predikat B'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReviewEntry(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Simpan & Validasi Nilai (Total 100 Poin)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: VERIFIKASI & PENETAPAN NILAI AKUMULASI BULANAN */}
      {/* ========================================================= */}
      {activeMonthlyStudentSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-7 relative my-8">
            <button
              onClick={() => setActiveMonthlyStudentSummary(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700 border border-purple-200">
                Penetapan Nilai Akhir Bulan
              </span>
              <span className="text-xs text-slate-400">
                Periode {formatMonthTitle(selectedAccumulationMonth)}
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Verifikasi Nilai Akumulasi Literasi Siswa
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Siswa: <strong>{activeMonthlyStudentSummary.student.name}</strong> ({activeMonthlyStudentSummary.student.rombel || `Kelas ${activeMonthlyStudentSummary.student.kelas}`}) • NISN: {activeMonthlyStudentSummary.student.nisn || '-'}
            </p>

            {/* 4-Week Review Breakdown Grid */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase text-slate-700">Rincian Jurnal 4 Minggu:</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                  {activeMonthlyStudentSummary.completedWeeks} / 4 Minggu Terisi ({activeMonthlyStudentSummary.completedWeeks * 25}%)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {([1, 2, 3, 4] as const).map((w) => {
                  const entry = [
                    activeMonthlyStudentSummary.week1Entry,
                    activeMonthlyStudentSummary.week2Entry,
                    activeMonthlyStudentSummary.week3Entry,
                    activeMonthlyStudentSummary.week4Entry,
                  ][w - 1];

                  return (
                    <div
                      key={w}
                      className={`p-3 rounded-xl border text-xs ${
                        entry ? 'bg-white border-slate-200' : 'bg-slate-100/70 border-slate-200/80 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-bold">
                        <span>Minggu {w} ({getWeekPeriodLabel(selectedAccumulationMonth, w)})</span>
                        {entry ? (
                          <span className="text-indigo-600 font-black">{getEntryScore(entry)} Poin</span>
                        ) : (
                          <span className="text-rose-500 font-semibold text-[10px]">Kosong</span>
                        )}
                      </div>
                      {entry ? (
                        <div className="mt-1">
                          <div className="text-[11px] text-slate-700 font-bold truncate">
                            {entry.bookTitle}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                            <span>{entry.date} • {entry.readingCategory}</span>
                            <button
                              type="button"
                              onClick={() => setInspectEntry(entry)}
                              className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                            >
                              Lihat
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic mt-0.5">
                          Tidak ada pengiriman jurnal
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick auto apply banner */}
              {activeMonthlyStudentSummary.calculatedAccumulatedScore > 0 && (
                <div className="mt-3.5 flex items-center justify-between p-3 rounded-xl bg-purple-100/70 border border-purple-200 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-700 shrink-0" />
                    <span className="text-xs text-purple-900 font-bold">
                      Rata-rata Terhitung Otomatis: <strong>{activeMonthlyStudentSummary.calculatedAccumulatedScore}</strong> Poin
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMonthlyFinalScore(activeMonthlyStudentSummary.calculatedAccumulatedScore);
                      setMonthlyPredicate(getPredicateFromScore(activeMonthlyStudentSummary.calculatedAccumulatedScore));
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-700 text-white hover:bg-purple-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    Terapkan Nilai Otomatis
                  </button>
                </div>
              )}
            </div>

            {/* Form Input Verifikasi Akumulasi */}
            <form onSubmit={handleSaveMonthlyVerificationSubmit} className="space-y-4">
              <div className="bg-purple-50/60 rounded-2xl p-4 border border-purple-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nilai Akumulasi Akhir Bulan */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-950 mb-1">
                      Nilai Akumulasi Akhir Bulan (0 - 100)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={monthlyFinalScore}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(0, Number(e.target.value)));
                          setMonthlyFinalScore(val);
                          setMonthlyPredicate(getPredicateFromScore(val));
                        }}
                        className="w-full px-3.5 py-2 rounded-xl border border-purple-200 font-black text-lg text-purple-900 bg-white outline-none focus:ring-2 focus:ring-purple-200"
                      />
                      <span className="text-xs font-semibold text-slate-400">/ 100</span>
                    </div>
                  </div>

                  {/* Predikat Mutu Karakter */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-950 mb-1">
                      Predikat Mutu Karakter
                    </label>
                    <select
                      value={monthlyPredicate}
                      onChange={(e) => setMonthlyPredicate(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 font-bold text-sm text-purple-900 bg-white outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer"
                    >
                      <option value="A">Predikat A - Sangat Baik (85 - 100)</option>
                      <option value="B">Predikat B - Baik (75 - 84)</option>
                      <option value="C">Predikat C - Cukup (60 - 74)</option>
                      <option value="D">Predikat D - Perlu Pembinaan (&lt; 60)</option>
                    </select>
                  </div>
                </div>

                {/* Catatan / Feedback Bulanan Guru */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-950 mb-1">
                    Catatan Evaluasi Bulanan & Pembinaan Karakter
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Tuliskan umpan balik evaluasi membaca bulanan bagi siswa ini..."
                    value={monthlyTeacherNotes}
                    onChange={(e) => setMonthlyTeacherNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-purple-200 text-xs sm:text-sm bg-white focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveMonthlyStudentSummary(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-700 text-white hover:bg-purple-800 shadow-md shadow-purple-100 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Simpan & Verifikasi Nilai Bulanan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: INSPEKSI DETAIL JURNAL MINGGUAN (TEACHER VIEW) */}
      {/* ========================================================= */}
      {inspectEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-7 relative my-8">
            <button
              onClick={() => setInspectEntry(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                Detail Jurnal Literasi Siswa
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Tgl Membaca: <strong>{inspectEntry.date}</strong> (Minggu {inspectEntry.weekNumber || getWeekNumberFromDate(inspectEntry.date)})</span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-700 font-medium bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 font-mono">
                <Monitor className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Input Sistem: <strong>{formatSystemInputDate(inspectEntry.systemInputDate, inspectEntry.createdAt, inspectEntry.date)}</strong></span>
                <span className="text-[10px] text-slate-400 font-sans font-bold">(Otomatis Komputer)</span>
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {inspectEntry.bookTitle}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Siswa: <strong>{inspectEntry.studentName}</strong> ({inspectEntry.studentRombel}) • NISN: {inspectEntry.studentNisn}
            </p>

            <div className="space-y-4 text-xs">
              {/* Photo & Basic Info */}
              <div className="flex flex-col sm:flex-row gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                {inspectEntry.photoUrl && (
                  <img
                    src={inspectEntry.photoUrl}
                    alt="Foto Membaca"
                    className="w-full sm:w-32 h-32 object-cover rounded-xl border border-slate-200 shrink-0"
                  />
                )}
                <div className="space-y-1.5 flex-1">
                  <div>
                    <span className="text-slate-400 font-semibold">Jenis & Kategori:</span>
                    <span className="font-bold text-slate-800 ml-1.5">{inspectEntry.literacyType} ({inspectEntry.readingCategory})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Halaman / Ayat:</span>
                    <span className="font-bold text-slate-800 ml-1.5">{inspectEntry.pagesRead || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Durasi Membaca:</span>
                    <span className="font-bold text-slate-800 ml-1.5">{inspectEntry.durationMinutes} Menit</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Diskusi Rekan:</span>
                    <span className="font-bold text-slate-800 ml-1.5">{inspectEntry.peerDiscussion ? 'Ya' : 'Tidak'}</span>
                    {inspectEntry.peerDiscussionNotes && (
                      <span className="text-slate-600 italic block mt-0.5">"{inspectEntry.peerDiscussionNotes}"</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ringkasan */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block mb-1">Ringkasan Bacaan:</span>
                <p className="text-slate-700 leading-relaxed font-normal whitespace-pre-line">{inspectEntry.summary}</p>
              </div>

              {/* Nilai Moral */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block mb-1">Nilai Moral / Hikmah:</span>
                <p className="text-slate-700 leading-relaxed font-normal italic">"{inspectEntry.moralValue}"</p>
              </div>

              {/* Skor Refleksi Siswa */}
              <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-950 block">Refleksi Mandiri Siswa (4 Indikator)</span>
                  <span className="text-[11px] text-emerald-700">Skor kejujuran refleksi diri siswa</span>
                </div>
                <div className="text-lg font-black text-emerald-700">
                  {inspectEntry.reflection?.totalScore || 0} / 20 Poin
                </div>
              </div>

              {/* Skor Validasi Guru jika ada */}
              {inspectEntry.teacherValidation && (
                <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-indigo-950">Validasi Guru: {inspectEntry.teacherValidation.teacherName}</span>
                    <span className="text-sm font-black text-indigo-700">{inspectEntry.teacherValidation.validationScore} / 80 Poin</span>
                  </div>
                  <p className="text-indigo-800 italic">"{inspectEntry.teacherValidation.feedbackNotes}"</p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInspectEntry(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
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
