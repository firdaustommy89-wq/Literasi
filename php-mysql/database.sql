-- ========================================================
-- DATABASE SCHEMA: SILITERASI (Sistem Informasi Literasi Sekolah)
-- Versi: PHP & MySQL (MariaDB / MySQL 5.7+ / 8.0+)
-- Fitur: Multi-role (Siswa, Guru, Admin), Jurnal Literasi,
--        Validasi 4 Minggu, Rumus Akumulasi (M1+M2+M3+M4)/4,
--        Validasi Skor (0-80 & 0-100), Sinkronisasi Rombel
-- ========================================================

CREATE DATABASE IF NOT EXISTS `siliterasi_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `siliterasi_db`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `monthly_verifications`;
DROP TABLE IF EXISTS `teacher_validations`;
DROP TABLE IF EXISTS `literacy_entries`;
DROP TABLE IF EXISTS `academic_settings`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------
-- 1. Tabel Pengguna (Users)
-- --------------------------------------------------------
CREATE TABLE `users` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('siswa', 'guru', 'admin') NOT NULL DEFAULT 'siswa',
  `nisn` VARCHAR(30) NULL,
  `nip` VARCHAR(30) NULL,
  `kelas` ENUM('10', '11', '12') NULL,
  `rombel` VARCHAR(60) NULL,
  `avatar` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_kelas_rombel` (`kelas`, `rombel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Tabel Pengaturan Tahun Ajaran & Semester
-- --------------------------------------------------------
CREATE TABLE `academic_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `academic_year` VARCHAR(20) NOT NULL DEFAULT '2026/2027',
  `semester` ENUM('Ganjil', 'Genap') NOT NULL DEFAULT 'Ganjil',
  `school_name` VARCHAR(150) NOT NULL DEFAULT 'SMA Negeri 1 Literasi',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Tabel Jurnal Literasi Siswa
-- --------------------------------------------------------
CREATE TABLE `literacy_entries` (
  `id` VARCHAR(60) NOT NULL,
  `student_id` VARCHAR(50) NOT NULL,
  `student_name` VARCHAR(150) NOT NULL,
  `student_nisn` VARCHAR(30) NULL,
  `student_kelas` ENUM('10', '11', '12') NOT NULL,
  `student_rombel` VARCHAR(60) NOT NULL,
  `academic_year` VARCHAR(20) NOT NULL DEFAULT '2026/2027',
  `semester` ENUM('Ganjil', 'Genap') NOT NULL DEFAULT 'Ganjil',
  `book_title` VARCHAR(255) NOT NULL,
  `reading_category` VARCHAR(100) NOT NULL,
  `literacy_type` ENUM('Non Mapel', 'Kitab Suci') NOT NULL DEFAULT 'Non Mapel',
  `pages_read` VARCHAR(100) NOT NULL,
  `duration_minutes` INT NOT NULL DEFAULT 15,
  `summary` TEXT NOT NULL,
  `moral_value` TEXT NOT NULL,
  `photo_url` TEXT NULL,
  `date` DATE NOT NULL,
  `week_number` TINYINT NOT NULL COMMENT 'Minggu ke 1-4 dalam bulan kalender',
  `month_key` VARCHAR(7) NOT NULL COMMENT 'Format YYYY-MM contoh: 2026-10',
  `peer_discussion` TINYINT(1) NOT NULL DEFAULT 0,
  `peer_discussion_notes` TEXT NULL,
  `reflection_q1` TINYINT NOT NULL DEFAULT 5 COMMENT 'Skor 1-5 (Pemahaman pesan utama)',
  `reflection_q2` TINYINT NOT NULL DEFAULT 5 COMMENT 'Skor 1-5 (Nilai kebaikan)',
  `reflection_q3` TINYINT NOT NULL DEFAULT 5 COMMENT 'Skor 1-5 (Dorongan perilaku positif)',
  `reflection_q4` TINYINT NOT NULL DEFAULT 5 COMMENT 'Skor 1-5 (Kesadaran diri)',
  `reflection_score` DECIMAL(4,1) NOT NULL DEFAULT 20.0 COMMENT 'Maksimal 20 poin',
  `total_final_score` DECIMAL(5,1) NULL COMMENT 'Maksimal 100 poin (Refleksi + Validasi Guru)',
  `is_late_submission` TINYINT(1) NOT NULL DEFAULT 0,
  `late_reason` VARCHAR(255) NULL,
  `system_input_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_entries_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_entries_student_month_week` (`student_id`, `month_key`, `week_number`),
  INDEX `idx_entries_rombel` (`student_rombel`),
  INDEX `idx_entries_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Tabel Validasi Mingguan oleh Guru
-- --------------------------------------------------------
CREATE TABLE `teacher_validations` (
  `id` VARCHAR(60) NOT NULL,
  `entry_id` VARCHAR(60) NOT NULL UNIQUE,
  `teacher_id` VARCHAR(50) NOT NULL,
  `teacher_name` VARCHAR(150) NOT NULL,
  `teacher_nip` VARCHAR(30) NULL,
  `validation_score` DECIMAL(4,1) NOT NULL COMMENT 'Maksimal 80 poin (Check: 0 <= score <= 80)',
  `feedback_notes` TEXT NOT NULL,
  `status` ENUM('validated', 'needs_revision') NOT NULL DEFAULT 'validated',
  `validated_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_val_entry` FOREIGN KEY (`entry_id`) REFERENCES `literacy_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_val_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_validation_score_range` CHECK (`validation_score` >= 0 AND `validation_score` <= 80)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Tabel Verifikasi & Nilai Akumulasi Akhir Bulan
-- --------------------------------------------------------
CREATE TABLE `monthly_verifications` (
  `id` VARCHAR(80) NOT NULL COMMENT 'Format: studentId_monthKey',
  `student_id` VARCHAR(50) NOT NULL,
  `student_name` VARCHAR(150) NOT NULL,
  `student_nisn` VARCHAR(30) NULL,
  `student_kelas` ENUM('10', '11', '12') NOT NULL,
  `student_rombel` VARCHAR(60) NOT NULL,
  `academic_year` VARCHAR(20) NOT NULL DEFAULT '2026/2027',
  `semester` ENUM('Ganjil', 'Genap') NOT NULL DEFAULT 'Ganjil',
  `month_key` VARCHAR(7) NOT NULL,
  `completed_weeks` TINYINT NOT NULL DEFAULT 0 COMMENT 'Jumlah minggu yang terisi jurnal (0-4)',
  `week1_score` DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  `week2_score` DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  `week3_score` DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  `week4_score` DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  `accumulated_score` DECIMAL(5,1) NOT NULL COMMENT 'Rumus: (M1 + M2 + M3 + M4) ÷ 4, rentang 0-100',
  `predicate` ENUM('A', 'B', 'C', 'D') NOT NULL DEFAULT 'D',
  `teacher_id` VARCHAR(50) NOT NULL,
  `teacher_name` VARCHAR(150) NOT NULL,
  `teacher_notes` TEXT NOT NULL,
  `verified_at` DATETIME NOT NULL,
  `status` ENUM('verified', 'pending') NOT NULL DEFAULT 'verified',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_monthly_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_monthly_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_accumulated_score_range` CHECK (`accumulated_score` >= 0 AND `accumulated_score` <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Data Awal Default (Seed Data)
-- --------------------------------------------------------
INSERT INTO `academic_settings` (`id`, `academic_year`, `semester`, `school_name`) 
VALUES (1, '2026/2027', 'Ganjil', 'SMA Negeri 1 Literasi')
ON DUPLICATE KEY UPDATE `academic_year` = '2026/2027';

-- Akun Pengguna Default:
-- Password default: 'password123' (Gunakan password_hash() untuk produksi)
INSERT INTO `users` (`id`, `name`, `username`, `password`, `role`, `nisn`, `nip`, `kelas`, `rombel`) VALUES
('user-admin-1', 'Administrator Sistem', 'admin', 'password123', 'admin', NULL, '198501012010011001', NULL, 'Kantor Tata Usaha / Admin'),
('user-guru-1', 'Budi Santoso, M.Pd.', 'budi.santoso', 'password123', 'guru', NULL, '198203152008011005', NULL, 'Dewan Guru Pembimbing'),
('user-guru-2', 'Siti Rahmawati, S.Pd.', 'siti.rahmawati', 'password123', 'guru', NULL, '198706202012022003', NULL, 'Dewan Guru Pembimbing'),
('user-siswa-1', 'Raihan Muhammad', 'raihan.m', 'password123', 'siswa', '0071234501', NULL, '10', 'X MIPA 1'),
('user-siswa-2', 'Aisyah Putri', 'aisyah.p', 'password123', 'siswa', '0071234502', NULL, '10', 'X MIPA 1'),
('user-siswa-3', 'Dimas Prasetyo', 'dimas.p', 'password123', 'siswa', '0061234503', NULL, '11', 'XI MIPA 2'),
('user-siswa-4', 'Zahra Amelia', 'zahra.a', 'password123', 'siswa', '0051234504', NULL, '12', 'XII MIPA 1')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Contoh Jurnal Literasi untuk Siswa Raihan (Bulan Ini)
INSERT INTO `literacy_entries` (
  `id`, `student_id`, `student_name`, `student_nisn`, `student_kelas`, `student_rombel`, 
  `book_title`, `reading_category`, `literacy_type`, `pages_read`, `duration_minutes`, 
  `summary`, `moral_value`, `photo_url`, `date`, `week_number`, `month_key`, 
  `reflection_q1`, `reflection_q2`, `reflection_q3`, `reflection_q4`, `reflection_score`, `total_final_score`
) VALUES 
('entry-demo-1', 'user-siswa-1', 'Raihan Muhammad', '0071234501', '10', 'X MIPA 1', 
 'Laskar Pelangi', 'Novel Inspiratif', 'Non Mapel', 'Hal. 1 - 45', 30, 
 'Kisah perjuangan sepuluh anak di Belitung dalam menuntut ilmu di tengah keterbatasan fasilitas sekolah.', 
 'Semangat pantang menyerah dan persahabatan sejati mampu menaklukkan kesulitan hidup.', 
 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80', 
 '2026-10-04', 1, '2026-10', 5, 5, 5, 5, 20.0, 95.0),
('entry-demo-2', 'user-siswa-1', 'Raihan Muhammad', '0071234501', '10', 'X MIPA 1', 
 'Bumi Manusia', 'Sastra Sejarah', 'Non Mapel', 'Hal. 50 - 90', 35, 
 'Kisah Minke yang memperjuangkan keadilan dan harkat martabat manusia di era kolonial Hindia Belanda.', 
 'Pendidikan harus memerdekakan pikiran dan menumbuhkan rasa kemanusiaan.', 
 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80', 
 '2026-10-11', 2, '2026-10', 5, 5, 5, 4, 19.0, 94.0);

-- Validasi Guru untuk Minggu 1 & 2
INSERT INTO `teacher_validations` (`id`, `entry_id`, `teacher_id`, `teacher_name`, `teacher_nip`, `validation_score`, `feedback_notes`, `status`, `validated_at`) VALUES
('val-demo-1', 'entry-demo-1', 'user-guru-1', 'Budi Santoso, M.Pd.', '198203152008011005', 75.0, 'Analisis karakter sangat tajam dan refleksi moral dipahami dengan baik.', 'validated', '2026-10-05 10:00:00'),
('val-demo-2', 'entry-demo-2', 'user-guru-1', 'Budi Santoso, M.Pd.', '198203152008011005', 75.0, 'Ringkasan runtut, relevan dengan konteks kebangsaan.', 'validated', '2026-10-12 11:30:00');
