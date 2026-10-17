import React, { useState, useMemo } from 'react';
import { 
  User, 
  JenjangKelas, 
  LiteracyEntry, 
  JenisLiterasi, 
  MonthlyVerification, 
  StudentMonthlyAccumulationSummary,
  StudentWeeklySummary,
  TeacherValidation
} from '../types';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { 
  Upload, 
  FileSpreadsheet, 
  UserPlus, 
  Users, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  ShieldCheck,
  Search,
  FileText,
  Pencil,
  BookOpen,
  X,
  Check,
  Clock,
  Award,
  Target,
  Calendar,
  UserCheck,
  Sparkles,
  ChevronRight,
  Eye,
  FileCheck2
} from 'lucide-react';
import { Pagination } from './Pagination';
import { StatisticsDashboard } from './StatisticsDashboard';
import { 
  getWeekNumberFromDate, 
  getWeekPeriodLabel, 
  MONTH_NAMES_ID, 
  getEntryScore,
  getAllStudentsMonthlySummary,
  getAllStudentsWeeklySummary,
  calculateStudentWeeklySummary,
  getPredicateFromScore
} from '../utils/accumulation';

interface AdminUploadViewProps {
  currentUser: User;
  users: User[];
  entries: LiteracyEntry[];
  monthlyVerifications?: MonthlyVerification[];
  onAddUsers: (newUsers: User[]) => void;
  onUpdateUser?: (updatedUser: User) => void;
  onDeleteUser: (userId: string) => void;
  onDeleteBatchUsers?: (userIds: string[]) => void;
  onUpdateEntry?: (entryId: string, updates: Partial<LiteracyEntry>) => void;
  onDeleteEntry?: (entryId: string) => void;
  onValidateEntry?: (entryId: string, validation: TeacherValidation, totalScore: number) => void;
  onSaveMonthlyVerification?: (verification: MonthlyVerification) => void;
  onExportExcel: () => void;
}

export const AdminUploadView: React.FC<AdminUploadViewProps> = ({
  currentUser,
  users,
  entries,
  monthlyVerifications = [],
  onAddUsers,
  onUpdateUser,
  onDeleteUser,
  onDeleteBatchUsers,
  onUpdateEntry,
  onDeleteEntry,
  onValidateEntry,
  onSaveMonthlyVerification,
  onExportExcel,
}) => {
  // Tabs: 'monthly-assessment' | 'users' | 'entries' | 'upload' | 'manual'
  const [activeSubTab, setActiveSubTab] = useState<'monthly-assessment' | 'users' | 'entries' | 'upload' | 'manual'>('monthly-assessment');

  // File upload state
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [parsedPreview, setParsedPreview] = useState<User[]>([]);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Manual single add form
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newNisn, setNewNisn] = useState('');
  const [newKelas, setNewKelas] = useState<JenjangKelas>('10');
  const [newRombel, setNewRombel] = useState('X MIPA 1');
  const [newRole, setNewRole] = useState<'siswa' | 'guru'>('siswa');
  const [newPassword, setNewPassword] = useState('password123');

  // Quick Paste state
  const [pasteContent, setPasteContent] = useState('');

  // Search filter for users
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Bulk Selection State for Users
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Search & filter for entries
  const [entrySearch, setEntrySearch] = useState('');
  const [entryGradeFilter, setEntryGradeFilter] = useState('all');
  const [entryTypeFilter, setEntryTypeFilter] = useState('all');

  // Modal Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'siswa' | 'guru' | 'admin'>('siswa');
  const [editUserNisn, setEditUserNisn] = useState('');
  const [editUserNip, setEditUserNip] = useState('');
  const [editUserKelas, setEditUserKelas] = useState<JenjangKelas>('10');
  const [editUserRombel, setEditUserRombel] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');

  // Modal Edit Entry State
  const [editingEntry, setEditingEntry] = useState<LiteracyEntry | null>(null);
  const [editEntryBookTitle, setEditEntryBookTitle] = useState('');
  const [editEntryCategory, setEditEntryCategory] = useState('');
  const [editEntryType, setEditEntryType] = useState<JenisLiterasi>('Non Mapel');
  const [editEntryPages, setEditEntryPages] = useState('');
  const [editEntryDuration, setEditEntryDuration] = useState(30);
  const [editEntrySummary, setEditEntrySummary] = useState('');
  const [editEntryMoral, setEditEntryMoral] = useState('');
  const [editEntrySelfScore, setEditEntrySelfScore] = useState(20);
  const [editEntryTeacherScore, setEditEntryTeacherScore] = useState(75);
  const [editEntryTeacherNotes, setEditEntryTeacherNotes] = useState('');

  // =========================================================
  // MONTHLY CONSOLIDATED ASSESSMENT STATE & HELPERS (ADMIN)
  // =========================================================
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedAccumulationMonth, setSelectedAccumulationMonth] = useState<string>(currentMonthKey);
  const [monthlySearch, setMonthlySearch] = useState<string>('');
  const [monthlyGradeFilter, setMonthlyGradeFilter] = useState<string>('all');
  const [monthlyComplianceFilter, setMonthlyComplianceFilter] = useState<'all' | 'complete' | 'incomplete'>('all');

  // Week Selection state on monthly view: 'all' | 1 | 2 | 3 | 4
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<'all' | 1 | 2 | 3 | 4>('all');

  // Modal Weekly Assessment State (Admin)
  const [activeWeeklyStudentSummary, setActiveWeeklyStudentSummary] = useState<StudentWeeklySummary | null>(null);
  const [weeklyValidationScore, setWeeklyValidationScore] = useState<number>(75);
  const [weeklyFeedbackNotes, setWeeklyFeedbackNotes] = useState<string>('');

  // Modal Monthly Verification State
  const [activeMonthlyStudentSummary, setActiveMonthlyStudentSummary] = useState<StudentMonthlyAccumulationSummary | null>(null);
  const [inspectJournalEntry, setInspectJournalEntry] = useState<LiteracyEntry | null>(null);
  const [monthlyFinalScore, setMonthlyFinalScore] = useState<number>(85);
  const [monthlyPredicate, setMonthlyPredicate] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [monthlyTeacherNotes, setMonthlyTeacherNotes] = useState<string>('');

  // Pagination states for 1-Page Layout (Admin)
  const [usersPage, setUsersPage] = useState<number>(1);
  const [usersPerPage, setUsersPerPage] = useState<number>(8);

  const [entriesPage, setEntriesPage] = useState<number>(1);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(8);

  const [adminWeeklyPage, setAdminWeeklyPage] = useState<number>(1);
  const [adminWeeklyPerPage, setAdminWeeklyPerPage] = useState<number>(8);

  const [adminMonthlyPage, setAdminMonthlyPage] = useState<number>(1);
  const [adminMonthlyPerPage, setAdminMonthlyPerPage] = useState<number>(8);

  const studentUsers = useMemo(() => {
    return users.filter((u) => u.role === 'siswa');
  }, [users]);

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

  const allMonthlySummaries = useMemo(() => {
    return getAllStudentsMonthlySummary(
      studentUsers,
      selectedAccumulationMonth,
      entries,
      monthlyVerifications
    );
  }, [studentUsers, selectedAccumulationMonth, entries, monthlyVerifications]);

  const filteredMonthlySummaries = useMemo(() => {
    return allMonthlySummaries.filter((sum) => {
      if (monthlyGradeFilter !== 'all' && sum.student.kelas !== monthlyGradeFilter) return false;
      if (monthlyComplianceFilter === 'complete' && sum.completedWeeks < 4) return false;
      if (monthlyComplianceFilter === 'incomplete' && sum.completedWeeks >= 4) return false;

      if (monthlySearch.trim()) {
        const q = monthlySearch.toLowerCase();
        const matchName = sum.student.name.toLowerCase().includes(q);
        const matchNisn = sum.student.nisn?.toLowerCase().includes(q);
        const matchRombel = sum.student.rombel?.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchRombel) return false;
      }
      return true;
    });
  }, [allMonthlySummaries, monthlyGradeFilter, monthlyComplianceFilter, monthlySearch]);

  // All weekly summaries when a specific week is chosen (Admin)
  const allWeeklySummaries = useMemo(() => {
    if (selectedWeekFilter === 'all') return [];
    return getAllStudentsWeeklySummary(
      studentUsers,
      selectedAccumulationMonth,
      selectedWeekFilter,
      entries
    );
  }, [studentUsers, selectedAccumulationMonth, selectedWeekFilter, entries]);

  // Filtered weekly summaries (Admin)
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

  // Open modal for weekly assessment (Admin)
  const handleOpenWeeklyModal = (sum: StudentWeeklySummary) => {
    setActiveWeeklyStudentSummary(sum);
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
    if (!activeWeeklyStudentSummary || activeWeeklyStudentSummary.entries.length === 0) return;

    const teacherVal: TeacherValidation = {
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      teacherNip: currentUser.nip,
      validationScore: Number(weeklyValidationScore),
      feedbackNotes: weeklyFeedbackNotes.trim(),
      validatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'validated',
    };

    activeWeeklyStudentSummary.entries.forEach((entry) => {
      const selfScore = entry.reflection?.totalScore || 0;
      const totalScore = Math.min(100, selfScore + Number(weeklyValidationScore));
      if (onValidateEntry) {
        onValidateEntry(entry.id, teacherVal, totalScore);
      } else if (onUpdateEntry) {
        onUpdateEntry(entry.id, {
          teacherValidation: teacherVal,
          totalFinalScore: totalScore,
        });
      }
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

    setActiveWeeklyStudentSummary(null);
  };

  const totalStudentsCount = studentUsers.length;
  const completedAll4WeeksCount = allMonthlySummaries.filter((s) => s.completedWeeks >= 4).length;
  const incompleteCount = totalStudentsCount - completedAll4WeeksCount;
  const verifiedCount = allMonthlySummaries.filter((s) => !!s.monthlyVerification).length;

  const schoolMonthlyAvgScore = useMemo(() => {
    const scoredList = allMonthlySummaries.filter((s) => s.calculatedAccumulatedScore > 0);
    if (scoredList.length === 0) return 0;
    const sum = scoredList.reduce((acc, c) => acc + c.calculatedAccumulatedScore, 0);
    return Math.round((sum / scoredList.length) * 10) / 10;
  }, [allMonthlySummaries]);

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
          ? 'Konsisten memenuhi kewajiban literasi 4x mingguan. Disiplin membaca dan nilai karakter berkembang sangat baik.'
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
          'Skor Validasi Guru / Admin': s.teacherValidationScore ?? '-',
          'Nilai Akhir Mingguan': s.hasSubmission ? s.weeklyFinalScore : 0,
          'Predikat': s.hasSubmission ? getPredicateFromScore(s.weeklyFinalScore) : '-',
          'Status Penilaian': s.status === 'sudah_dinilai' ? 'Sudah Dinilai' : s.status === 'menunggu_penilaian' ? 'Menunggu Penilaian' : 'Belum Mengisi',
          'Catatan Feedback': s.feedbackNotes || '-',
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
        'Total Jurnal Masuk': s.totalEntriesInMonth,
        'Kelengkapan': `${s.completedWeeks} / 4 Minggu (${s.completedWeeks * 25}%)`,
        'Nilai Akumulasi Akhir': s.calculatedAccumulatedScore,
        'Predikat': s.monthlyVerification?.predicate || getPredicateFromScore(s.calculatedAccumulatedScore),
        'Status Verifikasi': s.monthlyVerification ? 'Terverifikasi' : 'Belum Diverifikasi',
        'Penilai': s.monthlyVerification?.teacherName || '-',
        'Catatan Pembinaan': s.monthlyVerification?.teacherNotes || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Akumulasi Bulanan Siswa');
    XLSX.writeFile(wb, `Rekap_Akumulasi_Literasi_Bulanan_${selectedAccumulationMonth}.xlsx`);
  };

  // Download sample template CSV
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'NISN': '0071234599',
        'Nama Lengkap': 'Budi Santoso',
        'Jenjang Kelas': '10',
        'Rombel': 'X MIPA 3',
        'Username': 'budi.santoso',
        'Password': 'password123',
        'Peran': 'siswa',
      },
      {
        'NISN': '0061234599',
        'Nama Lengkap': 'Dewi Sartika',
        'Jenjang Kelas': '11',
        'Rombel': 'XI IPS 2',
        'Username': 'dewi.sartika',
        'Password': 'password123',
        'Peran': 'siswa',
      },
      {
        'NISN': '0051234599',
        'Nama Lengkap': 'Ahmad Dahlan',
        'Jenjang Kelas': '12',
        'Rombel': 'XII MIPA 3',
        'Username': 'ahmad.dahlan',
        'Password': 'password123',
        'Peran': 'siswa',
      },
      {
        'NISN': '199001012015011001',
        'Nama Lengkap': 'Bambang Sutejo, S.Pd',
        'Jenjang Kelas': '-',
        'Rombel': 'Guru Pembina',
        'Username': 'pak.bambang',
        'Password': 'password123',
        'Peran': 'guru',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    XLSX.writeFile(wb, 'Format_Import_Data_Siswa_Literasi.xlsx');
  };

  // Process file upload (Excel or CSV)
  const processUploadedFile = (file: File) => {
    setUploadStatusMsg(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        if (!json || json.length === 0) {
          setUploadStatusMsg({ type: 'error', text: 'File tidak memuat baris data yang valid.' });
          return;
        }

        const mappedUsers: User[] = json.map((row, idx) => {
          const nisn = String(row['NISN'] || row['nisn'] || '').trim();
          const name = String(row['Nama Lengkap'] || row['Nama'] || row['nama'] || `Siswa Baru ${idx + 1}`).trim();
          const kelasRaw = String(row['Jenjang Kelas'] || row['Kelas'] || row['kelas'] || '10').replace(/\D/g, '');
          const kelas = (kelasRaw === '11' ? '11' : kelasRaw === '12' ? '12' : '10') as JenjangKelas;
          const rombel = String(row['Rombel'] || row['rombel'] || `Kelas ${kelas}`).trim();
          const username = String(row['Username'] || row['username'] || `user_${Date.now()}_${idx}`).trim();
          const password = String(row['Password'] || row['password'] || 'password123').trim();
          const roleRaw = String(row['Peran'] || row['Role'] || row['role'] || 'siswa').toLowerCase();
          const role = (roleRaw === 'guru' ? 'guru' : roleRaw === 'admin' ? 'admin' : 'siswa') as User['role'];

          return {
            id: `imported-${Date.now()}-${idx}`,
            name,
            username,
            password,
            role,
            nisn: role === 'siswa' ? nisn : undefined,
            nip: role === 'guru' ? nisn : undefined,
            kelas: role === 'siswa' ? kelas : undefined,
            rombel,
          };
        });

        setParsedPreview(mappedUsers);
        setUploadStatusMsg({
          type: 'success',
          text: `Berhasil membaca ${mappedUsers.length} data calon pengguna dari file. Klik "Terapkan ke Sistem" di bawah untuk menyimpan ke database.`,
        });
      } catch (err) {
        console.error(err);
        setUploadStatusMsg({
          type: 'error',
          text: 'Gagal memproses file. Pastikan format file adalah Excel (.xlsx) atau CSV yang sesuai.',
        });
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleApplyImported = () => {
    if (parsedPreview.length === 0) return;
    onAddUsers(parsedPreview);
    setUploadStatusMsg({
      type: 'success',
      text: `Sukses! ${parsedPreview.length} akun data siswa/guru baru telah ditambahkan ke database.`,
    });
    setParsedPreview([]);
    setActiveSubTab('users');
  };

  // Quick Paste import
  const handleProcessPaste = () => {
    if (!pasteContent.trim()) return;
    const lines = pasteContent.trim().split('\n');
    const newUsers: User[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(/[,\t;]/).map((p) => p.trim());
      if (parts.length >= 2) {
        const nisn = parts[0] || `00${Date.now().toString().slice(-8)}`;
        const name = parts[1] || `Siswa ${idx + 1}`;
        const kelasInput = parts[2] || '10';
        const kelas = (kelasInput.includes('11') ? '11' : kelasInput.includes('12') ? '12' : '10') as JenjangKelas;
        const rombel = parts[3] || `Kelas ${kelas}`;
        const username = parts[4] || name.toLowerCase().replace(/[^a-z0-9]/g, '.');

        newUsers.push({
          id: `paste-${Date.now()}-${idx}`,
          name,
          username,
          password: 'password123',
          role: 'siswa',
          nisn,
          kelas,
          rombel,
        });
      }
    });

    if (newUsers.length > 0) {
      onAddUsers(newUsers);
      setPasteContent('');
      setUploadStatusMsg({
        type: 'success',
        text: `Berhasil menambahkan ${newUsers.length} siswa baru melalui tempel teks.`,
      });
      setActiveSubTab('users');
    }
  };

  // Manual single add
  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim()) return;

    const userObj: User = {
      id: `manual-${Date.now()}`,
      name: newName.trim(),
      username: newUsername.trim().toLowerCase(),
      password: newPassword.trim() || 'password123',
      role: newRole,
      nisn: newRole === 'siswa' ? (newNisn.trim() || `00${Date.now().toString().slice(-8)}`) : undefined,
      nip: newRole === 'guru' ? (newNisn.trim() || `1990${Date.now().toString().slice(-10)}`) : undefined,
      kelas: newRole === 'siswa' ? newKelas : undefined,
      rombel: newRole === 'siswa' ? (newRombel.trim() || `Kelas ${newKelas}`) : 'Dewan Guru Pembimbing',
    };

    onAddUsers([userObj]);
    setNewName('');
    setNewUsername('');
    setNewNisn('');
    setUploadStatusMsg({
      type: 'success',
      text: `Pengguna ${userObj.name} (${userObj.role.toUpperCase()}) berhasil ditambahkan ke database!`,
    });
    setActiveSubTab('users');
  };

  // Open Edit User Modal
  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setEditUserName(u.name);
    setEditUserRole(u.role);
    setEditUserNisn(u.nisn || '');
    setEditUserNip(u.nip || '');
    setEditUserKelas(u.kelas || '10');
    setEditUserRombel(u.rombel || '');
    setEditUserUsername(u.username);
    setEditUserPassword(u.password || '');
  };

  // Save Edit User
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const updated: User = {
      ...editingUser,
      name: editUserName.trim(),
      role: editUserRole,
      nisn: editUserRole === 'siswa' ? editUserNisn.trim() : undefined,
      nip: editUserRole === 'guru' ? editUserNip.trim() : undefined,
      kelas: editUserRole === 'siswa' ? editUserKelas : undefined,
      rombel: editUserRombel.trim() || (editUserRole === 'siswa' ? `Kelas ${editUserKelas}` : undefined),
      username: editUserUsername.trim().toLowerCase(),
      password: editUserPassword.trim() || editingUser.password || 'password123',
    };
    onUpdateUser?.(updated);
    setEditingUser(null);
    setUploadStatusMsg({
      type: 'success',
      text: `Data akun "${updated.name}" berhasil disimpan ke database.`,
    });
  };

  // Delete User with confirmation
  const handleDeleteUserClick = (u: User) => {
    if (confirm(`Yakin ingin menghapus akun "${u.name}" (${u.username})? Tindakan ini akan menghapus akun dari Cloud Firestore.`)) {
      onDeleteUser(u.id);
      setUploadStatusMsg({
        type: 'success',
        text: `Akun "${u.name}" berhasil dihapus dari sistem.`,
      });
    }
  };

  // Open Edit Entry Modal
  const handleOpenEditEntry = (entry: LiteracyEntry) => {
    setEditingEntry(entry);
    setEditEntryBookTitle(entry.bookTitle);
    setEditEntryCategory(entry.readingCategory);
    setEditEntryType(entry.literacyType);
    setEditEntryPages(entry.pagesRead);
    setEditEntryDuration(entry.durationMinutes);
    setEditEntrySummary(entry.summary);
    setEditEntryMoral(entry.moralValue);
    setEditEntrySelfScore(entry.reflection?.totalScore || 20);
    setEditEntryTeacherScore(entry.teacherValidation?.validationScore ?? 75);
    setEditEntryTeacherNotes(entry.teacherValidation?.feedbackNotes ?? '');
  };

  // Save Edit Entry
  const handleSaveEditEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const selfScore = Math.min(20, Math.max(0, Number(editEntrySelfScore) || 0));
    const teacherScore = Math.min(80, Math.max(0, Number(editEntryTeacherScore) || 0));
    const hasValidation = editingEntry.teacherValidation !== undefined;

    const updates: Partial<LiteracyEntry> = {
      bookTitle: editEntryBookTitle.trim(),
      readingCategory: editEntryCategory.trim(),
      literacyType: editEntryType,
      pagesRead: editEntryPages.trim(),
      durationMinutes: Number(editEntryDuration) || 15,
      summary: editEntrySummary.trim(),
      moralValue: editEntryMoral.trim(),
      reflection: {
        ...editingEntry.reflection,
        totalScore: selfScore,
      },
    };

    if (hasValidation) {
      updates.teacherValidation = {
        ...editingEntry.teacherValidation!,
        validationScore: teacherScore,
        feedbackNotes: editEntryTeacherNotes.trim(),
      };
      updates.totalFinalScore = selfScore + teacherScore;
    }

    onUpdateEntry?.(editingEntry.id, updates);
    setEditingEntry(null);
    setUploadStatusMsg({
      type: 'success',
      text: `Data jurnal "${updates.bookTitle}" berhasil disimpan ke database.`,
    });
  };

  // Delete Entry with confirmation
  const handleDeleteEntryClick = (entry: LiteracyEntry) => {
    if (confirm(`Yakin ingin menghapus jurnal "${entry.bookTitle}" karya siswa ${entry.studentName}? Tindakan ini permanen di Cloud Firestore.`)) {
      onDeleteEntry?.(entry.id);
      setUploadStatusMsg({
        type: 'success',
        text: `Jurnal "${entry.bookTitle}" karya ${entry.studentName} berhasil dihapus dari sistem.`,
      });
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchUser = u.username.toLowerCase().includes(q);
      const matchNis = (u.nisn || u.nip || '').toLowerCase().includes(q);
      const matchRombel = (u.rombel || '').toLowerCase().includes(q);
      return matchName || matchUser || matchNis || matchRombel;
    }
    return true;
  });

  // Selectable non-admin users in the current view
  const selectableUsers = filteredUsers.filter((u) => u.role !== 'admin');
  const isAllSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selectedUserIds.includes(u.id));

  const handleToggleUserSelect = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const visibleIds = new Set(selectableUsers.map((u) => u.id));
      setSelectedUserIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const newIds = new Set([...selectedUserIds, ...selectableUsers.map((u) => u.id)]);
      setSelectedUserIds(Array.from(newIds));
    }
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.length === 0) return;
    const count = selectedUserIds.length;
    if (
      confirm(
        `PERINGATAN HAPUS MASSAL:\n\nApakah Anda yakin ingin menghapus ${count} akun pengguna yang dipilih secara permanen dari sistem dan Cloud Firestore?\n\nTindakan ini tidak dapat dibatalkan.`
      )
    ) {
      onDeleteBatchUsers?.(selectedUserIds);
      setSelectedUserIds([]);
      setUploadStatusMsg({
        type: 'success',
        text: `Sukses! ${count} akun pengguna berhasil dihapus secara massal dari database.`,
      });
    }
  };

  // Filtered Entries
  const filteredEntries = entries.filter((e) => {
    if (entryGradeFilter !== 'all' && e.studentKelas !== entryGradeFilter) return false;
    if (entryTypeFilter !== 'all' && e.literacyType !== entryTypeFilter) return false;
    if (entrySearch.trim()) {
      const q = entrySearch.toLowerCase();
      const matchBook = e.bookTitle.toLowerCase().includes(q);
      const matchStudent = e.studentName.toLowerCase().includes(q);
      const matchCategory = e.readingCategory.toLowerCase().includes(q);
      return matchBook || matchStudent || matchCategory;
    }
    return true;
  });

  // Paginated slices for 1-Page Layout (Admin)
  const paginatedUsers = useMemo(() => {
    const start = (usersPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, usersPage, usersPerPage]);

  const paginatedEntries = useMemo(() => {
    const start = (entriesPage - 1) * entriesPerPage;
    return filteredEntries.slice(start, start + entriesPerPage);
  }, [filteredEntries, entriesPage, entriesPerPage]);

  const paginatedWeeklySummaries = useMemo(() => {
    const start = (adminWeeklyPage - 1) * adminWeeklyPerPage;
    return filteredWeeklySummaries.slice(start, start + adminWeeklyPerPage);
  }, [filteredWeeklySummaries, adminWeeklyPage, adminWeeklyPerPage]);

  const paginatedMonthlySummaries = useMemo(() => {
    const start = (adminMonthlyPage - 1) * adminMonthlyPerPage;
    return filteredMonthlySummaries.slice(start, start + adminMonthlyPerPage);
  }, [filteredMonthlySummaries, adminMonthlyPage, adminMonthlyPerPage]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white mb-8 border border-purple-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 inline-block shadow-xs">
                Panel Kontrol Administrator
              </span>
              <span className="text-xs text-purple-200">SMAN 2 Samarinda</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Pusat Manajemen Data Pengguna & Jurnal
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/90 mt-1 max-w-2xl font-medium">
              Kelola master data siswa, guru, dan entri literasi. Hak akses terproteksi: data pengguna, jurnal, dan lainnya <strong>hanya dapat di-update oleh Administrator</strong>. Data tersimpan permanen di Cloud Firestore dan tidak akan dikembalikan ke data awal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportExcel}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Rekap Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload/Action Status Toast */}
      {uploadStatusMsg && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in duration-200 ${
            uploadStatusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {uploadStatusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs sm:text-sm font-semibold flex-1">{uploadStatusMsg.text}</div>
          <button
            onClick={() => setUploadStatusMsg(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Ringkasan Statistik Literasi (Dashboard Admin) */}
      <StatisticsDashboard
        entries={entries}
        users={users}
        variant="admin"
        onFilterGrade={() => setActiveSubTab('users')}
      />

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2 flex-wrap">
        <button
          onClick={() => setActiveSubTab('monthly-assessment')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'monthly-assessment'
              ? 'bg-purple-700 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Penilaian 1 Nama Siswa per Bulan (Terkonsolidasi)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
            Wajib 4x
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'users'
              ? 'bg-purple-700 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Pengguna Aktif ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('entries')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'entries'
              ? 'bg-purple-700 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Log Mentah Semua Jurnal ({entries.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('upload')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'upload'
              ? 'bg-purple-700 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Excel / CSV</span>
        </button>

        <button
          onClick={() => setActiveSubTab('manual')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'manual'
              ? 'bg-purple-700 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Satuan / Tempel Teks</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUBTAB 0: PENILAIAN 1 NAMA SISWA PER BULAN (TERKONSOLIDASI) */}
      {/* ========================================================= */}
      {activeSubTab === 'monthly-assessment' && (
        <div className="space-y-6">
          {/* Monthly Control Toolbar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Penilaian Terkonsolidasi: 1 Nama Siswa per Bulan</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-200">
                    Wajib 4x / Bulan
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    Akun Admin & Guru
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Seluruh inputan jurnal siswa dalam satu bulan digabungkan menjadi <strong>1 nama siswa</strong>. Admin dan Guru menilai siswa dari akumulasi total jurnal yang diinput.
                </p>
              </div>

              {/* Month Selector & Export Dropdown */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                  <Calendar className="w-4 h-4 text-purple-600 ml-2" />
                  <span className="text-xs font-bold text-slate-600 hidden sm:inline">Bulan:</span>
                  <select
                    value={selectedAccumulationMonth}
                    onChange={(e) => setSelectedAccumulationMonth(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-200 shadow-2xs cursor-pointer"
                  >
                    {availableMonths.map((ym) => (
                      <option key={ym} value={ym}>
                        {formatMonthTitle(ym)} {ym === currentMonthKey ? '(Bulan Ini)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleExportMonthlyAccumulation}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                  title="Unduh data rekap akumulasi bulanan siswa ke format Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">Ekspor Rekap 4 Minggu</span>
                </button>
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

              <div className="bg-purple-50/70 rounded-2xl p-3.5 border border-purple-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800">Sudah Diverifikasi / Dinilai</div>
                <div className="text-2xl font-black text-purple-700 mt-0.5">
                  {verifiedCount} <span className="text-xs font-semibold text-purple-800">/ {totalStudentsCount}</span>
                </div>
                <div className="text-[11px] text-purple-700">Rata-rata: {schoolMonthlyAvgScore} / 100 Poin</div>
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
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-purple-500 outline-none"
                />
              </div>

              {/* Grade & Compliance Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                  <span className="px-2 text-slate-400 hidden sm:inline">Jenjang:</span>
                  <button
                    onClick={() => setMonthlyGradeFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      monthlyGradeFilter === 'all' ? 'bg-white text-purple-700 shadow-xs font-black' : 'hover:text-slate-900'
                    }`}
                  >
                    Semua
                  </button>
                  {(['10', '11', '12'] as JenjangKelas[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setMonthlyGradeFilter(g)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        monthlyGradeFilter === g ? 'bg-white text-purple-700 shadow-xs font-black' : 'hover:text-slate-900'
                      }`}
                    >
                      Kls {g}
                    </button>
                  ))}
                </div>

                <select
                  value={monthlyComplianceFilter}
                  onChange={(e) => setMonthlyComplianceFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white outline-none cursor-pointer"
                >
                  <option value="all">Semua Status Kepatuhan</option>
                  <option value="complete">Tuntas 4/4 Minggu (100%)</option>
                  <option value="incomplete">Belum Lengkap (&lt; 4 Minggu)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Week Selection Toolbar (Pilihan Minggu pada Bulan Ini - Admin) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
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
                    ? 'bg-purple-700 text-white shadow-xs font-black'
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
                        ? 'bg-purple-700 text-white shadow-xs font-black ring-2 ring-purple-300'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>Minggu {w}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      selectedWeekFilter === w ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {filledCount} Siswa
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================= */}
          {/* VIEW A: PENILAIAN BERDASARKAN MINGGUAN (ADMIN - 1 BARIS / SISWA) */}
          {/* ========================================================= */}
          {selectedWeekFilter !== 'all' ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-purple-600" />
                    <span>Penilaian Berdasarkan Mingguan: Minggu {selectedWeekFilter}</span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800">
                      {getWeekPeriodLabel(selectedAccumulationMonth, selectedWeekFilter)}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    1 baris per nama siswa. Menampilkan gabungan jurnal yang diinput siswa pada minggu ini untuk dinilai langsung oleh Admin atau Guru.
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
                      <th className="py-3.5 px-3 text-center w-10">No</th>
                      <th className="py-3.5 px-4">Nama Siswa & Rombel</th>
                      <th className="py-3.5 px-3">Jurnal Minggu {selectedWeekFilter}</th>
                      <th className="py-3.5 px-3 text-center">Refleksi Mandiri</th>
                      <th className="py-3.5 px-3 text-center bg-purple-50/50 text-purple-900">Nilai Mingguan</th>
                      <th className="py-3.5 px-3 text-center">Status</th>
                      <th className="py-3.5 px-3">Catatan Feedback</th>
                      <th className="py-3.5 px-4 text-center">Aksi Penilaian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredWeeklySummaries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          Tidak ada data siswa yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedWeeklySummaries.map((wSum, idx) => {
                        return (
                          <tr key={wSum.student.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            
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
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
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

                            {/* Nilai Mingguan Guru/Admin */}
                            <td className="py-3 px-3 text-center whitespace-nowrap bg-purple-50/20">
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

                            {/* Catatan Feedback */}
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
                                      : 'bg-purple-700 hover:bg-purple-800 text-white shadow-purple-100'
                                  }`}
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>{wSum.isValidated ? 'Ubah Nilai' : 'Nilai Minggu Ini'}</span>
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

              {/* Pagination for View A Weekly Assessment (Admin) */}
              <Pagination
                currentPage={adminWeeklyPage}
                totalPages={Math.ceil(filteredWeeklySummaries.length / adminWeeklyPerPage) || 1}
                totalItems={filteredWeeklySummaries.length}
                itemsPerPage={adminWeeklyPerPage}
                onPageChange={setAdminWeeklyPage}
                onItemsPerPageChange={setAdminWeeklyPerPage}
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
                    <th className="py-3.5 px-3 text-center w-10">No</th>
                    <th className="py-3.5 px-4">Nama Siswa & Rombel</th>
                    <th className="py-3.5 px-3 text-center">Minggu 1 (Tgl 1-7)</th>
                    <th className="py-3.5 px-3 text-center">Minggu 2 (Tgl 8-14)</th>
                    <th className="py-3.5 px-3 text-center">Minggu 3 (Tgl 15-21)</th>
                    <th className="py-3.5 px-3 text-center">Minggu 4 (Tgl 22-akhir)</th>
                    <th className="py-3.5 px-3 text-center">Total Jurnal</th>
                    <th className="py-3.5 px-3 text-center">Kewajiban 4x</th>
                    <th className="py-3.5 px-3 text-center bg-purple-50/50 text-purple-900">Nilai Akumulasi</th>
                    <th className="py-3.5 px-3 text-center">Status Verifikasi</th>
                    <th className="py-3.5 px-4 text-center">Menu Penilaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredMonthlySummaries.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Tidak ada data siswa yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedMonthlySummaries.map((summary, idx) => {
                      const isComplete = summary.completedWeeks >= 4;
                      const isVerified = !!summary.monthlyVerification;

                      const renderWeekCell = (entry?: LiteracyEntry) => {
                        if (!entry) {
                          return (
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-400">
                              Belum Ada
                            </span>
                          );
                        }
                        const score = getEntryScore(entry);
                        const isVal = !!entry.teacherValidation;
                        return (
                          <div
                            onClick={() => setInspectJournalEntry(entry)}
                            className="flex flex-col items-center cursor-pointer group"
                            title="Klik untuk melihat rincian jurnal minggu ini"
                          >
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black group-hover:scale-105 transition-transform ${
                              isVal 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {score} Poin
                            </span>
                            <span className="text-[10px] text-slate-500 group-hover:text-purple-700 truncate max-w-[100px] mt-0.5 font-medium" title={entry.bookTitle}>
                              {entry.bookTitle}
                            </span>
                          </div>
                        );
                      };

                      return (
                        <tr key={summary.student.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          
                          {/* Siswa */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-sm">{summary.student.name}</div>
                            <div className="text-[11px] text-slate-400">
                              {summary.student.rombel || `Kelas ${summary.student.kelas}`} • NISN: {summary.student.nisn || '-'}
                            </div>
                          </td>

                          {/* W1 */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {renderWeekCell(summary.week1Entry)}
                          </td>

                          {/* W2 */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {renderWeekCell(summary.week2Entry)}
                          </td>

                          {/* W3 */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {renderWeekCell(summary.week3Entry)}
                          </td>

                          {/* W4 */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {renderWeekCell(summary.week4Entry)}
                          </td>

                          {/* Total Jurnal */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {summary.totalEntriesInMonth} Jurnal
                            </span>
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

                          {/* Nilai Akumulasi */}
                          <td className="py-3 px-3 text-center whitespace-nowrap bg-purple-50/30">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-sm font-black text-purple-700">
                                {summary.calculatedAccumulatedScore > 0 ? summary.calculatedAccumulatedScore : '-'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                / 100 Poin
                              </span>
                            </div>
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
                                <span>Belum Dinilai</span>
                              </span>
                            )}
                          </td>

                          {/* Menu Penilaian */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleOpenMonthlyModal(summary)}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                                isVerified
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                  : 'bg-purple-700 hover:bg-purple-800 text-white shadow-purple-100'
                              }`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{isVerified ? 'Ubah Nilai' : 'Nilai Siswa Ini'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for View B Monthly Accumulation (Admin) */}
            <Pagination
              currentPage={adminMonthlyPage}
              totalPages={Math.ceil(filteredMonthlySummaries.length / adminMonthlyPerPage) || 1}
              totalItems={filteredMonthlySummaries.length}
              itemsPerPage={adminMonthlyPerPage}
              onPageChange={setAdminMonthlyPage}
              onItemsPerPageChange={setAdminMonthlyPerPage}
              itemLabel="siswa"
            />
          </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 1: DAFTAR PENGGUNA AKTIF (EDIT, HAPUS, HAPUS MASSAL) */}
      {/* ========================================================= */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Active Users Information & Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Daftar Pengguna Aktif
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {users.length} Akun Terdaftar
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola akun siswa, guru, dan admin. Klik tombol <strong>Edit</strong> untuk memperbarui data, <strong>Hapus</strong> untuk menghapus akun satuan, atau centang kotak untuk <strong>Hapus Massal</strong>.
              </p>
            </div>

            {/* Quick Stat Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Siswa: {users.filter((u) => u.role === 'siswa').length}
              </span>
              <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Guru: {users.filter((u) => u.role === 'guru').length}
              </span>
              <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                Admin: {users.filter((u) => u.role === 'admin').length}
              </span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, NISN/NIP, username, rombel..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white cursor-pointer"
              >
                <option value="all">Semua Peran ({users.length})</option>
                <option value="siswa">Siswa Saja ({users.filter((u) => u.role === 'siswa').length})</option>
                <option value="guru">Guru Saja ({users.filter((u) => u.role === 'guru').length})</option>
                <option value="admin">Admin Saja ({users.filter((u) => u.role === 'admin').length})</option>
              </select>

              {/* Tombol Pilih Semua */}
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                title={isAllSelected ? 'Batalkan semua pilihan' : 'Pilih semua akun non-admin'}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                <span>{isAllSelected ? 'Batal Pilih' : 'Pilih Semua'}</span>
              </button>

              {/* Tombol Hapus Massal */}
              <button
                type="button"
                onClick={selectedUserIds.length > 0 ? handleBulkDelete : handleToggleSelectAll}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  selectedUserIds.length > 0
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200'
                    : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                }`}
                title={selectedUserIds.length > 0 ? `Hapus ${selectedUserIds.length} pengguna terpilih` : 'Pilih semua pengguna untuk hapus massal'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{selectedUserIds.length > 0 ? `Hapus Massal (${selectedUserIds.length})` : 'Hapus Massal'}</span>
              </button>

              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-900 bg-purple-50 border border-purple-200">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Otoritas: Admin</span>
              </span>
            </div>
          </div>

          {/* BULK SELECTION ACTION BANNER */}
          {selectedUserIds.length > 0 && (
            <div className="bg-gradient-to-r from-rose-50 via-purple-50 to-amber-50 border-2 border-rose-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>{selectedUserIds.length} Pengguna Dipilih</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      Mode Hapus Massal
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Akun yang dicentang akan dihapus permanen dari Cloud Firestore.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
                >
                  {isAllSelected ? 'Batal Pilih Semua' : `Pilih Semua (${selectableUsers.length})`}
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Batalkan Pilihan
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Massal ({selectedUserIds.length} Akun)</span>
                </button>
              </div>
            </div>
          )}

          {/* Table of Users */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
                        title="Pilih semua pengguna (non-admin)"
                      />
                    </th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-3">Peran</th>
                    <th className="py-3 px-3 text-center">Status Akun</th>
                    <th className="py-3 px-3">NISN / NIP</th>
                    <th className="py-3 px-3">Kelas / Rombel</th>
                    <th className="py-3 px-3">Username</th>
                    <th className="py-3 px-4 text-center">Menu Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Tidak ada pengguna yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-purple-50/70' : ''}`}>
                          <td className="py-3 px-3 text-center">
                            {u.role !== 'admin' ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleUserSelect(u.id)}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-300 select-none" title="Akun Admin dilindungi">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{u.name}</div>
                            {u.email && <div className="text-[11px] text-slate-400">{u.email}</div>}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : u.role === 'guru'
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Aktif
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono">{u.nisn || u.nip || '-'}</td>
                          <td className="py-3 px-3">{u.rombel || (u.kelas ? `Kelas ${u.kelas}` : '-')}</td>
                          <td className="py-3 px-3 font-mono text-slate-500">{u.username}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Tombol Edit User */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
                                title="Edit Data Pengguna"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              {/* Tombol Hapus User */}
                              {u.role !== 'admin' ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUserClick(u)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                                  title="Hapus Pengguna dari Database"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic px-1">Admin</span>
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

            {/* Pagination for Users Table */}
            <Pagination
              currentPage={usersPage}
              totalPages={Math.ceil(filteredUsers.length / usersPerPage) || 1}
              totalItems={filteredUsers.length}
              itemsPerPage={usersPerPage}
              onPageChange={setUsersPage}
              onItemsPerPageChange={setUsersPerPage}
              itemLabel="pengguna"
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 2: DAFTAR & KELOLA JURNAL LITERASI (EDIT & HAPUS) */}
      {/* ========================================================= */}
      {activeSubTab === 'entries' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari judul buku, nama siswa, kategori..."
                value={entrySearch}
                onChange={(e) => setEntrySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <select
                value={entryGradeFilter}
                onChange={(e) => setEntryGradeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white cursor-pointer"
              >
                <option value="all">Semua Jenjang ({entries.length})</option>
                <option value="10">Kelas 10</option>
                <option value="11">Kelas 11</option>
                <option value="12">Kelas 12</option>
              </select>

              <select
                value={entryTypeFilter}
                onChange={(e) => setEntryTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white cursor-pointer"
              >
                <option value="all">Semua Jenis Bacaan</option>
                <option value="Kitab Suci">Kitab Suci</option>
                <option value="Non Mapel">Non Mapel</option>
              </select>
            </div>
          </div>

          {/* Table of Entries */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-3">Siswa & Rombel</th>
                    <th className="py-3 px-3">Judul Buku / Bacaan</th>
                    <th className="py-3 px-3">Jenis & Kategori</th>
                    <th className="py-3 px-3 text-center">Status / Skor</th>
                    <th className="py-3 px-4 text-center">Menu Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Tidak ada catatan jurnal literasi yang sesuai dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{e.date}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{e.studentName}</div>
                          <div className="text-[11px] text-slate-400">{e.studentRombel || `Kelas ${e.studentKelas}`}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800 line-clamp-1 max-w-[220px]" title={e.bookTitle}>
                            {e.bookTitle}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {e.pagesRead} • {e.durationMinutes} menit
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              e.literacyType === 'Kitab Suci'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            }`}
                          >
                            {e.literacyType}
                          </span>
                          <div className="text-[11px] text-slate-500 mt-0.5">{e.readingCategory}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {e.teacherValidation ? (
                            <div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Nilai: {e.totalFinalScore} / 100
                              </span>
                              <div className="text-[10px] text-emerald-600 mt-0.5">Tervalidasi Guru</div>
                            </div>
                          ) : (
                            <div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Refleksi: {e.reflection?.totalScore || 0} / 20
                              </span>
                              <div className="text-[10px] text-amber-600 mt-0.5">Menunggu Validasi</div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Tombol Edit Jurnal */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditEntry(e)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                              title="Edit Jurnal Literasi"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {/* Tombol Hapus Jurnal */}
                            <button
                              type="button"
                              onClick={() => handleDeleteEntryClick(e)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                              title="Hapus Jurnal dari Database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Entries Table */}
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
      {/* SUBTAB 3: UPLOAD FILE (EXCEL / CSV) */}
      {/* ========================================================= */}
      {activeSubTab === 'upload' && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) processUploadedFile(file);
            }}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all bg-white ${
              dragActive
                ? 'border-purple-600 bg-purple-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-purple-400'
            }`}
          >
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-800">
              Unggah File Master Data Siswa & Guru
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Tarik dan lepaskan file Excel (<strong>.xlsx</strong>) atau <strong>.csv</strong> di sini, atau klik tombol di bawah untuk memilih file.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <label className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-200 cursor-pointer transition-all">
                Pilih File Dokumen
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processUploadedFile(file);
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Format Excel
              </button>
            </div>
          </div>

          {/* Parsed Preview Table */}
          {parsedPreview.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Pratinjau Data ({parsedPreview.length} Baris Terbaca)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Periksa kebenaran nama, kelas, rombel, dan NISN sebelum disimpan permanen ke database.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setParsedPreview([])}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleApplyImported}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Terapkan ke Sistem ({parsedPreview.length})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-72 border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0">
                    <tr>
                      <th className="p-3">Nama Lengkap</th>
                      <th className="p-3">Peran</th>
                      <th className="p-3">NISN / NIP</th>
                      <th className="p-3">Kelas & Rombel</th>
                      <th className="p-3">Username</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedPreview.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{u.name}</td>
                        <td className="p-3 uppercase text-[10px] font-bold text-slate-500">{u.role}</td>
                        <td className="p-3 font-mono">{u.nisn || u.nip || '-'}</td>
                        <td className="p-3">{u.rombel || `Kelas ${u.kelas}`}</td>
                        <td className="p-3 font-mono text-slate-500">{u.username}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Paste Area */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h4 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Impor Cepat via Salin-Tempel (Copy-Paste Text)
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Format baris dipisahkan koma atau tab: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">NISN, Nama Siswa, Kelas (10/11/12), Rombel, Username</code>
            </p>
            <textarea
              rows={3}
              placeholder="0071234991, Ahmad Dani, 10, X MIPA 1, ahmad.dani&#10;0061234992, Bella Safira, 11, XI IPS 1, bella.safira"
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono focus:border-purple-500 outline-none"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={handleProcessPaste}
                disabled={!pasteContent.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Impor Data yang Ditempel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 4: FORM TAMBAH SATUAN */}
      {/* ========================================================= */}
      {activeSubTab === 'manual' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-xl">
          <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-600" />
            Pendaftaran Pengguna Baru Satuan
          </h3>

          <form onSubmit={handleManualAdd} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Peran Pengguna</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewRole('siswa')}
                  className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                    newRole === 'siswa'
                      ? 'bg-purple-50 text-purple-700 border-purple-500'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Siswa
                </button>
                <button
                  type="button"
                  onClick={() => setNewRole('guru')}
                  className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                    newRole === 'guru'
                      ? 'bg-purple-50 text-purple-700 border-purple-500'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Guru Pembimbing
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                placeholder="Raihan Muhammad"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {newRole === 'siswa' ? 'NISN (Nomor Induk Siswa Nasional)' : 'NIP (Nomor Induk Pegawai)'}
              </label>
              <input
                type="text"
                placeholder={newRole === 'siswa' ? '0071234509' : '198501012010011001'}
                value={newNisn}
                onChange={(e) => setNewNisn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-purple-500"
              />
            </div>

            {newRole === 'siswa' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenjang Kelas</label>
                  <select
                    value={newKelas}
                    onChange={(e) => {
                      const k = e.target.value as JenjangKelas;
                      setNewKelas(k);
                      setNewRombel(`Kelas ${k}`);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none bg-white cursor-pointer"
                  >
                    <option value="10">Kelas 10 (Fase E)</option>
                    <option value="11">Kelas 11 (Fase F)</option>
                    <option value="12">Kelas 12 (Fase F Akhir)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rombel / Kelas</label>
                  <input
                    type="text"
                    placeholder="X MIPA 1"
                    value={newRombel}
                    onChange={(e) => setNewRombel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Username Login</label>
                <input
                  type="text"
                  required
                  placeholder="raihan.m"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200 transition-colors cursor-pointer"
              >
                Daftarkan Pengguna ke Database
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: EDIT PENGGUNA */}
      {/* ========================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Pencil className="w-4 h-4 text-purple-200" />
                </div>
                <div>
                  <h3 className="text-base font-black">Edit Data Akun Pengguna</h3>
                  <p className="text-[11px] text-purple-200">Perbarui identitas, peran, atau sandi pengguna</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-purple-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peran Akun</label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as User['role'])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none bg-white cursor-pointer"
                  >
                    <option value="siswa">Siswa</option>
                    <option value="guru">Guru Penilai</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editUserRole === 'guru' ? 'NIP Guru' : 'NISN Siswa'}
                  </label>
                  <input
                    type="text"
                    value={editUserRole === 'guru' ? editUserNip : editUserNisn}
                    onChange={(e) => {
                      if (editUserRole === 'guru') setEditUserNip(e.target.value);
                      else setEditUserNisn(e.target.value);
                    }}
                    placeholder={editUserRole === 'guru' ? '19850101...' : '007123...'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              {editUserRole === 'siswa' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jenjang Kelas</label>
                    <select
                      value={editUserKelas}
                      onChange={(e) => setEditUserKelas(e.target.value as JenjangKelas)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none bg-white cursor-pointer"
                    >
                      <option value="10">Kelas 10 (Fase E)</option>
                      <option value="11">Kelas 11 (Fase F)</option>
                      <option value="12">Kelas 12 (Fase F Akhir)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Rombel</label>
                    <input
                      type="text"
                      value={editUserRombel}
                      onChange={(e) => setEditUserRombel(e.target.value)}
                      placeholder="X MIPA 1"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    value={editUserUsername}
                    onChange={(e) => setEditUserUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="text"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    placeholder="password123"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Simpan Perubahan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT JURNAL LITERASI */}
      {/* ========================================================= */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <BookOpen className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <h3 className="text-base font-black">Edit Jurnal Literasi Siswa</h3>
                  <p className="text-[11px] text-blue-200">
                    Siswa: {editingEntry.studentName} ({editingEntry.studentRombel}) • {editingEntry.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingEntry(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditEntry} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Buku / Kitab / Artikel</label>
                <input
                  type="text"
                  required
                  value={editEntryBookTitle}
                  onChange={(e) => setEditEntryBookTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Literasi</label>
                  <select
                    value={editEntryType}
                    onChange={(e) => setEditEntryType(e.target.value as JenisLiterasi)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none bg-white cursor-pointer"
                  >
                    <option value="Non Mapel">Non Mapel</option>
                    <option value="Kitab Suci">Kitab Suci</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Bacaan</label>
                  <input
                    type="text"
                    value={editEntryCategory}
                    onChange={(e) => setEditEntryCategory(e.target.value)}
                    placeholder="Novel, Sains, Biografi, dll"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Halaman / Ayat Dibaca</label>
                  <input
                    type="text"
                    value={editEntryPages}
                    onChange={(e) => setEditEntryPages(e.target.value)}
                    placeholder="Hal. 10 - 25"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Durasi Membaca (Menit)</label>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={editEntryDuration}
                    onChange={(e) => setEditEntryDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ringkasan Bacaan</label>
                <textarea
                  rows={3}
                  value={editEntrySummary}
                  onChange={(e) => setEditEntrySummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pesan Moral / Nilai Kebaikan</label>
                <textarea
                  rows={2}
                  value={editEntryMoral}
                  onChange={(e) => setEditEntryMoral(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                />
              </div>

              {/* Nilai Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Penyesuaian Skor Penilaian</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Skor Refleksi Mandiri (Maks. 20)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={editEntrySelfScore}
                      onChange={(e) => setEditEntrySelfScore(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-bold text-indigo-700 bg-white"
                    />
                  </div>

                  {editingEntry.teacherValidation && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Skor Validasi Guru (Maks. 80)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={editEntryTeacherScore}
                        onChange={(e) => setEditEntryTeacherScore(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-bold text-emerald-700 bg-white"
                      />
                    </div>
                  )}
                </div>

                {editingEntry.teacherValidation && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Catatan / Umpan Balik Guru
                    </label>
                    <input
                      type="text"
                      value={editEntryTeacherNotes}
                      onChange={(e) => setEditEntryTeacherNotes(e.target.value)}
                      placeholder="Catatan bimbingan pembinaan..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-xs bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Simpan Perubahan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VERIFIKASI & PENETAPAN NILAI AKUMULASI BULANAN (ADMIN) */}
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

            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700 border border-purple-200">
                Penilaian Akumulasi 1 Nama Siswa
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Periode {formatMonthTitle(selectedAccumulationMonth)}
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Penilaian & Verifikasi Akumulasi Literasi Siswa
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Siswa: <strong>{activeMonthlyStudentSummary.student.name}</strong> ({activeMonthlyStudentSummary.student.rombel || `Kelas ${activeMonthlyStudentSummary.student.kelas}`}) • NISN: {activeMonthlyStudentSummary.student.nisn || '-'}
            </p>

            {/* 4-Week Review Breakdown Grid */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase text-slate-700">Rincian Jurnal 4 Minggu:</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
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
                          <span className="text-purple-700 font-black">{getEntryScore(entry)} Poin</span>
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
                              onClick={() => setInspectJournalEntry(entry)}
                              className="text-purple-600 hover:text-purple-800 font-bold underline cursor-pointer"
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

                {/* Catatan / Feedback Bulanan Guru / Admin */}
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
      {/* MODAL: INSPEKSI DETAIL JURNAL MINGGUAN (ADMIN VIEW) */}
      {/* ========================================================= */}
      {inspectJournalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-7 relative my-8">
            <button
              onClick={() => setInspectJournalEntry(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                Detail Jurnal Literasi
              </span>
              <span className="text-xs text-slate-400">
                {inspectJournalEntry.date} • Minggu ke-{inspectJournalEntry.weekNumber || getWeekNumberFromDate(inspectJournalEntry.date)}
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {inspectJournalEntry.bookTitle}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Siswa: <strong>{inspectJournalEntry.studentName}</strong> ({inspectJournalEntry.studentRombel}) • NISN: {inspectJournalEntry.studentNisn}
            </p>

            <div className="space-y-4 text-xs">
              {/* Photo & Basic Info */}
              <div className="flex flex-col sm:flex-row gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                {inspectJournalEntry.photoUrl && (
                  <img
                    src={inspectJournalEntry.photoUrl}
                    alt="Foto Membaca"
                    className="w-full sm:w-32 h-32 object-cover rounded-xl border border-slate-200 shrink-0"
                  />
                )}
                <div className="space-y-1.5 flex-1">
                  <div>
                    <span className="text-slate-400 font-semibold">Jenis & Kategori:</span>
                    <span className="font-bold text-slate-800 ml-1.5">{inspectJournalEntry.literacyType} ({inspectJournalEntry.readingCategory})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Halaman / Ayat:</span>
                    <span className="font-bold text-slate-800 ml-1.5">{inspectJournalEntry.pagesRead || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Durasi Membaca:</span>
                    <span className="font-bold text-slate-800 ml-1.5">{inspectJournalEntry.durationMinutes} Menit</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Diskusi Rekan:</span>
                    <span className="font-bold text-slate-800 ml-1.5">{inspectJournalEntry.peerDiscussion ? 'Ya' : 'Tidak'}</span>
                    {inspectJournalEntry.peerDiscussionNotes && (
                      <span className="text-slate-600 italic block mt-0.5">"{inspectJournalEntry.peerDiscussionNotes}"</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ringkasan */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block mb-1">Ringkasan Bacaan:</span>
                <p className="text-slate-700 leading-relaxed font-normal whitespace-pre-line">{inspectJournalEntry.summary}</p>
              </div>

              {/* Nilai Moral */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block mb-1">Nilai Moral / Hikmah:</span>
                <p className="text-slate-700 leading-relaxed font-normal italic">"{inspectJournalEntry.moralValue}"</p>
              </div>

              {/* Skor Refleksi Siswa */}
              <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-950 block">Refleksi Mandiri Siswa (4 Indikator)</span>
                  <span className="text-[11px] text-emerald-700">Pemahaman, inspirasi, dorongan perubahan, kesadaran</span>
                </div>
                <div className="text-lg font-black text-emerald-700">
                  {inspectJournalEntry.reflection?.totalScore || 0} / 20 Poin
                </div>
              </div>

              {/* Skor Validasi Guru jika ada */}
              {inspectJournalEntry.teacherValidation && (
                <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-purple-950">Validasi: {inspectJournalEntry.teacherValidation.teacherName}</span>
                    <span className="text-sm font-black text-purple-700">{inspectJournalEntry.teacherValidation.validationScore} / 80 Poin</span>
                  </div>
                  <p className="text-purple-800 italic">"{inspectJournalEntry.teacherValidation.feedbackNotes}"</p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectJournalEntry(null)}
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
