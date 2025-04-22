<?php
// tasksHandler.php
session_start();
require_once("db.php"); // Ensure $conn is your PDO connection

header('Content-Type: application/json');

// Verify user is logged in.
if (!isset($_SESSION['signupUserId'])) {
    echo json_encode(["status" => "error", "message" => "User not logged in."]);
    exit;
}

$user_id = $_SESSION['signupUserId'];
$action = $_POST['action'] ?? $_GET['action'] ?? '';

// Allow both GET and POST methods depending on the action
if ($action === 'getStartDate') {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        error_log("Invalid request method for getStartDate.");
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
    error_log("Invalid request method.");
    echo json_encode(["status" => "error", "message" => "Invalid request method."]);
    exit;
}

// Add validation functions at the top of the file
function validateTaskDates($fromDate, $toDate, $suggestedDate, $actualStartDate, $actualEndDate, $startDate)
{
    $errors = [];

    // Log input dates for debugging
    error_log("Validating dates: " . json_encode([
        'fromDate' => $fromDate,
        'toDate' => $toDate,
        'suggestedDate' => $suggestedDate,
        'actualStartDate' => $actualStartDate,
        'actualEndDate' => $actualEndDate,
        'startDate' => $startDate
    ]));

    // Convert dates to timestamps for comparison
    $from = strtotime($fromDate);
    $to = strtotime($toDate);
    $suggested = strtotime($suggestedDate);
    $actualStart = strtotime($actualStartDate);
    $actualEnd = strtotime($actualEndDate);
    $start = strtotime($startDate);

    // Calculate matrix end date as 120 days from start date
    $matrixEnd = strtotime($startDate . ' + 120 days');
    error_log("Matrix end date calculated: " . date('Y-m-d', $matrixEnd));

    // Log converted timestamps for debugging
    error_log("Converted timestamps: " . json_encode([
        'from' => date('Y-m-d', $from),
        'to' => date('Y-m-d', $to),
        'suggested' => date('Y-m-d', $suggested),
        'actualStart' => date('Y-m-d', $actualStart),
        'actualEnd' => date('Y-m-d', $actualEnd),
        'start' => date('Y-m-d', $start),
        'matrixEnd' => date('Y-m-d', $matrixEnd)
    ]));

    // Validate from and to dates against start date
    if ($from < $start) {
        $errors[] = "From date cannot be earlier than the start date";
    }
    if ($to < $from) {
        $errors[] = "To date cannot be earlier than from date";
    }
    if ($to > $matrixEnd) {
        error_log("To date validation failed: " . json_encode([
            'to' => date('Y-m-d', $to),
            'matrixEnd' => date('Y-m-d', $matrixEnd)
        ]));
        $errors[] = "To date cannot be later than the last date in the schedule matrix (" . date('Y-m-d', $matrixEnd) . ")";
    }

    // Validate suggested date is within the task period
    if ($suggested < $from || $suggested > $to) {
        $errors[] = "Suggested date must be within the task period (between from and to dates)";
    }

    // Validate actual dates are within the task period
    if ($actualStart < $from || $actualStart > $to) {
        $errors[] = "Actual start date must be within the task period";
    }
    if ($actualEnd < $from || $actualEnd > $to) {
        $errors[] = "Actual end date must be within the task period";
    }
    if ($actualEnd < $actualStart) {
        $errors[] = "Actual end date cannot be earlier than actual start date";
    }

    return $errors;
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
            error_log("Invalid task type for listing.");
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
    try {
        // Log the incoming request
        error_log("Adding new task. POST data: " . print_r($_POST, true));

        // Collect and sanitize inputs.
        $course_id = trim($_POST['course_id'] ?? '');
        $task_type = trim($_POST['task_type'] ?? '');
        $title = trim($_POST['title'] ?? '');
        $from_date = trim($_POST['from_date'] ?? '');
        $to_date = trim($_POST['to_date'] ?? '');
        $status = trim($_POST['status'] ?? '');
        $suggested_date = trim($_POST['suggested_date'] ?? '');
        $percent = trim($_POST['percent'] ?? '');
        $priority = trim($_POST['priority'] ?? '');
        $details = trim($_POST['details'] ?? '');
        $start_date = trim($_POST['start_date'] ?? '');
        $actual_start_date = trim($_POST['actual_start_date'] ?? '');
        $actual_end_date = trim($_POST['actual_end_date'] ?? '');

        // Log sanitized inputs
        error_log("Sanitized inputs: " . print_r([
            'course_id' => $course_id,
            'task_type' => $task_type,
            'title' => $title,
            'from_date' => $from_date,
            'to_date' => $to_date,
            'status' => $status,
            'suggested_date' => $suggested_date,
            'percent' => $percent,
            'priority' => $priority,
            'details' => $details,
            'start_date' => $start_date,
            'actual_start_date' => $actual_start_date,
            'actual_end_date' => $actual_end_date
        ], true));

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

        // Add date validation
        $dateErrors = validateTaskDates($from_date, $to_date, $suggested_date, $actual_start_date, $actual_end_date, $start_date);
        $errors = array_merge($errors, $dateErrors);

        if (!empty($errors)) {
            error_log("Validation errors: " . implode(", ", $errors));
            echo json_encode(["status" => "error", "message" => implode(" ", $errors)]);
            exit;
        }

        // Map task type to table name.
        $tableMap = [
            'Assignment' => 'Assignments',
            'Quiz' => 'Quizzes',
            'Project' => 'Projects',
            'MT' => 'MTs',
            'Final' => 'Finals'
        ];
        $tableName = $tableMap[$task_type];

        // Map task type to its primary key column.
        $idMap = [
            'Assignment' => 'asmnt_id',
            'Quiz' => 'qz_id',
            'Project' => 'proj_id',
            'MT' => 'mt_id',
            'Final' => 'final_id'
        ];
        $idColumn = $idMap[$task_type];

        // Check for duplicate task.
        $stmt = $conn->prepare("SELECT $idColumn FROM $tableName WHERE user_id = ? AND start_date = ? AND course_id = ? AND title = ?");
        $stmt->execute([$user_id, $start_date, $course_id, $title]);
        if ($stmt->fetch()) {
            error_log("Duplicate task found");
            echo json_encode(["status" => "error", "message" => "A task with the same title already exists for this course and start date."]);
            exit;
        }

        // Insert the new task.
        $sql = "INSERT INTO $tableName 
               (user_id, start_date, course_id, title, from_date, to_date, status, suggested_date, actual_start_date, actual_end_date, percent, priority, details)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        error_log("Executing SQL: $sql");
        error_log("With parameters: " . print_r([
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
        ], true));

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
            error_log("Task added successfully");
            echo json_encode([
                "status" => "success",
                "message" => "Task added successfully.",
                "shouldUpdateTodos" => true
            ]);
        } else {
            error_log("Error inserting task: " . print_r($stmt->errorInfo(), true));
            echo json_encode(["status" => "error", "message" => "Error inserting task."]);
        }
    } catch (PDOException $e) {
        error_log("Database error: " . $e->getMessage());
        echo json_encode(["status" => "error", "message" => "Database error occurred: " . $e->getMessage()]);
    } catch (Exception $e) {
        error_log("General error: " . $e->getMessage());
        echo json_encode(["status" => "error", "message" => "An error occurred: " . $e->getMessage()]);
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
        echo json_encode([
            "status" => "success",
            "message" => "Task deleted successfully.",
            "shouldUpdateTodos" => true
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error deleting task."]);
    }
    exit;
} // -------------------- Action: Get Task --------------------
elseif ($action === 'getTask') {
    // log the beginning of getTask
    error_log("\n\n > 5. tasksHandler.php/getTask started");
    // Expect: task_type and id.
    $task_type = trim($_POST['task_type'] ?? '');
    $id = trim($_POST['id'] ?? '');
    if (empty($task_type) || empty($id)) {
        // log the error and data received
        error_log("\n\nError (tasksHandler.php/getTask): \nMissing task type or id. Data received: $task_type, ID: $id");
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

    // Log incoming request parameters for debugging
    error_log("[DEBUG] getTask action: task_type = $task_type, id = $id, user_id = $user_id");

    // Fetch the task details.
    $stmt = $conn->prepare("SELECT * FROM $tableName WHERE $idColumn = ? AND user_id = ?");
    $stmt->execute([$id, $user_id]);
    $task = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($task) {
        // Determine the task type using the table map
        $task['task_type'] = array_search($tableName, $tableMap);

        // Log the task details being fetched
        error_log("[DEBUG] Fetched task details: " . print_r($task, true));

        // Include the task type in the response
        echo json_encode(["status" => "success", "task" => $task]);
    } else {
        echo json_encode(["status" => "error", "message" => "Task not found."]);
    }
    exit;
} // -------------------- Action: Edit Task --------------------
elseif ($action === 'editTask') {
    try {
        // Log received POST data for debugging
        error_log("[DEBUG] Received POST data: " . print_r($_POST, true));

        $task_type = $_POST['task_type'] ?? '';
        $id = $_POST['id'] ?? '';
        $title = $_POST['title'] ?? '';
        $from_date = $_POST['from_date'] ?? '';
        $to_date = $_POST['to_date'] ?? '';
        $status = $_POST['status'] ?? '';
        $suggested_date = $_POST['suggested_date'] ?? '';
        $percent = $_POST['percent'] ?? '';
        $priority = $_POST['priority'] ?? '';
        $details = $_POST['details'] ?? '';
        $start_date = $_POST['start_date'] ?? '';
        $actual_start_date = $_POST['actual_start_date'] ?? '';
        $actual_end_date = $_POST['actual_end_date'] ?? '';

        if (empty($task_type) || empty($id) || empty($title) || empty($from_date) || empty($to_date) || empty($status)) {
            echo json_encode(['status' => 'error', 'message' => 'Missing required fields.']);
            // log the error
            error_log(" > 6-1 Error (tasksHandler.php/editTask): \nMissing required fields. \nData received: \n > Task type: $task_type, \n > ID: $id, \n > Title: $title, \n > From date: $from_date, \n > To date: $to_date, \n > Status: $status");
            exit;
        }

        // Map task type to table name and id column
        $tableMap = [
            'Assignment' => 'Assignments',
            'Final' => 'Finals',
            'MT' => 'MTs',
            'Project' => 'Projects',
            'Quiz' => 'Quizzes'
        ];
        $idMap = [
            'Assignment' => 'asmnt_id',
            'Final' => 'final_id',
            'MT' => 'mt_id',
            'Project' => 'proj_id',
            'Quiz' => 'qz_id'
        ];

        $tableName = $tableMap[$task_type] ?? '';
        $idColumn = $idMap[$task_type] ?? '';

        if (empty($tableName) || empty($idColumn)) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid task type.']);
            // log the error
            error_log(" > 6-2 Error (tasksHandler.php/editTask): \nInvalid task type. \nData received: \n > Task type: $task_type, \n > ID: $id, \n > Title: $title, \n > From date: $from_date, \n > To date: $to_date, \n > Status: $status");
            exit;
        }

        // Add date validation
        $dateErrors = validateTaskDates($from_date, $to_date, $suggested_date, $actual_start_date, $actual_end_date, $start_date);
        if (!empty($dateErrors)) {
            echo json_encode(['status' => 'error', 'message' => implode(" ", $dateErrors)]);
            exit;
        }

        // Add detailed logging before executing the SQL statement
        error_log("[DEBUG] Preparing to execute SQL statement for task update.");

        // Prepare SQL update statement using PDO
        $sql = "UPDATE $tableName SET title = :title, from_date = :from_date, to_date = :to_date, status = :status, suggested_date = :suggested_date, percent = :percent, priority = :priority, details = :details, start_date = :start_date, actual_start_date = :actual_start_date, actual_end_date = :actual_end_date WHERE $idColumn = :id";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':from_date', $from_date);
        $stmt->bindParam(':to_date', $to_date);
        $stmt->bindParam(':status', $status);
        $stmt->bindParam(':suggested_date', $suggested_date);
        $stmt->bindParam(':percent', $percent);
        $stmt->bindParam(':priority', $priority);
        $stmt->bindParam(':details', $details);
        $stmt->bindParam(':start_date', $start_date);
        $stmt->bindParam(':actual_start_date', $actual_start_date);
        $stmt->bindParam(':actual_end_date', $actual_end_date);
        $stmt->bindParam(':id', $id);

        // Add logging after SQL execution to capture success or failure
        if ($stmt->execute()) {
            // Fetch the updated task details
            $stmt = $conn->prepare("SELECT * FROM $tableName WHERE $idColumn = ? AND user_id = ?");
            $stmt->execute([$id, $user_id]);
            $updatedTask = $stmt->fetch(PDO::FETCH_ASSOC);

            // Include the task type in the response
            $updatedTask['task_type'] = $task_type;

            echo json_encode([
                "status" => "success",
                "message" => "Task updated successfully.",
                "shouldUpdateTodos" => true
            ]);
        } else {
            $errorInfo = $stmt->errorInfo();
            error_log("SQL Error: " . print_r($errorInfo, true));
            echo json_encode(['status' => 'error', 'message' => 'Failed to update task.']);
        }
    } catch (Exception $e) {
        error_log("Exception: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => 'An unexpected error occurred.']);
    }
} // Handle visibility update
elseif ($action === 'updateVisibility') {
    error_log("\n\nUpdateVisibility action called");
    error_log("POST data received: " . print_r($_POST, true));

    if (!isset($_SESSION['signupUserId'])) {
        error_log("User not logged in");
        echo json_encode(['status' => 'error', 'message' => 'User not logged in']);
        exit;
    }

    $userId = $_SESSION['signupUserId'];

    // Ensure hideSubmitted is properly parsed from the POST data
    if (!isset($_POST['hideSubmitted'])) {
        error_log("hideSubmitted parameter missing");
        echo json_encode(['status' => 'error', 'message' => 'Missing hideSubmitted parameter']);
        exit;
    }

    // Convert the hideSubmitted value to boolean
    $hideSubmitted = filter_var($_POST['hideSubmitted'], FILTER_VALIDATE_BOOLEAN);

    error_log("Processing visibility update:");
    error_log(" > User ID: " . $userId);
    error_log(" > Hide Submitted (raw): " . $_POST['hideSubmitted']);
    error_log(" > Hide Submitted (parsed): " . ($hideSubmitted ? 'true' : 'false'));

    try {
        // First check if a record exists and get current preferences
        $checkStmt = $conn->prepare("SELECT pref_id, tasks_visibility FROM UserPreferences WHERE user_id = ?");
        $checkStmt->execute([$userId]);
        $existingPrefs = $checkStmt->fetch(PDO::FETCH_ASSOC);

        error_log(" > Existing preferences: " . print_r($existingPrefs, true));

        // Prepare the visibility JSON
        $visibilityData = ['hide_submitted_tasks' => $hideSubmitted];

        if ($existingPrefs) {
            // Update existing preferences
            error_log(" > Updating existing preferences");

            // If there's existing visibility data, merge it
            if ($existingPrefs['tasks_visibility']) {
                $currentVisibility = json_decode($existingPrefs['tasks_visibility'], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $visibilityData = array_merge($currentVisibility, $visibilityData);
                }
            }

            $visibilityJson = json_encode($visibilityData, JSON_FORCE_OBJECT);
            error_log(" > Updating with visibility JSON: " . $visibilityJson);

            $updateSql = "UPDATE UserPreferences SET tasks_visibility = :visibility WHERE user_id = :userId";
            $stmt = $conn->prepare($updateSql);
            $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
            $stmt->bindParam(':visibility', $visibilityJson, PDO::PARAM_STR);
            $success = $stmt->execute();
        } else {
            // Insert new record
            error_log(" > No existing preferences found, creating new record");
            $visibilityJson = json_encode($visibilityData, JSON_FORCE_OBJECT);
            error_log(" > Inserting new record with visibility: " . $visibilityJson);

            $insertSql = "INSERT INTO UserPreferences (user_id, first_name, last_name, student_id, tasks_visibility) 
                         VALUES (:userId, '', '', '', :visibility)";
            $stmt = $conn->prepare($insertSql);
            $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
            $stmt->bindParam(':visibility', $visibilityJson, PDO::PARAM_STR);
            $success = $stmt->execute();
        }

        error_log(" > Query execution " . ($success ? 'successful' : 'failed'));

        if ($success) {
            // Verify the update
            $verifySql = "SELECT tasks_visibility FROM UserPreferences WHERE user_id = ?";
            $verifyStmt = $conn->prepare($verifySql);
            $verifyStmt->execute([$userId]);
            $result = $verifyStmt->fetch(PDO::FETCH_ASSOC);

            error_log(" > Verification query result: " . print_r($result, true));

            if ($result && isset($result['tasks_visibility'])) {
                $storedVisibility = json_decode($result['tasks_visibility'], true);
                error_log(" > Stored visibility setting: " . print_r($storedVisibility, true));

                if (isset($storedVisibility['hide_submitted_tasks'])) {
                    error_log(" > Visibility setting successfully verified");
                    echo json_encode([
                        'status' => 'success',
                        'hide_submitted_tasks' => $storedVisibility['hide_submitted_tasks']
                    ]);
                } else {
                    error_log(" > Verification failed - stored value doesn't match expected structure");
                    echo json_encode([
                        'status' => 'error',
                        'message' => 'Visibility setting verification failed'
                    ]);
                }
            } else {
                error_log(" > Verification failed - no data found");
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Failed to verify visibility setting'
                ]);
            }
        } else {
            $errorInfo = $stmt->errorInfo();
            error_log(" > Database error: " . print_r($errorInfo, true));
            echo json_encode([
                'status' => 'error',
                'message' => 'Failed to update visibility setting'
            ]);
        }
    } catch (PDOException $e) {
        error_log(" > Exception: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => 'Database error occurred']);
    }
    exit;
} elseif ($action === 'getVisibilityPreference') {
    error_log("\n\ngetVisibilityPreference action called");

    if (!isset($_SESSION['signupUserId'])) {
        error_log("User not logged in");
        echo json_encode(['status' => 'error', 'message' => 'User not logged in']);
        exit;
    }

    $userId = $_SESSION['signupUserId'];
    error_log("Fetching visibility preference for user $userId");

    try {
        $sql = "SELECT tasks_visibility FROM UserPreferences WHERE user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result && $result['tasks_visibility']) {
            $visibility = json_decode($result['tasks_visibility'], true);
            $hideSubmitted = isset($visibility['hide_submitted_tasks']) ?
                filter_var($visibility['hide_submitted_tasks'], FILTER_VALIDATE_BOOLEAN) :
                false;

            error_log("Found preference: " . print_r($visibility, true));
            echo json_encode([
                'status' => 'success',
                'hide_submitted_tasks' => $hideSubmitted
            ]);
        } else {
            error_log("No preference found, using default");
            echo json_encode([
                'status' => 'success',
                'hide_submitted_tasks' => false // Default value if not set
            ]);
        }
    } catch (PDOException $e) {
        error_log("Error fetching visibility setting: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => 'Database error occurred']);
    }
    exit;
} else {
    echo json_encode(["status" => "error", "message" => "Invalid action."]);
    exit;
}

// End of tasksHandler.php
