document.addEventListener('DOMContentLoaded', function () {
    console.log('taskEdit.js script loaded');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskForm = document.getElementById('tasksForm');
    const submitTaskButton = document.getElementById('submitTaskBtn');
    const taskTypeField = document.getElementById('task_type');
    const taskIdInput = document.getElementById('task_id');

    // Use event delegation for edit buttons
    document.body.addEventListener('click', function (event) {
        if (event.target.classList.contains('editSaveBtn')) {
            console.log('Edit button clicked');
            const taskId = event.target.dataset.id;
            const taskType = event.target.dataset.type;

            if (taskId) {
                console.log('Setting up form for editing task:', { id: taskId, type: taskType });

                // Hide add button and show form
                if (addTaskBtn) addTaskBtn.style.display = 'none';
                if (taskForm) {
                    taskForm.style.display = 'block';
                    // Ensure the form is visible by scrolling to it
                    taskForm.scrollIntoView({ behavior: 'smooth' });
                }

                // Set up form for editing mode
                taskIdInput.value = taskId;
                if (submitTaskButton) {
                    submitTaskButton.textContent = 'Save Changes';
                    // Add a class to indicate edit mode
                    submitTaskButton.classList.add('editing-mode');
                }

                console.log('Fetching task details for ID:', taskId, 'Type:', taskType);
                fetchTaskDetails(taskId, taskType);
            } else {
                console.error('Task ID is undefined');
            }
        }
    });

    function fetchTaskDetails(taskId, taskType) {
        console.log('Fetching task details for task ID:', taskId);

        fetch('tasksHandler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'getTask',
                task_type: taskType,
                id: taskId
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    const task = data.task;
                    console.log('Task details received:', task);

                    // Populate form fields
                    const fields = {
                        'course_id': task.course_id,
                        'task_type': task.task_type,
                        'title': task.title,
                        'from_date': task.from_date,
                        'to_date': task.to_date,
                        'status': task.status,
                        'suggested_date': task.suggested_date,
                        'percent': task.percent,
                        'priority': task.priority,
                        'details': task.details,
                        'start_date': task.start_date,
                        'actual_start_date': task.actual_start_date,
                        'actual_end_date': task.actual_end_date
                    };

                    // Populate each field and log any missing elements
                    Object.entries(fields).forEach(([id, value]) => {
                        const element = document.getElementById(id);
                        if (element) {
                            element.value = value;
                        } else {
                            console.error(`Element not found for field: ${id}`);
                        }
                    });

                    console.log('Form populated successfully');

                    // Trigger any necessary validation
                    if (typeof setupDateValidation === 'function') {
                        setupDateValidation();
                    }
                } else {
                    console.error('Failed to fetch task details:', data.message);
                    alert('Failed to fetch task details: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error fetching task details:', error);
                alert('Error fetching task details: ' + error);
            });
    }
});