<?php
session_start();
require_once("db.php");

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['loggedinID'])) {
    echo json_encode(['status' => 'error', 'message' => 'User not logged in']);
    exit();
}

$user_id = $_SESSION['loggedinID'];

// Handle different actions
if (isset($_GET['action'])) {
    switch ($_GET['action']) {
        case 'getCourses':
            try {
                $stmt = $conn->prepare("SELECT c_id, courseName FROM Courses WHERE user_id = ? ORDER BY courseName");
                $stmt->execute([$user_id]);
                $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'status' => 'success',
                    'courses' => $courses
                ]);
            } catch (PDOException $e) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Database error: ' . $e->getMessage()
                ]);
            }
            break;

        case 'getTasks':
            if (!isset($_GET['course_id'])) {
                echo json_encode(['status' => 'error', 'message' => 'Course ID not provided']);
                exit();
            }

            try {
                $course_id = $_GET['course_id'];
                $tasks = [];

                // Define tables and their corresponding types
                $tables = [
                    ['Quizzes', 'qz_id', 'quiz'],
                    ['Assignments', 'asmnt_id', 'assignment'],
                    ['Projects', 'proj_id', 'project'],
                    ['MTs', 'mt_id', 'mt'],
                    ['Finals', 'final_id', 'final']
                ];

                // Fetch tasks from each table
                foreach ($tables as [$table, $idColumn, $type]) {
                    $sql = "SELECT 
                            $idColumn as id,
                            '$type' as type,
                            title,
                            from_date,
                            to_date,
                            status,
                            course_id,
                            suggested_date,
                            actual_start_date,
                            actual_end_date,
                            percent,
                            priority,
                            details
                        FROM $table 
                        WHERE user_id = ? AND course_id = ?";

                    $stmt = $conn->prepare($sql);
                    $stmt->execute([$user_id, $course_id]);
                    $tasks = array_merge($tasks, $stmt->fetchAll(PDO::FETCH_ASSOC));
                }

                echo json_encode([
                    'status' => 'success',
                    'tasks' => $tasks
                ]);
            } catch (PDOException $e) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Database error: ' . $e->getMessage()
                ]);
            }
            break;

        case 'applyFilters':
            try {
                $course_id = $_GET['course_id'] ?? 'all';
                $task_type = $_GET['task_type'] ?? 'all';
                $status = $_GET['status'] ?? 'all';

                $tasks = [];
                $params = [$user_id];
                $courseCondition = $course_id !== 'all' ? "AND course_id = ?" : "";
                $statusCondition = $status !== 'all' ? "AND status = ?" : "";

                if ($course_id !== 'all') {
                    $params[] = $course_id;
                }
                if ($status !== 'all') {
                    $params[] = $status;
                }

                // Define tables mapping
                $tables = [
                    'quiz' => ['Quizzes', 'qz_id'],
                    'assignment' => ['Assignments', 'asmnt_id'],
                    'project' => ['Projects', 'proj_id'],
                    'mt' => ['MTs', 'mt_id'],
                    'final' => ['Finals', 'final_id']
                ];

                // If specific task type is selected
                if ($task_type !== 'all') {
                    if (isset($tables[$task_type])) {
                        [$table, $idColumn] = $tables[$task_type];
                        $sql = "SELECT 
                                $idColumn as id,
                                '$task_type' as type,
                                title,
                                from_date,
                                to_date,
                                status,
                                course_id,
                                suggested_date,
                                actual_start_date,
                                actual_end_date,
                                percent,
                                priority,
                                details
                            FROM $table 
                            WHERE user_id = ? $courseCondition $statusCondition";

                        $stmt = $conn->prepare($sql);
                        $stmt->execute($params);
                        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    }
                } else {
                    // Fetch from all tables
                    foreach ($tables as $type => [$table, $idColumn]) {
                        $sql = "SELECT 
                                $idColumn as id,
                                '$type' as type,
                                title,
                                from_date,
                                to_date,
                                status,
                                course_id,
                                suggested_date,
                                actual_start_date,
                                actual_end_date,
                                percent,
                                priority,
                                details
                            FROM $table 
                            WHERE user_id = ? $courseCondition $statusCondition";

                        $stmt = $conn->prepare($sql);
                        $stmt->execute($params);
                        $tasks = array_merge($tasks, $stmt->fetchAll(PDO::FETCH_ASSOC));
                    }
                }

                echo json_encode([
                    'status' => 'success',
                    'tasks' => $tasks
                ]);
            } catch (PDOException $e) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Database error: ' . $e->getMessage()
                ]);
            }
            break;

        case 'getDefaultTasks':
            try {
                $tasks = [];
                $tables = [
                    ['Quizzes', 'qz_id', 'Quiz'],
                    ['Assignments', 'asmnt_id', 'Assignment'],
                    ['Projects', 'proj_id', 'Project'],
                    ['MTs', 'mt_id', 'MT'],
                    ['Finals', 'final_id', 'Final']
                ];

                foreach ($tables as [$table, $idColumn, $type]) {
                    $sql = "SELECT $idColumn as id, title, '$type' as type, from_date, to_date, status 
                           FROM $table 
                           WHERE user_id = ?";

                    $stmt = $conn->prepare($sql);
                    $stmt->execute([$user_id]);
                    $tasks = array_merge($tasks, $stmt->fetchAll(PDO::FETCH_ASSOC));
                }

                echo json_encode([
                    'status' => 'success',
                    'tasks' => $tasks
                ]);
            } catch (PDOException $e) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Database error: ' . $e->getMessage()
                ]);
            }
            break;

        default:
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid action specified'
            ]);
            break;
    }
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'No action specified'
    ]);
}
