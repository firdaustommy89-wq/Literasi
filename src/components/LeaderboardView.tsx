import React, { useState } from 'react';
import { JenjangKelas, LiteracyEntry, User } from '../types';
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
  Printer
} from 'lucide-react';

interface LeaderboardViewProps {
  entries: LiteracyEntry[];
  users: User[];
  onExportExcel: () => void;
  onOpenReportModal: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  entries,
  users,
  onExportExcel,
  onOpenReportModal,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | JenjangKelas>('all');

  const top3Data = getAllTop3(entries, users);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch {
      // ignore
    }
  };

  const renderRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-900 flex items-center justify-center font-black text-sm shadow-md shadow-amber-200 border-2 border-white ring-2 ring-amber-400">
            🥇 1
          </div>
        );
      case 2:
        return (
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-800 flex items-center justify-center font-black text-sm shadow-md shadow-slate-200 border-2 border-white ring-2 ring-slate-300">
            🥈 2
          </div>
        );
      case 3:
        return (
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-amber-300 border-2 border-white ring-2 ring-amber-600">
            🥉 3
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
            #{rank}
          </div>
        );
    }
  };

  const renderGradePodium = (grade: JenjangKelas, title: string, subtitle: string) => {
    const list = top3Data[grade] || [];

    return (
      <div className="bg-white rounded-3xl border border-amber-200/80 shadow-md overflow-hidden flex flex-col">
        {/* Grade Section Header */}
        <div className="bg-gradient-to-r from-[#071d49] via-[#0f3478] to-[#144299] text-white p-5 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">{title}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase">
                  Top 3 Teratas
                </span>
              </div>
              <p className="text-xs text-blue-200">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={triggerCelebration}
            title="Beri Tepuk Tangan & Konfeti"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
          </button>
        </div>

        {/* Podium List */}
        <div className="p-5 divide-y divide-slate-100 flex-1">
          {list.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Belum ada data penilaian literasi untuk jenjang ini.
            </div>
          ) : (
            list.map((stat, idx) => {
              const rank = idx + 1;
              const isFirst = rank === 1;

              return (
                <div
                  key={stat.studentId}
                  className={`py-4 flex items-center justify-between gap-3 transition-colors ${
                    isFirst ? 'bg-amber-50/50 -mx-5 px-5 rounded-2xl my-1 border border-amber-200/60' : ''
                  }`}
                >
                  {/* Left: Rank & Avatar & Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {renderRankBadge(rank)}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-sm sm:text-base text-slate-900 truncate">
                          {stat.studentName}
                        </span>
                        {isFirst && (
                          <span className="text-[10px] font-extrabold bg-amber-300 text-blue-950 px-2 py-0.5 rounded-md shadow-2xs">
                            Peringkat 1
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">{stat.rombel}</span>
                        <span>•</span>
                        <span>NISN: {stat.studentNisn}</span>
                      </div>

                      {/* Mini stats */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-blue-600" />
                          <strong>{stat.totalEntries}</strong> Jurnal
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <strong>{stat.totalMinutesRead}</strong> Menit
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Average Score from 100 */}
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Rata-rata Nilai</span>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 flex items-baseline justify-end gap-1">
                      <span className={isFirst ? 'text-amber-600 font-black' : 'text-blue-700 font-black'}>
                        {stat.avgTotalScore > 0 ? stat.avgTotalScore : '-'}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">/ 100</span>
                    </div>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-900 border border-blue-200">
                      {stat.avgTotalScore >= 90 ? 'Predikat A' : stat.avgTotalScore >= 75 ? 'Predikat B' : 'Aktif Membaca'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Kriteria: Rata-rata Skor (Siswa + Validasi Guru) & Durasi Membaca</span>
          <span className="font-semibold text-blue-700">Jenjang {grade}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-3 sm:py-4 px-2 sm:px-4 lg:px-6">
      {/* Hero Banner Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#071d49] via-[#0f3478] to-[#144299] text-white p-4 sm:p-6 mb-4 sm:mb-5 shadow-xl border-2 border-amber-400/40">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 mb-3 shadow-xs">
            <Trophy className="w-4 h-4 text-amber-400" />
            Papan Peringkat Literasi Sekolah
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white">
            Juara Literasi 3 Teratas per Jenjang Kelas
          </h1>
          <p className="text-sm sm:text-base text-blue-100 mt-2 leading-relaxed">
            Apresiasi siswa berprestasi dengan rekapitulasi penilaian literasi membaca terbaik dan validasi guru pembimbing.
          </p>

          <div className="flex items-center gap-3 mt-6 flex-wrap">
            <button
              onClick={triggerCelebration}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-amber-400 text-blue-950 hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/25 flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-950" />
              Rayakan Prestasi Siswa 🎊
            </button>
            <button
              onClick={onOpenReportModal}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20 flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              Cetak Sertifikat / Laporan PDF
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

      {/* Tabs */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center bg-blue-50/70 p-1.5 rounded-2xl text-xs font-bold text-slate-600 border border-blue-200/80">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-sm font-extrabold ring-2 ring-amber-400'
                : 'hover:text-blue-900 text-slate-700'
            }`}
          >
            Semua Jenjang (10, 11, 12)
          </button>
          <button
            onClick={() => setActiveTab('10')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === '10'
                ? 'bg-blue-600 text-white shadow-sm font-extrabold ring-2 ring-amber-400'
                : 'hover:text-blue-900 text-slate-700'
            }`}
          >
            Kelas 10 (Fase E)
          </button>
          <button
            onClick={() => setActiveTab('11')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === '11'
                ? 'bg-blue-600 text-white shadow-sm font-extrabold ring-2 ring-amber-400'
                : 'hover:text-blue-900 text-slate-700'
            }`}
          >
            Kelas 11 (Fase F)
          </button>
          <button
            onClick={() => setActiveTab('12')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === '12'
                ? 'bg-blue-600 text-white shadow-sm font-extrabold ring-2 ring-amber-400'
                : 'hover:text-blue-900 text-slate-700'
            }`}
          >
            Kelas 12 (Fase F Akhir)
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Menampilkan <strong className="text-slate-800">Peringkat 3 Teratas</strong> tiap jenjang
        </div>
      </div>

      {/* Grid of Grade Podiums */}
      {activeTab === 'all' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {renderGradePodium('10', 'Kelas 10 (Fase E)', 'SMA / Tingkat Menengah Awal')}
          {renderGradePodium('11', 'Kelas 11 (Fase F)', 'SMA / Tingkat Menengah Lanjutan')}
          {renderGradePodium('12', 'Kelas 12 (Fase F)', 'SMA / Tingkat Menengah Akhir')}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {activeTab === '10' && renderGradePodium('10', 'Kelas 10 (Fase E)', 'SMA / Tingkat Menengah Awal')}
          {activeTab === '11' && renderGradePodium('11', 'Kelas 11 (Fase F)', 'SMA / Tingkat Menengah Lanjutan')}
          {activeTab === '12' && renderGradePodium('12', 'Kelas 12 (Fase F)', 'SMA / Tingkat Menengah Akhir')}
        </div>
      )}
    </div>
  );
};
