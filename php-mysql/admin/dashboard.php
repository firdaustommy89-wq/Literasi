<?php
// /php-mysql/admin/dashboard.php
require_once __DIR__ . '/../auth/session_check.php';
require_once __DIR__ . '/../config/database.php';

requireRole(['admin']);
$currentUser = getCurrentUser();
$db = getDBConnection();

$successMsg = '';
$errorMsg = '';

// Update Academic Settings
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_settings') {
    $activeYear = trim($_POST['active_academic_year'] ?? '2024/2025');
    $activeSemester = trim($_POST['active_semester'] ?? 'Ganjil');

    if (!empty($activeYear)) {
        $stmt = $db->prepare("UPDATE academic_settings SET active_academic_year = ?, active_semester = ? WHERE id = 1");
        $stmt->execute([$activeYear, $activeSemester]);
        $successMsg = "Pengaturan tahun ajaran aktif berhasil diperbarui!";
    }
}

// Fetch stats
$statSiswa = $db->query("SELECT COUNT(*) AS total FROM users WHERE role = 'siswa'")->fetch()['total'] ?? 0;
$statGuru = $db->query("SELECT COUNT(*) AS total FROM users WHERE role = 'guru'")->fetch()['total'] ?? 0;
$statJurnal = $db->query("SELECT COUNT(*) AS total FROM literacy_entries")->fetch()['total'] ?? 0;
$statValidasi = $db->query("SELECT COUNT(*) AS total FROM teacher_validations")->fetch()['total'] ?? 0;
$statVerifikasi = $db->query("SELECT COUNT(*) AS total FROM monthly_verifications WHERE status = 'verified'")->fetch()['total'] ?? 0;

$settings = $db->query("SELECT * FROM academic_settings WHERE id = 1")->fetch();
if (!$settings) {
    $settings = ['active_academic_year' => '2024/2025', 'active_semester' => 'Ganjil'];
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel Administrator - SiLiterasi</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">
    <!-- Navbar -->
    <header class="bg-slate-900 text-white shadow-lg sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <span class="text-2xl">⚙️</span>
                <div>
                    <h1 class="font-bold text-lg leading-tight">SiLiterasi SMP</h1>
                    <p class="text-xs text-slate-400">Dashboard Administrator Sistem</p>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class="text-right hidden sm:block">
                    <p class="text-sm font-semibold"><?= htmlspecialchars($currentUser['name']) ?></p>
                    <p class="text-xs text-slate-400">Role: Administrator</p>
                </div>
                <a href="../auth/logout.php" class="bg-slate-800 hover:bg-rose-600 text-xs px-3 py-1.5 rounded-lg font-medium transition">Keluar</a>
            </div>
        </div>
    </header>

    <!-- Sub Navigation -->
    <div class="bg-white border-b border-slate-200 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-6 overflow-x-auto text-sm font-medium">
            <a href="dashboard.php" class="py-3 border-b-2 border-indigo-600 text-indigo-600 whitespace-nowrap">
                📊 Statistik & Pengaturan
            </a>
            <a href="sinkron_rombel.php" class="py-3 text-slate-500 hover:text-indigo-600 whitespace-nowrap">
                🔄 Sinkronisasi Rombel
            </a>
            <a href="ekspor_excel.php" class="py-3 text-slate-500 hover:text-indigo-600 whitespace-nowrap">
                📥 Ekspor Laporan Excel / CSV
            </a>
            <a href="../guru/validasi_mingguan.php" class="py-3 text-slate-500 hover:text-indigo-600 whitespace-nowrap">
                ✍️ Validasi Guru
            </a>
            <a href="../guru/verifikasi_bulanan.php" class="py-3 text-slate-500 hover:text-indigo-600 whitespace-nowrap">
                📈 Rekap Bulanan
            </a>
        </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <?php if ($successMsg): ?>
            <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-3 shadow-sm">
                <span class="text-xl">✅</span>
                <p class="text-sm font-medium"><?= htmlspecialchars($successMsg) ?></p>
            </div>
        <?php endif; ?>

        <!-- Stat Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <p class="text-xs font-semibold text-slate-500 uppercase">Total Siswa</p>
                <p class="text-2xl font-black text-indigo-600 mt-2"><?= $statSiswa ?></p>
                <p class="text-xs text-slate-400 mt-1">Terdaftar di sistem</p>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <p class="text-xs font-semibold text-slate-500 uppercase">Guru / Wali Kelas</p>
                <p class="text-2xl font-black text-indigo-600 mt-2"><?= $statGuru ?></p>
                <p class="text-xs text-slate-400 mt-1">Pembina literasi</p>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <p class="text-xs font-semibold text-slate-500 uppercase">Total Jurnal</p>
                <p class="text-2xl font-black text-emerald-600 mt-2"><?= $statJurnal ?></p>
                <p class="text-xs text-slate-400 mt-1">Jurnal disubmit</p>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <p class="text-xs font-semibold text-slate-500 uppercase">Validasi Guru</p>
                <p class="text-2xl font-black text-blue-600 mt-2"><?= $statValidasi ?></p>
                <p class="text-xs text-slate-400 mt-1">Skor 0-80 divalidasi</p>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <p class="text-xs font-semibold text-slate-500 uppercase">Verifikasi Bulanan</p>
                <p class="text-2xl font-black text-purple-600 mt-2"><?= $statVerifikasi ?></p>
                <p class="text-xs text-slate-400 mt-1">(M1+M2+M3+M4)/4</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Pengaturan Tahun Ajaran -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <h3 class="font-bold text-base text-slate-900 flex items-center space-x-2">
                    <span>📅</span>
                    <span>Tahun Ajaran & Semester Aktif</span>
                </h3>
                <form method="POST" class="space-y-4">
                    <input type="hidden" name="action" value="update_settings">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Tahun Ajaran Aktif</label>
                        <input type="text" name="active_academic_year" value="<?= htmlspecialchars($settings['active_academic_year']) ?>" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Semester Aktif</label>
                        <select name="active_semester" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                            <option value="Ganjil" <?= $settings['active_semester'] === 'Ganjil' ? 'selected' : '' ?>>Ganjil</option>
                            <option value="Genap" <?= $settings['active_semester'] === 'Genap' ? 'selected' : '' ?>>Genap</option>
                        </select>
                    </div>
                    <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition">
                        Simpan Pengaturan
                    </button>
                </form>
            </div>

            <!-- Panduan & Fitur Cepat -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <h3 class="font-bold text-base text-slate-900 flex items-center space-x-2">
                    <span>🚀</span>
                    <span>Tindakan Cepat & Panduan</span>
                </h3>
                <div class="space-y-3">
                    <a href="sinkron_rombel.php" class="block p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition">
                        <p class="text-xs font-bold text-indigo-700">🔄 Sinkronisasi Rombel & Kenaikan Kelas</p>
                        <p class="text-xs text-slate-500 mt-0.5">Sinkronkan data kelas siswa ke seluruh tabel rekap atau lakukan kenaikan kelas serentak.</p>
                    </a>
                    <a href="ekspor_excel.php" class="block p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition">
                        <p class="text-xs font-bold text-emerald-700">📥 Ekspor Rekap Nilai Bulanan (.CSV / Excel)</p>
                        <p class="text-xs text-slate-500 mt-0.5">Unduh data nilai minggu 1-4 dan akumulasi rata-rata untuk dimasukkan ke e-Rapor.</p>
                    </a>
                    <a href="../guru/verifikasi_bulanan.php" class="block p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition">
                        <p class="text-xs font-bold text-purple-700">📊 Rekap Nilai & Verifikasi Otomatis</p>
                        <p class="text-xs text-slate-500 mt-0.5">Lihat hasil perhitungan (M1+M2+M3+M4)/4 otomatis seluruh rombel.</p>
                    </a>
                </div>
            </div>
        </div>
    </main>
</body>
</html>
