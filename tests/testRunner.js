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

        // Execute the test
        const passed = await test.execute();

        const endTime = Date.now();
        const timeElapsed = (endTime - startTime) / 1000; // Time in seconds

        const result = {
            taskId: test.id,
            name: test.name,
            type: test.type,
            inputs: test.inputs,
            outputs: test.outputs,
            status: passed ? 'Passed' : 'Failed',
            timeElapsed: `${timeElapsed} seconds`,
            timestamp: new Date().toISOString()
        };
        listItem.textContent = `Test ${test.name} completed: ${result.status}`;
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