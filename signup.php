<?php
// Enable error messages
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once("db.php");

// Define helper functions first
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

// Initialize logging system
function debug_to_db($message, &$debug_log)
{
    $debug_log[] = $message; // Add the log message to the log array
}

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

// Rate limiting function
function checkRateLimit($ip)
{
    $rateLimit = 5; // Maximum attempts
    $timeWindow = 300; // 5 minutes in seconds

    if (!isset($_SESSION['signup_attempts'][$ip])) {
        $_SESSION['signup_attempts'][$ip] = array(
            'count' => 0,
            'first_attempt' => time()
        );
    }

    $attempts = &$_SESSION['signup_attempts'][$ip];

    // Reset if time window has passed
    if (time() - $attempts['first_attempt'] > $timeWindow) {
        $attempts['count'] = 0;
        $attempts['first_attempt'] = time();
    }

    // Check if rate limit is exceeded
    if ($attempts['count'] >= $rateLimit) {
        $waitTime = $timeWindow - (time() - $attempts['first_attempt']);
        return array(
            'limited' => true,
            'wait_time' => ceil($waitTime / 60) // Convert to minutes
        );
    }

    $attempts['count']++;
    return array('limited' => false);
}

// Start session and initialize variables
session_start();

// Initialize variables
$errors = array();
$signupData = TRUE;
$debug_log = []; // Initialize debug log array
$isJsonRequest = isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false;

debug_to_db("signup.php", $debug_log);

// Check rate limit before processing
$clientIP = $_SERVER['REMOTE_ADDR'];
$rateLimitCheck = checkRateLimit($clientIP);
if ($rateLimitCheck['limited']) {
    if ($isJsonRequest) {
        echo json_encode(['status' => 'error', 'message' => "Too many signup attempts. Please try again in {$rateLimitCheck['wait_time']} minutes."]);
        exit();
    }
    $errors["Rate Limit"] = "Too many signup attempts. Please try again in {$rateLimitCheck['wait_time']} minutes.";
    $signupData = FALSE;
} else {
    // Check whether the form was submitted
    if ($_SERVER["REQUEST_METHOD"] == "POST") {
        $errors = array();
        $signupData = TRUE;

        if ($isJsonRequest) {
            // Handle JSON API request
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                echo json_encode(['status' => 'error', 'message' => 'Invalid JSON input']);
                exit();
            }
            $usernameup = isset($input["username"]) ? test_input($input["username"]) : '';
            $email = isset($input["email"]) ? test_input($input["email"]) : '';
            $passwordup = isset($input["password"]) ? test_input($input["password"]) : '';
            $confirmPassword = $passwordup;
            $firstName = isset($input["firstName"]) ? test_input($input["firstName"]) : '';
            $lastName = isset($input["lastName"]) ? test_input($input["lastName"]) : '';
            $studentId = isset($input["studentId"]) ? test_input($input["studentId"]) : '';
        } else {
            // Handle form submission
            $usernameup = isset($_POST["usernameup"]) ? test_input($_POST["usernameup"]) : '';
            $email = isset($_POST["email"]) ? test_input($_POST["email"]) : '';
            $passwordup = isset($_POST["passwordup"]) ? test_input($_POST["passwordup"]) : '';
            $confirmPassword = isset($_POST["confirmPassword"]) ? test_input($_POST["confirmPassword"]) : '';
            $firstName = isset($_POST["firstName"]) ? test_input($_POST["firstName"]) : '';
            $lastName = isset($_POST["lastName"]) ? test_input($_POST["lastName"]) : '';
            $studentId = isset($_POST["studentId"]) ? test_input($_POST["studentId"]) : '';
        }

        // Enhanced validation
        $errors = array();

        // Username validation
        if (empty($usernameup)) {
            $errors["Username Error"] = "Username is required.";
        } elseif (!preg_match('/^[a-zA-Z0-9_]{4,20}$/', $usernameup)) {
            $errors["Username Error"] = "Username must be 4-20 characters long and can only contain letters, numbers, and underscores.";
        }

        // Email validation
        if (empty($email)) {
            $errors["Email Error"] = "Email is required.";
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors["Email Error"] = "Invalid email format.";
        }

        // Password validation
        if (empty($passwordup)) {
            $errors["Password Error"] = "Password is required.";
        } elseif (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/', $passwordup)) {
            $errors["Password Error"] = "Password must be at least 8 characters long and contain one uppercase letter, one lowercase letter, one number, and one special character.";
        }

        // Password confirmation
        if ($passwordup !== $confirmPassword) {
            $errors["Password Error"] = "Passwords do not match.";
        }

        // Additional fields validation
        if (empty($firstName)) {
            $errors["First Name Error"] = "First name is required.";
        } elseif (!preg_match('/^[a-zA-Z\s]{2,50}$/', $firstName)) {
            $errors["First Name Error"] = "First name must be 2-50 characters long and can only contain letters.";
        }

        if (empty($lastName)) {
            $errors["Last Name Error"] = "Last name is required.";
        } elseif (!preg_match('/^[a-zA-Z\s]{2,50}$/', $lastName)) {
            $errors["Last Name Error"] = "Last name must be 2-50 characters long and can only contain letters.";
        }

        if (empty($studentId)) {
            $errors["Student ID Error"] = "Student ID is required.";
        } elseif (!preg_match('/^[0-9]{7,10}$/', $studentId)) {
            $errors["Student ID Error"] = "Please enter a valid student ID (7-10 digits).";
        }

        // If there are validation errors, return them
        if (!empty($errors)) {
            if ($isJsonRequest) {
                echo json_encode(['status' => 'error', 'message' => reset($errors)]);
                exit();
            }
            $signupData = FALSE;
        } else {
            $signupData = TRUE;
            $hashedPassword = password_hash($passwordup, PASSWORD_DEFAULT);
            debug_to_db("Password validation successful", $debug_log);
        }

        // Check whether the signup fields are not empty
        if ($signupData) {
            try {
                $db = $conn;
                debug_to_db("Database connection established", $debug_log);
            } catch (PDOException $e) {
                debug_to_db("Database connection failed: " . $e->getMessage(), $debug_log);
                if ($isJsonRequest) {
                    echo json_encode(['status' => 'error', 'message' => 'Database connection error']);
                    exit();
                }
                $errors["Database Error"] = "Connection failed";
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
                debug_to_db("User already exists with username: $usernameup or email: $email", $debug_log);
                if ($isJsonRequest) {
                    echo json_encode(['status' => 'error', 'message' => 'User with this username or email already exists.']);
                    exit();
                }
                $errors["Signup Error"] = "User with this username or email already exists.";
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

                // Insert user preferences
                $user_id = $_SESSION['signupUserId'];
                $prefQuery = "INSERT INTO UserPreferences (user_id, first_name, last_name, student_id, theme_preference) VALUES (:user_id, :first_name, :last_name, :student_id, 'light')";
                $prefStmt = $db->prepare($prefQuery);
                $prefStmt->execute([
                    ':user_id' => $user_id,
                    ':first_name' => $firstName,
                    ':last_name' => $lastName,
                    ':student_id' => $studentId
                ]);

                // Update user status and log the action
                $updateStmt = $conn->prepare("UPDATE Users SET last_login = NOW(), status = 'logged_in' WHERE u_id = :user_id");
                $updateStmt->execute(['user_id' => $user_id]);
                debug_to_db("User ($usernameup) successfully signed up", $debug_log);

                // Log to database
                log_to_db($user_id, $debug_log, $conn);

                if ($isJsonRequest) {
                    echo json_encode(['status' => 'success', 'message' => 'User created successfully']);
                } else {
                    header("Location: home.php");
                }
                exit();
            }

            $db = null;
        }
    }

    // Only proceed with HTML output if this is not a JSON request
    if (!$isJsonRequest) {
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
                            <form id="signupForm" method="POST" action="signup.php">
                                <!-- <h3>Sign-Up</h3> -->
                                <span class="note">* Fields are required</span>
                                <div class="input-group">
                                    <input type="text" id="username" name="usernameup" required placeholder="* Username">
                                    <div class="validation-message" id="usernameValidation"></div>
                                </div>
                                <div class="input-group">
                                    <input type="email" id="email" name="email" required placeholder="* Email">
                                    <div class="validation-message" id="emailValidation"></div>
                                </div>
                                <div class="input-group-1">
                                    <div class="input-group">
                                        <input type="password" id="password" name="passwordup" required placeholder="* Password">
                                        <div class="validation-message" id="passwordValidation"></div>
                                    </div>
                                    <div class="input-group">
                                        <input type="password" id="confirmPassword" name="confirmPassword" required placeholder="* Confirm Password">
                                        <div class="validation-message" id="confirmPasswordValidation"></div>
                                    </div>
                                </div>
                                <div class="input-group-1">
                                    <div class="input-group">
                                        <input type="text" id="firstName" name="firstName" required placeholder="* First Name">
                                        <div class="validation-message" id="firstNameValidation"></div>
                                    </div>
                                    <div class="input-group">
                                        <input type="text" id="lastName" name="lastName" required placeholder="* Last Name">
                                        <div class="validation-message" id="lastNameValidation"></div>
                                    </div>
                                </div>
                                <div class="input-group">
                                    <input type="text" id="studentId" name="studentId" required placeholder="* Student ID">
                                    <div class="validation-message" id="studentIdValidation"></div>
                                </div>
                                <div id="signupMessage" style="display:none;"></div>
                                <div class="form-footer">
                                    <button type="submit" id="signupSubmit">Sign-up</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <footer>
                    <p>© ENSE 400, ENSE 477 Capstone 2024 - 2025</p>
                </footer>
            </div>

            <script src="./js/script.js"></script>
            <script src="./js/script2.js"></script>
        </body>

        </html>
<?php
    }
}
?>