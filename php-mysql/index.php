<?php
session_start();
if (isset($_SESSION['user'])) {
    $role = $_SESSION['user']['role'];
    if ($role === 'siswa') header('Location: siswa/dashboard.php');
    elseif ($role === 'guru') header('Location: guru/validasi_mingguan.php');
    elseif ($role === 'admin') header('Location: admin/dashboard.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SiLiterasi - Portal Masuk Literasi Sekolah (PHP & MySQL)</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 min-h-screen text-slate-100 flex flex-col justify-between p-4 sm:p-6">
  
  <!-- Header -->
  <header class="max-w-5xl mx-auto w-full flex items-center justify-between py-3 border-b border-white/10">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-indigo-500 flex items-center justify-center font-black text-slate-950 shadow-md">
        SL
      </div>
      <div>
        <h1 class="font-extrabold text-base tracking-tight text-white">SiLiterasi PHP & MySQL</h1>
        <p class="text-xs text-indigo-300">Sistem Jurnal & Penilaian Literasi 4 Minggu</p>
      </div>
    </div>
    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
      MySQL Database Ready
    </span>
  </header>

  <!-- Main Login Card -->
  <main class="max-w-md w-full mx-auto my-8 bg-white/10 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/20 shadow-2xl">
    <div class="text-center mb-6">
      <span class="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
        Portal Masuk Pengguna
      </span>
      <h2 class="text-2xl font-black text-white mt-2">Masuk ke SiLiterasi</h2>
      <p class="text-xs text-slate-300 mt-1">Gunakan akun Siswa, Guru Pembimbing, atau Admin</p>
    </div>

    <?php if (isset($_GET['error'])): ?>
      <div class="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
        <?php 
          if ($_GET['error'] === 'invalid_credentials') echo 'Username atau kata sandi tidak cocok.';
          elseif ($_GET['error'] === 'empty_fields') echo 'Harap isi semua kolom.';
          elseif ($_GET['error'] === 'unauthorized') echo 'Silakan login terlebih dahulu.';
          else echo 'Terjadi kesalahan sistem.';
        ?>
      </div>
    <?php endif; ?>

    <?php if (isset($_GET['msg']) && $_GET['msg'] === 'logged_out'): ?>
      <div class="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs">
        Anda telah berhasil keluar (logout).
      </div>
    <?php endif; ?>

    <form action="auth/login.php" method="POST" class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1">Username Akun</label>
        <input 
          type="text" 
          name="username" 
          id="username"
          required 
          placeholder="Contoh: raihan.m atau budi.santoso" 
          class="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white placeholder-slate-400 text-sm focus:border-indigo-400 outline-none"
        />
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1">Kata Sandi</label>
        <input 
          type="password" 
          name="password" 
          id="password"
          required 
          value="password123"
          class="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white text-sm focus:border-indigo-400 outline-none"
        />
      </div>

      <button 
        type="submit" 
        class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer mt-2"
      >
        Masuk ke Sistem
      </button>
    </form>

    <!-- Quick Demo Accounts -->
    <div class="mt-6 pt-5 border-t border-white/10 text-xs text-slate-300">
      <div class="font-bold text-slate-200 mb-2">Akun Demo (Klik untuk isi cepat):</div>
      <div class="grid grid-cols-3 gap-2">
        <button 
          type="button" 
          onclick="fillCreds('raihan.m', 'password123')"
          class="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-center"
        >
          <strong class="block text-indigo-300">Siswa</strong>
          <span class="text-[10px] text-slate-400">raihan.m</span>
        </button>
        <button 
          type="button" 
          onclick="fillCreds('budi.santoso', 'password123')"
          class="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-center"
        >
          <strong class="block text-amber-300">Guru</strong>
          <span class="text-[10px] text-slate-400">budi.santoso</span>
        </button>
        <button 
          type="button" 
          onclick="fillCreds('admin', 'password123')"
          class="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-center"
        >
          <strong class="block text-purple-300">Admin</strong>
          <span class="text-[10px] text-slate-400">admin</span>
        </button>
      </div>
    </div>
  </main>

  <footer class="max-w-5xl mx-auto w-full text-center text-xs text-slate-400 py-3">
    SiLiterasi PHP & MySQL &bull; Siap digunakan di XAMPP / Laragon / Web Hosting cPanel
  </footer>

  <script>
    function fillCreds(u, p) {
      document.getElementById('username').value = u;
      document.getElementById('password').value = p;
    }
  </script>
</body>
</html>
