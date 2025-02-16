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

## Features

- **Secure Configuration Storage:** Uses encryption to protect stored Git settings.
- **Interactive CLI Menu:** Provides a user-friendly interface for managing repositories.
- **Auto-Commit:** Tracks changes and commits them automatically.
- **Repository Setup:** Guides the user through Git remote configuration.
- **File Tracking:** Allows users to choose which files to track.

## Installation

1. Ensure Git and Python 3 are installed.
2. Install dependencies using:

   ```bash
   pip install cryptography
   ```
3. Clone this repositor or download `git_manager.py
4. Run the script:

   ~~~bash
   python git_manager.py
   ~~~

## Usage

Once the script runs, a menu will appear:

1. **Set Up Repository**: Enter a Git remote URL to configure the repository.
2. **Edit Configuration**: Modify repo URL or toggle auto-commit.
3. **Exit**: Quit the program.

## Configuration Storage

* The script securely stores user settings in `tracked_files.json`, **encrypting** them using a generated key stored in `encryption.key`.
* The ecryption ensures that repository details remain private and cannot be temeraed with manually.

## Notes

- If the `encryption.key` file is lost, the stored configuration cannot be decrypted.
- The auto-commit feature ensures that any tracked changes are commited and pushed automatically.
- Use the menu to manage configurations securely.

## Contributions

Contributions are welcome! Fork this repo, make improvements, and submit a pull request.

## License

This project is licensed under the MIT License.

## More about (Git Manager)

[ Code Technical Details s](https://)
