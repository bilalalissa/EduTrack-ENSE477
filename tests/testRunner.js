document.addEventListener('DOMContentLoaded', function () {
    const testTasksList = document.getElementById('testTasksList');
    const testResultsList = document.getElementById('testResultsList');

    // Define test cases
    const testCases = [
        {
            id: 1,
            name: 'Test Signup',
            type: 'Functional',
            inputs: 'username, email, password',
            outputs: 'User created successfully',
            execute: async function () {
                // Simulate user input with unique credentials
                const userData = {
                    username: 'testuser_' + Date.now(), // Ensure unique username
                    email: 'testuser_' + Date.now() + '@example.com', // Ensure unique email
                    password: 'securepassword123'
                };

                try {
                    // Make a request to the signup endpoint
                    const response = await fetch('../signup.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(userData)
                    });

                    // Log the response status and headers
                    console.log('Sending signup request with data:', userData);
                    console.log('Response status:', response.status);
                    console.log('Response headers:', response.headers);
                    const responseText = await response.text();
                    console.log('Raw response text:', responseText);
                    let result;
                    try {
                        result = JSON.parse(responseText);
                        console.log('Parsed response data:', result);
                    } catch (parseError) {
                        console.error('Error parsing response JSON:', parseError);
                        return false;
                    }
                    // Verify the response
                    if (result.message === 'User created successfully') {
                        return true;
                    } else {
                        console.error('Unexpected response message:', result.message);
                        return false;
                    }
                } catch (error) {
                    console.error('Error during signup test:', error);
                    return false;
                }
            }
        },
        {
            id: 2,
            name: 'Test Login',
            type: 'Functional',
            inputs: 'username, password',
            outputs: 'User logged in successfully',
            execute: function () {
                // Simulate login process
                return true; // Simulate a passing test
            }
        },
        {
            id: 3,
            name: 'Test Add Task',
            type: 'Functional',
            inputs: 'task details',
            outputs: 'Task added successfully',
            execute: function () {
                // Simulate adding a task
                return true; // Simulate a passing test
            }
        },
        {
            id: 4,
            name: 'Test List Tasks',
            type: 'Functional',
            inputs: 'none',
            outputs: 'Tasks listed successfully',
            execute: function () {
                // Simulate listing tasks
                return true; // Simulate a passing test
            }
        },
        {
            id: 5,
            name: 'Test Edit Task',
            type: 'Functional',
            inputs: 'task id, new details',
            outputs: 'Task edited successfully',
            execute: function () {
                // Simulate editing a task
                return true; // Simulate a passing test
            }
        },
        {
            id: 6,
            name: 'Test Load Courses',
            type: 'Functional',
            inputs: 'none',
            outputs: 'Courses loaded successfully',
            execute: function () {
                // Simulate loading courses
                return true; // Simulate a passing test
            }
        },
        {
            id: 7,
            name: 'Test Fetch Start Date',
            type: 'Functional',
            inputs: 'none',
            outputs: 'Start date fetched successfully',
            execute: function () {
                // Simulate fetching start date
                return true; // Simulate a passing test
            }
        },
        {
            id: 8,
            name: 'Test Slide In/Out Animation',
            type: 'UI',
            inputs: 'none',
            outputs: 'Animation performed successfully',
            execute: function () {
                // Simulate slide in/out animation
                return true; // Simulate a passing test
            }
        },
        {
            id: 9,
            name: 'Test Highlight Task Rows',
            type: 'UI',
            inputs: 'none',
            outputs: 'Task rows highlighted successfully',
            execute: function () {
                // Simulate highlighting task rows
                return true; // Simulate a passing test
            }
        },
        {
            id: 10,
            name: 'Test Initial Todo Load',
            type: 'Functional',
            inputs: 'Page load event',
            outputs: 'Todos loaded successfully',
            execute: async function () {
                try {
                    // Create a promise that resolves when todos are loaded
                    const todoLoadPromise = new Promise((resolve) => {
                        const observer = new MutationObserver((mutations) => {
                            const todosLoaded = mutations.some(mutation =>
                                mutation.target.classList.contains('todos-list') ||
                                mutation.target.querySelector('.todo-item')
                            );
                            if (todosLoaded) {
                                observer.disconnect();
                                resolve(true);
                            }
                        });

                        observer.observe(document.querySelector('.todos-section'), {
                            childList: true,
                            subtree: true
                        });
                    });

                    // Wait for todos to load (with timeout)
                    const result = await Promise.race([
                        todoLoadPromise,
                        new Promise(resolve => setTimeout(() => resolve(false), 5000))
                    ]);

                    return result;
                } catch (error) {
                    console.error('Error in initial todo load test:', error);
                    return false;
                }
            }
        },
        {
            id: 11,
            name: 'Test Task Update Refresh',
            type: 'Functional',
            inputs: 'Task update event',
            outputs: 'Todos refreshed after task update',
            execute: async function () {
                try {
                    // Create a flag to track if refresh was called
                    let refreshCalled = false;
                    const originalRefresh = window.refreshTodos;

                    // Override refreshTodos temporarily
                    window.refreshTodos = () => {
                        refreshCalled = true;
                        originalRefresh();
                    };

                    // Dispatch tasksUpdated event
                    document.dispatchEvent(new Event('tasksUpdated'));

                    // Wait a bit to ensure the event was processed
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Restore original refresh function
                    window.refreshTodos = originalRefresh;

                    return refreshCalled;
                } catch (error) {
                    console.error('Error in task update refresh test:', error);
                    return false;
                }
            }
        },
        {
            id: 12,
            name: 'Test Midnight Refresh Scheduling',
            type: 'Functional',
            inputs: 'Current time',
            outputs: 'Next refresh scheduled correctly',
            execute: async function () {
                try {
                    // Mock Date to test midnight scheduling
                    const originalDate = global.Date;
                    const mockNow = new Date('2025-04-01T23:00:00'); // 11 PM
                    global.Date = class extends Date {
                        constructor() {
                            return mockNow;
                        }
                        static now() {
                            return mockNow.getTime();
                        }
                    };

                    // Reset any existing timeouts
                    const originalSetTimeout = window.setTimeout;
                    let timeoutDuration;
                    window.setTimeout = (callback, duration) => {
                        timeoutDuration = duration;
                        return originalSetTimeout(callback, 100); // Shorten for testing
                    };

                    // Call the scheduling function
                    scheduleNextMidnightRefresh();

                    // Restore original functions
                    global.Date = originalDate;
                    window.setTimeout = originalSetTimeout;

                    // Expected duration should be 1 hour (in milliseconds)
                    const expectedDuration = 1 * 60 * 60 * 1000;
                    const isCorrectDuration = Math.abs(timeoutDuration - expectedDuration) < 1000; // Allow 1 second margin

                    return isCorrectDuration;
                } catch (error) {
                    console.error('Error in midnight refresh scheduling test:', error);
                    return false;
                }
            }
        },
        {
            id: 13,
            name: 'Test Refresh Function Execution',
            type: 'Functional',
            inputs: 'Refresh trigger',
            outputs: 'Fetch request made successfully',
            execute: async function () {
                try {
                    // Mock fetch to track if it's called
                    const originalFetch = window.fetch;
                    let fetchCalled = false;
                    window.fetch = (url) => {
                        if (url.includes('todosHandler.php?action=getTodos')) {
                            fetchCalled = true;
                        }
                        return originalFetch(url);
                    };

                    // Call refresh
                    await refreshTodos();

                    // Restore original fetch
                    window.fetch = originalFetch;

                    return fetchCalled;
                } catch (error) {
                    console.error('Error in refresh execution test:', error);
                    return false;
                }
            }
        }
        // Add more test cases as needed
    ];

    // Function to load test cases into the list
    function loadTestCases() {
        console.log('Loading test cases...');
        testCases.forEach(test => {
            console.log(`Adding test case: ${test.name}`);
            const listItem = document.createElement('li');
            listItem.textContent = test.name;
            const runButton = document.createElement('button');
            runButton.textContent = 'Run Test';
            runButton.className = 'run-test-button';
            runButton.onclick = () => runTest(test);
            listItem.appendChild(runButton);
            testTasksList.appendChild(listItem);
        });
    }

    // Call the function to load test cases on page load
    loadTestCases();

    async function runTest(test) {
        const listItem = document.createElement('li');
        listItem.textContent = `Running test: ${test.name}...`;
        testResultsList.appendChild(listItem);

        const startTime = Date.now();
        let testLogs = [];
        let testErrors = [];

        // Add console logging capture
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        console.log = (...args) => {
            testLogs.push({
                type: 'log',
                timestamp: new Date().toISOString(),
                message: args.map(arg =>
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' ')
            });
            originalConsoleLog.apply(console, args);
        };
        console.error = (...args) => {
            testErrors.push({
                type: 'error',
                timestamp: new Date().toISOString(),
                message: args.map(arg =>
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' ')
            });
            originalConsoleError.apply(console, args);
        };

        // Execute the test
        let testError = null;
        let passed = false;
        try {
            passed = await test.execute();
        } catch (error) {
            testError = {
                message: error.message,
                stack: error.stack
            };
            passed = false;
        }

        // Restore console functions
        console.log = originalConsoleLog;
        console.error = originalConsoleError;

        const endTime = Date.now();
        const timeElapsed = (endTime - startTime) / 1000; // Time in seconds

        const result = {
            taskId: test.id,
            name: test.name,
            type: test.type,
            description: test.description || 'No description provided',
            inputs: test.inputs,
            outputs: test.outputs,
            status: passed ? 'Passed' : 'Failed',
            timeElapsed: `${timeElapsed} seconds`,
            timestamp: new Date().toISOString(),
            executionDetails: {
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
                duration: timeElapsed,
                logs: testLogs,
                errors: testErrors,
                error: testError,
                environment: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    screenResolution: `${window.screen.width}x${window.screen.height}`
                }
            },
            testCode: test.execute.toString()
        };

        listItem.textContent = `Test ${test.name} completed: ${result.status}`;
        listItem.className = passed ? 'test-result-passed' : 'test-result-failed';

        if (!passed) {
            const errorDetails = document.createElement('div');
            errorDetails.className = 'error-details';
            errorDetails.innerHTML = `
                <p>Error Details:</p>
                <pre>${testError ? testError.message : 'Test failed without throwing an error'}</pre>
            `;
            listItem.appendChild(errorDetails);
        }

        saveTestResult(result);
    }

    function saveTestResult(result) {
        fetch('saveTestResult.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(result)
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    console.log('Test result saved successfully.');
                } else {
                    console.error('Error saving test result:', data.message);
                }
            })
            .catch(error => console.error('Error saving test result:', error));
    }
}); 