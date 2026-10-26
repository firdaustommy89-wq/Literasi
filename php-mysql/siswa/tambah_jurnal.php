<?php
require_once __DIR__ . '/../auth/session_check.php';
require_once __DIR__ . '/../config/database.php';
requireAuth(['siswa']);

$currentUser = getCurrentUser();
$pdo = getDBConnection();
$errorMsg = null;
$successMsg = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $bookTitle = trim($_POST['book_title'] ?? '');
    $category = trim($_POST['reading_category'] ?? '');
    $type = $_POST['literacy_type'] ?? 'Non Mapel';
    $pages = trim($_POST['pages_read'] ?? '');
    $duration = (int)($_POST['duration_minutes'] ?? 15);
    $summary = trim($_POST['summary'] ?? '');
    $moral = trim($_POST['moral_value'] ?? '');
    $date = $_POST['date'] ?? date('Y-m-d');
    $photoUrl = trim($_POST['photo_url'] ?? '');

    $q1 = max(1, min(5, (int)($_POST['q1'] ?? 5)));
    $q2 = max(1, min(5, (int)($_POST['q2'] ?? 5)));
    $q3 = max(1, min(5, (int)($_POST['q3'] ?? 5)));
    $q4 = max(1, min(5, (int)($_POST['q4'] ?? 5)));
    $reflectionScore = $q1 + $q2 + $q3 + $q4; // 4 - 20

    if (empty($bookTitle) || empty($summary) || empty($moral)) {
        $errorMsg = 'Harap lengkapi judul buku, ringkasan, dan pesan moral.';
    } else {
        $weekNumber = getWeekNumberFromDate($date);
        $monthKey = substr($date, 0, 7);
        $entryId = 'entry-' . time() . '-' . rand(100, 999);

        // Ambil tahun ajaran aktif
        $stmtYear = $pdo->query("SELECT academic_year, semester FROM academic_settings LIMIT 1");
        $academic = $stmtYear->fetch() ?: ['academic_year' => '2026/2027', 'semester' => 'Ganjil'];

        $sql = "INSERT INTO literacy_entries (
            id, student_id, student_name, student_nisn, student_kelas, student_rombel,
            academic_year, semester, book_title, reading_category, literacy_type,
            pages_read, duration_minutes, summary, moral_value, photo_url,
            date, week_number, month_key, reflection_q1, reflection_q2, reflection_q3, reflection_q4,
            reflection_score, system_input_date
        ) VALUES (
            :id, :sid, :sname, :snisn, :skelas, :srombel,
            :ayear, :sem, :title, :cat, :type,
            :pages, :duration, :summary, :moral, :photo,
            :date, :week, :mkey, :q1, :q2, :q3, :q4,
            :refScore, NOW()
        )";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'id' => $entryId,
            'sid' => $currentUser['id'],
            'sname' => $currentUser['name'],
            'snisn' => $currentUser['nisn'] ?? '',
            'skelas' => $currentUser['kelas'] ?? '10',
            'srombel' => $currentUser['rombel'] ?? 'Kelas 10',
            'ayear' => $academic['academic_year'],
            'sem' => $academic['semester'],
            'title' => $bookTitle,
            'cat' => $category,
            'type' => $type,
            'pages' => $pages,
            'duration' => $duration,
            'summary' => $summary,
            'moral' => $moral,
            'photo' => $photoUrl ?: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
            'date' => $date,
            'week' => $weekNumber,
            'mkey' => $monthKey,
            'q1' => $q1,
            'q2' => $q2,
            'q3' => $q3,
            'q4' => $q4,
            'refScore' => $reflectionScore
        ]);

        header('Location: dashboard.php?msg=entry_created');
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Input Jurnal Literasi - SiLiterasi PHP</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800 p-4 sm:p-6">
  <div class="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-md">
    
    <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
      <div>
        <h2 class="text-xl font-black text-slate-900">Form Jurnal Literasi Siswa</h2>
        <p class="text-xs text-slate-500">Kewajiban membaca mingguan (Minggu 1 s.d 4)</p>
      </div>
      <a href="dashboard.php" class="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100">
        Kembali
      </a>
    </div>

    <?php if ($errorMsg): ?>
      <div class="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
        <?= htmlspecialchars($errorMsg) ?>
      </div>
    <?php endif; ?>

    <form method="POST" class="space-y-4 text-xs">
      <div>
        <label class="block font-bold text-slate-700 mb-1">Judul Buku / Kitab / Artikel</label>
        <input type="text" name="book_title" required placeholder="Contoh: Laskar Pelangi" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-indigo-500 font-bold" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-bold text-slate-700 mb-1">Jenis Literasi</label>
          <select name="literacy_type" class="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none bg-white">
            <option value="Non Mapel">Non Mapel (Buku Umum)</option>
            <option value="Kitab Suci">Kitab Suci (Keagamaan)</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">Kategori Buku</label>
          <input type="text" name="reading_category" placeholder="Novel, Biografi, Sains..." class="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="block font-bold text-slate-700 mb-1">Tanggal Baca</label>
          <input type="date" name="date" value="<?= date('Y-m-d') ?>" required class="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none" />
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">Halaman / Ayat</label>
          <input type="text" name="pages_read" placeholder="Hal. 1 - 30" required class="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none" />
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">Durasi (Menit)</label>
          <input type="number" name="duration_minutes" value="20" min="5" max="300" class="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none" />
        </div>
      </div>

      <div>
        <label class="block font-bold text-slate-700 mb-1">Ringkasan Isi Bacaan</label>
        <textarea name="summary" rows="3" required placeholder="Ceritakan secara singkat isi atau alur cerita yang Anda baca..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none"></textarea>
      </div>

      <div>
        <label class="block font-bold text-slate-700 mb-1">Nilai Kebaikan / Pesan Moral yang Dipetik</label>
        <textarea name="moral_value" rows="2" required placeholder="Hikmah atau pesan kebaikan yang dapat diterapkan sehari-hari..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none italic"></textarea>
      </div>

      <!-- 4 Refleksi Mandiri -->
      <div class="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
        <div class="flex items-center justify-between font-bold text-indigo-950">
          <span>Refleksi Mandiri Siswa (Skor 1 - 5 Per Butir, Maks. 20 Poin)</span>
          <span class="text-xs bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full">Otomatis Terhitung</span>
        </div>

        <div class="grid grid-cols-2 gap-3 text-[11px]">
          <div>
            <label class="block text-slate-700 mb-0.5">1. Memahami pesan utama buku:</label>
            <select name="q1" class="w-full p-1.5 rounded-lg border border-indigo-200 bg-white font-bold">
              <option value="5">5 - Sangat Memahami</option>
              <option value="4">4 - Memahami</option>
              <option value="3">3 - Cukup</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-700 mb-0.5">2. Menemukan nilai kebaikan:</label>
            <select name="q2" class="w-full p-1.5 rounded-lg border border-indigo-200 bg-white font-bold">
              <option value="5">5 - Sangat Jelas</option>
              <option value="4">4 - Jelas</option>
              <option value="3">3 - Cukup</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-700 mb-0.5">3. Terdorong berbuat positif:</label>
            <select name="q3" class="w-full p-1.5 rounded-lg border border-indigo-200 bg-white font-bold">
              <option value="5">5 - Sangat Termotivasi</option>
              <option value="4">4 - Termotivasi</option>
              <option value="3">3 - Cukup</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-700 mb-0.5">4. Mengisi dengan jujur & sadar:</label>
            <select name="q4" class="w-full p-1.5 rounded-lg border border-indigo-200 bg-white font-bold">
              <option value="5">5 - Sangat Sadar & Jujur</option>
              <option value="4">4 - Sadar</option>
              <option value="3">3 - Cukup</option>
            </select>
          </div>
        </div>
      </div>

      <div class="pt-2 flex justify-end gap-2">
        <a href="dashboard.php" class="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition">Batal</a>
        <button type="submit" class="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition">
          Simpan Jurnal Membaca
        </button>
      </div>
    </form>
  </div>
</body>
</html>
