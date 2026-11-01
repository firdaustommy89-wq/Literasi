import React, { useMemo, useState } from 'react';
import { 
  Timer, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Megaphone,
  CalendarCheck,
  ChevronRight
} from 'lucide-react';
import { JournalCutoffConfig, User } from '../types';
import { CutoffSettingsModal } from './CutoffSettingsModal';

interface RunningTextCutoffBannerProps {
  currentUser: User;
  cutoffConfig: JournalCutoffConfig;
  onUpdateCutoffConfig: (newConfig: JournalCutoffConfig) => void;
}

export const RunningTextCutoffBanner: React.FC<RunningTextCutoffBannerProps> = ({
  currentUser,
  cutoffConfig,
  onUpdateCutoffConfig,
}) => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Parse Indonesian Date
  const formattedCutoff = useMemo(() => {
    try {
      const dateStr = cutoffConfig.cutoffDate || '2026-11-30';
      const timeStr = cutoffConfig.cutoffTime || '23:59';
      const [year, month, day] = dateStr.split('-').map(Number);
      if (!year || !month || !day) return `${dateStr} pukul ${timeStr} WITA`;

      const dateObj = new Date(year, month - 1, day);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const dayName = days[dateObj.getDay()] || 'Hari';
      const monthName = months[dateObj.getMonth()] || '';
      return `${dayName}, ${day} ${monthName} ${year} pukul ${timeStr} WITA`;
    } catch {
      return `${cutoffConfig.cutoffDate} pukul ${cutoffConfig.cutoffTime || '23:59'} WITA`;
    }
  }, [cutoffConfig.cutoffDate, cutoffConfig.cutoffTime]);

  // Calculate remaining days / hours or status
  const cutoffStatus = useMemo(() => {
    try {
      const dateStr = cutoffConfig.cutoffDate || '2026-11-30';
      const timeStr = cutoffConfig.cutoffTime || '23:59';
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);

      const target = new Date(year, month - 1, day, hours || 23, minutes || 59, 59);
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();

      if (diffMs <= 0) {
        return { isExpired: true, text: 'Batas Pengisian Telah Berakhir' };
      }

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (diffDays > 0) {
        return { isExpired: false, text: `Sisa ${diffDays} Hari ${diffHours} Jam lagi` };
      }
      return { isExpired: false, text: `Sisa ${diffHours} Jam lagi hari ini!` };
    } catch {
      return { isExpired: false, text: 'Batas Aktif' };
    }
  }, [cutoffConfig.cutoffDate, cutoffConfig.cutoffTime]);

  const isAdmin = currentUser.role === 'admin';

  // If disabled and not admin, hide completely
  if (!cutoffConfig.isEnabled && !isAdmin) {
    return null;
  }

  // Teks Pengumuman Utama
  const mainAnnouncementText = cutoffConfig.announcementText?.trim() || 'Cut Off Pengisian Jurnal Oleh Murid';
  const additionalNote = cutoffConfig.additionalNote?.trim();

  return (
    <div className="w-full mb-3 select-none">
      <div className={`relative overflow-hidden rounded-xl border transition-all duration-300 shadow-sm ${
        cutoffConfig.isEnabled 
          ? cutoffStatus.isExpired
            ? 'bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 dark:from-rose-950/40 dark:via-amber-950/30 dark:to-orange-950/30 border-rose-300 dark:border-rose-800'
            : 'bg-gradient-to-r from-amber-50/90 via-sky-50/80 to-indigo-50/90 dark:from-amber-950/35 dark:via-sky-950/25 dark:to-indigo-950/35 border-amber-300/80 dark:border-amber-700/60'
          : 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700'
      }`}>
        <div className="flex items-center h-10 sm:h-11 px-2.5 sm:px-3 gap-2 sm:gap-3">
          {/* Static Left Badge */}
          <div className="flex items-center shrink-0">
            {cutoffConfig.isEnabled ? (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider shadow-sm ${
                cutoffStatus.isExpired
                  ? 'bg-rose-600 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
              }`}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                <span className="hidden xs:inline">PENGUMUMAN</span>
                <span>CUT OFF</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                <span>NONAKTIF</span>
              </div>
            )}
          </div>

          {/* Marquee Center Track */}
          <div className="flex-1 min-w-0 overflow-hidden relative h-full flex items-center">
            {/* Soft left gradient fade for smooth entrance */}
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white/80 dark:from-slate-900/80 to-transparent z-10 pointer-events-none" />

            {cutoffConfig.isEnabled ? (
              <div 
                className="animate-marquee group flex items-center gap-6 cursor-default text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100"
                title="Arahkan kursor atau sentuh untuk menjeda teks berjalan"
              >
                {/* Block 1 */}
                <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                    <Megaphone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 inline animate-bounce" />
                    <span>{mainAnnouncementText} pada tanggal</span>
                    <strong className="underline decoration-amber-500 decoration-2 font-extrabold text-blue-700 dark:text-amber-300 px-1 py-0.5 rounded bg-amber-100/70 dark:bg-amber-900/40">
                      {formattedCutoff}
                    </strong>
                  </span>

                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-xs ${
                    cutoffStatus.isExpired
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>{cutoffStatus.text}</span>
                  </span>

                  {additionalNote && (
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <span>•</span>
                      <span>💡 {additionalNote}</span>
                    </span>
                  )}

                  <span className="text-amber-500 font-bold px-2">✦</span>
                </div>

                {/* Block 2 (Duplicate for continuous loop) */}
                <div className="flex items-center gap-3 shrink-0 whitespace-nowrap" aria-hidden="true">
                  <span className="inline-flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                    <Megaphone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 inline" />
                    <span>{mainAnnouncementText} pada tanggal</span>
                    <strong className="underline decoration-amber-500 decoration-2 font-extrabold text-blue-700 dark:text-amber-300 px-1 py-0.5 rounded bg-amber-100/70 dark:bg-amber-900/40">
                      {formattedCutoff}
                    </strong>
                  </span>

                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-xs ${
                    cutoffStatus.isExpired
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>{cutoffStatus.text}</span>
                  </span>

                  {additionalNote && (
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <span>•</span>
                      <span>💡 {additionalNote}</span>
                    </span>
                  )}

                  <span className="text-amber-500 font-bold px-2">✦</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-2">
                <span>Pengumuman batas waktu cut-off sedang dinonaktifkan oleh Administrator.</span>
              </div>
            )}

            {/* Soft right gradient fade for smooth exit */}
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white/80 dark:from-slate-900/80 to-transparent z-10 pointer-events-none" />
          </div>

          {/* Right Action: Admin Settings Trigger */}
          {isAdmin && (
            <div className="shrink-0 flex items-center">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="btn-interaction inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs shadow-xs cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
                title="Buka panel pengaturan batas waktu pengisian jurnal murid"
              >
                <Settings className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                <span className="hidden sm:inline">Seting Cut-Off</span>
                <span className="sm:hidden">Seting</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin Cutoff Settings Modal */}
      {isAdmin && (
        <CutoffSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          config={cutoffConfig}
          onSave={(newCfg) => {
            onUpdateCutoffConfig(newCfg);
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
