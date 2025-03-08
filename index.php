<?php
// enabling error messages
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once("db.php");

// Start session for user identification
session_start();

////////////////////////
// Debugging System
////////////////////////
// Initialize logging system
function debug_to_db($message, &$debug_log)
{
    $debug_log[] = $message; // Add the log message to the log array
}
$debug_log = []; // Initialize debug log array
debug_to_db("index.php", $debug_log);
// Check if the database connection is valid
if ($conn instanceof PDO) {
    echo "<script>console.log('\\n1- Detecting DATABASE connection...');</script>";   // Debugging
    echo "<script>console.log('\\tDatabase connection is valid.');</script>";   // Debugging
    debug_to_db("Database connection is valid.", $debug_log);
} else {
    debug_to_db("Database connection is invalid.", $debug_log);
    echo "<script>console.log('\\n1- Detecting DATABASE connection...');</script>";   // Debugging
    echo "<script>console.log('\\tError: Unable to connect to the database.');</script>";   // Debugging
    die("Error: Unable to connect to the database.");
}
// Function to log data to the database
function log_to_db($user_id, $log_data, $conn)
{

    echo "<script>console.log('\\n3- Function log_to_db started...');</script>";  // Debugging
    try {


        if ($user_id === null) {
            $user_id = 0; // Default to system user if no user is logged in
            echo "<script>console.log('A-0 /try/if($user_id === null) \\nYou are not logged in. \\nuser ID: $user_id');</script>";   // Debugging
        }
        echo "<script>console.log('\\tA-1 /try \\n\\tCompare << SESSION >>. \\n\\tuser ID: $user_id');</script>";  // Debugging

        $stmt = $conn->prepare("INSERT INTO Logs (user_id, log_data) VALUES (:user_id, :log_data)");
        $stmt->execute([
            'user_id' => $user_id,
            'log_data' => json_encode($log_data)
        ]);
        debug_to_db("User ID verfied. user ID: $user_id", $log_data);

        echo "<script>console.log('\\tA-2 /try/conn \\n\\tCompare << DATABASE >>. \\n\\tuser ID: $user_id');</script>";  // Debugging
    } catch (PDOException $e) {
        error_log("[Database error] User ID not verfied. Error: " . $e->getMessage());
        debug_to_db("[Database error] User ID ($user_id) not verfied. Error: " . $e->getMessage(), $log_data);

        echo "<script>console.log('\\tB- /catch \\n\\tFailed to log to database: " . $e->getMessage() . "');</script>";  // Debugging
    }
}
// // Get the user ID from the session variable or default to system user
// if (isset($_SESSION['user_id']) && !empty($_SESSION['user_id'])) {
//     $user_id = $_SESSION['user_id'];
//     echo "<script>console.log('\\n2- Detecting user...');</script>";   // Debugging
//     echo "<script>console.log('\\tuser ID: $user_id');</script>";  // Debugging
// } else {
//     $user_id = 0; // Default to system user for system-level logs
//     // debug_to_db("No user logged in. Using system user ID: $user_id", $debug_log);
//     echo "<script>console.log('\\n2- Detecting user...');</script>";   // Debugging
//     echo "<script>console.log('\\tNo user logged in. Using system user ID: $user_id');</script>";   // Debugging
// }
// Log to database
// log_to_db($user_id, $debug_log, $conn);

// debug logging system
echo "<script>console.log('\\n\\nLogging system:');</script>";   // Debugging
echo "<script>console.log('" . json_encode($debug_log) . "');</script>";   // Debugging

// Function to sanitize input data
function test_input($data)
{
    debug_to_db("Sanitizing input data: $data", $debug_log);
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return htmlspecialchars(trim(stripslashes($data)));
}

// // If user is already logged in, redirect to dashboard
// if (isset($_SESSION['username'])) {
//     $user_id = $_SESSION['user_id'];
//     debug_to_db("User already logged in with ID: $user_id", $debug_log);
//     log_to_db($user_id, $debug_log, $conn);
//     echo "<script>console.log('You are already logged in.');</script>";   // Debugging
// } else {
//     debug_to_db("No user logged in. Logging as system user.", $debug_log);
//     log_to_db(0, $debug_log, $conn);
//     echo "<script>console.log('You are not logged in.');</script>";   // Debugging
// }

// Handle signup and login logic
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $errors = array();

    $username = isset($_POST["username"]) ? test_input($_POST["username"]) : '';   // Called by field name not id
    $password = isset($_POST["password"]) ? test_input($_POST["password"]) : '';

    // debugging
    debug_to_db("analyzing POST request started.", $debug_log);


    // Add debug info for input fields
    if (isset($_POST['action'])) {
        $action = $_POST['action'];
        debug_to_db("Received POST request for action: $action", $debug_log);

        echo "<script>console.log('from index.php/ Data retrieved from database. user ID: $user_id');</script>";  // Debugging
    }

    // Validate username and password
    if (!empty($username) && !empty($password)) {
        try {
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); // Enable error mode

            // Query the database to check whether the username exists
            $query = "SELECT u_id, username, password_hash FROM users WHERE username = :username";
            $stmt = $conn->prepare($query); // Prepare the statement, bind the parameter
            $stmt->execute([':username' => $username]); // Execute the statement, fetch the result as an associative array (key-value pairs)

            $result = $stmt->fetch(PDO::FETCH_ASSOC);   // Fetch the result as an associative array (key-value pairs)

            if ($result) {
                // Verify the password
                if (password_verify($password, $result['password_hash'])) {
                    $user_id = $result['u_id'];
                    $username = $result['username'];
                    $_SESSION['username'] = $result['username'];
                    $_SESSION['signupSuccess'] = false;
                    $_SESSION['loggedinUsername'] = $username;
                    $_SESSION['loggedinID'] = $user_id;

                    // On successful login
                    // Update last_login and status in Users table
                    $updateStmt = $conn->prepare("UPDATE Users SET last_login = NOW(), status = 'logged_in' WHERE u_id = :user_id");
                    $updateStmt->execute(['user_id' => $user_id]);

                    // Log the user in
                    echo "<script>console.log('User ($username) logged in successfully.');</script>";   // Debugging
                    debug_to_db("User logged in successfully: $username", $debug_log);

                    // Redirect to home page
                    header("Location: home.php");

                    echo "<script>console.log('from index.php/ Data retrieved from database. username: $username');</script>";  // Debugging

                    exit();
                } else {
                    // Password is incorrect
                    $errors["Login Failed"] = "Incorrect password.";
                    debug_to_db("Incorrect password for user: $username", $debug_log);
                    echo "<script>console.log('Incorrect password.');</script>";   // Debugging
                }
            } else {
                // Username does not exist
                $errors["Login Failed"] = "Username does not exist.";
                debug_to_db("Username does not exist: $username", $debug_log);
                echo "<script>console.log('Username does not exist.');</script>";   // Debugging
            }
        } catch (PDOException $e) {
            // Database error
            $errors["Database Error"] = $e->getMessage();
            debug_to_db("Database error: " . $e->getMessage(), $debug_log);
            echo "<script>console.log('Database error: " . $e->getMessage() . "');</script>";   // Debugging
        }
    } else {
        // Both username and password are required
        $errors['Login Failed'] = "Username and password are required.";
        debug_to_db("Username and password are required.", $debug_log);
        echo "<script>console.log('Username and password are required.');</script>";   // Debugging
        // Redirect to login page with error message
        header("Location: index.php?error=Username and password are required.");
        exit();
    }
}

// Log to database for initial page load
if (!isset($_SESSION['username'])) {
    debug_to_db("End of index.php Logging.", $debug_log);
    log_to_db(0, $debug_log, $conn);
} else {
    // $user_id = $_SESSION['user_id']; // Get the logged-in user's ID, $user_id is not defined, fix it by giving it the value from the session variable or database
    $user_id = $_SESSION['user_id'];
    debug_to_db("End of index.php Logging.", $debug_log);
    log_to_db($user_id, $debug_log, $conn);
}

?>





<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[EduTrack] Personalized Academic Planner</title>
    <link rel="stylesheet" href="css/styles.css">
</head>

<body>
    <div class="wrapper">
        <header>
            <h1>EduTrack</h1>
        </header>
        <div class="main-container">
            <div class="left-section">
                <form id="loginForm" method="POST" action="index.php">
                    <h3>Login</h3>
                    <!-- Show error messages -->
                    <div class="error-message" id="loginError" style="color: red;">
                        <?php
                        if (!empty($errors)) {
                            foreach ($errors as $type => $message) {
                                echo "$type:<br />";
                            }
                            // JavaScript code to focus the username field
                            // Ensure focus happens after the DOM is fully rendered
                            echo '<script>
                            setTimeout(function() {
                                const usernameInput = document.getElementById("usernames");
                                if (usernameInput) {
                                    usernameInput.focus();
                                }
                            }, 0);
                        </script>';
                        }
                        ?>
                    </div>
                    <div class="error-message" id="loginError" style="color: orange;">
                        <?php
                        if (!empty($errors)) {
                            foreach ($errors as $type => $message) {
                                echo "$message";
                            }
                            // JavaScript code to focus the username field
                            // Ensure focus happens after the DOM is fully rendered
                            echo '<script>
                            setTimeout(function() {
                                const usernameInput = document.getElementById("usernames");
                                if (usernameInput) {
                                    usernameInput.focus();
                                }
                            }, 0);
                        </script>';
                        }
                        ?>
                    </div>
                    <div class="input-group">
                        <input type="text" id="usernames" name="username" required placeholder="Username">
                    </div>
                    <div class="input-group">
                        <input type="password" id="password" name="password" required placeholder="Password">
                    </div>
                    <div class="form-footer">
                        <button type="button" id="signupButton">Sign-up</button>
                        <button type="submit" id="loginButton">Login</button>
                    </div>
                </form>
            </div>

            <div class="right-section">
                <div class="content">
                    <!-- TODO add corosal-->

                    <h2>Welcome to Personalized Academic Planner EduTrack</h2>
                    <p><strong>Embark on Your Organized Academic Journey!</strong></p>
                    <p>Welcome to Personalized Academic Planner EduTrack, your innovative companion in the realm
                        of
                        academic organization and efficiency. EduTrack is designed to transform how students,
                        educators,
                        and
                        academic professionals approach their daily, weekly, and long-term educational planning.
                        With
                        EduTrack, navigating through your academic life becomes not just easier, but more
                        effective and
                        enjoyable.</p>

                    <h2>Why Choose EduTrack?</h2>
                    <!-- TODO make it shorter and clearar-->
                    <ul>
                        <li><strong>Customized Planning</strong>: Tailor your academic schedule to fit your
                            unique
                            needs. Whether you're juggling multiple courses, assignments, or exams, EduTrack
                            adapts to
                            your
                            personal study habits and goals.</li>
                        <li><strong>Streamlined Organization</strong>: Say goodbye to cluttered notes and missed
                            deadlines. EduTrack's intuitive interface allows you to organize your academic tasks
                            with
                            ease.
                            Track your assignments, exams, course schedules, and more—all in one place.</li>
                        <li><strong>Progress Tracking</strong>: Monitor your academic progress with built-in
                            tracking
                            features. Set milestones and celebrate your achievements as you move closer to your
                            academic
                            objectives.</li>
                        <li><strong>Collaborative Tools</strong>: Collaborate with peers or educators
                            effortlessly.
                            Share your schedules, coordinate study sessions, or work on group projects, making
                            teamwork
                            more efficient and less stressful.</li>
                        <li><strong>Accessible Anywhere</strong>: With cloud-based technology, your planner is
                            accessible across multiple devices. Whether you're at home, in the library, or on
                            the go,
                            EduTrack is right there with you.</li>
                        <li><strong>Personalized Reminders</strong>: Never miss an important date again.
                            EduTrack sends
                            you
                            personalized reminders about upcoming deadlines, ensuring you're always on track.
                        </li>
                        <li><strong>Enhanced Focus</strong>: With all your academic responsibilities clearly
                            organized,
                            you can focus more on learning and less on managing schedules.</li>
                    </ul>

                    <h2>Join the EduTrack Community</h2>
                    <p>Become part of a growing community that values structured and stress-free academic life.
                        Whether
                        you're a high school student, a college attendee, or an academic professional, EduTrack
                        is your
                        partner in achieving academic excellence.</p>
                    <p>Start your journey today with Personalized Academic Planner [EduTrack] – where your
                        academic
                        success
                        is our priority!</p>
                </div>
            </div>
        </div>
        <footer>
            <p>© ENSE 400, ENSE 477 Capstone 2024 - 2025</p>
        </footer>
    </div>
    <!-- <script src="/js/script.js" defer></script> -->

    <script src="js/script.js"></script>
    <script src="js/script2.js"></script>

</body>

</html>