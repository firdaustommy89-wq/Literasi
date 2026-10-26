import React, { useState, useEffect, useMemo } from 'react';
import { User, JenisLiterasi, LiteracyEntry, SelfReflection } from '../types';
import { 
  getWeekNumberFromDate, 
  getWeekPeriodLabel, 
  MONTH_NAMES_ID,
  getDefaultDateForWeek,
  isWeekPeriodPassed,
  getWeekDateRange,
  formatSystemInputDate,
  getLiveSystemTimestampString
} from '../utils/accumulation';
import confetti from 'canvas-confetti';
import { 
  BookMarked, 
  Calendar, 
  Clock, 
  FileText, 
  HeartHandshake, 
  Image as ImageIcon, 
  Sparkles, 
  CheckCircle2, 
  Upload, 
  Users2, 
  Info,
  Check,
  RotateCcw,
  Target,
  Award,
  Trash2,
  AlertCircle,
  History,
  CalendarDays,
  Lock,
  Monitor
} from 'lucide-react';

interface StudentJournalFormProps {
  currentUser: User;
  entries?: LiteracyEntry[];
  onSubmitEntry: (entry: LiteracyEntry) => void;
  onViewHistory: () => void;
}

export const StudentJournalForm: React.FC<StudentJournalFormProps> = ({
  currentUser,
  entries = [],
  onSubmitEntry,
  onViewHistory,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const draftKey = `si_literasi_draft_${currentUser.id}`;

  // Helper to load persistent draft so user never loses work while typing
  const loadSavedDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  };

  const initialDraft = loadSavedDraft();

  // Form states initialized with draft if present
  const [date, setDate] = useState<string>(() => initialDraft?.date || todayStr);
  const [weekNumber, setWeekNumber] = useState<1 | 2 | 3 | 4>(() => {
    if (initialDraft?.weekNumber && [1, 2, 3, 4].includes(initialDraft.weekNumber)) {
      return initialDraft.weekNumber;
    }
    return getWeekNumberFromDate(initialDraft?.date || todayStr);
  });
  const [literacyType, setLiteracyType] = useState<JenisLiterasi>(() => initialDraft?.literacyType || 'Non Mapel');
  const [readingCategory, setReadingCategory] = useState<string>(() => initialDraft?.readingCategory || 'Novel / Fiksi');
  const [customCategory, setCustomCategory] = useState<string>(() => initialDraft?.customCategory || '');
  const [bookTitle, setBookTitle] = useState<string>(() => initialDraft?.bookTitle || '');
  const [pagesRead, setPagesRead] = useState<string>(() => initialDraft?.pagesRead || '');
  const [durationMinutes, setDurationMinutes] = useState<number>(() => initialDraft?.durationMinutes || 30);
  const [summary, setSummary] = useState<string>(() => initialDraft?.summary || '');
  const [moralValue, setMoralValue] = useState<string>(() => initialDraft?.moralValue || '');
  const [peerDiscussion, setPeerDiscussion] = useState<boolean>(() => initialDraft?.peerDiscussion ?? false);
  const [peerDiscussionNotes, setPeerDiscussionNotes] = useState<string>(() => initialDraft?.peerDiscussionNotes || '');
  const [photoUrl, setPhotoUrl] = useState<string>(() => initialDraft?.photoUrl || '');
  const [photoPreview, setPhotoPreview] = useState<string>(() => initialDraft?.photoPreview || '');

  // 4 Self Reflection Questions (1 - 5)
  const [q1, setQ1] = useState<number>(() => initialDraft?.q1 ?? 5);
  const [q2, setQ2] = useState<number>(() => initialDraft?.q2 ?? 5);
  const [q3, setQ3] = useState<number>(() => initialDraft?.q3 ?? 5);
  const [q4, setQ4] = useState<number>(() => initialDraft?.q4 ?? 5);

  const [isLateSubmission, setIsLateSubmission] = useState<boolean>(() => initialDraft?.isLateSubmission || false);
  const [lateReason, setLateReason] = useState<string>(() => initialDraft?.lateReason || '');

  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [createdEntry, setCreatedEntry] = useState<LiteracyEntry | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  // Live computer timestamp locked for student
  const [liveSystemTime, setLiveSystemTime] = useState<string>(() => getLiveSystemTimestampString());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveSystemTime(getLiveSystemTimestampString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Self reflection total (Max 20)
  const totalSelfScore = q1 + q2 + q3 + q4;

  // Determine current week number from chosen date
  const currentMonthKey = date.substring(0, 7);

  // Check if chosen week period has passed relative to today
  const isSelectedWeekPassed = useMemo(() => {
    return isWeekPeriodPassed(currentMonthKey, weekNumber);
  }, [currentMonthKey, weekNumber]);

  // Check if chosen date is strictly in the past
  const isSelectedDatePassed = useMemo(() => {
    return date < todayStr;
  }, [date, todayStr]);

  const isLate = isSelectedWeekPassed || isSelectedDatePassed || isLateSubmission;

  // Helper to handle week selection and auto-adjust date into that week's range
  const handleSelectWeekAndDate = (w: 1 | 2 | 3 | 4) => {
    setWeekNumber(w);
    const range = getWeekDateRange(currentMonthKey, w);
    if (date < range.start || date > range.end) {
      setDate(getDefaultDateForWeek(currentMonthKey, w));
    }
    const passed = isWeekPeriodPassed(currentMonthKey, w);
    if (passed) {
      setIsLateSubmission(true);
      if (!lateReason) {
        setLateReason('Mengisi susulan untuk jadwal literasi yang telah lewat');
      }
    }
  };

  const formatMonthTitle = (ym: string) => {
    const [y, m] = ym.split('-');
    const mName = MONTH_NAMES_ID[parseInt(m, 10) - 1] || m;
    return `${mName} ${y}`;
  };

  // Find entries of current student in this month
  const studentMonthEntries = useMemo(() => {
    return (entries || []).filter((e) => {
      const isThisStudent = e.studentId === currentUser.id || 
        (currentUser.nisn && e.studentNisn === currentUser.nisn) || 
        e.studentName.toLowerCase().trim() === currentUser.name.toLowerCase().trim();
      if (!isThisStudent) return false;
      const d = e.date || e.createdAt;
      return d ? d.startsWith(currentMonthKey) : false;
    });
  }, [entries, currentUser, currentMonthKey]);

  // Week 1, 2, 3, 4 breakdown
  const week1Entry = studentMonthEntries.find((e) => (e.weekNumber || getWeekNumberFromDate(e.date || e.createdAt)) === 1);
  const week2Entry = studentMonthEntries.find((e) => (e.weekNumber || getWeekNumberFromDate(e.date || e.createdAt)) === 2);
  const week3Entry = studentMonthEntries.find((e) => (e.weekNumber || getWeekNumberFromDate(e.date || e.createdAt)) === 3);
  const week4Entry = studentMonthEntries.find((e) => (e.weekNumber || getWeekNumberFromDate(e.date || e.createdAt)) === 4);

  const completedWeeksCount = [week1Entry, week2Entry, week3Entry, week4Entry].filter(Boolean).length;

  // Auto-save draft on every change so form NEVER resets when switching tabs, apps, or browsing
  useEffect(() => {
    try {
      const dataToSave = {
        date,
        weekNumber,
        literacyType,
        readingCategory,
        customCategory,
        bookTitle,
        pagesRead,
        durationMinutes,
        summary,
        moralValue,
        peerDiscussion,
        peerDiscussionNotes,
        photoUrl,
        photoPreview,
        q1,
        q2,
        q3,
        q4,
        isLateSubmission,
        lateReason,
      };
      localStorage.setItem(draftKey, JSON.stringify(dataToSave));
    } catch {
      // ignore
    }
  }, [
    date,
    weekNumber,
    literacyType,
    readingCategory,
    customCategory,
    bookTitle,
    pagesRead,
    durationMinutes,
    summary,
    moralValue,
    peerDiscussion,
    peerDiscussionNotes,
    photoUrl,
    photoPreview,
    q1,
    q2,
    q3,
    q4,
    isLateSubmission,
    lateReason,
    draftKey,
  ]);

  // Helper to downscale and compress photo safely for Firestore (< 80KB)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.72));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file);
        setPhotoUrl(compressed);
        setPhotoPreview(compressed);
      } catch (err) {
        console.warn('File processing notice:', err);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleClearForm = () => {
    if (confirm('Bersihkan isian formulir ini dan mulai dari awal?')) {
      localStorage.removeItem(draftKey);
      setDate(todayStr);
      setLiteracyType('Non Mapel');
      setReadingCategory('Novel / Fiksi');
      setCustomCategory('');
      setBookTitle('');
      setPagesRead('');
      setDurationMinutes(30);
      setSummary('');
      setMoralValue('');
      setPeerDiscussion(false);
      setPeerDiscussionNotes('');
      setPhotoUrl('');
      setPhotoPreview('');
      setQ1(5);
      setQ2(5);
      setQ3(5);
      setQ4(5);
      setIsLateSubmission(false);
      setLateReason('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookTitle.trim()) {
      alert('Mohon isi judul buku atau bacaan');
      return;
    }
    if (!summary.trim()) {
      alert('Mohon tuliskan ringkasan bacaan Anda');
      return;
    }
    if (!moralValue.trim()) {
      alert('Mohon tuliskan pesan atau nilai moral yang didapat');
      return;
    }

    const finalCategory = readingCategory === 'Lainnya' && customCategory.trim() 
      ? customCategory.trim() 
      : readingCategory;

    const reflection: SelfReflection = {
      q1,
      q2,
      q3,
      q4,
      totalScore: totalSelfScore,
    };

    // Guarantee valid jenjang kelas for Firestore schema
    const safeKelas = (currentUser.kelas === '10' || currentUser.kelas === '11' || currentUser.kelas === '12')
      ? currentUser.kelas
      : '10';

    const now = new Date();
    const systemInputDate = getLiveSystemTimestampString(now);

    const newEntry: LiteracyEntry = {
      id: `lit-${Date.now()}`,
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentNisn: currentUser.nisn || '0000000000',
      studentKelas: safeKelas,
      studentRombel: currentUser.rombel || `Kelas ${safeKelas}`,
      date,
      weekNumber,
      literacyType,
      readingCategory: finalCategory,
      bookTitle: bookTitle.trim(),
      pagesRead: pagesRead.trim() || 'Selesai 1 Bab',
      durationMinutes: Number(durationMinutes) || 15,
      summary: summary.trim(),
      moralValue: moralValue.trim(),
      peerDiscussion,
      peerDiscussionNotes: peerDiscussion ? peerDiscussionNotes.trim() : undefined,
      photoUrl: photoUrl.trim() || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
      reflection,
      isLateSubmission: isLate,
      lateReason: isLate ? (lateReason.trim() || 'Pengisian susulan setelah tanggal jadwal terlewat') : undefined,
      systemInputDate,
      createdAt: now.toISOString(),
    };

    onSubmitEntry(newEntry);
    setCreatedEntry(newEntry);
    setSubmittedSuccess(true);

    // Remove draft only after successful submission
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }

    // Confetti effect
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // fallback
    }
  };

  if (submittedSuccess && createdEntry) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Jurnal Literasi Berhasil Dikirim!
          </h2>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            Jurnal membaca Anda untuk tanggal <span className="font-semibold text-slate-900">{createdEntry.date}</span> telah tersimpan di sistem dan diteruskan ke guru pembimbing untuk divalidasi.
          </p>

          {/* Breakdown Skor */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 my-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400">Judul Bacaan</span>
                <p className="text-base font-bold text-slate-900">{createdEntry.bookTitle}</p>
                <p className="text-xs text-indigo-600 font-semibold">{createdEntry.literacyType} • {createdEntry.readingCategory}</p>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase font-bold text-slate-400">Durasi</span>
                <p className="text-sm font-bold text-slate-800">{createdEntry.durationMinutes} Menit</p>
              </div>
            </div>

            {/* Rekap Tanggal Aktivitas & Waktu Input Sistem Komputer */}
            <div className="bg-white/90 p-3 rounded-xl border border-slate-200 mb-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Tanggal Membaca: <strong className="text-slate-900">{createdEntry.date}</strong></span>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px] w-fit">
                <Monitor className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Input Komputer: <strong className="text-slate-900">{createdEntry.systemInputDate || formatSystemInputDate(createdEntry.systemInputDate, createdEntry.createdAt)}</strong></span>
                <span className="text-[9px] text-slate-400 font-sans font-bold">(Terkunci)</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200">
                <div className="text-xs text-slate-500 font-medium">Skor Refleksi Mandiri</div>
                <div className="text-2xl font-black text-emerald-600">
                  {createdEntry.reflection.totalScore} <span className="text-xs font-semibold text-slate-400">/ 20 Poin</span>
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  ✓ Diisi dari 4 pertanyaan refleksi
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-amber-200">
                <div className="text-xs text-slate-500 font-medium">Status Validasi Guru</div>
                <div className="text-lg font-bold text-amber-600 mt-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Menunggu Guru
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Maksimal kontribusi 80 poin
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Nilai akhir (maksimal 100) akan dihitung otomatis saat guru memberikan poin validasi.</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setSubmittedSuccess(false);
                setBookTitle('');
                setSummary('');
                setMoralValue('');
                setPagesRead('');
                setPeerDiscussion(false);
                setPeerDiscussionNotes('');
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
            >
              + Input Jurnal Baru Lagi
            </button>
            <button
              onClick={() => {
                setSubmittedSuccess(false);
                onViewHistory();
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Buka Menu Jurnal Saya
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Header Info */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Formulir Jurnal Literasi Siswa
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Catat aktivitas membaca Anda, resapi hikmahnya, dan evaluasi diri dengan jujur.
            </p>
            {/* Auto-save & Anti-Reset Indicator */}
            <div className="flex items-center gap-2.5 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Draf Tersimpan Otomatis (Anti-Reset)
              </span>
              <button
                type="button"
                onClick={handleClearForm}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="Bersihkan draf formulir jika ingin menulis ulang dari awal"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Kosongkan Draf</span>
              </button>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 font-medium">Siswa Pengisi</span>
            <div className="text-sm font-bold text-slate-900">{currentUser.name}</div>
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {currentUser.rombel || `Kelas ${currentUser.kelas}`} • NISN: {currentUser.nisn || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* ATURAN WAJIB LITERASI 4X PER BULAN & TRACKER MINGGUAN */}
      <div className="bg-gradient-to-r from-[#071d49] via-[#0f3478] to-[#144299] rounded-3xl p-5 sm:p-6 text-white mb-6 shadow-xl border-2 border-blue-400/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Aturan Wajib Literasi Bulanan</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                  Wajib 4x / Bulan
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Setiap siswa wajib mengisi <strong>1 jurnal literasi setiap minggu</strong> (total 4 kali per bulan). Nilai mingguan diakumulasikan di akhir bulan oleh Guru Pembina.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
            <Award className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-bold text-white">
              Capaian Bulan Ini: {completedWeeksCount} / 4 Minggu ({completedWeeksCount * 25}%)
            </span>
          </div>
        </div>

        {/* 4 Weekly Tracker Chips - Clickable to quickly navigate or fill passed weeks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/10">
          {([1, 2, 3, 4] as const).map((w) => {
            const entry = [week1Entry, week2Entry, week3Entry, week4Entry][w - 1];
            const isCurrentActive = weekNumber === w;
            const isPassed = isWeekPeriodPassed(currentMonthKey, w);
            return (
              <button
                key={w}
                type="button"
                onClick={() => handleSelectWeekAndDate(w)}
                className={`p-3 rounded-2xl border text-left text-xs transition-all cursor-pointer ${
                  entry
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-white'
                    : isCurrentActive
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-100 ring-2 ring-amber-400/50'
                    : isPassed
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-400/30 text-rose-200'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
                title={entry ? 'Jurnal minggu ini sudah terisi' : isPassed ? 'Minggu ini sudah lewat - Klik untuk isi susulan' : 'Klik untuk memilih minggu ini'}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-extrabold text-[11px] uppercase tracking-wider">
                    Minggu {w}
                  </span>
                  {entry ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-300">
                      <Check className="w-3 h-3" /> Terisi
                    </span>
                  ) : isPassed ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-300 bg-amber-500/30 px-1.5 py-0.5 rounded">
                      Lewat Jadwal
                    </span>
                  ) : (
                    <span className="text-[10px] text-purple-200 font-bold">
                      {isCurrentActive ? 'Aktif' : 'Tersedia'}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-white/70">
                  {getWeekPeriodLabel(currentMonthKey, w)}
                </div>
                {entry ? (
                  <div className="mt-1 text-[11px] font-bold text-emerald-200 truncate" title={entry.bookTitle}>
                    {entry.bookTitle}
                  </div>
                ) : isPassed ? (
                  <div className="mt-1 text-[10px] font-semibold text-amber-300 flex items-center gap-1">
                    <History className="w-3 h-3 shrink-0" />
                    <span>Klik Isi Susulan</span>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BAGIAN 1: IDENTITAS & RINCIAN BACAAN */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Rincian Informasi Bacaan</h2>
              <p className="text-xs text-slate-500">Tanggal, kategori, judul, durasi, serta opsi susulan jadwal lewat</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Tanggal & Waktu Input Sistem (Otomatis dari Komputer - Tidak Dapat Diedit) */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-indigo-600" />
                  <span>Tanggal Input Jurnal Otomatis dari Komputer</span>
                </label>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200/90 text-slate-700 border border-slate-300 w-fit">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Terkunci Otomatis (Tidak Dapat Diedit)</span>
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={liveSystemTime}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-100/90 text-slate-800 text-xs sm:text-sm font-mono font-bold cursor-not-allowed select-none shadow-inner"
                />
                <Clock className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Waktu dan tanggal input ini dicatat otomatis dari sistem komputer saat ini dan terkunci permanen pada semua catatan jurnal membaca siswa.</span>
              </p>
            </div>

            {/* Tanggal & Pilihan Minggu */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tanggal Membaca (Tanggal Aktivitas)</span> <span className="text-rose-500">*</span>
                </label>
                {isLate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                    <History className="w-3 h-3 text-amber-600" />
                    <span>Input Susulan (Tanggal Terlewat)</span>
                  </span>
                )}
              </div>

              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  const newD = e.target.value;
                  setDate(newD);
                  const autoW = getWeekNumberFromDate(newD);
                  setWeekNumber(autoW);
                  if (newD < todayStr || isWeekPeriodPassed(newD.substring(0, 7), autoW)) {
                    setIsLateSubmission(true);
                    if (!lateReason) {
                      setLateReason('Mengisi susulan untuk jadwal membaca yang telah lewat');
                    }
                  }
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm font-medium transition-all ${
                  isLate
                    ? 'border-amber-400 bg-amber-50/30 text-amber-950 focus:ring-2 focus:ring-amber-200'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-800'
                }`}
              />

              {/* Tombol Pintas Tanggal Terlewat / Susulan */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pintas Tanggal:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDate(todayStr);
                    const curW = getWeekNumberFromDate(todayStr);
                    setWeekNumber(curW);
                    setIsLateSubmission(false);
                  }}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Hari Ini
                </button>
                {([1, 2, 3, 4] as const).map((w) => {
                  const isPassed = isWeekPeriodPassed(currentMonthKey, w);
                  const isCurWeek = weekNumber === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleSelectWeekAndDate(w)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                        isCurWeek
                          ? 'bg-indigo-600 text-white font-bold'
                          : isPassed
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                      title={isPassed ? `Pilih tanggal periode Minggu ${w} yang sudah lewat` : `Pilih Minggu ${w}`}
                    >
                      {isPassed ? `Susulan M${w}` : `Minggu ${w}`}
                    </button>
                  );
                })}
              </div>

              {/* Alert & Form Alasan Input Susulan (Jika Tanggal atau Minggu Sudah Lewat) */}
              {isLate && (
                <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 text-xs text-amber-950 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Mode Pengisian Susulan (Tanggal Jadwal Lewat)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Tanggal membaca ini berada pada periode <strong>Minggu {weekNumber} ({getWeekPeriodLabel(currentMonthKey, weekNumber)})</strong> yang jadwalnya telah terlewati. Isian ini tetap sah dihitung dalam target 4x literasi bulanan Anda.
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Pilih / Tulis Alasan Pengisian Susulan (Opsional):
                    </label>
                    <div className="flex items-center gap-1 flex-wrap mb-1.5">
                      {[
                        'Sakit / Izin Sekolah',
                        'Baru menuntaskan bacaan',
                        'Keterbatasan gawai / internet',
                        'Instruksi susulan guru pembina',
                        'Lupa input tepat waktu',
                      ].map((rsn) => (
                        <button
                          key={rsn}
                          type="button"
                          onClick={() => setLateReason(rsn)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                            lateReason === rsn
                              ? 'bg-amber-700 text-white font-bold'
                              : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-100'
                          }`}
                        >
                          {rsn}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Atau ketik keterangan susulan lainnya..."
                      value={lateReason}
                      onChange={(e) => setLateReason(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs text-amber-950 placeholder-amber-400 outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                </div>
              )}

              {/* Pilihan Target Minggu pada Bulan Tersebut (Target Wajib 1-4) */}
              <div className="mt-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Pilihan Minggu ({formatMonthTitle(currentMonthKey)}):</span>
                  </label>
                  <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    Minggu {weekNumber}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {([1, 2, 3, 4] as const).map((w) => {
                    const isSelected = weekNumber === w;
                    const hasEntry = studentMonthEntries.some(
                      (e) => (e.weekNumber || getWeekNumberFromDate(e.date || e.createdAt)) === w
                    );
                    const isPassed = isWeekPeriodPassed(currentMonthKey, w);
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => handleSelectWeekAndDate(w)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-200'
                            : isPassed && !hasEntry
                            ? 'bg-amber-50/70 hover:bg-amber-100 text-amber-900 border-amber-200'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs">Minggu {w}</span>
                          {hasEntry ? (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              Sudah Ada
                            </span>
                          ) : isPassed ? (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-amber-200 text-amber-900'
                            }`}>
                              Susulan
                            </span>
                          ) : (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-700'
                            }`}>
                              Tersedia
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {getWeekPeriodLabel(currentMonthKey, w)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Durasi Membaca */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Durasi Membaca (Menit) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="300"
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-28 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium text-slate-800"
                />
                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        durationMinutes === mins
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Jenis Literasi: Kitab Suci vs Non Mapel */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Jenis Literasi <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLiteracyType('Kitab Suci');
                    setReadingCategory('Al-Qur\'an');
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${
                    literacyType === 'Kitab Suci'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <BookMarked className="w-4 h-4 text-indigo-600" />
                  Kitab Suci
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLiteracyType('Non Mapel');
                    setReadingCategory('Novel / Fiksi');
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${
                    literacyType === 'Non Mapel'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Non Mapel
                </button>
              </div>
            </div>

            {/* Jenis Bacaan / Kategori */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Jenis Bacaan / Genre <span className="text-rose-500">*</span>
              </label>
              <select
                value={readingCategory}
                onChange={(e) => setReadingCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium text-slate-800 bg-white"
              >
                {literacyType === 'Kitab Suci' ? (
                  <>
                    <option value="Al-Qur'an">Al-Qur'an & Terjemahan</option>
                    <option value="Hadits">Hadits / Sirah Nabawiyah</option>
                    <option value="Alkitab">Alkitab (Perjanjian Lama / Baru)</option>
                    <option value="Weda">Weda / Bhagavad Gita</option>
                    <option value="Tripitaka">Tripitaka / Dhammapada</option>
                    <option value="Si Shu / Wu Jing">Si Shu / Wu Jing</option>
                    <option value="Lainnya">Kitab Suci / Bacaan Keagamaan Lainnya</option>
                  </>
                ) : (
                  <>
                    <option value="Novel / Fiksi">Novel / Sastra Fiksi</option>
                    <option value="Pengembangan Diri / Motivasi">Pengembangan Diri (Self Improvement)</option>
                    <option value="Biografi Tokoh">Biografi / Memoar Tokoh Inspiratif</option>
                    <option value="Sains Populer">Sains & Teknologi Populer</option>
                    <option value="Sejarah & Sosial">Sejarah & Pengetahuan Sosial</option>
                    <option value="Ensiklopedia / Wawasan Umum">Ensiklopedia / Wawasan Global</option>
                    <option value="Cerpen / Antologi">Kumpulan Cerpen / Dongeng Edukatif</option>
                    <option value="Artikel Ilmiah Populer / Jurnal">Artikel Ilmiah Populer / Majalah</option>
                    <option value="Lainnya">Lainnya</option>
                  </>
                )}
              </select>
            </div>

            {readingCategory === 'Lainnya' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Sebutkan Jenis Bacaan Khusus
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Majalah Riset Geografi, Puisi Klasik..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-sm outline-none"
                />
              </div>
            )}

            {/* Judul Buku / Bacaan */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Judul Buku / Nama Bacaan / Surah <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Filosofi Teras / Surah Luqman / Biografi B.J. Habibie"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium text-slate-800"
              />
            </div>

            {/* Halaman yang dibaca */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Halaman / Ayat / Bab yang Dibaca <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Halaman 25 - 48 atau Juz 2, QS Al-Baqarah 142-160"
                value={pagesRead}
                onChange={(e) => setPagesRead(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* BAGIAN 2: RINGKASAN, NILAI MORAL & DISKUSI */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Ulasan & Refleksi Naratif</h2>
              <p className="text-xs text-slate-500">Tuliskan ringkasan isi bacaan dan hikmah yang Anda peroleh</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Ringkasan Bacaan */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Ringkasan Bacaan <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">
                  {summary.split(/\s+/).filter(Boolean).length} kata
                </span>
              </div>
              <textarea
                required
                rows={4}
                placeholder="Ceritakan pokok pikiran, alur cerita, atau gagasan utama yang diuraikan dalam teks yang Anda baca hari ini..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium text-slate-800"
              />
            </div>

            {/* Pesan / Nilai Moral */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Pesan atau Nilai Moral <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Nilai kebaikan, inspirasi budi pekerti, atau pelajaran berharga apa yang dapat Anda teladani dan terapkan dalam kehidupan sehari-hari?"
                value={moralValue}
                onChange={(e) => setMoralValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium text-slate-800"
              />
            </div>

            {/* Pilihan Diskusi dengan Teman */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                <Users2 className="w-4 h-4 text-indigo-500" />
                Pilihan Diskusi dengan Teman <span className="text-rose-500">*</span>
              </label>

              <div className="flex items-center gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="peerDiscussion"
                    checked={peerDiscussion === true}
                    onChange={() => setPeerDiscussion(true)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Ya, berdiskusi dengan teman</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="peerDiscussion"
                    checked={peerDiscussion === false}
                    onChange={() => setPeerDiscussion(false)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Tidak (Membaca Mandiri)</span>
                </label>
              </div>

              {peerDiscussion && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-indigo-900 mb-1">
                    Nama Teman & Poin Diskusi yang Dibahas:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Berdiskusi bersama Nabila tentang cara mengatasi kegagalan..."
                    value={peerDiscussionNotes}
                    onChange={(e) => setPeerDiscussionNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-indigo-200 focus:border-indigo-500 text-sm outline-none bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BAGIAN 3: DOKUMENTASI FOTO KEGIATAN */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload Foto Kegiatan Membaca</h2>
              <p className="text-xs text-slate-500">Unggah bukti foto saat Anda sedang membaca buku atau kitab suci</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Image Preview */}
            <div className="relative aspect-4/3 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-50">
              {photoPreview ? (
                <div className="relative w-full h-full group">
                  <img
                    src={photoPreview}
                    alt="Pratinjau Dokumentasi Membaca"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl('');
                      setPhotoPreview('');
                    }}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5"
                    title="Hapus foto ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Foto</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                  <ImageIcon className="w-8 h-8 mb-2 text-slate-300" />
                  <span className="text-xs font-bold text-slate-600">Belum Ada Foto Terpilih</span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Silakan unggah foto kegiatan membaca Anda dari galeri atau kamera
                  </span>
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="md:col-span-2 space-y-3">
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold cursor-pointer hover:bg-indigo-100 transition-colors shadow-xs">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>
                    {isCompressing
                      ? 'Memproses & Mengoptimalkan Foto...'
                      : photoPreview
                      ? 'Ganti File Foto (Kamera / Galeri)'
                      : 'Pilih File Foto dari Perangkat (Kamera / Galeri)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isCompressing}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Format JPG, PNG, atau WEBP (Maksimal 5MB, otomatis dikompres aman untuk Cloud Firestore).
                </p>
              </div>

              {photoPreview && (
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Foto dokumentasi membaca dari perangkat berhasil dipilih dan siap disimpan.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BAGIAN 4: REFLEKSI DIRI (4 PERTANYAAN, SKALA 1 - 5) */}
        <div className="bg-gradient-to-br from-indigo-50/60 via-white to-sky-50/40 rounded-2xl border-2 border-indigo-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                4
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Bagian Refleksi Diri (Skor Mandiri)
                </h2>
                <p className="text-xs text-slate-600">
                  Nilai secara jujur pemahaman dan dampak bacaan hari ini (Skala 1 = Sangat Rendah hingga 5 = Sangat Setuju / Maksimal)
                </p>
              </div>
            </div>

            {/* Live Reflection Score Gauge */}
            <div className="text-right bg-white px-3.5 py-1.5 rounded-xl border border-indigo-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Skor Refleksi</span>
              <div className="text-lg font-black text-indigo-700">
                {totalSelfScore} <span className="text-xs font-semibold text-slate-400">/ 20</span>
              </div>
            </div>
          </div>

          {/* Scale Legend Guide */}
          <div className="bg-white/80 rounded-xl p-3 border border-indigo-100 mb-5 text-[11px] text-slate-600 flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold text-indigo-900">Petunjuk Skala Nilai:</span>
            <span><strong className="text-slate-800">1:</strong> Sangat Kurang</span>
            <span><strong className="text-slate-800">2:</strong> Kurang</span>
            <span><strong className="text-slate-800">3:</strong> Cukup</span>
            <span><strong className="text-slate-800">4:</strong> Baik / Setuju</span>
            <span><strong className="text-indigo-600">5:</strong> Sangat Baik / Sangat Setuju</span>
          </div>

          <div className="space-y-5">
            {/* Pertanyaan 1 */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <p className="text-sm font-bold text-slate-900 mb-3">
                1. "Saya memahami dengan baik pesan utama, cerita, atau ajaran dari bacaan hari ini."
              </p>
              <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQ1(val)}
                    className={`flex-1 sm:flex-initial sm:w-14 py-2.5 rounded-xl font-bold text-sm transition-all flex flex-col items-center justify-center gap-0.5 ${
                      q1 === val
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{val}</span>
                    {q1 === val && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Pertanyaan 2 */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <p className="text-sm font-bold text-slate-900 mb-3">
                2. "Saya menemukan nilai kebaikan, hikmah, atau inspirasi positif dari apa yang saya baca."
              </p>
              <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQ2(val)}
                    className={`flex-1 sm:flex-initial sm:w-14 py-2.5 rounded-xl font-bold text-sm transition-all flex flex-col items-center justify-center gap-0.5 ${
                      q2 === val
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{val}</span>
                    {q2 === val && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Pertanyaan 3 */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <p className="text-sm font-bold text-slate-900 mb-3">
                3. "Bacaan hari ini mendorong saya untuk menjadi pribadi yang lebih baik dalam kehidupan sehari-hari."
              </p>
              <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQ3(val)}
                    className={`flex-1 sm:flex-initial sm:w-14 py-2.5 rounded-xl font-bold text-sm transition-all flex flex-col items-center justify-center gap-0.5 ${
                      q3 === val
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{val}</span>
                    {q3 === val && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Pertanyaan 4 */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <p className="text-sm font-bold text-slate-900 mb-3">
                4. "Saya membaca dan merenungkan isi bacaan hari ini dengan penuh kesadaran dan tanpa paksaan."
              </p>
              <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQ4(val)}
                    className={`flex-1 sm:flex-initial sm:w-14 py-2.5 rounded-xl font-bold text-sm transition-all flex flex-col items-center justify-center gap-0.5 ${
                      q4 === val
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{val}</span>
                    {q4 === val && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Information Note for Student */}
          <div className="mt-5 p-4 rounded-2xl bg-blue-950 text-white flex items-start gap-3 border border-blue-800 shadow-md">
            <HeartHandshake className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-sm text-white">Validasi Penilaian Guru</p>
              <p className="text-blue-100 mt-0.5">
                Guru akan memvalidasi kesesuaian ringkasan, pesan moral, dan foto kegiatan Anda sebelum nilai akhir diterbitkan.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-black bg-blue-600 text-white hover:bg-blue-700 active:scale-98 transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer ring-2 ring-blue-500/20"
          >
            <CheckCircle2 className="w-5 h-5 text-amber-300" />
            Kirimkan Jurnal Literasi Sekarang
          </button>
        </div>
      </form>
    </div>
  );
};
