import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  BookOpen, 
  UserCheck, 
  ShieldCheck, 
  FileSpreadsheet, 
  CheckCircle2, 
  Calendar, 
  Award, 
  Sparkles,
  ChevronDown,
  Info,
  ExternalLink
} from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: string;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'siswa',
}) => {
  const [activeTab, setActiveTab] = useState<'siswa' | 'guru' | 'admin' | 'faq'>(() => {
    if (defaultRole === 'admin') return 'admin';
    if (defaultRole === 'guru') return 'guru';
    return 'siswa';
  });

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'Bagaimana jika saya lupa kata sandi akun saya?',
      a: 'Bagi siswa, Anda dapat menghubungi Guru Pembimbing Literasi atau Administrator Sekolah untuk mereset kata sandi Anda menjadi kata sandi default atau kata sandi baru melalui menu Kelola Pengguna.',
    },
    {
      q: 'Berapa frekuensi minimal pengisian jurnal membaca?',
      a: 'Siswa diharapkan mengisi minimal 1 catatan jurnal pada setiap minggu (Minggu ke-1 sampai Minggu ke-4) setiap bulannya sesuai jadwal literasi sekolah.',
    },
    {
      q: 'Apakah saya bisa membaca buku digital / e-book?',
      a: 'Ya, Anda dapat membaca buku cetak, e-book resmi (seperti iPusnas atau perpustakaan digital sekolah), novel, buku non-fiksi ilmiah, biografi, maupun artikel edukatif berbobot.',
    },
    {
      q: 'Kapan nilai literasi saya masuk ke dalam rapor sekolah?',
      a: 'Setelah guru memvalidasi jurnal mingguan dan menekan tombol Verifikasi Bulanan, akumulasi skor literasi akan tercatat dan dapat dicetak ke dalam format rapor resmi.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Pusat Bantuan & Panduan Aplikasi</h3>
              <p className="text-xs text-blue-200 mt-0.5">Petunjuk penggunaan SI-LITERASI SMAN 2 Samarinda</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/15 text-blue-100 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('siswa')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'siswa'
                ? 'border-blue-600 text-blue-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Panduan Siswa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guru')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'guru'
                ? 'border-blue-600 text-blue-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Panduan Guru</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'admin'
                ? 'border-blue-600 text-blue-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Panduan Admin</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'faq'
                ? 'border-blue-600 text-blue-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>FAQ & Bantuan</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm leading-relaxed">
          {activeTab === 'siswa' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 dark:text-blue-200">
                  <p className="font-bold">Ketentuan Pengisian Jurnal Literasi Siswa:</p>
                  <p className="mt-1">
                    Isi jurnal secara konsisten setiap minggu. Refleksi dan nilai moral yang Anda tuliskan akan dinilai langsung oleh Guru Penilai berdasarkan rubrik literasi sekolah.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs inline-flex items-center justify-center mb-2">1</span>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Pilih Menu "Isi Jurnal Baru"</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Masukkan judul buku, kategori bacaan (Fiksi/Non-Fiksi/Sains/dll), jumlah halaman, serta durasi membaca.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs inline-flex items-center justify-center mb-2">2</span>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Tuliskan Refleksi & Nilai Moral</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Uraikan intisari bacaan dan pesan moral dengan kata-kata sendiri. Tambahkan catatan jika Anda berdiskusi bersama teman.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs inline-flex items-center justify-center mb-2">3</span>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Unggah Foto Bacaan (Opsional)</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Sertakan foto cover buku atau foto aktivitas membaca Anda sebagai bukti portofolio literasi.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs inline-flex items-center justify-center mb-2">4</span>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Pantau Riwayat & Nilai</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Cek skor dan umpan balik dari guru di menu "Jurnal Saya". Notifikasi akan muncul secara real-time saat jurnal dinilai.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guru' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200">
                <p className="font-bold">Alur Kerja Guru Penilai:</p>
                <p className="mt-1">
                  Guru bertugas memvalidasi isian jurnal siswa per rombel, memberikan skor berdasarkan 4 aspek rubrik, serta memverifikasi rekapitulasi 4 minggu di akhir bulan.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Pencarian Cepat & Filter Rombel</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Gunakan kolom pencarian di laman validasi atau tombol filter rombel untuk meninjau siswa pada kelas yang Anda bimbing secara cepat tanpa perlu scroll manual.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Rubrik Penilaian 4 Aspek (Skor 0-100)</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Aspek dinilai meliputi: Kualitas Ringkasan (30%), Kedalaman Nilai Moral (30%), Refleksi Diri (25%), dan Ketepatan Waktu / Kerapian (15%). Berikan catatan feedback untuk menyemangati siswa.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>Verifikasi Bulanan & Export Rapor</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Setelah 4 minggu terpenuhi, lakukan verifikasi bulanan. Anda dapat mengunduh seluruh data dalam format Excel (.xlsx) atau mencetak rapor resmi.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-950 dark:text-amber-200">
                <p className="font-bold">Fungsi Administrator Sekolah:</p>
                <p className="mt-1">
                  Admin mengendalikan data master rombel (tambah, edit, hapus), akun siswa dan guru, pengaturan profil kepala sekolah & koordinator, serta kenaikan tahun ajaran.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Kelola Data Rombel (CRUD Rombel)</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Tambah rombel baru, edit nama rombel (perubahan otomatis diselaraskan ke seluruh siswa), atau hapus rombel kosong dengan cepat di tab Rombel Kelas.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>Kenaikan Tahun Ajaran & Promosi Kelas</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Gunakan fitur Kenaikan Kelas pada pergantian tahun ajaran. Sistem akan otomatis mempromosikan siswa kelas 10 ke 11, kelas 11 ke 12, dan menandai kelas 12 sebagai alumni.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Sinkronisasi Otomatis Cloud Firestore</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Setiap perubahan tersimpan otomatis di database Google Cloud Firestore dan disinkronkan ke seluruh browser dan perangkat yang digunakan guru maupun siswa.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isExpanded = expandedFaq === index;
                return (
                  <div
                    key={index}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isExpanded ? null : index)}
                      className="w-full text-left p-4 bg-slate-50/80 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {faq.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isExpanded ? 'rotate-180 text-blue-600' : ''
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="p-4 bg-white dark:bg-slate-900/80 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Butuh bantuan lebih lanjut? Hubungi admin literasi SMAN 2 Samarinda.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-interaction px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-sm"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
