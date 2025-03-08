from flask import Flask, request, jsonify, render_template_string, send_file
import os
from datetime import datetime
import whisper
import yt_dlp as youtube_dl
import ffmpeg
import ssl
import certifi

# Set the default SSL context to use the certifi certificates
ssl._create_default_https_context = ssl.create_default_context(cafile=certifi.where())

app = Flask(__name__)

# Load the Whisper model
model = whisper.load_model("base")

# Directories to save the uploaded and transcribed files
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "transcriptions"

# Create the directories if they don't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Add a route for the home page with the form, progress bar, and modern style
@app.route('/')
def home():
    return render_template_string('''
        <!DOCTYPE html>
        <html>
        <head>
            <title>Transcription App</title>
            <link rel="stylesheet" href="../css/styles.css">
            <style>
                /* General styles */
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f7f9fc;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .container {
                    background-color: #ffffff;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
                    width: 100%;
                    max-width: 500px;
                    box-sizing: border-box;
                }
                h1 {
                    text-align: center;
                    color: #333;
                }
                form {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                label {
                    font-weight: bold;
                    color: #555;
                }
                input[type="text"],
                input[type="file"],
                button {
                    padding: 10px;
                    border-radius: 5px;
                    border: 1px solid #ccc;
                    outline: none;
                    font-size: 14px;
                }
                button {
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    cursor: pointer;
                    transition: background-color 0.3s;
                }
                button:hover {
                    background-color: #45a049;
                }
                .reset-button {
                    background-color: #f44336;
                }
                .reset-button:hover {
                    background-color: #d32f2f;
                }
                #progress-bar {
                    width: 100%;
                    background-color: #f3f3f3;
                    border: 1px solid #ccc;
                    border-radius: 5px;
                    overflow: hidden;
                    margin-top: 10px;
                }
                #progress {
                    width: 0;
                    height: 20px;
                    background-color: #4CAF50;
                    transition: width 0.5s;
                }
            </style>
            <script>
                function startProgress() {
                    const progressBar = document.getElementById("progress");
                    progressBar.style.width = "0%";
                    document.getElementById("progress-bar").style.display = "block";
                    let progress = 0;

                    // Simulate progress over time
                    const interval = setInterval(() => {
                        if (progress >= 90) { // Stop at 90% and let the server complete
                            clearInterval(interval);
                        } else {
                            progress += 10;
                            progressBar.style.width = progress + "%";
                        }
                    }, 500);
                }

                function resetForm() {
                    document.getElementById("transcription-form").reset();
                    document.getElementById("progress").style.width = "0%";
                    document.getElementById("progress-bar").style.display = "none";
                }
            </script>
        </head>
        <body>
            <div class="container" style="background-color: black;">
                <a href="http://localhost/EduTrack/home.php">
                    <button type="button">Home</button>
                </a>
                <br> 
                <h1>Transcription App</h1>
                <p>Use the form below to upload or provide a link for transcription.</p>
                <form id="transcription-form" method="POST" action="/transcribe" enctype="multipart/form-data" onsubmit="startProgress()">
                    <label for="youtube-link">YouTube Video Link:</label>
                    <input type="text" id="youtube-link" name="youtube_link" placeholder="Enter YouTube link">
                    
                    <label for="file-upload">Or Upload Video/Audio File:</label>
                    <input type="file" id="file-upload" name="file_upload" accept="audio/*,video/*">
                    
                    <label>
                        <input type="checkbox" name="include_summary" value="true" checked> Include Summary
                    </label>
                    
                    <label>
                        <input type="checkbox" name="include_outline" value="true" checked> Include Outline
                    </label>
                    
                    <button type="submit">Transcribe</button>
                    <button type="button" class="reset-button" onclick="resetForm()">Reset</button>
                </form>
                <div id="progress-bar" style="display: none;">
                    <div id="progress"></div>
                </div>
            </div>
        </body>
        </html>
    ''')

@app.route('/transcribe', methods=['POST'])
def transcribe():
    youtube_link = request.form.get('youtube_link')
    file_upload = request.files.get('file_upload')
    include_summary = request.form.get('include_summary') == 'true'
    include_outline = request.form.get('include_outline') == 'true'

    transcription_text = ""
    duration = None

    if youtube_link:
        try:
            with youtube_dl.YoutubeDL({'format': 'bestaudio'}) as ydl:
                result = ydl.extract_info(youtube_link, download=True)
                file_path = ydl.prepare_filename(result)
                duration = result.get('duration', None)
                transcription_text = transcribe_audio(file_path)
                os.remove(file_path)
        except Exception as e:
            return jsonify({"error": str(e)})

    if file_upload:
        file_path = os.path.join(UPLOAD_DIR, file_upload.filename)
        file_upload.save(file_path)
        try:
            probe = ffmpeg.probe(file_path)
            duration = float(probe['format']['duration'])
        except Exception as e:
            duration = None
        transcription_text = transcribe_audio(file_path)
        os.remove(file_path)

    final_transcription = ""
    if include_summary:
        duration_str = f"{int(duration // 3600)}h {int((duration % 3600) // 60)}m {int(duration % 60)}s" if duration else "Unknown"
        summary = f"Source: {youtube_link or file_upload.filename}\n" \
                  f"App: Transcription App\n" \
                  f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n" \
                  f"Duration: {duration_str}\n" \
                  f"Letters Count: {len(transcription_text)}\n" \
                  f"Words Count: {len(transcription_text.split())}\n"
        final_transcription += summary + "\n"

    if include_outline:
        outline = "Outline:\n- Introduction\n- Key Points\n- Conclusion\n"
        final_transcription += outline + "\n"

    final_transcription += transcription_text
    output_file = os.path.join(OUTPUT_DIR, "transcription.txt")
    with open(output_file, "w") as f:
        f.write(final_transcription)

    return send_file(output_file, as_attachment=True)

def transcribe_audio(file_path):
    result = model.transcribe(file_path)
    return result['text']

if __name__ == '__main__':
    app.run(debug=True)