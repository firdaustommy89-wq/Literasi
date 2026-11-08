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
  Lock,
  GraduationCap,
  ArrowDown,
  RefreshCw,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import { Pagination } from './Pagination';
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
  onPullAllJournalGrades?: () => Promise<any> | void;
  isPullingGrades?: boolean;
  onDeleteEntry?: (entryId: string) => void;
}

export const TeacherValidationView: React.FC<TeacherValidationViewProps> = ({
  currentUser,
  users = [],
  entries,
  monthlyVerifications = [],
  onValidateEntry,
  onSaveMonthlyVerification,
  onExportExcel,
  onPullAllJournalGrades,
  isPullingGrades = false,
  onDeleteEntry,
}) => {
  // Navigation Subtabs: 'monthly' (Tabel Penilaian 4 Minggu per Anak) | 'weekly' (Log Mentah Semua Jurnal)
  const [activeSubTab, setActiveSubTab] = useState<'monthly' | 'weekly'>('monthly');

  // Filters for weekly validation
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedRombel, setSelectedRombel] = useState<string>('all');
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
  const [monthlyRombelFilter, setMonthlyRombelFilter] = useState<string>('all');
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

  // Synchronized search and quick navigation handlers
  const handleUniversalSearchChange = (val: string) => {
    setSearchQuery(val);
    setMonthlySearch(val);
    setEntriesPage(1);
    setMonthlySumPage(1);
    setWeeklySumPage(1);
  };

  const handleQuickGradeSelect = (grade: string) => {
    setSelectedGrade(grade);
    setMonthlyGradeFilter(grade);
    setEntriesPage(1);
    setMonthlySumPage(1);
    setWeeklySumPage(1);
  };

  const scrollToTable = () => {
    const el = document.getElementById('tabel-validasi-guru');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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

  const handleDeleteEntryClick = (entry: LiteracyEntry) => {
    if (!onDeleteEntry) return;
    const confirmMsg = `Yakin ingin menghapus jurnal "${entry.bookTitle}" karya siswa ${entry.studentName} (${entry.studentRombel})?\n\nTindakan ini permanen dan akan menghapus data jurnal dari seluruh perangkat dan server.`;
    if (window.confirm(confirmMsg)) {
      onDeleteEntry(entry.id);
      if (activeReviewEntry?.id === entry.id) {
        setActiveReviewEntry(null);
      }
    }
  };

  const handleSaveValidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReviewEntry) return;

    const numScore = Number(validationScore);
    if (isNaN(numScore) || numScore < 0 || numScore > 80) {
      alert('Validasi Gagal: Skor validasi guru harus berada di rentang 0 sampai 80 poin.');
      return;
    }

    const selfScore = activeReviewEntry.reflection?.totalScore || 0;
    const finalTotal = selfScore + numScore;
    if (finalTotal < 0 || finalTotal > 100) {
      alert('Validasi Gagal: Total nilai literasi siswa (refleksi mandiri + validasi guru) tidak boleh melebihi rentang 0 - 100 poin.');
      return;
    }

    const teacherVal: TeacherValidation = {
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      teacherNip: currentUser.nip,
      validationScore: numScore,
      feedbackNotes: feedbackNotes.trim(),
      validatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: validationStatus,
    };

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

  // Dynamic Grade Counts for Class Filter Buttons (Weekly View)
  const gradeCountsWeekly = useMemo(() => {
    return {
      all: entries.length,
      '10': entries.filter((e) => e.studentKelas === '10').length,
      '11': entries.filter((e) => e.studentKelas === '11').length,
      '12': entries.filter((e) => e.studentKelas === '12').length,
    };
  }, [entries]);

  // Available Rombels for Weekly Log View
  const availableRombelsWeekly = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (selectedGrade === 'all' || e.studentKelas === selectedGrade) {
        if (e.studentRombel) set.add(e.studentRombel);
      }
    });
    return Array.from(set).sort();
  }, [entries, selectedGrade]);

  // Filtered weekly entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedGrade !== 'all' && e.studentKelas !== selectedGrade) return false;
      if (selectedRombel !== 'all' && e.studentRombel !== selectedRombel) return false;
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
        const matchKelas = e.studentKelas?.toLowerCase().includes(q) || `kelas ${e.studentKelas}`.toLowerCase().includes(q);
        const matchCategory = e.readingCategory?.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchBook && !matchRombel && !matchKelas && !matchCategory) return false;
      }

      return true;
    });
  }, [entries, selectedGrade, selectedRombel, selectedType, selectedStatus, selectedWeeklyWeekFilter, searchQuery]);

  const pendingWeeklyCount = useMemo(() => {
    return entries.filter((e) => !e.teacherValidation).length;
  }, [entries]);

  const validatedWeeklyCount = useMemo(() => {
    return entries.filter((e) => !!e.teacherValidation).length;
  }, [entries]);

  // Dynamic Grade Counts for Class Filter Buttons (Monthly View)
  const gradeCountsMonthly = useMemo(() => {
    return {
      all: students.length,
      '10': students.filter((s) => s.kelas === '10').length,
      '11': students.filter((s) => s.kelas === '11').length,
      '12': students.filter((s) => s.kelas === '12').length,
    };
  }, [students]);

  // Available Rombels for Monthly View
  const availableRombelsMonthly = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (monthlyGradeFilter === 'all' || s.kelas === monthlyGradeFilter) {
        if (s.rombel) set.add(s.rombel);
      }
    });
    return Array.from(set).sort();
  }, [students, monthlyGradeFilter]);

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
      if (monthlyRombelFilter !== 'all' && sum.student.rombel !== monthlyRombelFilter) return false;
      if (monthlyComplianceFilter === 'complete' && sum.completedWeeks < 3) return false;
      if (monthlyComplianceFilter === 'incomplete' && sum.completedWeeks >= 3) return false;

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
        const matchKelas = sum.student.kelas?.toLowerCase().includes(q) || `kelas ${sum.student.kelas}`.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchRombel && !matchKelas) return false;
      }
      return true;
    });
  }, [allMonthlySummaries, monthlyGradeFilter, monthlyRombelFilter, monthlyComplianceFilter, selectedWeekFilter, monthlySearch]);

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
      if (monthlyRombelFilter !== 'all' && sum.student.rombel !== monthlyRombelFilter) return false;
      if (monthlyComplianceFilter === 'complete' && !sum.hasSubmission) return false;
      if (monthlyComplianceFilter === 'incomplete' && sum.hasSubmission) return false;
      if (monthlySearch.trim()) {
        const q = monthlySearch.toLowerCase();
        const matchName = sum.student.name.toLowerCase().includes(q);
        const matchNisn = sum.student.nisn?.toLowerCase().includes(q);
        const matchRombel = sum.student.rombel?.toLowerCase().includes(q);
        const matchKelas = sum.student.kelas?.toLowerCase().includes(q) || `kelas ${sum.student.kelas}`.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchRombel && !matchKelas) return false;
      }
      return true;
    });
  }, [allWeeklySummaries, selectedWeekFilter, monthlyGradeFilter, monthlyRombelFilter, monthlyComplianceFilter, monthlySearch]);

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
      return { 
        score: 0, 
        formula: '(0 + 0 + 0 + 0) ÷ 4', 
        componentFormula: 'Jurnal: 0/20 + Validasi Guru: 0/80 = 0/100 Poin',
        avgJournalScore: 0,
        avgTeacherScore: 0,
        validatedCount: 0, 
        completedCount: 0, 
        isAll4Validated: false, 
        predicate: 'D' as const 
      };
    }
    const weeks = [studentAll4Weeks.w1, studentAll4Weeks.w2, studentAll4Weeks.w3, studentAll4Weeks.w4];
    const completedCount = weeks.filter((w) => w.hasSubmission).length;
    const validatedWeeks = weeks.filter((w) => w.hasSubmission && w.isValidated);
    const validatedCount = validatedWeeks.length;
    const isAll4Validated = completedCount >= 4 && validatedCount >= 4;

    const j1 = studentAll4Weeks.w1.hasSubmission ? studentAll4Weeks.w1.selfReflectionAvg : 0;
    const v1 = (studentAll4Weeks.w1.hasSubmission && studentAll4Weeks.w1.isValidated && studentAll4Weeks.w1.teacherValidationScore !== undefined) ? studentAll4Weeks.w1.teacherValidationScore : 0;
    const m1 = studentAll4Weeks.w1.hasSubmission ? (studentAll4Weeks.w1.isValidated ? Math.min(100, Math.round((j1 + v1) * 10) / 10) : j1) : 0;

    const j2 = studentAll4Weeks.w2.hasSubmission ? studentAll4Weeks.w2.selfReflectionAvg : 0;
    const v2 = (studentAll4Weeks.w2.hasSubmission && studentAll4Weeks.w2.isValidated && studentAll4Weeks.w2.teacherValidationScore !== undefined) ? studentAll4Weeks.w2.teacherValidationScore : 0;
    const m2 = studentAll4Weeks.w2.hasSubmission ? (studentAll4Weeks.w2.isValidated ? Math.min(100, Math.round((j2 + v2) * 10) / 10) : j2) : 0;

    const j3 = studentAll4Weeks.w3.hasSubmission ? studentAll4Weeks.w3.selfReflectionAvg : 0;
    const v3 = (studentAll4Weeks.w3.hasSubmission && studentAll4Weeks.w3.isValidated && studentAll4Weeks.w3.teacherValidationScore !== undefined) ? studentAll4Weeks.w3.teacherValidationScore : 0;
    const m3 = studentAll4Weeks.w3.hasSubmission ? (studentAll4Weeks.w3.isValidated ? Math.min(100, Math.round((j3 + v3) * 10) / 10) : j3) : 0;

    const j4 = studentAll4Weeks.w4.hasSubmission ? studentAll4Weeks.w4.selfReflectionAvg : 0;
    const v4 = (studentAll4Weeks.w4.hasSubmission && studentAll4Weeks.w4.isValidated && studentAll4Weeks.w4.teacherValidationScore !== undefined) ? studentAll4Weeks.w4.teacherValidationScore : 0;
    const m4 = studentAll4Weeks.w4.hasSubmission ? (studentAll4Weeks.w4.isValidated ? Math.min(100, Math.round((j4 + v4) * 10) / 10) : j4) : 0;

    const avgJournalScore = Math.round(((j1 + j2 + j3 + j4) / 4) * 10) / 10;
    const avgTeacherScore = Math.round(((v1 + v2 + v3 + v4) / 4) * 10) / 10;

    const sum4Weeks = Math.round((m1 + m2 + m3 + m4) * 10) / 10;
    const score = Math.min(100, Math.round((sum4Weeks / 4) * 10) / 10);
    const formula = `(${m1} + ${m2} + ${m3} + ${m4}) ÷ 4`;
    const componentFormula = `Jurnal: ${avgJournalScore}/20 + Validasi Guru: ${avgTeacherScore}/80 = ${score}/100 Poin`;

    return {
      score,
      formula,
      componentFormula,
      avgJournalScore,
      avgTeacherScore,
      validatedCount,
      completedCount,
      isAll4Validated,
      predicate: getPredicateFromScore(score),
    };
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

    const numScore = Number(weeklyValidationScore);
    if (isNaN(numScore) || numScore < 0 || numScore > 80) {
      alert('Validasi Gagal: Nilai validasi guru harus berada di rentang 0 sampai 80 poin.');
      return;
    }

    const selfAvg = currentActiveWeeklyStudentSummary.selfReflectionAvg || 0;
    const weeklyTotal = Math.round(selfAvg + numScore);
    if (weeklyTotal < 0 || weeklyTotal > 100) {
      alert('Validasi Gagal: Total nilai mingguan siswa tidak boleh melebihi rentang 0 - 100 poin.');
      return;
    }

    const teacherVal: TeacherValidation = {
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      teacherNip: currentUser.nip,
      validationScore: numScore,
      feedbackNotes: weeklyFeedbackNotes.trim(),
      validatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'validated',
    };

    currentActiveWeeklyStudentSummary.entries.forEach((entry) => {
      const selfScore = entry.reflection?.totalScore || 0;
      const totalScore = Math.min(100, Math.max(0, selfScore + numScore));
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
  const eligibleStudentsCount = allMonthlySummaries.filter((s) => s.completedWeeks >= 3).length;
  const completedAll4WeeksCount = allMonthlySummaries.filter((s) => s.completedWeeks >= 4).length;
  const incompleteCount = allMonthlySummaries.filter((s) => s.completedWeeks < 3).length;
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
    // Nilai otomatis dihitung dari rumus: akumulasi mingguan (jika 3 minggu, rata-rata dibagi 3)
    const autoScore = summary.autoAccumulatedScore ?? summary.weeklyBreakdown?.fourWeeksAverage ?? summary.calculatedAccumulatedScore;
    const existing = summary.monthlyVerification;
    if (existing) {
      setMonthlyFinalScore(existing.accumulatedScore);
      setMonthlyPredicate(existing.predicate || getPredicateFromScore(existing.accumulatedScore));
      setMonthlyTeacherNotes(existing.teacherNotes || '');
    } else {
      // Nilai otomatis langsung ditampilkan di input nilai akumulasi akhir bulan
      setMonthlyFinalScore(autoScore);
      setMonthlyPredicate(getPredicateFromScore(autoScore));
      setMonthlyTeacherNotes(
        summary.completedWeeks >= 4
          ? 'Konsisten memenuhi kewajiban literasi 4x mingguan. Karakter disiplin membaca dan tadabur berkembang sangat baik.'
          : summary.completedWeeks === 3
          ? 'Memenuhi syarat kelulusan validasi bulanan dengan 3 minggu jurnal terisi aktif. Refleksi dan pemahaman bacaan terlaksana dengan baik.'
          : `Telah mengumpulkan ${summary.completedWeeks} dari target jurnal bulanan. Diharapkan lebih konsisten melengkapi target di bulan berikutnya.`
      );
    }
  };

  const handleSaveMonthlyVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMonthlyStudentSummary) return;

    const numScore = Number(monthlyFinalScore);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      alert('Validasi Gagal: Nilai akumulasi akhir bulan harus berada di rentang 0 sampai 100 poin sebelum disimpan ke database.');
      return;
    }

    const verification: MonthlyVerification = {
      id: `${activeMonthlyStudentSummary.student.id}_${selectedAccumulationMonth}`,
      studentId: activeMonthlyStudentSummary.student.id,
      studentName: activeMonthlyStudentSummary.student.name,
      studentNisn: activeMonthlyStudentSummary.student.nisn,
      studentKelas: activeMonthlyStudentSummary.student.kelas,
      studentRombel: activeMonthlyStudentSummary.student.rombel,
      monthKey: selectedAccumulationMonth,
      completedWeeks: activeMonthlyStudentSummary.completedWeeks,
      accumulatedScore: numScore,
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
    <div className="max-w-7xl mx-auto py-3 sm:py-4 px-2 sm:px-4 lg:px-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Portal Validasi & Penilaian Guru
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-200">
              Maksimal 100 Poin
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Validasi mingguan isian siswa & tetapkan nilai akumulasi 4 minggu siswa setiap akhir bulan.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onPullAllJournalGrades && (
            <button
              type="button"
              onClick={onPullAllJournalGrades}
              disabled={isPullingGrades}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-black text-xs hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-60 active:scale-95"
              title="Ambil dan hitung akumulasi nilai jurnal dari isian seluruh murid dan guru"
            >
              <RefreshCw className={`w-4 h-4 text-white ${isPullingGrades ? 'animate-spin' : ''}`} />
              <span>{isPullingGrades ? 'Mengambil Nilai...' : 'Ambil Nilai Jurnal dari Isian Seluruh Murid & Guru'}</span>
            </button>
          )}

          <button
            onClick={activeSubTab === 'monthly' ? handleExportMonthlyAccumulation : onExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-blue-950 font-black text-xs hover:bg-amber-300 transition-colors shadow-sm ring-2 ring-amber-300/40 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-950" />
            <span>{activeSubTab === 'monthly' ? 'Ekspor Akumulasi 4 Minggu' : 'Ekspor Nilai ke Excel'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Quick Search & Jump Toolbar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 sm:p-5 shadow-lg text-white mb-6 border border-blue-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="p-1.5 bg-blue-500/20 rounded-lg text-blue-300">
                <Search className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Pencarian Cepat Siswa & Kelas
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 font-semibold ml-auto sm:ml-0">
                {activeSubTab === 'monthly' ? `${filteredMonthlySummaries.length} siswa ditemukan` : `${filteredEntries.length} jurnal ditemukan`}
              </span>
            </div>

            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery || monthlySearch}
                onChange={(e) => handleUniversalSearchChange(e.target.value)}
                placeholder="Cari cepat nama siswa, NISN, atau kelas (misal: Cut Indria, 10-A, Kelas 11)..."
                className="w-full pl-11 pr-10 py-3 rounded-xl bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 placeholder:text-slate-400 border border-white/20 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-sm font-medium transition-all"
              />
              {(searchQuery || monthlySearch) && (
                <button
                  type="button"
                  onClick={() => handleUniversalSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 lg:border-l lg:border-white/10 lg:pl-4">
            <div className="text-xs text-blue-200 font-medium mr-1 hidden sm:inline">Filter Jenjang:</div>
            {(['all', '10', '11', '12'] as const).map((g) => {
              const isActive = (activeSubTab === 'monthly' ? monthlyGradeFilter : selectedGrade) === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleQuickGradeSelect(g)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-blue-950 shadow-md ring-2 ring-amber-300'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {g === 'all' ? 'Semua' : `Kelas ${g}`}
                </button>
              );
            })}

            <button
              type="button"
              onClick={scrollToTable}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm ml-auto cursor-pointer"
            >
              <span>Ke Tabel Hasil</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ATURAN WAJIB LITERASI & SUB-TAB NAVIGATION */}
      {/* ========================================================= */}
      <div id="tabel-validasi-guru" className="bg-white rounded-2xl border border-blue-100 shadow-xs p-3 sm:p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Subtabs Button Group */}
        <div className="flex items-center gap-2 bg-blue-50/70 p-1.5 rounded-xl flex-wrap border border-blue-100">
          <button
            onClick={() => setActiveSubTab('monthly')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'monthly'
                ? 'bg-blue-600 text-white shadow-md font-black shadow-blue-500/20'
                : 'text-slate-600 hover:text-blue-900 hover:bg-white/60'
            }`}
          >
            <Target className="w-4 h-4 text-amber-300" />
            <span>Penilaian 1 Nama Siswa per Bulan (Terkonsolidasi)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-blue-950">
              Wajib 4x
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('weekly')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'weekly'
                ? 'bg-white text-blue-900 shadow-xs font-black border border-blue-200'
                : 'text-slate-600 hover:text-blue-900 hover:bg-white/60'
            }`}
          >
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            <span>Log Mentah Semua Jurnal ({entries.filter((e) => !e.teacherValidation).length} Menunggu)</span>
          </button>
        </div>

        {/* Info Banner Aturan */}
        <div className="text-xs text-slate-600 flex items-center gap-2 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Aturan: Siswa wajib mengisi <strong className="text-blue-950">4 kali/bulan (1x/minggu)</strong>. Nilai diakumulasikan akhir bulan.
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: VALIDASI JURNAL MINGGUAN */}
      {/* ========================================================= */}
      {activeSubTab === 'weekly' && (
        <div className="space-y-6">
          {/* Tombol Filter Kelas Guru (Log Mingguan) */}
          <div className="bg-gradient-to-r from-blue-50/90 via-white to-amber-50/50 p-4 rounded-2xl border border-blue-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <GraduationCap className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-2">
                  <span>Tombol Filter Kelas</span>
                  <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    {selectedGrade === 'all' ? 'Semua Jenjang' : `Kelas ${selectedGrade}`}
                  </span>
                  {selectedRombel !== 'all' && (
                    <span className="text-[10px] font-black text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                      {selectedRombel}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  Pilih tombol kelas di bawah untuk memfilter log jurnal secara instan:
                </div>
              </div>
            </div>

            {/* Tombol Button Group Filter Kelas */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => { setSelectedGrade('all'); setSelectedRombel('all'); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                  selectedGrade === 'all'
                    ? 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-400'
                    : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-900 border border-slate-200'
                }`}
              >
                <span>Semua Kelas</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  selectedGrade === 'all' ? 'bg-amber-400 text-blue-950' : 'bg-slate-100 text-slate-600'
                }`}>
                  {gradeCountsWeekly.all}
                </span>
              </button>

              {(['10', '11', '12'] as JenjangKelas[]).map((grade) => {
                const isActive = selectedGrade === grade;
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => { setSelectedGrade(grade); setSelectedRombel('all'); }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-400'
                        : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-900 border border-slate-200'
                    }`}
                  >
                    <span>Kelas {grade}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-amber-400 text-blue-950' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {gradeCountsWeekly[grade]}
                    </span>
                  </button>
                );
              })}

              {availableRombelsWeekly.length > 0 && (
                <select
                  value={selectedRombel}
                  onChange={(e) => setSelectedRombel(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs font-bold text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-blue-200"
                >
                  <option value="all">Semua Rombel ({availableRombelsWeekly.length})</option>
                  {availableRombelsWeekly.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

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
                {/* Filter Status */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white outline-none cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Menunggu Validasi</option>
                  <option value="validated">Sudah Tervalidasi</option>
                </select>

                {/* Filter Jenis */}
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white outline-none cursor-pointer"
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

                          {/* Tombol Aksi Guru & Admin */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
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
                              {onDeleteEntry && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEntryClick(entry)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-2xs cursor-pointer"
                                  title="Hapus Jurnal Siswa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Hapus</span>
                                </button>
                              )}
                            </div>
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
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Siap Divalidasi (≥ 3 Minggu)</div>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">
                  {eligibleStudentsCount} <span className="text-xs font-semibold text-emerald-800">siswa ({totalStudentsCount > 0 ? Math.round((eligibleStudentsCount / totalStudentsCount) * 100) : 0}%)</span>
                </div>
                <div className="text-[11px] text-emerald-700">Minimal 3 atau 4 minggu terisi</div>
              </div>

              <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Belum Cukup (&lt; 3 Minggu)</div>
                <div className="text-2xl font-black text-amber-700 mt-0.5">
                  {incompleteCount} <span className="text-xs font-semibold text-amber-800">siswa</span>
                </div>
                <div className="text-[11px] text-amber-700">Belum mencapai syarat 3 minggu</div>
              </div>

              <div className="bg-indigo-50/70 rounded-2xl p-3.5 border border-indigo-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Sudah Diverifikasi Guru</div>
                <div className="text-2xl font-black text-indigo-700 mt-0.5">
                  {verifiedCount} <span className="text-xs font-semibold text-indigo-800">/ {totalStudentsCount}</span>
                </div>
                <div className="text-[11px] text-indigo-700">Rata-rata: {schoolMonthlyAvgScore} / 100 Poin</div>
              </div>
            </div>

            {/* Tombol Filter Kelas Guru (Akumulasi Bulanan) */}
            <div className="bg-gradient-to-r from-blue-50/90 via-white to-amber-50/50 p-4 rounded-2xl border border-blue-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <GraduationCap className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-2">
                    <span>Tombol Filter Kelas</span>
                    <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      {monthlyGradeFilter === 'all' ? 'Semua Jenjang' : `Kelas ${monthlyGradeFilter}`}
                    </span>
                    {monthlyRombelFilter !== 'all' && (
                      <span className="text-[10px] font-black text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                        {monthlyRombelFilter}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Pilih tombol kelas di bawah untuk memfilter rekapitulasi siswa secara instan:
                  </div>
                </div>
              </div>

              {/* Tombol Button Group Filter Kelas */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => { setMonthlyGradeFilter('all'); setMonthlyRombelFilter('all'); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                    monthlyGradeFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-400'
                      : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-900 border border-slate-200'
                  }`}
                >
                  <span>Semua Kelas</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    monthlyGradeFilter === 'all' ? 'bg-amber-400 text-blue-950' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {gradeCountsMonthly.all}
                  </span>
                </button>

                {(['10', '11', '12'] as JenjangKelas[]).map((grade) => {
                  const isActive = monthlyGradeFilter === grade;
                  return (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => { setMonthlyGradeFilter(grade); setMonthlyRombelFilter('all'); }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-400'
                          : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-900 border border-slate-200'
                      }`}
                    >
                      <span>Kelas {grade}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-amber-400 text-blue-950' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {gradeCountsMonthly[grade]}
                      </span>
                    </button>
                  );
                })}

                {availableRombelsMonthly.length > 0 && (
                  <select
                    value={monthlyRombelFilter}
                    onChange={(e) => setMonthlyRombelFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs font-bold text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="all">Semua Rombel ({availableRombelsMonthly.length})</option>
                    {availableRombelsMonthly.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Search and Compliance Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              {/* Search */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari siswa, NISN, atau rombel..."
                  value={monthlySearch}
                  onChange={(e) => setMonthlySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 outline-none"
                />
              </div>

              {/* Compliance Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={monthlyComplianceFilter}
                  onChange={(e) => setMonthlyComplianceFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white outline-none cursor-pointer"
                >
                  <option value="all">Semua Status Kepatuhan</option>
                  <option value="complete">Memenuhi Syarat Validasi (≥ 3 - 4 Minggu)</option>
                  <option value="incomplete">Belum Cukup (&lt; 3 Minggu)</option>
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
                    <th className="py-3.5 px-3 text-center bg-blue-50/80 text-blue-950 font-black">
                      Nilai Akumulasi Akhir Bulan
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
                            {(() => {
                              const isFull = summary.completedWeeks >= 4;
                              const isEligible = summary.completedWeeks >= 3;
                              return (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${
                                  isFull
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : isEligible
                                    ? 'bg-teal-100 text-teal-800 border border-teal-300'
                                    : summary.completedWeeks > 0
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  {isEligible && <Check className="w-3 h-3 text-emerald-600" />}
                                  {summary.completedWeeks} / 4 Minggu ({summary.completedWeeks * 25}%{isFull ? ' - Lengkap' : isEligible ? ' - Siap Divalidasi' : ''})
                                </span>
                              );
                            })()}
                          </td>

                          {/* Nilai Akumulasi Akhir Bulan */}
                          <td className="py-3 px-3 text-center whitespace-nowrap bg-blue-50/40 border-x border-blue-100">
                            {(() => {
                              const autoScore = summary.autoAccumulatedScore ?? summary.weeklyBreakdown?.fourWeeksAverage ?? 0;
                              const displayScore = isVerified
                                ? (summary.monthlyVerification?.accumulatedScore ?? autoScore)
                                : autoScore;
                              const currentPredicate = isVerified
                                ? (summary.monthlyVerification?.predicate || getPredicateFromScore(displayScore))
                                : (summary.weeklyBreakdown?.predicate || getPredicateFromScore(displayScore));
                              const w1 = summary.weeklyBreakdown?.w1Score ?? 0;
                              const w2 = summary.weeklyBreakdown?.w2Score ?? 0;
                              const w3 = summary.weeklyBreakdown?.w3Score ?? 0;
                              const w4 = summary.weeklyBreakdown?.w4Score ?? 0;

                              return (
                                <div className="inline-flex flex-col items-center">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-base font-black text-blue-950 font-mono tabular-nums">
                                      {displayScore}
                                    </span>
                                    <span className="text-[10px] text-blue-700 font-bold">Poin</span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-400 text-slate-950 shadow-2xs">
                                      {currentPredicate}
                                    </span>
                                  </div>
                                  {isVerified ? (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded mt-1 border border-emerald-200">
                                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                                      <span>Terverifikasi Guru</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded mt-1 border border-blue-200">
                                      <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                                      <span>Otomatis Terhitung</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
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

                        <div className="text-right sm:self-start bg-white p-2.5 rounded-xl border border-slate-200 shrink-0 flex flex-col items-end">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Skor Refleksi</span>
                            <span className="text-base font-black text-indigo-600">{entry.reflection?.totalScore || 0}</span>
                            <span className="text-[10px] text-slate-400"> / 20</span>
                          </div>
                          {onDeleteEntry && (
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteEntryClick(entry);
                                if (currentActiveWeeklyStudentSummary?.entries?.length === 1) {
                                  setActiveStudentForWeeklyModal(null);
                                }
                              }}
                              className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                              title="Hapus Jurnal Siswa Ini"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus</span>
                            </button>
                          )}
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
                  {(() => {
                    const numWeeklyScore = Number(weeklyValidationScore);
                    const isWeeklyScoreInvalid = isNaN(numWeeklyScore) || numWeeklyScore < 0 || numWeeklyScore > 80;
                    const weeklySelfAvg = currentActiveWeeklyStudentSummary.selfReflectionAvg || 0;
                    const weeklyCalculatedTotal = isWeeklyScoreInvalid ? 0 : Math.round(weeklySelfAvg + numWeeklyScore);
                    const isWeeklyTotalInvalid = isWeeklyScoreInvalid || weeklyCalculatedTotal < 0 || weeklyCalculatedTotal > 100;

                    return (
                      <form onSubmit={handleSaveWeeklyValidationSubmit} className="space-y-4 pt-4 border-t border-slate-200">
                        <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                              Kalkulasi Skor Minggu ke-{activeModalWeek} (Maksimal 100)
                            </div>
                            <div className="text-xs text-indigo-700 mt-0.5">
                              Rata-rata Refleksi Siswa: <strong>{weeklySelfAvg} / 20 Poin</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-200 text-right">
                              <span className="text-[10px] text-slate-400 font-bold block">Skor Akhir Minggu</span>
                              <span className={`text-lg font-black ${isWeeklyTotalInvalid ? 'text-rose-600' : 'text-indigo-600'}`}>
                                {isWeeklyTotalInvalid ? '-' : Math.min(100, weeklyCalculatedTotal)}
                              </span>
                              <span className="text-xs text-slate-500"> / 100</span>
                            </div>
                            <span className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-amber-400 text-slate-950">
                              Predikat: {isWeeklyTotalInvalid ? '-' : getPredicateFromScore(Math.min(100, weeklyCalculatedTotal))}
                            </span>
                          </div>
                        </div>

                        {/* Skor Validasi Guru (0 - 80) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              Nilai Validasi Guru (0 - 80 Poin):
                            </label>
                            <span className={`text-xs font-extrabold ${isWeeklyScoreInvalid ? 'text-rose-600' : 'text-indigo-600'}`}>
                              {isNaN(numWeeklyScore) ? 0 : numWeeklyScore} / 80 Poin
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max="80"
                              step="1"
                              value={isNaN(numWeeklyScore) ? 0 : Math.min(80, Math.max(0, numWeeklyScore))}
                              onChange={(e) => setWeeklyValidationScore(Number(e.target.value))}
                              className="w-full h-2.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min="0"
                                max="80"
                                value={weeklyValidationScore}
                                onChange={(e) => setWeeklyValidationScore(e.target.value === '' ? ('' as any) : Number(e.target.value))}
                                className={`w-20 px-2.5 py-1.5 rounded-xl border font-black text-sm text-center outline-none ${
                                  isWeeklyScoreInvalid
                                    ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-200'
                                    : 'border-indigo-300 bg-white text-indigo-900 focus:border-indigo-500'
                                }`}
                              />
                              <span className="text-xs font-bold text-slate-500">/ 80</span>
                            </div>
                          </div>

                          {/* Inline Validation Warning */}
                          {isWeeklyScoreInvalid && (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>
                                <strong>Skor tidak valid!</strong> Skor guru harus berada dalam rentang <strong>0 - 80 poin</strong> sebelum dapat disimpan ke database.
                              </span>
                            </div>
                          )}

                          {/* Quick Presets */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {[60, 70, 75, 80].map((score) => (
                              <button
                                key={score}
                                type="button"
                                onClick={() => setWeeklyValidationScore(score)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  numWeeklyScore === score
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
                            disabled={isWeeklyTotalInvalid}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isWeeklyTotalInvalid
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'
                            }`}
                          >
                            <Award className="w-4 h-4" />
                            <span>Simpan Penilaian Minggu {activeModalWeek}</span>
                          </button>
                        </div>
                      </form>
                    );
                  })()}
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
            {(() => {
              const numValScore = Number(validationScore);
              const isSingleScoreInvalid = isNaN(numValScore) || numValScore < 0 || numValScore > 80;
              const selfScore = activeReviewEntry.reflection?.totalScore || 0;
              const singleTotal = isSingleScoreInvalid ? selfScore : (selfScore + numValScore);
              const isSingleTotalInvalid = isSingleScoreInvalid || singleTotal < 0 || singleTotal > 100;

              return (
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
                          {isNaN(numValScore) ? 0 : numValScore} <span className="text-xs font-semibold text-slate-400">/ 80</span>
                        </div>
                      </div>
                    </div>

                    {/* Score slider & input */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="80"
                          step="1"
                          value={isNaN(numValScore) ? 0 : Math.min(80, Math.max(0, numValScore))}
                          onChange={(e) => setValidationScore(Number(e.target.value))}
                          className="w-full h-2.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="80"
                            value={validationScore}
                            onChange={(e) => setValidationScore(e.target.value === '' ? ('' as any) : Number(e.target.value))}
                            className={`w-24 px-3 py-1.5 rounded-xl border font-black text-base text-center outline-none ${
                              isSingleScoreInvalid
                                ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-200'
                                : 'border-indigo-300 font-black text-indigo-900 bg-white focus:border-indigo-500'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-500">/ 80</span>
                        </div>
                      </div>

                      {/* Inline Error Message */}
                      {isSingleScoreInvalid && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            <strong>Skor tidak valid!</strong> Skor validasi guru harus berada dalam rentang <strong>0 - 80 poin</strong> (Total nilai siswa maksimal 100 poin).
                          </span>
                        </div>
                      )}

                      {/* Preset Quick Rubrics */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500 font-semibold">Rubrik Cepat:</span>
                        {[80, 75, 70, 60].map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => setValidationScore(sc)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              numValScore === sc
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                            }`}
                          >
                            {sc} Poin
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pilihan Status Validasi: Disetujui vs Perlu Perbaikan */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-950 mb-1.5">
                        Status Validasi Jurnal:
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setValidationStatus('validated')}
                          className={`p-2.5 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            validationStatus === 'validated'
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Disetujui</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setValidationStatus('needs_revision');
                            if (!feedbackNotes || feedbackNotes.includes('sangat baik')) {
                              setFeedbackNotes('Mohon perbaiki ringkasan dan kedalaman pesan moral sebelum divalidasi kembali.');
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            validationStatus === 'needs_revision'
                              ? 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-300'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50'
                          }`}
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span>Perlu Perbaikan</span>
                        </button>
                      </div>
                    </div>

                    {/* Catatan / Feedback Guru */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-950 mb-1">
                        {validationStatus === 'needs_revision' ? 'Catatan Perbaikan dari Guru (Wajib)' : 'Catatan Validasi & Umpan Balik Guru'}
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
                          <span className="text-sm font-black text-emerald-600">{selfScore} / 20</span>
                        </div>
                        <span className="text-slate-400 font-bold text-lg">+</span>
                        <div className="text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Validasi Guru</span>
                          <span className={`text-sm font-black ${isSingleScoreInvalid ? 'text-rose-600' : 'text-indigo-600'}`}>
                            {isNaN(numValScore) ? 0 : numValScore} / 80
                          </span>
                        </div>
                        <span className="text-slate-400 font-bold text-lg">=</span>
                        <div className="text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">TOTAL AKHIR</span>
                          <span className={`text-lg font-black ${isSingleTotalInvalid ? 'text-rose-600' : 'text-indigo-900'}`}>
                            {isSingleTotalInvalid ? '-' : singleTotal} / 100
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${
                          isSingleTotalInvalid
                            ? 'bg-rose-100 text-rose-800'
                            : singleTotal >= 90
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {isSingleTotalInvalid ? 'Skor Tidak Valid' : singleTotal >= 90 ? 'Predikat A' : 'Predikat B'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Modal Buttons */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    {onDeleteEntry && (
                      <button
                        type="button"
                        onClick={() => handleDeleteEntryClick(activeReviewEntry)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Hapus Jurnal Siswa Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Hapus Jurnal</span>
                      </button>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setActiveReviewEntry(null)}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSingleTotalInvalid}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          isSingleTotalInvalid
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Simpan & Validasi Nilai (Total 100 Poin)</span>
                      </button>
                    </div>
                  </div>
                </form>
              );
            })()}
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
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <span className="text-xs font-black uppercase text-slate-700">Rincian Jurnal 4 Minggu:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  activeMonthlyStudentSummary.completedWeeks >= 4
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : activeMonthlyStudentSummary.completedWeeks >= 3
                    ? 'bg-teal-100 text-teal-800 border border-teal-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {activeMonthlyStudentSummary.completedWeeks >= 3 ? '✓ ' : ''}
                  {activeMonthlyStudentSummary.completedWeeks} / 4 Minggu Terisi ({activeMonthlyStudentSummary.completedWeeks * 25}%
                  {activeMonthlyStudentSummary.completedWeeks >= 4 ? ' - Lengkap' : activeMonthlyStudentSummary.completedWeeks >= 3 ? ' - Syarat Validasi Terpenuhi' : ''})
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
              {(() => {
                const autoScore = activeMonthlyStudentSummary.autoAccumulatedScore ?? activeMonthlyStudentSummary.weeklyBreakdown?.fourWeeksAverage ?? activeMonthlyStudentSummary.calculatedAccumulatedScore;
                const w1 = activeMonthlyStudentSummary.weeklyBreakdown?.w1Score ?? 0;
                const w2 = activeMonthlyStudentSummary.weeklyBreakdown?.w2Score ?? 0;
                const w3 = activeMonthlyStudentSummary.weeklyBreakdown?.w3Score ?? 0;
                const w4 = activeMonthlyStudentSummary.weeklyBreakdown?.w4Score ?? 0;

                return (
                  <div className="mt-3.5 p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-amber-50/60 to-blue-50 border-2 border-blue-200">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider text-blue-950">
                          Nilai Akumulasi Akhir Bulan:
                        </span>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-blue-950 border border-amber-300 shadow-2xs">
                        Nilai Terhitung: {autoScore} Poin (Predikat {getPredicateFromScore(autoScore)})
                      </span>
                    </div>

                    {activeMonthlyStudentSummary.completedWeeks === 3 && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-teal-100/80 border border-teal-300 text-teal-950 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 text-teal-700 shrink-0" />
                        <span>
                          <strong>Ketentuan 3 Minggu Terpenuhi:</strong> Siswa memenuhi syarat validasi bulanan. Nilai dihitung adil dari rata-rata 3 minggu yang diisi: <strong>{activeMonthlyStudentSummary.weeklyBreakdown?.formula || '(M1 + M2 + M3) ÷ 3'} = {autoScore} Poin</strong>.
                        </span>
                      </div>
                    )}

                    <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] text-blue-900 font-medium">
                        Rumus: <strong>{activeMonthlyStudentSummary.weeklyBreakdown?.formula}</strong>. Nilai otomatis langsung diterapkan ke input di bawah.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMonthlyFinalScore(autoScore);
                          setMonthlyPredicate(getPredicateFromScore(autoScore));
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                      >
                        Terapkan Nilai Otomatis ({autoScore})
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Form Input Verifikasi Akumulasi (Blue & Gold Frame) */}
            <form onSubmit={handleSaveMonthlyVerificationSubmit} className="space-y-4">
              <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nilai Akumulasi Akhir Bulan */}
                  <div>
                    {(() => {
                      const autoScore = activeMonthlyStudentSummary.autoAccumulatedScore ?? activeMonthlyStudentSummary.weeklyBreakdown?.fourWeeksAverage ?? activeMonthlyStudentSummary.calculatedAccumulatedScore;
                      const numMonthlyScore = Number(monthlyFinalScore);
                      const isMonthlyScoreInvalid = isNaN(numMonthlyScore) || numMonthlyScore < 0 || numMonthlyScore > 100;

                      return (
                        <>
                          <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                            <label className="text-xs font-black uppercase tracking-wider text-blue-950">
                              Nilai Akumulasi Akhir Bulan (0 - 100)
                            </label>
                            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-blue-950 border border-amber-300">
                              <Sparkles className="w-3 h-3 text-blue-950" />
                              <span>Otomatis: {autoScore} Poin</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              required
                              value={monthlyFinalScore}
                              onChange={(e) => {
                                const val = e.target.value === '' ? ('' as any) : Number(e.target.value);
                                setMonthlyFinalScore(val);
                                if (typeof val === 'number' && !isNaN(val) && val >= 0 && val <= 100) {
                                  setMonthlyPredicate(getPredicateFromScore(val));
                                }
                              }}
                              className={`w-full px-3.5 py-2.5 rounded-xl border-2 font-black text-xl outline-none shadow-xs ${
                                isMonthlyScoreInvalid
                                  ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-200'
                                  : 'border-blue-300 text-blue-950 bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-600'
                              }`}
                            />
                            <span className="text-sm font-bold text-slate-500 shrink-0">/ 100 Poin</span>
                          </div>

                          {/* Inline Validation Warning if out of bounds */}
                          {isMonthlyScoreInvalid && (
                            <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>
                                <strong>Skor tidak valid!</strong> Skor yang dimasukkan ({monthlyFinalScore}) berada di luar batas. Nilai akumulasi akhir bulan harus berada dalam rentang <strong>0 - 100 poin</strong> sebelum dapat disimpan ke database.
                              </span>
                            </div>
                          )}

                          {/* Status helper apakah nilai masih otomatis atau sudah diedit manual */}
                          {!isMonthlyScoreInvalid && (
                            <div className="mt-1.5">
                              {monthlyFinalScore === autoScore ? (
                                <p className="text-[11px] text-blue-800 font-semibold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>Nilai otomatis telah diterapkan. Anda dapat mengedit angka jika perlu.</span>
                                </p>
                              ) : (
                                <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                                  <span className="text-amber-900 font-bold bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
                                    ✎ Nilai telah disesuaikan manual (Otomatis: {autoScore} Poin)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMonthlyFinalScore(autoScore);
                                      setMonthlyPredicate(getPredicateFromScore(autoScore));
                                    }}
                                    className="text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                                  >
                                    Reset ke Otomatis ({autoScore})
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Predikat Mutu Karakter */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-blue-950 mb-1">
                      Predikat Mutu Karakter
                    </label>
                    <select
                      value={monthlyPredicate}
                      onChange={(e) => setMonthlyPredicate(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 font-bold text-sm text-blue-950 bg-white outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-600 cursor-pointer"
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
                  <label className="block text-xs font-black uppercase tracking-wider text-blue-950 mb-1">
                    Catatan Evaluasi Bulanan & Pembinaan Karakter
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Tuliskan umpan balik evaluasi membaca bulanan bagi siswa ini..."
                    value={monthlyTeacherNotes}
                    onChange={(e) => setMonthlyTeacherNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-blue-200 text-xs sm:text-sm bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>

              {/* Action buttons */}
              {(() => {
                const numScore = Number(monthlyFinalScore);
                const isInvalid = isNaN(numScore) || numScore < 0 || numScore > 100;
                return (
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
                      disabled={isInvalid}
                      className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        isInvalid
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-amber-300" />
                      <span>Simpan & Verifikasi Nilai Bulanan</span>
                    </button>
                  </div>
                );
              })()}
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
