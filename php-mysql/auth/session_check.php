<?php
// Session & Auth Middleware
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function requireAuth($allowedRoles = []) {
    if (!isset($_SESSION['user'])) {
        header('Location: ../index.php?error=unauthorized');
        exit;
    }
    
    if (!empty($allowedRoles)) {
        $userRole = $_SESSION['user']['role'];
        if (!in_array($userRole, $allowedRoles)) {
            header('Location: ../index.php?error=forbidden');
            exit;
        }
    }
}

function getCurrentUser() {
    return $_SESSION['user'] ?? null;
}

function requireRole($allowedRoles = []) {
    return requireAuth($allowedRoles);
}
?>
