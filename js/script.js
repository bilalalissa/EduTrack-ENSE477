// Redirect user to sighup page
document.addEventListener('DOMContentLoaded', function () {
    var signupButton = document.getElementById('signupButton');
    if (signupButton) {
        signupButton.addEventListener('click', function () {
            window.location.href = 'signup.php';
        });
    }
});

// Handle signup form submission
document.addEventListener('DOMContentLoaded', function () {
    const signupSubmit = document.getElementById('signupSubmit');
    const signupForm = document.querySelector('.form-container');

    if (signupSubmit && signupForm) {
        signupSubmit.addEventListener('click', function (e) {
            e.preventDefault();

            // Get form data
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Basic validation
            if (!username || !email || !password || !confirmPassword) {
                alert('Please fill in all required fields');
                return;
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            // Prepare data for submission
            const data = {
                username: username,
                email: email,
                password: password
            };

            // Send request
            fetch('signup.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
                .then(response => response.json())
                .then(result => {
                    if (result.message === 'User with this username or email already exists.') {
                        alert(result.message);
                    } else {
                        // Successful signup will redirect to home.php
                        window.location.href = 'home.php';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred during signup. Please try again.');
                });
        });
    }
});

// Redirect user to index page
document.addEventListener('DOMContentLoaded', function () {
    var mainButton = document.getElementById('mainButton');
    if (mainButton) {
        mainButton.addEventListener('click', function () {
            window.location.href = 'index.php';
        });
    }
});

// Handling signout
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('exitButton').addEventListener('click', function () {
        window.location.href = 'signout.php';
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const slider = document.getElementById('slider');
    if (!slider) {
        console.log('Slider element not found, skipping event listeners');
        return;
    }

    let activeTaskId = null;
    const taskTable = document.getElementById('taskTable');

    if (taskTable) {
        taskTable.addEventListener('click', function (event) {
            const cell = event.target.closest('.task-cell');
            if (!cell) return;

            const taskId = cell.getAttribute('data-task-id');

            if (activeTaskId === taskId) {
                // Second click on the same task, hide the slider
                slider.classList.remove('visible');
                slider.classList.add('hidden');
                activeTaskId = null;
            } else {
                // First click on a task, show the slider
                slider.classList.remove('hidden');
                slider.classList.add('visible');
                activeTaskId = taskId;
            }
        });

        // Also add the task details click handler here
        taskTable.addEventListener('click', function (event) {
            const cell = event.target.closest('.task-cell');
            if (!cell) return;

            const taskId = cell.getAttribute('data-task-id');
            if (taskId) {
                // Fetch task details via AJAX
                fetchTaskDetails(taskId);
            }
        });
    } else {
        console.log('Task table element not found, skipping event listeners');
    }

    document.addEventListener('click', function (event) {
        if (!event.target.closest('.task-cell')) {
            // Click outside any task cell, hide the slider
            slider.classList.remove('visible');
            slider.classList.add('hidden');
            activeTaskId = null;
        }
    });

    const closePanelBtn = document.getElementById('closePanelBtn');
    if (closePanelBtn) {
        closePanelBtn.addEventListener('click', function () {
            const taskDetailsPanel = document.getElementById('taskDetailsPanel');
            if (taskDetailsPanel) {
                taskDetailsPanel.classList.remove('visible');
            }
        });
    }

    function fetchTaskDetails(taskId) {
        fetch('tasksHandler.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=list&task_id=${taskId}`
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    displayTaskDetails(data.task);
                } else {
                    console.error('Failed to fetch task details:', data.message);
                }
            })
            .catch(error => console.error('Error fetching task details:', error));
    }

    function displayTaskDetails(task) {
        const content = `
            <p><strong>Title:</strong> ${task.title}</p>
            <p><strong>Type:</strong> ${task.task_type}</p>
            <p><strong>From Date:</strong> ${task.from_date}</p>
            <p><strong>To Date:</strong> ${task.to_date}</p>
            <p><strong>Status:</strong> ${task.status}</p>
            <p><strong>Priority:</strong> ${task.priority}</p>
            <p><strong>Suggested Date:</strong> ${task.suggested_date}</p>
            <p><strong>Actual Start Date:</strong> ${task.actual_start_date}</p>
            <p><strong>Actual End Date:</strong> ${task.actual_end_date}</p>
            <p><strong>Percent:</strong> ${task.percent}%</p>
            <p><strong>Details:</strong> ${task.details}</p>
        `;
        const panelContent = document.querySelector('.panel-content');
        if (panelContent) {
            panelContent.innerHTML = content;
            const taskDetailsPanel = document.getElementById('taskDetailsPanel');
            if (taskDetailsPanel) {
                taskDetailsPanel.classList.add('visible');
            }
        }
    }
});

