import React, { useState } from 'react';
import { JenjangKelas, LiteracyEntry, User, MonthlyVerification, StudentLeaderboardStat } from '../types';
import { getAllTop3, computeLeaderboardByGrade } from '../utils/leaderboard';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Medal, 
  Award, 
  Flame, 
  Clock, 
  BookOpen, 
  Sparkles, 
  Users, 
  GraduationCap,
  FileSpreadsheet,
  Printer,
  Crown,
  Star,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Layers,
  LayoutGrid
} from 'lucide-react';

interface LeaderboardViewProps {
  entries: LiteracyEntry[];
  users: User[];
  monthlyVerifications?: MonthlyVerification[];
  onExportExcel: () => void;
  onOpenReportModal: () => void;
  onSyncAllGrades?: () => Promise<any> | void;
  isSyncingGrades?: boolean;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  entries,
  users,
  onExportExcel,
  onOpenReportModal,
  onSyncAllGrades,
  isSyncingGrades = false,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | JenjangKelas>('all');
  const [displayMode, setDisplayMode] = useState<'podium' | 'detailed'>('podium');

  const top3Data = getAllTop3(entries, users);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#3b82f6', '#10b981', '#ffffff']
      });
    } catch {
      // ignore
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getPredicateBadge = (score: number) => {
    if (score >= 90) {
      return {
        label: 'Predikat A (Amat Baik)',
        color: 'bg-emerald-500/15 text-emerald-700 border-emerald-300 ring-emerald-200'
      };
    }
    if (score >= 75) {
      return {
        label: 'Predikat B (Baik)',
        color: 'bg-blue-500/15 text-blue-700 border-blue-300 ring-blue-200'
      };
    }
    if (score >= 60) {
      return {
        label: 'Predikat C (Cukup)',
        color: 'bg-amber-500/15 text-amber-800 border-amber-300 ring-amber-200'
      };
    }
    return {
      label: 'Aktif Membaca',
      color: 'bg-slate-500/15 text-slate-700 border-slate-300 ring-slate-200'
    };
  };

  // Render Visual 3D Podium Layout for a Grade (Rank 2 on Left, Rank 1 in Center, Rank 3 on Right)
  const renderPodiumBlock = (stat: StudentLeaderboardStat, rank: 1 | 2 | 3) => {
    const isFirst = rank === 1;
    const isSecond = rank === 2;
    const isThird = rank === 3;

    const predicateInfo = getPredicateBadge(stat.avgTotalScore);

    return (
      <div 
        key={stat.studentId}
        className={`flex flex-col items-center flex-1 transition-all duration-300 hover:-translate-y-1 ${
          isFirst ? 'order-2 z-20 -mt-2 sm:-mt-4' : isSecond ? 'order-1 z-10' : 'order-3 z-10'
        }`}
      >
        {/* Crown or Laurel Medal Icon */}
        <div className="relative mb-2 flex flex-col items-center">
          {isFirst && (
            <div className="animate-bounce">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-slate-950 shadow-lg shadow-amber-300 ring-2 ring-amber-300">
                <Crown className="w-5 h-5 text-slate-950 fill-amber-300" />
              </span>
            </div>
          )}

          {/* Student Avatar / Initials Ring */}
          <div
            className={`relative rounded-full flex items-center justify-center font-black transition-transform duration-300 shadow-xl ${
              isFirst
                ? 'w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200 text-slate-950 ring-4 ring-amber-400/80 text-xl sm:text-2xl shadow-amber-300/60'
                : isSecond
                ? 'w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-slate-400 via-slate-200 to-slate-100 text-slate-900 ring-4 ring-slate-300 text-lg sm:text-xl shadow-slate-300/50'
                : 'w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-amber-800 via-amber-600 to-orange-400 text-white ring-4 ring-amber-700/60 text-lg sm:text-xl shadow-amber-800/40'
            }`}
          >
            {getInitials(stat.studentName)}

            {/* Medal Pill on bottom of Avatar */}
            <div
              className={`absolute -bottom-2 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md border ${
                isFirst
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-200'
                  : isSecond
                  ? 'bg-slate-200 text-slate-900 border-white ring-1 ring-slate-300'
                  : 'bg-amber-700 text-white border-amber-500 ring-1 ring-amber-600'
              }`}
            >
              {isFirst ? '🥇 #1' : isSecond ? '🥈 #2' : '🥉 #3'}
            </div>
          </div>
        </div>

        {/* Student Name & Class Info */}
        <div className="text-center px-1 mb-2.5 max-w-[170px] sm:max-w-[200px]">
          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 line-clamp-1 leading-snug">
            {stat.studentName}
          </h4>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold mt-1">
            <GraduationCap className="w-3 h-3 text-blue-700" />
            <span>{stat.rombel}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            NISN: {stat.studentNisn}
          </p>
        </div>

        {/* Score Card Pill */}
        <div
          className={`w-full max-w-[140px] sm:max-w-[160px] py-1.5 px-2.5 rounded-xl border text-center mb-2.5 shadow-2xs ${
            isFirst
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : isSecond
              ? 'bg-slate-50 border-slate-200 text-slate-800'
              : 'bg-orange-50/70 border-orange-200 text-orange-950'
          }`}
        >
          <div className="text-[9px] uppercase font-bold tracking-wider opacity-75">
            Nilai Rata-rata
          </div>
          <div className="text-base sm:text-lg font-black tracking-tight leading-none my-0.5">
            <span className={isFirst ? 'text-amber-600' : 'text-blue-700'}>
              {stat.avgTotalScore > 0 ? stat.avgTotalScore : '-'}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 ml-0.5">/ 100</span>
          </div>
          <div className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${predicateInfo.color}`}>
            {predicateInfo.label}
          </div>
        </div>

        {/* 3D Physical Pedestal */}
        <div
          className={`w-full rounded-t-2xl sm:rounded-t-3xl flex flex-col items-center justify-start pt-3 sm:pt-4 px-2 shadow-inner border-t-2 ${
            isFirst
              ? 'h-36 sm:h-44 bg-gradient-to-b from-amber-400 via-amber-300 to-amber-200 border-amber-200 text-slate-950 shadow-amber-300/40'
              : isSecond
              ? 'h-28 sm:h-34 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200 border-white text-slate-800 shadow-slate-300/40'
              : 'h-22 sm:h-28 bg-gradient-to-b from-amber-600 via-amber-500 to-amber-600 border-amber-400 text-white shadow-amber-700/40'
          }`}
        >
          {/* Big Pedestal Rank Number */}
          <div
            className={`font-black text-3xl sm:text-4xl leading-none opacity-90 select-none ${
              isFirst ? 'text-amber-950' : isSecond ? 'text-slate-600' : 'text-amber-100'
            }`}
          >
            {rank}
          </div>

          {/* Mini Stats Inside Pedestal */}
          <div
            className={`mt-2 flex flex-col items-center gap-0.5 text-[10px] sm:text-[11px] font-semibold ${
              isFirst ? 'text-amber-950' : isSecond ? 'text-slate-700' : 'text-amber-50'
            }`}
          >
            <span className="flex items-center gap-1 font-bold">
              <BookOpen className="w-3 h-3" />
              {stat.totalEntries} Jurnal
            </span>
            <span className="flex items-center gap-1 opacity-90">
              <Clock className="w-3 h-3" />
              {stat.totalMinutesRead} Menit
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderGradeSection = (grade: JenjangKelas, title: string, subtitle: string) => {
    const list = top3Data[grade] || [];

    const first = list[0];
    const second = list[1];
    const third = list[2];

    return (
      <div className="bg-white rounded-3xl border border-amber-200/90 shadow-xl overflow-hidden flex flex-col">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#071d49] via-[#0f3478] to-[#144299] text-white p-4 sm:p-5 flex items-center justify-between border-b-4 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center shadow-inner">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">{title}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase shadow-2xs">
                  Top 3 Terpilih
                </span>
              </div>
              <p className="text-xs text-blue-200">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={triggerCelebration}
            title="Beri Tepuk Tangan & Konfeti"
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-amber-300 border border-white/20 transition-all hover:scale-105 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
          </button>
        </div>

        {/* Content Body */}
        {list.length === 0 ? (
          <div className="p-10 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Award className="w-10 h-10 text-slate-300" />
            <p className="text-xs font-semibold text-slate-500">
              Belum ada data jurnal atau penilaian terverifikasi untuk jenjang ini.
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Klik tombol &quot;Ambil Nilai Jurnal&quot; di atas untuk menarik isian jurnal dan validasi guru terbaru.
            </p>
          </div>
        ) : displayMode === 'podium' ? (
          /* Visual 3D Podium Layout */
          <div className="p-4 sm:p-6 bg-gradient-to-b from-slate-50/60 to-white flex-1 flex flex-col justify-end">
            <div className="flex items-end justify-center gap-2 sm:gap-4 pt-6">
              {second && renderPodiumBlock(second, 2)}
              {first && renderPodiumBlock(first, 1)}
              {third && renderPodiumBlock(third, 3)}
            </div>
          </div>
        ) : (
          /* Detailed Card View */
          <div className="p-4 sm:p-5 divide-y divide-slate-100 flex-1">
            {list.map((stat, idx) => {
              const rank = (idx + 1) as 1 | 2 | 3;
              const isFirst = rank === 1;
              const predicateInfo = getPredicateBadge(stat.avgTotalScore);

              return (
                <div
                  key={stat.studentId}
                  className={`py-3.5 flex items-center justify-between gap-3 transition-colors ${
                    isFirst ? 'bg-amber-50/70 -mx-4 px-4 sm:-mx-5 sm:px-5 rounded-2xl my-1 border border-amber-200' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border shadow-xs ${
                        isFirst
                          ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-200'
                          : rank === 2
                          ? 'bg-slate-200 text-slate-800 border-white ring-2 ring-slate-300'
                          : 'bg-amber-700 text-white border-amber-500 ring-1 ring-amber-600'
                      }`}
                    >
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 truncate">
                          {stat.studentName}
                        </span>
                        {isFirst && (
                          <span className="text-[10px] font-black bg-amber-300 text-blue-950 px-2 py-0.5 rounded shadow-2xs">
                            Juara 1
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                          {stat.rombel}
                        </span>
                        <span>•</span>
                        <span className="text-[11px]">NISN: {stat.studentNisn}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                          {stat.totalEntries} Jurnal
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          {stat.totalMinutesRead} Menit
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Rata-rata</span>
                    <div className="text-lg font-black text-slate-900">
                      <span className={isFirst ? 'text-amber-600' : 'text-blue-700'}>
                        {stat.avgTotalScore > 0 ? stat.avgTotalScore : '-'}
                      </span>
                      <span className="text-[11px] font-normal text-slate-400">/100</span>
                    </div>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border ${predicateInfo.color}`}>
                      {predicateInfo.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Integrasi Skor Jurnal Siswa & Nilai Validasi Guru
          </span>
          <span className="font-extrabold text-blue-800">SMAN 2 Samarinda</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-3 sm:py-4 px-2 sm:px-4 lg:px-6">
      {/* Hero Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071d49] via-[#0f3478] to-[#144299] text-white p-5 sm:p-7 mb-5 shadow-2xl border-2 border-amber-400/40">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 mb-3 shadow-xs">
            <Trophy className="w-4 h-4 text-amber-400" />
            Papan Peringkat Literasi SMAN 2 Samarinda
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white">
            Juara Literasi Top 3 per Jenjang Kelas
          </h1>
          <p className="text-sm sm:text-base text-blue-100 mt-2 leading-relaxed">
            Penetapan peringkat otomatis berdasarkan kompilasi isian refleksi jurnal murid, durasi membaca, dan skor validasi guru pembimbing.
          </p>

          <div className="flex items-center gap-3 mt-6 flex-wrap">
            {onSyncAllGrades && (
              <button
                onClick={onSyncAllGrades}
                disabled={isSyncingGrades}
                className="px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-60 active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 text-white ${isSyncingGrades ? 'animate-spin' : ''}`} />
                {isSyncingGrades ? 'Mengambil Nilai Jurnal...' : 'Ambil & Sinkronkan Nilai Jurnal'}
              </button>
            )}

            <button
              onClick={triggerCelebration}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-amber-400 text-blue-950 hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/25 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-blue-950" />
              Rayakan Prestasi Siswa 🎊
            </button>
            <button
              onClick={onOpenReportModal}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20 flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              Cetak Sertifikat / PDF
            </button>
            <button
              onClick={onExportExcel}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-blue-700 text-white hover:bg-blue-600 border border-blue-400/40 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-300" />
              Unduh Excel Peringkat
            </button>
          </div>
        </div>

        {/* Decorative background glows */}
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-1/4 w-60 h-60 bg-amber-400/15 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Control Bar: Filter Tabs & Display Mode Toggle */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        {/* Grade tabs */}
        <div className="flex items-center bg-blue-50/80 p-1.5 rounded-2xl text-xs font-bold text-slate-600 border border-blue-200/80 flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#0f3478] text-white shadow-sm font-extrabold ring-2 ring-amber-400'
                : 'hover:text-blue-900 text-slate-700'
            }`}
          >
            Semua Jenjang (10, 11, 12)
          </button>
          <button
            onClick={() => setActiveTab('10')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === '10'
                ? 'bg-[#0f3478] text-white shadow-sm font-extrabold ring-2 ring-amber-400'
                : 'hover:text-blue-900 text-slate-700'
            }`}
          >
            Kelas 10 (Fase E)
          </button>
          <button
            onClick={() => setActiveTab('11')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === '11'
                ? 'bg-[#0f3478] text-white shadow-sm font-extrabold ring-2 ring-amber-400'
                : 'hover:text-blue-900 text-slate-700'
            }`}
          >
            Kelas 11 (Fase F)
          </button>
          <button
            onClick={() => setActiveTab('12')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === '12'
                ? 'bg-[#0f3478] text-white shadow-sm font-extrabold ring-2 ring-amber-400'
                : 'hover:text-blue-900 text-slate-700'
            }`}
          >
            Kelas 12 (Fase F Akhir)
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 border border-slate-200">
          <button
            onClick={() => setDisplayMode('podium')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              displayMode === 'podium'
                ? 'bg-white text-slate-900 shadow-sm font-extrabold text-blue-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Podium 3D
          </button>
          <button
            onClick={() => setDisplayMode('detailed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              displayMode === 'detailed'
                ? 'bg-white text-slate-900 shadow-sm font-extrabold text-blue-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
            Kartu Rinci
          </button>
        </div>
      </div>

      {/* Grid of Grade Sections */}
      {activeTab === 'all' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {renderGradeSection('10', 'Kelas 10 (Fase E)', 'SMA / Tingkat Menengah Awal')}
          {renderGradeSection('11', 'Kelas 11 (Fase F)', 'SMA / Tingkat Menengah Lanjutan')}
          {renderGradeSection('12', 'Kelas 12 (Fase F)', 'SMA / Tingkat Menengah Akhir')}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {activeTab === '10' && renderGradeSection('10', 'Kelas 10 (Fase E)', 'SMA / Tingkat Menengah Awal')}
          {activeTab === '11' && renderGradeSection('11', 'Kelas 11 (Fase F)', 'SMA / Tingkat Menengah Lanjutan')}
          {activeTab === '12' && renderGradeSection('12', 'Kelas 12 (Fase F)', 'SMA / Tingkat Menengah Akhir')}
        </div>
      )}
    </div>
  );
};
