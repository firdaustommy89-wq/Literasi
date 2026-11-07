import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { 
  BookOpen, 
  Award, 
  FileSpreadsheet, 
  Printer, 
  UserCheck, 
  Upload, 
  LogOut, 
  ChevronDown, 
  PlusCircle, 
  History,
  ShieldCheck,
  GraduationCap,
  LogIn,
  RefreshCw
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  users: User[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSwitchUser: (user: User) => void;
  onOpenAuthModal: (role?: UserRole) => void;
  onLogout: () => void;
  onOpenReportModal: () => void;
  onExportExcel: () => void;
  isSyncing?: boolean;
  onRefreshData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  users,
  activeTab,
  setActiveTab,
  onSwitchUser,
  onOpenAuthModal,
  onLogout,
  onOpenReportModal,
  onExportExcel,
  isSyncing = false,
  onRefreshData,
}) => {
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'siswa':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <GraduationCap className="w-3.5 h-3.5" /> Siswa {currentUser?.kelas ? `Kelas ${currentUser.kelas}` : ''}
          </span>
        );
      case 'guru':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <UserCheck className="w-3.5 h-3.5" /> Guru Penilai
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Administrator
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-xs no-print">
      {/* Decorative Blue & Yellow Gradient Strip */}
      <div className="h-1 bg-gradient-to-r from-blue-700 via-amber-400 to-sky-500"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div 
              onClick={() => {
                if (currentUser) {
                  if (currentUser.role === 'siswa') setActiveTab('input-jurnal');
                  else if (currentUser.role === 'guru') setActiveTab('validasi-guru');
                  else setActiveTab('upload-admin');
                } else {
                  setActiveTab('login-portal');
                }
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="p-1 rounded-xl bg-white border border-amber-200/80 shadow-xs group-hover:shadow-md group-hover:scale-105 transition-all">
                <SchoolLogo className="w-8 h-10 shrink-0" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-blue-950">
                    SI-LITERASI
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-amber-100 text-amber-900 border border-amber-300">
                    SMAN 2 SAMARINDA
                  </span>
                  <button
                    type="button"
                    onClick={onRefreshData}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer"
                    title="Aplikasi selalu tersinkronisasi otomatis dengan database terpusat. Klik untuk menyegarkan data seketika."
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
                    <span className="hidden sm:inline">{isSyncing ? 'Menyinkronkan...' : 'Live Real-Time Sync'}</span>
                    <span className="sm:hidden">{isSyncing ? 'Sync...' : 'Live'}</span>
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-600' : 'text-emerald-600'}`} />
                  </button>
                </div>
                <p className="text-[11px] text-blue-900/70 font-semibold hidden sm:block">
                  Sistem Penilaian Literasi & Refleksi Siswa
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links based on role */}
          <nav className="hidden md:flex items-center gap-1">
            {currentUser && currentUser.role === 'siswa' && (
              <>
                <button
                  onClick={() => setActiveTab('input-jurnal')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'input-jurnal'
                      ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-indigo-600" />
                  Isi Jurnal Literasi
                </button>
                <button
                  onClick={() => setActiveTab('jurnal-saya')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'jurnal-saya'
                      ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <History className="w-4 h-4 text-slate-500" />
                  Riwayat & Nilai Saya
                </button>
              </>
            )}

            {currentUser && currentUser.role === 'guru' && (
              <button
                onClick={() => setActiveTab('validasi-guru')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'validasi-guru'
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Validasi Jurnal Siswa
              </button>
            )}

            {currentUser && currentUser.role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('upload-admin')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'upload-admin'
                      ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Upload className="w-4 h-4 text-indigo-600" />
                  Upload & Kelola Data
                </button>
                <button
                  onClick={() => setActiveTab('validasi-guru')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'validasi-guru'
                      ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  Semua Jurnal
                </button>
              </>
            )}

            {/* Top 3 Leaderboard: Hanya untuk Guru dan Admin */}
            {currentUser && (currentUser.role === 'guru' || currentUser.role === 'admin') && (
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'leaderboard'
                    ? 'bg-amber-50 text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Award className="w-4 h-4 text-amber-500" />
                Peringkat Top 3 (10, 11, 12)
              </button>
            )}
          </nav>

          {/* Right Action buttons & User profile */}
          <div className="flex items-center gap-2">
            {/* Quick Export Excel & Print / PDF: Hanya untuk Guru dan Admin */}
            {currentUser && (currentUser.role === 'guru' || currentUser.role === 'admin') && (
              <>
                <button
                  onClick={onExportExcel}
                  title="Unduh File Excel (.xlsx)"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">Excel</span>
                </button>

                <button
                  onClick={onOpenReportModal}
                  title="Cetak Laporan / Simpan PDF"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors shadow-xs"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">Cetak / PDF</span>
                </button>
              </>
            )}

            {/* User Account / Login Button */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                  className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition-all text-left"
                >
                  <img
                    src={currentUser.avatar || '/src/assets/images/avatar_student_id_1793369471300.jpg'}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[130px]">
                      {currentUser.name}
                    </div>
                    <div className="flex items-center gap-1">
                      {getRoleBadge(currentUser.role)}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Account Dropdown Menu */}
                {showSwitchMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-400 font-medium">Akun Saat Ini</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{currentUser.name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {getRoleBadge(currentUser.role)}
                        {currentUser.rombel && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            ({currentUser.rombel})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3">
                      <button
                        onClick={() => {
                          setShowSwitchMenu(false);
                          onLogout();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 rounded-xl transition-colors border border-rose-200"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Keluar / Kembali ke Halaman Login
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenAuthModal('siswa')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login Siswa</span>
                </button>
                <button
                  onClick={() => onOpenAuthModal('guru')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login Guru</span>
                </button>
                <button
                  onClick={() => onOpenAuthModal('admin')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login Admin</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Submenu Navigation (when logged in) */}
        {currentUser && (
          <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-100 text-xs scrollbar-none">
            {currentUser.role === 'siswa' && (
              <>
                <button
                  onClick={() => setActiveTab('input-jurnal')}
                  className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 ${
                    activeTab === 'input-jurnal' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Isi Jurnal
                </button>
                <button
                  onClick={() => setActiveTab('jurnal-saya')}
                  className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 ${
                    activeTab === 'jurnal-saya' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Riwayat & Nilai
                </button>
              </>
            )}

            {currentUser.role === 'guru' && (
              <button
                onClick={() => setActiveTab('validasi-guru')}
                className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 ${
                  activeTab === 'validasi-guru' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Validasi Siswa
              </button>
            )}

            {currentUser.role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('upload-admin')}
                  className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 ${
                    activeTab === 'upload-admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Upload Data
                </button>
                <button
                  onClick={() => setActiveTab('validasi-guru')}
                  className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 ${
                    activeTab === 'validasi-guru' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Daftar Jurnal
                </button>
              </>
            )}

            {(currentUser.role === 'guru' || currentUser.role === 'admin') && (
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 ${
                  activeTab === 'leaderboard' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                🏆 Top 3 Jenjang
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
