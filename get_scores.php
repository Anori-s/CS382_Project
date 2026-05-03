<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require 'db.php';

try {
    $stmt = $pdo->query("
        SELECT users.username AS player_name, 
               scores.score, 
               scores.created_at 
        FROM scores 
        JOIN users ON scores.user_id = users.id 
        ORDER BY scores.score DESC 
        LIMIT 10
    ");
    $scores = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($scores);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load scores']);
}
?>