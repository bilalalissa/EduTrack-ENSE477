// script2.js

// Handling all mid sections and left-section divs scrolling show/hide
// Initializing all the mid-sections and the left-section
// Buttons
const schdBtn = document.getElementById('schdBtn');
const taskBtn = document.getElementById('taskBtn');
const coursesBtn = document.getElementById('coursesBtn');
const settingsBtn = document.getElementById('settingsBtn');
// Sections
const schdSection = document.querySelector('.schd-section');
const tasksSection = document.querySelector('.tasks-section');
const coursesSection = document.querySelector('.courses-section');
const settingsSection = document.querySelector('.settings-section');
const midSection = document.querySelector('.mid-section');
const leftSection = document.querySelector('.left-section');
// Definitions
let isMidSectionVisible = false;
let isScheduleSectionVisible = false;
let isTasksSectionVisible = false;
let isCoursesSectionVisible = false;
let isSettingsSectionVisible = false;
// Define courseMap
let courseMap = {};

// Function to load courses and populate coursMap
function loadCourses() {
    const startDate = $('input[name="startDate"]:checked').val();
    if (!startDate) {
        console.error("Start date is required.");
        return;
    }

    $.ajax({
        url: 'courses_Handler.php', // Adjust the URL to your endpoint
        type: 'POST',
        dataType: 'json',
        data: { action: 'list', start_date: startDate },
        success: function (response) {
            if (response.status === 'success') {
                response.courses.forEach(function (cls) {
                    courseMap[cls.c_id] = cls.courseName;
                });
            } else {
                console.error("Failed to load courses:", response.message);
            }
        },
        error: function (xhr, status, error) {
            console.error("Error loading courses:", error);
        }
    });
}

// Call loadCourses to initialize courseMap
loadCourses();

// Initially hide sections if they exist
if (midSection) midSection.style.display = 'none';
if (schdSection) schdSection.style.display = 'none';
if (tasksSection) tasksSection.style.display = 'none';
if (coursesSection) coursesSection.style.display = 'none';
if (settingsSection) settingsSection.style.display = 'none';

// New function: scroll the matrix so that it shows one week before today.
// This function calculates the difference in days between (today - 7 days) and the grid's start date,
// then scrolls the matrix horizontally to that column.
function scrollMatrixToWeekBeforeToday() {
    const schdMatrix = document.querySelector(".schd-matrix");
    if (!schdMatrix || !window.startDateForMatrix) return;
    const cellWidth = 40; // Adjust this value to match your cell width
    const today = new Date();
    // Calculate the target date (one week before today)
    const targetDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    // Calculate the difference in days between targetDate and the start date of the grid
    const diffDays = Math.floor((targetDate - window.startDateForMatrix) / (1000 * 60 * 60 * 24));
    const targetScrollLeft = diffDays * cellWidth;
    console.log("Scrolling matrix to left position:", targetScrollLeft);
    if (schdMatrix) schdMatrix.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
}

// ============================================================== 
//                          schdSection 
// ============================================================== 
if (schdBtn) {
    schdBtn.addEventListener('click', function () {
        // Toggle the state.
        isScheduleSectionVisible = !isScheduleSectionVisible;

        if (isScheduleSectionVisible) {
            // When the schedule section should be visible:
            // Show midSection and schedule section (with a slide-in effect).
            if (midSection) midSection.style.display = 'block';
            if (midSection) midSection.style.marginLeft = '0';
            if (schdSection) schdSection.style.display = 'block';
            if (schdSection) schdSection.style.marginLeft = '0';

            // Hide other content sections.
            if (tasksSection) tasksSection.style.display = 'none';
            if (coursesSection) coursesSection.style.display = 'none';
            if (settingsSection) settingsSection.style.display = 'none';

            // Hide other navigation buttons.
            if (taskBtn) taskBtn.style.display = 'none';
            if (coursesBtn) coursesBtn.style.display = 'none';
            if (settingsBtn) settingsBtn.style.display = 'none';

            // Optionally, hide the left section.
            if (leftSection) leftSection.style.display = 'none';
        } else {
            // When toggling off: slide out the schedule section.
            if (midSection) midSection.style.marginLeft = '-100%';
            if (schdSection) schdSection.style.marginLeft = '-100%';
            // After a short delay (to allow the slide-out animation to complete):
            setTimeout(function () {
                if (midSection) midSection.style.display = 'none';
                if (schdSection) schdSection.style.display = 'none';
                if (leftSection) leftSection.style.display = 'block';
                // Restore other navigation buttons.
                if (taskBtn) taskBtn.style.display = 'block';
                if (coursesBtn) coursesBtn.style.display = 'block';
                if (settingsBtn) settingsBtn.style.display = 'block';
                // Additionally, scroll the matrix so that it shows one week before today.
                scrollMatrixToWeekBeforeToday();
            }, 300); // Delay (in milliseconds) should match your sliding animation duration.
        }
    });
}

// ============================================================== 
//                          tasksSection 
// ============================================================== 
if (taskBtn) {
    taskBtn.addEventListener('click', function () {
        // Toggle the flag.
        isTasksSectionVisible = !isTasksSectionVisible;

        if (isTasksSectionVisible) {
            // When true: Show midSection and tasksSection (slide in)
            if (midSection) midSection.style.display = 'block';
            if (midSection) midSection.style.marginLeft = '0'; // Slide in
            if (tasksSection) tasksSection.style.display = 'block';
            if (tasksSection) tasksSection.style.marginLeft = '0'; // Slide in

            // Hide other content sections.
            if (schdSection) schdSection.style.display = 'none';
            if (coursesSection) coursesSection.style.display = 'none';
            if (settingsSection) settingsSection.style.display = 'none';

            // Hide navigation buttons except for the tasks button.
            if (schdBtn) schdBtn.style.display = 'none';
            if (coursesBtn) coursesBtn.style.display = 'none';
            if (settingsBtn) settingsBtn.style.display = 'none';

            // Optionally, hide the left section.
            if (leftSection) leftSection.style.display = 'none';
        } else {
            // When false: Slide out midSection and tasksSection.
            if (midSection) midSection.style.marginLeft = '-100%';
            if (tasksSection) tasksSection.style.marginLeft = '-100%';
            setTimeout(function () {
                if (midSection) midSection.style.display = 'none';
                if (tasksSection) tasksSection.style.display = 'none';
                // Restore the left section and all navigation buttons.
                if (leftSection) leftSection.style.display = 'block';
                if (schdBtn) schdBtn.style.display = 'block';
                if (coursesBtn) coursesBtn.style.display = 'block';
                if (settingsBtn) settingsBtn.style.display = 'block';
            }, 300); // Adjust delay to match your sliding animation duration
        }
    });
}

// ============================================================== 
//                         Handling Tasks 
// ============================================================== 
$(document).ready(function () {
    const addTaskBtn = $('#addTaskBtn');
    const tasksForm = $('#tasksForm');
    const tasksList = $('.tasksList');

    // Initially hide the tasks form.
    if (tasksForm) tasksForm.hide();

    // Function to load tasks via AJAX and group them by course.
    function loadTasks() {
        $.ajax({
            url: 'tasksHandler.php',
            type: 'POST',
            dataType: 'json',
            // Request all tasks by sending task_type: 'all'
            data: { action: 'list', task_type: 'all' },
            success: function (response) {
                if (response.status === 'success') {
                    // Group tasks by course_id.
                    let groups = {};
                    response.tasks.forEach(function (task) {
                        let cid = task.course_id;
                        if (!groups[cid]) {
                            groups[cid] = [];
                        }
                        groups[cid].push(task);
                    });

                    // Build HTML output for each course in courseMap.
                    let html = '';
                    for (let cid in courseMap) {
                        let cname = courseMap[cid] || ('Course ' + cid);
                        html += `<li><strong>${cname}:</strong><ul>`;
                        if (groups[cid] && groups[cid].length > 0) {
                            groups[cid].forEach(function (task) {
                                html += `<li>
                                    <div class="taskDiv">
                                        <input type="text" class="ctaskValue" disabled value="${task.title}" />
                                        <button class="editSaveBtn" data-id="${task.id}" data-type="${task.task_type}">Edit</button>
                                        <button class="delBtn" data-id="${task.id}" data-type="${task.task_type}">Delete</button>
                                    </div>
                                </li>`;
                            });
                        } else {
                            html += `<li>No tasks</li>`;
                        }
                        html += `</ul></li>`;
                    }
                    if (tasksList) tasksList.html(html);
                } else {
                    alert("Failed to load tasks: " + response.message);
                }
            },
            error: function (xhr, status, error) {
                console.error("Error loading tasks:", error);
            }
        });
    }

    // Load tasks when the page loads.
    loadTasks();

    // Also reload tasks when the Tasks button is clicked.
    if ($('#taskBtn')) $('#taskBtn').on('click', function () {
        loadTasks();
    });

    // Show tasks form when "+ Add Task" button is clicked.
    if (addTaskBtn) addTaskBtn.on('click', function () {
        if (tasksForm) tasksForm.slideDown();
        if (addTaskBtn) addTaskBtn.hide();
    });

    // Handle tasks form submission via AJAX.
    if (tasksForm) tasksForm.on('submit', function (e) {
        e.preventDefault();
        const courseId = $('#course_id').val();
        const taskType = $('#task_type').val();
        const title = $('#title').val().trim();
        const fromDate = $('#from_date').val();
        const toDate = $('#to_date').val();
        const status = $('#status').val();
        const suggestedDate = $('#suggested_date').val();
        const percent = $('#percent').val();
        const priority = $('#priority').val();
        const details = $('#details').val();
        const startDate = $('#start_date').val();
        const actualStartDate = $('#actual_start_date').val();
        const actualEndDate = $('#actual_end_date').val();

        let errors = [];
        if (!courseId) errors.push("Please select a course.");
        if (!taskType) errors.push("Please select a task type.");
        if (!title) errors.push("Please enter a title.");
        if (!fromDate) errors.push("Please select a from date.");
        if (!toDate) errors.push("Please select a to date.");
        if (!status) errors.push("Please select a status.");
        if (!suggestedDate) errors.push("Please select a suggested date.");
        if (!percent) errors.push("Please enter percent.");
        if (!priority) errors.push("Please select a priority.");
        if (!actualStartDate) errors.push("Please select an actual start date.");
        if (!actualEndDate) errors.push("Please select an actual end date.");

        if (errors.length > 0) {
            alert(errors.join("\n"));
            return;
        }

        $.ajax({
            url: 'tasksHandler.php',
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'add',
                course_id: courseId,
                task_type: taskType,
                title: title,
                from_date: fromDate,
                to_date: toDate,
                status: status,
                suggested_date: suggestedDate,
                actual_start_date: actualStartDate,
                actual_end_date: actualEndDate,
                percent: percent,
                priority: priority,
                details: details,
                start_date: startDate
            },
            success: function (response) {
                if (response.status === 'success') {
                    alert("Task added successfully.");
                    if (tasksForm) tasksForm[0].reset();
                    if (tasksForm) tasksForm.slideUp();
                    if (addTaskBtn) addTaskBtn.show();
                    loadTasks();  // Reload tasks list after addition.
                } else {
                    alert("Failed to add task: " + response.message);
                }
            },
            error: function (xhr, status, error) {
                console.error("Error adding task:", error);
            }
        });
    });

    // Handle Cancel button click.
    if ($('#cancelTaskBtn')) $('#cancelTaskBtn').on('click', function () {
        if (tasksForm) tasksForm[0].reset();
        if (tasksForm) tasksForm.slideUp();
        if (addTaskBtn) addTaskBtn.show();
    });

    // --- Handling Task Deletion ---
    // Listen for clicks on any delete button in the tasks list.
    if ($(document)) $(document).on('click', '.delBtn', function () {
        if (!confirm("Are you sure you want to delete this task?")) return;
        const taskId = $(this).data('id');
        const taskType = $(this).data('type');
        $.ajax({
            url: 'tasksHandler.php',
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'delete',
                id: taskId,
                task_type: taskType
            },
            success: function (response) {
                if (response.status === 'success') {
                    alert("Task deleted successfully.");
                    loadTasks(); // Reload tasks list after deletion.
                } else {
                    alert("Failed to delete task: " + response.message);
                }
            },
            error: function (xhr, status, error) {
                console.error("Error deleting task:", error);
            }
        });
    });
});
// ================ end of Tasks Section Handling ===============

// ============================================================== 
//                        coursesSection 
// ============================================================== 
if (coursesBtn) {
    coursesBtn.addEventListener('click', function () {
        // Toggle the state.
        isCoursesSectionVisible = !isCoursesSectionVisible;

        if (isCoursesSectionVisible) {
            // When true, show the midSection and coursesSection (slide in) and hide other sections/buttons.
            if (midSection) midSection.style.display = 'block';
            if (midSection) midSection.style.marginLeft = '0'; // Slide in
            if (coursesSection) coursesSection.style.display = 'block';
            if (coursesSection) coursesSection.style.marginLeft = '0'; // Slide in

            // Hide other content sections.
            if (schdSection) schdSection.style.display = 'none';
            if (tasksSection) tasksSection.style.display = 'none';
            if (settingsSection) settingsSection.style.display = 'none';

            // Hide navigation buttons.
            if (schdBtn) schdBtn.style.display = 'none';
            if (taskBtn) taskBtn.style.display = 'none';
            if (settingsBtn) settingsBtn.style.display = 'none';

            // Hide left section.
            if (leftSection) leftSection.style.display = 'none';
        } else {
            // When false, slide out the midSection and coursesSection.
            if (midSection) midSection.style.marginLeft = '-100%'; // Slide out
            if (coursesSection) coursesSection.style.marginLeft = '-100%'; // Slide out
            setTimeout(function () {
                // After the animation completes, restore leftSection and navigation buttons.
                if (midSection) midSection.style.display = 'none';
                if (coursesSection) coursesSection.style.display = 'none';
                if (leftSection) leftSection.style.display = 'block';

                if (schdBtn) schdBtn.style.display = 'block';
                if (taskBtn) taskBtn.style.display = 'block';
                if (settingsBtn) settingsBtn.style.display = 'block';
            }, 300); // Adjust delay to match your sliding animation duration
        }
    });
}

// ============================================================== 
//                         settingsSection 
// ============================================================== 
if (settingsBtn) {
    settingsBtn.addEventListener('click', function () {
        // Toggle the state
        isSettingsSectionVisible = !isSettingsSectionVisible;

        if (isSettingsSectionVisible) {
            // When true, hide left-section and all other sections/buttons except for settings.
            if (midSection) midSection.style.display = 'block';
            if (midSection) midSection.style.marginLeft = '0'; // Slide in
            if (schdSection) schdSection.style.display = 'none';
            if (tasksSection) tasksSection.style.display = 'none';
            if (coursesSection) coursesSection.style.display = 'none';
            if (schdBtn) schdBtn.style.display = 'none';
            if (taskBtn) taskBtn.style.display = 'none';
            if (coursesBtn) coursesBtn.style.display = 'none';
            if (settingsSection) settingsSection.style.display = 'block';
            if (settingsSection) settingsSection.style.marginLeft = '0'; // Slide in
            if (leftSection) leftSection.style.display = 'none';
        } else {
            // When false, slide out midSection and settingsSection, then show left-section and buttons.
            if (midSection) midSection.style.marginLeft = '-100%'; // Slide out
            if (settingsSection) settingsSection.style.marginLeft = '-100%'; // Slide out
            setTimeout(function () {
                if (midSection) midSection.style.display = 'none';
                if (settingsSection) settingsSection.style.display = 'none';
                if (leftSection) leftSection.style.display = 'block';
                // Optionally, show all other sections/buttons again.
                if (schdBtn) schdBtn.style.display = 'block';
                if (taskBtn) taskBtn.style.display = 'block';
                if (coursesBtn) coursesBtn.style.display = 'block';
                // Now, scroll the matrix so that it displays one week before today.
                scrollMatrixToWeekBeforeToday();
            }, 300); // Delay to match the sliding animation duration
        }
    });
}

// ============================================================== 
//                      coursesSection Handlers 
// ============================================================== 
$(document).ready(function () {
    // Function to load the courses list for the currently selected start date.
    function loadCourses() {
        var selectedDate = $('input[name="startDate"]:checked').val();
        if (!selectedDate) {
            alert("Please select a start date from the Settings section.");
            return;
        }
        $.ajax({
            url: 'courses_handler.php',
            type: 'POST',
            dataType: 'json',
            data: { action: 'list', start_date: selectedDate },
            success: function (response) {
                if (response.status === 'success') {
                    var html = '';
                    $.each(response.courses, function (index, cls) {
                        html += '<li><div class="courseDiv">';
                        html += '<input type="text" class="courseValue" id="course-' + cls.c_id + '" disabled value="' + cls.courseName + '" />';
                        html += '<button class="editSaveBtn" data-id="' + cls.c_id + '">Edit</button>';
                        html += '<button class="delBtn" data-id="' + cls.c_id + '">Delete</button>';
                        html += '</div></li>';
                    });
                    if ($('.coursesList')) $('.coursesList').html(html);
                } else {
                    alert(response.message);
                }
            },
            error: function (xhr, status, error) {
                console.error("AJAX Error:", error);
            }
        });
    }

    // When the vertical "Courses" button is clicked, load the courses list.
    if ($('#coursesBtn')) $('#coursesBtn').click(function () {
        loadCourses();
    });

    // Handle submission of the courses form.
    if ($('#coursesForm')) $('#coursesForm').on('submit', function (e) {
        e.preventDefault();
        var courseName = $('#courseName').val().trim();
        var courseNotes = $('#courseNotes').val().trim();
        var start_date = $('input[name="startDate"]:checked').val();

        if (!start_date) {
            alert("Please select a start date in the Settings section.");
            return;
        }
        if (courseName === "") {
            alert("Please enter a course name.");
            return;
        }

        $.ajax({
            url: 'courses_handler.php',
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'add',
                courseName: courseName,
                courseNotes: courseNotes,
                start_date: start_date
            },
            success: function (response) {
                alert(response.message);
                if (response.status === 'success') {
                    // Clear the form fields.
                    if ($('#courseName')) $('#courseName').val('');
                    if ($('#courseNotes')) $('#courseNotes').val('');
                    // Reload the courses list.
                    loadCourses();
                }
            },
            error: function (xhr, status, error) {
                console.error("AJAX Error:", error);
            }
        });
    });

    // Handle deletion of a courses.
    if ($('.coursesList')) $('.coursesList').on('click', '.delBtn', function () {
        var courseId = $(this).data('id');
        if (confirm("Are you sure you want to delete this course?")) {
            $.ajax({
                url: 'courses_handler.php',
                type: 'POST',
                dataType: 'json',
                data: { action: 'delete', courseId: courseId },
                success: function (response) {
                    alert(response.message);
                    if (response.status === 'success') {
                        loadCourses();
                    }
                },
                error: function (xhr, status, error) {
                    console.error("AJAX Error:", error);
                }
            });
        }
    });

    // Placeholder for the Edit button.
    if ($('.coursesList')) $('.coursesList').on('click', '.editSaveBtn', function () {
        alert("Edit functionality will be implemented later.");
    });
});
// ------------- x end of coursesSection Handlers x -------------- //