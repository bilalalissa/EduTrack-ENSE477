document.addEventListener('DOMContentLoaded', function () {
    console.log('\n\ntaskEdit.js script loaded');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskForm = document.getElementById('tasksForm');
    const submitTaskButton = document.getElementById('submitTaskBtn');
    const taskTypeField = document.getElementById('task_type');
    const taskIdInput = document.getElementById('id');

    // Use event delegation for edit buttons
    document.body.addEventListener('click', function (event) {
        if (event.target.classList.contains('editSaveBtn')) {
            console.log('\n\nEdit button clicked and edit task started');
            addTaskBtn.style.display = 'none';
            const taskId = event.target.dataset.id;
            const taskType = event.target.dataset.type;
            if (taskId) {
                taskIdInput.value = taskId; // Populate the hidden input with the task ID
                console.log(' > 1- fetchTaskDetails(taskId, taskType) called');
                fetchTaskDetails(taskId, taskType);
            } else {
                console.error(' > Task ID is undefined. Check if data-task-id is set correctly.');
            }
            taskForm.style.display = 'block'; // Show the task form
            submitTaskButton.id = 'saveEditTaskBtn'; // Change button ID for saving
        }
    });

    // Add event listener for saveEditTaskBtn
    document.body.addEventListener('click', function (event) {
        if (event.target.id === 'saveEditTaskBtn') {
            event.preventDefault(); // Prevent default form submission

            console.log(' > 2. taskEdit.js/saveEditTaskBtn.addEventListener()\n saveEditTaskBtn clicked event listener started');
            const action = 'editTask';
            const formData = new FormData(taskForm);
            formData.append('action', action);

            // Ensure taskId is included in the form data
            const taskId = taskIdInput.value;
            formData.append('id', taskId);

            // Log all form data for debugging
            for (let [key, value] of formData.entries()) {
                console.log(key, value);
            }

            fetch('tasksHandler.php', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        const task = data.task;
                        if (task) {
                            alert('Task (' + task.title + ') saved successfully');
                            console.log('Task (' + task.title + ') saved successfully');

                            // Clear form fields
                            taskForm.reset();

                            // Hide the task form
                            taskForm.style.display = 'none';

                            // Show the addTaskBtn
                            addTaskBtn.style.display = 'block';

                            // Refresh the task list
                            refreshTaskList();
                        } else {
                            console.error('Task object is undefined:', data);
                        }
                    } else {
                        alert('Failed to save task: ' + data.message);
                        console.error('Failed to save task:', data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while saving the task. \nDetails: ' + error);
                });
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
                    document.getElementById('title').value = task.title;
                    document.getElementById('from_date').value = task.from_date;
                    document.getElementById('to_date').value = task.to_date;
                    document.getElementById('status').value = task.status;
                    document.getElementById('suggested_date').value = task.suggested_date;
                    document.getElementById('percent').value = task.percent;
                    document.getElementById('priority').value = task.priority;
                    document.getElementById('details').value = task.details;
                    document.getElementById('start_date').value = task.start_date;
                    document.getElementById('actual_start_date').value = task.actual_start_date;
                    document.getElementById('actual_end_date').value = task.actual_end_date;
                } else {
                    alert('Failed to fetch task details: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error fetching task details:', error);
            });
    }

    // Function to refresh the task list
    function refreshTaskList() {
        console.log('Refreshing task list...');
        fetch('tasksHandler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'list',
                task_type: 'all' // or specific task type if needed
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    const tasksList = document.querySelector('.tasksList');
                    tasksList.innerHTML = ''; // Clear existing tasks

                    // Group tasks by course
                    const tasksByCourse = data.tasks.reduce((acc, task) => {
                        if (!acc[task.course_id]) {
                            acc[task.course_id] = [];
                        }
                        acc[task.course_id].push(task);
                        return acc;
                    }, {});

                    // Create list items for each course and its tasks
                    for (const [courseId, tasks] of Object.entries(tasksByCourse)) {
                        const courseItem = document.createElement('li');
                        courseItem.innerHTML = `<strong>${courseMap[courseId] || 'Course ' + courseId}:</strong>`;
                        const taskList = document.createElement('ul');

                        tasks.forEach(task => {
                            const listItem = document.createElement('li');
                            listItem.innerHTML = `
                                <div class="taskDiv">
                                    <input type="text" class="ctaskValue" disabled value="${task.title}" />
                                    <button class="editSaveBtn" data-id="${task.id}" data-type="${task.task_type}">Edit</button>
                                    <button class="delBtn" data-id="${task.id}" data-type="${task.task_type}">Delete</button>
                                </div>
                            `;
                            taskList.appendChild(listItem);
                        });

                        courseItem.appendChild(taskList);
                        tasksList.appendChild(courseItem);
                    }

                    console.log('Task list updated:', data.tasks);

                    // Re-highlight the schedule matrix with all tasks
                    reHighlightScheduleMatrix(data.tasks);
                } else {
                    console.error('Failed to fetch task list:', data.message);
                }
            })
            .catch(error => {
                console.error('Error fetching task list:', error);
            });
    }

    // Function to re-highlight the schedule matrix
    function reHighlightScheduleMatrix(tasks) {
        // Clear previous highlights
        // clearHolidayCellHighlights();
        clearTaskCellHighlights();

        // Highlight tasks
        console.log('Calling highlightTaskRows...');
        if (typeof highlightTaskRows === 'function') {
            highlightTaskRows(tasks); // Pass the updated tasks
        } else {
            console.error('highlightTaskRows function is not defined');
        }
    }
});