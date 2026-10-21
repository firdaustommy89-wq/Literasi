import React, { useState, useMemo } from 'react';
import { User, LiteracyEntry, MonthlyVerification, SemesterType } from '../types';
import { 
  AVAILABLE_ACADEMIC_YEARS, 
  previewAcademicYearPromotion, 
  PromotionPreviewSummary 
} from '../utils/academicYearSync';
import confetti from 'canvas-confetti';
import { 
  X, 
  GraduationCap, 
  Calendar, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  RefreshCw, 
  Users, 
  BookOpen, 
  ShieldAlert,
  Search
} from 'lucide-react';

interface AcademicYearSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYear: string;
  semester: SemesterType;
  users: User[];
  entries: LiteracyEntry[];
  monthlyVerifications: MonthlyVerification[];
  onUpdateAcademicYear: (year: string, semester: SemesterType) => void;
  onExecutePromotion: (newYear: string, newSemester: SemesterType) => Promise<{ success: boolean; message: string }>;
  onSynchronizeRombelOnly: () => Promise<{ success: boolean; message: string; updatedEntries: number; updatedVerifications: number }>;
}

export const AcademicYearSyncModal: React.FC<AcademicYearSyncModalProps> = ({
  isOpen,
  onClose,
  academicYear,
  semester,
  users,
  entries,
  monthlyVerifications,
  onUpdateAcademicYear,
  onExecutePromotion,
  onSynchronizeRombelOnly,
}) => {
  const [activeTab, setActiveTab] = useState<'sync-rombel' | 'promote-year'>('sync-rombel');

  // Year & Semester selection for Promotion
  const [targetAcademicYear, setTargetAcademicYear] = useState<string>(() => {
    const currentIndex = AVAILABLE_ACADEMIC_YEARS.indexOf(academicYear);
    if (currentIndex >= 0 && currentIndex < AVAILABLE_ACADEMIC_YEARS.length - 1) {
      return AVAILABLE_ACADEMIC_YEARS[currentIndex + 1];
    }
    return academicYear;
  });
  const [targetSemester, setTargetSemester] = useState<SemesterType>('Ganjil');

  // Simple semester switch without promotion
  const [simpleSemester, setSimpleSemester] = useState<SemesterType>(semester);
  const [simpleAcademicYear, setSimpleAcademicYear] = useState<string>(academicYear);

  // Search filter for preview table
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewFilter, setPreviewFilter] = useState<'all' | '10' | '11' | '12'>('all');

  // Operation loading & status
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfirmPromotion, setShowConfirmPromotion] = useState(false);

  // Generate promotion simulation preview
  const previewData: PromotionPreviewSummary = useMemo(() => {
    return previewAcademicYearPromotion(users);
  }, [users]);

  // Filtered preview list
  const filteredStudentPreviews = useMemo(() => {
    return previewData.studentPreviews.filter((p) => {
      if (previewFilter === '10' && !p.oldGrade.includes('10')) return false;
      if (previewFilter === '11' && !p.oldGrade.includes('11')) return false;
      if (previewFilter === '12' && !p.oldGrade.includes('12')) return false;
      if (previewSearch.trim()) {
        const q = previewSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.nisn.toLowerCase().includes(q) ||
          p.oldRombel.toLowerCase().includes(q) ||
          p.newRombel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [previewData.studentPreviews, previewFilter, previewSearch]);

  if (!isOpen) return null;

  // Handler for simple Year/Semester switch
  const handleSaveSimpleConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAcademicYear(simpleAcademicYear, simpleSemester);
    setStatusMessage({
      type: 'success',
      text: `Berhasil mengubah Tahun Ajaran menjadi ${simpleAcademicYear} (${simpleSemester}).`,
    });
  };

  // Handler for Rombel Consistency Sync
  const handleRunRombelSync = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await onSynchronizeRombelOnly();
      setStatusMessage({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
      if (res.success) {
        try {
          confetti({
            particleCount: 60,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: 'Terjadi kesalahan saat menyinkronkan data rombel.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for Promotion Execution
  const handleConfirmExecutePromotion = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await onExecutePromotion(targetAcademicYear, targetSemester);
      setStatusMessage({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
      setShowConfirmPromotion(false);
      if (res.success) {
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.5 },
          });
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: 'Terjadi kesalahan saat mengeksekusi kenaikan kelas.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const studentCount = users.filter((u) => u.role === 'siswa').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider">
                  Admin Tool
                </span>
                <span className="text-xs text-purple-200 font-medium">SMAN 2 Samarinda</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Tahun Ajaran & Sinkronisasi Rombel
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Info Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">Konfigurasi Aktif:</span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 text-xs font-black">
              <Calendar className="w-3.5 h-3.5 text-purple-700" />
              <span>TA {academicYear}</span>
              <span className="text-purple-400">•</span>
              <span>Semester {semester}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-200/80 text-slate-700 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>{studentCount} Siswa</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-200/80 text-slate-700 text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>{entries.length} Entri Jurnal</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Tersimpan di Cloud Firestore
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-2xl border flex items-center justify-between gap-3 shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Tab Selector */}
        <div className="px-6 pt-4 shrink-0 flex items-center gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('sync-rombel')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'sync-rombel'
                ? 'border-purple-700 text-purple-900 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-purple-600" />
            <span>1. Sinkronkan Rombel ke Seluruh Data</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('promote-year')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'promote-year'
                ? 'border-purple-700 text-purple-900 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-purple-600" />
            <span>2. Ganti Tahun Ajaran & Kenaikan Kelas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-black">
              Otomatis
            </span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: SINKRONISASI ROMBEL */}
          {activeTab === 'sync-rombel' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Sinkronisasi Konsistensi Rombel ke Seluruh Data
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Fitur ini akan mencocokkan setiap entri jurnal literasi dan verifikasi rapor bulanan siswa dengan rombongan kelas siswa yang terdaftar di database saat ini. Menjamin filter kelas, tabel penilaian guru, dan rekap cetak PDF 100% konsisten.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-blue-200/60">
                  <div className="bg-white/80 p-3 rounded-xl border border-blue-100">
                    <div className="text-[11px] font-semibold text-slate-500">Data Pengguna Siswa</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">{studentCount} Akun</div>
                    <div className="text-[10px] text-slate-400">Sebagai sumber master rombel</div>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-blue-100">
                    <div className="text-[11px] font-semibold text-slate-500">Log Entri Jurnal</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">{entries.length} Jurnal</div>
                    <div className="text-[10px] text-slate-400">Akan disinkronkan rombelnya</div>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-blue-100">
                    <div className="text-[11px] font-semibold text-slate-500">Verifikasi Bulanan</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">{monthlyVerifications.length} Rapor</div>
                    <div className="text-[10px] text-slate-400">Akan disinkronkan rombelnya</div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleRunRombelSync}
                    disabled={isLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'Sedang Menyinkronkan...' : 'Jalankan Sinkronisasi Rombel Sekarang'}</span>
                  </button>
                </div>
              </div>

              {/* Ganti Semester Cepat (Tanpa Naik Kelas) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Ubah Semester Aktif (Tanpa Mengubah Kelas)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gunakan ini jika Anda hanya ingin berganti antara Semester Ganjil dan Semester Genap dalam tahun ajaran yang sama.
                </p>

                <form onSubmit={handleSaveSimpleConfig} className="mt-4 flex flex-wrap items-center gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tahun Ajaran</label>
                    <select
                      value={simpleAcademicYear}
                      onChange={(e) => setSimpleAcademicYear(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {AVAILABLE_ACADEMIC_YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Semester</label>
                    <select
                      value={simpleSemester}
                      onChange={(e) => setSimpleSemester(e.target.value as SemesterType)}
                      className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Ganjil">Semester Ganjil</option>
                      <option value="Genap">Semester Genap</option>
                    </select>
                  </div>

                  <div className="self-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
                    >
                      Simpan Status TA
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: KENAIKAN KELAS & TAHUN AJARAN BARU */}
          {activeTab === 'promote-year' && (
            <div className="space-y-6">
              {/* Form Konfigurasi Target */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-700" />
                  <h3 className="text-sm font-black text-slate-900">
                    Konfigurasi Tahun Ajaran Baru & Kenaikan Kelas
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pilih Tahun Ajaran Baru Tujuan
                    </label>
                    <select
                      value={targetAcademicYear}
                      onChange={(e) => setTargetAcademicYear(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      {AVAILABLE_ACADEMIC_YEARS.map((y) => (
                        <option key={y} value={y}>
                          Tahun Ajaran {y} {y === academicYear ? '(Aktif Saat Ini)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Semester Awal Tahun Ajaran Baru
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetSemester('Ganjil')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          targetSemester === 'Ganjil'
                            ? 'bg-purple-700 text-white border-purple-700'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Semester Ganjil
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetSemester('Genap')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          targetSemester === 'Genap'
                            ? 'bg-purple-700 text-white border-purple-700'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Semester Genap
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ringkasan Simulasi Kenaikan Kelas */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Simulasi Pemetaan Kenaikan Rombel:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-emerald-800">Kelas 10 → Kelas 11</div>
                    <div className="text-xl font-black text-emerald-950 mt-1">
                      {previewData.grade10To11Count} Siswa
                    </div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">Contoh: X MIPA 1 → XI MIPA 1</div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-blue-800">Kelas 11 → Kelas 12</div>
                    <div className="text-xl font-black text-blue-950 mt-1">
                      {previewData.grade11To12Count} Siswa
                    </div>
                    <div className="text-[10px] text-blue-700 mt-0.5">Contoh: XI MIPA 1 → XII MIPA 1</div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-amber-800">Kelas 12 → Lulus / Alumni</div>
                    <div className="text-xl font-black text-amber-950 mt-1">
                      {previewData.graduatedCount} Siswa
                    </div>
                    <div className="text-[10px] text-amber-700 mt-0.5">Status: Alumni (XII MIPA 1)</div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-slate-600">Total Siswa Diproses</div>
                    <div className="text-xl font-black text-slate-900 mt-1">
                      {previewData.totalStudents} Siswa
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Sinkron ke seluruh jurnal</div>
                  </div>
                </div>
              </div>

              {/* Tabel Pratinjau Siswa */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-black text-slate-800">
                    Pratinjau Kenaikan Rombel Siswa ({filteredStudentPreviews.length} data)
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                        placeholder="Cari nama/rombel..."
                        className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:ring-1 focus:ring-purple-500 outline-none w-36 sm:w-48"
                      />
                    </div>

                    <select
                      value={previewFilter}
                      onChange={(e) => setPreviewFilter(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 font-semibold outline-none"
                    >
                      <option value="all">Semua Jenjang</option>
                      <option value="10">Kelas 10 Lama</option>
                      <option value="11">Kelas 11 Lama</option>
                      <option value="12">Kelas 12 Lama</option>
                    </select>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {filteredStudentPreviews.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Tidak ada data siswa yang cocok dengan filter.
                    </div>
                  ) : (
                    filteredStudentPreviews.map((p) => (
                      <div key={p.id} className="p-2.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">NISN: {p.nisn}</div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {p.oldRombel}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            p.status === 'Lulus / Alumni'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-purple-100 text-purple-900 border border-purple-200'
                          }`}>
                            {p.newRombel}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Danger Notice & Action Buttons */}
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-rose-900 uppercase">
                      Konfirmasi Tindakan Kenaikan Kelas
                    </h4>
                    <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                      Tindakan ini akan memperbarui tingkat kelas siswa, menaikkan nama rombel mereka, dan menyinkronkan seluruh catatan jurnal dan rapor ke Tahun Ajaran <strong>{targetAcademicYear}</strong>.
                    </p>
                  </div>
                </div>

                {!showConfirmPromotion ? (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPromotion(true)}
                      className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer transition-all flex items-center gap-2"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Lanjutkan ke Eksekusi Kenaikan Kelas</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-white rounded-xl border border-rose-300 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs font-bold text-rose-900 text-center sm:text-left">
                      Yakin jalankan kenaikan kelas untuk {previewData.totalStudents} siswa ke TA {targetAcademicYear}?
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowConfirmPromotion(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmExecutePromotion}
                        disabled={isLoading}
                        className="px-4 py-1.5 rounded-lg text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isLoading ? 'Sedang Memproses...' : 'Ya, Eksekusi Sekarang'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            SMAN 2 Samarinda • Sistem Penilaian Literasi
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
          >
            Tutup Jendela
          </button>
        </div>

      </div>
    </div>
  );
};
