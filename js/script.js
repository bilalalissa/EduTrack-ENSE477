// Redirect user to sighup page
document.addEventListener('DOMContentLoaded', function () {
    var signupButton = document.getElementById('signupButton');
    if (signupButton) {
        signupButton.addEventListener('click', function () {
            window.location.href = 'signup.php';
        });
    }
});

// Handle signup form validation and submission
document.addEventListener('DOMContentLoaded', function () {
    const signupSubmit = document.getElementById('signupSubmit');
    const signupForm = document.querySelector('.form-container');
    const inputs = {
        username: document.getElementById('username'),
        email: document.getElementById('email'),
        password: document.getElementById('password'),
        confirmPassword: document.getElementById('confirmPassword'),
        firstName: document.getElementById('firstName'),
        lastName: document.getElementById('lastName'),
        studentId: document.getElementById('studentId')
    };

    // Validation rules with improved messages
    const validationRules = {
        username: {
            regex: /^[a-zA-Z0-9_]{4,20}$/,
            message: 'Username must be 4-20 characters long and can only contain letters, numbers, and underscores',
            successMessage: 'Username is available'
        },
        email: {
            regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please enter a valid email address',
            successMessage: 'Email format is valid'
        },
        password: {
            regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            message: 'Password must contain:\n• At least 8 characters\n• One uppercase letter\n• One lowercase letter\n• One number\n• One special character (@$!%*?&)',
            successMessage: 'Password meets requirements'
        },
        firstName: {
            regex: /^[a-zA-Z\s]{2,50}$/,
            message: 'First name must be 2-50 characters long and can only contain letters',
            successMessage: 'First name is valid'
        },
        lastName: {
            regex: /^[a-zA-Z\s]{2,50}$/,
            message: 'Last name must be 2-50 characters long and can only contain letters',
            successMessage: 'Last name is valid'
        },
        studentId: {
            regex: /^[0-9]{7,10}$/,
            message: 'Student ID must be 7-10 digits',
            successMessage: 'Student ID format is valid'
        }
    };

    // Function to show validation message with animation
    function showValidationMessage(inputElement, message, type) {
        const validationElement = document.getElementById(inputElement.id + 'Validation');
        if (validationElement) {
            validationElement.textContent = message;
            validationElement.className = `validation-message ${type} visible`;

            // Add appropriate class to the input element
            if (type === 'success') {
                inputElement.className = 'valid';
            } else if (type === 'error') {
                inputElement.className = 'invalid';
            } else if (type === 'warning') {
                inputElement.className = 'warning';
            }
        }
    }

    // Function to hide validation message
    function hideValidationMessage(inputElement) {
        const validationElement = document.getElementById(inputElement.id + 'Validation');
        if (validationElement) {
            validationElement.className = 'validation-message';
            validationElement.textContent = '';
            inputElement.className = '';
        }
    }

    // Function to validate input with debounce
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // Function to validate input
    function validateInput(inputElement, rule) {
        const value = inputElement.value.trim();

        if (value === '') {
            hideValidationMessage(inputElement);
            return false;
        }

        if (rule && !rule.regex.test(value)) {
            showValidationMessage(inputElement, rule.message, 'error');
            return false;
        }

        showValidationMessage(inputElement, rule.successMessage, 'success');
        return true;
    }

    // Function to validate confirm password
    function validateConfirmPassword() {
        const password = inputs.password.value;
        const confirmPassword = inputs.confirmPassword.value;

        if (confirmPassword === '') {
            hideValidationMessage(inputs.confirmPassword);
            return false;
        }

        if (password !== confirmPassword) {
            showValidationMessage(inputs.confirmPassword, 'Passwords do not match', 'error');
            return false;
        }

        showValidationMessage(inputs.confirmPassword, 'Passwords match!', 'success');
        return true;
    }

    // Add input event listeners for real-time validation with debounce
    Object.keys(inputs).forEach(key => {
        const input = inputs[key];
        if (!input) return;

        // Real-time validation with debounce
        const debouncedValidation = debounce(() => {
            if (key === 'confirmPassword') {
                validateConfirmPassword();
            } else {
                validateInput(input, validationRules[key]);
            }
        }, 300);

        input.addEventListener('input', debouncedValidation);

        // Add focus out event for immediate validation
        input.addEventListener('blur', function () {
            if (key === 'confirmPassword') {
                validateConfirmPassword();
            } else {
                validateInput(input, validationRules[key]);
            }
        });

        // Add keypress event for Enter key to move to next field
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const currentIndex = Object.keys(inputs).indexOf(key);
                const nextInput = inputs[Object.keys(inputs)[currentIndex + 1]];
                if (nextInput) {
                    nextInput.focus();
                } else {
                    signupSubmit.click(); // Submit if it's the last field
                }
            }
        });

        // Add focus event to show validation message if exists
        input.addEventListener('focus', function () {
            const validationElement = document.getElementById(input.id + 'Validation');
            if (validationElement && validationElement.textContent) {
                validationElement.classList.add('visible');
            }
        });
    });

    // Add event listeners for new fields
    inputs.firstName.addEventListener('input', debounce(() => validateField('firstName'), 500));
    inputs.lastName.addEventListener('input', debounce(() => validateField('lastName'), 500));
    inputs.studentId.addEventListener('input', debounce(() => validateField('studentId'), 500));

    if (signupSubmit && signupForm) {
        signupForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Validate all fields
            let isValid = true;
            Object.keys(inputs).forEach(key => {
                if (key === 'confirmPassword') {
                    isValid = validateConfirmPassword() && isValid;
                } else {
                    isValid = validateInput(inputs[key], validationRules[key]) && isValid;
                }
            });

            if (!isValid) {
                // Focus the first invalid input
                const firstInvalid = Object.values(inputs).find(input =>
                    input.className === 'error' || input.className === 'warning'
                );
                if (firstInvalid) {
                    firstInvalid.focus();
                }
                return;
            }

            // Show loading state
            signupSubmit.disabled = true;
            signupSubmit.textContent = 'Signing up...';

            // Prepare data for submission
            const data = {
                username: inputs.username.value,
                email: inputs.email.value,
                password: inputs.password.value,
                firstName: inputs.firstName.value,
                lastName: inputs.lastName.value,
                studentId: inputs.studentId.value
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
                        showValidationMessage(inputs.username, result.message, 'error');
                        signupSubmit.disabled = false;
                        signupSubmit.textContent = 'Sign-up';
                    } else {
                        // Successful signup will redirect to home.php
                        window.location.href = 'home.php';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showValidationMessage(inputs.username, 'An error occurred during signup. Please try again.', 'error');
                    signupSubmit.disabled = false;
                    signupSubmit.textContent = 'Sign-up';
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

// Update validateForm function
function validateForm() {
    let isValid = true;

    // Validate all fields
    for (const field in inputs) {
        if (!validateField(field)) {
            isValid = false;
        }
    }

    // Additional password match validation
    if (inputs.password.value !== inputs.confirmPassword.value) {
        showValidationMessage(inputs.confirmPassword, 'Passwords do not match', 'error');
        isValid = false;
    }

    return isValid;
}

// Update validateField function
function validateField(field) {
    const input = inputs[field];
    const value = input.value.trim();
    const rule = validationRules[field];

    // Skip validation for confirmPassword as it's handled separately
    if (field === 'confirmPassword') return true;

    if (!value) {
        showValidationMessage(input, `${field.charAt(0).toUpperCase() + field.slice(1)} is required`, 'error');
        return false;
    }

    if (!rule.regex.test(value)) {
        showValidationMessage(input, rule.message, 'error');
        return false;
    }

    showValidationMessage(input, rule.successMessage, 'success');
    return true;
}

// Add event listener for hideSubmittedTasks checkbox
/*
document.addEventListener('DOMContentLoaded', function () {
    const hideSubmittedTasksCheckbox = document.getElementById('hideSubmittedTasks');
    if (hideSubmittedTasksCheckbox) {
        hideSubmittedTasksCheckbox.addEventListener('change', function () {
            // Create form data
            const formData = new FormData();
            formData.append('action', 'updateVisibility');
            formData.append('hideSubmitted', this.checked ? '1' : '0');

            // Send request to update the database
            fetch('tasksHandler.php', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(result => {
                    if (result.status === 'success') {
                        console.log('Visibility setting updated successfully');
                        // Refresh the task list or update the UI as needed
                        if (typeof updateTaskList === 'function') {
                            updateTaskList();
                        }
                    } else {
                        console.error('Failed to update visibility setting:', result.message);
                    }
                })
                .catch(error => {
                    console.error('Error updating visibility setting:', error);
                });
        });
    }
});
*/

