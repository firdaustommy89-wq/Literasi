import React, { useState, useEffect } from 'react';
import { SchoolProfileSettings, DEFAULT_SCHOOL_PROFILE } from '../types';
import confetti from 'canvas-confetti';
import { 
  X, 
  Building2, 
  UserCheck, 
  Award, 
  CheckCircle2, 
  Save, 
  RotateCcw, 
  FileText, 
  Sparkles, 
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  GraduationCap
} from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';

interface SchoolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: SchoolProfileSettings;
  onSaveProfile: (updated: SchoolProfileSettings) => Promise<void> | void;
}

export const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
}) => {
  const [formData, setFormData] = useState<SchoolProfileSettings>(currentProfile);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync when prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(currentProfile);
      setSaveSuccess(false);
    }
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  const handleChange = (field: keyof SchoolProfileSettings, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleResetDefault = () => {
    if (confirm('Kembalikan data pengaturan sekolah, kepala sekolah, dan koordinator guru penilai ke pengaturan awal (default)?')) {
      setFormData(DEFAULT_SCHOOL_PROFILE);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaSekolah.trim()) {
      alert('Nama Sekolah tidak boleh kosong.');
      return;
    }
    if (!formData.namaKepalaSekolah.trim()) {
      alert('Nama Kepala Sekolah tidak boleh kosong.');
      return;
    }
    if (!formData.namaKoordinatorLiterasi.trim()) {
      alert('Nama Koordinator Guru Penilai Literasi tidak boleh kosong.');
      return;
    }

    try {
      setIsSaving(true);
      await onSaveProfile(formData);
      setSaveSuccess(true);
      try {
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to save school settings:', err);
      alert('Terjadi kesalahan saat menyimpan pengaturan sekolah ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header (Blue & Amber Institutional) */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0 border-b border-blue-600/50">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-md">
              <Building2 className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Pengaturan Profil Sekolah & Pejabat
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-blue-950 uppercase">
                  Admin Otoritas
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                Konfigurasi Nama Sekolah, Kepala Sekolah, dan Koordinator Guru Penilai Literasi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-4 py-2 text-xs font-black rounded-t-xl transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
                activeTab === 'form'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Formulir Pengaturan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-xs font-black rounded-t-xl transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-500" />
              <span>Pratinjau Kop & Tanda Tangan Laporan</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetDefault}
            className="text-[11px] font-bold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1.5 transition-colors pb-2 cursor-pointer"
            title="Kembalikan nilai ke default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {saveSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs sm:text-sm font-bold">
                Pengaturan nama sekolah, kepala sekolah, dan koordinator guru penilai literasi berhasil disimpan ke Cloud Firestore dan diperbarui di semua perangkat!
              </div>
            </div>
          )}

          {activeTab === 'form' ? (
            <form id="school-settings-form" onSubmit={handleSubmit} className="space-y-6">
              {/* BAGIAN 1: IDENTITAS SEKOLAH */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      1. Identitas Satuan Pendidikan (Sekolah)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Nama resmi sekolah yang tercantum pada sistem, kop surat, dan laporan evaluasi
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Resmi Sekolah <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.namaSekolah}
                      onChange={(e) => handleChange('namaSekolah', e.target.value)}
                      placeholder="Contoh: SMA Negeri 2 Samarinda"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nomor Pokok Sekolah Nasional (NPSN)
                    </label>
                    <input
                      type="text"
                      value={formData.npsn || ''}
                      onChange={(e) => handleChange('npsn', e.target.value)}
                      placeholder="Contoh: 30401234"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Kota / Kabupaten Penerbitan Laporan
                    </label>
                    <input
                      type="text"
                      value={formData.kotaPenerbitan || ''}
                      onChange={(e) => handleChange('kotaPenerbitan', e.target.value)}
                      placeholder="Contoh: Samarinda"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Alamat Lengkap Sekolah (Kop Surat)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.alamatSekolah || ''}
                      onChange={(e) => handleChange('alamatSekolah', e.target.value)}
                      placeholder="Contoh: Jl. K.H. Samanhudi No. 9, Pelabuhan, Kec. Samarinda Kota, Kota Samarinda, Kalimantan Timur"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Telepon / Kontak Sekolah
                    </label>
                    <input
                      type="text"
                      value={formData.teleponSekolah || ''}
                      onChange={(e) => handleChange('teleponSekolah', e.target.value)}
                      placeholder="Contoh: (0541) 741639"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email Resmi Sekolah
                    </label>
                    <input
                      type="email"
                      value={formData.emailSekolah || ''}
                      onChange={(e) => handleChange('emailSekolah', e.target.value)}
                      placeholder="Contoh: info@sman2samarinda.sch.id"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Instansi Pembina (Dinas Pendidikan)
                    </label>
                    <input
                      type="text"
                      value={formData.dinasPendidikan || ''}
                      onChange={(e) => handleChange('dinasPendidikan', e.target.value)}
                      placeholder="Contoh: DINAS PENDIDIKAN DAN KEBUDAYAAN"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pemerintah Provinsi / Daerah
                    </label>
                    <input
                      type="text"
                      value={formData.pemerintahProvinsi || ''}
                      onChange={(e) => handleChange('pemerintahProvinsi', e.target.value)}
                      placeholder="Contoh: PEMERINTAH PROVINSI KALIMANTAN TIMUR"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* BAGIAN 2: KEPALA SEKOLAH */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <Award className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      2. Kepala Sekolah (Penanggung Jawab Utama)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pejabat penandatangan lembar pengesahan laporan rekapitulasi penilaian literasi
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Lengkap & Gelar Kepala Sekolah <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.namaKepalaSekolah}
                      onChange={(e) => handleChange('namaKepalaSekolah', e.target.value)}
                      placeholder="Contoh: Drs. H. Mulyadi, M.Pd"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      NIP Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      value={formData.nipKepalaSekolah || ''}
                      onChange={(e) => handleChange('nipKepalaSekolah', e.target.value)}
                      placeholder="Contoh: 197508101999031004"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs sm:text-sm font-mono font-semibold outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* BAGIAN 3: KOORDINATOR GURU PENILAI LITERASI */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      3. Koordinator Guru Penilai Literasi
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Guru koordinator penilai dan pembina gerakan literasi sekolah pada dokumen resmi
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Lengkap & Gelar Koordinator Guru <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.namaKoordinatorLiterasi}
                      onChange={(e) => handleChange('namaKoordinatorLiterasi', e.target.value)}
                      placeholder="Contoh: Hendra Wijaya, M.Pd"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      NIP Koordinator Guru
                    </label>
                    <input
                      type="text"
                      value={formData.nipKoordinatorLiterasi || ''}
                      onChange={(e) => handleChange('nipKoordinatorLiterasi', e.target.value)}
                      placeholder="Contoh: 198504122010011008"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs sm:text-sm font-mono font-semibold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Sebutan Jabatan Resmi
                    </label>
                    <input
                      type="text"
                      value={formData.jabatanKoordinator || ''}
                      onChange={(e) => handleChange('jabatanKoordinator', e.target.value)}
                      placeholder="Contoh: Koordinator Guru Penilai Literasi / Pembina GLS"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* PREVIEW TAB: LIVE SIMULATION OF OFFICIAL DOCUMENT HEADER & SIGNATURES */
            <div className="space-y-6">
              <div className="text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Berikut adalah pratinjau tampilan <strong>Kop Surat</strong> dan <strong>Lembar Pengesahan Tanda Tangan</strong> pada dokumen laporan hasil penilaian yang menggunakan konfigurasi saat ini:
                </span>
              </div>

              {/* Simulated Paper Document */}
              <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border-2 border-slate-300 shadow-lg space-y-6">
                {/* KOP SURAT */}
                <div className="border-b-4 border-double border-slate-900 pb-3 text-center">
                  <div className="flex items-center justify-center gap-4 mb-2">
                    <div className="w-14 h-16 flex items-center justify-center shrink-0">
                      <SchoolLogo className="w-14 h-16" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold tracking-widest uppercase text-slate-700">
                        {formData.pemerintahProvinsi || 'PEMERINTAH DAERAH'}
                      </h4>
                      <h3 className="text-sm sm:text-base font-black uppercase text-slate-900 tracking-wide">
                        {formData.dinasPendidikan || 'DINAS PENDIDIKAN'} • {formData.namaSekolah || 'NAMA SEKOLAH'}
                      </h3>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {formData.alamatSekolah || 'Alamat Sekolah'} {formData.teleponSekolah ? `• Telp: ${formData.teleponSekolah}` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* JUDUL SAMPLE */}
                <div className="text-center py-2">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-900 underline underline-offset-4">
                    REKAPITULASI PENILAIAN LITERASI SISWA
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Tahun Ajaran 2026/2027 • Semester Ganjil
                  </div>
                </div>

                {/* SIGNATURE SECTION PREVIEW */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-6 text-center text-xs">
                    <div>
                      <p className="text-slate-500 mb-1">Mengetahui,</p>
                      <p className="font-bold text-slate-900">{formData.jabatanKoordinator || 'Koordinator Guru Penilai Literasi'}</p>
                      <div className="h-14 flex items-center justify-center text-slate-300 text-[10px] italic">
                        [Tanda Tangan & Cap]
                      </div>
                      <p className="font-black text-slate-900 underline underline-offset-2">
                        {formData.namaKoordinatorLiterasi || 'Nama Koordinator'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {formData.nipKoordinatorLiterasi ? `NIP. ${formData.nipKoordinatorLiterasi}` : '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 mb-1">
                        {formData.kotaPenerbitan || 'Samarinda'}, {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date())}
                      </p>
                      <p className="font-bold text-slate-900">Kepala {formData.namaSekolah || 'Sekolah'}</p>
                      <div className="h-14 flex items-center justify-center text-slate-300 text-[10px] italic">
                        [Tanda Tangan & Cap Resmi]
                      </div>
                      <p className="font-black text-slate-900 underline underline-offset-2">
                        {formData.namaKepalaSekolah || 'Nama Kepala Sekolah'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {formData.nipKepalaSekolah ? `NIP. ${formData.nipKepalaSekolah}` : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 flex-wrap gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Tersinkronisasi otomatis di Cloud Firestore</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={(e) => handleSubmit(e)}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-blue-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-md shadow-amber-400/20 ring-2 ring-amber-300/40 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-blue-950 border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan ke Cloud...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-blue-950" />
                  <span>Simpan Pengaturan</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
