<?php

require_once("db.php");

// Start session for user identification
session_start();

////////////////////////
// Debugging System
////////////////////////
$user_id = $_SESSION['loggedinID']; // Get the logged-in user's ID
$username = $_SESSION['loggedinUsername']; // Get the logged-in user's username
$signedUp_id = $_SESSION['signupUserId']; // Get the signed-up user's ID
$usernameSignedUp = $_SESSION['signedUpUsername']; // Get the signed-up user's username

// Initialize logging system
function debug_to_db($message, &$debug_log)
{
    $debug_log[] = $message; // Add the log message to the log array
}
$debug_log = []; // Initialize debug log array
debug_to_db("signout.php", $debug_log);
// Check if the database connection is valid
if ($conn instanceof PDO) {
    // On successful logout
    // Update last_logout and status in Users table
    if ($signedUp_id !== null) {
        $user_id = $signedUp_id;  // Default to signed-up user if no user is signedUp
    } 
    $updateStmt = $conn->prepare("UPDATE Users SET last_logout = NOW(), status = 'logged_out' WHERE u_id = :user_id");
    $updateStmt->execute(['user_id' => $user_id]);
    debug_to_db("Database connection is valid. User ($username) successfully signed out.", $debug_log);
} else {
    debug_to_db("Database connection is INVALID.", $debug_log);
    die("Error: Unable to connect to the database.");
}
// Function to log data to the database
function log_to_db($user_id, $log_data, $conn)
{
    try {
        if ($user_id === null) {
            $user_id = 0; // Default to system user if no user is logged in
        } else {
            $user_id = $_SESSION['loggedinID']; // Get the logged-in user's ID
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
log_to_db($user_id, $debug_log, $conn);
////////////////////////
// Debugging System - END
////////////////////////

// Clear all session variables
$_SESSION = array();

// Destroy and end the session
session_unset();
session_destroy();

// Redirect to the login page
header("Location: index.php");
exit();