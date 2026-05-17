<?php
header('Content-Type: application/json');
require 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$name = trim($data['name']  ?? '');
$email = trim($data['email'] ?? ''); //same as login
$password = trim($data['password'] ?? '');

if (!$name || !$email || !$password) { //validate input
    echo json_encode(['success' => false, 'error' => 'Missing fields']);
    exit;
}

try {
    // Check if username already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$name]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'error' => 'Username already taken']);
        exit;
    }

    //Hash  password 
    $hashed = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
    $stmt->execute([$name, $email, $hashed]);
    echo json_encode(['success' => true]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>