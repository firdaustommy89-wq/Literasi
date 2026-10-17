import React, { useState } from 'react';
import { User } from '../types';
import { 
  X, 
  Camera, 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  ShieldCheck, 
  GraduationCap, 
  UserCheck, 
  Trash2,
  Upload,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface EditProfileModalProps {
  isOpen: boolean;
  currentUser: User | null;
  onClose: () => void;
  onSaveProfile: (updatedUser: User) => Promise<void> | void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSaveProfile,
}) => {
  if (!isOpen || !currentUser) return null;

  const [name, setName] = useState<string>(currentUser.name);
  const [password, setPassword] = useState<string>(currentUser.password || 'password123');
  const [avatar, setAvatar] = useState<string>(currentUser.avatar || '');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Compress and set uploaded image
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMsg({ type: 'error', text: 'Pilih file gambar berformat JPG, PNG, atau WEBP.' });
      return;
    }

    setIsCompressing(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatar(compressedDataUrl);
          setIsCompressing(false);
          setStatusMsg({ type: 'success', text: 'Foto profil baru berhasil dimuat!' });
        }
      };
      img.onerror = () => {
        setIsCompressing(false);
        setStatusMsg({ type: 'error', text: 'Gagal memproses gambar.' });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleResetAvatar = () => {
    // Default avatar placeholder based on gender/name
    const defaultPlaceholder = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name || currentUser.name
    )}&background=4338ca&color=fff&size=200&bold=true`;
    setAvatar(defaultPlaceholder);
    setStatusMsg({ type: 'success', text: 'Foto profil dikembalikan ke inisial nama standar.' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMsg({ type: 'error', text: 'Nama lengkap tidak boleh kosong.' });
      return;
    }
    if (!password.trim() || password.length < 4) {
      setStatusMsg({ type: 'error', text: 'Kata sandi minimal terdiri dari 4 karakter.' });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    const updatedUser: User = {
      ...currentUser,
      name: name.trim(),
      password: password.trim(),
      avatar: avatar.trim() || currentUser.avatar,
    };

    try {
      await onSaveProfile(updatedUser);
      setIsSaving(false);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
      onClose();
    } catch (err) {
      console.error(err);
      setIsSaving(false);
      setStatusMsg({ type: 'error', text: 'Gagal menyimpan profil. Silakan coba lagi.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 sm:p-7 relative my-8 overflow-hidden">
        {/* Top Header Decor Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-700 via-amber-400 to-indigo-600"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          title="Tutup Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Pengaturan Akun
            </span>
            <span className="text-xs text-slate-400">• SMAN 2 Samarinda</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Edit Profil Pengguna
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Perbarui nama lengkap, kata sandi, dan foto profil akun Anda. Perubahan akan tersimpan permanen di Cloud Firestore.
          </p>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`mb-5 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* FOTO PROFIL SECTION */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-4">
            {/* Avatar Preview */}
            <div className="relative group shrink-0">
              <img
                src={
                  avatar ||
                  currentUser.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || currentUser.name)}&background=4338ca&color=fff&size=200`
                }
                alt="Foto Profil"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md ring-2 ring-indigo-200"
              />
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center cursor-pointer shadow-md transition-colors"
                title="Unggah Foto Profil Baru"
              >
                <Camera className="w-3.5 h-3.5" />
              </label>
            </div>

            {/* Photo Action Controls */}
            <div className="space-y-2 text-center sm:text-left flex-1">
              <div>
                <label
                  htmlFor="avatar-upload"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 font-bold text-xs cursor-pointer shadow-2xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isCompressing ? 'Mengompres...' : 'Unggah Foto Baru'}</span>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  disabled={isCompressing}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={handleResetAvatar}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Gunakan Inisial Standar
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Pilih foto dari kamera atau galeri perangkat (JPG/PNG, otomatis dioptimalkan).
              </p>
            </div>
          </div>

          {/* NAMA LENGKAP */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap Anda..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-bold text-slate-900 outline-none"
              />
            </div>
          </div>

          {/* KATA SANDI (PASSWORD) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kata Sandi (Password) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi baru..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-semibold text-slate-900 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Kata sandi ini digunakan untuk masuk kembali ke akun SI-LITERASI Anda.
            </p>
          </div>

          {/* INFORMASI DATA AKUN (READ ONLY) */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Username Masuk:</span>
              <span className="font-mono font-bold text-slate-800">@{currentUser.username}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Peran Pengguna:</span>
              <span className="font-bold text-slate-800 capitalize flex items-center gap-1">
                {currentUser.role === 'siswa' && <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />}
                {currentUser.role === 'guru' && <UserCheck className="w-3.5 h-3.5 text-indigo-600" />}
                {currentUser.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />}
                <span>{currentUser.role}</span>
              </span>
            </div>

            {currentUser.role === 'siswa' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">NISN:</span>
                  <span className="font-mono font-bold text-slate-800">{currentUser.nisn || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Rombel / Kelas:</span>
                  <span className="font-bold text-slate-800">
                    {currentUser.rombel || `Kelas ${currentUser.kelas}`}
                  </span>
                </div>
              </>
            )}

            {currentUser.role === 'guru' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">NIP:</span>
                <span className="font-mono font-bold text-slate-800">{currentUser.nip || '-'}</span>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || isCompressing}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan Profil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
