// Function to fetch todos from the server
async function fetchTodos() {
    try {
        const response = await fetch('todosHandler.php?action=getTodos');
        const data = await response.json();

        if (data.status === 'success') {
            updateTodoLists(data.todos);
        } else {
            console.error('Error fetching todos:', data.message);
        }
    } catch (error) {
        console.error('Error fetching todos:', error);
    }
}

// Function to update the todo lists in the UI
function updateTodoLists(todos) {
    // Update Today's todos
    const todaySection = document.querySelector('.todo-today');
    updateTodoSection(todaySection, todos.today, 'Today');

    // Update Tomorrow's todos
    const tomorrowSection = document.querySelector('.todo-tomorrow');
    updateTodoSection(tomorrowSection, todos.tomorrow, 'Tomorrow');

    // Update This Week's todos
    const thisWeekSection = document.querySelector('.todo-this-week');
    updateTodoSection(thisWeekSection, todos.this_week, 'This Week');
}

// Function to update a specific todo section
function updateTodoSection(section, tasks, title) {
    // Keep the heading and export button
    const heading = section.querySelector('h3');
    const sectionExportBtn = section.querySelector('button');

    // Clear existing content between heading and button
    section.innerHTML = '';
    section.appendChild(heading);

    if (tasks.length === 0) {
        const noTasks = document.createElement('p');
        noTasks.textContent = 'No tasks scheduled.';
        noTasks.className = 'no-tasks';
        section.appendChild(noTasks);
    } else {
        const tasksList = document.createElement('ul');
        tasksList.className = 'todos-list';

        tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = `todo-item ${task.priority}-priority`;

            // Enhanced reason logic
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const fromDate = new Date(task.from_date);
            const toDate = new Date(task.to_date);
            const suggestedDate = new Date(task.suggested_date);
            const actualStartDate = task.actual_start_date ? new Date(task.actual_start_date) : null;

            let reason = '';
            if (toDate.toDateString() === today.toDateString()) {
                reason = 'Due today';
            } else if (fromDate.toDateString() === today.toDateString()) {
                reason = 'Starts today';
            } else if (suggestedDate.toDateString() === today.toDateString()) {
                reason = 'Suggested today';
            } else if (actualStartDate && actualStartDate.toDateString() === today.toDateString()) {
                reason = 'Should start today';
            } else if (toDate.toDateString() === tomorrow.toDateString()) {
                reason = 'Due tomorrow';
            } else if (fromDate.toDateString() === tomorrow.toDateString()) {
                reason = 'Starts tomorrow';
            } else if (suggestedDate.toDateString() === tomorrow.toDateString()) {
                reason = 'Suggested tomorrow';
            } else {
                // Calculate days until due
                const daysUntilDue = Math.ceil((toDate - today) / (1000 * 60 * 60 * 24));
                if (daysUntilDue > 0 && daysUntilDue <= 7) {
                    reason = `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
                }
            }

            taskItem.innerHTML = `
                <div class="todo-main">
                    <div class="todo-left">
                        <div class="todo-course-type">
                            <span class="todo-type">${task.type}</span>
                            <span class="todo-course" title="${task.courseName}">${task.courseName}</span>
                        </div>
                        <div class="todo-title" title="${task.title}">${task.title}</div>
                    </div>
                    <div class="todo-right">
                        ${reason ? `<span class="todo-reason">${reason}</span>` : ''}
                        <button class="todo-expand-btn" aria-label="Toggle task details">
                            <svg width="12" height="12" viewBox="0 0 16 16">
                                <path fill="currentColor" d="M8 12L2 6h12z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="todo-details" style="display: none;">
                    <div class="todo-dates">
                        <div>From: ${fromDate.toLocaleDateString()}</div>
                        <div>To: ${toDate.toLocaleDateString()}</div>
                    </div>
                    <div class="todo-actual-dates">
                        <div>Started: ${task.actual_start_date ? new Date(task.actual_start_date).toLocaleDateString() : 'Not started'}</div>
                        <div>Ended: ${task.actual_end_date ? new Date(task.actual_end_date).toLocaleDateString() : 'Not ended'}</div>
                    </div>
                    <div class="todo-status" data-status="${task.status}">
                        Status: ${task.status}
                    </div>
                    <div class="todo-suggested">
                        Suggested: ${suggestedDate.toLocaleDateString()}
                    </div>
                </div>
            `;

            // Add click handler for expand button
            const expandBtn = taskItem.querySelector('.todo-expand-btn');
            const details = taskItem.querySelector('.todo-details');
            expandBtn.addEventListener('click', () => {
                const isExpanded = details.style.display !== 'none';
                details.style.display = isExpanded ? 'none' : 'block';
                expandBtn.classList.toggle('expanded', !isExpanded);
            });

            tasksList.appendChild(taskItem);
        });

        section.appendChild(tasksList);
    }

    // Add export button back
    if (sectionExportBtn) {
        section.appendChild(sectionExportBtn);
    }
}

// Function to generate iCalendar file content
function generateICSContent(tasks) {
    // Format date to proper iCal format: YYYYMMDDTHHMMSSZ
    const formatDate = (date) => {
        const d = new Date(date);
        // Ensure UTC time
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    // Fold long lines according to RFC 5545
    const foldLine = (line) => {
        if (line.length <= 75) return line;
        const parts = line.match(/.{1,74}/g) || [];
        return parts.join('\r\n ');
    };

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//EduTrack//NONSGML Todo Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    tasks.forEach(task => {
        const fromDate = new Date(task.from_date);
        const toDate = new Date(task.to_date);
        const suggestedDate = new Date(task.suggested_date);

        // Create unique identifier for the event
        const uid = `${task.id}-${Date.now()}@edutrack`;

        // Create description with proper line folding and escaping
        const description = [
            'Course: ' + task.courseName,
            'Status: ' + task.status,
            'Priority: ' + task.priority,
            'Suggested Date: ' + suggestedDate.toLocaleDateString(),
            task.details ? 'Details: ' + task.details : ''
        ].filter(Boolean).join('\\n');

        // Add event
        lines.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${formatDate(new Date())}`,
            `DTSTART:${formatDate(fromDate)}`,
            `DTEND:${formatDate(toDate)}`,
            `SUMMARY:${task.type}: ${task.title}`,
            foldLine(`DESCRIPTION:${description.replace(/[\\,;]/g, "\\$&")}`),
            'CLASS:PUBLIC',
            'SEQUENCE:0',
            'STATUS:CONFIRMED',
            `CATEGORIES:${task.type}`,
            // Add reminder for 1 day before
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            'DESCRIPTION:Task due tomorrow',
            'TRIGGER:-P1D',
            'END:VALARM',
            // Add reminder for 1 hour before
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            'DESCRIPTION:Task due in 1 hour',
            'TRIGGER:-PT1H',
            'END:VALARM',
            'END:VEVENT'
        );
    });

    lines.push('END:VCALENDAR');

    // Ensure proper line endings (CRLF) and join
    return lines.map(line => foldLine(line)).join('\r\n');
}

// Function to download ICS file
function downloadICS(content, filename) {
    // Add BOM for UTF-8
    const blob = new Blob(['\ufeff', content], {
        type: 'text/calendar;charset=utf-8;method=PUBLISH'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.setAttribute('type', 'text/calendar');
    link.setAttribute('rel', 'noopener,noreferrer');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// Function to add events directly to calendar
function addToCalendar(tasks, title) {
    // Create base event details for Google Calendar
    const events = tasks.map(task => {
        const fromDate = new Date(task.from_date);
        const toDate = new Date(task.to_date);
        const suggestedDate = new Date(task.suggested_date);

        // Format dates for URL parameters (YYYYMMDDTHHMMSSZ)
        const formatDateForUrl = (date) => {
            return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        };

        // Create event description
        const description = `Course: ${task.courseName}\\n` +
            `Status: ${task.status}\\n` +
            `Priority: ${task.priority}\\n` +
            `Suggested Date: ${suggestedDate.toLocaleDateString()}\\n` +
            (task.details ? `Details: ${task.details}\\n` : '');

        // Return event parameters
        return {
            action: 'TEMPLATE',
            text: `${task.type}: ${task.title}`,
            details: description,
            dates: `${formatDateForUrl(fromDate)}/${formatDateForUrl(toDate)}`,
            location: 'EduTrack Task'
        };
    });

    // Show calendar selection modal
    const modal = document.createElement('div');
    modal.className = 'calendar-modal';
    modal.innerHTML = `
        <div class="calendar-modal-content">
            <h3>Add to Calendar</h3>
            <div class="calendar-options">
                <button class="calendar-option google">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar">
                    <span>Google Calendar</span>
                </button>
                <button class="calendar-option ics">
                    <span class="icon">📅</span>
                    <span>Download .ics</span>
                </button>
            </div>
            <button class="calendar-close">Cancel</button>
        </div>
    `;

    // Add modal styles
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        .calendar-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .calendar-modal-content {
            background: #2a2a2a;
            border-radius: 8px;
            padding: 20px;
            min-width: 300px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .calendar-modal h3 {
            color: #fff;
            margin: 0 0 15px 0;
            text-align: center;
        }

        .calendar-options {
            display: grid;
            gap: 10px;
            margin-bottom: 15px;
        }

        .calendar-option {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background: #333;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            color: #fff;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .calendar-option:hover {
            background: #444;
            border-color: rgba(255, 255, 255, 0.2);
        }

        .calendar-option img {
            width: 24px;
            height: 24px;
        }

        .calendar-option .icon {
            font-size: 24px;
        }

        .calendar-close {
            width: 100%;
            padding: 8px;
            background: #444;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            color: #fff;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .calendar-close:hover {
            background: #555;
            border-color: rgba(255, 255, 255, 0.2);
        }
    `;
    document.head.appendChild(modalStyle);

    // Add modal to document
    document.body.appendChild(modal);

    // Handle Google Calendar option
    modal.querySelector('.calendar-option.google').addEventListener('click', () => {
        // For multiple events, open them in sequence
        events.forEach((event, index) => {
            // Add slight delay between openings to prevent blocking
            setTimeout(() => {
                const googleUrl = `https://calendar.google.com/calendar/render?${new URLSearchParams({
                    action: event.action,
                    text: event.text,
                    details: event.details,
                    dates: event.dates,
                    location: event.location
                }).toString()}`;
                window.open(googleUrl, '_blank');
            }, index * 500);
        });
        modal.remove();
    });

    // Handle ICS download option
    modal.querySelector('.calendar-option.ics').addEventListener('click', () => {
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `edutrack_${title.toLowerCase()}_todos_${timestamp}.ics`;
        const icsContent = generateICSContent(tasks);
        downloadICS(icsContent, filename);
        modal.remove();
    });

    // Handle close button
    modal.querySelector('.calendar-close').addEventListener('click', () => {
        modal.remove();
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Update CSS styles
const style = document.createElement('style');
style.textContent = `
    .todos-list {
        list-style: none;
        padding: 0;
        margin: 4px 0;
    }

    .todo-item {
        background: linear-gradient(to right, #2a2a2a, #333);
        border-radius: 4px;
        margin: 4px 0;
        padding: 4px 6px;
        border-left: 2px solid #ccc;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        position: relative;
        overflow: hidden;
        font-size: 0.8em;
    }

    .todo-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(to bottom, rgba(255,255,255,0.05), transparent);
        pointer-events: none;
    }

    .todo-item.h-priority {
        border-left-color: #ff4444;
        background: linear-gradient(to right, #2a2a2a, #332222);
    }

    .todo-item.m-priority {
        border-left-color: #ffbb33;
        background: linear-gradient(to right, #2a2a2a, #333322);
    }

    .todo-item.n-priority {
        border-left-color: #00C851;
        background: linear-gradient(to right, #2a2a2a, #223322);
    }

    .todo-main {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 4px;
        align-items: center;
        min-width: 0;
    }

    .todo-left {
        display: grid;
        gap: 2px;
        min-width: 0;
    }

    .todo-course-type {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 4px;
        align-items: left;
        min-width: 130px;
    }

    .todo-type {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        padding: 1px 3px;
        border-radius: 2px;
        font-size: 0.7em;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
        white-space: nowrap;
    }

    .todo-course {
        color: #aaa;
        font-size: 0.75em;
        padding: 1px 3px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.05);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
    }

    .todo-title {
        color: #fff;
        font-size: 0.8em;
        font-weight: 400;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 0 3px;
    }

    .todo-right {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-left: auto;
    }

    .todo-reason {
        color: #00C851;
        font-size: 0.7em;
        padding: 1px 3px;
        background: rgba(0, 200, 81, 0.1);
        border-radius: 2px;
        white-space: nowrap;
    }

    .todo-expand-btn {
        background: rgba(255, 255, 255, 0.05);
        border: none;
        color: #888;
        cursor: pointer;
        padding: 2px;
        width: 14px;
        height: 14px;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }

    .todo-expand-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }

    .todo-expand-btn.expanded {
        transform: rotate(180deg);
        background: rgba(255, 255, 255, 0.1);
    }

    .todo-details {
        margin-top: 4px;
        padding-top: 4px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 0.75em;
        color: #aaa;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 4px;
    }

    .todo-details > div {
        background: rgba(255, 255, 255, 0.03);
        padding: 4px 6px;
        border-radius: 2px;
    }

    .todo-details .todo-dates,
    .todo-details .todo-actual-dates {
        display: grid;
        gap: 2px;
    }

    .todo-details .todo-actual-dates div {
        color: #888;
    }

    .todo-status[data-status="on_hold"] {
        color: #ffbb33;
    }

    .todo-status[data-status="in_process"] {
        color: #00C851;
    }

    .todo-status[data-status="submitted"] {
        color: #33b5e5;
    }

    /* Section styles */
    .todo-today, .todo-tomorrow, .todo-this-week {
        background: linear-gradient(to bottom, #262626, #222);
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .todo-today h3, .todo-tomorrow h3, .todo-this-week h3 {
        color: #fff;
        margin: 0 0 12px 0;
        font-size: 1em;
        font-weight: 500;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .todo-today h3::before {
        content: '•';
        color: #00C851;
    }

    .todo-tomorrow h3::before {
        content: '•';
        color: #ffbb33;
    }

    .todo-this-week h3::before {
        content: '•';
        color: #33b5e5;
    }

    /* Export button styles */
    button[id$="TodoBtn"] {
        background: linear-gradient(to bottom, #444, #383838);
        color: #fff;
        border: none;
        padding: 6px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 8px;
        width: 100%;
        font-size: 0.8em;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    button[id$="TodoBtn"]:hover {
        background: linear-gradient(to bottom, #4a4a4a, #404040);
        border-color: rgba(255, 255, 255, 0.2);
    }

    button[id$="TodoBtn"] {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }

    button[id$="TodoBtn"]::before {
        content: '📅';
        font-size: 1.1em;
    }

    button[id$="TodoBtn"]:active {
        transform: translateY(1px);
    }
`;
document.head.appendChild(style);

// Function to refresh todos
function refreshTodos() {
    fetchTodos();
}

// Function to schedule the next refresh at midnight, every 24 hours
function scheduleNextMidnightRefresh() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const timeUntilMidnight = tomorrow - now;
    setTimeout(() => {
        refreshTodos();
        scheduleNextMidnightRefresh(); // Schedule next day's refresh
    }, timeUntilMidnight);
}

// Initial load of todos
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos();
    scheduleNextMidnightRefresh(); // Schedule first midnight refresh
});

// Refresh todos when tasks are modified
document.addEventListener('tasksUpdated', () => {
    refreshTodos();
}); 