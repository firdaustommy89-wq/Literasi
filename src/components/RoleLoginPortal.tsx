import React, { useState } from 'react';
import { User, UserRole, JenjangKelas } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { 
  GraduationCap, 
  UserCheck, 
  ShieldCheck, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  BookOpen, 
  Award, 
  Sparkles,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';

interface RoleLoginPortalProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
  onRegisterStudent: (newUser: User) => void;
  onViewLeaderboard?: () => void;
  defaultRole?: UserRole;
  onGoogleSignIn?: () => void;
}

export const RoleLoginPortal: React.FC<RoleLoginPortalProps> = ({
  users,
  onLoginSuccess,
  onRegisterStudent,
  onViewLeaderboard,
  defaultRole = 'siswa',
  onGoogleSignIn,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);

  // Form input states for each role
  const [siswaIdentifier, setSiswaIdentifier] = useState('');
  const [siswaPassword, setSiswaPassword] = useState('');

  const [guruIdentifier, setGuruIdentifier] = useState('');
  const [guruPassword, setGuruPassword] = useState('');

  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);

  // Error message
  const [errorMessage, setErrorMessage] = useState('');

  // Register modal/inline view
  const [isRegisteringStudent, setIsRegisteringStudent] = useState(false);
  const [regName, setRegName] = useState('');
  const [regNisn, setRegNisn] = useState('');
  const [regKelas, setRegKelas] = useState<JenjangKelas>('10');
  const [regRombel, setRegRombel] = useState('X MIPA 1');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Handle Login for Siswa
  const handleSiswaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const idTrimmed = siswaIdentifier.trim().toLowerCase();

    if (!idTrimmed) {
      setErrorMessage('Silakan masukkan NISN atau Username Siswa Anda.');
      return;
    }

    const found = users.find(
      (u) =>
        u.role === 'siswa' &&
        (u.username.toLowerCase() === idTrimmed || (u.nisn && u.nisn.toLowerCase() === idTrimmed))
    );

    if (!found) {
      setErrorMessage(
        'Akun siswa dengan NISN / Username tersebut tidak ditemukan di sistem. Pastikan data sudah terdaftar oleh Admin atau silakan daftar akun baru.'
      );
      return;
    }

    onLoginSuccess(found);
  };

  // Handle Login for Guru
  const handleGuruSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const idTrimmed = guruIdentifier.trim().toLowerCase();

    if (!idTrimmed) {
      setErrorMessage('Silakan masukkan NIP atau Username Guru.');
      return;
    }

    const found = users.find(
      (u) =>
        u.role === 'guru' &&
        (u.username.toLowerCase() === idTrimmed || (u.nip && u.nip.toLowerCase() === idTrimmed))
    );

    if (!found) {
      setErrorMessage('Akun Guru dengan NIP / Username tersebut tidak ditemukan.');
      return;
    }

    onLoginSuccess(found);
  };

  // Handle Login for Admin
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const idTrimmed = adminIdentifier.trim().toLowerCase();

    if (!idTrimmed) {
      setErrorMessage('Silakan masukkan Username Administrator.');
      return;
    }

    const found = users.find(
      (u) => u.role === 'admin' && u.username.toLowerCase() === idTrimmed
    );

    if (!found) {
      setErrorMessage('Kredensial Administrator tidak valid.');
      return;
    }

    onLoginSuccess(found);
  };

  // Handle New Student Registration
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
    onLoginSuccess(newStudent);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-4xl mx-auto w-full">
        {/* Top App Brand / Header dengan Logo Sekolah */}
        <div className="text-center mb-8">
          {/* Logo Sekolah di Bagian Atas */}
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="p-3 sm:p-4 bg-white/95 backdrop-blur-md rounded-3xl shadow-xl shadow-blue-900/15 border-2 border-amber-400 ring-4 ring-amber-100 hover:scale-105 transition-all duration-300">
              <SchoolLogo className="w-16 h-20 sm:w-20 sm:h-24" />
            </div>
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-amber-400 text-blue-950 border border-amber-500/40 shadow-xs">
              <span>SMA NEGERI 2 SAMARINDA</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-blue-950 tracking-tight">
            SI-LITERASI
          </h1>
          <p className="text-sm sm:text-base text-blue-900/80 font-medium mt-1">
            Sistem Informasi Penilaian Literasi & Refleksi Siswa Sekolah Menengah
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
              📘 Literasi Karakter
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
              ⭐ Refleksi 100 Poin
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-sky-100 text-sky-800 border border-sky-200 shadow-2xs">
              ✨ Pembinaan Karakter
            </span>
          </div>
        </div>

        {/* ROLE SELECTION TABS / CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {/* Siswa Card Tab */}
          <button
            type="button"
            onClick={() => {
              setSelectedRole('siswa');
              setErrorMessage('');
              setIsRegisteringStudent(false);
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
              selectedRole === 'siswa'
                ? 'border-blue-600 bg-white ring-4 ring-amber-200/60 shadow-lg scale-[1.01]'
                : 'border-slate-200/80 bg-white/80 hover:bg-white text-slate-600'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                selectedRole === 'siswa'
                  ? 'bg-gradient-to-br from-blue-600 to-sky-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-slate-900">Portal Siswa</span>
              {selectedRole === 'siswa' && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-200"></span>
              )}
            </div>
          </button>

          {/* Guru Card Tab */}
          <button
            type="button"
            onClick={() => {
              setSelectedRole('guru');
              setErrorMessage('');
              setIsRegisteringStudent(false);
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
              selectedRole === 'guru'
                ? 'border-blue-700 bg-white ring-4 ring-amber-200/60 shadow-lg scale-[1.01]'
                : 'border-slate-200/80 bg-white/80 hover:bg-white text-slate-600'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                selectedRole === 'guru'
                  ? 'bg-gradient-to-br from-blue-700 to-indigo-700 text-white shadow-sm'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-slate-900">Portal Guru</span>
              {selectedRole === 'guru' && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-200"></span>
              )}
            </div>
          </button>

          {/* Admin Card Tab */}
          <button
            type="button"
            onClick={() => {
              setSelectedRole('admin');
              setErrorMessage('');
              setIsRegisteringStudent(false);
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
              selectedRole === 'admin'
                ? 'border-amber-500 bg-white ring-4 ring-blue-100 shadow-lg scale-[1.01]'
                : 'border-slate-200/80 bg-white/80 hover:bg-white text-slate-600'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                selectedRole === 'admin'
                  ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-slate-900">Portal Admin</span>
              {selectedRole === 'admin' && (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200"></span>
              )}
            </div>
          </button>
        </div>

        {/* ERROR ALERT */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium flex items-start gap-3 animate-in fade-in duration-150">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* MAIN FORM CONTAINER */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* ========================================================= */}
          {/* 1. FORM LOGIN KHUSUS SISWA */}
          {/* ========================================================= */}
          {selectedRole === 'siswa' && !isRegisteringStudent && (
            <div>
              {/* Form Banner */}
              <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-sky-900 text-white p-6 sm:p-7 border-b-2 border-amber-400 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl"></div>
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 inline-block mb-2 shadow-xs">
                      Portal Masuk Siswa
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black">
                      Login Akun Siswa (Kelas 10, 11 & 12)
                    </h2>
                  </div>
                  <div className="hidden sm:block w-14 h-14 rounded-2xl bg-white/10 text-amber-300 border border-amber-300/30 flex items-center justify-center">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-6 sm:p-8">
                <form onSubmit={handleSiswaSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      NISN atau Username Siswa <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Masukkan NISN atau username siswa..."
                        value={siswaIdentifier}
                        onChange={(e) => setSiswaIdentifier(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Masukkan kata sandi akun siswa..."
                        value={siswaPassword}
                        onChange={(e) => setSiswaPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-99 transition-all shadow-lg shadow-emerald-200 text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <GraduationCap className="w-5 h-5" />
                    <span>Masuk ke Dashboard Siswa</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => setIsRegisteringStudent(true)}
                    className="text-xs font-bold text-blue-700 hover:text-blue-800 underline underline-offset-2"
                  >
                    + Belum punya akun? Buat Akun Siswa Baru Mandiri
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 1.B REGISTER SISWA BARU */}
          {/* ========================================================= */}
          {selectedRole === 'siswa' && isRegisteringStudent && (
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Pendaftaran Akun Siswa Baru</h3>
                  <p className="text-xs text-slate-500">Isi identitas siswa untuk langsung mengakses jurnal literasi.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRegisteringStudent(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  ← Kembali ke Login
                </button>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama lengkap siswa..."
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">NISN (10 Digit)</label>
                    <input
                      type="text"
                      required
                      placeholder="0071239999"
                      value={regNisn}
                      onChange={(e) => setRegNisn(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jenjang Tingkat Kelas</label>
                    <select
                      value={regKelas}
                      onChange={(e) => {
                        const k = e.target.value as JenjangKelas;
                        setRegKelas(k);
                        setRegRombel(`Kelas ${k}`);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none text-sm font-medium bg-white"
                    >
                      <option value="10">Kelas 10 (Fase E)</option>
                      <option value="11">Kelas 11 (Fase F)</option>
                      <option value="12">Kelas 12 (Fase F)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rombongan Belajar (Rombel)</label>
                  <input
                    type="text"
                    required
                    placeholder="X MIPA 1 / XI IPS 2"
                    value={regRombel}
                    onChange={(e) => setRegRombel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Username Login</label>
                    <input
                      type="text"
                      required
                      placeholder="ilham.m"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kata Sandi</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-colors text-sm"
                  >
                    Daftar & Langsung Masuk ke Jurnal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. FORM LOGIN KHUSUS GURU */}
          {/* ========================================================= */}
          {selectedRole === 'guru' && (
            <div>
              {/* Form Banner */}
              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-sky-950 text-white p-6 sm:p-7 border-b-2 border-amber-400 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl"></div>
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 inline-block mb-2 shadow-xs">
                      Portal Guru Penilai
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black">
                      Login Akun Guru Pembimbing & Penilai
                    </h2>
                  </div>
                  <div className="hidden sm:block w-14 h-14 rounded-2xl bg-white/10 text-amber-300 border border-amber-300/30 flex items-center justify-center">
                    <UserCheck className="w-8 h-8" />
                  </div>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-6 sm:p-8">
                <form onSubmit={handleGuruSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      NIP atau Username Guru <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Masukkan NIP atau username guru..."
                        value={guruIdentifier}
                        onChange={(e) => setGuruIdentifier(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Kata Sandi Guru <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Masukkan kata sandi guru..."
                        value={guruPassword}
                        onChange={(e) => setGuruPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-99 transition-all shadow-lg shadow-indigo-200 text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserCheck className="w-5 h-5" />
                    <span>Masuk ke Portal Penilaian Guru</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. FORM LOGIN KHUSUS ADMIN */}
          {/* ========================================================= */}
          {selectedRole === 'admin' && (
            <div>
              {/* Form Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-7 border-b-2 border-amber-400 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl"></div>
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 inline-block mb-2 shadow-xs">
                      Portal Khusus Administrator
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black">
                      Login Administrator Sekolah
                    </h2>
                  </div>
                  <div className="hidden sm:block w-14 h-14 rounded-2xl bg-white/10 text-amber-300 border border-amber-300/30 flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-6 sm:p-8">
                <form onSubmit={handleAdminSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Username Administrator <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Masukkan username administrator..."
                        value={adminIdentifier}
                        onChange={(e) => setAdminIdentifier(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Kata Sandi Keamanan <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Masukkan kata sandi admin..."
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm font-medium text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-bold text-white bg-purple-700 hover:bg-purple-800 active:scale-99 transition-all shadow-lg shadow-purple-200 text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>Masuk ke Panel Pengelolaan Data Admin</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Google SSO Login Bar */}
          {onGoogleSignIn && (
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Masuk Cepat dengan Akun Google</p>
                  <p className="text-[11px] text-slate-500">Akses langsung Guru & Administrator (terintegrasi Firebase Auth)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:scale-98 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Login dengan Google</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
