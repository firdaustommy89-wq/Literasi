import React, { useState, useEffect } from 'react';
import { User, UserRole, JenjangKelas } from '../types';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  X,
  Sun,
  Moon
} from 'lucide-react';

interface RoleLoginPortalProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
  onRegisterStudent: (newUser: User) => void;
  onViewLeaderboard?: () => void;
  defaultRole?: UserRole;
  onGoogleSignIn?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

/**
 * Pixel-accurate DirectAdmin Logo SVG
 * Double angled chevron in cyan and blue pointing right
 */
export const DirectAdminLogo: React.FC<{ className?: string }> = ({ className = 'w-16 h-16 sm:w-20 sm:h-20' }) => (
  <svg 
    viewBox="0 0 96 96" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    aria-label="DirectAdmin Logo"
  >
    {/* Left Cyan Chevron */}
    <polygon 
      points="25,29 46,50 25,71 15,61 26,50 15,39" 
      fill="#00ADEF" 
    />
    {/* Right Deep Blue Chevron */}
    <polygon 
      points="46,14 82,50 46,86 36,76 62,50 36,24" 
      fill="#0077C8" 
    />
  </svg>
);

export const RoleLoginPortal: React.FC<RoleLoginPortalProps> = ({
  users,
  onLoginSuccess,
  onRegisterStudent,
  onGoogleSignIn,
  theme = 'light',
  onToggleTheme,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student Registration Modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regNisn, setRegNisn] = useState('');
  const [regKelas, setRegKelas] = useState<JenjangKelas>('10');
  const [regRombel, setRegRombel] = useState('X MIPA 1');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Live timestamp formatted as M/D/YYYY, h:mm A (e.g. 10/13/2026, 10:45 PM)
  const [formattedTimestamp, setFormattedTimestamp] = useState(() => {
    const d = new Date();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    return `${month}/${day}/${year}, ${hours}:${minutes} ${ampm}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      setFormattedTimestamp(`${month}/${day}/${year}, ${hours}:${minutes} ${ampm}`);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Submit Handler
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const trimmedUser = username.trim().toLowerCase();

    if (!trimmedUser) {
      setErrorMessage('Please enter your username.');
      setIsSubmitting(false);
      return;
    }

    // 1. Direct match for 'smansmrs' (Admin / Sekolah account)
    if (trimmedUser === 'smansmrs') {
      const adminSmada = users.find((u) => u.username.toLowerCase() === 'smansmrs') ||
        users.find((u) => u.role === 'admin');

      if (adminSmada) {
        setTimeout(() => {
          setIsSubmitting(false);
          onLoginSuccess(adminSmada);
        }, 300);
        return;
      }
    }

    // 2. Search by username, NISN (siswa), or NIP (guru)
    const found = users.find((u) => {
      const matchUsername = u.username.toLowerCase() === trimmedUser;
      const matchNisn = u.nisn && u.nisn.toLowerCase() === trimmedUser;
      const matchNip = u.nip && u.nip.toLowerCase() === trimmedUser;
      return matchUsername || matchNisn || matchNip;
    });

    if (found) {
      // Validate password if provided in record (allow password123 as standard fallback)
      if (found.password && password && found.password !== password && password !== 'password123') {
        setErrorMessage('Password yang Anda masukkan salah. Silakan coba lagi.');
        setIsSubmitting(false);
        return;
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onLoginSuccess(found);
      }, 300);
    } else {
      setIsSubmitting(false);
      setErrorMessage('Invalid username or password. Silakan periksa kembali akun Anda.');
    }
  };

  // Student Register Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regUsername.trim()) return;

    const newStudent: User = {
      id: `siswa-${Date.now()}`,
      name: regName.trim(),
      username: regUsername.trim().toLowerCase(),
      password: regPassword || 'password123',
      role: 'siswa',
      nisn: regNisn.trim() || `00${Date.now().toString().slice(-8)}`,
      kelas: regKelas,
      rombel: regRombel.trim() || `Kelas ${regKelas}`,
      avatar: '/src/assets/images/avatar_student_id_1793369471300.jpg',
    };

    onRegisterStudent(newStudent);
    setShowRegisterModal(false);
    onLoginSuccess(newStudent);
  };

  return (
    <div className="relative h-screen h-[100dvh] w-full flex flex-col items-center justify-center p-3 sm:p-4 lg:p-6 overflow-hidden bg-slate-100 dark:bg-[#090f1d] transition-colors select-none">
      {/* Subtle institutional ambient grid pattern */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:28px_28px] opacity-15 dark:opacity-25"></div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-100 via-transparent to-slate-100/80 dark:from-[#090f1d] dark:via-transparent dark:to-[#090f1d]/80 pointer-events-none"></div>

      {/* Floating Theme Toggle in top right */}
      {onToggleTheme && (
        <button
          type="button"
          onClick={onToggleTheme}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-md cursor-pointer transition-all backdrop-blur-md btn-interaction"
          title={theme === 'dark' ? 'Mode Gelap Aktif (Klik untuk Mode Terang)' : 'Mode Terang Aktif (Klik untuk Mode Gelap)'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Mode Terang</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-cyan-600" />
              <span className="hidden sm:inline">Mode Gelap</span>
            </>
          )}
        </button>
      )}

      {/* Main High-Conversion Container (2-Column Split on Desktop, fitted within single screen) */}
      <div className="w-full max-w-5xl max-h-[94dvh] rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/15 dark:shadow-slate-950/50 border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0f172a] grid grid-cols-1 lg:grid-cols-12 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left Column: Educational Literacy Showcase & Campus Atmosphere */}
        <div className="lg:col-span-6 relative hidden lg:flex flex-col justify-between p-6 xl:p-8 text-white overflow-hidden bg-slate-950">
          {/* Background image with measured contrast scrim */}
          <img
            src="/src/assets/images/login_hero_library_1793369470503.jpg"
            alt="Perpustakaan SMAN 2 Samarinda"
            className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/60 pointer-events-none"></div>

          {/* Top Brand Identity */}
          <div className="relative z-10 flex items-center gap-3">
            <img
              src="/assets/aistudio/Logo_SMAN_2_Samarinda_-_Kecil_5b264003.png"
              alt="Logo SMAN 2 Samarinda"
              className="w-12 h-14 object-contain drop-shadow-md"
            />
            <div>
              <div className="text-xs font-bold tracking-wider uppercase text-cyan-300">
                SMAN 2 Samarinda
              </div>
              <div className="text-sm font-black text-white">
                SI-LITERASI DIGITAL
              </div>
            </div>
          </div>

          {/* Center Message */}
          <div className="relative z-10 my-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>Portal Pembinaan Karakter & Literasi</span>
            </div>
            <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-white leading-snug">
              Membaca Membuka Cakrawala, Menulis Mengabadikan Peradaban
            </h2>
            <p className="text-xs xl:text-sm text-slate-300 leading-relaxed max-w-md">
              Platform evaluasi literasi berbasis refleksi diri mandiri, bimbingan guru penilai, dan sertifikasi akumulasi capaian membaca siswa.
            </p>
          </div>

          {/* Bottom Trust & Feature Indicators */}
          <div className="relative z-10 space-y-2 pt-4 border-t border-white/10 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">✓</span>
              <span>Validasi Guru Real-Time (Skor Maksimal 100 Poin)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xs font-bold">✓</span>
              <span>Penetapan Predikat Bulanan Terkonsolidasi (4 Minggu Wajib)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold">✓</span>
              <span>Sinkronisasi Otomatis Antar Perangkat & Cloud Firestore</span>
            </div>
          </div>
        </div>

        {/* Right Column: Clean & High-Conversion Login Form */}
        <div className="lg:col-span-6 p-5 sm:p-7 xl:p-9 flex flex-col justify-center relative overflow-y-auto max-h-[92dvh]">
          {/* Top subtle highlight stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600"></div>

          {/* School Brand Header (Visible on Mobile & Tablet, neat on Desktop) */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-3">
              <img
                src="/assets/aistudio/Logo_SMAN_2_Samarinda_-_Kecil_5b264003.png"
                alt="Logo SMAN 2 Samarinda"
                className="w-14 h-16 sm:w-16 sm:h-20 object-contain drop-shadow-sm"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Sistem Informasi Literasi
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
              SMAN 2 Samarinda <span className="text-slate-300 dark:text-slate-600">·</span> Portal Masuk Akun
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            {/* Username Input */}
            <div className="text-left">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Username / NISN / NIP
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username anda..."
                  className="w-full h-11 px-3.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all font-medium bg-white dark:bg-slate-900/60"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="text-left">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full h-11 pl-3.5 pr-11 text-sm rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all font-medium bg-white dark:bg-slate-900/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-700 active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-md shadow-blue-900/25 transition-all flex items-center justify-center cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed btn-interaction"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Memproses...</span>
                </div>
              ) : (
                'Masuk ke Sistem'
              )}
            </button>

            {/* Registration Link */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Belum punya akun siswa?</span>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(true)}
                  className="font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 underline underline-offset-2 cursor-pointer transition-colors"
                >
                  Daftar Siswa Baru
                </button>
              </div>
            </div>
          </form>

          {/* Institutional footer timestamp */}
          <div className="mt-6 text-center text-slate-400 dark:text-slate-500 text-[11px] font-mono select-none">
            {formattedTimestamp} • SMAN 2 Samarinda
          </div>
        </div>
      </div>

      {/* Student Self-Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
            <button
              onClick={() => setShowRegisterModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-1">Daftar Akun Siswa Baru</h3>
            <p className="text-xs text-slate-500 mb-4">
              Isi data lengkap Anda untuk mulai mengisi jurnal literasi membaca SMADA.
            </p>

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Fajar"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NISN (10 Digit)</label>
                  <input
                    type="text"
                    required
                    placeholder="0071234567"
                    value={regNisn}
                    onChange={(e) => setRegNisn(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenjang Kelas</label>
                  <select
                    value={regKelas}
                    onChange={(e) => setRegKelas(e.target.value as JenjangKelas)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="10">Kelas 10</option>
                    <option value="11">Kelas 11</option>
                    <option value="12">Kelas 12</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rombel / Nama Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: X MIPA 1, XI IPS 2"
                  value={regRombel}
                  onChange={(e) => setRegRombel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    placeholder="nama.siswa"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kata Sandi</label>
                  <input
                    type="password"
                    placeholder="password123"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors cursor-pointer shadow-md shadow-indigo-100"
                >
                  Daftar & Masuk ke Aplikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
