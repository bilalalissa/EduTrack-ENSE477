<?php
// Enable error messages
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once("db.php");

session_start();

function test_input($data)
{
    if ($data === null) {
        return '';
    }
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data); // Encodes
    return $data;
}

// Check whether the form was submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $errors = array();
    $signupData = TRUE;
    $dataOK = TRUE;

    // Retrieve JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        echo json_encode(['message' => 'Invalid JSON input']);
        exit();
    }

    $usernameup = isset($input["username"]) ? test_input($input["username"]) : '';
    $email = isset($input["email"]) ? test_input($input["email"]) : '';
    $passwordup = isset($input["password"]) ? test_input($input["password"]) : '';
    $confirmPassword = $passwordup; // Assuming test case doesn't provide confirmPassword

    if ($passwordup == $confirmPassword) {
        $signupData = TRUE;
        $hashedPassword = password_hash($passwordup, PASSWORD_DEFAULT); // Hashing the password
    } else {
        $signupData = FALSE;
        $errors["Signup Error"] = "Passwords do not match!";
    }

    // Check whether the signup fields are not empty
    if ($signupData) {
        try {
            $db = $conn;
        } catch (PDOException $e) {
            echo json_encode(['message' => 'Database connection error']);
            exit();
        }

        // Check if the user already exists
        $query = "SELECT password_hash FROM Users WHERE username = :username OR email = :email";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':username' => $usernameup,
            ':email' => $email
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result) {
            // User already exists
            echo json_encode(['message' => 'User with this username or email already exists.']);
        } else {
            // Insert new user
            $insertQuery = "INSERT INTO Users (username, email, password_hash, last_login, status) VALUES (:username, :email, :password, NOW(), 'logged_in')";
            $insertStmt = $db->prepare($insertQuery);
            $insertStmt->execute([
                ':username' => $usernameup,
                ':email' => $email,
                ':password' => $hashedPassword
            ]);

            $_SESSION['signupSuccess'] = true;
            $_SESSION['signedUpUsername'] = $usernameup;
            $_SESSION['loggedinUsername'] = $usernameup;
            $_SESSION['signupUserId'] = $db->lastInsertId();


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
            debug_to_db("signup.php", $debug_log);
            // Check if the database connection is valid
            if ($conn instanceof PDO) {
                // On successful logout
                // Update last_logout and status in Users table
                if ($signedUp_id !== null) {
                    $user_id = $signedUp_id;  // Default to signed-up user if no user is signedUp
                }
                $updateStmt = $conn->prepare("UPDATE Users SET last_login = NOW(), status = 'logged_in' WHERE u_id = :user_id");
                $updateStmt->execute(['user_id' => $user_id]);
                debug_to_db("Database connection is valid. User ($username) successfully signed up.", $debug_log);
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
                        $user_id = $_SESSION['signupUserId']; // Get the logged-in user's ID
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

            // Redirect to home or other page
            header("Location: home.php");
            exit();
        }

        $db = null;
    } else {
        echo json_encode(['message' => 'You entered invalid data while signing up.']);
    }
} else {
    echo json_encode(['message' => 'Invalid request method.']);
}
?>



<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up - Personalized Academic Planner PAP</title>
    <link rel="stylesheet" href="./css/styles.css">
</head>

<body>
    <div class="wrapper">
        <header>
            <h1>[EduTrack] - Sign Up</h1>
            <nav>
                <button type="button" id="mainButton">Main</button>
            </nav>
        </header>
        <div class="main-container">
            <div class="right-section">
                <div class="form-container">
                    <form id="signupForm" method="POST" action="signup.php" enctype="multipart/form-data">
                        <h3>Sign-Up</h3>
                        <span class="note">* Fields are required</span>
                        <!-- Show error messages -->
                        <div class="error-message" id="signupError" style="color: red;">
                            <?php
                            if (!empty($errors)) {
                                foreach ($errors as $type => $message) {
                                    echo "$type:<br />";
                                }
                                // JavaScript code to focus the username field
                                // Ensure focus happens after the DOM is fully rendered
                                echo '<script>
                            setTimeout(function() {
                                const usernameInput = document.getElementById("username");
                                if (usernameInput) {
                                    usernameInput.focus();
                                }
                            }, 0);
                        </script>';
                            }
                            ?>
                        </div>
                        <div class="error-message" id="signupError" style="color: orange;">
                            <?php
                            if (!empty($errors)) {
                                foreach ($errors as $type => $message) {
                                    echo "$message";
                                }
                                // JavaScript code to focus the username field
                                // Ensure focus happens after the DOM is fully rendered
                                echo '<script>
                            setTimeout(function() {
                                const usernameInput = document.getElementById("username");
                                if (usernameInput) {
                                    usernameInput.focus();
                                }
                            }, 0);
                        </script>';
                            }
                            ?>
                        </div>
                        <div class="input-group">
                            <input type="text" id="username" name="usernameup" required placeholder="* Username">
                        </div>
                        <div class="input-group">
                            <input type="email" id="email" name="email" required placeholder="* Email">
                        </div>
                        <div class="input-group-1">
                            <input type="password" id="password" name="passwordup" required placeholder="* Password">
                            <input type="password" id="confirmPassword" name="confirmPassword" required
                                placeholder="* Confirm Password">
                        </div>

                        <div class="input-group-1">
                            <input type="text" id="firstName" name="firstName" placeholder="First Name">
                            <input type="text" id="lastName" name="lastName" placeholder="Last Name">
                        </div>
                        <div class="input-group">
                            <input type="text" id="studentNumber" name="studentNumber" placeholder="Student Number">
                        </div>

                        <!-- <div class="input-group file-input-group">
                            <label for="avatar">Avatar:</label>
                            <input type="file" id="avatar" name="avatar">
                        </div> -->
                        <div id="signupMessage" style="display:none;"></div>
                        <div class="form-footer">
                            <button type="submit" id="signupSubmit">Sign-up</button>
                        </div>
                    </form>

                </div>
            </div>
            <!-- You can add an info section here similar to the landing page if needed -->
        </div>
        <footer>
            <p>© ENSE 400, ENSE 477 Capstone 2024 - 2025</p>
        </footer>
    </div>

    <script src="./js/script.js"></script>
    <script src="./js/script2.js"></script>
</body>

</html>