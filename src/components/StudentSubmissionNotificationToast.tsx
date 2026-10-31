import React, { useEffect, useState } from 'react';
import { LiteracyEntry } from '../types';
import { BookOpen, ChevronRight, X, Bell, User, Clock } from 'lucide-react';

interface StudentSubmissionNotificationToastProps {
  entry: LiteracyEntry;
  onViewEntry: () => void;
  onClose: () => void;
  durationMs?: number;
}

export const StudentSubmissionNotificationToast: React.FC<StudentSubmissionNotificationToastProps> = ({
  entry,
  onViewEntry,
  onClose,
  durationMs = 9000,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [durationMs, onClose]);

  const studentDisplay = `${entry.studentName} (${entry.studentKelas || entry.studentRombel || 'Siswa'})`;

  return (
    <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-[#0b1329] text-white rounded-2xl shadow-2xl border-2 border-cyan-500/80 p-4.5 overflow-hidden relative">
        {/* Animated Progress Bar */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />

        {/* Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5 relative">
          {/* Notification Icon */}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-cyan-900/50">
            <Bell className="w-5 h-5 text-amber-300 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Jurnal Siswa Baru Masuk
              </span>
              <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Baru Saja</span>
              </span>
            </div>

            <h4 className="text-sm font-black text-white leading-tight">
              {entry.studentName} Mengisi Jurnal!
            </h4>

            <p className="text-xs text-slate-300 mt-1 line-clamp-1">
              Kelas: <strong className="text-white font-bold">{entry.studentKelas || entry.studentRombel || 'Siswa'}</strong>
            </p>

            <div className="mt-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 line-clamp-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{entry.bookTitle}</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Minggu ke-{entry.weekNumber} • {entry.readingCategory || entry.literacyType}</span>
                <span className="font-semibold text-amber-400">Menunggu Validasi</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onViewEntry();
                  onClose();
                }}
                className="btn-interaction inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-colors shadow-sm cursor-pointer"
              >
                <span>Validasi Sekarang</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Nanti
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-0 right-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
