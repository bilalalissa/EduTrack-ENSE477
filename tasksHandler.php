<?php
// tasksHandler.php
session_start();
require_once("db.php"); // Ensure $conn is your PDO connection

header('Content-Type: application/json');

// Verify user is logged in.
if (!isset($_SESSION['loggedinID'])) {
    echo json_encode(["status" => "error", "message" => "User not logged in."]);
    exit;
}

$user_id = $_SESSION['loggedinID'];
$action = $_POST['action'] ?? $_GET['action'] ?? '';

// Allow both GET and POST methods depending on the action
if ($action === 'getStartDate') {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        echo json_encode(["status" => "error", "message" => "Invalid request method for getStartDate."]);
        exit;
    }

    // Get the earliest start date from all task tables
    $startDate = null;
    $tables = ['Assignments', 'Quizzes', 'Projects', 'MTs', 'Finals'];

    foreach ($tables as $table) {
        $stmt = $conn->prepare("SELECT MIN(start_date) as min_date FROM $table WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result['min_date'] && (!$startDate || $result['min_date'] < $startDate)) {
            $startDate = $result['min_date'];
        }
    }

    // If no start date found, use current date
    if (!$startDate) {
        $startDate = date('Y-m-d');
    }

    echo json_encode(["status" => "success", "start_date" => $startDate]);
    exit;
} elseif ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["status" => "error", "message" => "Invalid request method."]);
    exit;
}

// -------------------- Action: List Tasks --------------------
if ($action === 'list') {
    // If no task_type is provided or if it's "all", load all types.
    $task_type = $_POST['task_type'] ?? 'all';

    // Mapping of task types to their corresponding tables.
    $tableMap = [
        'Assignment' => 'Assignments',
        'Quiz'       => 'Quizzes',
        'Project'    => 'Projects',
        'MT'         => 'MTs',
        'Final'      => 'Finals'
    ];

    if ($task_type === 'all') {
        $allTasks = [];
        // Loop over each task type.
        foreach ($tableMap as $type => $tableName) {
            $stmt = $conn->prepare("SELECT *, ? as task_type FROM $tableName WHERE user_id = ? ORDER BY from_date DESC");
            $stmt->execute([$type, $user_id]);
            $tasksForType = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // Normalize the primary key field.
            foreach ($tasksForType as &$task) {
                if ($type == 'Assignment') {
                    $task['id'] = $task['asmnt_id'];
                } elseif ($type == 'Quiz') {
                    $task['id'] = $task['qz_id'];
                } elseif ($type == 'Project') {
                    $task['id'] = $task['proj_id'];
                } elseif ($type == 'MT') {
                    $task['id'] = $task['mt_id'];
                } elseif ($type == 'Final') {
                    $task['id'] = $task['final_id'];
                }
            }
            $allTasks = array_merge($allTasks, $tasksForType);
        }
        // Optionally sort all tasks by from_date descending.
        usort($allTasks, function ($a, $b) {
            return strtotime($b['from_date']) - strtotime($a['from_date']);
        });
        echo json_encode(["status" => "success", "tasks" => $allTasks]);
        exit;
    } else {
        // If a specific task type is provided, validate it.
        if (!isset($tableMap[$task_type])) {
            echo json_encode(["status" => "error", "message" => "Invalid task type for listing."]);
            exit;
        }
        $tableName = $tableMap[$task_type];
        $stmt = $conn->prepare("SELECT * FROM $tableName WHERE user_id = ? ORDER BY from_date DESC");
        $stmt->execute([$user_id]);
        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($tasks as &$task) {
            if (isset($task['asmnt_id'])) {
                $task['id'] = $task['asmnt_id'];
            } elseif (isset($task['qz_id'])) {
                $task['id'] = $task['qz_id'];
            } elseif (isset($task['proj_id'])) {
                $task['id'] = $task['proj_id'];
            } elseif (isset($task['mt_id'])) {
                $task['id'] = $task['mt_id'];
            } elseif (isset($task['final_id'])) {
                $task['id'] = $task['final_id'];
            }
        }
        echo json_encode(["status" => "success", "tasks" => $tasks]);
        exit;
    }
}

// -------------------- Action: Add Task --------------------
elseif ($action === 'add') {
    // Collect and sanitize inputs.
    $course_id       = trim($_POST['course_id'] ?? '');
    $task_type      = trim($_POST['task_type'] ?? '');
    $title          = trim($_POST['title'] ?? '');
    $from_date      = trim($_POST['from_date'] ?? '');
    $to_date        = trim($_POST['to_date'] ?? '');
    $status         = trim($_POST['status'] ?? '');
    $suggested_date = trim($_POST['suggested_date'] ?? '');
    $percent        = trim($_POST['percent'] ?? '');
    $priority       = trim($_POST['priority'] ?? '');
    $details        = trim($_POST['details'] ?? '');
    $start_date     = trim($_POST['start_date'] ?? '');
    $actual_start_date = trim($_POST['actual_start_date'] ?? '');
    $actual_end_date = trim($_POST['actual_end_date'] ?? '');

    // Validate required fields.
    $errors = [];
    if (empty($course_id)) {
        $errors[] = "Course selection is required.";
    }
    if (empty($task_type)) {
        $errors[] = "Task type is required.";
    }
    if (empty($title)) {
        $errors[] = "Title is required.";
    }
    if (empty($from_date)) {
        $errors[] = "From date is required.";
    }
    if (empty($to_date)) {
        $errors[] = "To date is required.";
    }
    if (empty($status)) {
        $errors[] = "Status is required.";
    }
    if (empty($suggested_date)) {
        $errors[] = "Suggested date is required.";
    }
    if (empty($percent)) {
        $errors[] = "Percent is required.";
    }
    if (empty($priority)) {
        $errors[] = "Priority is required.";
    }
    if (empty($start_date)) {
        $errors[] = "Start date is required.";
    }
    if (empty($actual_start_date)) {
        $errors[] = "Actual start date is required.";
    }
    if (empty($actual_end_date)) {
        $errors[] = "Actual end date is required.";
    }

    // Validate allowed values.
    $allowedTaskTypes = ['Assignment', 'Quiz', 'Project', 'MT', 'Final'];
    if (!in_array($task_type, $allowedTaskTypes)) {
        $errors[] = "Invalid task type.";
    }
    $allowedStatus = ['on_hold', 'in_process', 'submitted'];
    if (!in_array($status, $allowedStatus)) {
        $errors[] = "Invalid status.";
    }
    $allowedPriority = ['n', 'm', 'h'];
    if (!in_array($priority, $allowedPriority)) {
        $errors[] = "Invalid priority.";
    }

    if (!empty($errors)) {
        echo json_encode(["status" => "error", "message" => implode(" ", $errors)]);
        exit;
    }

    // Map task type to table name.
    $tableMap = [
        'Assignment' => 'Assignments',
        'Quiz'       => 'Quizzes',
        'Project'    => 'Projects',
        'MT'         => 'MTs',
        'Final'      => 'Finals'
    ];
    $tableName = $tableMap[$task_type];

    // Map task type to its primary key column.
    $idMap = [
        'Assignment' => 'asmnt_id',
        'Quiz'       => 'qz_id',
        'Project'    => 'proj_id',
        'MT'         => 'mt_id',
        'Final'      => 'final_id'
    ];
    $idColumn = $idMap[$task_type];

    // Check for duplicate task.
    $stmt = $conn->prepare("SELECT $idColumn FROM $tableName WHERE user_id = ? AND start_date = ? AND course_id = ? AND title = ?");
    $stmt->execute([$user_id, $start_date, $course_id, $title]);
    if ($stmt->fetch()) {
        echo json_encode(["status" => "error", "message" => "A task with the same title already exists for this course and start date."]);
        exit;
    }

    // Insert the new task.
    $sql = "INSERT INTO $tableName 
           (user_id, start_date, course_id, title, from_date, to_date, status, suggested_date, actual_start_date, actual_end_date, percent, priority, details)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $result = $stmt->execute([
        $user_id,
        $start_date,
        $course_id,
        $title,
        $from_date,
        $to_date,
        $status,
        $suggested_date,
        $actual_start_date,
        $actual_end_date,
        $percent,
        $priority,
        $details
    ]);

    if ($result) {
        echo json_encode(["status" => "success", "message" => "Task added successfully."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error inserting task."]);
    }
    exit;
} // -------------------- Action: Delete Task --------------------
elseif ($action === 'delete') {
    // Expect: task_type and id.
    $task_type = trim($_POST['task_type'] ?? '');
    $id = trim($_POST['id'] ?? '');
    if (empty($task_type) || empty($id)) {
        echo json_encode(["status" => "error", "message" => "Missing task type or id."]);
        exit;
    }
    // Map task type to table and primary key.
    $tableMap = [
        'Assignment' => 'Assignments',
        'Quiz'       => 'Quizzes',
        'Project'    => 'Projects',
        'MT'         => 'MTs',
        'Final'      => 'Finals'
    ];
    $idMap = [
        'Assignment' => 'asmnt_id',
        'Quiz'       => 'qz_id',
        'Project'    => 'proj_id',
        'MT'         => 'mt_id',
        'Final'      => 'final_id'
    ];
    if (!isset($tableMap[$task_type])) {
        echo json_encode(["status" => "error", "message" => "Invalid task type."]);
        exit;
    }
    $tableName = $tableMap[$task_type];
    $idColumn = $idMap[$task_type];

    // Delete the task (only if it belongs to the user).
    $stmt = $conn->prepare("DELETE FROM $tableName WHERE $idColumn = ? AND user_id = ?");
    $result = $stmt->execute([$id, $user_id]);
    if ($result) {
        echo json_encode(["status" => "success", "message" => "Task deleted successfully."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error deleting task."]);
    }
    exit;
} else {
    echo json_encode(["status" => "error", "message" => "Invalid action."]);
    exit;
}

// End of tasksHandler.php