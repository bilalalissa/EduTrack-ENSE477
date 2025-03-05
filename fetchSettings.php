<?php
require_once("db.php");

session_start();

// Set headers for JSON response
header('Content-Type: application/json');

////////////////////////
// Debugging System
////////////////////////
$user_id = $_SESSION['loggedinID']; // Get the logged-in user's ID
$username = $_SESSION['loggedinUsername']; // Get the logged-in user's username
// Initialize logging system
function debug_to_db($message, &$debug_log)
{
    $debug_log[] = $message; // Add the log message to the log array
}
$debug_log = []; // Initialize debug log array
debug_to_db("fetchSettings.php", $debug_log);
// Check if the database connection is valid
if ($conn instanceof PDO) {
    debug_to_db("Database connection is valid. User ( $username / $user_id ) successfully logged in.", $debug_log);
} else {
    debug_to_db("Database connection is INVALID.", $debug_log);
    // die("Error: Unable to connect to the database.");
}
// Function to log data to the database
function log_to_db($user_id, $log_data, $conn)
{
    try {
        if ($user_id === null) {
            $user_id = 0; // Default to system user if no user is logged in
        } else {
            $user_id = $_SESSION['loggedinID']; // Get the logged-in user's ID
            $username = $_SESSION['loggedinUsername']; // Get the logged-in user's username
        }
        $stmt = $conn->prepare("INSERT INTO Logs (user_id, log_data) VALUES (:user_id, :log_data)");
        $stmt->execute([
            'user_id' => $user_id,
            'log_data' => json_encode($log_data)
        ]);
    } catch (PDOException $e) {
        error_log("[Database error] User ID not verfied. Error: " . $e->getMessage());
    }
}
// log_to_db($user_id, $debug_log, $conn);  // commented out because no need to log the current operation
////////////////////////
// Debugging System - END
////////////////////////

// Check if the request is for setting the start date
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'setStartDate') {
    $date = $_POST['date'] ?? null;

    if (!$date) {
        echo json_encode(["success" => false, "error" => "Missing date parameter."]);
        debug_to_db("Missing date parameter in setting start date.", $debug_log);
        exit;
    }

    try {
        // Begin transaction for atomicity.
        $conn->beginTransaction();
        
        // Reset previous start date
        $stmtReset = $conn->prepare("UPDATE Settings SET is_start_date = 0 WHERE user_id = ?");
        $stmtReset->execute([$user_id]);
        $resetRows = $stmtReset->rowCount();
        debug_to_db("Reset start date rows affected: " . $resetRows, $debug_log);

        // Set the new selected start date
        $stmtSet = $conn->prepare("UPDATE Settings SET is_start_date = 1 WHERE user_id = ? AND date = ?");
        $stmtSet->execute([$user_id, $date]);
        $setRows = $stmtSet->rowCount();
        debug_to_db("Set start date rows affected: " . $setRows, $debug_log);

        // Commit the transaction.
        $conn->commit();


        // Check if any row was updated.
        if ($setRows > 0) {
            echo json_encode(["success" => true, "message" => "Start date updated successfully."]);
        } else {
            // It might be that the selected date was already the start date.
            echo json_encode(["success" => true, "message" => "No changes needed."]);
        }
    } catch (PDOException $e) {
        // Roll back in case of error.
        $conn->rollBack();
        debug_to_db("Error updating start date: " . $e->getMessage(), $debug_log);
        // Avoid exposing sensitive information to the client.
        echo json_encode(['success' => false, 'error' => "An error occurred while updating start date."]);
    }
    // Submit all collected debug logs to the database.
    log_to_db($user_id, $debug_log, $conn);
    exit;
}

// Fetch the current start date for the user
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'getStartDate') {

    if (!$user_id) {
        debug_to_db("User ID not verfied.", $debug_log);
        echo json_encode(["success" => false, "error" => "User not logged in."]);
        // Log debug info before exit (if needed)
        log_to_db($user_id, $debug_log, $conn);
        exit;
    }

    try {
        // Begin transaction for atomicity.
        $conn->beginTransaction();
        
        $stmtSet = $conn->prepare("SELECT date FROM Settings WHERE user_id = ? AND is_start_date = 1 LIMIT 1");
        $stmtSet->execute([$user_id]);
        $startDate = $stmtSet->fetch(PDO::FETCH_ASSOC);
        debug_to_db("Fetched start date: " . json_encode($startDate), $debug_log);
        
        if ($startDate) {
            echo json_encode(['success' => true, 'start_date' => $startDate['date']]);
        } else {
            echo json_encode(['success' => false, 'message' => 'No start date found.']);
        }
    } catch (PDOException $e) {
        // Roll back in case of error.
        $conn->rollBack();
        debug_to_db("Error updating start date: " . $e->getMessage(), $debug_log);
        // Avoid exposing sensitive information to the client.
        echo json_encode(['success' => false, 'error' => "An error occurred while updating start date."]);
    }
    // Submit all collected debug logs to the database.
    log_to_db($user_id, $debug_log, $conn);
    exit;
}

// Fetch the user's start date list
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'getDatesList') {
    try {
        // No need for a transaction for a simple SELECT query
        $stmt = $conn->prepare("SELECT date, is_start_date FROM Settings WHERE user_id = ? ORDER BY date ASC");
        $stmt->execute([$user_id]);
        $dates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        debug_to_db("Fetched dates: " . json_encode($dates), $debug_log);
        
        echo json_encode(['success' => true, 'dates' => $dates]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => "An error occurred while fetching dates."]);
    }
    log_to_db($user_id, $debug_log, $conn);
    exit;
}

// Add a new start date for the logged-in user and mark it as selected
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'addDate') {
    $date = $_POST['date'];

    if (!$date) {
        echo json_encode(["success" => false, "error" => "Missing date parameter."]);
        debug_to_db("Missing date parameter in adding date.", $debug_log);
        exit;
    }

    try {
        // Begin transaction for atomicity.
        $conn->beginTransaction();
        
        // Check if the date already exists
        $stmt = $conn->prepare("SELECT COUNT(*) FROM Settings WHERE user_id = ? AND date = ?");
        $stmt->execute([$user_id, $date]);
        $count = $stmt->fetchColumn();
        debug_to_db("Fetched date count: " . $count, $debug_log);

        if ($count > 0) {
            echo json_encode(["success" => false, "error" => "Date already exists."]);
            $conn->rollBack();
            log_to_db($user_id, $debug_log, $conn);
            exit;
        }

        // Reset previous start date
        $stmtReset = $conn->prepare("UPDATE Settings SET is_start_date = 0 WHERE user_id = ?");
        $stmtReset->execute([$user_id]);
        $resetRows = $stmtReset->rowCount();
        debug_to_db("Reset start date rows affected: " . $resetRows, $debug_log);
        
        // Insert the new date
        $stmt = $conn->prepare("INSERT INTO Settings (user_id, date, is_start_date) VALUES (?, ?, 1)");
        $inserted = $stmt->execute([$user_id, $date]);
        $insertedRows = $stmt->rowCount();
        debug_to_db("Inserted date rows affected: " . $insertedRows, $debug_log);

        // Commit the transaction.
        $conn->commit();

        // Check if any row was inserted.
        if ($insertedRows > 0) {
            echo json_encode(["success" => true, "message" => "Date added successfully."]);
            debug_to_db("Date added successfully.", $debug_log);
        } else {
            echo json_encode(["success" => false, "error" => "Failed to add the date."]);
            debug_to_db("Failed to add the date.", $debug_log);
        }
    } catch (PDOException $e) {
        // Roll back in case of error.
        $conn->rollBack();
        debug_to_db("Error adding date: " . $e->getMessage(), $debug_log);
        // Avoid exposing sensitive information to the client.
        echo json_encode(['success' => false, 'error' => "An error occurred while adding date."]);
    }
    // Submit all collected debug logs to the database.
    log_to_db($user_id, $debug_log, $conn);
    exit;
}


// Delete a date from the user's settings
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'deleteDate') {
    
    if (!isset($_POST['date']) || empty($_POST['date'])) {
        debug_to_db("Missing date parameter in deleting date.", $debug_log);
        echo json_encode(['success' => false, 'error' => 'Missing date parameter.']);
        exit;
    }

    $dateToDelete = $_POST['date'];

    try {
        // Begin transaction for atomicity.
        $conn->beginTransaction();
        
        $stmt = $conn->prepare("DELETE FROM Settings WHERE user_id = ? AND date = ?");
        $stmt->execute([$user_id, $dateToDelete]);

        // Commit the transaction.
        $conn->commit();

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Date deleted successfully.']);
            debug_to_db("Date deleted successfully.", $debug_log);
        } else {
            echo json_encode(['success' => false, 'error' => 'Date not found or already deleted.']);
            debug_to_db("Date not found or already deleted.", $debug_log);
        }
    } catch (PDOException $e) {
        // Roll back in case of error.
        $conn->rollBack();
        debug_to_db("Error deleting date.", $debug_log);
        // Avoid exposing sensitive information to the client.
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    // Submit all collected debug logs to the database.
    log_to_db($user_id, $debug_log, $conn);
    exit;
}

// TODO: functionality to edit a selected date (after finishing all matrix work)


// Handle invalid requests
// debug_to_db("Invalid request method or missing 'date' parameter", $debug_log);
log_to_db($user_id, $debug_log, $conn);
echo json_encode(['error' => 'Invalid request.', 'debug' => $debug_log]);
exit;

?>