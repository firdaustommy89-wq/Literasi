<?php
require_once __DIR__ . '/../auth/session_check.php';
require_once __DIR__ . '/../config/database.php';
requireAuth(['siswa']);

$currentUser = getCurrentUser();
$pdo = getDBConnection();

$now = new DateTime();
$currentMonthKey = $now->format('Y-m');
$selectedMonth = $_GET['month'] ?? $currentMonthKey;

// Ambil entri literasi siswa untuk bulan yang dipilih
$stmt = $pdo->prepare("
    SELECT e.*, v.validation_score, v.feedback_notes, v.status AS validation_status, v.teacher_name
    FROM literacy_entries e
    LEFT JOIN teacher_validations v ON e.id = v.entry_id
    WHERE e.student_id = :sid AND e.month_key = :mkey
    ORDER BY e.date ASC
");
$stmt->execute(['sid' => $currentUser['id'], 'mkey' => $selectedMonth]);
$entries = $stmt->fetchAll();

// Susun entri per minggu 1, 2, 3, 4
$weeks = [1 => null, 2 => null, 3 => null, 4 => null];
foreach ($entries as $e) {
    $w = (int)$e['week_number'];
    if ($w >= 1 && $w <= 4 && !isset($weeks[$w])) {
        $weeks[$w] = $e;
    }
}

// Hitung total nilai per minggu & akumulasi 4 minggu: (M1 + M2 + M3 + M4) ÷ 4
$wScores = [1 => 0, 2 => 0, 3 => 0, 4 => 0];
$completedWeeksCount = 0;
foreach ([1, 2, 3, 4] as $w) {
    if (!empty($weeks[$w])) {
        $completedWeeksCount++;
        $self = (float)$weeks[$w]['reflection_score'];
        $val = isset($weeks[$w]['validation_score']) ? (float)$weeks[$w]['validation_score'] : 0;
        $wScores[$w] = min(100, $self + $val);
    }
}
$sum4 = $wScores[1] + $wScores[2] + $wScores[3] + $wScores[4];
$autoAccumulatedScore = round(($sum4 / 4) * 10) / 10;
$predicate = getPredicateFromScore($autoAccumulatedScore);

// Cek apakah sudah ada verifikasi bulanan dari guru
$stmtVerif = $pdo->prepare("SELECT * FROM monthly_verifications WHERE student_id = :sid AND month_key = :mkey LIMIT 1");
$stmtVerif->execute(['sid' => $currentUser['id'], 'mkey' => $selectedMonth]);
$monthlyVerif = $stmtVerif->fetch();
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Siswa - SiLiterasi PHP</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">
  
  <!-- Navbar -->
  <nav class="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-xs">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="w-9 h-9 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center">SL</span>
        <div>
          <h1 class="font-extrabold text-sm text-slate-900 leading-tight">SiLiterasi Siswa</h1>
          <p class="text-[11px] text-slate-500"><?= htmlspecialchars($currentUser['name']) ?> &bull; <?= htmlspecialchars($currentUser['rombel']) ?></p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <a href="tambah_jurnal.php" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition">
          + Isi Jurnal Baru
        </a>
        <a href="../auth/logout.php" class="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">
          Keluar
        </a>
      </div>
    </div>
  </nav>

  <div class="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

    <!-- Hero Card Akumulasi 4 Minggu -->
    <div class="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-400/20 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
            Periode Bulan: <?= htmlspecialchars($selectedMonth) ?>
          </span>
          <h2 class="text-2xl font-black text-white mt-1">Akumulasi Literasi 4 Minggu</h2>
          <p class="text-xs text-indigo-200 mt-0.5">Kewajiban membaca 1 jurnal setiap minggu (Total 4 jurnal per bulan)</p>

          <div class="mt-3 bg-white/10 p-3 rounded-xl border border-white/15 text-xs text-indigo-100 font-mono">
            Rumus: (Minggu 1 + Minggu 2 + Minggu 3 + Minggu 4) ÷ 4<br>
            = (<?= $wScores[1] ?> + <?= $wScores[2] ?> + <?= $wScores[3] ?> + <?= $wScores[4] ?>) ÷ 4 = <strong><?= $autoAccumulatedScore ?> Poin</strong>
          </div>
        </div>

        <div class="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/20 text-center md:text-right shrink-0">
          <span class="text-[10px] uppercase font-bold text-indigo-200 block">Nilai Akumulasi Akhir</span>
          <div class="text-4xl font-black text-amber-300"><?= $autoAccumulatedScore ?> <span class="text-sm font-semibold text-white">/ 100</span></div>
          <span class="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950">
            Predikat <?= $predicate ?>
          </span>
          <div class="text-[11px] text-emerald-300 mt-2 font-bold">
            <?= $completedWeeksCount ?> / 4 Minggu Terisi (<?= $completedWeeksCount * 25 ?>%)
          </div>
        </div>
      </div>
    </div>

    <!-- 4-Week Status Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <?php foreach ([1, 2, 3, 4] as $w): 
        $e = $weeks[$w];
        $isFilled = !empty($e);
      ?>
        <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-black text-xs text-slate-700 uppercase">Minggu ke-<?= $w ?></span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold <?= $isFilled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400' ?>">
                <?= $isFilled ? 'Terisi' : 'Kosong' ?>
              </span>
            </div>

            <?php if ($isFilled): ?>
              <h4 class="font-bold text-sm text-slate-900 truncate"><?= htmlspecialchars($e['book_title']) ?></h4>
              <p class="text-[11px] text-slate-500 mt-0.5"><?= htmlspecialchars($e['reading_category']) ?> &bull; <?= $e['date'] ?></p>
              
              <div class="mt-3 pt-2 border-t border-slate-100 text-xs flex items-center justify-between">
                <span class="text-slate-500">Nilai Minggu:</span>
                <span class="font-black text-indigo-700"><?= $wScores[$w] ?> / 100 Poin</span>
              </div>
              <?php if (!empty($e['validation_score'])): ?>
                <div class="text-[10px] text-emerald-600 mt-1 font-semibold">
                  ✓ Validasi Guru: <?= $e['validation_score'] ?>/80 Poin
                </div>
              <?php else: ?>
                <div class="text-[10px] text-amber-600 mt-1 font-semibold">
                  ⏳ Menunggu validasi guru
                </div>
              <?php endif; ?>
            <?php else: ?>
              <p class="text-xs text-slate-400 italic py-4">Belum ada jurnal untuk minggu ini.</p>
              <a href="tambah_jurnal.php?week=<?= $w ?>" class="mt-2 block text-center py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition">
                + Isi Minggu <?= $w ?>
              </a>
            <?php endif; ?>
          </div>
        </div>
      <?php endforeach; ?>
    </div>

    <!-- Riwayat Jurnal Terakhir -->
    <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <h3 class="font-black text-sm text-slate-900 mb-3">Daftar Jurnal Membaca Siswa</h3>
      <?php if (empty($entries)): ?>
        <p class="text-xs text-slate-400 py-6 text-center">Belum ada pengiriman jurnal membaca untuk bulan ini.</p>
      <?php else: ?>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 font-bold uppercase">
              <tr>
                <th class="p-3">Minggu</th>
                <th class="p-3">Tanggal</th>
                <th class="p-3">Judul Buku</th>
                <th class="p-3">Refleksi (Max 20)</th>
                <th class="p-3">Validasi Guru (Max 80)</th>
                <th class="p-3">Total (Max 100)</th>
                <th class="p-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700 font-medium">
              <?php foreach ($entries as $e): 
                $valScore = $e['validation_score'] ?? null;
                $tot = min(100, (float)$e['reflection_score'] + (float)($valScore ?? 0));
              ?>
                <tr class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-indigo-600">Minggu <?= $e['week_number'] ?></td>
                  <td class="p-3"><?= $e['date'] ?></td>
                  <td class="p-3 font-bold text-slate-900"><?= htmlspecialchars($e['book_title']) ?></td>
                  <td class="p-3"><?= $e['reflection_score'] ?> / 20</td>
                  <td class="p-3"><?= $valScore !== null ? $valScore . ' / 80' : '-' ?></td>
                  <td class="p-3 font-black text-indigo-900"><?= $valScore !== null ? $tot . ' / 100' : $e['reflection_score'] ?></td>
                  <td class="p-3">
                    <?php if ($valScore !== null): ?>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Tervalidasi</span>
                    <?php else: ?>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Menunggu</span>
                    <?php endif; ?>
                  </td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      <?php endif; ?>
    </div>

  </div>
</body>
</html>
