// Filters functionality
document.addEventListener('DOMContentLoaded', function () {
    // Main Filters Elements
    const filtersBtn = document.getElementById('filtersBtn');
    const filtersSection = document.querySelector('.filters-section');
    const closeFiltersBtn = document.getElementById('closeFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const coursesFilter = document.getElementById('courses-filter');
    const tasksFilter = document.getElementById('tasks-filter');
    const statusFilter = document.getElementById('status-filter');

    // Tasks Filter Elements
    const filterTasksBtn = document.getElementById('filterTasksBtn');
    const filterTasksSection = document.querySelector('.filter-tasks-section');
    const tasksFilterSimple = document.getElementById('tasks-filter-simple');
    const resetTasksFilterBtn = document.getElementById('resetTasksFilterBtn');
    const closeTasksFilterBtn = document.getElementById('closeTasksFilterBtn');

    // Toggle Main Filters Section
    filtersBtn.addEventListener('click', async function () {
        filterTasksBtn.style.display = 'none';
        filtersBtn.style.display = 'none';
        filterTasksSection.classList.remove('show');
        filterTasksSection.style.display = 'none';
        filtersSection.style.display = 'flex';
        filtersSection.classList.add('show');
        await fetchCourses();
        console.log('Main Filters opened');
    });

    // Close Main Filters Section
    closeFiltersBtn.addEventListener('click', async function () {
        filtersSection.classList.remove('show');
        filtersSection.style.display = 'none';
        filtersBtn.style.display = 'block';
        filterTasksBtn.style.display = 'block';
        await clearFilters(); // Clear filters when closing
        console.log('Main Filters closed');
    });

    // Toggle Tasks Filter Section
    filterTasksBtn.addEventListener('click', function () {
        filterTasksBtn.style.display = 'none';
        filtersBtn.style.display = 'none';
        filtersSection.classList.remove('show');
        filtersSection.style.display = 'none';
        filterTasksSection.style.display = 'flex';
        filterTasksSection.classList.add('show');
        console.log('Tasks Filter opened');
    });

    // Close Tasks Filter Section
    closeTasksFilterBtn.addEventListener('click', async function () {
        filterTasksSection.classList.remove('show');
        filterTasksSection.style.display = 'none';
        filterTasksBtn.style.display = 'block';
        filtersBtn.style.display = 'block';
        await clearFilters(); // Clear filters when closing
        console.log('Tasks Filter closed');
    });

    // Reset Tasks Filter
    function resetTasksFilter() {
        if (tasksFilterSimple) {
            tasksFilterSimple.value = 'all';
            clearFilters();
            console.log('Tasks Filter reset');
        }
    }

    resetTasksFilterBtn.addEventListener('click', resetTasksFilter);

    // Apply Tasks Filter
    if (tasksFilterSimple) {
        tasksFilterSimple.addEventListener('change', async function () {
            const params = new URLSearchParams({
                action: 'applyFilters',
                course_id: 'all',
                task_type: this.value,
                status: 'all'
            });

            try {
                const response = await fetch(`filtersHandler.php?${params}`);
                const data = await response.json();

                if (data.status === "success" && data.tasks) {
                    console.log('Retrieved filtered tasks:', data.tasks);
                    filtersActive = true;
                    window.filteredTasks = data.tasks;

                    // Clear existing tasks
                    window.clearTaskCellHighlights();

                    // Show filtered tasks
                    window.highlightTaskRows(data.tasks);
                } else {
                    console.error('Error in filter response:', data);
                }
            } catch (error) {
                console.error('Error applying task filter:', error);
            }
        });
    }

    // Original filters functionality for course filtering
    coursesFilter.addEventListener('change', function () {
        if (this.value === 'all') {
            tasksFilter.style.display = 'none';
            statusFilter.style.display = 'none';
            clearFilters();
        } else {
            tasksFilter.style.removeProperty('display');
            statusFilter.style.removeProperty('display');
            applyFilters();
        }
    });

    tasksFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    resetFiltersBtn.addEventListener('click', clearFilters);

    // Initialize the UI state
    function initializeFiltersUI() {
        filtersBtn.style.display = 'block';
        filterTasksBtn.style.display = 'block';
        filtersSection.classList.remove('show');
        filtersSection.style.display = 'none';
        filterTasksSection.classList.remove('show');
        filterTasksSection.style.display = 'none';
    }

    // Initialize on page load
    initializeFiltersUI();

    // Store original matrix update function
    const originalUpdateMatrix = window.updateScheduleMatrixTasks;

    // Track if filters are active
    let filtersActive = false;

    // Function to get task color based on type
    function getTaskColor(taskType) {
        const colors = {
            quiz: '#ff9999',
            assignment: '#99ff99',
            project: '#9999ff',
            mt: '#ffff99',
            final: '#ff99ff'
        };
        return colors[taskType.toLowerCase()] || '#cccccc';
    }

    // Function to fetch courses and populate courses filter
    async function fetchCourses() {
        console.log('Fetching courses');
        try {
            const response = await fetch('filtersHandler.php?action=getCourses');
            const data = await response.json();

            if (data.status === "success") {
                console.log('Received courses:', data.courses);
                coursesFilter.innerHTML = '<option value="all" selected>All</option>';
                data.courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.c_id;
                    option.textContent = course.courseName;
                    coursesFilter.appendChild(option);
                });
            } else {
                console.error('Error fetching courses:', data.message);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    }

    // Override matrix update function to use matrixHighlighter functions
    window.updateScheduleMatrixTasks = function () {
        if (filtersActive && window.filteredTasks) {
            window.clearTaskCellHighlights(); // Use existing clear function
            window.highlightTaskRows(window.filteredTasks); // Use existing highlight function
        } else if (originalUpdateMatrix) {
            originalUpdateMatrix();
        }
    };

    // Function to apply filters
    async function applyFilters() {
        const courseId = coursesFilter.value;
        const taskType = tasksFilter.value;
        const status = statusFilter.value;

        console.log('Applying filters:', { courseId, taskType, status });

        try {
            // Fetch filtered tasks
            const params = new URLSearchParams({
                action: 'applyFilters',
                course_id: courseId,
                task_type: taskType,
                status: status
            });

            const response = await fetch(`filtersHandler.php?${params}`);
            const data = await response.json();

            if (data.status === "success" && data.tasks) {
                console.log('Retrieved filtered tasks:', data.tasks);
                filtersActive = true;
                window.filteredTasks = data.tasks;

                // Clear existing tasks
                window.clearTaskCellHighlights();

                // Show filtered tasks
                window.highlightTaskRows(data.tasks);

                // Show reset button
                resetFiltersBtn.style.display = 'block';
            } else {
                console.error('Error in filter response:', data);
            }
        } catch (error) {
            console.error('Error applying filters:', error);
        }
    }

    // Function to clear filters
    async function clearFilters() {
        console.log('Clearing filters');

        // Reset filter values
        coursesFilter.value = 'all';
        tasksFilter.value = 'all';
        statusFilter.value = 'all';
        if (tasksFilterSimple) {
            tasksFilterSimple.value = 'all';
        }

        // Hide filter dropdowns
        tasksFilter.style.display = 'none';
        statusFilter.style.display = 'none';
        resetFiltersBtn.style.display = 'none';

        // Reset filter state
        filtersActive = false;
        window.filteredTasks = null;

        // Clear and restore original matrix state
        window.clearTaskCellHighlights();
        if (originalUpdateMatrix) {
            originalUpdateMatrix();
        }

        console.log('Filters cleared, original matrix state restored');
    }
}); 