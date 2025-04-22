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
let courseMap = {}

// Function to load courses and populate coursMap
function loadCourses() {
    const startDate = $('input[name="startDate"]:checked').val();
    if (!startDate) {
        alert("ATTENTION: Start date is required.\n\nPlease select a start date in the Settings section.");
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
        console.log('Starting matrix task update...');

        // Clear existing task highlights first
        const matrixCells = document.querySelectorAll('.schd-matrix td');
        matrixCells.forEach(cell => {
            cell.classList.remove('task-highlight', 'task-highlight-submitted');
            cell.removeAttribute('data-task-id');
            cell.removeAttribute('data-task-title');
        });

        console.log('Cleared existing task highlights');

        // If we have filtered tasks, use those directly
        if (window.filteredTasks) {
            console.log("Using filtered tasks for highlighting:", window.filteredTasks);
            if (typeof highlightTaskRows === 'function') {
                // Ensure task type is set correctly
                const processedTasks = window.filteredTasks.map(task => ({
                    ...task,
                    task_type: task.type || task.task_type,
                    type: task.type || task.task_type
                }));
                console.log("Processing filtered tasks:", processedTasks);
                highlightTaskRows(processedTasks);
                console.log("Filtered task highlighting completed");
                resolve();
            } else {
                console.error("highlightTaskRows function is not defined");
                reject(new Error("highlightTaskRows function is not defined"));
            }
            return;
        }

        // Otherwise, fetch all tasks
        console.log('Fetching all tasks for matrix update...');
        $.ajax({
            url: 'tasksHandler.php',
            type: 'POST',
            dataType: 'json',
            data: { action: 'list', task_type: 'all' },
            success: function (response) {
                console.log('Received tasks response:', response);

                if (response.status === 'success') {
                    if (typeof highlightTaskRows === 'function') {
                        // Process tasks to ensure type fields are set
                        const processedTasks = response.tasks.map(task => ({
                            ...task,
                            task_type: task.type || task.task_type,
                            type: task.type || task.task_type
                        }));

                        console.log("Processing tasks for highlighting:", processedTasks);
                        highlightTaskRows(processedTasks);
                        console.log("Task highlighting completed");

                        // Update any task counters or summaries if they exist
                        if (typeof updateTaskCounters === 'function') {
                            updateTaskCounters(processedTasks);
                        }

                        resolve();
                    } else {
                        const error = new Error("highlightTaskRows function is not defined");
                        console.error(error);
                        reject(error);
                    }
                } else {
                    const error = new Error("Failed to fetch tasks: " + response.message);
                    console.error(error);
                    reject(error);
                }
            },
            error: function (xhr, status, error) {
                const errorMsg = "Error fetching tasks: " + error;
                console.error(errorMsg, {
                    status: status,
                    error: error,
                    responseText: xhr.responseText
                });
                reject(new Error(errorMsg));
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
    // Cache jQuery selectors
    const $tasksForm = $('#tasksForm');
    const $addTaskBtn = $('#addTaskBtn');
    const $tasksList = $('.tasksList');
    const $submitTaskBtn = $tasksForm.find('button[type="submit"]');

    console.log('Document ready, initializing tasks form handlers');
    console.log('Found form:', $tasksForm.length > 0);
    console.log('Found submit button:', $submitTaskBtn.length > 0);

    // Initially hide the tasks form
    $tasksForm.hide();

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
                    if ($tasksList) $tasksList.html(html);
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

    // Setup date validation when form is shown
    if ($addTaskBtn) $addTaskBtn.on('click', function () {
        if ($tasksForm) {
            $tasksForm.slideDown();
            // scroll to the form
            $('html, body').animate({ scrollTop: $tasksForm.offset().top }, 'slow');
            setupDateValidation();
            $addTaskBtn.hide();
        }
    });

    // Handle edit button click.
    $(document).on('click', '.editSaveBtn', function () {
        const taskId = $(this).data('id');
        const taskType = $(this).data('type');

        // Add task_id hidden field if it doesn't exist
        if (!$('#task_id').length) {
            $tasksForm.prepend('<input type="hidden" id="task_id" name="task_id">');
        }

        // Fetch task details via AJAX
        $.ajax({
            url: 'tasksHandler.php',
            type: 'POST',
            dataType: 'json',
            data: { action: 'getTask', id: taskId, task_type: taskType },
            success: function (response) {
                if (response.status === 'success') {
                    const task = response.task;
                    console.log('Populating form with task:', task);

                    // Populate the form with task details
                    $('#task_id').val(taskId);
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

                    // Change submit button text to "Save Changes"
                    $submitTaskBtn.text('Save Changes');

                    // Show the form and hide the add button
                    $tasksForm.slideDown();
                    $addTaskBtn.hide();

                    // Scroll to the form
                    $('html, body').animate({
                        scrollTop: $tasksForm.offset().top
                    }, 'slow');
                } else {
                    alert("Failed to fetch task details: " + response.message);
                }
            },
            error: function (xhr, status, error) {
                console.error("Error fetching task details:", error);
            }
        });
    });

    // Helper function to clear all error messages and validation states
    function clearAllErrors() {
        $('.error-message').remove();
        $('.invalid').removeClass('invalid');
    }

    // Handle Cancel button click.
    $('#cancelTaskBtn').on('click', function () {
        if (confirm("Are you sure you want to cancel editing?")) {
            clearAllErrors(); // Clear all error messages
            $tasksForm[0].reset();
            $tasksForm.slideUp();
            if ($addTaskBtn) $addTaskBtn.show();
            alert("Task editing canceled.");
        }
    });

    // Handle form submission with direct jQuery binding
    $('#tasksForm').submit(function (e) {
        e.preventDefault();
        console.log('Form submitted - direct binding');

        // Clear any previous error messages
        clearAllErrors();

        const formData = {
            courseId: $('#course_id').val(),
            taskType: $('#task_type').val(),
            title: $('#title').val().trim(),
            fromDate: $('#from_date').val(),
            toDate: $('#to_date').val(),
            status: $('#status').val(),
            suggestedDate: $('#suggested_date').val(),
            percent: $('#percent').val(),
            priority: $('#priority').val(),
            details: $('#details').val(),
            startDate: $('#start_date').val(),
            actualStartDate: $('#actual_start_date').val(),
            actualEndDate: $('#actual_end_date').val(),
            taskId: $('#task_id').val()
        };

        const isEditing = !!formData.taskId;

        console.log('Form data collected:', formData);
        console.log('Is editing:', isEditing);

        // Validate required fields first
        let hasErrors = false;
        if (!formData.courseId) {
            showError($('#course_id'), 'Course selection is required');
            hasErrors = true;
        }
        if (!formData.taskType) {
            showError($('#task_type'), 'Task type is required');
            hasErrors = true;
        }
        if (!formData.title) {
            showError($('#title'), 'Title is required');
            hasErrors = true;
        }

        // Validate dates
        const dateErrors = validateDates(
            formData.fromDate,
            formData.toDate,
            formData.suggestedDate,
            formData.actualStartDate,
            formData.actualEndDate,
            formData.startDate
        );

        if (dateErrors.length > 0) {
            dateErrors.forEach(error => {
                if (error.toLowerCase().includes('from date')) {
                    showError($('#from_date'), error);
                    hasErrors = true;
                }
                if (error.toLowerCase().includes('to date')) {
                    showError($('#to_date'), error);
                    hasErrors = true;
                }
                if (error.toLowerCase().includes('suggested date')) {
                    showError($('#suggested_date'), error);
                    hasErrors = true;
                }
                if (error.toLowerCase().includes('actual start date')) {
                    showError($('#actual_start_date'), error);
                    hasErrors = true;
                }
                if (error.toLowerCase().includes('actual end date')) {
                    showError($('#actual_end_date'), error);
                    hasErrors = true;
                }
            });
        }

        // If there are any validation errors, stop form submission
        if (hasErrors) {
            console.log('Validation errors found, stopping submission');
            return false;
        }

        console.log('Validation passed, proceeding with submission');

        // Clear all error messages since validation passed
        clearAllErrors();

        // If validation passes, proceed with form submission
        $.ajax({
            url: 'tasksHandler.php',
            type: 'POST',
            dataType: 'json',
            data: {
                action: isEditing ? 'editTask' : 'add',
                id: formData.taskId,
                course_id: formData.courseId,
                task_type: formData.taskType,
                title: formData.title,
                from_date: formData.fromDate,
                to_date: formData.toDate,
                status: formData.status,
                suggested_date: formData.suggestedDate,
                actual_start_date: formData.actualStartDate,
                actual_end_date: formData.actualEndDate,
                percent: formData.percent,
                priority: formData.priority,
                details: formData.details,
                start_date: formData.startDate
            },
            beforeSend: function () {
                console.log('Sending AJAX request for ' + (isEditing ? 'edit' : 'add') + ' task...');
                // Disable the submit button to prevent double submission
                $('#submitTaskBtn').prop('disabled', true);
            },
            success: function (response) {
                console.log('Server Response:', response);

                if (response.status === 'success') {
                    console.log('Task ' + (isEditing ? 'updated' : 'added') + ' successfully');

                    // Show success message
                    alert(isEditing ? "Task updated successfully." : "Task saved successfully.");

                    // Reset form and UI
                    console.log('Resetting form and UI...');

                    // Clear all form fields
                    $('#tasksForm')[0].reset();

                    // Clear the task ID
                    $('#task_id').val('');

                    // Reset submit button text and enable it
                    $('#submitTaskBtn')
                        .text('Submit Task')
                        .prop('disabled', false);

                    // Hide the form and show the add button
                    $('#tasksForm').slideUp(400, function () {
                        $('#addTaskBtn').fadeIn();
                        console.log('Form hidden and Add Task button shown');
                    });

                    // Clear any remaining error messages
                    clearAllErrors();

                    // Reload tasks list
                    console.log('Reloading tasks list...');
                    loadTasks();

                    // Update matrix
                    console.log('Updating schedule matrix...');
                    updateScheduleMatrixTasks().then(() => {
                        console.log('Schedule matrix updated successfully');
                        scrollMatrixToWeekBeforeToday();
                    }).catch(error => {
                        console.error('Error updating schedule matrix:', error);
                    });
                } else {
                    console.error('Server returned error:', response);
                    alert("Failed to " + (isEditing ? "update" : "save") + " task: " + (response.message || "Unknown error"));
                    // Re-enable the submit button
                    $('#submitTaskBtn').prop('disabled', false);
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', {
                    status: status,
                    error: error,
                    responseText: xhr.responseText,
                    readyState: xhr.readyState,
                    statusCode: xhr.status,
                    statusText: xhr.statusText
                });

                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    console.log('Parsed error response:', errorResponse);
                    alert("Error " + (isEditing ? "updating" : "saving") +
                        " task: " + (errorResponse.message || error));
                } catch (e) {
                    console.error('Error parsing server response:', e);
                    alert("Error " + (isEditing ? "updating" : "saving") +
                        " task. Please check the console for details.");
                }
                // Re-enable the submit button
                $('#submitTaskBtn').prop('disabled', false);
            }
        });
    });

    // --- Handling Task Deletion ---
    // Listen for clicks on any delete button in the tasks list.
    if ($(document)) $(document).on('click', '.delBtn', function () {
        if (!confirm("Are you sure you want to delete this task?")) return;

        const taskId = $(this).data('id');
        const taskType = $(this).data('type');

        console.log('Deleting task:', { taskId, taskType });

        // Disable the delete button to prevent double-clicks
        const $deleteButton = $(this);
        $deleteButton.prop('disabled', true);

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
                console.log('Delete response:', response);

                if (response.status === 'success') {
                    // First update the tasks list
                    console.log('Task deleted, updating tasks list...');
                    loadTasks();

                    // Then update the matrix
                    console.log('Updating schedule matrix...');
                    updateScheduleMatrixTasks()
                        .then(() => {
                            console.log('Matrix updated successfully after deletion');
                            // Force a refresh of the matrix display
                            const schdMatrix = document.querySelector(".schd-matrix");
                            if (schdMatrix) {
                                const currentScroll = schdMatrix.scrollLeft;
                                schdMatrix.style.display = 'none';
                                setTimeout(() => {
                                    schdMatrix.style.display = '';
                                    schdMatrix.scrollLeft = currentScroll;
                                    console.log('Matrix refreshed and scroll position restored');
                                }, 50);
                            }
                            // Show success message
                            alert("Task deleted successfully.");
                        })
                        .catch(error => {
                            console.error('Error updating matrix after deletion:', error);
                            alert("Task was deleted but there was an error updating the display. Please refresh the page.");
                        });
                } else {
                    console.error('Failed to delete task:', response.message);
                    alert("Failed to delete task: " + response.message);
                    // Re-enable the delete button on failure
                    $deleteButton.prop('disabled', false);
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error during deletion:', {
                    status: status,
                    error: error,
                    responseText: xhr.responseText
                });
                alert("Error deleting task. Please try again.");
                // Re-enable the delete button on error
                $deleteButton.prop('disabled', false);
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

    // Initially hide the courses form
    if ($('#coursesForm')) $('#coursesForm').hide();

    // Show courses form when "+ Add Course" button is clicked
    if ($('#addCourseBtn')) $('#addCourseBtn').click(function () {
        if ($('#coursesForm')) {
            $('#coursesForm').slideDown();
            $(this).hide(); // Hide the Add Course button
        }
    });

    // When the vertical "Courses" button is clicked, load the courses list.
    if ($('#coursesBtn')) $('#coursesBtn').click(function () {
        loadCourses();
    });

    // Handle submission of the courses form.
    if ($('#coursesForm')) $('#coursesForm').on('submit', function (e) {
        e.preventDefault();
        const courseName = $('#courseName').val().trim();
        const courseNotes = $('#courseNotes').val().trim();
        const start_date = $('input[name="startDate"]:checked').val();
        const courseId = $('#courseId').val(); // Get the course ID if it exists
        const isEditing = !!courseId; // Check if we're editing an existing course

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
                action: isEditing ? 'update' : 'add',
                courseId: courseId,
                courseName: courseName,
                courseNotes: courseNotes,
                start_date: start_date
            },
            success: function (response) {
                alert(response.message);
                if (response.status === 'success') {
                    // Clear the form fields and hidden courseId
                    if ($('#courseName')) $('#courseName').val('');
                    if ($('#courseNotes')) $('#courseNotes').val('');
                    if ($('#courseId')) $('#courseId').val('');
                    // Reset submit button text
                    $('#coursesForm button[type="submit"]').text('Submit');
                    // Hide the courses form
                    if ($('#coursesForm')) $('#coursesForm').slideUp();
                    // Show the Add Course button
                    if ($('#addCourseBtn')) $('#addCourseBtn').show();
                    // Reload the courses list
                    loadCourses();
                }
            },
            error: function (xhr, status, error) {
                console.error("AJAX Error:", error);
            }
        });
    });

    // Handle cancel button click in courses form
    if ($('#cancelCourseBtn')) $('#cancelCourseBtn').click(function () {
        // Clear the form fields
        if ($('#courseName')) $('#courseName').val('');
        if ($('#courseNotes')) $('#courseNotes').val('');
        if ($('#courseId')) $('#courseId').val('');
        // Reset submit button text
        $('#coursesForm button[type="submit"]').text('Submit');
        // Hide the form with animation
        $('#coursesForm').slideUp();
        // Show the Add Course button
        $('#addCourseBtn').show();
    });

    // Handle deletion of a courses.
    if ($('.coursesList')) $('.coursesList').on('click', '.delBtn', function (e) {
        // Prevent event bubbling to avoid triggering task delete handler
        e.stopPropagation();
        e.preventDefault();

        var courseId = $(this).data('id');
        if (confirm("Are you sure you want to delete this course?\n\nWarning: This will also delete all tasks associated with this course.")) {
            $.ajax({
                url: 'courses_handler.php',
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'delete',
                    course_id: courseId
                },
                success: function (response) {
                    if (response.status === 'success') {
                        // First update the course list
                        loadCourses();

                        // Then silently update tasks and matrix without showing alerts
                        if (typeof loadTasks === 'function') {
                            loadTasks();
                        }
                        if (typeof updateScheduleMatrixTasks === 'function') {
                            updateScheduleMatrixTasks().then(() => {
                                console.log("Tasks updated after course deletion");
                            }).catch(error => {
                                console.error("Error updating tasks after course deletion:", error);
                            });
                        }
                    } else {
                        alert("Failed to delete course: " + response.message);
                    }
                },
                error: function (xhr, status, error) {
                    console.error("AJAX Error:", error);
                    alert("Error deleting course. Please try again.");
                }
            });
        }
    });

    // Handle the process of clicking the Edit button.
    if ($('.coursesList')) $('.coursesList').on('click', '.editSaveBtn', function (e) {
        // Prevent event bubbling to avoid triggering task handlers
        e.stopPropagation();
        const courseId = $(this).data('id');
        console.log('Edit button clicked for course:', courseId);

        // Fetch course details via AJAX
        $.ajax({
            url: 'courses_handler.php',
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'get', // Changed from 'getCourse' to 'get'
                courseId: courseId
            },
            success: function (response) {
                console.log('Course fetch response:', response);
                if (response.status === 'success') {
                    const course = response.course;
                    console.log('Populating form with course:', course);

                    // Populate the form with course details
                    $('#courseName').val(course.courseName);
                    $('#courseNotes').val(course.courseNotes);

                    // Store the course ID in a hidden field for update
                    if (!$('#courseId').length) {
                        $('#coursesForm').append('<input type="hidden" id="courseId" name="courseId">');
                    }
                    $('#courseId').val(courseId);

                    // Show the form and hide the Add Course button
                    $('#coursesForm').slideDown();
                    $('#addCourseBtn').hide();

                    // Change submit button text to indicate editing
                    $('#coursesForm button[type="submit"]').text('Save Changes');

                    // Scroll to the form
                    $('html, body').animate({
                        scrollTop: $('#coursesForm').offset().top
                    }, 'slow');
                } else {
                    console.error('Failed to fetch course:', response.message);
                    alert("Failed to fetch course details: " + response.message);
                }
            },
            error: function (xhr, status, error) {
                console.error("AJAX Error fetching course:", error);
                console.error("Server response:", xhr.responseText);
                alert("Error fetching course details. Please try again.");
            }
        });
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

function updateSubmittedTasksVisibility(show, skipServerUpdate = false) {
    console.log('\n\nupdateSubmittedTasksVisibility called:', { show, skipServerUpdate });

    // First update the UI immediately
    const matrixRows = document.querySelectorAll('.matrix-row');
    console.log('Found matrix rows:', matrixRows.length);

    matrixRows.forEach(row => {
        if (row.getAttribute('data-task-status') === 'submitted') {
            console.log('Updating submitted row visibility:', {
                rowId: row.getAttribute('data-id'),
                show: show
            });
            row.style.display = show ? '' : 'none';
        }
    });

    // Skip server update if specified (used when initializing from server data)
    if (skipServerUpdate) {
        console.log('Skipping server update as requested');
        return;
    }

    // Update the database
    const params = new URLSearchParams();
    params.append('action', 'updateVisibility');
    params.append('hideSubmitted', !show);

    console.log('Sending request to update visibility:', { hideSubmitted: !show });

    // Disable the toggle while the request is in progress
    const hideSubmittedTasksToggle = document.getElementById('hideSubmittedTasks');
    if (hideSubmittedTasksToggle) {
        hideSubmittedTasksToggle.disabled = true;
    }

    fetch('tasksHandler.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString(),
        credentials: 'same-origin'
    })
        .then(response => {
            console.log('Raw response:', response);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(result => {
            console.log('Server response:', result);

            // Re-enable the toggle
            if (hideSubmittedTasksToggle) {
                hideSubmittedTasksToggle.disabled = false;
            }

            if (result.status === 'success') {
                // Verify that the server's state matches our intended state
                const serverHideSubmitted = result.hide_submitted_tasks;
                const currentShow = !serverHideSubmitted;

                console.log('Server state verification:', {
                    serverHideSubmitted,
                    currentShow,
                    intendedShow: show
                });

                if (currentShow !== show) {
                    console.error('Server state mismatch, reverting to server state');
                    // Update UI to match server state
                    matrixRows.forEach(row => {
                        if (row.getAttribute('data-task-status') === 'submitted') {
                            row.style.display = currentShow ? '' : 'none';
                        }
                    });
                    // Update checkbox to match server state
                    if (hideSubmittedTasksToggle) {
                        hideSubmittedTasksToggle.checked = currentShow;
                    }
                } else {
                    // Update localStorage only if server update was successful
                    localStorage.setItem('showSubmittedTasks', show);
                    console.log('localStorage updated with showSubmittedTasks:', show);
                }
            } else {
                console.error("Failed to update visibility setting:", result.message);
                // Revert UI changes on error
                revertVisibilityChanges(!show);
            }
        })
        .catch(error => {
            console.error("Error updating visibility setting:", error);
            // Re-enable the toggle
            if (hideSubmittedTasksToggle) {
                hideSubmittedTasksToggle.disabled = false;
            }
            // Revert UI changes on error
            revertVisibilityChanges(!show);
        });
}

// Helper function to revert visibility changes
function revertVisibilityChanges(show) {
    console.log('Reverting visibility changes to:', { show });

    const matrixRows = document.querySelectorAll('.matrix-row');
    matrixRows.forEach(row => {
        if (row.getAttribute('data-task-status') === 'submitted') {
            row.style.display = show ? '' : 'none';
        }
    });

    const hideSubmittedTasksToggle = document.getElementById('hideSubmittedTasks');
    if (hideSubmittedTasksToggle) {
        hideSubmittedTasksToggle.checked = show;
    }
}

// Handle submitted tasks visibility toggle
document.addEventListener('DOMContentLoaded', function () {
    console.log('Setting up visibility toggle handler');
    const hideSubmittedTasksToggle = document.getElementById('hideSubmittedTasks');

    if (hideSubmittedTasksToggle) {
        console.log('Found hideSubmittedTasks toggle element');

        // Fetch preference from database
        fetch('tasksHandler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'action=getVisibilityPreference',
            credentials: 'same-origin'
        })
            .then(response => {
                console.log('Raw visibility preference response:', response);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(result => {
                console.log('Initial visibility preference from server:', result);
                if (result.status === 'success') {
                    const showSubmittedTasks = !result.hide_submitted_tasks;
                    console.log('Setting initial toggle state:', { showSubmittedTasks });
                    hideSubmittedTasksToggle.checked = showSubmittedTasks;
                    // Use skipServerUpdate=true when initializing from server data
                    updateSubmittedTasksVisibility(showSubmittedTasks, true);
                }
            })
            .catch(error => {
                console.error("Error fetching visibility preference:", error);
                // Fallback to localStorage if database fetch fails
                const showSubmittedTasks = localStorage.getItem('showSubmittedTasks') !== 'false';
                console.log('Falling back to localStorage value:', { showSubmittedTasks });
                hideSubmittedTasksToggle.checked = showSubmittedTasks;
                updateSubmittedTasksVisibility(showSubmittedTasks, true);
            });

        // Handle toggle changes
        let isProcessingChange = false;
        hideSubmittedTasksToggle.addEventListener('change', function (event) {
            // Prevent multiple simultaneous changes
            if (isProcessingChange) {
                console.log('Already processing a change, ignoring');
                return;
            }

            isProcessingChange = true;
            const newState = this.checked;
            console.log('Toggle changed, new checked state:', newState);

            // Update visibility
            updateSubmittedTasksVisibility(newState);

            // Reset processing flag after a short delay
            setTimeout(() => {
                isProcessingChange = false;
            }, 100);
        });
    } else {
        console.error('hideSubmittedTasks toggle element not found');
    }
});

// Function to update course list in tasks form
function updateTaskFormCourseList() {
    $.ajax({
        url: 'tasksHandler.php',
        type: 'POST',
        dataType: 'json',
        data: { action: 'getCourses' },
        success: function (response) {
            if (response.status === 'success') {
                const courseSelect = $('#course_id');
                courseSelect.empty();
                courseSelect.append('<option value="">--Select Course--</option>');
                response.courses.forEach(function (course) {
                    courseSelect.append(`<option value="${course.id}">${course.name}</option>`);
                });
            }
        }
    });
}

// Function to get the last date from the matrix
function getMatrixEndDate() {
    // Get the start date from the hidden input
    const startDate = document.getElementById('start_date')?.value;
    if (!startDate) {
        console.error('Start date not found');
        return null;
    }

    // Calculate end date as 120 days from start date
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 120);

    console.log('Matrix end date calculation:', {
        startDate: startDate,
        endDate: endDate.toISOString().split('T')[0]
    });

    return endDate;
}

// Date validation functions
function validateDates(fromDate, toDate, suggestedDate, actualStartDate, actualEndDate, startDate) {
    const errors = [];
    console.log('Validating dates:', {
        fromDate,
        toDate,
        suggestedDate,
        actualStartDate,
        actualEndDate,
        startDate
    });

    // Convert dates to Date objects and set to midnight for comparison
    const from = fromDate ? new Date(fromDate + 'T00:00:00') : null;
    const to = toDate ? new Date(toDate + 'T00:00:00') : null;
    const suggested = suggestedDate ? new Date(suggestedDate + 'T00:00:00') : null;
    const actualStart = actualStartDate ? new Date(actualStartDate + 'T00:00:00') : null;
    const actualEnd = actualEndDate ? new Date(actualEndDate + 'T00:00:00') : null;
    const start = startDate ? new Date(startDate + 'T00:00:00') : null;
    const matrixEnd = getMatrixEndDate();

    console.log('Converted dates:', {
        from,
        to,
        suggested,
        actualStart,
        actualEnd,
        start,
        matrixEnd
    });

    // Required field validation
    if (!fromDate) errors.push("From date is required");
    if (!toDate) errors.push("To date is required");
    if (!suggestedDate) errors.push("Suggested date is required");
    if (!actualStartDate) errors.push("Actual start date is required");
    if (!actualEndDate) errors.push("Actual end date is required");

    // Only proceed with date range validation if we have the necessary dates
    if (from && start) {
        if (from < start) {
            errors.push("From date cannot be earlier than the start date");
        }
    }

    if (from && to) {
        if (to < from) {
            errors.push("To date cannot be earlier than from date");
        }
        if (matrixEnd && to > matrixEnd) {
            console.log('To date validation failed:', {
                to: to.toISOString(),
                matrixEnd: matrixEnd.toISOString()
            });
            errors.push("To date cannot be later than the last date in the schedule matrix");
        }
    }

    if (from && to && suggested) {
        if (suggested < from || suggested > to) {
            errors.push("Suggested date must be within the task period (between from and to dates)");
        }
    }

    if (from && to && actualStart) {
        if (actualStart < from || actualStart > to) {
            errors.push("Actual start date must be within the task period");
        }
    }

    if (from && to && actualEnd) {
        if (actualEnd < from || actualEnd > to) {
            errors.push("Actual end date must be within the task period");
        }
    }

    if (actualStart && actualEnd) {
        if (actualEnd < actualStart) {
            errors.push("Actual end date cannot be earlier than actual start date");
        }
    }

    return errors;
}

// Add event listeners for date fields to validate as user types
function setupDateValidation() {
    const dateFields = ['from_date', 'to_date', 'suggested_date', 'actual_start_date', 'actual_end_date'];
    const startDate = $('#start_date').val();

    // Clear previous validation state
    clearAllErrors();

    dateFields.forEach(field => {
        $(`#${field}`).off('change').on('change', function () {
            // Clear previous errors for this field
            $(this).removeClass('invalid');
            $(this).next('.error-message').remove();

            const fromDate = $('#from_date').val();
            const toDate = $('#to_date').val();
            const suggestedDate = $('#suggested_date').val();
            const actualStartDate = $('#actual_start_date').val();
            const actualEndDate = $('#actual_end_date').val();

            // Validate immediately when any date changes
            const errors = validateDates(fromDate, toDate, suggestedDate, actualStartDate, actualEndDate, startDate);

            // Show errors relevant to the current field
            errors.forEach(error => {
                const fieldName = field.replace('_', ' ');
                if (error.toLowerCase().includes(fieldName.toLowerCase())) {
                    showError($(`#${field}`), error);
                }
            });

            // Special handling for related date validations
            if (field === 'from_date' && startDate) {
                const start = new Date(startDate + 'T00:00:00');
                const from = new Date(fromDate + 'T00:00:00');
                if (from < start) {
                    showError($('#from_date'), "From date cannot be earlier than the start date");
                }
            }

            if (field === 'to_date' && fromDate) {
                const from = new Date(fromDate + 'T00:00:00');
                const to = new Date(toDate + 'T00:00:00');
                if (to < from) {
                    showError($('#to_date'), "To date cannot be earlier than from date");
                }
            }
        });
    });
}

// Helper function to show validation errors
function showError(element, message) {
    // Remove any existing error message for this element
    element.next('.error-message').remove();

    // Add invalid class and error message
    element.addClass('invalid');
    const errorDiv = $('<div>').addClass('error-message').text(message);
    element.after(errorDiv);
}