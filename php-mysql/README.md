# SiLiterasi SMP - Aplikasi Jurnal Literasi Berbasis PHP & MySQL

Aplikasi manajemen dan rekapitulasi jurnal literasi mingguan untuk jenjang SMP dengan rumus penilaian otomatis dan validasi skor terstandar.

---

## 🌟 Fitur Utama

1. **Autentikasi Multi-Role (3 Peran):**
   - **Siswa**: Input jurnal mingguan (Minggu 1 s.d. 4) dengan 4 butir refleksi (otomatis max 20 poin), dashboard akumulasi nilai bulanan, kartu status mingguan.
   - **Guru / Wali Kelas**: Validasi jurnal mingguan siswa dengan input skor **0 s.d. 80 poin** (total mingguan maks 100), rekap nilai bulanan otomatis, kunci status verifikasi.
   - **Administrator**: Kelola tahun ajaran & semester aktif, sinkronisasi rombel, kenaikan kelas massal, ekspor laporan rekap ke file CSV/Excel.

2. **Rumus Penilaian Akumulasi Akhir Bulan:**
   $$\text{Nilai Akhir} = \frac{\text{Nilai Minggu 1} + \text{Nilai Minggu 2} + \text{Nilai Minggu 3} + \text{Nilai Minggu 4}}{4}$$
   - Nilai akhir otomatis dihitung dan ditampilkan di dashboard siswa, panel guru, dan ekspor Excel.
   - Konversi Predikat Otomatis:
     - **86 - 100**: Sangat Baik (A)
     - **71 - 85**: Baik (B)
     - **56 - 70**: Cukup (C)
     - **0 - 55**: Perlu Bimbingan (D)

3. **Validasi Input Ketat (0 - 80 & 0 - 100):**
   - Input skor guru divalidasi tidak boleh bernilai negatif atau melebihi 80 baik pada browser (JavaScript) maupun server (PHP PDO & MySQL CHECK constraint).
   - Total nilai mingguan dan nilai akumulasi tidak akan pernah melampaui 100.

---

## 📁 Struktur Direktori & File

```
php-mysql/
├── database.sql                  # Skrip pembuatan tabel MySQL & data awal demo
├── index.php                     # Halaman landing & form login multi-role
├── README.md                     # Panduan instalasi dan dokumentasi
├── config/
│   └── database.php              # Koneksi PDO MySQL & fungsi helper rumus
├── auth/
│   ├── session_check.php         # Middleware cek login & hak akses role
│   ├── login.php                 # Handler proses login
│   └── logout.php                # Handler logout & hancurkan sesi
├── siswa/
│   ├── dashboard.php             # Dashboard siswa, riwayat & kartu minggu 1-4
│   └── tambah_jurnal.php         # Form kirim jurnal mingguan + 4 refleksi
├── guru/
│   ├── validasi_mingguan.php     # Validasi skor guru 0-80 & catatan
│   └── verifikasi_bulanan.php    # Rekapitulasi nilai (M1+M2+M3+M4)/4 & predikat
└── admin/
    ├── dashboard.php             # Statistik sistem & tahun ajaran aktif
    ├── sinkron_rombel.php        # Kenaikan kelas massal & mutasi siswa
    └── ekspor_excel.php          # Unduh rekapitulasi nilai ke format Excel/CSV
```

---

## 🛠️ Langkah Instalasi di XAMPP / Laragon

### 1. Salin Berkas ke Web Server
- Jika memakai **XAMPP**: Pindahkan seluruh isi folder `php-mysql/` ke `C:/xampp/htdocs/siliterasi/`
- Jika memakai **Laragon**: Pindahkan ke `C:/laragon/www/siliterasi/`
- Jika memakai **Linux/cPanel**: Unggah ke folder `public_html/` atau direktori virtual host Anda.

### 2. Impor Database ke MySQL
1. Buka browser dan akses **phpMyAdmin** (misalnya `http://localhost/phpmyadmin`).
2. Buat database baru bernama **`db_siliterasi`** dengan collation `utf8mb4_general_ci`.
3. Klik tab **Import**, pilih file **`database.sql`** yang ada di dalam paket, lalu klik **Go / Kirim**.

### 3. Konfigurasi Koneksi Database
Buka file `config/database.php` menggunakan text editor (VS Code, Notepad++, dll). Sesuaikan parameter jika diperlukan:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');      // Ganti dengan username MySQL Anda
define('DB_PASS', '');          // Ganti dengan password MySQL Anda
define('DB_NAME', 'db_siliterasi');
```

### 4. Jalankan Aplikasi
Buka browser dan buka:
```
http://localhost/siliterasi/
```

---

## 👥 Akun Demo Bawaan

| Role | Username / NISN / NIP | Password | Keterangan |
|------|-----------------------|----------|------------|
| **Siswa** | `siswa1` (NISN: 0081234567) | `password` | Siswa Kelas VII-A |
| **Siswa** | `siswa2` (NISN: 0081234568) | `password` | Siswa Kelas VII-A |
| **Guru** | `guru1` (NIP: 198501012010011001) | `password` | Guru / Wali Kelas VII-A |
| **Admin** | `admin` | `password` | Pengelola Sistem |

*(Semua password demo adalah `password`)*
