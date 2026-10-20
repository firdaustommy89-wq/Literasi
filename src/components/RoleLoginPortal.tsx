import React, { useState, useEffect } from 'react';
import { User, UserRole, JenjangKelas } from '../types';
import { 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  GraduationCap,
  UserCheck,
  ShieldCheck,
  X,
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface RoleLoginPortalProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
  onRegisterStudent: (newUser: User) => void;
  onViewLeaderboard?: () => void;
  defaultRole?: UserRole;
  onGoogleSignIn?: () => void;
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
}) => {
  // Pre-fill username with 'smansmrs' exactly as shown in the screenshot
  const [username, setUsername] = useState('smansmrs');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Demo / Help Drawer toggle
  const [showQuickAccess, setShowQuickAccess] = useState(false);

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

  // Quick Account Select
  const handleSelectQuickAccount = (user: User) => {
    setUsername(user.username);
    setPassword('password123');
    setErrorMessage('');
    onLoginSuccess(user);
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
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    };

    onRegisterStudent(newStudent);
    setShowRegisterModal(false);
    onLoginSuccess(newStudent);
  };

  // Demo user lists
  const demoAdmin = users.find((u) => u.role === 'admin');
  const demoGuru = users.find((u) => u.role === 'guru');
  const demoSiswa = users.find((u) => u.role === 'siswa');

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* Background Dark Blue dengan Poligon Geometris Halus */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#06142e] via-[#0c224a] to-[#040d1c] overflow-hidden">
        {/* Ambient Dark Blue Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <svg 
          className="absolute inset-0 w-full h-full object-cover opacity-10" 
          xmlns="http://www.w3.org/2000/svg" 
          preserveAspectRatio="none" 
          viewBox="0 0 1000 1000"
        >
          <polygon points="0,0 300,0 150,200" fill="#38bdf8" />
          <polygon points="300,0 700,0 500,250" fill="#ffffff" opacity="0.4" />
          <polygon points="700,0 1000,0 850,200" fill="#0284c7" opacity="0.3" />
          <polygon points="0,0 150,200 0,400" fill="#000000" opacity="0.3" />
          <polygon points="150,200 500,250 300,500" fill="#38bdf8" opacity="0.3" />
          <polygon points="500,250 850,200 700,500" fill="#ffffff" opacity="0.2" />
          <polygon points="850,200 1000,0 1000,400" fill="#0284c7" opacity="0.3" />
          <polygon points="0,400 300,500 100,750" fill="#ffffff" opacity="0.2" />
          <polygon points="300,500 700,500 500,800" fill="#000000" opacity="0.3" />
          <polygon points="700,500 1000,400 900,750" fill="#38bdf8" opacity="0.3" />
          <polygon points="0,400 100,750 0,1000" fill="#000000" opacity="0.4" />
          <polygon points="100,750 500,800 250,1000" fill="#ffffff" opacity="0.2" />
          <polygon points="500,800 900,750 750,1000" fill="#0284c7" opacity="0.25" />
          <polygon points="900,750 1000,400 1000,1000" fill="#000000" opacity="0.3" />
          <polygon points="250,1000 500,800 750,1000" fill="#ffffff" opacity="0.1" />
          <polygon points="0,1000 250,1000 100,750" fill="#38bdf8" opacity="0.2" />
          <polygon points="750,1000 1000,1000 900,750" fill="#ffffff" opacity="0.15" />
        </svg>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-[480px] bg-white rounded-[32px] sm:rounded-[36px] shadow-2xl shadow-black/40 p-8 sm:p-11 relative border border-white/80 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Header dengan Logo Sekolah di Atas & Tulisan Sistem Penilaian Literasi | SMAN 2 Samarinda */}
        <div className="flex flex-col items-center justify-center text-center mb-7">
          {/* Logo Sekolah SMAN 2 Samarinda di Atas */}
          <div className="mb-3 flex items-center justify-center">
            <img
              src="/assets/aistudio/Logo_SMAN_2_Samarinda_-_Kecil_5b264003.png"
              alt="Logo SMAN 2 Samarinda"
              className="w-16 h-20 sm:w-20 sm:h-24 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
            />
          </div>

          <h1 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight">
            Sistem Penilaian Literasi
          </h1>
          <div className="text-xs sm:text-sm font-bold text-sky-600 tracking-wider uppercase mt-1">
            SMAN 2 Samarinda
          </div>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-1">
            Sistem Penilaian Literasi | SMAN 2 Samarinda
          </p>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSignIn} className="space-y-5">
          {/* Username */}
          <div className="text-left">
            <label className="block text-sm sm:text-base font-medium text-slate-800 mb-2">
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full h-14 px-4 text-base rounded-xl border border-slate-200/90 text-slate-800 placeholder-slate-400 focus:border-[#298fca] focus:ring-2 focus:ring-[#298fca]/20 outline-none transition-all font-normal bg-white"
            />
          </div>

          {/* Password */}
          <div className="text-left">
            <label className="block text-sm sm:text-base font-medium text-slate-800 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Please enter your password"
                className="w-full h-14 pl-4 pr-12 text-base rounded-xl border border-slate-200/90 text-slate-800 placeholder-slate-400 focus:border-[#298fca] focus:ring-2 focus:ring-[#298fca]/20 outline-none transition-all font-normal bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#298fca] hover:text-[#1e78b7] transition-colors p-1 cursor-pointer"
                title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-slate-400" />
                ) : (
                  <Eye className="w-5 h-5 text-[#298fca]" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 mt-7 rounded-xl bg-[#298fca] hover:bg-[#207eb5] active:bg-[#1a6ea0] text-white font-medium text-lg tracking-wide shadow-xs transition-colors flex items-center justify-center cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Quick Demo Access & Helpful Options */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setShowQuickAccess(!showQuickAccess)}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Akses Cepat Demo Akun / Bantuan Masuk</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showQuickAccess ? 'rotate-180' : ''}`} />
          </button>

          {showQuickAccess && (
            <div className="w-full space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 animate-in fade-in">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
                Pilih Akun Demo (1-Klik Masuk)
              </div>
              <div className="grid grid-cols-3 gap-2">
                {demoAdmin && (
                  <button
                    type="button"
                    onClick={() => handleSelectQuickAccount(demoAdmin)}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-center transition-all cursor-pointer shadow-2xs"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                    <span className="text-[11px] font-bold text-slate-800 block">Admin</span>
                    <span className="text-[9px] text-slate-400 block font-mono">smansmrs</span>
                  </button>
                )}
                {demoGuru && (
                  <button
                    type="button"
                    onClick={() => handleSelectQuickAccount(demoGuru)}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-center transition-all cursor-pointer shadow-2xs"
                  >
                    <UserCheck className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                    <span className="text-[11px] font-bold text-slate-800 block">Guru</span>
                    <span className="text-[9px] text-slate-400 block font-mono">pak.hendra</span>
                  </button>
                )}
                {demoSiswa && (
                  <button
                    type="button"
                    onClick={() => handleSelectQuickAccount(demoSiswa)}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-center transition-all cursor-pointer shadow-2xs"
                  >
                    <GraduationCap className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <span className="text-[11px] font-bold text-slate-800 block">Siswa</span>
                    <span className="text-[9px] text-slate-400 block font-mono">rizky.pratama</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(true)}
                  className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer"
                >
                  + Daftar Siswa Baru
                </button>
                {onGoogleSignIn && (
                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    className="text-slate-600 hover:text-slate-900 font-semibold transition-colors cursor-pointer"
                  >
                    Masuk dengan Google
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timestamp below the card, on dark blue background */}
      <div className="mt-6 text-center text-blue-200/90 text-xs sm:text-sm font-medium tracking-wide select-none drop-shadow-xs">
        {formattedTimestamp}
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
