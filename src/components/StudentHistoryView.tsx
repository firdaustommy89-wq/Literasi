import React, { useState, useMemo } from 'react';
import { User, LiteracyEntry, MonthlyVerification } from '../types';
import { Pagination } from './Pagination';
import { 
  calculateStudentMonthlyAccumulation, 
  getWeekPeriodLabel, 
  getWeekNumberFromDate,
  MONTH_NAMES_ID,
  getEntryScore,
  formatSystemInputDate
} from '../utils/accumulation';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Award, 
  CheckCircle2, 
  PlusCircle, 
  Sparkles, 
  MessageSquare, 
  Target, 
  Check, 
  AlertCircle, 
  HelpCircle, 
  ShieldCheck, 
  Bell, 
  CheckCheck, 
  History,
  Monitor,
  Lock
} from 'lucide-react';

interface StudentHistoryViewProps {
  currentUser: User;
  entries: LiteracyEntry[];
  monthlyVerifications?: MonthlyVerification[];
  onAddNewEntry: () => void;
  unreadValidationIds?: string[];
  onMarkSingleRead?: (id: string) => void;
  onMarkAllRead?: () => void;
}

export const StudentHistoryView: React.FC<StudentHistoryViewProps> = ({
  currentUser,
  entries,
  monthlyVerifications = [],
  onAddNewEntry,
  unreadValidationIds = [],
  onMarkSingleRead,
  onMarkAllRead,
}) => {
  // Filter all entries for this student
  const studentEntries = useMemo(() => {
    return entries.filter(
      (e) => e.studentId === currentUser.id || (currentUser.nisn && e.studentNisn === currentUser.nisn)
    );
  }, [entries, currentUser]);

  // Current month key
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<'all' | 1 | 2 | 3 | 4>('all');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyPerPage, setHistoryPerPage] = useState<number>(5);

  // Available months from student's entries + current month
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthKey);
    studentEntries.forEach((e) => {
      const d = e.date || e.createdAt;
      if (d && d.length >= 7) {
        set.add(d.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [studentEntries, currentMonthKey]);

  // Calculate monthly accumulation for selected month
  const monthlySummary = useMemo(() => {
    return calculateStudentMonthlyAccumulation(
      currentUser,
      selectedMonth,
      entries,
      monthlyVerifications
    );
  }, [currentUser, selectedMonth, entries, monthlyVerifications]);

  // Filter entries based on selected month and selected week
  const filteredHistoryEntries = useMemo(() => {
    return studentEntries.filter((e) => {
      const d = e.date || e.createdAt;
      if (selectedMonth && (!d || !d.startsWith(selectedMonth))) return false;
      if (selectedWeekFilter !== 'all') {
        const w = e.weekNumber || getWeekNumberFromDate(d);
        if (w !== selectedWeekFilter) return false;
      }
      return true;
    });
  }, [studentEntries, selectedMonth, selectedWeekFilter]);

  // Paginated entries for 1-Page Layout
  const paginatedHistoryEntries = useMemo(() => {
    const start = (historyPage - 1) * historyPerPage;
    return filteredHistoryEntries.slice(start, start + historyPerPage);
  }, [filteredHistoryEntries, historyPage, historyPerPage]);

  const totalEntries = studentEntries.length;
  const totalMinutes = studentEntries.reduce((acc, curr) => acc + (Number(curr.durationMinutes) || 0), 0);
  const validatedEntries = studentEntries.filter((e) => !!e.teacherValidation);
  const avgScore = validatedEntries.length > 0
    ? Math.round(
        (validatedEntries.reduce((acc, curr) => acc + (curr.totalFinalScore || 0), 0) /
          validatedEntries.length) *
          10
      ) / 10
    : 0;

  const formatMonthTitle = (ym: string) => {
    const [y, m] = ym.split('-');
    const mName = MONTH_NAMES_ID[parseInt(m, 10) - 1] || m;
    return `${mName} ${y}`;
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Riwayat Jurnal & Nilai Literasi Saya
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Akun: <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.rombel || `Kelas ${currentUser.kelas}`}) • NISN: {currentUser.nisn || '-'}
          </p>
        </div>

        <button
          onClick={onAddNewEntry}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100 self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Input Jurnal Baru
        </button>
      </div>

      {/* Real-time Notification Banner for Newly Validated Entries */}
      {unreadValidationIds.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-5 sm:p-6 shadow-xl shadow-emerald-900/10 mb-8 border border-emerald-400/40 relative overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
                <Bell className="w-6 h-6 text-amber-300 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider">
                    {unreadValidationIds.length} Nilai Baru
                  </span>
                  <span className="text-xs text-emerald-100 font-semibold">
                    Notifikasi Real-Time
                  </span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight mt-1">
                  Guru Pembimbing Telah Memvalidasi Jurnal Anda!
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Nilai dan catatan evaluasi guru telah diberikan. Periksa rincian skor pada kartu jurnal di bawah ini.
                </p>
              </div>
            </div>

            {onMarkAllRead && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs bg-white text-emerald-800 hover:bg-emerald-50 transition-all shadow-md shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span>Tandai Semua Dilihat</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CARD AKUMULASI NILAI BULANAN (TARGET 4 MINGGU) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Akumulasi Nilai Literasi Bulanan (Target Wajib 4 Minggu)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                  Wajib 4x / Bulan
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nilai pengisian jurnal di setiap minggu diakumulasikan setiap akhir bulan oleh guru pembimbing.
              </p>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500 ml-1.5 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer shadow-2xs"
            >
              {availableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  Periode {formatMonthTitle(ym)} {ym === currentMonthKey ? '(Bulan Ini)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Weekly Progress Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-5">
          {([1, 2, 3, 4] as const).map((w) => {
            const entry = [
              monthlySummary.week1Entry,
              monthlySummary.week2Entry,
              monthlySummary.week3Entry,
              monthlySummary.week4Entry,
            ][w - 1];

            const isFilterActive = selectedWeekFilter === w;
            return (
              <div
                key={w}
                onClick={() => setSelectedWeekFilter(selectedWeekFilter === w ? 'all' : w)}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
                  isFilterActive
                    ? 'ring-2 ring-indigo-500 shadow-md bg-indigo-50/40 border-indigo-300'
                    : entry
                    ? 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200 hover:border-indigo-200'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                }`}
                title={`Klik untuk memfilter jurnal Minggu ${w}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Minggu {w}
                    </span>
                    {entry ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" /> Terisi
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                        Belum Ada
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium">
                    {getWeekPeriodLabel(selectedMonth, w)}
                  </div>

                  {entry ? (
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <div className="font-bold text-xs text-slate-900 line-clamp-1" title={entry.bookTitle}>
                        {entry.bookTitle}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
                        <span>{entry.date}</span>
                        <span className="font-bold text-indigo-600">
                          {entry.teacherValidation ? (
                            `${entry.totalFinalScore || getEntryScore(entry)} Poin`
                          ) : (
                            <span className="text-amber-600 italic">Menunggu Skor Guru</span>
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-[11px] text-slate-400 italic">
                      Wajib mengumpulkan 1 jurnal pada minggu ini
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Monthly Score & Verification Result Strip */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Award className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-indigo-300">
                Nilai Final Akhir Bulan (Rata-rata 4 Minggu) • {formatMonthTitle(selectedMonth)}
              </div>
              <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                <span className="text-3xl font-black text-amber-300">
                  {monthlySummary.calculatedAccumulatedScore > 0 ? monthlySummary.calculatedAccumulatedScore : '-'}
                </span>
                <span className="text-xs text-indigo-200 font-semibold">/ 100 Poin</span>
                {(monthlySummary.monthlyVerification?.predicate || monthlySummary.weeklyBreakdown?.predicate) && (
                  <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 shadow-2xs">
                    Predikat {monthlySummary.monthlyVerification?.predicate || monthlySummary.weeklyBreakdown?.predicate}
                  </span>
                )}
                {monthlySummary.isFullyValidated && (
                  <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400 text-slate-950 flex items-center gap-1">
                    <Check className="w-3 h-3 text-slate-950" />
                    <span>Nilai Final 4 Minggu Lengkap & Sah</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-indigo-200 mt-1 space-y-0.5">
                <div>
                  Rata-rata 4 Minggu: <strong>{monthlySummary.completedWeeks} dari 4 Minggu Terisi ({monthlySummary.completedWeeks * 25}%)</strong> • <strong className="text-emerald-300">{monthlySummary.validatedWeeksCount || 0} dari 4 Minggu Tervalidasi Guru</strong>
                </div>
                {monthlySummary.weeklyBreakdown?.formula && monthlySummary.weeklyBreakdown.formula !== '-' && (
                  <div className="font-mono text-[11px] text-amber-200">
                    Rumus (Rata-rata 4 Minggu): {monthlySummary.weeklyBreakdown.formula} = {monthlySummary.calculatedAccumulatedScore} Poin
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Teacher Monthly Verification Badge & Notes */}
          <div className="md:max-w-md bg-white/10 rounded-xl p-3.5 border border-white/10 text-xs">
            {monthlySummary.monthlyVerification ? (
              <div>
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Tervalidasi & Terverifikasi Akhir Bulan</span>
                </div>
                <div className="text-white/80 text-[11px]">
                  Oleh Guru: <strong>{monthlySummary.monthlyVerification.teacherName}</strong> ({monthlySummary.monthlyVerification.verifiedAt})
                </div>
                {monthlySummary.monthlyVerification.teacherNotes && (
                  <div className="mt-1.5 text-[11px] text-amber-200 italic bg-black/20 p-2 rounded-lg">
                    "{monthlySummary.monthlyVerification.teacherNotes}"
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Proses Pengumpulan / Menunggu Verifikasi Akhir Bulan</span>
                </div>
                <p className="text-indigo-200 text-[11px]">
                  {monthlySummary.completedWeeks < 4
                    ? `Masih kurang ${4 - monthlySummary.completedWeeks} minggu lagi untuk melengkapi target bulanan 4x pengisian.`
                    : 'Target 4 minggu lengkap! Guru pembina akan segera memverifikasi nilai akumulasi akhir bulan Anda.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Jurnal</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{totalEntries}</div>
          <span className="text-[11px] text-slate-500">Aktivitas membaca</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Waktu</span>
          <div className="text-2xl sm:text-3xl font-black text-sky-600 mt-1">{totalMinutes}</div>
          <span className="text-[11px] text-slate-500">Menit membaca</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tervalidasi Guru</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{validatedEntries.length}</div>
          <span className="text-[11px] text-slate-500">Dari {totalEntries} jurnal</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rata-rata Nilai</span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1">
            {avgScore > 0 ? avgScore : '-'} <span className="text-xs font-semibold text-slate-400">/ 100</span>
          </div>
          <span className="text-[11px] text-slate-500">Skor kumulatif</span>
        </div>
      </div>

      {/* Pilihan Minggu Selector Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Pilihan Minggu ({formatMonthTitle(selectedMonth)}):
            </span>
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
              Semua Minggu (Rekap)
            </button>
            {([1, 2, 3, 4] as const).map((w) => {
              const weekSum = [
                monthlySummary.week1Summary,
                monthlySummary.week2Summary,
                monthlySummary.week3Summary,
                monthlySummary.week4Summary,
              ][w - 1];
              const isFilled = weekSum?.hasSubmission || false;
              const isVal = weekSum?.isValidated || false;

              return (
                <button
                  key={w}
                  onClick={() => setSelectedWeekFilter(w)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedWeekFilter === w
                      ? 'bg-indigo-600 text-white shadow-xs font-black ring-2 ring-indigo-300'
                      : isFilled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Minggu {w}</span>
                  {isFilled && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isVal ? 'bg-emerald-500' : 'bg-amber-400'
                      }`}
                      title={isVal ? 'Sudah Dinilai Guru' : 'Menunggu Penilaian'}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Highlight for Selected Week if not 'all' */}
        {selectedWeekFilter !== 'all' && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/70 p-3 rounded-xl">
            <div>
              <div className="font-extrabold text-slate-800">
                Minggu {selectedWeekFilter} • Periode: {getWeekPeriodLabel(selectedMonth, selectedWeekFilter)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Target wajib: 1 jurnal literasi untuk minggu ini.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {(() => {
                const weekSum = [
                  monthlySummary.week1Summary,
                  monthlySummary.week2Summary,
                  monthlySummary.week3Summary,
                  monthlySummary.week4Summary,
                ][selectedWeekFilter - 1];

                if (!weekSum || !weekSum.hasSubmission) {
                  return (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Belum Ada Jurnal di Minggu {selectedWeekFilter}
                    </span>
                  );
                }

                if (weekSum.isValidated) {
                  return (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Nilai Guru: <strong>{weekSum.weeklyFinalScore} / 100</strong></span>
                    </span>
                  );
                }

                return (
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Jurnal Terisi ({weekSum.entriesCount}x) - Menunggu Skor Guru</span>
                  </span>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Entry Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-black text-slate-900">
            {selectedWeekFilter === 'all'
              ? `Semua Catatan Jurnal Membaca (${formatMonthTitle(selectedMonth)})`
              : `Catatan Jurnal Minggu ${selectedWeekFilter} (${getWeekPeriodLabel(selectedMonth, selectedWeekFilter)})`}
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            {filteredHistoryEntries.length} Jurnal Ditampilkan
          </span>
        </div>

        {filteredHistoryEntries.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              {selectedWeekFilter === 'all'
                ? `Belum Ada Catatan Jurnal di Bulan ${formatMonthTitle(selectedMonth)}`
                : `Belum Ada Jurnal untuk Minggu ${selectedWeekFilter}`}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 max-w-md mx-auto">
              {selectedWeekFilter === 'all'
                ? 'Anda belum mengirimkan jurnal literasi membaca untuk bulan ini. Mulai membaca sekarang dan penuhi target 4 minggu Anda!'
                : `Anda belum mengisi jurnal pada periode ${getWeekPeriodLabel(selectedMonth, selectedWeekFilter)}. Lengkapi segera untuk mendapatkan nilai mingguan dari guru!`}
            </p>
            <button
              onClick={onAddNewEntry}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Input Jurnal Sekarang
            </button>
          </div>
        ) : (
          paginatedHistoryEntries.map((entry) => {
            const isVal = !!entry.teacherValidation;
            const isUnread = unreadValidationIds.includes(entry.id);
            return (
              <div
                key={entry.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all relative overflow-hidden ${
                  isUnread
                    ? 'border-emerald-500 ring-2 ring-emerald-400/80 bg-emerald-50/15 shadow-md shadow-emerald-900/5'
                    : 'border-slate-200 hover:border-indigo-200'
                }`}
              >
                {/* Real-time New Score Highlight Ribbon */}
                {isUnread && (
                  <div className="mb-4 -mx-5 -mt-5 px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between text-xs font-black shadow-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                      <span>NILAI & VALIDASI BARU DITERIMA • SKOR AKHIR: {entry.totalFinalScore ?? entry.teacherValidation?.validationScore}/100</span>
                    </div>
                    {onMarkSingleRead && (
                      <button
                        type="button"
                        onClick={() => onMarkSingleRead(entry.id)}
                        className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white transition-colors cursor-pointer flex items-center gap-1"
                        title="Tandai notifikasi ini sudah dilihat"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Tandai Dilihat</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex items-start gap-4">
                    <img
                      src={entry.photoUrl}
                      alt={entry.bookTitle}
                      className="w-16 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isUnread && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white animate-pulse">
                            BARU DINILAI
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {entry.literacyType}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          {entry.readingCategory}
                        </span>
                        {entry.weekNumber && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Minggu ke-{entry.weekNumber}
                          </span>
                        )}
                        {entry.isLateSubmission && (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                            title={entry.lateReason ? `Jurnal Susulan: ${entry.lateReason}` : 'Jurnal diisi setelah tanggal/minggu jadwal lewat'}
                          >
                            <History className="w-3 h-3 text-amber-600" />
                            <span>Susulan</span>
                          </span>
                        )}
                      </div>

                      {/* Tampilkan Tanggal Membaca dan Tanggal Input Otomatis Komputer */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 mb-1.5 font-medium">
                        <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>Tgl Membaca: <strong className="text-slate-800">{entry.date}</strong></span>
                        </span>
                        <span className="inline-flex items-center gap-1 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                          <Monitor className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span>Input Sistem: <strong className="font-mono text-slate-900">{formatSystemInputDate(entry.systemInputDate, entry.createdAt, entry.date)}</strong></span>
                          <span className="text-[9px] text-slate-400 font-bold">(Otomatis Komputer)</span>
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900">{entry.bookTitle}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Halaman/Juz: {entry.pagesRead} • Durasi: {entry.durationMinutes} menit
                      </p>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                        {entry.summary}
                      </p>
                    </div>
                  </div>

                  {/* Right: Validation & Scores */}
                  <div className="flex flex-col sm:items-end justify-between gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-right">
                      {isVal ? (
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          isUnread
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          <CheckCircle2 className={`w-3.5 h-3.5 ${isUnread ? 'text-white' : 'text-emerald-600'}`} />
                          <span>Tervalidasi Guru</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Menunggu Validasi</span>
                        </div>
                      )}
                    </div>

                    <div className={`border rounded-xl p-2.5 text-right min-w-[130px] ${
                      isUnread
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Nilai</span>
                      <span className={`text-xl font-black ${isUnread ? 'text-emerald-700' : 'text-indigo-600'}`}>
                        {isVal ? entry.totalFinalScore : entry.reflection.totalScore}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {isVal ? ' / 100 Poin' : ' / 20 (Refleksi)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feedback from teacher if present */}
                {entry.teacherValidation && (
                  <div className={`mt-4 pt-3 border-t flex items-start gap-2 rounded-xl p-3 ${
                    isUnread
                      ? 'border-emerald-200 bg-emerald-100/60'
                      : 'border-slate-100 bg-indigo-50/50'
                  }`}>
                    <MessageSquare className={`w-4 h-4 shrink-0 mt-0.5 ${isUnread ? 'text-emerald-700' : 'text-indigo-600'}`} />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">
                        Catatan dari {entry.teacherValidation.teacherName}:
                      </span>
                      <p className="text-slate-700 mt-0.5 italic">
                        "{entry.teacherValidation.feedbackNotes || 'Jurnal membaca Anda telah divalidasi dengan baik.'}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Pagination for Student History Cards */}
        <Pagination
          currentPage={historyPage}
          totalPages={Math.ceil(filteredHistoryEntries.length / historyPerPage) || 1}
          totalItems={filteredHistoryEntries.length}
          itemsPerPage={historyPerPage}
          onPageChange={setHistoryPage}
          onItemsPerPageChange={setHistoryPerPage}
          itemsPerPageOptions={[3, 5, 10, 20]}
          itemLabel="jurnal"
        />
      </div>
    </div>
  );
};
