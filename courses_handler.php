<?php
// courses_handler.php
session_start();
require_once("db.php");

if (!isset($_SESSION['loggedinID'])) {
    echo json_encode(['status' => 'error', 'message' => 'User not logged in']);
    exit;
}

$user_id = $_SESSION['loggedinID'];
$action = $_POST['action'] ?? '';

if ($action === 'add') {
    // Get and sanitize inputs.
    $courseName  = trim($_POST['courseName'] ?? '');
    $courseNotes = trim($_POST['courseNotes'] ?? '');
    $start_date = trim($_POST['start_date'] ?? '');
    
    if (empty($courseName) || empty($start_date)) {
        echo json_encode(['status' => 'error', 'message' => 'Course name and start date are required.']);
        exit;
    }
    
    // Insert the new Course record.
    $stmt = $conn->prepare("INSERT INTO Courses (start_date, user_id, courseName, courseNotes) VALUES (:start_date, :user_id, :courseName, :courseNotes)");
    try {
        $stmt->execute([
            'start_date' => $start_date,
            'user_id'    => $user_id,
            'courseName'  => $courseName,
            'courseNotes' => $courseNotes
        ]);
        echo json_encode(['status' => 'success', 'message' => 'Course added successfully.']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($action === 'delete') {
    $course_id = $_POST['course_id'] ?? '';
    if (empty($course_id)) {
        echo json_encode(['status' => 'error', 'message' => 'Course ID is required.']);
        exit;
    }
    
    // Delete the course (ensuring it belongs to the logged-in user).
    $stmt = $conn->prepare("DELETE FROM Courses WHERE c_id = :c_id AND user_id = :user_id");
    try {
        $stmt->execute(['c_id' => $course_id, 'user_id' => $user_id]);
        echo json_encode(['status' => 'success', 'message' => 'Course deleted successfully.']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($action === 'list') {
    $start_date = trim($_POST['start_date'] ?? '');
    if (empty($start_date)) {
        echo json_encode(['status' => 'error', 'message' => 'Start date is required.']);
        exit;
    }
    
    // Retrieve courses for this user and selected start date.
    $stmt = $conn->prepare("SELECT * FROM Courses WHERE user_id = :user_id AND start_date = :start_date ORDER BY c_id DESC");
    $stmt->execute(['user_id' => $user_id, 'start_date' => $start_date]);
    $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['status' => 'success', 'courses' => $courses]);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
exit;
?>