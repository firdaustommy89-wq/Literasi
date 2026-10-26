<?php
session_start();
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (empty($username) || empty($password)) {
        header('Location: ../index.php?error=empty_fields');
        exit;
    }

    $pdo = getDBConnection();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :username LIMIT 1");
    $stmt->execute(['username' => $username]);
    $user = $stmt->fetch();

    if ($user && ($user['password'] === $password || password_verify($password, $user['password']))) {
        $_SESSION['user'] = [
            'id' => $user['id'],
            'name' => $user['name'],
            'username' => $user['username'],
            'role' => $user['role'],
            'nisn' => $user['nisn'],
            'nip' => $user['nip'],
            'kelas' => $user['kelas'],
            'rombel' => $user['rombel'],
        ];

        if ($user['role'] === 'siswa') {
            header('Location: ../siswa/dashboard.php');
        } elseif ($user['role'] === 'guru') {
            header('Location: ../guru/validasi_mingguan.php');
        } elseif ($user['role'] === 'admin') {
            header('Location: ../admin/dashboard.php');
        } else {
            header('Location: ../index.php');
        }
        exit;
    } else {
        header('Location: ../index.php?error=invalid_credentials');
        exit;
    }
} else {
    header('Location: ../index.php');
    exit;
}
?>
