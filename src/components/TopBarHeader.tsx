import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, UserRole, LiteracyEntry } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { 
  Menu, 
  Search,
  Bell, 
  PlusCircle, 
  CheckCircle2, 
  CheckCheck, 
  ChevronRight, 
  Calendar, 
  Building2, 
  Sun, 
  Moon, 
  LogOut,
  PanelLeftClose,
  BookOpen,
  User as UserIcon,
  X,
  Sparkles,
  Layers,
  RefreshCw
} from 'lucide-react';

interface TopBarHeaderProps {
  currentUser: User | null;
  activeTab: string;
  onNavigateTab?: (tab: string) => void;
  entries?: LiteracyEntry[];
  users?: User[];
  academicYear?: string;
  semester?: string;
  schoolName?: string;
  onOpenSchoolSettingsModal?: () => void;
  onOpenAcademicYearModal?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
  onOpenAuthModal: (role?: UserRole) => void;
  onOpenEditProfile?: () => void;
  onLogout?: () => void;
  onRefreshData?: () => void;
  isSyncing?: boolean;
  onExportExcel?: () => void;
  onOpenReportModal?: () => void;
  unreadStudentValidationCount?: number;
  studentValidatedEntries?: LiteracyEntry[];
  onNavigateToJurnalSaya?: () => void;
  onMarkAllValidationsRead?: () => void;
  onMarkSingleValidationRead?: (id: string) => void;
  unreadSubmissionCount?: number;
  pendingSubmissions?: LiteracyEntry[];
  onMarkAllSubmissionsRead?: () => void;
  onMarkSingleSubmissionRead?: (id: string) => void;
  onNavigateToValidasi?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const TopBarHeader: React.FC<TopBarHeaderProps> = ({
  currentUser,
  activeTab,
  onNavigateTab,
  entries = [],
  users = [],
  academicYear,
  semester,
  schoolName,
  onOpenSchoolSettingsModal,
  onOpenAcademicYearModal,
  isSidebarOpen = true,
  onToggleSidebar,
  onOpenMobileMenu,
  onOpenAuthModal,
  onOpenEditProfile,
  onLogout,
  onRefreshData,
  isSyncing = false,
  onExportExcel,
  onOpenReportModal,
  unreadStudentValidationCount = 0,
  studentValidatedEntries = [],
  onNavigateToJurnalSaya,
  onMarkAllValidationsRead,
  onMarkSingleValidationRead,
  unreadSubmissionCount = 0,
  pendingSubmissions = [],
  onMarkAllSubmissionsRead,
  onMarkSingleSubmissionRead,
  onNavigateToValidasi,
  theme = 'light',
  onToggleTheme,
}) => {
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotificationMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Global search filtering
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return { books: [], students: [] };

    // Search books
    const matchedBooks = entries
      .filter((e) => 
        e.bookTitle.toLowerCase().includes(q) ||
        (e.readingCategory && e.readingCategory.toLowerCase().includes(q)) ||
        (e.studentName && e.studentName.toLowerCase().includes(q))
      )
      .slice(0, 4);

    // Search users (if staff or self)
    const matchedStudents = users
      .filter((u) => 
        u.role === 'siswa' && 
        (u.name.toLowerCase().includes(q) || (u.rombel && u.rombel.toLowerCase().includes(q)))
      )
      .slice(0, 4);

    return { books: matchedBooks, students: matchedStudents };
  }, [searchQuery, entries, users]);

  const handleToggle = onToggleSidebar || onOpenMobileMenu;

  const handleQuickAction = () => {
    if (!currentUser) {
      onOpenAuthModal('siswa');
      return;
    }
    if (currentUser.role === 'siswa') {
      onNavigateTab?.('input-jurnal');
    } else if (currentUser.role === 'guru') {
      onNavigateTab?.('validasi-guru');
    } else {
      onNavigateTab?.('upload-admin');
    }
  };

  const getQuickActionLabel = () => {
    if (!currentUser) return '+ Masuk Akun';
    if (currentUser.role === 'siswa') return '+ Tulis Jurnal';
    if (currentUser.role === 'guru') return '+ Validasi Jurnal';
    return '+ Kelola Data';
  };

  return (
    <header className="shrink-0 z-30 bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs no-print transition-colors">
      <div className="px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2.5 sm:gap-6">
        {/* Left Section: Sidebar Toggle + Dynamic Greeting */}
        <div className="flex items-center gap-3 min-w-0">
          {currentUser && activeTab !== 'login-portal' && (
            <button
              type="button"
              onClick={handleToggle}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs"
              aria-label={isSidebarOpen ? 'Sembunyikan Menu Navigasi' : 'Tampilkan Menu Navigasi'}
              title={isSidebarOpen ? 'Sembunyikan Menu Navigasi' : 'Tampilkan Menu Navigasi'}
            >
              <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
          )}

          {/* Dynamic Page Title / Greeting */}
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
              {currentUser ? `Selamat datang kembali, ${currentUser.name.split(' ')[0]}` : 'SI-LITERASI'}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1.5 mt-0.5">
              <span>{schoolName || 'SMAN 2 Samarinda'}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-blue-600 dark:text-cyan-400 font-semibold">
                {academicYear ? `TA ${academicYear} (${semester || 'Ganjil'})` : 'Sistem Literasi'}
              </span>
            </p>
          </div>
        </div>

        {/* Center Section: Global Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-2 relative" ref={searchRef}>
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Cari buku, jurnal, atau siswa..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown Popover */}
          {showSearchResults && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Hasil Pencarian
                </span>
                <span className="text-[10px] text-slate-400">
                  {searchResults.books.length + searchResults.students.length} ditemukan
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                {/* Books results */}
                {searchResults.books.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      setShowSearchResults(false);
                      setSearchQuery('');
                      if (currentUser?.role === 'siswa') onNavigateTab?.('jurnal-saya');
                      else onNavigateTab?.('validasi-guru');
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {b.bookTitle}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {b.studentName} ({b.studentKelas || b.studentRombel || 'Siswa'}) • {b.date}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                ))}

                {/* Students results */}
                {searchResults.students.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setShowSearchResults(false);
                      setSearchQuery('');
                      if (currentUser?.role === 'admin') onNavigateTab?.('upload-admin');
                      else onNavigateTab?.('validasi-guru');
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {s.rombel || `Kelas ${s.kelas}`} • NISN: {s.nisn || '-'}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                ))}

                {searchResults.books.length === 0 && searchResults.students.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Tidak ada hasil yang sesuai dengan "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Quick Action + Notif + Theme + Sync */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Sinkronkan Semua Perangkat Button */}
          {onRefreshData && (
            <button
              type="button"
              onClick={onRefreshData}
              disabled={isSyncing}
              className={`btn-interaction inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSyncing 
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs'
              }`}
              title="Perbarui & Sinkronkan Data ke Semua Perangkat dan Web Browser"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
              <span className="hidden md:inline font-semibold">
                {isSyncing ? 'Sinkronisasi...' : 'Sinkronkan'}
              </span>
            </button>
          )}

          {/* Quick Action Button (+ Buat Baru) */}
          <button
            type="button"
            onClick={handleQuickAction}
            className="btn-interaction inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-900/30 cursor-pointer"
            title={getQuickActionLabel()}
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">{getQuickActionLabel()}</span>
          </button>

          {/* Real-time Notification Bell for Siswa, Guru, and Admin */}
          <div className="relative" ref={notifRef}>
            {(() => {
              const isStaff = currentUser?.role === 'guru' || currentUser?.role === 'admin';
              const activeCount = isStaff ? unreadSubmissionCount : unreadStudentValidationCount;

              return (
                <>
                  <button
                    type="button"
                    onClick={() => setShowNotificationMenu((prev) => !prev)}
                    className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
                      activeCount > 0
                        ? isStaff 
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    title={
                      isStaff
                        ? activeCount > 0
                          ? `${activeCount} Jurnal siswa baru menunggu validasi!`
                          : 'Notifikasi Jurnal Siswa'
                        : activeCount > 0
                        ? `${activeCount} Jurnal baru saja dinilai guru!`
                        : 'Notifikasi Nilai & Validasi'
                    }
                    aria-label="Notifikasi"
                  >
                    <Bell className={`w-4 h-4 ${activeCount > 0 ? (isStaff ? 'text-amber-500 animate-bounce' : 'text-emerald-600 dark:text-emerald-400 animate-bounce') : 'text-slate-500 dark:text-slate-400'}`} />
                    
                    {activeCount > 0 && (
                      <span className={`absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-black text-white shadow-xs ${isStaff ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                        {activeCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Popover Dropdown */}
                  {showNotificationMenu && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="p-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-amber-300" />
                          <span className="font-extrabold text-xs">
                            {isStaff ? 'Notifikasi Jurnal Siswa Masuk' : 'Pusat Notifikasi Literasi'}
                          </span>
                        </div>
                        {activeCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isStaff) onMarkAllSubmissionsRead?.();
                              else onMarkAllValidationsRead?.();
                            }}
                            className="text-[11px] font-bold text-blue-100 hover:text-white flex items-center gap-1 cursor-pointer bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg transition-colors"
                          >
                            <CheckCheck className="w-3 h-3" />
                            <span>Tandai Dibaca</span>
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
                        {isStaff ? (
                          /* Guru & Admin: List of student journal submissions */
                          pendingSubmissions.length === 0 ? (
                            <div className="py-8 text-center text-slate-400">
                              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                              <p className="text-xs font-semibold">Tidak ada jurnal baru</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Seluruh jurnal yang diisi siswa telah divalidasi.
                              </p>
                            </div>
                          ) : (
                            pendingSubmissions.slice(0, 6).map((entry) => (
                              <div
                                key={entry.id}
                                onClick={() => {
                                  onMarkSingleSubmissionRead?.(entry.id);
                                  if (onNavigateToValidasi) onNavigateToValidasi();
                                  else onNavigateTab?.('validasi-guru');
                                  setShowNotificationMenu(false);
                                }}
                                className="pt-2 first:pt-0 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        Perlu Validasi
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {entry.date}
                                      </span>
                                    </div>
                                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                                      {entry.bookTitle}
                                    </h5>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                      Siswa: <strong className="text-blue-700 dark:text-cyan-300">{entry.studentName}</strong> ({entry.studentKelas || entry.studentRombel || 'Siswa'})
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      Minggu ke-{entry.weekNumber} • {entry.readingCategory || entry.literacyType}
                                    </p>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5 shrink-0 mt-1" />
                                </div>
                              </div>
                            ))
                          )
                        ) : (
                          /* Siswa: List of validated entries */
                          studentValidatedEntries.length === 0 ? (
                            <div className="py-8 text-center text-slate-400">
                              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                              <p className="text-xs font-semibold">Belum ada notifikasi baru</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Jurnal yang dinilai guru akan muncul di sini secara real-time.
                              </p>
                            </div>
                          ) : (
                            studentValidatedEntries.slice(0, 5).map((entry) => {
                              const score = entry.totalFinalScore ?? entry.teacherValidation?.validationScore ?? 0;
                              return (
                                <div
                                  key={entry.id}
                                  onClick={() => {
                                    onMarkSingleValidationRead?.(entry.id);
                                    onNavigateToJurnalSaya?.();
                                    setShowNotificationMenu(false);
                                  }}
                                  className="pt-2 first:pt-0 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                          Skor: {score}/100
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          {entry.date}
                                        </span>
                                      </div>
                                      <h5 className="text-xs font-extrabold text-slate-900 dark:text-white mt-1 truncate">
                                        {entry.bookTitle}
                                      </h5>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Dinilai oleh <strong>{entry.teacherValidation?.teacherName || 'Guru'}</strong>
                                      </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5 shrink-0 mt-1" />
                                  </div>
                                </div>
                              );
                            })
                          )
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {isStaff
                            ? `Total ${pendingSubmissions.length} jurnal menunggu validasi`
                            : `Total ${studentValidatedEntries.length} jurnal dinilai`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isStaff) {
                              if (onNavigateToValidasi) onNavigateToValidasi();
                              else onNavigateTab?.('validasi-guru');
                            } else {
                              onNavigateToJurnalSaya?.();
                            }
                            setShowNotificationMenu(false);
                          }}
                          className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isStaff ? 'Buka Validasi Guru' : 'Buka Jurnal Saya'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Theme Mode Toggle (Light/Dark) */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
              aria-label={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
              title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
            </button>
          )}

          {/* Logout Shortcut for staff/user in header */}
          {currentUser && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Keluar dari akun (Logout)"
              aria-label="Keluar dari akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
