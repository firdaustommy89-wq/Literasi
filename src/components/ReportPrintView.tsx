import React, { useState } from 'react';
import { LiteracyEntry, User, JenjangKelas } from '../types';
import { getAllTop3 } from '../utils/leaderboard';
import { 
  Printer, 
  FileSpreadsheet, 
  X, 
  Award, 
  CheckCircle2, 
  Building2, 
  Calendar 
} from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';

interface ReportPrintViewProps {
  entries: LiteracyEntry[];
  users: User[];
  academicYear?: string;
  semester?: string;
  onClose: () => void;
  onExportExcel: () => void;
}

export const ReportPrintView: React.FC<ReportPrintViewProps> = ({
  entries,
  users,
  academicYear = '2026/2027',
  semester = 'Ganjil',
  onClose,
  onExportExcel,
}) => {
  const [filterGrade, setFilterGrade] = useState<string>('all');

  const top3 = getAllTop3(entries, users);

  const filteredEntries = entries.filter((e) => {
    if (filterGrade !== 'all' && e.studentKelas !== filterGrade) return false;
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  const currentDateFormatted = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
  }).format(new Date());

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs overflow-y-auto p-2 sm:p-6 flex flex-col items-center">
      {/* Floating Action Controls (no-print) */}
      <div className="sticky top-4 z-20 bg-slate-900 text-white rounded-2xl px-5 py-3 shadow-2xl flex items-center justify-between gap-4 max-w-4xl w-full mb-4 no-print border border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300">Filter Cetak:</span>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold border border-slate-700 outline-none"
          >
            <option value="all">Semua Jenjang (10, 11, 12)</option>
            <option value="10">Hanya Kelas 10</option>
            <option value="11">Hanya Kelas 11</option>
            <option value="12">Hanya Kelas 12</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Printable Sheet (Simulated A4 Paper) */}
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl p-8 sm:p-12 mb-12 print-card">
        {/* KOP SURAT RESMI */}
        <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 text-center">
          <div className="flex items-center justify-center gap-5 mb-2">
            <div className="w-16 h-20 flex items-center justify-center shrink-0">
              <SchoolLogo className="w-16 h-20" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-slate-700">
                PEMERINTAH PROVINSI KALIMANTAN TIMUR
              </h2>
              <h1 className="text-base sm:text-xl font-black uppercase text-slate-900 tracking-wide">
                DINAS PENDIDIKAN DAN KEBUDAYAAN • SMA NEGERI 2 SAMARINDA
              </h1>
              <p className="text-[11px] text-slate-600">
                Jl. K.H. Samanhudi No. 9, Pelabuhan, Kec. Samarinda Kota, Kota Samarinda, Kalimantan Timur • Telp: (0541) 741639
              </p>
            </div>
          </div>
        </div>

        {/* JUDUL LAPORAN */}
        <div className="text-center mb-6">
          <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 underline underline-offset-4">
            LAPORAN REKAPITULASI PENILAIAN LITERASI SISWA
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Program Gerakan Literasi Sekolah (GLS) • Semester {semester} TA {academicYear}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Dicetak pada: {currentDateFormatted}
          </p>
        </div>

        {/* BAGIAN 1: REKAPITULASI TOP 3 TIAP JENJANG KELAS 10, 11, 12 */}
        <div className="mb-8 print-break-inside-avoid">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              I. Peringkat 3 Teratas Siswa Literasi per Jenjang Kelas
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['10', '11', '12'] as JenjangKelas[]).map((grade) => {
              const list = top3[grade] || [];
              return (
                <div key={grade} className="border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                  <div className="text-xs font-black text-slate-900 border-b border-slate-200 pb-1.5 mb-2 flex items-center justify-between">
                    <span>Jenjang Kelas {grade}</span>
                    <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded font-bold">Top 3</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {list.map((item, idx) => (
                      <div key={item.studentId} className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1">
                        <div>
                          <div className="font-bold text-slate-800 line-clamp-1">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {item.studentName}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.rombel} • NISN: {item.studentNisn}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-slate-900 text-xs">{item.avgTotalScore}</span>
                          <span className="text-[9px] text-slate-400 block">/ 100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BAGIAN 2: TABEL RINCIAN JURNAL & VALIDASI */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              II. Rekapitulasi Rincian Penilaian Jurnal Literasi Siswa
            </h3>
            <span className="text-xs text-slate-500">Total: {filteredEntries.length} Jurnal</span>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded-xl">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 uppercase">
                  <th className="p-2 text-center w-8">No</th>
                  <th className="p-2">Tanggal</th>
                  <th className="p-2">NISN</th>
                  <th className="p-2">Nama Siswa</th>
                  <th className="p-2">Kelas</th>
                  <th className="p-2">Jenis / Judul</th>
                  <th className="p-2 text-center">Refleksi (20)</th>
                  <th className="p-2 text-center">Validasi Guru (80)</th>
                  <th className="p-2 text-center font-black">Total (100)</th>
                  <th className="p-2">Catatan Guru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEntries.map((e, idx) => {
                  const selfScore = e.reflection?.totalScore ?? 0;
                  const teacherScore = e.teacherValidation?.validationScore ?? '-';
                  const finalScore = e.totalFinalScore ?? '-';

                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-2 whitespace-nowrap">{e.date}</td>
                      <td className="p-2 font-mono text-[10px]">{e.studentNisn}</td>
                      <td className="p-2 font-bold text-slate-900">{e.studentName}</td>
                      <td className="p-2 whitespace-nowrap">{e.studentRombel}</td>
                      <td className="p-2 max-w-[150px]">
                        <div className="font-semibold text-slate-800 truncate" title={e.bookTitle}>
                          {e.bookTitle}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {e.literacyType} • {e.durationMinutes}m
                        </div>
                      </td>
                      <td className="p-2 text-center font-bold text-emerald-700 bg-emerald-50/50">
                        {selfScore}
                      </td>
                      <td className="p-2 text-center font-bold text-indigo-700 bg-indigo-50/50">
                        {teacherScore}
                      </td>
                      <td className="p-2 text-center font-black text-slate-900 bg-slate-100">
                        {finalScore}
                      </td>
                      <td className="p-2 text-[10px] text-slate-600 max-w-[140px] truncate" title={e.teacherValidation?.feedbackNotes || '-'}>
                        {e.teacherValidation?.feedbackNotes || 'Menunggu validasi'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* BAGIAN 3: LEMBAR PENGESAHAN TANDA TANGAN RESMI */}
        <div className="pt-6 border-t border-slate-200 print-break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="text-slate-500 mb-1">Mengetahui,</p>
              <p className="font-bold text-slate-900">Koordinator Pembina Literasi</p>
              <div className="h-16"></div>
              <p className="font-black text-slate-900 underline underline-offset-2">
                Hendra Wijaya, M.Pd
              </p>
              <p className="text-[10px] text-slate-500">NIP. 198504122010011008</p>
            </div>

            <div>
              <p className="text-slate-500 mb-1">Jakarta, {currentDateFormatted}</p>
              <p className="font-bold text-slate-900">Kepala SMAN 1 Bina Literasi</p>
              <div className="h-16"></div>
              <p className="font-black text-slate-900 underline underline-offset-2">
                Drs. H. Mulyadi, M.Pd
              </p>
              <p className="text-[10px] text-slate-500">NIP. 197508101999031004</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
