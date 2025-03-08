// Redirect user to sighup page
document.addEventListener('DOMContentLoaded', function () {
    var signupButton = document.getElementById('signupButton');
    if (signupButton) {
        signupButton.addEventListener('click', function () {
            window.location.href = 'signup.php';
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
    let activeTaskId = null;

    document.getElementById('taskTable').addEventListener('click', function (event) {
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

    document.addEventListener('click', function (event) {
        if (!event.target.closest('.task-cell')) {
            // Click outside any task cell, hide the slider
            slider.classList.remove('visible');
            slider.classList.add('hidden');
            activeTaskId = null;
        }
    });
});

