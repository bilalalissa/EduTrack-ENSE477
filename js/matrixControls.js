document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded - Initializing matrix controls');

    // Get button elements
    const monthViewBtn = document.getElementById('monthViewBtn');
    const fullViewBtn = document.getElementById('fullViewBtn');
    const prevBtn = document.getElementById('prevBtn');
    const todayBtn = document.getElementById('todayBtn');
    const nextBtn = document.getElementById('nextBtn');

    console.log('Buttons found:', {
        monthViewBtn: !!monthViewBtn,
        fullViewBtn: !!fullViewBtn,
        prevBtn: !!prevBtn,
        todayBtn: !!todayBtn,
        nextBtn: !!nextBtn
    });

    // Get matrix elements - be more specific with selectors
    const rightSection = document.querySelector('.right-section');
    if (!rightSection) {
        console.error('Right section not found');
        return;
    }

    const schdHeader = rightSection.querySelector('.schd-header');
    const schdBody = rightSection.querySelector('.schd-body');
    const headerMatrix = schdHeader?.querySelector('.header-matrix');
    const schdMatrix = schdBody?.querySelector('.schd-matrix');

    // Debug log for initial element selection
    console.log('Matrix elements found:', {
        rightSection: rightSection ? 'yes' : 'no',
        schdHeader: schdHeader ? 'yes' : 'no',
        schdBody: schdBody ? 'yes' : 'no',
        headerMatrix: headerMatrix ? 'yes' : 'no',
        schdMatrix: schdMatrix ? 'yes' : 'no'
    });

    // Constants
    const CELL_WIDTH = 40;
    const TOTAL_CELLS = 120;
    let currentView = 'regular';
    let lastScrollPosition = 0;

    // Function to hide submitted task rows and their placeholders
    function hideSubmittedTaskRows() {
        const showSubmittedTasksCheckbox = document.querySelector('input[name="showSubmittedTasks"]');
        if (!schdMatrix) return;

        // First, get all rows
        const taskRows = schdMatrix.querySelectorAll('.matrix-row');
        console.log('Found task rows:', taskRows.length);

        taskRows.forEach(row => {
            // Check for submitted tasks in this row
            const isSubmitted = row.getAttribute('data-status') === 'submitted' ||
                row.querySelector('.task[data-status="submitted"]') !== null;

            // Debug log
            console.log('Row status:', {
                rowId: row.getAttribute('data-id'),
                isSubmitted: isSubmitted,
                hasSubmittedAttr: row.getAttribute('data-status') === 'submitted',
                hasSubmittedTask: row.querySelector('.task[data-status="submitted"]') !== null
            });

            if (isSubmitted) {
                // Hide row if checkbox is unchecked
                if (!showSubmittedTasksCheckbox?.checked) {
                    // Hide the entire row
                    row.style.display = 'none';
                    row.style.pointerEvents = 'none';

                    // Hide all cells in the row
                    const cells = row.querySelectorAll('.matrix-cell');
                    cells.forEach(cell => {
                        cell.style.display = 'none';
                        cell.style.pointerEvents = 'none';
                        cell.style.cursor = 'default';

                        // Hide any placeholders
                        const placeholder = cell.querySelector('.task-placeholder');
                        if (placeholder) {
                            placeholder.style.display = 'none';
                        }
                    });

                    // Also hide any tasks in the row
                    const tasks = row.querySelectorAll('.task');
                    tasks.forEach(task => {
                        task.style.display = 'none';
                    });
                } else {
                    // Show row if checkbox is checked
                    row.style.display = '';
                    row.style.pointerEvents = 'auto';

                    // Show all cells in the row
                    const cells = row.querySelectorAll('.matrix-cell');
                    cells.forEach(cell => {
                        cell.style.display = '';
                        cell.style.pointerEvents = 'auto';
                        cell.style.cursor = '';

                        // Show any placeholders
                        const placeholder = cell.querySelector('.task-placeholder');
                        if (placeholder) {
                            placeholder.style.display = '';
                        }
                    });

                    // Also show any tasks in the row
                    const tasks = row.querySelectorAll('.task');
                    tasks.forEach(task => {
                        task.style.display = '';
                    });
                }
            }
        });
    }

    // Function to scroll both header and body
    function scrollBoth(left) {
        if (!schdBody || !schdHeader || currentView === 'full') return;

        const maxScroll = (TOTAL_CELLS * CELL_WIDTH) - schdBody.clientWidth;
        const scrollLeft = Math.max(0, Math.min(left, maxScroll));

        schdBody.scrollLeft = scrollLeft;
        schdHeader.scrollLeft = scrollLeft;
    }

    // Function to sync scroll between header and body
    function syncScroll(sourceElement, targetElement) {
        if (currentView === 'full') return;
        targetElement.scrollLeft = sourceElement.scrollLeft;
    }

    // Add scroll event listeners for synchronization
    if (schdBody && schdHeader) {
        schdBody.addEventListener('scroll', () => syncScroll(schdBody, schdHeader));
        schdHeader.addEventListener('scroll', () => syncScroll(schdHeader, schdBody));
    }

    // Function to get current scroll position in days
    function getCurrentScrollDays() {
        return Math.floor(schdBody.scrollLeft / CELL_WIDTH);
    }

    // Function to calculate visible cells based on container width
    function getVisibleCells() {
        return Math.floor(schdBody.clientWidth / CELL_WIDTH);
    }

    // Function to get the first cell's date from the matrix
    function getMatrixStartDate() {
        const firstDateCell = schdMatrix.querySelector('.matrix-cell[data-date]');
        if (firstDateCell) {
            const dateStr = firstDateCell.getAttribute('data-date');
            return dateStr ? new Date(dateStr) : null;
        }
        return null;
    }

    // Function to scroll to a specific date
    function scrollToDate(targetDate) {
        if (!window.startDateForMatrix) return;

        // Create new Date objects and normalize to midnight
        const date = new Date(targetDate);
        const startDate = new Date(window.startDateForMatrix);

        date.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);

        // Calculate days difference
        const diffTime = date.getTime() - startDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // Calculate scroll position
        const scrollLeft = diffDays * CELL_WIDTH;
        scrollBoth(scrollLeft);
    }

    // Function to get first day of current month
    function getFirstDayOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    // Function to get first day of previous month
    function getFirstDayOfPreviousMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() - 1, 1);
    }

    // Function to get first day of next month
    function getFirstDayOfNextMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 1);
    }

    // Function to get current visible month
    function getCurrentVisibleMonth() {
        if (!window.startDateForMatrix) return new Date();

        const startDate = new Date(window.startDateForMatrix);
        const currentScrollDays = getCurrentScrollDays();
        const currentVisibleDate = new Date(startDate);
        currentVisibleDate.setDate(startDate.getDate() + currentScrollDays);
        return currentVisibleDate;
    }

    // Function to scroll to first day of current month
    function scrollToCurrentMonth() {
        if (!window.startDateForMatrix) return;

        // Get first day of current month
        const today = new Date();
        const firstDayOfMonth = getFirstDayOfMonth(today);

        // Scroll to that date
        scrollToDate(firstDayOfMonth);
    }

    // Function to set view mode
    function setViewMode(mode) {
        console.log('setViewMode called with mode:', mode);

        // Verify elements exist
        if (!schdHeader || !schdBody || !headerMatrix || !schdMatrix) {
            console.error('Required elements not found:', {
                schdHeader: !!schdHeader,
                schdBody: !!schdBody,
                headerMatrix: !!headerMatrix,
                schdMatrix: !!schdMatrix
            });
            return;
        }

        // Get all rows and cells within the matrices
        const headerRows = headerMatrix.querySelectorAll('.matrix-row');
        const schdRows = schdMatrix.querySelectorAll('.matrix-row');
        const headerCells = headerMatrix.querySelectorAll('.header-cell');
        const schdCells = schdMatrix.querySelectorAll('.matrix-cell');

        console.log('Found matrix elements:', {
            headerRows: headerRows.length,
            schdRows: schdRows.length,
            headerCells: headerCells.length,
            schdCells: schdCells.length
        });

        // First, remove all view mode classes
        const elements = [schdHeader, schdBody, headerMatrix, schdMatrix];
        elements.forEach(el => {
            el.classList.remove('full-view-mode', 'regular-view-mode');
        });

        [...headerRows, ...schdRows].forEach(row => {
            row.classList.remove('full-view-mode', 'regular-view-mode');
        });

        [...headerCells, ...schdCells].forEach(cell => {
            cell.classList.remove('full-view-mode', 'regular-view-mode');
        });

        // Then apply the new view mode
        if (mode === 'full') {
            console.log('Applying full view mode');

            // Store current scroll position
            lastScrollPosition = schdBody.scrollLeft;

            // Apply full view mode to all elements
            elements.forEach(el => el.classList.add('full-view-mode'));
            [...headerRows, ...schdRows].forEach(row => row.classList.add('full-view-mode'));
            [...headerCells, ...schdCells].forEach(cell => cell.classList.add('full-view-mode'));

            // Disable scrolling
            schdHeader.style.overflowX = 'hidden';
            schdBody.style.overflowX = 'hidden';

            // Reset scroll position
            schdBody.scrollLeft = 0;
            schdHeader.scrollLeft = 0;

            console.log('Full view mode applied');
        } else {
            console.log('Applying regular view mode');

            // Apply regular view mode to all elements
            elements.forEach(el => el.classList.add('regular-view-mode'));
            [...headerRows, ...schdRows].forEach(row => row.classList.add('regular-view-mode'));
            [...headerCells, ...schdCells].forEach(cell => cell.classList.add('regular-view-mode'));

            // Enable scrolling
            schdHeader.style.overflowX = 'scroll';
            schdBody.style.overflowX = 'scroll';

            // Restore scroll position if coming from full view
            if (currentView === 'full') {
                setTimeout(() => {
                    schdBody.scrollLeft = lastScrollPosition;
                    schdHeader.scrollLeft = lastScrollPosition;
                }, 50);
            }

            console.log('Regular view mode applied');
        }

        // Hide submitted task rows and placeholders based on checkbox state
        hideSubmittedTaskRows();

        // Update current view and button states
        currentView = mode;
        if (fullViewBtn) {
            fullViewBtn.classList.toggle('active', mode === 'full');
            console.log('Full view button active state:', mode === 'full');
        }
        if (monthViewBtn) {
            monthViewBtn.classList.toggle('active', mode === 'month');
        }
    }

    // Today button handler
    todayBtn?.addEventListener('click', function () {
        // Calculate one week before today
        const today = new Date();
        const oneWeekBefore = new Date(today);
        oneWeekBefore.setDate(today.getDate() - 7);

        // Set view mode to regular and scroll
        setViewMode('regular');
        scrollToDate(oneWeekBefore);
    });

    // Month button handler
    monthViewBtn?.addEventListener('click', function () {
        const newMode = currentView === 'month' ? 'regular' : 'month';
        setViewMode(newMode);
        if (newMode === 'month') {
            scrollToCurrentMonth();
        }
    });

    // Full view button handler
    if (fullViewBtn) {
        console.log('Adding click handler to full view button');
        fullViewBtn.addEventListener('click', () => {
            console.log('Full view button clicked');
            const newMode = currentView === 'full' ? 'regular' : 'full';
            console.log('Switching to mode:', newMode);
            setViewMode(newMode);
        });
    } else {
        console.error('Full view button not found');
    }

    // Previous button handler
    prevBtn?.addEventListener('click', function () {
        if (currentView === 'full') return;

        // Get the current visible month and scroll to first day of previous month
        const currentDate = getCurrentVisibleMonth();
        const firstDayOfPrevMonth = getFirstDayOfPreviousMonth(currentDate);
        scrollToDate(firstDayOfPrevMonth);
    });

    // Next button handler
    nextBtn?.addEventListener('click', function () {
        if (currentView === 'full') return;

        // Get the current visible month and scroll to first day of next month
        const currentDate = getCurrentVisibleMonth();
        const firstDayOfNextMonth = getFirstDayOfNextMonth(currentDate);
        scrollToDate(firstDayOfNextMonth);
    });

    // Add event listener for the checkbox
    const showSubmittedTasksCheckbox = document.querySelector('input[name="showSubmittedTasks"]');
    if (showSubmittedTasksCheckbox) {
        showSubmittedTasksCheckbox.addEventListener('change', () => {
            console.log('Checkbox changed:', showSubmittedTasksCheckbox.checked);
            hideSubmittedTaskRows();

            // Force refresh of the matrix to ensure all elements are properly hidden/shown
            if (schdMatrix) {
                const display = schdMatrix.style.display;
                schdMatrix.style.display = 'none';
                schdMatrix.offsetHeight; // Force reflow
                schdMatrix.style.display = display;
            }
        });
    }

    // Initialize with regular view and hide submitted tasks based on checkbox
    console.log('Initializing with regular view');
    setViewMode('regular');
    hideSubmittedTaskRows(); // Initial hide/show based on checkbox state

    // Add observer to handle dynamic updates to the matrix
    const matrixObserver = new MutationObserver((mutations) => {
        // Check if the mutation is related to task status or placeholders
        const shouldUpdate = mutations.some(mutation => {
            return (mutation.type === 'attributes' &&
                (mutation.attributeName === 'data-status' || mutation.attributeName === 'style')) ||
                mutation.type === 'childList';
        });

        if (shouldUpdate) {
            console.log('Matrix updated, hiding submitted rows');
            hideSubmittedTaskRows();
        }
    });

    if (schdMatrix) {
        matrixObserver.observe(schdMatrix, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-status', 'style'],
            characterData: true
        });
    }

    // Add CSS to ensure submitted rows and their contents stay hidden
    const style = document.createElement('style');
    style.textContent = `
        .matrix-row[style*="display: none"],
        .matrix-row[style*="display: none"] * {
            display: none !important;
            pointer-events: none !important;
        }
        .matrix-row[style*="display: none"] .matrix-cell:hover {
            background-color: transparent !important;
            cursor: default !important;
        }
        .matrix-row[style*="display: none"] .task-placeholder {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
}); 