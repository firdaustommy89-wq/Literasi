<?php
// /php-mysql/admin/sinkron_rombel.php
require_once __DIR__ . '/../auth/session_check.php';
require_once __DIR__ . '/../config/database.php';

requireRole(['admin']);
$currentUser = getCurrentUser();
$db = getDBConnection();

$successMsg = '';
$errorMsg = '';

// Kenaikan Kelas Massal
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'kenaikan_kelas') {
    try {
        $db->beginTransaction();

        // Kelas IX -> Lulus
        $db->exec("UPDATE users SET kelas = 'LULUS' WHERE role = 'siswa' AND kelas LIKE 'IX%'");
        // Kelas VIII -> IX
        $db->exec("UPDATE users SET kelas = REPLACE(kelas, 'VIII-', 'IX-') WHERE role = 'siswa' AND kelas LIKE 'VIII%'");
        // Kelas VII -> VIII
        $db->exec("UPDATE users SET kelas = REPLACE(kelas, 'VII-', 'VIII-') WHERE role = 'siswa' AND kelas LIKE 'VII%'");

        $db->commit();
        $successMsg = "Proses Kenaikan Kelas Massal berhasil dijalankan!";
    } catch (Exception $e) {
        $db->rollBack();
        $errorMsg = "Gagal memproses kenaikan kelas: " . $e->getMessage();
    }
}

// Update Rombel Siswa Perorangan
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_rombel_siswa') {
    $userId = (int)($_POST['user_id'] ?? 0);
    $kelasBaru = trim($_POST['kelas_baru'] ?? '');

    if ($userId > 0 && !empty($kelasBaru)) {
        $stmt = $db->prepare("UPDATE users SET kelas = ? WHERE id = ? AND role = 'siswa'");
        $stmt->execute([$kelasBaru, $userId]);
        $successMsg = "Kelas siswa berhasil diperbarui ke {$kelasBaru}!";
    }
}

// Ambil daftar seluruh siswa
$stmtList = $db->query("SELECT id, name, nisn, kelas FROM users WHERE role = 'siswa' ORDER BY kelas ASC, name ASC");
$siswaList = $stmtList->fetchAll();

$daftarKelas = ['VII-A', 'VII-B', 'VII-C', 'VIII-A', 'VIII-B', 'VIII-C', 'IX-A', 'IX-B', 'IX-C', 'LULUS'];
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sinkronisasi Rombel - SiLiterasi</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">
    <!-- Navbar -->
    <header class="bg-slate-900 text-white shadow-lg sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <span class="text-2xl">🔄</span>
                <div>
                    <h1 class="font-bold text-lg leading-tight">SiLiterasi SMP</h1>
                    <p class="text-xs text-slate-400">Sinkronisasi & Manajemen Rombel Siswa</p>
                </div>
            </div>
            <a href="dashboard.php" class="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium transition">Kembali ke Dashboard</a>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

        <!-- Kenaikan Kelas Massal Banner -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 class="text-base font-bold text-slate-900">Kenaikan Kelas Massal (Tahun Ajaran Baru)</h2>
                <p class="text-xs text-slate-500 mt-1">
                    Operasi ini akan menaikkan kelas seluruh siswa secara otomatis: VII ➔ VIII, VIII ➔ IX, dan IX ➔ LULUS.
                </p>
            </div>
            <form method="POST" onsubmit="return confirm('PERINGATAN: Apakah Anda yakin ingin memproses kenaikan kelas massal untuk seluruh siswa?')">
                <input type="hidden" name="action" value="kenaikan_kelas">
                <button type="submit" class="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-sm whitespace-nowrap">
                    ⚡ Jalankan Kenaikan Kelas
                </button>
            </form>
        </div>

        <!-- Tabel Siswa & Ubah Rombel -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 class="font-bold text-slate-800 text-sm">Daftar Rombel Siswa Aktif</h3>
                <span class="text-xs text-slate-400">Total: <?= count($siswaList) ?> Siswa</span>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200">
                        <tr>
                            <th class="p-4 w-12 text-center">No</th>
                            <th class="p-4">Nama Siswa</th>
                            <th class="p-4">NISN</th>
                            <th class="p-4">Kelas Saat Ini</th>
                            <th class="p-4">Ubah Rombel / Mutasi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php foreach ($siswaList as $idx => $s): ?>
                            <tr class="hover:bg-slate-50 transition">
                                <td class="p-4 text-center font-bold text-slate-400"><?= $idx + 1 ?></td>
                                <td class="p-4 font-bold text-slate-900"><?= htmlspecialchars($s['name']) ?></td>
                                <td class="p-4 font-mono text-slate-500"><?= htmlspecialchars($s['nisn']) ?></td>
                                <td class="p-4">
                                    <span class="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-md">
                                        <?= htmlspecialchars($s['kelas']) ?>
                                    </span>
                                </td>
                                <td class="p-4">
                                    <form method="POST" class="flex items-center space-x-2">
                                        <input type="hidden" name="action" value="update_rombel_siswa">
                                        <input type="hidden" name="user_id" value="<?= $s['id'] ?>">
                                        <select name="kelas_baru" class="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs">
                                            <?php foreach ($daftarKelas as $k): ?>
                                                <option value="<?= $k ?>" <?= $s['kelas'] === $k ? 'selected' : '' ?>><?= $k ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                        <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-2.5 py-1 rounded-lg text-xs transition">
                                            Simpan
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </main>
</body>
</html>
