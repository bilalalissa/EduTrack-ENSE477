document.getElementById("transcription-form").addEventListener("submit", function(event) {
    event.preventDefault();

    const youtubeLink = document.getElementById("youtube-link").value;
    const fileUpload = document.getElementById("file-upload").files[0];
    const includeSummary = document.getElementById("include-summary").checked;
    const includeOutline = document.getElementById("include-outline").checked;

    // Create a FormData object to send data to the backend
    const formData = new FormData();
    if (youtubeLink) {
        formData.append("youtube_link", youtubeLink);
    }
    if (fileUpload) {
        formData.append("file_upload", fileUpload);
    }
    formData.append("include_summary", includeSummary);
    formData.append("include_outline", includeOutline);

    // Make an API request to the backend
    fetch("/transcribe", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById("transcription-result").innerText = data.transcription;
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Failed to transcribe. Please try again.");
    });
});