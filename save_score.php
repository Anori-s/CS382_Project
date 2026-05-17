<?php
header('Content-Type: application/json');
require 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$name = trim($data['name']  ?? '');
$score = intval($data['score'] ?? 0);

if (!$name) {
    echo json_encode(['success' => false, 'error' => 'No name']);
    exit;
}

try {
    // Find the user
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$name]);
    $user = $stmt->fetch();

    // if user doesn't exist error
    if (!$user) {
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

    $userId = $user['id'];
    // Save the score
    $stmt = $pdo->prepare("INSERT INTO scores (user_id, score) VALUES (?, ?)");
    $stmt->execute([$userId, $score]);

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>