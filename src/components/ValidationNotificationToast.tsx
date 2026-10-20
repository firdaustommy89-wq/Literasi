import React, { useEffect, useState } from 'react';
import { LiteracyEntry } from '../types';
import { Award, CheckCircle2, MessageSquare, X, ChevronRight, Bell } from 'lucide-react';

interface ValidationNotificationToastProps {
  entry: LiteracyEntry;
  onViewEntry: () => void;
  onClose: () => void;
  durationMs?: number;
}

export const ValidationNotificationToast: React.FC<ValidationNotificationToastProps> = ({
  entry,
  onViewEntry,
  onClose,
  durationMs = 8000,
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

  const teacherName = entry.teacherValidation?.teacherName || 'Guru Pembimbing';
  const score = entry.totalFinalScore ?? entry.teacherValidation?.validationScore ?? 0;

  return (
    <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-[#0f172a] text-white rounded-2xl shadow-2xl border-2 border-emerald-500/80 p-4.5 overflow-hidden relative">
        {/* Progress Bar */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />

        {/* Ambient Top Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5 relative">
          {/* Notification Icon */}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-900/50">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Nilai Baru Masuk
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Baru Saja</span>
            </div>

            <h4 className="text-sm font-black text-white leading-tight">
              Jurnal Anda Telah Divalidasi Guru!
            </h4>

            <p className="text-xs text-slate-300 mt-1 line-clamp-1 font-semibold">
              "{entry.bookTitle}"
            </p>

            <div className="mt-2.5 flex items-center gap-3">
              <div className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Skor Akhir:</span>
                <span className="text-sm font-black text-emerald-400">{score}</span>
                <span className="text-[10px] text-slate-400">/ 100</span>
              </div>

              <span className="text-xs text-slate-400 truncate">
                Oleh <strong className="text-slate-200">{teacherName}</strong>
              </span>
            </div>

            {entry.teacherValidation?.feedbackNotes && (
              <div className="mt-2 p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 italic line-clamp-2">
                "{entry.teacherValidation.feedbackNotes}"
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onViewEntry();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-colors shadow-sm cursor-pointer"
              >
                <span>Buka Jurnal Saya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Tutup
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
