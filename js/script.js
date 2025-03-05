// Redirect user to sighup page
document.addEventListener('DOMContentLoaded', function() {
    var signupButton = document.getElementById('signupButton');
    if (signupButton) {
        signupButton.addEventListener('click', function() {
            window.location.href = 'signup.php';
        });
    }
});

// Redirect user to index page
document.addEventListener('DOMContentLoaded', function() {
    var mainButton = document.getElementById('mainButton');
    if (mainButton) {
        mainButton.addEventListener('click', function() {
            window.location.href = 'index.php';
        });
    }
});

// Handling signout
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('exitButton').addEventListener('click', function() {
        window.location.href = 'signout.php';
    });
});

