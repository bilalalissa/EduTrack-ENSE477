# EduTrack-ENSE477

ENSE 477 Capstone

In this file:

- Project Info
- Git Manager Info

~~ Git Manager ~~


# Git Manager

## Overview

Git Manager is a secure and interactive CLI tool for managing Git repositories. It allows users to:

- Initialize Git repositories.
- Set up remote repositories.
- Track and manage files.
- Enable auto-commit.
- Detect and commit changes automatically.
- Encrypt repository configurations for security.
- Enable daemon mode to run Git tracking in the background.
- View and edit local Git configurations.
- Remove files from Git tracking.

## Features

- **Secure Configuration Storage:** Uses encryption to protect stored Git settings.
- **Interactive CLI Menu:** Provides a user-friendly interface for managing repositories.
- **Auto-Commit:** Tracks changes and commits them automatically.
- **Repository Setup:** Guides the user through Git remote configuration.
- **File Tracking:** Allows users to choose which files to track or remove from tracking.
- **Daemon Mode:** Runs Git tracking as a background process so it continues after exiting.
- **Git Configuration Management:** Allows users to view and edit Git settings.

## Installation

1. Ensure Git and Python 3 are installed.
2. Install dependencies using:
   ```bash
   pip install cryptography
   ```
3. Clone this repository or download `git_manager.py`.
4. Run the script:
   ```bash
   python git_manager.py
   ```

## Usage

Once the script runs, a menu will appear:

1. **Show Git Configuration:** Displays current Git settings.
2. **Edit Git Configuration:** Modify local Git settings such as user name or email.
3. **Remove Files from Tracking:** Remove specific files from Git tracking.
4. **Edit Application Settings:** Modify repository URL, toggle auto-commit, and enable/disable daemon mode.
5. **Reset Configuration:** Resets all saved configurations.
6. **Exit:** Quit the program.

## Configuration Storage

- The script securely stores user settings in `tracked_files.json`, **encrypting** them using a generated key stored in `encryption.key`.
- The encryption ensures that repository details remain private and cannot be tampered with manually.

## Enabling Auto-Tracking (Daemon Mode)

The Git Manager can run automatically in the background to track changes:

- **Linux/macOS**: Uses `systemd` to run as a background service.
- **Windows**: Uses `Task Scheduler` to run tracking on system startup.

To enable daemon mode:

1. Open the **Git Manager** menu.
2. Select **Edit Application Settings**.
3. Toggle **Daemon Mode** (Enable/Disable).

To stop the daemon mode:

- **Linux/macOS**: Run:
  ```bash
  sudo systemctl stop git-tracker
  sudo systemctl disable git-tracker
  ```
- **Windows**: Run:
  ```bash
  schtasks /delete /tn GitTracker /f
  ```

## Notes

- If the `encryption.key` file is lost, the stored configuration cannot be decrypted.
- The auto-commit feature ensures that any tracked changes are committed and pushed automatically.
- Use the menu to manage configurations securely.

## Contributions

Contributions are welcome! Fork this repo, make improvements, and submit a pull request.

## License

This project is licensed under the MIT License.
