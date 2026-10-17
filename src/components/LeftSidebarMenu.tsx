import React from 'react';
import { User, UserRole } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { 
  PlusCircle, 
  History, 
  UserCheck, 
  Upload, 
  Award, 
  FileSpreadsheet, 
  Printer, 
  LogOut, 
  RefreshCw, 
  GraduationCap, 
  ShieldCheck, 
  ShieldAlert,
  Users,
  Smartphone, 
  Laptop, 
  Globe, 
  X, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  BookOpen, 
  PanelLeftClose, 
  Pencil,
  FileText,
  Activity
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
  onOpenEditProfile?: () => void;
  isOpen?: boolean;
  onToggleSidebar?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onSelectRoleLogin?: (role: UserRole) => void;
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
  onOpenEditProfile,
  isOpen,
  onToggleSidebar,
  isOpenMobile = false,
  onCloseMobile,
  onSelectRoleLogin,
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

  const getRoleTitle = () => {
    if (!currentUser) return 'Admin';
    if (currentUser.role === 'admin') return 'Admin';
    if (currentUser.role === 'guru') return 'Guru';
    return 'Siswa';
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

      {/* Left Sidebar Container: Screenshot Dark Theme */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#0d1527] text-slate-300 border-r border-slate-800 shadow-2xl lg:shadow-none flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isMenuVisible
            ? 'w-72 sm:w-80 translate-x-0 opacity-100 lg:static lg:h-screen lg:sticky lg:top-0'
            : '-translate-x-full lg:w-0 lg:overflow-hidden lg:opacity-0 lg:p-0 lg:border-none pointer-events-none'
        }`}
      >
        {/* Top Decorative School Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-rose-500 to-indigo-600 shrink-0"></div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Header Block: Match Screenshot Brand with Red Shield Badge */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div 
              onClick={() => {
                if (currentUser) {
                  if (currentUser.role === 'siswa') handleTabClick('input-jurnal');
                  else if (currentUser.role === 'guru') handleTabClick('validasi-guru');
                  else handleTabClick('upload-admin');
                } else {
                  handleTabClick('login-portal');
                }
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              {/* Red Shield Icon Box */}
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-lg shadow-red-900/50 shrink-0 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-white tracking-tight leading-tight">
                  {getRoleTitle()}
                </h2>
                <div className="text-[10px] font-black text-red-500 tracking-widest uppercase mt-0.5">
                  CONTROL PANEL
                </div>
              </div>
            </div>

            {/* Close / Hide Button */}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Sembunyikan Menu Navigasi"
            >
              <PanelLeftClose className="w-4 h-4 text-slate-300" />
            </button>
          </div>

          {/* School Badge Pill */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <SchoolLogo className="w-5 h-7 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-black text-white truncate">SMAN 2 SAMARINDA</div>
              <div className="text-[9px] text-slate-400 truncate">Sistem Literasi & Refleksi Siswa</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></span>
              <span className="text-[9px] font-bold text-slate-400">{isSyncing ? 'Sync' : 'Cloud'}</span>
            </div>
          </div>

          {/* Navigation Links Group */}
          <div className="space-y-1">
            {/* If Admin */}
            {currentUser && currentUser.role === 'admin' && (
              <>
                <button
                  onClick={() => handleTabClick('upload-admin')}
                  className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'upload-admin'
                      ? 'bg-[#1e293b] text-white border border-slate-700/80 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-slate-300" />
                    <span>Users (Kelola Pengguna)</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'upload-admin' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
                </button>

                <button
                  onClick={() => handleTabClick('validasi-guru')}
                  className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'validasi-guru'
                      ? 'bg-[#1e293b] text-white border border-slate-700/80 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-4 h-4 text-slate-300" />
                    <span>Validasi Jurnal & 4 Minggu</span>
                  </div>
                  {pendingValidationCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                      {pendingValidationCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleTabClick('leaderboard')}
                  className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-[#1e293b] text-white border border-slate-700/80 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Award className="w-4 h-4 text-slate-300" />
                    <span>Peringkat Top 3 Literasi</span>
                  </div>
                </button>
              </>
            )}

            {/* If Guru */}
            {currentUser && currentUser.role === 'guru' && (
              <>
                <button
                  onClick={() => handleTabClick('validasi-guru')}
                  className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'validasi-guru'
                      ? 'bg-[#1e293b] text-white border border-slate-700/80 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-4 h-4 text-slate-300" />
                    <span>Validasi Jurnal & 4 Minggu</span>
                  </div>
                  {pendingValidationCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                      {pendingValidationCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleTabClick('leaderboard')}
                  className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-[#1e293b] text-white border border-slate-700/80 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Award className="w-4 h-4 text-slate-300" />
                    <span>Peringkat Top 3 Literasi</span>
                  </div>
                </button>
              </>
            )}

            {/* If Siswa */}
            {currentUser && currentUser.role === 'siswa' && (
              <>
                <button
                  onClick={() => handleTabClick('input-jurnal')}
                  className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'input-jurnal'
                      ? 'bg-[#1e293b] text-white border border-slate-700/80 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PlusCircle className="w-4 h-4 text-slate-300" />
                    <span>Isi Jurnal Baru</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'input-jurnal' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
                </button>

                <button
                  onClick={() => handleTabClick('jurnal-saya')}
                  className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'jurnal-saya'
                      ? 'bg-[#1e293b] text-white border border-slate-700/80 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <History className="w-4 h-4 text-slate-300" />
                    <span>Riwayat & Nilai Saya</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'jurnal-saya' ? 'text-white translate-x-0.5' : 'text-slate-600'}`} />
                </button>

                <button
                  onClick={() => handleTabClick('leaderboard')}
                  className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-[#1e293b] text-white border border-slate-700/80 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Award className="w-4 h-4 text-slate-300" />
                    <span>Papan Peringkat Top 3</span>
                  </div>
                </button>
              </>
            )}

            {/* If not logged in */}
            {!currentUser && (
              <button
                onClick={() => handleTabClick('login-portal')}
                className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === 'login-portal'
                    ? 'bg-[#1e293b] text-white border border-slate-700/80 shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-slate-300" />
                  <span>Portal Masuk Akun</span>
                </div>
              </button>
            )}

            {/* Category: LOGS & ACTIVITY (Match Screenshot exactly) */}
            <div className="pt-4 pb-1 px-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                LOGS & ACTIVITY
              </span>
            </div>

            {/* History / Laporan button */}
            {isStaff ? (
              <>
                <button
                  onClick={onOpenReportModal}
                  className="w-full text-left px-4 py-2.5 rounded-2xl font-semibold text-xs text-slate-400 hover:text-white hover:bg-slate-800/40 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  <span>History & Cetak Rapor</span>
                </button>

                <button
                  onClick={onExportExcel}
                  className="w-full text-left px-4 py-2.5 rounded-2xl font-semibold text-xs text-slate-400 hover:text-white hover:bg-slate-800/40 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                  <span>Export Global Files (.xlsx)</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleTabClick('jurnal-saya')}
                className="w-full text-left px-4 py-2.5 rounded-2xl font-semibold text-xs text-slate-400 hover:text-white hover:bg-slate-800/40 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <History className="w-4 h-4 text-slate-400" />
                <span>History Aktivitas Membaca</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom User Profile Section: Screenshot Aesthetic */}
        <div className="p-4 border-t border-slate-800/80 bg-[#09101f] shrink-0 space-y-2">
          {currentUser ? (
            <div className="bg-slate-800/60 rounded-2xl border border-slate-700/60 p-3 space-y-2">
              <div 
                onClick={onOpenEditProfile}
                className="flex items-center gap-3 cursor-pointer group"
                title="Edit Profil (Nama, Sandi, Foto)"
              >
                {/* Red Circular Initials Badge */}
                <div className="w-9 h-9 rounded-full bg-red-600 text-white font-black flex items-center justify-center text-xs shadow-md shrink-0 border border-red-500 overflow-hidden">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(currentUser.name)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs truncate group-hover:text-red-400 transition-colors flex items-center gap-1.5">
                    <span className="truncate">{currentUser.name}</span>
                    <Pencil className="w-3 h-3 text-slate-400 group-hover:text-red-400 shrink-0" />
                  </div>
                  <div className="text-[10px] font-black text-red-500 tracking-wider uppercase mt-0.5">
                    {currentUser.role === 'admin' ? 'AUTHORIZED ACCESS' : currentUser.role === 'guru' ? 'GURU PENILAI' : 'SISWA TERDAFTAR'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={onOpenEditProfile}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition-colors text-center cursor-pointer"
                >
                  Edit Profil
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="py-1.5 px-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-[10px] font-bold transition-colors cursor-pointer"
                  title="Keluar dari akun"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => handleTabClick('login-portal')}
              className="w-full py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-md shadow-red-900/40 text-center cursor-pointer"
            >
              Masuk ke Sistem
            </button>
          )}

          {/* Sembunyikan Navigasi */}
          <button
            onClick={handleClose}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
            <span>Sembunyikan Menu</span>
          </button>
        </div>
      </aside>
    </>
  );
};
