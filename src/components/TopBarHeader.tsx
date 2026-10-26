import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, LiteracyEntry } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { 
  Menu, 
  RefreshCw, 
  LogIn, 
  GraduationCap, 
  UserCheck, 
  ShieldCheck, 
  Printer, 
  FileSpreadsheet,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Bell,
  CheckCircle2,
  CheckCheck,
  ChevronRight,
  Sparkles,
  Calendar,
  Database
} from 'lucide-react';

interface TopBarHeaderProps {
  currentUser: User | null;
  activeTab: string;
  academicYear?: string;
  semester?: string;
  onOpenAcademicYearModal?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
  onOpenAuthModal: (role?: UserRole) => void;
  onOpenEditProfile?: () => void;
  onRefreshData?: () => void;
  isSyncing?: boolean;
  onExportExcel?: () => void;
  onOpenReportModal?: () => void;
  unreadStudentValidationCount?: number;
  studentValidatedEntries?: LiteracyEntry[];
  onNavigateToJurnalSaya?: () => void;
  onMarkAllValidationsRead?: () => void;
  onMarkSingleValidationRead?: (id: string) => void;
}

export const TopBarHeader: React.FC<TopBarHeaderProps> = ({
  currentUser,
  activeTab,
  academicYear,
  semester,
  onOpenAcademicYearModal,
  isSidebarOpen = true,
  onToggleSidebar,
  onOpenMobileMenu,
  onOpenAuthModal,
  onOpenEditProfile,
  onRefreshData,
  isSyncing = false,
  onExportExcel,
  onOpenReportModal,
  unreadStudentValidationCount = 0,
  studentValidatedEntries = [],
  onNavigateToJurnalSaya,
  onMarkAllValidationsRead,
  onMarkSingleValidationRead,
}) => {
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotificationMenu(false);
      }
    };
    if (showNotificationMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationMenu]);
  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'upload-admin':
        return 'System Users';
      case 'validasi-guru':
        return 'Validasi Jurnal Siswa';
      case 'input-jurnal':
        return 'Isi Jurnal Baru';
      case 'jurnal-saya':
        return 'Jurnal Saya';
      case 'leaderboard':
        return 'Peringkat Top 3 Literasi';
      case 'login-portal':
        return 'Portal Masuk & Autentikasi';
      default:
        return 'System Users';
    }
  };

  const getSubLabel = (tab: string) => {
    switch (tab) {
      case 'upload-admin':
        return 'Master Repository';
      case 'validasi-guru':
        return 'Verifikasi & Penilaian 4 Minggu';
      case 'input-jurnal':
        return 'Catatan Harian Membaca';
      case 'jurnal-saya':
        return 'Riwayat & Nilai Terverifikasi';
      case 'leaderboard':
        return 'Prestasi Literasi SMADA';
      default:
        return 'Master Repository';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');
  };

  const isStaff = currentUser?.role === 'guru' || currentUser?.role === 'admin';
  const handleToggle = onToggleSidebar || onOpenMobileMenu;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-2xs no-print">
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left side: Toggle Button + Exact Screenshot Page Header */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* Toggle Menu Button - Hanya tampil jika sudah login & bukan di portal login awal */}
          {currentUser && activeTab !== 'login-portal' && (
            <button
              type="button"
              onClick={handleToggle}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0 border border-slate-200 shadow-2xs"
              aria-label={isSidebarOpen ? 'Sembunyikan Menu Navigasi' : 'Tampilkan Menu Navigasi'}
              title={isSidebarOpen ? 'Sembunyikan Menu Navigasi (Layar Penuh)' : 'Tampilkan Menu Navigasi'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-5 h-5 text-slate-700" />
              ) : (
                <Menu className="w-5 h-5 text-slate-700" />
              )}
            </button>
          )}

          {/* School Brand icon */}
          <div 
            onClick={currentUser && activeTab !== 'login-portal' ? handleToggle : undefined}
            className="flex items-center gap-2 shrink-0"
            title="SMAN 2 Samarinda"
          >
            <SchoolLogo className="w-6 h-8 shrink-0" />
          </div>

          {/* Page Header Title & Breadcrumb */}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight truncate">
              {getTabLabel(activeTab)}
            </h1>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 truncate">
              <span>SMAN 2 Samarinda</span>
              <span className="text-slate-300">/</span>
              <span className="text-blue-700 font-semibold">{getSubLabel(activeTab)}</span>
            </div>
          </div>
        </div>

        {/* Right side: Screenshot Header Profile with Red Badge & Notifications */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Real-time Notification Bell Indicator for Student */}
          {currentUser && currentUser.role === 'siswa' && (
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setShowNotificationMenu((prev) => !prev)}
                className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
                  unreadStudentValidationCount > 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100'
                }`}
                title={
                  unreadStudentValidationCount > 0
                    ? `${unreadStudentValidationCount} Jurnal baru saja dinilai guru!`
                    : 'Notifikasi Validasi Jurnal'
                }
                aria-label="Notifikasi Validasi Guru"
              >
                <Bell className={`w-5 h-5 ${unreadStudentValidationCount > 0 ? 'text-emerald-600' : 'text-slate-500'}`} />
                
                {unreadStudentValidationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs animate-bounce">
                    {unreadStudentValidationCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {showNotificationMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-300" />
                      <span className="font-black text-sm">Notifikasi Nilai & Validasi</span>
                    </div>
                    {unreadStudentValidationCount > 0 && onMarkAllValidationsRead && (
                      <button
                        type="button"
                        onClick={() => {
                          onMarkAllValidationsRead();
                        }}
                        className="text-[11px] font-bold text-emerald-100 hover:text-white flex items-center gap-1 cursor-pointer bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Tandai Dibaca</span>
                      </button>
                    )}
                  </div>

                  {/* List of validated entries */}
                  <div className="max-h-80 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100">
                    {studentValidatedEntries.length === 0 ? (
                      <div className="py-8 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="text-xs font-semibold">Belum ada jurnal yang dinilai</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Jurnal yang dinilai guru akan muncul di sini secara real-time.
                        </p>
                      </div>
                    ) : (
                      studentValidatedEntries.slice(0, 5).map((entry) => {
                        const score = entry.totalFinalScore ?? entry.teacherValidation?.validationScore ?? 0;
                        const teacher = entry.teacherValidation?.teacherName || 'Guru Pembimbing';
                        return (
                          <div
                            key={entry.id}
                            onClick={() => {
                              onMarkSingleValidationRead?.(entry.id);
                              onNavigateToJurnalSaya?.();
                              setShowNotificationMenu(false);
                            }}
                            className="pt-2 first:pt-0 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Skor: {score}/100
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {entry.date}
                                  </span>
                                </div>
                                <h5 className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors truncate mt-1">
                                  {entry.bookTitle}
                                </h5>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Dinilai oleh <strong>{teacher}</strong>
                                </p>
                                {entry.teacherValidation?.feedbackNotes && (
                                  <p className="text-[11px] text-slate-600 italic bg-slate-50 rounded p-1.5 mt-1 border border-slate-100 line-clamp-2">
                                    "{entry.teacherValidation.feedbackNotes}"
                                  </p>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5 shrink-0 mt-1" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer link to Jurnal Saya */}
                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Total {studentValidatedEntries.length} jurnal dinilai
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToJurnalSaya?.();
                        setShowNotificationMenu(false);
                      }}
                      className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Buka Jurnal Saya</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Academic Year & Semester Badge (Blue & Gold) */}
          {academicYear && (
            <div
              onClick={currentUser?.role === 'admin' ? onOpenAcademicYearModal : undefined}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                currentUser?.role === 'admin' && onOpenAcademicYearModal
                  ? 'bg-blue-50 text-blue-950 border-blue-200 hover:bg-amber-50 hover:border-amber-300 cursor-pointer shadow-2xs'
                  : 'bg-white text-blue-900 border-blue-200 cursor-default'
              }`}
              title={
                currentUser?.role === 'admin' && onOpenAcademicYearModal
                  ? 'Klik untuk mengelola Tahun Ajaran, Kenaikan Kelas, dan Sinkronisasi Rombel'
                  : `Tahun Ajaran Aktif: ${academicYear} Semester ${semester || 'Ganjil'}`
              }
            >
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>TA {academicYear}</span>
              <span className="text-amber-400">•</span>
              <span className="text-[11px] font-semibold text-blue-700">{semester || 'Ganjil'}</span>
            </div>
          )}

          {/* Live Sync Status */}
          <button
            type="button"
            onClick={onRefreshData}
            disabled={isSyncing}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-white hover:bg-blue-50 text-slate-700 border border-blue-100 transition-colors cursor-pointer shadow-2xs"
            title="Sinkronisasi Cloud Firestore"
          >
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-blue-500 animate-pulse'}`}></span>
            <span className="text-[11px] font-bold">
              {isSyncing ? 'Menyinkronkan...' : 'Live Sync'}
            </span>
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-500' : 'text-blue-500'}`} />
          </button>

          {/* Export button on top bar */}
          {isStaff && onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              title="Unduh Rekap Excel"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 border border-blue-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Export</span>
            </button>
          )}

          {/* User Profile Mini Badge or Login: Biru, Kuning, Putih Aesthetic */}
          {currentUser ? (
            <div 
              onClick={onOpenEditProfile || onOpenMobileMenu}
              className="flex items-center gap-3 pl-2 sm:pl-3 py-1 rounded-2xl hover:bg-blue-50/70 transition-colors cursor-pointer group"
              title="Klik untuk mengedit profil akun (nama, password, foto profil)"
            >
              {/* Profile Name & Gold/Yellow Label */}
              <div className="text-right hidden sm:block">
                <div className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-blue-700 transition-colors leading-tight">
                  {currentUser.role === 'admin' ? 'System Admin' : currentUser.name}
                </div>
                <div className="text-[10px] font-black text-amber-500 tracking-wider uppercase mt-0.5">
                  {currentUser.role === 'admin' ? 'AUTHORIZED ACCESS' : currentUser.role === 'guru' ? 'GURU PENILAI' : 'SISWA TERDAFTAR'}
                </div>
              </div>

              {/* Blue Circular Initials Badge with Gold Ring */}
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-md ring-2 ring-amber-400 shrink-0 overflow-hidden">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{getInitials(currentUser.name || 'AD')}</span>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuthModal('siswa')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-amber-400 text-blue-950 hover:bg-amber-300 shadow-sm ring-2 ring-amber-300/40 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-950" />
              <span>Masuk</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
