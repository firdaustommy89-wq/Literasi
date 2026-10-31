import React from 'react';
import { User, UserRole } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { 
  LayoutDashboard,
  PlusCircle, 
  History, 
  UserCheck, 
  Upload, 
  Award, 
  FileSpreadsheet, 
  Printer, 
  RefreshCw, 
  GraduationCap, 
  ShieldCheck, 
  Users,
  PanelLeftClose, 
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  User as UserIcon,
  Sparkles,
  BarChart3
} from 'lucide-react';

interface LeftSidebarMenuProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onOpenReportModal: () => void;
  onExportExcel: () => void;
  isSyncing?: boolean;
  onRefreshData?: () => void;
  totalEntriesCount?: number;
  pendingValidationCount?: number;
  unreadStudentValidationCount?: number;
  studentValidatedEntriesCount?: number;
  onOpenEditProfile?: () => void;
  onOpenSchoolSettingsModal?: () => void;
  onOpenHelpModal?: () => void;
  isOpen?: boolean;
  onToggleSidebar?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onSelectRoleLogin?: (role: UserRole) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const LeftSidebarMenu: React.FC<LeftSidebarMenuProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenReportModal,
  onExportExcel,
  isSyncing = false,
  onRefreshData,
  totalEntriesCount = 0,
  pendingValidationCount = 0,
  unreadStudentValidationCount = 0,
  studentValidatedEntriesCount = 0,
  onOpenEditProfile,
  onOpenSchoolSettingsModal,
  onOpenHelpModal,
  isOpen,
  onToggleSidebar,
  isOpenMobile = false,
  onCloseMobile,
  onSelectRoleLogin,
  theme = 'light',
  onToggleTheme,
}) => {
  const isStaff = currentUser?.role === 'guru' || currentUser?.role === 'admin';
  const isMenuVisible = isOpen !== undefined ? isOpen : isOpenMobile;
  const handleClose = onToggleSidebar || onCloseMobile;

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      handleClose?.();
    }
  };

  const getRoleBadge = () => {
    if (!currentUser) return 'Tamu';
    if (currentUser.role === 'admin') return 'Admin';
    if (currentUser.role === 'guru') return 'Guru Penilai';
    return `Siswa • ${currentUser.rombel || `Kelas ${currentUser.kelas}`}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMenuVisible && (
        <div 
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar Container: Modern Clean & Corporate Minimalist (Single Screen Fitted) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#0d1527] text-slate-300 border-r border-slate-800 shadow-2xl lg:shadow-none flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 h-full ${
          isMenuVisible
            ? 'w-64 sm:w-72 translate-x-0 opacity-100 lg:static lg:h-full'
            : '-translate-x-full lg:w-0 lg:overflow-hidden lg:opacity-0 lg:p-0 lg:border-none pointer-events-none'
        }`}
      >
        {/* Top Decorative School Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-700 via-amber-400 to-cyan-400 shrink-0"></div>

        {/* 1. Header with Logo & Brand */}
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div 
            onClick={() => handleTabClick(currentUser ? 'dashboard' : 'login-portal')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white border border-blue-400/30 shadow-md group-hover:scale-105 transition-transform shrink-0">
              <SchoolLogo className="w-6 h-7" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-white tracking-tight leading-tight truncate">
                SI-LITERASI
              </h2>
              <p className="text-[10px] font-bold text-amber-400 tracking-wider uppercase mt-0.5 truncate">
                SMAN 2 SAMARINDA
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Sembunyikan Menu Navigasi"
            aria-label="Tutup navigasi sidebar"
          >
            <PanelLeftClose className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* 2. Scrollable Navigation Menu Area */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Main Navigation Group */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 block mb-1.5">
              Menu Utama
            </span>

            {/* Dashboard (Beranda) */}
            <button
              onClick={() => handleTabClick('dashboard')}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-400'}`} />
                <span>Dashboard</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'dashboard' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
            </button>

            {/* Role: SISWA */}
            {currentUser && currentUser.role === 'siswa' && (
              <>
                {/* Menu 2: Tulis Jurnal Baru */}
                <button
                  onClick={() => handleTabClick('input-jurnal')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'input-jurnal'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <PlusCircle className={`w-4 h-4 ${activeTab === 'input-jurnal' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Tulis Jurnal Baru</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'input-jurnal' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
                </button>

                {/* Menu 3: Jurnal Saya & Riwayat */}
                <button
                  onClick={() => handleTabClick('jurnal-saya')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer group ${
                    activeTab === 'jurnal-saya'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <History className={`w-4 h-4 ${activeTab === 'jurnal-saya' ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}`} />
                    <span className="truncate">Jurnal Saya</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {unreadStudentValidationCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white animate-pulse">
                        {unreadStudentValidationCount} Baru
                      </span>
                    ) : studentValidatedEntriesCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-emerald-400 border border-emerald-800/40">
                        {studentValidatedEntriesCount}
                      </span>
                    ) : null}
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'jurnal-saya' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
                  </div>
                </button>

                {/* Menu 4: Progres Rombel / Kelas */}
                <button
                  onClick={() => handleTabClick('monitoring-rombel')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'monitoring-rombel'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className={`w-4 h-4 ${activeTab === 'monitoring-rombel' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Progres Kelas Siswa</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'monitoring-rombel' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
                </button>
              </>
            )}

            {/* Role: GURU */}
            {currentUser && currentUser.role === 'guru' && (
              <>
                {/* Menu 2: Monitoring Progres Rombel (MENU UTAMA) */}
                <button
                  onClick={() => handleTabClick('monitoring-rombel')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'monitoring-rombel'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className={`w-4 h-4 ${activeTab === 'monitoring-rombel' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Monitoring Progres Rombel</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'monitoring-rombel' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
                </button>

                {/* Menu 3: Validasi Jurnal Siswa */}
                <button
                  onClick={() => handleTabClick('validasi-guru')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'validasi-guru'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className={`w-4 h-4 ${activeTab === 'validasi-guru' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Validasi Jurnal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {pendingValidationCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">
                        {pendingValidationCount}
                      </span>
                    )}
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'validasi-guru' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
                  </div>
                </button>

                {/* Menu 4: Peringkat Top 3 Literasi */}
                <button
                  onClick={() => handleTabClick('leaderboard')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Award className={`w-4 h-4 ${activeTab === 'leaderboard' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Peringkat Top 3</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'leaderboard' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
                </button>
              </>
            )}

            {/* Role: ADMIN */}
            {currentUser && currentUser.role === 'admin' && (
              <>
                {/* Menu 2: Monitoring Progres Rombel (MENU UTAMA) */}
                <button
                  onClick={() => handleTabClick('monitoring-rombel')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'monitoring-rombel'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className={`w-4 h-4 ${activeTab === 'monitoring-rombel' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Monitoring Progres Rombel</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'monitoring-rombel' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
                </button>

                {/* Menu 3: Kelola Pengguna & Rombel */}
                <button
                  onClick={() => handleTabClick('upload-admin')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'upload-admin'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className={`w-4 h-4 ${activeTab === 'upload-admin' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Pengguna & Rombel</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'upload-admin' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
                </button>

                {/* Menu 4: Validasi Jurnal */}
                <button
                  onClick={() => handleTabClick('validasi-guru')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'validasi-guru'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className={`w-4 h-4 ${activeTab === 'validasi-guru' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Validasi Jurnal</span>
                  </div>
                  {pendingValidationCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">
                      {pendingValidationCount}
                    </span>
                  )}
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'validasi-guru' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
                </button>

                {/* Menu 5: Peringkat Top 3 */}
                <button
                  onClick={() => handleTabClick('leaderboard')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Award className={`w-4 h-4 ${activeTab === 'leaderboard' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Peringkat Top 3</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'leaderboard' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
                </button>
              </>
            )}
          </div>

          {/* Group 2: Operasional & Laporan (Khusus Guru/Admin) */}
          {isStaff && (
            <div className="space-y-1 pt-2 border-t border-slate-800/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 block mb-1">
                Laporan & Dokumen
              </span>

              <button
                onClick={onOpenReportModal}
                className="w-full text-left px-3 py-2 rounded-xl font-medium text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>History & Cetak Rapor</span>
              </button>

              <button
                onClick={onExportExcel}
                className="w-full text-left px-3 py-2 rounded-xl font-medium text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                <span>Export File (.xlsx)</span>
              </button>
            </div>
          )}

          {/* Group 3: Pengaturan & Bantuan */}
          <div className="space-y-1 pt-2 border-t border-slate-800/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 block mb-1">
              Preferensi
            </span>

            {/* Pengaturan */}
            <button
              onClick={() => {
                if (currentUser?.role === 'admin' && onOpenSchoolSettingsModal) {
                  onOpenSchoolSettingsModal();
                } else if (onOpenEditProfile) {
                  onOpenEditProfile();
                }
              }}
              className="w-full text-left px-3 py-2 rounded-xl font-medium text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Pengaturan</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>

            {/* Bantuan */}
            <button
              onClick={() => onOpenHelpModal && onOpenHelpModal()}
              className="w-full text-left px-3 py-2 rounded-xl font-medium text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>Bantuan & Panduan</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* 3. Profil Pengguna di Bagian Bawah (Modern Clean Sidebar Profile Widget) */}
        {currentUser && (
          <div className="p-3.5 border-t border-slate-800/90 bg-[#091020] shrink-0">
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2.5">
              {/* Avatar + Info */}
              <div 
                onClick={onOpenEditProfile}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
                title="Klik untuk mengedit profil akun"
              >
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs ring-2 ring-blue-500/40 overflow-hidden">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{getInitials(currentUser.name || 'U')}</span>
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#091020]" />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {currentUser.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">
                    {getRoleBadge()}
                  </p>
                </div>
              </div>

              {/* Tombol Logout yang Jelas */}
              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0 border border-slate-700/60"
                title="Keluar dari akun (Logout)"
                aria-label="Tombol Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
