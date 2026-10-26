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
  Activity,
  Database
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
  unreadStudentValidationCount = 0,
  studentValidatedEntriesCount = 0,
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
        {/* Top Decorative School Accent Bar (Blue & Gold) */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-700 via-amber-400 to-blue-500 shrink-0"></div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Header Block: Royal Blue & Yellow Gold Shield */}
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
              {/* Blue & Gold Shield Icon Box */}
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center text-amber-300 border border-blue-400/40 shadow-lg shadow-blue-950/60 shrink-0 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-white tracking-tight leading-tight">
                  {getRoleTitle()}
                </h2>
                <div className="text-[10px] font-black text-amber-400 tracking-widest uppercase mt-0.5">
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
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'upload-admin'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-slate-300" />
                    <span>Users (Kelola Pengguna)</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'upload-admin' ? 'text-white translate-x-0.5' : 'text-slate-500'}`} />
                </button>

                <button
                  onClick={() => handleTabClick('validasi-guru')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'validasi-guru'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4 text-slate-300" />
                    <span>Validasi Jurnal & 4 Minggu</span>
                  </div>
                  {pendingValidationCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">
                      {pendingValidationCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleTabClick('leaderboard')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-slate-300" />
                    <span>Peringkat Top 3 Literasi</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'leaderboard' ? 'text-white translate-x-0.5' : 'text-slate-500'}`} />
                </button>
              </>
            )}

            {/* If Guru */}
            {currentUser && currentUser.role === 'guru' && (
              <>
                <button
                  onClick={() => handleTabClick('validasi-guru')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'validasi-guru'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4 text-slate-300" />
                    <span>Validasi Jurnal & 4 Minggu</span>
                  </div>
                  {pendingValidationCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">
                      {pendingValidationCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleTabClick('leaderboard')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-slate-300" />
                    <span>Peringkat Top 3 Literasi</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'leaderboard' ? 'text-white translate-x-0.5' : 'text-slate-500'}`} />
                </button>
              </>
            )}

            {/* If Siswa */}
            {currentUser && currentUser.role === 'siswa' && (
              <>
                <button
                  onClick={() => handleTabClick('input-jurnal')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'input-jurnal'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <PlusCircle className="w-4 h-4 text-slate-300" />
                    <span>Isi Jurnal Baru</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'input-jurnal' ? 'text-white translate-x-0.5' : 'text-slate-500'}`} />
                </button>

                <button
                  onClick={() => handleTabClick('jurnal-saya')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between transition-all cursor-pointer group ${
                    activeTab === 'jurnal-saya'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <History className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 transition-colors" />
                      {unreadStudentValidationCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                        </span>
                      )}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold flex items-center gap-1.5">
                        <span>Jurnal Saya</span>
                      </div>
                      <span className="block text-[10px] text-slate-400 font-normal truncate">
                        Riwayat & Nilai Guru
                      </span>
                    </div>
                  </div>

                  {/* Real-time Indicator Badge */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {unreadStudentValidationCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white">
                        <span>{unreadStudentValidationCount} Nilai Baru</span>
                      </span>
                    ) : studentValidatedEntriesCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-emerald-400 border border-emerald-800/40">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{studentValidatedEntriesCount} Dinilai</span>
                      </span>
                    ) : null}
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'jurnal-saya' ? 'text-white translate-x-0.5' : 'text-slate-500'}`} />
                  </div>
                </button>

                <button
                  onClick={() => handleTabClick('leaderboard')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-slate-300" />
                    <span>Papan Peringkat Top 3</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'leaderboard' ? 'text-white translate-x-0.5' : 'text-slate-500'}`} />
                </button>
              </>
            )}

            {/* If not logged in */}
            {!currentUser && (
              <button
                onClick={() => handleTabClick('login-portal')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === 'login-portal'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 text-slate-300" />
                  <span>Portal Masuk Akun</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'login-portal' ? 'text-white translate-x-0.5' : 'text-slate-500'}`} />
              </button>
            )}

            {/* Category: LOGS & ACTIVITY */}
            <div className="pt-4 pb-1 px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                LOGS & ACTIVITY
              </span>
            </div>

            {/* History / Laporan button */}
            {isStaff ? (
              <>
                <button
                  onClick={onOpenReportModal}
                  className="w-full text-left px-3.5 py-2 rounded-xl font-medium text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  <span>History & Cetak Rapor</span>
                </button>

                <button
                  onClick={onExportExcel}
                  className="w-full text-left px-3.5 py-2 rounded-xl font-medium text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                  <span>Export Global Files (.xlsx)</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleTabClick('jurnal-saya')}
                className="w-full text-left px-3.5 py-2 rounded-xl font-medium text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <History className="w-4 h-4 text-slate-400" />
                <span>History Aktivitas Membaca</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom User Profile Section: Biru & Kuning Emas */}
        <div className="p-4 border-t border-slate-800/80 bg-[#081020] shrink-0 space-y-2">
          {currentUser ? (
            <div className="bg-slate-800/60 rounded-2xl border border-blue-900/40 p-3 space-y-2">
              <div 
                onClick={onOpenEditProfile}
                className="flex items-center gap-3 cursor-pointer group"
                title="Edit Profil (Nama, Sandi, Foto)"
              >
                {/* Blue Circular Initials Badge with Gold Ring */}
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs shadow-md shrink-0 border-2 border-amber-400 overflow-hidden">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(currentUser.name)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs truncate group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                    <span className="truncate">{currentUser.name}</span>
                    <Pencil className="w-3 h-3 text-slate-400 group-hover:text-amber-300 shrink-0" />
                  </div>
                  <div className="text-[10px] font-black text-amber-400 tracking-wider uppercase mt-0.5">
                    {currentUser.role === 'admin' ? 'AUTHORIZED ACCESS' : currentUser.role === 'guru' ? 'GURU PENILAI' : 'SISWA TERDAFTAR'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={onOpenEditProfile}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-blue-900/40 hover:bg-blue-800/60 text-blue-200 text-[10px] font-bold transition-colors text-center cursor-pointer border border-blue-700/30"
                >
                  Edit Profil
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 text-[10px] font-bold transition-colors cursor-pointer border border-slate-700/50"
                  title="Keluar dari akun"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => handleTabClick('login-portal')}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-blue-950 font-black text-xs transition-colors shadow-md shadow-amber-500/30 text-center cursor-pointer"
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
