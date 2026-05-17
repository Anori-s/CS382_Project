<?php
// db.php
$host = 'localhost';
$dbname = 'pacman_db';
$user = 'root';   // XAMPP default
$pass = 'Norah123';       // XAMPP default (empty)

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}