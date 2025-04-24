// Insights handler
document.addEventListener('DOMContentLoaded', function () {
    const tasksProgressElement = document.getElementById('tasksProgress');
    const daysProgressElement = document.getElementById('daysProgress');
    const weeksProgressElement = document.getElementById('weeksProgress');
    const semesterProgressElement = document.getElementById('semesterProgress');
    const insightsContainer = document.querySelector('.insights-container');

    // Add toggle functionality
    let isVisible = false;
    let autoHideTimer;

    function showInsights() {
        insightsContainer.classList.add('visible');
        isVisible = true;
    }

    function hideInsights() {
        insightsContainer.classList.remove('visible');
        isVisible = false;
    }

    // Show insights on hover
    insightsContainer.addEventListener('mouseenter', () => {
        clearTimeout(autoHideTimer);
        showInsights();
    });

    // Hide insights when mouse leaves
    insightsContainer.addEventListener('mouseleave', () => {
        autoHideTimer = setTimeout(hideInsights, 1000); // 1 second delay before hiding
    });

    // Toggle on click
    insightsContainer.addEventListener('click', (e) => {
        if (isVisible) {
            hideInsights();
        } else {
            showInsights();
        }
        e.stopPropagation();
    });

    // Hide when clicking outside
    document.addEventListener('click', () => {
        if (isVisible) {
            hideInsights();
        }
    });

    // Function to update insights
    async function updateInsights() {
        try {
            const response = await fetch('tasksHandler.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'action=getInsights'
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            if (data.status === 'success') {
                // Update tasks progress
                tasksProgressElement.textContent = `${data.submittedTasks}/${data.totalTasks}`;

                // Update days progress
                daysProgressElement.textContent = `${data.daysPassed}/${data.totalDays}`;

                // Update weeks progress
                weeksProgressElement.textContent = `${data.weeksPassed}/${data.totalWeeks}`;

                // Update semester progress percentage
                const progressPercent = Math.round((data.daysPassed / data.totalDays) * 100);
                semesterProgressElement.textContent = `${progressPercent}%`;

                // Update colors based on progress
                updateProgressColors(progressPercent);
            } else {
                console.error('Error in insights data:', data.message);
            }
        } catch (error) {
            console.error('Error fetching insights:', error);
        }
    }

    // Function to update progress colors
    function updateProgressColors(progressPercent) {
        const elements = [tasksProgressElement, daysProgressElement, weeksProgressElement, semesterProgressElement];
        elements.forEach(element => {
            if (progressPercent >= 75) {
                element.style.color = 'rgba(255, 87, 51, 0.9)'; // Red for urgent
            } else if (progressPercent >= 50) {
                element.style.color = 'rgba(255, 195, 0, 0.9)'; // Yellow for warning
            } else {
                element.style.color = 'rgba(100, 149, 237, 0.9)'; // Blue for normal
            }
        });
    }

    // Function to check if it's a new day
    function isNewDay(lastUpdate) {
        const now = new Date();
        const last = new Date(lastUpdate);
        return now.getDate() !== last.getDate() ||
            now.getMonth() !== last.getMonth() ||
            now.getFullYear() !== last.getFullYear();
    }

    // Initialize last update time
    let lastUpdate = new Date();

    // Update insights immediately
    updateInsights();

    // Set up periodic updates
    setInterval(() => {
        const now = new Date();

        // Update if it's a new day
        if (isNewDay(lastUpdate)) {
            updateInsights();
            lastUpdate = now;
        }
    }, 60000); // Check every minute

    // Set up event listeners for real-time updates
    document.addEventListener('taskStatusChanged', updateInsights);
    document.addEventListener('taskAdded', updateInsights);
    document.addEventListener('taskDeleted', updateInsights);

    // Also update when the window regains focus
    window.addEventListener('focus', updateInsights);
}); 