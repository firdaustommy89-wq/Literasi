import * as XLSX from 'xlsx';
import { LiteracyEntry, User } from '../types';
import { getAllTop3 } from './leaderboard';

export function exportLiteracyToExcel(entries: LiteracyEntry[], users: User[]): void {
  // 1. Data Sheet: Rekap Detail Jurnal Literasi
  const dataRows = entries.map((e, idx) => ({
    'No': idx + 1,
    'Tanggal': e.date,
    'NISN': e.studentNisn,
    'Nama Siswa': e.studentName,
    'Tingkat Kelas': `Kelas ${e.studentKelas}`,
    'Rombel': e.studentRombel,
    'Jenis Literasi': e.literacyType,
    'Kategori Bacaan': e.readingCategory,
    'Judul Buku / Teks': e.bookTitle,
    'Halaman / Ayat': e.pagesRead,
    'Durasi (Menit)': e.durationMinutes,
    'Diskusi Teman': e.peerDiscussion ? `Ya (${e.peerDiscussionNotes || '-'})` : 'Tidak',
    'Ringkasan': e.summary,
    'Nilai Moral': e.moralValue,
    'Refleksi Diri (Max 20)': e.reflection?.totalScore ?? 0,
    'P1 (Pemahaman)': e.reflection?.q1 ?? 0,
    'P2 (Hikmah/Kebaikan)': e.reflection?.q2 ?? 0,
    'P3 (Dorongan Diri)': e.reflection?.q3 ?? 0,
    'P4 (Kesadaran/Ikhlas)': e.reflection?.q4 ?? 0,
    'Validasi Guru (Max 80)': e.teacherValidation?.validationScore ?? 'Belum Dinilai',
    'Total Nilai (Max 100)': e.totalFinalScore ?? 'Menunggu Validasi',
    'Status Validasi': e.teacherValidation ? 'Tervalidasi' : 'Menunggu Guru',
    'Guru Penilai': e.teacherValidation?.teacherName ?? '-',
    'Catatan Guru': e.teacherValidation?.feedbackNotes ?? '-',
  }));

  const worksheetData = XLSX.utils.json_to_sheet(dataRows);

  // Auto-width columns
  const colWidths = [
    { wch: 5 }, // No
    { wch: 12 }, // Tanggal
    { wch: 14 }, // NISN
    { wch: 24 }, // Nama Siswa
    { wch: 12 }, // Tingkat Kelas
    { wch: 14 }, // Rombel
    { wch: 15 }, // Jenis Literasi
    { wch: 22 }, // Kategori Bacaan
    { wch: 28 }, // Judul
    { wch: 18 }, // Halaman
    { wch: 14 }, // Durasi
    { wch: 16 }, // Diskusi
    { wch: 40 }, // Ringkasan
    { wch: 35 }, // Nilai Moral
    { wch: 15 }, // Refleksi Diri
    { wch: 10 }, // P1
    { wch: 10 }, // P2
    { wch: 10 }, // P3
    { wch: 10 }, // P4
    { wch: 18 }, // Validasi Guru
    { wch: 18 }, // Total Nilai
    { wch: 16 }, // Status
    { wch: 24 }, // Guru
    { wch: 35 }, // Catatan
  ];
  worksheetData['!cols'] = colWidths;

  // 2. Data Sheet: Peringkat 3 Teratas (Kelas 10, 11, 12)
  const top3 = getAllTop3(entries, users);
  const rankingRows: Array<Record<string, string | number>> = [];

  (['10', '11', '12'] as const).forEach((grade) => {
    const list = top3[grade];
    list.forEach((stat, idx) => {
      rankingRows.push({
        'Jenjang': `Kelas ${grade}`,
        'Peringkat': `Juara ${idx + 1} ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}`,
        'NISN': stat.studentNisn,
        'Nama Siswa': stat.studentName,
        'Kelas / Rombel': stat.rombel,
        'Jumlah Jurnal': stat.totalEntries,
        'Jurnal Tervalidasi': stat.totalValidatedEntries,
        'Total Menit Membaca': stat.totalMinutesRead,
        'Rata-rata Nilai (dari 100)': stat.avgTotalScore,
        'Nilai Tertinggi': stat.highestScore,
      });
    });
  });

  const worksheetRanking = XLSX.utils.json_to_sheet(rankingRows);
  worksheetRanking['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 25 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 16 },
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheetData, 'Rekap Detail Literasi');
  XLSX.utils.book_append_sheet(workbook, worksheetRanking, 'Top 3 Per Jenjang');

  // Trigger download
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Rekap_Nilai_Literasi_Siswa_${dateStr}.xlsx`);
}
