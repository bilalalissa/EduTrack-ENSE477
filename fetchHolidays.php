<?php
// fetchHolidays.php

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set header for JSON response (only once)
header('Content-Type: application/json');

// Include the database connection (this should define $conn)
require_once("db.php");

session_start();

// Check if user is logged in
if (!isset($_SESSION['loggedinID'])) {
    echo json_encode(["error" => "User not logged in."]);
    exit;
}

$user_id = $_SESSION['loggedinID'];

// ================================
// GET Holidays for the User
// ================================
if ($_SERVER["REQUEST_METHOD"] === "GET" && isset($_GET["action"]) && $_GET["action"] === "getHolidays") {
    // Expecting a start_date parameter (adjust this filter if you intend to list all holidays)
    $start_date = $_GET["start_date"] ?? null;

    if (!$start_date) {
        echo json_encode(["error" => "Start date required."]);
        exit;
    }

    try {
        // Filter by logged-in user's ID and start_date
        $stmt = $conn->prepare("SELECT * FROM Holidays WHERE user_id = ? AND DATE(start_date) = ? ORDER BY start_date ASC");
        $stmt->execute([$user_id, $start_date]);
        $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "holidays" => $holidays]);
    } catch (PDOException $e) {
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit;
}

// ================================
// ADD a Holiday (with duplicate check and date reversal)
// ================================
if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST["action"]) && $_POST["action"] === "addHoliday") {

    // Ensure all required fields are provided.
    if (!isset($_POST['title'], $_POST['from_date'], $_POST['to_date'], $_POST['start_date'])) {
        echo json_encode(["success" => false, "error" => "Missing required fields."]);
        exit;
    }
    
    $title      = trim($_POST['title']);
    $from_date  = $_POST['from_date'];
    $to_date    = $_POST['to_date'];
    $start_date = $_POST['start_date'];
    $courses    = isset($_POST['courses']) ? $_POST['courses'] : 0;

    // Check that none of the required fields are empty.
    if (empty($title) || ( empty($from_date) && empty($to_date) ) || empty($start_date)) {
        echo json_encode(["success" => false, "error" => "All fields are required."]);
        exit;
    }

    // if one of the dates is empty, set it to the other.
    if (empty($from_date) && !empty($to_date)) {
        $from_date = $to_date;
    } elseif (empty($to_date) && !empty($from_date)) {
        $to_date = $from_date;
    }
    
    // Check if from_date is greater than to_date; if so, swap them.
    if (strtotime($from_date) > strtotime($to_date)) {
        $temp = $from_date;
        $from_date = $to_date;
        $to_date = $temp;
        $message = "Holiday dates were reversed for proper submission.";
        debug_to_db("Holiday dates were reversed for proper submission.", $debug_log);
    } else {
        $message = "";
    }

    // Check if from_date or to_date is smaller than start_date or reater then start_date+119 days.
    if (strtotime($from_date) < strtotime($start_date) || strtotime($to_date) > strtotime($start_date) + 119 * 86400) {
        echo json_encode(["success" => false, "error" => "Holiday dates are out of range."]);
        debug_to_db("Holiday dates are out of range.", $debug_log);
        exit;
    }

    try {
        // Check for duplicates.
        $stmt = $conn->prepare("SELECT COUNT(*) FROM Holidays WHERE user_id = ? AND from_date = ? AND to_date = ?");
        $stmt->execute([$user_id, $from_date, $to_date]);
        $count = $stmt->fetchColumn();

        if ($count > 0) {
            echo json_encode(["success" => false, "error" => "Holiday already exists."]);
            exit;
        }

        // Insert the new holiday.
        $stmt = $conn->prepare("INSERT INTO Holidays (user_id, start_date, title, from_date, to_date, courses) VALUES (?, ?, ?, ?, ?, ?)");
        $result = $stmt->execute([$user_id, $start_date, $title, $from_date, $to_date, $courses]);

        if ($result) {
            $response = ["success" => true, "message" => "Holiday added successfully."];
            if (!empty($message)) {
                $response["info"] = $message;
            }
            echo json_encode($response);
        } else {
            echo json_encode(["success" => false, "error" => "Failed to add holiday."]);
        }
    } catch (Exception $e) {
        echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

// ================================
// DELETE a Holiday
// ================================
if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST["action"]) && $_POST["action"] === "deleteHoliday") {
    if (!isset($_POST['h_id']) || empty($_POST['h_id'])) {
        echo json_encode(["success" => false, "error" => "Holiday ID missing."]);
        exit;
    }

    $holiday_id = $_POST['h_id'];

    try {
        // First, verify that the holiday exists for security purposes.
        $stmt = $conn->prepare("SELECT COUNT(*) FROM Holidays WHERE h_id = ? AND user_id = ?");
        $stmt->execute([$holiday_id, $user_id]);
        $count = $stmt->fetchColumn();

        if ($count == 0) {
            echo json_encode(["success" => false, "error" => "Holiday not found."]);
            exit;
        }

        // Perform the deletion
        $stmt = $conn->prepare("DELETE FROM Holidays WHERE h_id = ? AND user_id = ?");
        $stmt->execute([$holiday_id, $user_id]);

        echo json_encode(["success" => true]);
    } catch (PDOException $e) {
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit;
}
?>