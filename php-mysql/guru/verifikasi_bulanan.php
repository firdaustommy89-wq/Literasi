<?php
// /php-mysql/guru/verifikasi_bulanan.php
require_once __DIR__ . '/../auth/session_check.php';
require_once __DIR__ . '/../config/database.php';

requireRole(['guru', 'admin']);
$currentUser = getCurrentUser();
$db = getDBConnection();

$successMsg = '';
$errorMsg = '';

// Filter setup
$selectedTahun = $_GET['tahun_ajaran'] ?? '2024/2025';
$selectedBulan = (int)($_GET['bulan'] ?? date('n'));
$selectedKelas = $_GET['kelas'] ?? ($currentUser['role'] === 'guru' ? $currentUser['kelas'] : 'VII-A');

$daftarKelas = ['VII-A', 'VII-B', 'VII-C', 'VIII-A', 'VIII-B', 'VIII-C', 'IX-A', 'IX-B', 'IX-C'];
$namaBulanList = [
    1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
    5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
    9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
];

// Handle Final Verification Submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'simpan_verifikasi_bulanan') {
    $siswaId = (int)($_POST['siswa_id'] ?? 0);
    $skorM1 = filter_var($_POST['skor_m1'] ?? null, FILTER_VALIDATE_FLOAT);
    $skorM2 = filter_var($_POST['skor_m2'] ?? null, FILTER_VALIDATE_FLOAT);
    $skorM3 = filter_var($_POST['skor_m3'] ?? null, FILTER_VALIDATE_FLOAT);
    $skorM4 = filter_var($_POST['skor_m4'] ?? null, FILTER_VALIDATE_FLOAT);
    $catatan = trim($_POST['catatan_pembina'] ?? '');

    // Validasi range nilai mingguan jika ada
    $allScores = [$skorM1, $skorM2, $skorM3, $skorM4];
    $hasInvalid = false;
    foreach ($allScores as $sc) {
        if ($sc !== null && ($sc < 0 || $sc > 100)) {
            $hasInvalid = true;
            break;
        }
    }

    if ($hasInvalid) {
        $errorMsg = "Gagal: Setiap nilai mingguan harus berada di rentang 0 s.d. 100!";
    } elseif ($siswaId <= 0) {
        $errorMsg = "Gagal: ID Siswa tidak valid.";
    } else {
        // Hitung rumus: (M1 + M2 + M3 + M4) ÷ 4
        $valM1 = $skorM1 !== null && $skorM1 !== false ? $skorM1 : 0.0;
        $valM2 = $skorM2 !== null && $skorM2 !== false ? $skorM2 : 0.0;
        $valM3 = $skorM3 !== null && $skorM3 !== false ? $skorM3 : 0.0;
        $valM4 = $skorM4 !== null && $skorM4 !== false ? $skorM4 : 0.0;

        $akumulasi = round(($valM1 + $valM2 + $valM3 + $valM4) / 4.0, 2);

        // Validasi akumulasi tidak melebihi 100
        if ($akumulasi < 0 || $akumulasi > 100) {
            $errorMsg = "Gagal: Nilai akumulasi ({$akumulasi}) tidak valid (harus 0 - 100).";
        } else {
            $predikat = getPredicateFromScore($akumulasi);

            // Upsert ke database monthly_verifications
            $stmtCheck = $db->prepare("
                SELECT id FROM monthly_verifications 
                WHERE user_id = ? AND tahun_ajaran = ? AND bulan = ?
            ");
            $stmtCheck->execute([$siswaId, $selectedTahun, $selectedBulan]);
            $existing = $stmtCheck->fetch();

            if ($existing) {
                $stmtUpdate = $db->prepare("
                    UPDATE monthly_verifications 
                    SET skor_m1 = ?, skor_m2 = ?, skor_m3 = ?, skor_m4 = ?,
                        skor_akumulasi = ?, predikat = ?, catatan_pembina = ?,
                        status = 'verified', verified_by = ?, verified_at = NOW()
                    WHERE id = ?
                ");
                $stmtUpdate->execute([$valM1, $valM2, $valM3, $valM4, $akumulasi, $predikat, $catatan, $currentUser['id'], $existing['id']]);
            } else {
                $stmtInsert = $db->prepare("
                    INSERT INTO monthly_verifications 
                    (user_id, bulan, tahun_ajaran, skor_m1, skor_m2, skor_m3, skor_m4, skor_akumulasi, predikat, catatan_pembina, status, verified_by, verified_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, NOW())
                ");
                $stmtInsert->execute([$siswaId, $selectedBulan, $selectedTahun, $valM1, $valM2, $valM3, $valM4, $akumulasi, $predikat, $catatan, $currentUser['id']]);
            }

            $successMsg = "Berhasil memverifikasi nilai bulanan! Nilai Akumulasi: {$akumulasi} (Predikat: {$predikat}).";
        }
    }
}

// Ambil seluruh siswa di kelas yang dipilih beserta jurnal 4 minggu dan data verifikasi
$stmtSiswa = $db->prepare("
    SELECT u.id, u.name, u.nisn, u.kelas
    FROM users u 
    WHERE u.role = 'siswa' AND u.kelas = ?
    ORDER BY u.name ASC
");
$stmtSiswa->execute([$selectedKelas]);
$daftarSiswa = $stmtSiswa->fetchAll();

// Persiapkan data skor M1, M2, M3, M4 untuk setiap siswa
$rekapSiswa = [];

foreach ($daftarSiswa as $siswa) {
    $sid = $siswa['id'];

    // Ambil nilai mingguan dari teacher_validations + literacy_entries
    $stmtMinggu = $db->prepare("
        SELECT e.minggu_ke, COALESCE(v.total_nilai, e.skor_mandiri, 0) AS nilai_final, v.id AS val_id
        FROM literacy_entries e
        LEFT JOIN teacher_validations v ON e.id = v.entry_id
        WHERE e.user_id = ? AND e.tahun_ajaran = ? AND e.bulan = ?
    ");
    $stmtMinggu->execute([$sid, $selectedTahun, $selectedBulan]);
    $mingguRows = $stmtMinggu->fetchAll();

    $skorMap = [1 => null, 2 => null, 3 => null, 4 => null];
    $validatedMap = [1 => false, 2 => false, 3 => false, 4 => false];

    foreach ($mingguRows as $row) {
        $m = (int)$row['minggu_ke'];
        if ($m >= 1 && $m <= 4) {
            $skorMap[$m] = (float)$row['nilai_final'];
            $validatedMap[$m] = !empty($row['val_id']);
        }
    }

    // Ambil data verifikasi bulanan yang sudah tersimpan jika ada
    $stmtVerif = $db->prepare("
        SELECT * FROM monthly_verifications
        WHERE user_id = ? AND tahun_ajaran = ? AND bulan = ?
    ");
    $stmtVerif->execute([$sid, $selectedTahun, $selectedBulan]);
    $verifData = $stmtVerif->fetch();

    // Hitung otomatis (M1 + M2 + M3 + M4) / 4
    $m1 = $verifData ? (float)$verifData['skor_m1'] : ($skorMap[1] ?? 0.0);
    $m2 = $verifData ? (float)$verifData['skor_m2'] : ($skorMap[2] ?? 0.0);
    $m3 = $verifData ? (float)$verifData['skor_m3'] : ($skorMap[3] ?? 0.0);
    $m4 = $verifData ? (float)$verifData['skor_m4'] : ($skorMap[4] ?? 0.0);

    $nilaiAkumulasi = round(($m1 + $m2 + $m3 + $m4) / 4.0, 2);
    $predikat = getPredicateFromScore($nilaiAkumulasi);

    $rekapSiswa[] = [
        'id' => $sid,
        'nama' => $siswa['name'],
        'nisn' => $siswa['nisn'],
        'kelas' => $siswa['kelas'],
        'm1' => $m1,
        'm2' => $m2,
        'm3' => $m3,
        'm4' => $m4,
        'has_m1' => $skorMap[1] !== null,
        'has_m2' => $skorMap[2] !== null,
        'has_m3' => $skorMap[3] !== null,
        'has_m4' => $skorMap[4] !== null,
        'akumulasi' => $nilaiAkumulasi,
        'predikat' => $predikat,
        'status' => $verifData['status'] ?? 'pending',
        'catatan' => $verifData['catatan_pembina'] ?? '',
        'verified_at' => $verifData['verified_at'] ?? null,
    ];
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifikasi Bulanan & Akumulasi - SiLiterasi</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">
    <!-- Navbar -->
    <header class="bg-indigo-900 text-white shadow-lg sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <span class="text-2xl">📊</span>
                <div>
                    <h1 class="font-bold text-lg leading-tight">SiLiterasi SMP</h1>
                    <p class="text-xs text-indigo-200">Verifikasi Bulanan & Rekap Nilai Otomatis</p>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class="text-right hidden sm:block">
                    <p class="text-sm font-semibold"><?= htmlspecialchars($currentUser['name']) ?></p>
                    <p class="text-xs text-indigo-300">Wali Kelas: <?= htmlspecialchars($currentUser['kelas']) ?></p>
                </div>
                <a href="../auth/logout.php" class="bg-indigo-800 hover:bg-rose-600 text-xs px-3 py-1.5 rounded-lg font-medium transition">Keluar</a>
            </div>
        </div>
    </header>

    <!-- Sub Navigation -->
    <div class="bg-white border-b border-slate-200 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-6 overflow-x-auto text-sm font-medium">
            <a href="validasi_mingguan.php" class="py-3 text-slate-500 hover:text-indigo-600 whitespace-nowrap">
                ✍️ Validasi Mingguan (Skor 0-80)
            </a>
            <a href="verifikasi_bulanan.php" class="py-3 border-b-2 border-indigo-600 text-indigo-600 whitespace-nowrap">
                📊 Verifikasi Bulanan & Predikat
            </a>
            <?php if ($currentUser['role'] === 'admin'): ?>
                <a href="../admin/dashboard.php" class="py-3 text-slate-500 hover:text-indigo-600 whitespace-nowrap">
                    ⚙️ Panel Admin
                </a>
            <?php endif; ?>
        </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <!-- Notification Alert -->
        <?php if ($successMsg): ?>
            <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-3 shadow-sm">
                <span class="text-xl">✅</span>
                <p class="text-sm font-medium"><?= htmlspecialchars($successMsg) ?></p>
            </div>
        <?php endif; ?>

        <?php if ($errorMsg): ?>
            <div class="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-3 shadow-sm">
                <span class="text-xl">⚠️</span>
                <p class="text-sm font-medium"><?= htmlspecialchars($errorMsg) ?></p>
            </div>
        <?php endif; ?>

        <!-- Filter Bar -->
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <form method="GET" class="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Tahun Ajaran</label>
                    <select name="tahun_ajaran" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="2024/2025" <?= $selectedTahun === '2024/2025' ? 'selected' : '' ?>>2024/2025</option>
                        <option value="2025/2026" <?= $selectedTahun === '2025/2026' ? 'selected' : '' ?>>2025/2026</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Rombel / Kelas</label>
                    <select name="kelas" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                        <?php foreach ($daftarKelas as $kls): ?>
                            <option value="<?= $kls ?>" <?= $selectedKelas === $kls ? 'selected' : '' ?>><?= $kls ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Bulan Penilaian</label>
                    <select name="bulan" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                        <?php foreach ($namaBulanList as $num => $nama): ?>
                            <option value="<?= $num ?>" <?= $selectedBulan === $num ? 'selected' : '' ?>><?= $nama ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="flex space-x-2">
                    <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition">
                        Tampilkan Rekap
                    </button>
                    <a href="../admin/ekspor_excel.php?kelas=<?= urlencode($selectedKelas) ?>&bulan=<?= $selectedBulan ?>&tahun_ajaran=<?= urlencode($selectedTahun) ?>" target="_blank" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center transition" title="Ekspor CSV/Excel">
                        📥 Excel
                    </a>
                </div>
            </form>
        </div>

        <!-- Rumus Banner -->
        <div class="bg-gradient-to-r from-indigo-700 to-purple-800 text-white p-5 rounded-2xl shadow-md">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <span class="text-xs uppercase font-extrabold tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                        Aturan Rumus Penilaian
                    </span>
                    <h2 class="text-xl font-extrabold mt-1">Rumus Akumulasi Akhir Bulan</h2>
                    <p class="text-xs text-indigo-100 mt-1">
                        Nilai Akumulasi Akhir Bulan dihitung otomatis dari rata-rata 4 minggu:
                    </p>
                    <div class="mt-2 bg-black/25 font-mono px-3 py-1.5 rounded-lg text-xs sm:text-sm text-yellow-300 inline-block font-bold">
                        Nilai Akhir = (Minggu 1 + Minggu 2 + Minggu 3 + Minggu 4) ÷ 4
                    </div>
                </div>
                <div class="text-xs bg-white/10 p-3 rounded-xl border border-white/20 max-w-sm space-y-1">
                    <p class="font-bold">Konversi Predikat:</p>
                    <p>• <strong>86 - 100:</strong> Sangat Baik (A)</p>
                    <p>• <strong>71 - 85:</strong> Baik (B)</p>
                    <p>• <strong>56 - 70:</strong> Cukup (C)</p>
                    <p>• <strong>0 - 55:</strong> Perlu Bimbingan (D)</p>
                </div>
            </div>
        </div>

        <!-- Tabel Rekap & Verifikasi -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h2 class="text-base font-bold text-slate-800">
                        Rekapitulasi Siswa Kelas <?= htmlspecialchars($selectedKelas) ?> (<?= $namaBulanList[$selectedBulan] ?> <?= htmlspecialchars($selectedTahun) ?>)
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">Jumlah Siswa: <?= count($rekapSiswa) ?> orang</p>
                </div>
            </div>

            <?php if (empty($rekapSiswa)): ?>
                <div class="p-12 text-center text-slate-400">
                    <span class="text-4xl">👥</span>
                    <p class="mt-2 text-sm font-medium">Tidak ada data siswa untuk kelas <?= htmlspecialchars($selectedKelas) ?>.</p>
                </div>
            <?php else: ?>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-slate-700">
                        <thead class="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200">
                            <tr>
                                <th class="p-4 w-12 text-center">No</th>
                                <th class="p-4">Nama Siswa / NISN</th>
                                <th class="p-4 text-center">M1</th>
                                <th class="p-4 text-center">M2</th>
                                <th class="p-4 text-center">M3</th>
                                <th class="p-4 text-center">M4</th>
                                <th class="p-4 text-center bg-indigo-50 text-indigo-900 font-extrabold">Akumulasi (÷ 4)</th>
                                <th class="p-4 text-center">Predikat</th>
                                <th class="p-4 text-center">Status</th>
                                <th class="p-4 text-center">Aksi / Verifikasi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php foreach ($rekapSiswa as $idx => $s): ?>
                                <tr class="hover:bg-slate-50 transition">
                                    <td class="p-4 text-center font-bold text-slate-400"><?= $idx + 1 ?></td>
                                    <td class="p-4">
                                        <p class="font-bold text-slate-900 text-sm"><?= htmlspecialchars($s['nama']) ?></p>
                                        <p class="text-[11px] text-slate-400 font-mono">NISN: <?= htmlspecialchars($s['nisn']) ?></p>
                                    </td>
                                    <td class="p-4 text-center font-semibold">
                                        <span class="<?= $s['has_m1'] ? 'text-slate-800' : 'text-slate-300' ?>">
                                            <?= number_format($s['m1'], 1) ?>
                                        </span>
                                    </td>
                                    <td class="p-4 text-center font-semibold">
                                        <span class="<?= $s['has_m2'] ? 'text-slate-800' : 'text-slate-300' ?>">
                                            <?= number_format($s['m2'], 1) ?>
                                        </span>
                                    </td>
                                    <td class="p-4 text-center font-semibold">
                                        <span class="<?= $s['has_m3'] ? 'text-slate-800' : 'text-slate-300' ?>">
                                            <?= number_format($s['m3'], 1) ?>
                                        </span>
                                    </td>
                                    <td class="p-4 text-center font-semibold">
                                        <span class="<?= $s['has_m4'] ? 'text-slate-800' : 'text-slate-300' ?>">
                                            <?= number_format($s['m4'], 1) ?>
                                        </span>
                                    </td>
                                    <td class="p-4 text-center bg-indigo-50/70 font-extrabold text-sm text-indigo-700">
                                        <?= number_format($s['akumulasi'], 2) ?>
                                    </td>
                                    <td class="p-4 text-center">
                                        <?php if ($s['akumulasi'] >= 86): ?>
                                            <span class="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[11px]">Sangat Baik</span>
                                        <?php elseif ($s['akumulasi'] >= 71): ?>
                                            <span class="px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 text-[11px]">Baik</span>
                                        <?php elseif ($s['akumulasi'] >= 56): ?>
                                            <span class="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[11px]">Cukup</span>
                                        <?php else: ?>
                                            <span class="px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 text-[11px]">Perlu Bimbingan</span>
                                        <?php endif; ?>
                                    </td>
                                    <td class="p-4 text-center">
                                        <?php if ($s['status'] === 'verified'): ?>
                                            <span class="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                                                ✓ Terverifikasi
                                            </span>
                                        <?php else: ?>
                                            <span class="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                                                Draft / Menunggu
                                            </span>
                                        <?php endif; ?>
                                    </td>
                                    <td class="p-4 text-center">
                                        <!-- Form Simpan / Kunci Verifikasi Bulanan -->
                                        <form method="POST" class="inline-block" onsubmit="return confirm('Kunci dan simpan verifikasi bulanan untuk <?= htmlspecialchars($s['nama']) ?> dengan nilai <?= $s['akumulasi'] ?>?')">
                                            <input type="hidden" name="action" value="simpan_verifikasi_bulanan">
                                            <input type="hidden" name="siswa_id" value="<?= $s['id'] ?>">
                                            <input type="hidden" name="skor_m1" value="<?= $s['m1'] ?>">
                                            <input type="hidden" name="skor_m2" value="<?= $s['m2'] ?>">
                                            <input type="hidden" name="skor_m3" value="<?= $s['m3'] ?>">
                                            <input type="hidden" name="skor_m4" value="<?= $s['m4'] ?>">
                                            <input type="hidden" name="catatan_pembina" value="<?= htmlspecialchars($s['catatan'] ?: 'Pertahankan konsistensi membaca.') ?>">
                                            
                                            <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition shadow-sm">
                                                <?= $s['status'] === 'verified' ? 'Perbarui Verifikasi' : 'Kunci Nilai' ?>
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </div>
    </main>
</body>
</html>
