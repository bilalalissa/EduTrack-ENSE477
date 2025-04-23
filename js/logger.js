// Logger utility for client-side events
const Logger = {
    // Send log to server
    log: async function (component, action, details = {}) {
        try {
            const logData = {
                timestamp: new Date().toISOString(),
                component,
                action,
                details
            };

            const response = await fetch('home.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'logClientEvent',
                    log_data: JSON.stringify(logData)
                })
            });

            const result = await response.json();
            if (result.status !== 'success') {
                console.error('Failed to log event:', result.message);
            }
        } catch (error) {
            console.error('Error logging event:', error);
        }
    },

    // Log user actions
    logUserAction: function (action, details = {}) {
        return this.log('user', action, details);
    },

    // Log system events
    logSystemEvent: function (event, details = {}) {
        return this.log('system', event, details);
    },

    // Log errors
    logError: function (error, context = {}) {
        return this.log('error', error.message || 'Unknown error', {
            ...context,
            stack: error.stack
        });
    }
}; 