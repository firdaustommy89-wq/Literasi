import React from 'react';
import { User, UserRole } from '../types';
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
  Pencil
} from 'lucide-react';

interface TopBarHeaderProps {
  currentUser: User | null;
  activeTab: string;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
  onOpenAuthModal: (role?: UserRole) => void;
  onOpenEditProfile?: () => void;
  onRefreshData?: () => void;
  isSyncing?: boolean;
  onExportExcel?: () => void;
  onOpenReportModal?: () => void;
}

export const TopBarHeader: React.FC<TopBarHeaderProps> = ({
  currentUser,
  activeTab,
  isSidebarOpen = true,
  onToggleSidebar,
  onOpenMobileMenu,
  onOpenAuthModal,
  onOpenEditProfile,
  onRefreshData,
  isSyncing = false,
  onExportExcel,
  onOpenReportModal,
}) => {
  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'upload-admin':
        return 'System Users';
      case 'validasi-guru':
        return 'Validasi Jurnal Siswa';
      case 'input-jurnal':
        return 'Isi Jurnal Baru';
      case 'jurnal-saya':
        return 'Riwayat Jurnal & Nilai';
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
        return 'Portofolio Membaca Siswa';
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
          {/* Toggle Menu Button */}
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

          {/* School Brand icon */}
          <div 
            onClick={handleToggle}
            className="hidden sm:flex items-center gap-2 shrink-0 cursor-pointer"
            title="SMAN 2 Samarinda"
          >
            <SchoolLogo className="w-6 h-8 shrink-0" />
          </div>

          {/* Screenshot Header Title & Subtitle */}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight truncate">
              {getTabLabel(activeTab)}
            </h1>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 truncate">
              <span>Managing</span>
              <span className="bg-red-50 text-red-600 border border-red-100 font-black text-[11px] px-2 py-0.5 rounded-md tracking-tight">
                {getSubLabel(activeTab)}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Screenshot Header Profile with Red Badge */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Live Sync Status */}
          <button
            type="button"
            onClick={onRefreshData}
            disabled={isSyncing}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 transition-colors cursor-pointer"
            title="Sinkronisasi Cloud Firestore"
          >
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
            <span className="text-[11px] font-bold">
              {isSyncing ? 'Menyinkronkan...' : 'Live Sync'}
            </span>
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-600' : 'text-slate-400'}`} />
          </button>

          {/* Export button on top bar */}
          {isStaff && onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              title="Unduh Rekap Excel"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export</span>
            </button>
          )}

          {/* User Profile Mini Badge or Login: Exact Screenshot Style */}
          {currentUser ? (
            <div 
              onClick={onOpenEditProfile || onOpenMobileMenu}
              className="flex items-center gap-3 pl-2 sm:pl-3 py-1 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group"
              title="Klik untuk mengedit profil akun (nama, password, foto profil)"
            >
              {/* Profile Name & Red Authorized Access Label */}
              <div className="text-right hidden sm:block">
                <div className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-red-600 transition-colors leading-tight">
                  {currentUser.role === 'admin' ? 'System Admin' : currentUser.name}
                </div>
                <div className="text-[10px] font-black text-red-600 tracking-wider uppercase mt-0.5">
                  {currentUser.role === 'admin' ? 'AUTHORIZED ACCESS' : currentUser.role === 'guru' ? 'GURU PENILAI' : 'SISWA TERDAFTAR'}
                </div>
              </div>

              {/* Red Circular Initials Badge (Exact Screenshot Style) */}
              <div className="w-10 h-10 rounded-full bg-red-600 text-white font-black flex items-center justify-center text-sm shadow-sm ring-2 ring-red-100 shrink-0 overflow-hidden">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-sm transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
