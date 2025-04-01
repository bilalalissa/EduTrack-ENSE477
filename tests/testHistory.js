document.addEventListener('DOMContentLoaded', function () {
    const performedTestTasksList = document.getElementById('performedTestTasksList');
    const testDetails = document.getElementById('testDetails');

    // Fetch test results from JSON file
    fetch('testResults.json')
        .then(response => response.json())
        .then(data => {
            console.log('Fetched test results:', data); // Debugging output
            data.results.forEach(result => {
                const listItem = document.createElement('li');
                listItem.textContent = `Test ID: ${result.taskId}`;
                const detailsButton = document.createElement('button');
                detailsButton.textContent = 'Show Details';
                detailsButton.onclick = () => showTestDetails(result);
                listItem.appendChild(detailsButton);
                performedTestTasksList.appendChild(listItem);
            });
        })
        .catch(error => console.error('Error loading test results:', error));

    function showTestDetails(result) {
        testDetails.innerHTML = `
            <p>Test ID: ${result.taskId}</p>
            <p>Name: ${result.name}</p>
            <p>Type: ${result.type}</p>
            <p>Inputs: ${result.inputs}</p>
            <p>Outputs: ${result.outputs}</p>
            <p>Status: ${result.status}</p>
            <p>Time Elapsed: ${result.timeElapsed}</p>
            <p>Timestamp: ${result.timestamp}</p>
        `;
    }
}); 