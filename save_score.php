<?php
header('Content-Type: application/json');
require 'db.php';

class Score {
    private PDO $pdo; 
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    //Lookfor username and return id
    // id= int, null if user doesn't exist
    public function getUserId(string $username): ?int {
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        return $user ? (int) $user['id'] : null;
    }

    //Insert 
    public function save(int $userId, int $score): bool {
        $stmt = $this->pdo->prepare("INSERT INTO scores (user_id, score) VALUES (?, ?)");
        return $stmt->execute([$userId, $score]);
    }
}


$data = json_decode(file_get_contents('php://input'), true);
$name = trim($data['name']  ?? '');
$scoreValue = intval($data['score'] ?? 0);

if (!$name) {
    echo json_encode(['success' => false, 'error' => 'No name']);
    exit;
}

try {
    $score = new Score($pdo); 

    // Find id
    $userId = $score->getUserId($name);

    // user  not found = error
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

    // Save the score 
    $score->save($userId, $scoreValue);
    echo json_encode(['success' => true]);

} catch (PDOException $e) {
    error_log('Score save error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Something went wrong. Please try again.']);
}
?>