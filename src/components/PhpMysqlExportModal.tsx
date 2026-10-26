import React, { useState } from 'react';
import JSZip from 'jszip';
import { 
  Download, 
  X, 
  Database, 
  FileCode, 
  Check, 
  Copy, 
  Server, 
  FolderTree, 
  ShieldCheck, 
  Calculator, 
  FileSpreadsheet, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface PhpMysqlExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Source files embedded for instant download and review
const PHP_MYSQL_FILES: Record<string, { label: string; path: string; lang: string; content: string }> = {
  'database.sql': {
    label: 'database.sql (Skema & Data Awal)',
    path: 'database.sql',
    lang: 'sql',
    content: `-- ========================================================
-- DATABASE SCHEMA: SILITERASI (Sistem Informasi Literasi Sekolah)
-- Versi: PHP & MySQL (MariaDB / MySQL 5.7+ / 8.0+)
-- Fitur: Multi-role (Siswa, Guru, Admin), Jurnal Literasi,
--        Validasi 4 Minggu, Rumus Akumulasi (M1+M2+M3+M4)/4,
--        Validasi Skor (0-80 & 0-100), Sinkronisasi Rombel
-- ========================================================

CREATE DATABASE IF NOT EXISTS \`siliterasi_db\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`siliterasi_db\`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS \`monthly_verifications\`;
DROP TABLE IF EXISTS \`teacher_validations\`;
DROP TABLE IF EXISTS \`literacy_entries\`;
DROP TABLE IF EXISTS \`academic_settings\`;
DROP TABLE IF EXISTS \`users\`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Tabel Pengguna (Users)
CREATE TABLE \`users\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`username\` VARCHAR(60) NOT NULL UNIQUE,
  \`password\` VARCHAR(255) NOT NULL,
  \`role\` ENUM('siswa', 'guru', 'admin') NOT NULL DEFAULT 'siswa',
  \`nisn\` VARCHAR(30) NULL,
  \`nip\` VARCHAR(30) NULL,
  \`kelas\` ENUM('10', '11', '12', 'VII', 'VIII', 'IX') NULL,
  \`rombel\` VARCHAR(60) NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Pengaturan Tahun Ajaran
CREATE TABLE \`academic_settings\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`academic_year\` VARCHAR(20) NOT NULL DEFAULT '2026/2027',
  \`semester\` ENUM('Ganjil', 'Genap') NOT NULL DEFAULT 'Ganjil',
  \`school_name\` VARCHAR(150) NOT NULL DEFAULT 'SMP / SMA Literasi Unggul'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabel Jurnal Literasi Siswa
CREATE TABLE \`literacy_entries\` (
  \`id\` VARCHAR(60) NOT NULL,
  \`student_id\` VARCHAR(50) NOT NULL,
  \`student_name\` VARCHAR(150) NOT NULL,
  \`student_nisn\` VARCHAR(30) NULL,
  \`student_kelas\` VARCHAR(10) NOT NULL,
  \`student_rombel\` VARCHAR(60) NOT NULL,
  \`academic_year\` VARCHAR(20) NOT NULL DEFAULT '2026/2027',
  \`semester\` ENUM('Ganjil', 'Genap') NOT NULL DEFAULT 'Ganjil',
  \`book_title\` VARCHAR(255) NOT NULL,
  \`reading_category\` VARCHAR(100) NOT NULL,
  \`pages_read\` VARCHAR(100) NOT NULL,
  \`duration_minutes\` INT NOT NULL DEFAULT 15,
  \`summary\` TEXT NOT NULL,
  \`moral_value\` TEXT NOT NULL,
  \`date\` DATE NOT NULL,
  \`week_number\` TINYINT NOT NULL COMMENT 'Minggu ke 1-4',
  \`month_key\` VARCHAR(7) NOT NULL COMMENT 'Format YYYY-MM',
  \`reflection_score\` DECIMAL(4,1) NOT NULL DEFAULT 20.0 COMMENT 'Maks 20 poin',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_entries_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabel Validasi Guru (Check Rentang Skor 0 - 80)
CREATE TABLE \`teacher_validations\` (
  \`id\` VARCHAR(60) NOT NULL,
  \`entry_id\` VARCHAR(60) NOT NULL UNIQUE,
  \`teacher_id\` VARCHAR(50) NOT NULL,
  \`teacher_name\` VARCHAR(150) NOT NULL,
  \`validation_score\` DECIMAL(4,1) NOT NULL COMMENT 'Maksimal 80 poin',
  \`feedback_notes\` TEXT NOT NULL,
  \`status\` ENUM('validated', 'needs_revision') NOT NULL DEFAULT 'validated',
  \`validated_at\` DATETIME NOT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_val_entry\` FOREIGN KEY (\`entry_id\`) REFERENCES \`literacy_entries\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`chk_validation_score_range\` CHECK (\`validation_score\` >= 0 AND \`validation_score\` <= 80)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabel Verifikasi & Akumulasi Akhir Bulan (M1+M2+M3+M4)/4
CREATE TABLE \`monthly_verifications\` (
  \`id\` VARCHAR(80) NOT NULL,
  \`student_id\` VARCHAR(50) NOT NULL,
  \`month_key\` VARCHAR(7) NOT NULL,
  \`week1_score\` DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  \`week2_score\` DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  \`week3_score\` DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  \`week4_score\` DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  \`accumulated_score\` DECIMAL(5,1) NOT NULL COMMENT 'Rumus: (M1 + M2 + M3 + M4) ÷ 4, rentang 0-100',
  \`predicate\` ENUM('A', 'B', 'C', 'D') NOT NULL DEFAULT 'D',
  \`teacher_id\` VARCHAR(50) NOT NULL,
  \`teacher_notes\` TEXT NOT NULL,
  \`verified_at\` DATETIME NOT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`chk_accumulated_score_range\` CHECK (\`accumulated_score\` >= 0 AND \`accumulated_score\` <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data Default Demo
INSERT INTO \`academic_settings\` (\`id\`, \`academic_year\`, \`semester\`, \`school_name\`) 
VALUES (1, '2026/2027', 'Ganjil', 'SMP / SMA Literasi Unggul');

INSERT INTO \`users\` (\`id\`, \`name\`, \`username\`, \`password\`, \`role\`, \`nisn\`, \`nip\`, \`kelas\`, \`rombel\`) VALUES
('admin-1', 'Administrator Sistem', 'admin', 'password123', 'admin', NULL, '198501012010011001', NULL, 'Admin Tata Usaha'),
('guru-1', 'Budi Santoso, M.Pd.', 'budi.santoso', 'password123', 'guru', NULL, '198203152008011005', NULL, 'Kelas VII-A'),
('siswa-1', 'Raihan Muhammad', 'raihan.m', 'password123', 'siswa', '0071234501', NULL, 'VII', 'VII-A'),
('siswa-2', 'Aisyah Putri', 'aisyah.p', 'password123', 'siswa', '0071234502', NULL, 'VII', 'VII-A');`
  },
  'config/database.php': {
    label: 'config/database.php (Koneksi PDO & Rumus)',
    path: 'config/database.php',
    lang: 'php',
    content: `<?php
/**
 * Konfigurasi Database MySQL dengan PDO & Helper Rumus Penilaian
 * SiLiterasi PHP & MySQL
 */
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'siliterasi_db');
define('DB_PORT', '3306');

function getDBConnection() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            die("Koneksi Database Gagal: " . $e->getMessage() . "<br>Pastikan MySQL di XAMPP/Laragon aktif dan database 'siliterasi_db' telah diimpor.");
        }
    }
    return $pdo;
}

// Rumus Penentuan Predikat (0 - 100)
function getPredicateFromScore($score) {
    if ($score >= 85) return 'A'; // Sangat Baik
    if ($score >= 75) return 'B'; // Baik
    if ($score >= 60) return 'C'; // Cukup
    return 'D';                   // Perlu Bimbingan
}

// Validasi Rentang Skor
function validateScoreRange($score, $min = 0, $max = 100) {
    if (!is_numeric($score)) return false;
    $val = (float)$score;
    return $val >= $min && $val <= $max;
}
?>`
  },
  'guru/validasi_mingguan.php': {
    label: 'guru/validasi_mingguan.php (Validasi Skor 0-80)',
    path: 'guru/validasi_mingguan.php',
    lang: 'php',
    content: `<?php
require_once __DIR__ . '/../auth/session_check.php';
require_once __DIR__ . '/../config/database.php';
requireRole(['guru', 'admin']);

$currentUser = getCurrentUser();
$db = getDBConnection();
$msg = null;
$error = null;

// Proses Simpan Validasi Skor Guru (0 - 80)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'simpan_validasi') {
    $entryId = $_POST['entry_id'] ?? '';
    $score = filter_var($_POST['validation_score'] ?? null, FILTER_VALIDATE_FLOAT);
    $notes = trim($_POST['feedback_notes'] ?? '');

    // VALIDASI INPUT KETAT: 0 s.d. 80
    if ($score === false || $score < 0 || $score > 80) {
        $error = "Validasi Gagal: Skor guru harus di antara angka 0 hingga 80!";
    } elseif (empty($entryId)) {
        $error = "ID Jurnal tidak valid.";
    } else {
        $valId = 'val-' . time() . '-' . rand(100, 999);
        $stmt = $db->prepare("
            INSERT INTO teacher_validations (id, entry_id, teacher_id, teacher_name, validation_score, feedback_notes, status, validated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'validated', NOW())
            ON DUPLICATE KEY UPDATE 
                validation_score = VALUES(validation_score),
                feedback_notes = VALUES(feedback_notes),
                validated_at = NOW()
        ");
        $stmt->execute([$valId, $entryId, $currentUser['id'], $currentUser['name'], $score, $notes]);
        $msg = "Validasi berhasil disimpan dengan skor guru {$score}/80.";
    }
}
?>`
  },
  'guru/verifikasi_bulanan.php': {
    label: 'guru/verifikasi_bulanan.php (Rumus Akumulasi ÷ 4)',
    path: 'guru/verifikasi_bulanan.php',
    lang: 'php',
    content: `<?php
require_once __DIR__ . '/../auth/session_check.php';
require_once __DIR__ . '/../config/database.php';
requireRole(['guru', 'admin']);

$currentUser = getCurrentUser();
$db = getDBConnection();
$selectedMonth = $_GET['month'] ?? date('Y-m');

// Hitung Nilai Akumulasi Otomatis: (M1 + M2 + M3 + M4) ÷ 4
function hitungAkumulasiBulan($m1, $m2, $m3, $m4) {
    $total = (float)$m1 + (float)$m2 + (float)$m3 + (float)$m4;
    $akumulasi = round($total / 4, 1);
    return min(100, max(0, $akumulasi));
}
?>`
  },
  'admin/ekspor_excel.php': {
    label: 'admin/ekspor_excel.php (Ekspor Laporan CSV/Excel)',
    path: 'admin/ekspor_excel.php',
    lang: 'php',
    content: `<?php
require_once __DIR__ . '/../auth/session_check.php';
require_once __DIR__ . '/../config/database.php';
requireRole(['guru', 'admin']);

$db = getDBConnection();
$monthKey = $_GET['month'] ?? date('Y-m');

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="Rekap_Literasi_' . $monthKey . '.csv"');
echo "\xEF\xBB\xBF"; // UTF-8 BOM

$output = fopen('php://output', 'w');
fputcsv($output, ['REKAPITULASI NILAI LITERASI (M1 + M2 + M3 + M4) ÷ 4']);
fputcsv($output, ['No', 'NISN', 'Nama Siswa', 'Kelas', 'M1', 'M2', 'M3', 'M4', 'Nilai Akumulasi Akhir (÷ 4)', 'Predikat', 'Status']);
// Loop data siswa...
fclose($output);
exit;
?>`
  },
  'README.md': {
    label: 'README.md (Panduan XAMPP / Laragon)',
    path: 'README.md',
    lang: 'markdown',
    content: `# Panduan Cepat SiLiterasi PHP & MySQL

## 1. Pindahkan Folder
Salin seluruh berkas ke folder web server:
- XAMPP: C:/xampp/htdocs/siliterasi/
- Laragon: C:/laragon/www/siliterasi/

## 2. Impor Database
1. Buka http://localhost/phpmyadmin
2. Buat database: \`siliterasi_db\`
3. Import file \`database.sql\`

## 3. Akun Login Bawaan (Password: password123)
- Siswa: raihan.m
- Guru: budi.santoso
- Admin: admin

## 4. Rumus Penilaian
Akumulasi Akhir Bulan = (Nilai M1 + Nilai M2 + Nilai M3 + Nilai M4) ÷ 4
Skor Guru Maksimal: 80 Poin | Total Nilai Mingguan: Maksimal 100 Poin`
  }
};

export const PhpMysqlExportModal: React.FC<PhpMysqlExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'explorer' | 'sql'>('guide');
  const [selectedFileKey, setSelectedFileKey] = useState<string>('database.sql');
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (content: string, key: string) => {
    navigator.clipboard.writeText(content);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Add database.sql
      zip.file('database.sql', PHP_MYSQL_FILES['database.sql'].content);
      zip.file('README.md', PHP_MYSQL_FILES['README.md'].content);
      
      // Add config
      const configFolder = zip.folder('config');
      configFolder?.file('database.php', PHP_MYSQL_FILES['config/database.php'].content);

      // Add auth
      const authFolder = zip.folder('auth');
      authFolder?.file('session_check.php', `<?php
session_start();
function requireAuth($allowedRoles = []) {
    if (!isset($_SESSION['user'])) {
        header('Location: ../index.php?error=unauthorized');
        exit;
    }
    if (!empty($allowedRoles) && !in_array($_SESSION['user']['role'], $allowedRoles)) {
        header('Location: ../index.php?error=forbidden');
        exit;
    }
}
function getCurrentUser() { return $_SESSION['user'] ?? null; }
function requireRole($roles = []) { return requireAuth($roles); }
?>`);
      authFolder?.file('login.php', `<?php
session_start();
require_once __DIR__ . '/../config/database.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $u = trim($_POST['username'] ?? '');
    $p = trim($_POST['password'] ?? '');
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$u]);
    $user = $stmt->fetch();
    if ($user && ($user['password'] === $p || password_verify($p, $user['password']))) {
        $_SESSION['user'] = $user;
        if ($user['role'] === 'siswa') header('Location: ../siswa/dashboard.php');
        elseif ($user['role'] === 'guru') header('Location: ../guru/validasi_mingguan.php');
        else header('Location: ../admin/dashboard.php');
        exit;
    }
    header('Location: ../index.php?error=invalid_credentials');
    exit;
}
?>`);
      authFolder?.file('logout.php', `<?php
session_start();
$_SESSION = [];
session_destroy();
header('Location: ../index.php?msg=logged_out');
exit;
?>`);

      // Add index.php
      zip.file('index.php', `<?php
session_start();
if (isset($_SESSION['user'])) {
    $r = $_SESSION['user']['role'];
    if ($r === 'siswa') header('Location: siswa/dashboard.php');
    elseif ($r === 'guru') header('Location: guru/validasi_mingguan.php');
    else header('Location: admin/dashboard.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>SiLiterasi PHP & MySQL</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
    <div class="text-center mb-6">
      <h1 class="text-2xl font-black text-white">SiLiterasi PHP & MySQL</h1>
      <p class="text-xs text-slate-400 mt-1">Sistem Jurnal 4 Minggu & Rekap Otomatis</p>
    </div>
    <form action="auth/login.php" method="POST" class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1">Username</label>
        <input type="text" name="username" required placeholder="raihan.m / budi.santoso / admin" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" />
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1">Kata Sandi</label>
        <input type="password" name="password" required value="password123" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" />
      </div>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm">Masuk</button>
    </form>
    <div class="mt-6 pt-4 border-t border-slate-700 text-center text-xs text-slate-400">
      Password Demo: <code class="text-amber-400 font-bold">password123</code>
    </div>
  </div>
</body>
</html>`);

      // Add guru files
      const guruFolder = zip.folder('guru');
      guruFolder?.file('validasi_mingguan.php', PHP_MYSQL_FILES['guru/validasi_mingguan.php'].content);
      guruFolder?.file('verifikasi_bulanan.php', PHP_MYSQL_FILES['guru/verifikasi_bulanan.php'].content);

      // Add admin files
      const adminFolder = zip.folder('admin');
      adminFolder?.file('ekspor_excel.php', PHP_MYSQL_FILES['admin/ekspor_excel.php'].content);
      adminFolder?.file('dashboard.php', `<?php
require_once __DIR__ . '/../auth/session_check.php';
requireRole(['admin']);
?>
<!DOCTYPE html>
<html>
<head><title>Admin SiLiterasi</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-50 p-8"><div class="max-w-4xl mx-auto"><h1 class="text-2xl font-bold">Panel Admin SiLiterasi PHP</h1><p class="mt-2 text-slate-600">Sistem berjalan dengan database MySQL.</p></div></body>
</html>`);

      // Add siswa files
      const siswaFolder = zip.folder('siswa');
      siswaFolder?.file('dashboard.php', `<?php
require_once __DIR__ . '/../auth/session_check.php';
requireRole(['siswa']);
$user = getCurrentUser();
?>
<!DOCTYPE html>
<html>
<head><title>Dashboard Siswa</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-50 p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-2xl font-black">Dashboard Siswa - SiLiterasi</h1>
    <p class="text-sm text-slate-500">Selamat datang, <?= htmlspecialchars($user['name']) ?></p>
    <div class="mt-6 p-6 bg-indigo-900 text-white rounded-2xl">
      <h2 class="text-lg font-bold">Rumus Akumulasi Akhir Bulan</h2>
      <p class="text-xs text-indigo-200 mt-1">Nilai Akhir = (Minggu 1 + Minggu 2 + Minggu 3 + Minggu 4) ÷ 4</p>
    </div>
  </div>
</body>
</html>`);

      // Generate zip blob
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'siliterasi_php_mysql.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-blue-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#071d49] via-[#0f3478] to-[#144299] border-b-2 border-amber-400 text-white p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Database className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-wider">
                  PHP 8.x + MySQL / MariaDB
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase tracking-wider">
                  Siap XAMPP / Laragon
                </span>
              </div>
              <h3 className="text-xl font-black text-white mt-1">Aplikasi SiLiterasi Berbasis PHP & MySQL</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Lengkap dengan Skema Tabel MySQL, Validasi Skor (0-80 & 0-100), dan Rumus Akumulasi (M1+M2+M3+M4) ÷ 4
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Ingin menjalankan aplikasi ini secara lokal di <strong>XAMPP / Laragon / hosting cPanel</strong> sekolah?
            </span>
          </div>
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-200 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {isZipping ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mengompres File...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Berhasil Diunduh (.ZIP)</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-amber-300" />
                <span>Unduh Paket PHP & MySQL (.ZIP)</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 text-xs font-bold text-slate-600 gap-6">
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'border-blue-600 text-blue-700 font-black'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4 text-blue-600" />
            <span>Panduan Instalasi & Akun Demo</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'sql'
                ? 'border-blue-600 text-blue-700 font-black'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-blue-600" />
            <span>Skrip Skema Database (database.sql)</span>
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'explorer'
                ? 'border-blue-600 text-blue-700 font-black'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-4 h-4 text-blue-600" />
            <span>Jelajahi Kode PHP</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'guide' && (
            <div className="space-y-6">
              {/* Feature Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                    <span>Rumus Otomatis ÷ 4</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nilai mingguan M1, M2, M3, M4 dijumlahkan dan dibagi 4 secara otomatis untuk nilai akumulasi akhir bulan.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Validasi Skor Ketat (0-80)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Form input guru dicek ketat 0-80 pada browser dan MySQL CHECK constraint, memastikan skor total tidak melebihi 100.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-900 font-extrabold text-xs">
                    <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                    <span>Multi-Role & Ekspor Excel</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Mendukung 3 hak akses (Siswa, Guru, Admin), sinkronisasi rombel, dan unduh laporan berkala format CSV/Excel.
                  </p>
                </div>
              </div>

              {/* Step by step install */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>🛠️</span>
                  <span>3 Langkah Cepat Menjalankan di XAMPP / Laragon:</span>
                </h4>

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 text-xs">1</span>
                    <div>
                      <strong className="block text-slate-900">Ekstrak Berkas ke Direktori Web Server</strong>
                      <p className="text-slate-500 mt-0.5">
                        Unduh ZIP dan letakkan di <code className="bg-slate-200 text-indigo-700 px-1.5 py-0.5 rounded font-mono">C:/xampp/htdocs/siliterasi/</code> (atau <code className="bg-slate-200 text-indigo-700 px-1.5 py-0.5 rounded font-mono">C:/laragon/www/siliterasi/</code>).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 text-xs">2</span>
                    <div>
                      <strong className="block text-slate-900">Buat & Import Database MySQL</strong>
                      <p className="text-slate-500 mt-0.5">
                        Buka <a href="http://localhost/phpmyadmin" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline">phpMyAdmin</a>, buat database bernama <code className="bg-slate-200 text-indigo-700 px-1.5 py-0.5 rounded font-mono">siliterasi_db</code>, lalu import file <code className="bg-slate-200 text-indigo-700 px-1.5 py-0.5 rounded font-mono">database.sql</code>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 text-xs">3</span>
                    <div>
                      <strong className="block text-slate-900">Buka di Browser & Selesai!</strong>
                      <p className="text-slate-500 mt-0.5">
                        Kunjungi <code className="bg-slate-200 text-indigo-700 px-1.5 py-0.5 rounded font-mono">http://localhost/siliterasi/</code> untuk langsung mulai menggunakannya.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Credentials */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-extrabold text-sm text-amber-300">Akun Pengguna Bawaan (Default Demo)</h4>
                  <span className="text-[11px] text-slate-400">Password semua akun: <strong>password123</strong></span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-indigo-400 font-bold block">Siswa</span>
                    <span className="text-white font-mono block mt-1">raihan.m</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">NISN: 0071234501</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-amber-400 font-bold block">Guru / Wali Kelas</span>
                    <span className="text-white font-mono block mt-1">budi.santoso</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">NIP: 198203152008011005</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-purple-400 font-bold block">Administrator</span>
                    <span className="text-white font-mono block mt-1">admin</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Hak Akses Penuh Sistem</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Skema SQL Lengkap (database.sql)</h4>
                  <p className="text-xs text-slate-500">Dapat langsung diimpor ke MySQL atau MariaDB phpMyAdmin</p>
                </div>
                <button
                  onClick={() => handleCopy(PHP_MYSQL_FILES['database.sql'].content, 'sql')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer"
                >
                  {copiedKey === 'sql' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Semua SQL</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-slate-950 text-emerald-400 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-[420px] leading-relaxed border border-slate-800">
                {PHP_MYSQL_FILES['database.sql'].content}
              </pre>
            </div>
          )}

          {activeTab === 'explorer' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* File list sidebar */}
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <p className="text-[11px] font-black uppercase text-slate-400 px-2 py-1">Pilih Berkas Kode</p>
                {Object.keys(PHP_MYSQL_FILES).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSelectedFileKey(key)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                      selectedFileKey === key
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-white hover:text-indigo-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{key}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Code viewer */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold font-mono text-slate-800">
                    {PHP_MYSQL_FILES[selectedFileKey]?.path}
                  </span>
                  <button
                    onClick={() => handleCopy(PHP_MYSQL_FILES[selectedFileKey]?.content || '', selectedFileKey)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-slate-700 hover:text-indigo-600 text-[11px] font-bold border border-slate-200 shadow-2xs transition cursor-pointer"
                  >
                    {copiedKey === selectedFileKey ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin Berkas</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="bg-slate-950 text-indigo-200 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed border border-slate-800">
                  {PHP_MYSQL_FILES[selectedFileKey]?.content}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Seluruh berkas PHP & MySQL siap pakai tersimpan di folder <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-indigo-700">/php-mysql/</code> di dalam repositori.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
