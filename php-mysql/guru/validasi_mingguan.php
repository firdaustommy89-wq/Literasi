<?php
// /php-mysql/guru/validasi_mingguan.php
require_once __DIR__ . '/../auth/session_check.php';
require_once __DIR__ . '/../config/database.php';

requireRole(['guru', 'admin']);
$currentUser = getCurrentUser();
$db = getDBConnection();

$successMsg = '';
$errorMsg = '';

// Default filter values
$selectedTahun = $_GET['tahun_ajaran'] ?? '2024/2025';
$selectedBulan = (int)($_GET['bulan'] ?? date('n'));
$selectedMinggu = (int)($_GET['minggu'] ?? 1);
$selectedKelas = $_GET['kelas'] ?? ($currentUser['role'] === 'guru' ? $currentUser['kelas'] : 'VII-A');

// Handle Validation Form Submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'simpan_validasi') {
    $entryId = (int)($_POST['entry_id'] ?? 0);
    $skorGuru = filter_var($_POST['skor_guru'] ?? null, FILTER_VALIDATE_INT);
    $catatanGuru = trim($_POST['catatan_guru'] ?? '');

    // Validasi ketat: Rentang 0 - 80 untuk skor guru
    if ($skorGuru === false || $skorGuru < 0 || $skorGuru > 80) {
        $errorMsg = "Gagal menyimpan: Skor guru harus berupa angka bulat antara 0 hingga 80!";
    } elseif ($entryId <= 0) {
        $errorMsg = "Gagal: Jurnal siswa tidak valid.";
    } else {
        // Ambil data jurnal untuk menghitung total
        $stmtJurnal = $db->prepare("SELECT id, user_id, skor_mandiri FROM literacy_entries WHERE id = ?");
        $stmtJurnal->execute([$entryId]);
        $jurnal = $stmtJurnal->fetch();

        if (!$jurnal) {
            $errorMsg = "Jurnal siswa tidak ditemukan.";
        } else {
            $skorMandiri = (int)$jurnal['skor_mandiri'];
            $totalNilai = $skorMandiri + $skorGuru;

            // Validasi batas maksimal 100
            if ($totalNilai < 0 || $totalNilai > 100) {
                $errorMsg = "Gagal: Total nilai mingguan ({$totalNilai}) melebihi batas maksimum 100!";
            } else {
                // Upsert validasi guru
                $stmtCheck = $db->prepare("SELECT id FROM teacher_validations WHERE entry_id = ?");
                $stmtCheck->execute([$entryId]);
                $existing = $stmtCheck->fetch();

                if ($existing) {
                    $stmtUpdate = $db->prepare("
                        UPDATE teacher_validations 
                        SET skor_guru = ?, total_nilai = ?, catatan_guru = ?, validated_by = ?, validated_at = NOW()
                        WHERE id = ?
                    ");
                    $stmtUpdate->execute([$skorGuru, $totalNilai, $catatanGuru, $currentUser['id'], $existing['id']]);
                } else {
                    $stmtInsert = $db->prepare("
                        INSERT INTO teacher_validations (entry_id, validated_by, skor_guru, total_nilai, catatan_guru, validated_at)
                        VALUES (?, ?, ?, ?, ?, NOW())
                    ");
                    $stmtInsert->execute([$entryId, $currentUser['id'], $skorGuru, $totalNilai, $catatanGuru]);
                }

                $successMsg = "Validasi mingguan berhasil disimpan! Total nilai: {$totalNilai} (Refleksi: {$skorMandiri} + Guru: {$skorGuru}).";
            }
        }
    }
}

// Ambil daftar jurnal siswa yang perlu divalidasi sesuai filter
$sql = "
    SELECT 
        e.id AS entry_id,
        e.tanggal,
        e.minggu_ke,
        e.bulan,
        e.tahun_ajaran,
        e.judul_buku,
        e.penulis,
        e.halaman_dibaca,
        e.ringkasan,
        e.skor_mandiri,
        e.jawaban_p1,
        e.jawaban_p2,
        e.jawaban_p3,
        e.jawaban_p4,
        u.id AS user_id,
        u.name AS nama_siswa,
        u.nisn,
        u.kelas,
        v.id AS validation_id,
        v.skor_guru,
        v.total_nilai,
        v.catatan_guru,
        v.validated_at
    FROM literacy_entries e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN teacher_validations v ON e.id = v.entry_id
    WHERE e.tahun_ajaran = ? 
      AND e.bulan = ? 
      AND e.minggu_ke = ?
      AND u.kelas = ?
    ORDER BY u.name ASC, e.tanggal DESC
";
$stmtList = $db->prepare($sql);
$stmtList->execute([$selectedTahun, $selectedBulan, $selectedMinggu, $selectedKelas]);
$entries = $stmtList->fetchAll();

// Daftar kelas untuk dropdown filter
$daftarKelas = ['VII-A', 'VII-B', 'VII-C', 'VIII-A', 'VIII-B', 'VIII-C', 'IX-A', 'IX-B', 'IX-C'];
$namaBulanList = [
    1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
    5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
    9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
];
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Validasi Jurnal Mingguan - SiLiterasi</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">
    <!-- Navbar -->
    <header class="bg-indigo-900 text-white shadow-lg sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <span class="text-2xl">📚</span>
                <div>
                    <h1 class="font-bold text-lg leading-tight">SiLiterasi SMP</h1>
                    <p class="text-xs text-indigo-200">Panel Guru / Wali Kelas</p>
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
            <a href="validasi_mingguan.php" class="py-3 border-b-2 border-indigo-600 text-indigo-600 whitespace-nowrap">
                ✍️ Validasi Mingguan (Skor 0-80)
            </a>
            <a href="verifikasi_bulanan.php" class="py-3 text-slate-500 hover:text-indigo-600 whitespace-nowrap">
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
            <form method="GET" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
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
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Bulan</label>
                    <select name="bulan" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                        <?php foreach ($namaBulanList as $num => $nama): ?>
                            <option value="<?= $num ?>" <?= $selectedBulan === $num ? 'selected' : '' ?>><?= $nama ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Minggu Ke</label>
                    <select name="minggu" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                        <?php for ($m = 1; $m <= 4; $m++): ?>
                            <option value="<?= $m ?>" <?= $selectedMinggu === $m ? 'selected' : '' ?>>Minggu <?= $m ?></option>
                        <?php endfor; ?>
                    </select>
                </div>
                <div>
                    <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition">
                        Terapkan Filter
                    </button>
                </div>
            </form>
        </div>

        <!-- Info Box: Validasi Skor -->
        <div class="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 text-xs sm:text-sm flex items-start space-x-3">
            <span class="text-xl">ℹ️</span>
            <div>
                <p class="font-bold">Ketentuan Penilaian Mingguan:</p>
                <p>• Skor Refleksi Siswa: Otomatis dari 4 poin refleksi (Maksimal 20 poin).</p>
                <p>• Skor Validasi Guru: Rentang <strong>0 s.d. 80 poin</strong> (divalidasi ketat di frontend & backend).</p>
                <p>• Total Nilai Mingguan = Skor Refleksi (0-20) + Skor Guru (0-80) = <strong>Maksimal 100</strong>.</p>
                <p>• Nilai akumulasi akhir bulan dihitung otomatis: <code>(Minggu 1 + Minggu 2 + Minggu 3 + Minggu 4) ÷ 4</code>.</p>
            </div>
        </div>

        <!-- Tabel Jurnal Siswa -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h2 class="text-base font-bold text-slate-800">
                        Daftar Jurnal Siswa - Kelas <?= htmlspecialchars($selectedKelas) ?> (Minggu <?= $selectedMinggu ?>, <?= $namaBulanList[$selectedBulan] ?> <?= htmlspecialchars($selectedTahun) ?>)
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">Ditemukan <?= count($entries) ?> jurnal siswa yang tersubmit.</p>
                </div>
            </div>

            <?php if (empty($entries)): ?>
                <div class="p-12 text-center text-slate-400">
                    <span class="text-4xl">📭</span>
                    <p class="mt-2 text-sm font-medium">Belum ada jurnal yang disubmit oleh siswa untuk periode ini.</p>
                </div>
            <?php else: ?>
                <div class="divide-y divide-slate-100">
                    <?php foreach ($entries as $index => $row): ?>
                        <div class="p-5 hover:bg-slate-50/70 transition">
                            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <!-- Info Siswa & Jurnal -->
                                <div class="flex-1 space-y-2">
                                    <div class="flex items-center space-x-3">
                                        <span class="w-7 h-7 bg-indigo-100 text-indigo-700 font-bold rounded-full flex items-center justify-center text-xs">
                                            <?= $index + 1 ?>
                                        </span>
                                        <div>
                                            <h3 class="font-bold text-slate-800 text-sm"><?= htmlspecialchars($row['nama_siswa']) ?></h3>
                                            <p class="text-xs text-slate-500">NISN: <?= htmlspecialchars($row['nisn']) ?> | <?= htmlspecialchars($row['tanggal']) ?></p>
                                        </div>
                                        <?php if ($row['validation_id']): ?>
                                            <span class="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-md">
                                                Sudah Divalidasi
                                            </span>
                                        <?php else: ?>
                                            <span class="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-md">
                                                Menunggu Penilaian
                                            </span>
                                        <?php endif; ?>
                                    </div>

                                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                                        <p><strong class="text-slate-900">Buku:</strong> <?= htmlspecialchars($row['judul_buku']) ?> (Penulis: <?= htmlspecialchars($row['penulis']) ?>) - <?= (int)$row['halaman_dibaca'] ?> hal.</p>
                                        <p><strong class="text-slate-900">Ringkasan:</strong> <?= htmlspecialchars($row['ringkasan']) ?></p>
                                        <div class="pt-1 text-[11px] text-slate-500 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div>1. <?= htmlspecialchars($row['jawaban_p1'] ?: '-') ?></div>
                                            <div>2. <?= htmlspecialchars($row['jawaban_p2'] ?: '-') ?></div>
                                            <div>3. <?= htmlspecialchars($row['jawaban_p3'] ?: '-') ?></div>
                                            <div>4. <?= htmlspecialchars($row['jawaban_p4'] ?: '-') ?></div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Form Penilaian Guru dengan Validasi 0 - 80 -->
                                <div class="w-full lg:w-96 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <form method="POST" class="space-y-3 validation-form" onsubmit="return validateTeacherScore(this)">
                                        <input type="hidden" name="action" value="simpan_validasi">
                                        <input type="hidden" name="entry_id" value="<?= $row['entry_id'] ?>">
                                        
                                        <div class="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                                            <span class="text-slate-600">Skor Refleksi Siswa:</span>
                                            <span class="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                                <?= (int)$row['skor_mandiri'] ?> / 20
                                            </span>
                                        </div>

                                        <div class="grid grid-cols-2 gap-3 items-center">
                                            <div>
                                                <label class="block text-xs font-semibold text-slate-700 mb-1">
                                                    Skor Guru <span class="text-indigo-600">(0-80)</span>
                                                </label>
                                                <input 
                                                    type="number" 
                                                    name="skor_guru" 
                                                    min="0" 
                                                    max="80" 
                                                    step="1"
                                                    required
                                                    value="<?= $row['skor_guru'] !== null ? (int)$row['skor_guru'] : '' ?>" 
                                                    placeholder="0 - 80"
                                                    class="w-full skor-guru-input text-center font-bold text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                                    oninput="hitungTotalNilai(this, <?= (int)$row['skor_mandiri'] ?>)"
                                                >
                                            </div>
                                            <div>
                                                <label class="block text-xs font-semibold text-slate-700 mb-1">Total Nilai (0-100)</label>
                                                <div class="total-nilai-display w-full text-center font-extrabold text-sm bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5">
                                                    <?= $row['total_nilai'] !== null ? (int)$row['total_nilai'] : ((int)$row['skor_mandiri']) ?>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <input 
                                                type="text" 
                                                name="catatan_guru" 
                                                placeholder="Catatan apresiasi / koreksi guru..."
                                                value="<?= htmlspecialchars($row['catatan_guru'] ?? '') ?>"
                                                class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                                            >
                                        </div>

                                        <button 
                                            type="submit" 
                                            class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition shadow-sm"
                                        >
                                            Simpan Nilai Minggu <?= $selectedMinggu ?>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </main>

    <script>
    function hitungTotalNilai(inputElem, skorMandiri) {
        let val = parseInt(inputElem.value, 10);
        if (isNaN(val)) val = 0;
        
        // Batasi rentang input 0 - 80
        if (val > 80) {
            alert('Perhatian: Skor guru maksimal adalah 80!');
            inputElem.value = 80;
            val = 80;
        } else if (val < 0) {
            inputElem.value = 0;
            val = 0;
        }

        const total = skorMandiri + val;
        const container = inputElem.closest('form');
        const display = container.querySelector('.total-nilai-display');
        display.textContent = total;

        if (total >= 85) {
            display.className = 'total-nilai-display w-full text-center font-extrabold text-sm bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg px-3 py-1.5';
        } else if (total >= 70) {
            display.className = 'total-nilai-display w-full text-center font-extrabold text-sm bg-blue-100 border border-blue-300 text-blue-800 rounded-lg px-3 py-1.5';
        } else {
            display.className = 'total-nilai-display w-full text-center font-extrabold text-sm bg-amber-100 border border-amber-300 text-amber-800 rounded-lg px-3 py-1.5';
        }
    }

    function validateTeacherScore(form) {
        const input = form.querySelector('.skor-guru-input');
        const val = parseInt(input.value, 10);
        if (isNaN(val) || val < 0 || val > 80) {
            alert('Validasi Gagal: Skor guru harus di antara 0 dan 80.');
            input.focus();
            return false;
        }
        return true;
    }
    </script>
</body>
</html>
