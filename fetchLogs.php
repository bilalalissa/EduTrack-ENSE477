<?php
require_once("db.php");

header('Content-Type: application/json');

session_start();
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'User not logged in.']);
    exit;
}

$user_id = $_SESSION['user_id']; // Get the logged-in user's ID

try {
    $stmt = $conn->prepare("SELECT log_time, log_data FROM Logs WHERE user_id = :user_id ORDER BY log_time DESC");
    $stmt->execute(['user_id' => $user_id]);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Return logs as JSON
    echo json_encode(['success' => true, 'logs' => $logs]);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>