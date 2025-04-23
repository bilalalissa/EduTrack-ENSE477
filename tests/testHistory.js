document.addEventListener('DOMContentLoaded', function () {
    const performedTestTasksList = document.getElementById('performedTestTasksList');
    const testDetails = document.getElementById('testDetails');

    // Fetch test results from JSON file
    fetch('testResults.json')
        .then(response => response.json())
        .then(data => {
            console.log('Fetched test results:', data);
            data.results.forEach(result => {
                const listItem = document.createElement('li');
                listItem.className = `test-history-item ${result.status.toLowerCase()}`;
                listItem.innerHTML = `
                    <div class="test-summary">
                        <span class="test-id">Test #${result.taskId}</span>
                        <span class="test-name">${result.name}</span>
                        <span class="test-status ${result.status.toLowerCase()}">${result.status}</span>
                    </div>
                `;
                const detailsButton = document.createElement('button');
                detailsButton.textContent = 'Show Details';
                detailsButton.className = 'details-button';
                detailsButton.onclick = () => showTestDetails(result);
                listItem.appendChild(detailsButton);
                performedTestTasksList.appendChild(listItem);
            });
        })
        .catch(error => console.error('Error loading test results:', error));

    function showTestDetails(result) {
        const executionDate = new Date(result.timestamp).toLocaleString();
        const logsHtml = result.executionDetails?.logs.map(log =>
            `<div class="log-entry">
                <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
                <span class="log-message">${log.message}</span>
            </div>`
        ).join('') || 'No logs available';

        const errorsHtml = result.executionDetails?.errors.map(error =>
            `<div class="error-entry">
                <span class="error-time">${new Date(error.timestamp).toLocaleTimeString()}</span>
                <span class="error-message">${error.message}</span>
            </div>`
        ).join('') || 'No errors';

        testDetails.innerHTML = `
            <div class="test-details-container">
                <div class="test-header">
                    <h2>${result.name}</h2>
                    <span class="test-status ${result.status.toLowerCase()}">${result.status}</span>
                </div>

                <div class="test-section">
                    <h3>Basic Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Test ID:</label>
                            <span>${result.taskId}</span>
                        </div>
                        <div class="info-item">
                            <label>Type:</label>
                            <span>${result.type}</span>
                        </div>
                        <div class="info-item">
                            <label>Execution Date:</label>
                            <span>${executionDate}</span>
                        </div>
                        <div class="info-item">
                            <label>Duration:</label>
                            <span>${result.timeElapsed}</span>
                        </div>
                    </div>
                </div>

                <div class="test-section">
                    <h3>Test Details</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <label>Description:</label>
                            <p>${result.description}</p>
                        </div>
                        <div class="detail-item">
                            <label>Inputs:</label>
                            <p>${result.inputs}</p>
                        </div>
                        <div class="detail-item">
                            <label>Expected Outputs:</label>
                            <p>${result.outputs}</p>
                        </div>
                    </div>
                </div>

                ${result.executionDetails ? `
                    <div class="test-section">
                        <h3>Execution Environment</h3>
                        <div class="env-grid">
                            <div class="env-item">
                                <label>Platform:</label>
                                <span>${result.executionDetails.environment.platform}</span>
                            </div>
                            <div class="env-item">
                                <label>Browser:</label>
                                <span>${result.executionDetails.environment.userAgent}</span>
                            </div>
                            <div class="env-item">
                                <label>Screen Resolution:</label>
                                <span>${result.executionDetails.environment.screenResolution}</span>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <div class="test-section">
                    <h3>Execution Logs</h3>
                    <div class="logs-container">
                        ${logsHtml}
                    </div>
                </div>

                ${result.executionDetails?.errors.length ? `
                    <div class="test-section">
                        <h3>Errors</h3>
                        <div class="errors-container">
                            ${errorsHtml}
                        </div>
                    </div>
                ` : ''}

                <div class="test-section">
                    <h3>Test Implementation</h3>
                    <pre class="test-code">${result.testCode}</pre>
                </div>
            </div>
        `;
    }
}); 