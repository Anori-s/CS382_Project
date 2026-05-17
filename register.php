<?php
header('Content-Type: application/json');
require 'db.php';

class User {
    private PDO $pdo; //private
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    //Check if a username already exists in the database
    //Returns true if found, false if not
    public function exists(string $username): bool {
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        return (bool) $stmt->fetch();
    }

    //Validate not empty
    public function validate(string $username, string $email, string $password): bool {
        return $username !== '' && $email !== '' && $password !== '';
    }

    //Hash password 
    public function create(string $username, string $email, string $password): bool {
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->pdo->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
        return $stmt->execute([$username, $email, $hashed]);
    }
}

$data = json_decode(file_get_contents('php://input'), true);
$name  = trim($data['name']  ?? '');
$email = trim($data['email']  ?? ''); // same as login
$password = trim($data['password'] ?? '');

try {
    $user = new User($pdo); // create a User object pass to pdo

    // Validate input using method
    if (!$user->validate($name, $email, $password)) {
        echo json_encode(['success' => false, 'error' => 'Missing fields']);
        exit;
    }

    // Check for duplicate username using method
    if ($user->exists($name)) {
        echo json_encode(['success' => false, 'error' => 'Username already taken']);
        exit;
    }

    //Create the user
    $user->create($name, $email, $password);
    echo json_encode(['success' => true]);

} catch (PDOException $e) {
    error_log('Registration error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Something went wrong. Please try again.']);
}
?>