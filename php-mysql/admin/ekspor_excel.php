<?php
// /php-mysql/admin/ekspor_excel.php
require_once __DIR__ . '/../auth/session_check.php';
require_once __DIR__ . '/../config/database.php';

requireRole(['guru', 'admin']);
$db = getDBConnection();

$selectedTahun = $_GET['tahun_ajaran'] ?? '2024/2025';
$selectedBulan = (int)($_GET['bulan'] ?? date('n'));
$selectedKelas = $_GET['kelas'] ?? 'VII-A';

$namaBulanList = [
    1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
    5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
    9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
];
$namaBulan = $namaBulanList[$selectedBulan] ?? "Bulan-{$selectedBulan}";

// Fetch all students in the selected class
$stmtSiswa = $db->prepare("
    SELECT u.id, u.name, u.nisn, u.kelas
    FROM users u 
    WHERE u.role = 'siswa' AND u.kelas = ?
    ORDER BY u.name ASC
");
$stmtSiswa->execute([$selectedKelas]);
$daftarSiswa = $stmtSiswa->fetchAll();

// Set HTTP headers for Excel/CSV download
$cleanYear = str_replace(['/', '\\'], '-', $selectedTahun);
$filename = "Rekap_Nilai_Literasi_{$selectedKelas}_{$namaBulan}_{$cleanYear}.csv";

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');

// Output UTF-8 BOM so Excel opens indonesian characters properly
echo "\xEF\xBB\xBF";

$output = fopen('php://output', 'w');

// Write metadata rows
fputcsv($output, ['REKAPITULASI NILAI LITERASI SISWA SMP']);
fputcsv($output, ['Kelas / Rombel', $selectedKelas]);
fputcsv($output, ['Bulan', $namaBulan]);
fputcsv($output, ['Tahun Ajaran', $selectedTahun]);
fputcsv($output, ['Rumus Penilaian', '(Nilai Minggu 1 + Nilai Minggu 2 + Nilai Minggu 3 + Nilai Minggu 4) / 4']);
fputcsv($output, []); // empty row

// Headers
fputcsv($output, [
    'No',
    'NISN',
    'Nama Siswa',
    'Kelas',
    'Nilai M1',
    'Nilai M2',
    'Nilai M3',
    'Nilai M4',
    'Nilai Akumulasi Akhir Bulan (÷ 4)',
    'Predikat',
    'Status Verifikasi',
    'Catatan Guru / Pembina'
]);

$no = 1;
foreach ($daftarSiswa as $siswa) {
    $sid = $siswa['id'];

    // Check monthly verifications first
    $stmtVerif = $db->prepare("
        SELECT * FROM monthly_verifications
        WHERE user_id = ? AND tahun_ajaran = ? AND bulan = ?
    ");
    $stmtVerif->execute([$sid, $selectedTahun, $selectedBulan]);
    $verif = $stmtVerif->fetch();

    if ($verif) {
        $m1 = (float)$verif['skor_m1'];
        $m2 = (float)$verif['skor_m2'];
        $m3 = (float)$verif['skor_m3'];
        $m4 = (float)$verif['skor_m4'];
        $akumulasi = (float)$verif['skor_akumulasi'];
        $predikat = $verif['predikat'];
        $status = $verif['status'] === 'verified' ? 'Terverifikasi' : 'Draft';
        $catatan = $verif['catatan_pembina'];
    } else {
        // Query raw journal validations
        $stmtEntries = $db->prepare("
            SELECT e.minggu_ke, COALESCE(v.total_nilai, e.skor_mandiri, 0) AS nilai
            FROM literacy_entries e
            LEFT JOIN teacher_validations v ON e.id = v.entry_id
            WHERE e.user_id = ? AND e.tahun_ajaran = ? AND e.bulan = ?
        ");
        $stmtEntries->execute([$sid, $selectedTahun, $selectedBulan]);
        $rows = $stmtEntries->fetchAll();

        $scores = [1 => 0.0, 2 => 0.0, 3 => 0.0, 4 => 0.0];
        foreach ($rows as $r) {
            $m = (int)$r['minggu_ke'];
            if ($m >= 1 && $m <= 4) {
                $scores[$m] = (float)$r['nilai'];
            }
        }

        $m1 = $scores[1];
        $m2 = $scores[2];
        $m3 = $scores[3];
        $m4 = $scores[4];
        $akumulasi = round(($m1 + $m2 + $m3 + $m4) / 4.0, 2);
        $predikat = getPredicateFromScore($akumulasi);
        $status = 'Draft';
        $catatan = '-';
    }

    fputcsv($output, [
        $no++,
        "'" . $siswa['nisn'], // force text in Excel
        $siswa['name'],
        $siswa['kelas'],
        number_format($m1, 1),
        number_format($m2, 1),
        number_format($m3, 1),
        number_format($m4, 1),
        number_format($akumulasi, 2),
        $predikat,
        $status,
        $catatan
    ]);
}

fclose($output);
exit;
