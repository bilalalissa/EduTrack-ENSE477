<?php
session_start();
require_once("db.php");

header('Content-Type: application/json');

// Verify user is logged in
if (!isset($_SESSION['loggedinID'])) {
    echo json_encode(["status" => "error", "message" => "User not logged in."]);
    exit;
}

$user_id = $_SESSION['loggedinID'];
$action = $_GET['action'] ?? '';

if ($action === 'getTodos') {
    try {
        $today = date('Y-m-d');
        $tomorrow = date('Y-m-d', strtotime('+1 day'));
        $week_end = date('Y-m-d', strtotime('+7 days'));

        $todos = [
            'today' => [],
            'tomorrow' => [],
            'this_week' => []
        ];

        // Tables to check for tasks
        $tables = [
            ['Assignments', 'asmnt_id', 'Assignment'],
            ['Quizzes', 'qz_id', 'Quiz'],
            ['Projects', 'proj_id', 'Project'],
            ['MTs', 'mt_id', 'MT'],
            ['Finals', 'final_id', 'Final']
        ];

        foreach ($tables as [$table, $idColumn, $type]) {
            // Query for today's tasks (based on from_date, to_date, suggested_date, or actual_start_date)
            $sql = "SELECT 
                    $idColumn as id,
                    '$type' as type,
                    title,
                    course_id,
                    from_date,
                    to_date,
                    status,
                    suggested_date,
                    actual_start_date,
                    actual_end_date,
                    priority
                FROM $table 
                WHERE user_id = ? 
                AND (
                    from_date = ? 
                    OR to_date = ? 
                    OR suggested_date = ?
                    OR actual_start_date = ?
                )
                AND status != 'submitted'";

            $stmt = $conn->prepare($sql);
            $stmt->execute([$user_id, $today, $today, $today, $today]);
            $todos['today'] = array_merge($todos['today'], $stmt->fetchAll(PDO::FETCH_ASSOC));

            // Query for tomorrow's tasks
            $stmt->execute([$user_id, $tomorrow, $tomorrow, $tomorrow, $tomorrow]);
            $todos['tomorrow'] = array_merge($todos['tomorrow'], $stmt->fetchAll(PDO::FETCH_ASSOC));

            // Query for this week's tasks (excluding today and tomorrow)
            $sql = "SELECT 
                    $idColumn as id,
                    '$type' as type,
                    title,
                    course_id,
                    from_date,
                    to_date,
                    status,
                    suggested_date,
                    actual_start_date,
                    actual_end_date,
                    priority
                FROM $table 
                WHERE user_id = ? 
                AND (
                    (from_date > ? AND from_date <= ?)
                    OR (to_date > ? AND to_date <= ?)
                    OR (suggested_date > ? AND suggested_date <= ?)
                    OR (actual_start_date > ? AND actual_start_date <= ?)
                )
                AND status != 'submitted'";

            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $user_id,
                $tomorrow,
                $week_end,
                $tomorrow,
                $week_end,
                $tomorrow,
                $week_end,
                $tomorrow,
                $week_end
            ]);
            $todos['this_week'] = array_merge($todos['this_week'], $stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        // Get course names for each task
        $stmt = $conn->prepare("SELECT c_id, courseName FROM Courses WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $courses = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        // Add course names to tasks
        foreach ($todos as &$period) {
            foreach ($period as &$task) {
                $task['courseName'] = $courses[$task['course_id']] ?? 'Unknown Course';
            }
        }

        echo json_encode([
            "status" => "success",
            "todos" => $todos
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "status" => "error",
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid action"
    ]);
}
