<?php
/**
 * Konfigurasi Database MySQL dengan PDO
 * Sistem Informasi Literasi Siswa (SiLiterasi)
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
            die("Koneksi Database Gagal: " . $e->getMessage() . "<br>Pastikan MySQL aktif dan database 'siliterasi_db' telah diimpor via phpMyAdmin.");
        }
    }
    return $pdo;
}

// Helper Menentukan Minggu Berdasarkan Tanggal (1-4)
function getWeekNumberFromDate($dateStr) {
    $day = (int)date('j', strtotime($dateStr));
    if ($day <= 7) return 1;
    if ($day <= 14) return 2;
    if ($day <= 21) return 3;
    return 4;
}

// Helper Predikat Berdasarkan Nilai (0 - 100)
function getPredicateFromScore($score) {
    if ($score >= 85) return 'A';
    if ($score >= 75) return 'B';
    if ($score >= 60) return 'C';
    return 'D';
}

// Helper Validasi Rentang Skor
function validateScoreRange($score, $min = 0, $max = 100) {
    if (!is_numeric($score)) return false;
    $val = (float)$score;
    return $val >= $min && $val <= $max;
}
?>
