// script2.js

// Handling all mid sections and left-section divs scrolling show/hide
// Initializing all the mid-sections and the left-section
// Buttons
const schdBtn = document.getElementById('schdBtn');
const taskBtn = document.getElementById('taskBtn');
const coursesBtn = document.getElementById('coursesBtn');
const settingsBtn = document.getElementById('settingsBtn');
const addTaskBtn = document.getElementById('addTaskBtn');
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
        alert("Attention: Start date is required.\n\nPlease select a start date Settings section.");
        console.error("Start date is required.");
        return;
    }

    console.log("\n\nscript2.js / loadCourses() \n > startDate value:", startDate);

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
                // Make courseMap globally available
                window.courseMap = courseMap;
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
// ----- Unify scrolling: make scrollMatrixToWeekBeforeToday global -----
function scrollMatrixToWeekBeforeToday() {
    const schdMatrix = document.querySelector(".schd-matrix");
    const schdHeader = document.querySelector(".schd-header");
    if (!schdMatrix || !window.startDateForMatrix) return;

    const cellWidth = 40; // Width of each cell in pixels

    // Get current date and set to midnight in local time
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate target date (7 days before today) and set to midnight
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - 7);
    targetDate.setHours(0, 0, 0, 0);

    // Get start date and ensure it's set to midnight in local time
    const startDate = new Date(window.startDateForMatrix);
    startDate.setHours(0, 0, 0, 0);

    // Calculate days between dates
    const diffTime = targetDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Calculate target scroll position
    const targetScrollLeft = diffDays * cellWidth;

    // Log for debugging
    console.log("\n\nscript2.js/\nscrollMatrixToWeekBeforeToday:");
    console.log(` > Start date:`, startDate.toLocaleString());
    console.log(` > Today:`, today.toLocaleString());
    console.log(` > Target date (7 days before today):`, targetDate.toLocaleString());
    console.log(` > Days difference:`, diffDays);
    console.log(` > Target scroll position:`, targetScrollLeft);
    console.log(` > Matrix state before scroll:`, schdMatrix.scrollLeft);

    // Force scroll both matrix and header
    if (schdMatrix) {
        schdMatrix.scrollLeft = targetScrollLeft;
    }
    if (schdHeader) {
        schdHeader.scrollLeft = targetScrollLeft;
    }

    // Double-check final positions
    console.log(` > Matrix final scroll position:`, schdMatrix.scrollLeft);
    console.log(` > Header final scroll position:`, schdHeader.scrollLeft);

    // Force a refresh of the current week highlighting
    if (window.updateCurrentWeekHighlight) {
        setTimeout(window.updateCurrentWeekHighlight, 100);
    }
}
window.scrollMatrixToWeekBeforeToday = scrollMatrixToWeekBeforeToday;
// ----- x end of Unify scrolling x -----

// ----- New: Function to update schedule matrix task highlighting -----
function updateScheduleMatrixTasks() {
    return new Promise((resolve, reject) => {
        // If we have filtered tasks, use those directly
        if (window.filteredTasks) {
            console.log("Using filtered tasks for highlighting:", window.filteredTasks);
            if (typeof highlightTaskRows === 'function') {
                // Ensure task type is set correctly
                const processedTasks = window.filteredTasks.map(task => ({
                    ...task,
                    task_type: task.type || task.task_type, // Ensure task_type is set
                    type: task.type || task.task_type // Ensure type is set
                }));
                console.log("Processed tasks:", processedTasks);
                highlightTaskRows(processedTasks);
                console.log("Filtered task highlighting completed.");
                resolve();
            } else {
                console.error("highlightTaskRows function is not defined.");
                reject("highlightTaskRows function is not defined.");
            }
            return;
        }

        // Otherwise, fetch all tasks as normal
        $.ajax({
            url: 'tasksHandler.php',
            type: 'POST',
            dataType: 'json',
            data: { action: 'list', task_type: 'all' },
            success: function (response) {
                if (response.status === 'success') {
                    console.log("Fetched tasks:", response.tasks);
                    if (typeof highlightTaskRows === 'function') {
                        // Process tasks to ensure type fields are set
                        const processedTasks = response.tasks.map(task => ({
                            ...task,
                            task_type: task.type || task.task_type, // Ensure task_type is set
                            type: task.type || task.task_type // Ensure type is set
                        }));
                        console.log("Processed tasks:", processedTasks);
                        highlightTaskRows(processedTasks);
                        console.log("Task highlighting completed.");
                        resolve();
                    } else {
                        console.error("highlightTaskRows function is not defined.");
                        reject("highlightTaskRows function is not defined.");
                    }
                } else {
                    console.error("Failed to fetch tasks for schedule matrix:", response.message);
                    reject(response.message);
                }
            },
            error: function (xhr, status, error) {
                console.error("Error fetching tasks for schedule matrix:", error);
                reject(error);
            }
        });
    });
}
window.updateScheduleMatrixTasks = updateScheduleMatrixTasks;

// TODO: improve sched-matrix's horizontal scrolling when the schedule section is visible/hidden. then use schdSection's design with other sections.
// ============================================================== 
//                          schdSection 
// ============================================================== 
// Handle the schedule section.
// This section is responsible for showing the schedule section and hiding other sections.
// It also handles the navigation buttons for the schedule section.
if (schdBtn) {
    schdBtn.addEventListener('click', function () {
        // Toggle the state of the schedule section.
        isScheduleSectionVisible = !isScheduleSectionVisible;

        // When the schedule section should be visible:
        if (isScheduleSectionVisible) {
            slideIn(midSection);
            slideIn(schdSection);

            // Hide other sections
            tasksSection.style.display = 'none';
            coursesSection.style.display = 'none';
            settingsSection.style.display = 'none';

            // Hide navigation buttons except for the tasks button.
            if (taskBtn) taskBtn.style.display = 'none';
            if (coursesBtn) coursesBtn.style.display = 'none';
            if (settingsBtn) settingsBtn.style.display = 'none';

            // Optionally, hide the left section.
            if (leftSection) leftSection.style.display = 'none';
        } else {
            // When the schedule section should not be visible:
            slideOut(midSection);
            slideOut(schdSection);

            // Show the left section and restore navigation buttons.
            setTimeout(() => {
                leftSection.style.display = 'block';
                taskBtn.style.display = 'block';
                coursesBtn.style.display = 'block';
                settingsBtn.style.display = 'block';
            }, 300);
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
    const submitTaskBtn = tasksForm.find('button[type="submit"]');

    // Initially hide the tasks form.
    if (tasksForm) tasksForm.hide();

    // Function to load tasks via AJAX and group them by course.
    function loadTasks() {
        $.ajax({
            url: 'tasksHandler.php',
            type: 'POST',
            dataType: 'json',
            data: { action: 'list', task_type: 'all' },
            success: function (response) {
                if (response.status === 'success') {
                    let groups = {};
                    response.tasks.forEach(function (task) {
                        let cid = task.course_id;
                        if (!groups[cid]) {
                            groups[cid] = [];
                        }
                        groups[cid].push(task);
                    });

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

    // Show tasks form when "+ Add Task" button is clicked.
    if (addTaskBtn) addTaskBtn.on('click', function () {
        if (tasksForm) tasksForm.slideDown();
        if (addTaskBtn) addTaskBtn.hide();
    });

    // Handle edit button click.
    $(document).on('click', '.editSaveBtn', function () {
        const taskId = $(this).data('id');
        const taskType = $(this).data('type');

        // Fetch task details via AJAX
        $.ajax({
            url: 'tasksHandler.php',
            type: 'POST',
            dataType: 'json',
            data: { action: 'getTask', id: taskId, task_type: taskType },
            success: function (response) {
                if (response.status === 'success') {
                    const task = response.task;
                    // Populate the form with task details
                    $('#course_id').val(task.course_id);
                    $('#task_type').val(task.task_type);
                    $('#title').val(task.title);
                    $('#from_date').val(task.from_date);
                    $('#to_date').val(task.to_date);
                    $('#status').val(task.status);
                    $('#suggested_date').val(task.suggested_date);
                    $('#actual_start_date').val(task.actual_start_date);
                    $('#actual_end_date').val(task.actual_end_date);
                    $('#percent').val(task.percent);
                    $('#priority').val(task.priority);
                    $('#details').val(task.details);

                    // Change submit button text to "Save"
                    submitTaskBtn.text('Save');

                    // Show the form and scroll to it
                    tasksForm.slideDown();
                    $('html, body').animate({ scrollTop: tasksForm.offset().top }, 'slow');
                } else {
                    alert("Failed to fetch task details: " + response.message);
                }
            },
            error: function (xhr, status, error) {
                console.error("Error fetching task details:", error);
            }
        });
    });

    // Handle tasks form submission via AJAX.
    tasksForm.on('submit', function (e) {
        console.log("\n\nscript2.js / tasksForm.on {saving a new task} started/n");
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
        const startDate = $('input[name="startDate"]:checked').val(); // get the value of the checked radio button
        const actualStartDate = $('#actual_start_date').val();
        const actualEndDate = $('#actual_end_date').val();

        // log the data to be sent to the server.
        console.log("{saving a new task} \n > Sending data:", {
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
        });

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
                    alert("Task saved successfully.");
                    submitTaskBtn.text('Submit Task');
                    tasksForm[0].reset();
                    tasksForm.slideUp();
                    loadTasks(); // Reload tasks list after saving.
                    if (addTaskBtn) addTaskBtn.show(); // Show the Add Task button
                    updateScheduleMatrixTasks().then(() => {
                        console.log("Tasks updated, now scrolling.");
                        scrollMatrixToWeekBeforeToday();
                    }).catch(error => {
                        console.error("Error in updating schedule matrix tasks:", error);
                    });
                } else {
                    alert("Failed to save task: " + response.message);
                }
            },
            error: function (xhr, status, error) {
                console.error("Error saving task:", error);
            }
        });
    });

    // Handle Cancel button click.
    $('#cancelTaskBtn').on('click', function () {
        if (confirm("Are you sure you want to cancel editing?")) {
            tasksForm[0].reset();
            tasksForm.slideUp();
            if (addTaskBtn) addTaskBtn.show();
            alert("Task editing canceled.");
        }
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
                    loadTasks(); // Reload tasks list after saving.
                    updateScheduleMatrixTasks().then(() => {
                        console.log("Tasks updated, now scrolling.");
                        scrollMatrixToWeekBeforeToday();
                    }).catch(error => {
                        console.error("Error in updating schedule matrix tasks:", error);
                    });
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

// ============================================================== 
//                          slideIn 
// ============================================================== 
// This function slides in an element from the left.
function slideIn(element) {
    element.style.display = 'block';
    element.style.marginLeft = '-100%';
    let start = null;

    function animate(time) {
        if (!start) start = time;
        const progress = time - start;
        const position = Math.min(progress / 300, 1) * 100; // 300ms duration
        element.style.marginLeft = `${position - 100}%`;

        if (position < 100) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);
}

// ============================================================== 
//                          slideOut 
// ==============================================================
// This function slides out an element to the left.
function slideOut(element) {
    let start = null;

    function animate(time) {
        if (!start) start = time;
        const progress = time - start;
        const position = Math.min(progress / 300, 1) * 100; // 300ms duration
        element.style.marginLeft = `-${position}%`;

        if (position < 100) {
            requestAnimationFrame(animate);
        } else {
            element.style.display = 'none';
        }
    }

    requestAnimationFrame(animate);
}

function updateSubmittedTasksVisibility(show) {
    // Update localStorage
    localStorage.setItem('showSubmittedTasks', show);

    // First, reset all row visibility for submitted tasks
    const matrixRows = document.querySelectorAll('.matrix-row');
    matrixRows.forEach(row => {
        if (row.getAttribute('data-task-status') === 'submitted') {
            row.style.display = show ? '' : 'none';
            // Reset cell backgrounds in the row
            Array.from(row.children).forEach(cell => {
                cell.style.backgroundColor = show ? cell.style.backgroundColor : 'transparent';
            });
        }
    });

    // Then refresh the matrix to ensure proper highlighting
    updateScheduleMatrixTasks().then(() => {
        console.log("Matrix updated with new visibility settings");
        scrollMatrixToWeekBeforeToday();
    }).catch(error => {
        console.error("Error updating matrix with new visibility settings:", error);
    });
}

// Handle submitted tasks visibility toggle
document.addEventListener('DOMContentLoaded', function () {
    const hideSubmittedTasksToggle = document.getElementById('hideSubmittedTasks');

    if (hideSubmittedTasksToggle) {
        // Load saved preference from localStorage
        const showSubmittedTasks = localStorage.getItem('showSubmittedTasks') !== 'false';
        hideSubmittedTasksToggle.checked = showSubmittedTasks;

        // Apply initial state
        updateSubmittedTasksVisibility(showSubmittedTasks);

        // Handle toggle changes
        hideSubmittedTasksToggle.addEventListener('change', function () {
            const showTasks = this.checked;
            updateSubmittedTasksVisibility(showTasks);
        });
    }
});