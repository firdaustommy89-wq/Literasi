import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Save, 
  Sparkles, 
  AlertCircle, 
  BellRing, 
  CheckCircle2, 
  Info,
  Timer,
  Zap,
  RotateCcw
} from 'lucide-react';
import { JournalCutoffConfig, User } from '../types';

interface CutoffSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: JournalCutoffConfig;
  onSave: (newConfig: JournalCutoffConfig) => void;
  currentUser: User;
}

export const CutoffSettingsModal: React.FC<CutoffSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  currentUser,
}) => {
  const [cutoffDate, setCutoffDate] = useState(config.cutoffDate || '2026-11-30');
  const [cutoffTime, setCutoffTime] = useState(config.cutoffTime || '23:59');
  const [isEnabled, setIsEnabled] = useState(config.isEnabled ?? true);
  const [announcementText, setAnnouncementText] = useState(config.announcementText || 'Cut Off Pengisian Jurnal Oleh Murid');
  const [additionalNote, setAdditionalNote] = useState(config.additionalNote || 'Mohon seluruh siswa menyelesaikan pengisian jurnal literasi sebelum batas waktu penutupan.');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCutoffDate(config.cutoffDate || '2026-11-30');
      setCutoffTime(config.cutoffTime || '23:59');
      setIsEnabled(config.isEnabled ?? true);
      setAnnouncementText(config.announcementText || 'Cut Off Pengisian Jurnal Oleh Murid');
      setAdditionalNote(config.additionalNote || 'Mohon seluruh siswa menyelesaikan pengisian jurnal literasi sebelum batas waktu penutupan.');
      setSaveSuccess(false);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  // Format date helper in Indonesian
  const getFormattedDateDisplay = (dateStr: string, timeStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (!year || !month || !day) return `${dateStr} pukul ${timeStr} WITA`;
      const dateObj = new Date(year, month - 1, day);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const dayName = days[dateObj.getDay()];
      const monthName = months[dateObj.getMonth()];
      return `${dayName}, ${day} ${monthName} ${year} pukul ${timeStr} WITA`;
    } catch {
      return `${dateStr} pukul ${timeStr} WITA`;
    }
  };

  // Quick Preset Handlers
  const handlePresetEndOfMonth = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const yyyy = lastDay.getFullYear();
    const mm = String(lastDay.getMonth() + 1).padStart(2, '0');
    const dd = String(lastDay.getDate()).padStart(2, '0');
    setCutoffDate(`${yyyy}-${mm}-${dd}`);
    setCutoffTime('23:59');
    setIsEnabled(true);
  };

  const handlePresetOneWeek = () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const yyyy = future.getFullYear();
    const mm = String(future.getMonth() + 1).padStart(2, '0');
    const dd = String(future.getDate()).padStart(2, '0');
    setCutoffDate(`${yyyy}-${mm}-${dd}`);
    setCutoffTime('23:59');
    setIsEnabled(true);
  };

  const handlePresetEndOfSemester = () => {
    const now = new Date();
    // If month is <= 6, semester ends in June, otherwise Dec
    const isGanjil = now.getMonth() >= 6;
    const year = now.getFullYear();
    if (isGanjil) {
      setCutoffDate(`${year}-12-31`);
    } else {
      setCutoffDate(`${year}-06-30`);
    }
    setCutoffTime('23:59');
    setIsEnabled(true);
  };

  const handleResetToDefault = () => {
    setCutoffDate('2026-11-30');
    setCutoffTime('23:59');
    setIsEnabled(true);
    setAnnouncementText('Cut Off Pengisian Jurnal Oleh Murid');
    setAdditionalNote('Mohon seluruh siswa menyelesaikan pengisian jurnal literasi sebelum batas waktu penutupan.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const updated: JournalCutoffConfig = {
      cutoffDate,
      cutoffTime: cutoffTime || '23:59',
      isEnabled,
      announcementText: announcementText.trim() || 'Cut Off Pengisian Jurnal Oleh Murid',
      additionalNote: additionalNote.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.name || 'Admin',
    };
    onSave(updated);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-inner">
              <Timer className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Seting Cut Off Pengisian Jurnal
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  Akun Admin
                </span>
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Konfigurasi batas akhir pengisian jurnal literasi oleh murid secara real-time
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Internal Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status Toggle Switch */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mt-0.5 ${
                isEnabled 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  Aktifkan Running Text Cut-Off
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {isEnabled 
                    ? 'Banner animasi running text akan tampil aktif di layar beranda semua akun' 
                    : 'Running text dinonaktifkan sementara (tidak akan tampil bagi murid)'}
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Quick Presets Buttons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Pilihan Cepat Waktu Cut-Off (Presets):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handlePresetEndOfMonth}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 transition-colors text-center cursor-pointer"
              >
                📅 Akhir Bulan Ini
              </button>
              <button
                type="button"
                onClick={handlePresetOneWeek}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 transition-colors text-center cursor-pointer"
              >
                ⏳ 7 Hari Kedepan
              </button>
              <button
                type="button"
                onClick={handlePresetEndOfSemester}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 transition-colors text-center cursor-pointer"
              >
                🎓 Akhir Semester
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-slate-700 dark:text-slate-300 transition-colors text-center cursor-pointer flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3 h-3 text-amber-500" /> Reset Default
              </button>
            </div>
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Tanggal Batas Akhir (Cut Off) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={cutoffDate}
                onChange={(e) => setCutoffDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Format: Tanggal / Bulan / Tahun
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Jam Batas Akhir (WITA) <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Contoh: 23:59 WITA (tengah malam)
              </p>
            </div>
          </div>

          {/* Announcement Text Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Judul Teks Pengumuman
            </label>
            <input
              type="text"
              required
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Contoh: Cut Off Pengisian Jurnal Oleh Murid"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-500" />
              Catatan Pesan Tambahan Pada Running Text
            </label>
            <textarea
              rows={2}
              value={additionalNote}
              onChange={(e) => setAdditionalNote(e.target.value)}
              placeholder="Catatan tambahan yang akan ikut berjalan dalam running text..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-normal text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm resize-none"
            />
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Pratinjau Langsung Running Text:
            </span>
            <div className="bg-slate-900 text-white rounded-lg px-3 py-2 text-xs font-medium overflow-hidden border border-slate-800 shadow-inner flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 shrink-0">
                INFO CUT-OFF
              </span>
              <p className="truncate text-slate-200">
                📢 {announcementText || 'Cut Off Pengisian Jurnal Oleh Murid'} pada tanggal <strong className="text-amber-300">{getFormattedDateDisplay(cutoffDate, cutoffTime)}</strong> {additionalNote ? `• 💡 ${additionalNote}` : ''}
              </p>
            </div>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1.5">
              * Perubahan akan otomatis tersinkronisasi ke seluruh akun murid, guru, dan admin melalui Firestore.
            </p>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            {saveSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Berhasil disimpan & tersinkron!
              </span>
            ) : (
              <span>Pengaturan disimpan di Cloud Firestore</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="btn-interaction inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan & Terapkan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
