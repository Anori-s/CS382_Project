<?php
header('Content-Type: application/json');
require 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$name = trim($data['name'] ?? '');//get name form req, default empty
$password = trim($data['password'] ?? '');

if (!$name || !$password) { //validate input
    echo json_encode(['success' => false]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT password FROM users WHERE username = ?");//pdo - query
    $stmt->execute([$name]);
    $user = $stmt->fetch(); //fetch user by name

    // password_verify checks the hashed password 
    if ($user && password_verify($password, $user['password'])) {//if user exists and password matches
        echo json_encode(['success' => true]);//login success
    } else {
        echo json_encode(['success' => false]);//login failed
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false]);//error
}
?>