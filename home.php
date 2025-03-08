<?php
// Path: EduTrack/home.php made some changes by me
// enabling error messages
// Testing and Debugging and Optimization still ON
// ini_set('display_errors', 1);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('display_errors', 0);
error_reporting(E_ERROR | E_PARSE);

require_once("db.php"); // Includes db.php, which initializes $conn

// Start output buffering
// ob_start();

// Set headers to return JSON
// header('Content-Type: application/json');

// Start session for user identification
session_start();
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
debug_to_db("home.php", $debug_log);
// Check if the database connection is valid
if ($conn instanceof PDO) {
    debug_to_db("Database connection is valid. User ( $username ) successfully logged in.", $debug_log);
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
log_to_db($user_id, $debug_log, $conn);
////////////////////////
// Debugging System - END
////////////////////////

function test_input($data)
{
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}


//     // Check if date already exists
//     $query = "SELECT s_id FROM Settings WHERE date = :date";
//     $stmt = $db->prepare($query);
//     $stmt->execute([':date' => $date]);

//     $result = $stmt->fetch(PDO::FETCH_ASSOC);

//     if ($result) {
//         echo 'The date you entered ' . $date . ' already exists.';
//     } else {
//         // Insert the new date
//         $insertQuery = "INSERT INTO Settings (date) VALUES (:date)";
//         $insertStmt = $db->prepare($insertQuery);
//         if ($insertStmt->execute([':date' => $date])) {
//             echo "New record created successfully. Last inserted ID is: " . $db->lastInsertId();
//         } else {
//             $errorInfo = $insertStmt->errorInfo();
//             echo "Error: " . $errorInfo[2]; // ErrorInfo returns an array of error information
//         }
//     }

//     $db = null;
//     exit();
// }

// code commented out for debugging
// Add new year
// if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['year'])) {
//     $year = $_POST['year'];

//     // Connect to the database and verify the connection
//     try {
//         $db = $conn;
//     } catch (PDOException $e) {
//         throw new PDOException($e->getMessage(), (int)$e->getCode());
//     }

//     // Check if year already exists
//     $query = "SELECT y_id FROM years WHERE year = :year";
//     $stmt = $db->prepare($query);
//     $stmt->execute([':year' => $year]);

//     $result = $stmt->fetch(PDO::FETCH_ASSOC);

//     if ($result) {
//         echo 'The year you entered ' . $year . ' already exists.';
//     } else {
//         // Insert the new year
//         $insertQuery = "INSERT INTO years (year) VALUES (:year)";
//         $insertStmt = $db->prepare($insertQuery);
//         if ($insertStmt->execute([':year' => $year])) {
//             echo "New record created successfully. Last inserted ID is: " . $db->lastInsertId();
//         } else {
//             $errorInfo = $insertStmt->errorInfo();
//             echo "Error: " . $errorInfo[2]; // ErrorInfo returns an array of error information
//         }
//     }

//     $db = null;
//     exit();
// }

?>




<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Home - Personalized Academic Planner EduTrack</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <!-- to show balla icons -->
    <link rel="stylesheet" href="./css/styles.css">
    <!-- Include jQuery for simplicity to show slide down conrats message, and for courses list in script2.js -->
    <script>
        // Initialize window.courseMap
        window.courseMap = {};
        fetch('tasksHandler.php?action=getCourses')
            .then(response => response.json())
            .then(data => {
                if (data.status === "success" && data.courses) {
                    data.courses.forEach(course => {
                        window.courseMap[course.id] = course.name;
                    });
                }
            })
            .catch(error => console.error('Error fetching courses:', error));
    </script>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
    <script src="./js/script.js"></script>

    <!-- Include CSS and JS for roundSlider -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/roundSlider/1.6.1/roundslider.min.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/roundSlider/1.6.1/roundslider.min.js"></script>
    <style>
        .circular-slider {
            position: relative;
            width: 55px;
            height: 55px;
            border-radius: 50%;
            background: conic-gradient(#6495ed 0deg,
                    rgba(100, 148, 237, 0) var(--angle),
                    rgba(224, 224, 224, 0) var(--angle),
                    rgba(224, 224, 224, 0) 360deg);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            font-weight: bold;
            color: black;
        }

        .circular-slider .value-display {
            position: absolute;
            background: #262626;
            border-radius: 50%;
            color: #6495ed;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .circular-slider input {
            display: none;
        }
    </style>
</head>

<body>
    <div class="wrapper">
        <header>
            <!-- TODO : Add a style to slide down the message over the h1 header -->
            <div class="success-message" style="color: rgb(0, 255, 50);">
                <h2>
                    <?php
                    // Check if signup was successful
                    if (isset($_SESSION['signupSuccess']) && $_SESSION['signupSuccess']) {
                        $username = $_SESSION['signedUpUsername'];
                        echo "<div id='successMessage' style='display:none;'>Congratulations, $username. You have successfully signed up!</div>";
                        unset($_SESSION['signupSuccess']);
                        unset($_SESSION['signedUpUsername']);
                    }
                    // Display the success message
                    echo "<script>
                            $(document).ready(function() {
                                $('#successMessage').slideDown(1000).delay(3000).slideUp(1000); // Adjust timing as needed
                            });
                            </script>";
                    ?>
                </h2>
            </div>
            <h1>[<span id="usernameDisplay">
                    <?php
                    if (isset($_SESSION['loggedinUsername']) && $_SESSION['loggedinUsername']) {
                        echo htmlspecialchars('Welcome: ' . $_SESSION['loggedinUsername']);
                    } else {
                        echo " USERNAME";
                    }
                    ?>
                </span>] [EduTrack] - Home</h1>
            <div>
                <button id="exitButton" class="action-button left-button">Exit</button>
                <a href="Transcribe/index.html">
                    <button type="button">Transcribe</button>
                </a>
                <a href="addReminder.html">
                    <button type="button">Add Reminder</button>
                </a>
            </div>

        </header>

        <div class="main-container">
            <div class="left-section">
                <span class="clsTitle">Quizzes</span>
                <details>
                    <!-- show balla icones -->
                    <summary>
                        <i class="fas fa-circle ball-red"></i> <!-- Filled ball icon -->
                        <i class="fas fa-circle ball-yellow"></i> <!-- Filled ball icon -->
                        <i class="fas fa-circle ball-green"></i> <!-- Filled ball icon -->
                        |
                        <!-- | is a course separator  -->
                        <i class="fas fa-circle ball-red"></i> <!-- Filled ball icon -->
                        <i class="fas fa-circle ball-yellow"></i> <!-- Filled ball icon -->
                        <i class="fas fa-circle ball-green"></i> <!-- Filled ball icon -->
                        <!-- <i class="fas fa-circle"></i> Filled ball icon -->
                        <!-- <i class="fas fa-adjust"></i> Half-filled ball icon -->
                    </summary>
                    <div class="segment">
                        <div class="subseg">
                            <sub>Course-1</sub>
                            <div class="subsubseg">
                                <sup>Qz-1</sup>
                                <div class="circular-slider" data-value="">
                                    <!-- <div class="progress"></div> -->
                                    <!-- <div class="thumb"></div> -->
                                    <div class="value-display"></div>
                                    <input type="range" class="c-rng" min="0" max="15" step="1" value="5" />
                                </div>

                                <sup>Qz-2</sup>
                                <div class="circular-slider" data-value="">
                                    <!-- <div class="progress"></div> -->
                                    <!-- <div class="thumb"></div> -->
                                    <div class="value-display"></div>
                                    <input type="range" class="c-rng" min="0" max="15" step="1" value="8" />
                                </div>

                                <sup>Qz-3</sup>
                                <div class="circular-slider" data-value="">
                                    <!-- <div class="progress"></div> -->
                                    <!-- <div class="thumb"></div> -->
                                    <div class="value-display"></div>
                                    <input type="range" class="c-rng" min="0" max="15" step="1" value="14" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="line"></div>
                    <div class="segment">
                        <div class="subseg">
                            <sub>Course-2</sub>
                            <div class="subsubseg">
                                <sup>Qz-1</sup>
                                <div class="circular-slider" data-value="">
                                    <!-- <div class="progress"></div> -->
                                    <!-- <div class="thumb"></div> -->
                                    <div class="value-display"></div>
                                    <input type="range" class="c-rng" min="0" max="15" step="1" value="1" />
                                </div>

                                <sup>Qz-2</sup>
                                <div class="circular-slider" data-value="">
                                    <!-- <div class="progress"></div> -->
                                    <!-- <div class="thumb"></div> -->
                                    <div class="value-display"></div>
                                    <input type="range" class="c-rng" min="0" max="15" step="1" value="9" />
                                </div>

                                <sup>Qz-3</sup>
                                <div class="circular-slider" data-value="">
                                    <!-- <div class="progress"></div> -->
                                    <!-- <div class="thumb"></div> -->
                                    <div class="value-display"></div>
                                    <input type="range" class="c-rng" min="0" max="20" step="1" value="20" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="line"></div>
                </details>
                <br />

                <span class="clsTitle">Assignments</span>
                <details>
                    <summary>
                        <i class="fas fa-circle ball-red"></i> <!-- Filled ball icon -->
                        <i class="fas fa-circle ball-yellow"></i> <!-- Filled ball icon -->
                    </summary>
                    <div class="segment">
                        <div class="subseg">
                            <sub>Course-1</sub>
                            <div class="subsubseg">
                                <sup>Asmnt-1</sup>
                                <sup class="duration-attention">2 days</sup>
                            </div>
                            <div class="subsubseg">
                                <sup>Asmnt-2</sup>
                                <sup class="duration-critical">7 days</sup>
                            </div>
                        </div>
                    </div>
                    <div class="line"></div>
                </details>
                <br />

                <span class="clsTitle">Projects</span>
                <details>
                    <summary>
                        <i class="fas fa-circle ball-yellow"></i> <!-- Filled ball icon -->
                        |
                        <!-- Course Separator -->
                        <i class="fas fa-circle ball-green"></i> <!-- Filled ball icon -->
                    </summary>
                    <div class="segment">
                        <div class="subseg">
                            <sub>Course-1</sub>
                            <div class="subsubseg">
                                <sup>Proj-1</sup>
                                <sup class="duration-critical">7 days</sup>
                            </div>
                        </div>
                    </div>
                    <div class="line"></div>
                    <div class="segment">
                        <div class="subseg">
                            <sub>Course-2</sub>
                            <div class="subsubseg">
                                <sup>Proj-1</sup>
                                <sup class="duration-regular">15 days</sup>
                            </div>
                        </div>
                    </div>
                    <div class="line"></div>
                </details>
                <br />


                <span class="clsTitle">MTs</span>
                <details>
                    <summary>
                        <i class="fas fa-circle ball-red"></i> <!-- Filled ball icon -->
                        <i class="fas fa-circle ball-green"></i> <!-- Filled ball icon -->
                        |
                        <!-- Course Separator -->
                        <i class="fas fa-circle ball-green"></i> <!-- Filled ball icon -->
                    </summary>
                    <div class="segment">
                        <div class="subseg">
                            <sub>Course-1</sub>
                            <div class="subsubseg">
                                <sup>MT-1</sup>
                                <sup class="duration-attention">2 days</sup>
                            </div>
                            <div class="subsubseg">
                                <sup>MT-2</sup>
                                <sup class="duration-regular">25 days</sup>
                            </div>
                        </div>
                    </div>
                    <div class="line"></div>
                    <div class="segment">
                        <div class="subseg">
                            <sub>Course-2</sub>
                            <div class="subsubseg">
                                <sup>MT-1</sup>
                                <sup class="duration-regular">15 days</sup>
                            </div>
                        </div>
                    </div>
                    <div class="line"></div>
                </details>
                <br />


                <span class="clsTitle">Finals</span>
                <details>
                    <summary>
                        <i class="fas fa-circle ball-yellow"></i> <!-- Filled ball icon -->
                        |
                        <!-- Course Separator -->
                        <i class="fas fa-circle ball-green"></i> <!-- Filled ball icon -->
                    </summary>
                    <div class="segment">
                        <div class="subseg">
                            <sub>Course-1</sub>
                            <div class="subsubseg">
                                <sup>Final-1</sup>
                                <sup class="duration-critical">40 days</sup>
                            </div>
                        </div>
                    </div>
                    <div class="line"></div>
                    <div class="segment">
                        <div class="subseg">
                            <sub>Course-2</sub>
                            <div class="subsubseg">
                                <sup>Final-1</sup>
                                <sup class="duration-regular">70 days</sup>
                            </div>
                        </div>
                    </div>
                    <div class="line"></div>
                </details>
                <br />

            </div>

            <div class="mid-section">

                <div class="schd-section">
                    <h3>Schdeule</h3>
                    <p>More work will be added here.</p>
                </div>
                <!-- End of schd-section -->


                <!-- Tasks Section -->
                <div class="tasks-section">
                    <div class="tasks-section-header">
                        <h3>Tasks</h3>

                        <!-- + Add Task button (visible on page load) -->
                        <button id="addTaskBtn">+ Add Task</button>
                    </div>

                    <!-- Tasks input form (initially hidden) -->
                    <form id="tasksForm" method="POST" action="tasksHandler.php">
                        <!-- Hidden field for start_date (populated from Settings) -->
                        <input type="hidden" name="start_date" id="start_date" value="<?php
                                                                                        $stmt = $conn->prepare("SELECT date FROM Settings WHERE user_id = ? AND is_start_date = 1 LIMIT 1");
                                                                                        $stmt->execute([$_SESSION['loggedinID']]);
                                                                                        if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                                                                                            echo htmlspecialchars($row['date']);
                                                                                        }
                                                                                        ?>">

                        <!-- Select Course -->
                        <label for="course_id">Select Course:</label>
                        <select name="course_id" id="course_id" required>
                            <option value="">--Select Course--</option>
                            <?php
                            $stmt = $conn->prepare("SELECT c_id, courseName FROM Courses WHERE user_id = ?");
                            $stmt->execute([$_SESSION['loggedinID']]);
                            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                                echo '<option value="' . htmlspecialchars($row['c_id']) . '">' . htmlspecialchars($row['courseName']) . '</option>';
                            }
                            ?>
                        </select>
                        <br>

                        <!-- Select Task Type -->
                        <label for="task_type">Task Type:</label>
                        <select name="task_type" id="task_type" required>
                            <option value="">--Select Task Type--</option>
                            <option value="Assignment">Assignment</option>
                            <option value="Quiz">Quiz</option>
                            <option value="Project">Project</option>
                            <option value="MT">MT</option>
                            <option value="Final">Final</option>
                        </select>
                        <br>

                        <!-- Title -->
                        <label for="title">Title:</label>
                        <input type="text" name="title" id="title" required>
                        <br>

                        <!-- From Date -->
                        <label for="from_date">From Date:</label>
                        <input type="date" name="from_date" id="from_date" required>
                        <br>

                        <!-- To Date -->
                        <label for="to_date">To Date:</label>
                        <input type="date" name="to_date" id="to_date" required>
                        <br>

                        <!-- Status -->
                        <label for="status">Status:</label>
                        <select name="status" id="status" required>
                            <option value="">--Select Status--</option>
                            <option value="on_hold">On Hold</option>
                            <option value="in_process">In Process</option>
                            <option value="submitted">Submitted</option>
                        </select>
                        <br>

                        <!-- TODO to be replaced with the two new actual date fields-->
                        <!-- Suggested Date -->
                        <label for="suggested_date">Suggested Date:</label>
                        <input type="date" name="suggested_date" id="suggested_date" required>
                        <br>

                        <!-- Actual Start Date -->
                        <label for="actual_start_date">Actual Start Date:</label>
                        <input type="date" name="actual_start_date" id="actual_start_date" required>
                        <br>

                        <!-- Actual End Date -->
                        <label for="actual_end_date">Actual End Date:</label>
                        <input type="date" name="actual_end_date" id="actual_end_date" required>
                        <br>

                        <!-- Percent -->
                        <label for="percent">Percent:</label>
                        <input type="number" name="percent" id="percent" min="0" max="100" required>
                        <br>

                        <!-- Priority -->
                        <label for="priority">Priority:</label>
                        <select name="priority" id="priority" required>
                            <option value="">--Select Priority--</option>
                            <option value="n">Normal</option>
                            <option value="m">Medium</option>
                            <option value="h">High</option>
                        </select>
                        <br>

                        <!-- Details -->
                        <label for="details">Details:</label>
                        <textarea name="details" id="details"></textarea>
                        <br>

                        <!-- Form buttons: Submit and Cancel -->
                        <button type="submit">Submit Task</button>
                        <button type="button" id="cancelTaskBtn">Cancel</button>
                    </form>

                    <!-- Tasks list container (will be populated and grouped by courss) -->
                    <ul class="tasksList"></ul>
                </div>

                <!-- Output a JavaScript mapping of course id to course name -->
                <script>
                    var courseMapping = <?php
                                        $stmt = $conn->prepare("SELECT c_id, courseName FROM Courses WHERE user_id = ?");
                                        $stmt->execute([$_SESSION['loggedinID']]);
                                        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
                                        ?>;
                    var courseMap = {};
                    courseMapping.forEach(function(cls) {
                        courseMap[cls.c_id] = cls.courseName;
                    });
                </script>
                <!-- End of Tasks Section -->



                <!-- Courses Section -->
                <div class="courses-section">
                    <h3>Courses</h3>
                    <form id="coursesForm">
                        <label for="courseName">Course Name: </label>
                        <input type="text" id="courseName" name="courseName" placeholder="Enter course name" required>

                        <label for="courseNotes">Course Notes: </label>
                        <textarea id="courseNotes" name="courseNotes" placeholder="Enter course notes"></textarea>

                        <button type="submit">Submit</button>
                    </form>
                    <ul class="coursesList">
                        <!-- The list of courses will be dynamically loaded here -->
                    </ul>
                    <br><br>
                    <span>Note: <code style="color: red;">Deleting a course</code> will delete all related
                        tasks.</span>
                </div>

                <div class="settings-section">
                    <h3>Settings</h3>
                    <form id="settingsForm">
                        <label for="dateInput">Date: </label>
                        <input type="date" id="dateInput" name="date" placeholder="Add a date" />
                        <button type="submit">Submit</button>
                    </form>
                    <div class="datesList">
                        <?php
                        // Ensure only the logged-in user's dates are fetched
                        $stmt = $conn->prepare("SELECT date, is_start_date FROM Settings WHERE user_id = ? ORDER BY date ASC");
                        $stmt->execute([$_SESSION['loggedinID']]);
                        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                            $checked = $row['is_start_date'] ? 'checked' : '';
                            echo "<div class='dateItem'>
                <label>
                    <input type='radio' name='startDate' value='{$row['date']}' $checked>
                    {$row['date']}
                </label>
                <button class='editBtn'>Edit</button>
                <button class='deleteBtn'>Delete</button>
              </div>";
                        }
                        ?>
                    </div>
                    <br />

                    <!-- Holidays Section -->
                    <div class="holidays-section">
                        <h4>Holidays</h4>
                        <button id="addHolidayBtn">➕ Add Holiday</button>
                        <!-- Holiday Input Fields (Initially Hidden) -->
                        <div id="holidayFormContainer" style="display: none;">
                            <form id="holidayForm">
                                <label for="holidayTitle">Title:</label>
                                <input type="text" id="holidayTitle" name="holidayTitle" required>

                                <label for="holidayFrom">From:</label>
                                <input type="date" id="holidayFrom" name="holidayFrom" required>

                                <label for="holidayTo">To:</label>
                                <input type="date" id="holidayTo" name="holidayTo" required>

                                <label>
                                    <input type="checkbox" id="holidayCourses" name="holidayCourses">
                                    Applies to Courses
                                </label>

                                <button type="submit">Save Holiday</button>
                                <button type="button" id="cancelHoliday">Cancel</button>
                            </form>
                        </div>
                        <ul class="holidaysList"></ul>
                    </div>



                    <br>

                    <!-- TODO finish working on Download Logs -->
                    <div class="logs-section">
                        <button id="downloadLogsBtn">Download Logs</button>
                    </div>
                    <br><br>
                    <span>Note:
                        <ul>
                            <li>
                                <strong><code style="color: #00ff32;"> Selecting a date </code></strong>
                                to build the schedule matrix.
                            </li>
                            <li>
                                <strong><code style="color: orange;"> Unselecting a date </code></strong>
                                will cancel displaying the related schedule matrix.
                            </li>
                            <li>
                                <strong><code style="color: red;"> Deleting a date </code></strong>
                                will delete the related schedule matrix.
                            </li>

                        </ul>
                    </span>
                </div>



            </div>

            <div class="mid-tap">
                <div class="button-container">
                    <button class="vertical-button" id="schdBtn" style="background-color: #6f622ca6;">Schdeule</button>
                    <button class="vertical-button" id="taskBtn" style="background-color: #586729a6;">Tasks</button>
                    <button class="vertical-button" id="coursesBtn"
                        style="background-color: #1e411ea6;">Courses</button>
                    <button class="vertical-button" id="settingsBtn"
                        style="background-color:rgba(49, 49, 49, 0.63);">Settings</button>
                    <!-- Add more buttons as needed -->
                </div>
            </div>


            <div class="right-section">

                <div class="schd-header">
                    <!-- Header rows go here -->
                </div>
                <div class="schd-body">
                    <div class="schd-matrix">
                        <!-- The schedule grid (matrix body) rows will be built here -->
                    </div>
                </div>
            </div>
        </div>

        <footer>
            <p>© ENSE 400, ENSE 477 Capstone 2024 - 2025</p>
        </footer>
    </div>

    <div class="schd-container">
        <div class="schd-header"></div>
        <div class="schd-body">
            <div class="schd-matrix"></div>
        </div>
    </div>

    <script>
        // JavaScript code for the circular slider
        document.addEventListener("DOMContentLoaded", function() {
            const sliders = document.querySelectorAll(".circular-slider");

            sliders.forEach(slider => {
                const rangeInput = slider.querySelector(".c-rng");
                const valueDisplay = slider.querySelector(".value-display");

                function updateSlider() {
                    let value = rangeInput.value;
                    let max = rangeInput.max;
                    let percentage = (value / max) * 100; // Calculate percentage
                    let angle = (percentage / 100) * 360; // Convert to degrees

                    // Determine the color based on percentage
                    let color;
                    if (percentage >= 75) {
                        color = "#00ff32";
                    } else if (percentage >= 40) {
                        color = "#ffff01";
                    } else {
                        color = "#ff0000";
                    }

                    // Update the fill angle and color dynamically
                    slider.style.background = `conic-gradient(
                ${color} 0deg,
                rgba(100, 148, 237, 0) ${angle}deg,
                rgba(224, 224, 224, 0) ${angle}deg,
                rgba(224, 224, 224, 0) 360deg
            )`;

                    // Update text color of value display
                    valueDisplay.style.color = color;
                    valueDisplay.textContent = value;
                }

                rangeInput.addEventListener("input", updateSlider);
                updateSlider(); // Initialize with default value
            });
        });
    </script>


    <script src="./js/script2.js"></script>
    <script src="./js/matrixHighlighter.js"></script>
    <script src="./js/script3.js"></script>
</body>

</html>