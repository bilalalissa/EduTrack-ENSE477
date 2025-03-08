# file name: git_manager.py
# description: This file is used to manage the git repository.
# author: Bilal Alissa
# date: 2025-03-02
# version: 1.0.17
# usage: python git_manager.py
# include: backup_manager.py

import os
import json
import subprocess
import time
import base64
import sys
from cryptography.fernet import Fernet
import platform
import requests
import logging
from datetime import datetime
from backup_manager import BackupManager
import glob
import fnmatch
import threading

CONFIG_FILE = "tracked_files.json"
ENCRYPTION_KEY_FILE = "encryption.key"
SERVICE_FILE = "/etc/systemd/system/git-tracker.service" if platform.system() == "Linux" else "git-tracker.bat"
GITHUB_API_URL = "https://api.github.com/user/repos"

BACKUP_MANAGER = BackupManager(CONFIG_FILE, ENCRYPTION_KEY_FILE)

class DaemonManager:
    """Manages daemon threads for auto-commit and other background tasks."""
    def __init__(self):
        self.auto_commit_thread = None
        self.is_running = False
        self.daemon_lock = threading.Lock()

    def start_auto_commit(self, interval_minutes=30):
        """Starts the auto-commit daemon thread if not already running."""
        with self.daemon_lock:
            if not self.is_running:
                self.is_running = True
                self.auto_commit_thread = threading.Thread(
                    target=self._auto_commit_loop,
                    args=(interval_minutes,),
                    daemon=True
                )
                self.auto_commit_thread.start()
                log_operation("Daemon", "INFO", f"Auto-commit daemon started with {interval_minutes} minute interval")
                return True
            return False

    def stop_auto_commit(self):
        """Stops the auto-commit daemon thread."""
        with self.daemon_lock:
            self.is_running = False
            if self.auto_commit_thread and self.auto_commit_thread.is_alive():
                # Thread will exit on next loop iteration
                log_operation("Daemon", "INFO", "Auto-commit daemon stopping")
                return True
            return False

    def _auto_commit_loop(self, interval_minutes):
        """Internal method for auto-commit loop."""
        while self.is_running:
            try:
                if verify_git_email():
                    # Check if there are changes to commit
                    status = subprocess.run("git status --porcelain", shell=True, capture_output=True, text=True)
                    if status.stdout.strip():
                        commit_tracked_files()
                        log_operation("Auto-commit", "SUCCESS", "Auto-committed changes")
                    else:
                        log_operation("Auto-commit", "INFO", "No changes to commit")
                else:
                    log_operation("Auto-commit", "ERROR", "Email not configured")
            except Exception as e:
                log_operation("Auto-commit", "ERROR", f"Error in auto-commit: {str(e)}")
            
            # Sleep for the interval, but check is_running periodically
            for _ in range(interval_minutes * 60 // 10):  # Check every 10 seconds
                if not self.is_running:
                    return
                time.sleep(10)

# Global daemon manager instance
DAEMON_MANAGER = DaemonManager()

def generate_key():
    """Ensures an encryption key exists and generates one if missing."""
    if not os.path.exists(ENCRYPTION_KEY_FILE):
        key = Fernet.generate_key()
        with open(ENCRYPTION_KEY_FILE, "wb") as key_file:
            key_file.write(key)
    else:
        print("\n> An encryption key already exists. No changes made.\n")

def load_key():
    """Loads the encryption key from file."""
    if not os.path.exists(ENCRYPTION_KEY_FILE):
        generate_key()
    with open(ENCRYPTION_KEY_FILE, "rb") as key_file:
        return key_file.read()

def encrypt_data(data):
    """Encrypts data using the encryption key."""
    key = load_key()
    cipher = Fernet(key)
    return cipher.encrypt(json.dumps(data).encode()).decode()

def decrypt_data(encrypted_data):
    """Decrypts encrypted data using the encryption key."""
    key = load_key()
    cipher = Fernet(key)
    return json.loads(cipher.decrypt(encrypted_data.encode()).decode())

def load_config():
    """Loads and decrypts the configuration from the JSON file."""
    if not os.path.exists(CONFIG_FILE):
        return {"repo_url": "", "tracked_files": [], "auto_commit": False, "daemon_mode": False}

    try:
        with open(CONFIG_FILE, "r") as file:
            encrypted_data = file.read()
            return decrypt_data(encrypted_data)  # Attempt decryption

    except (json.JSONDecodeError, ValueError):
        print("\n!! Error reading configuration file. Resetting to default.\n")
        return {"repo_url": "", "tracked_files": [], "auto_commit": False, "daemon_mode": False}

    except Exception as e:
        print(f"\n!! Error loading encrypted configuration: {str(e)}\n")
        return {"repo_url": "", "tracked_files": [], "auto_commit": False, "daemon_mode": False}

def save_config(config):
    """Ensures configuration file exists before saving."""
    try:
        # Ensure the file exists before writing to it
        if not os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, "w") as file:
                json.dump({}, file)

        # Encrypt and save configuration
        with open(CONFIG_FILE, "w") as file:
            file.write(encrypt_data(config))

    except Exception as e:
        print(f"\n!! Error saving configuration: {e}")
        return False

    return True

def reset_config():
    """Resets Git Manager configuration to defaults and regenerates encryption key."""
    if os.path.exists(CONFIG_FILE):
        os.remove(CONFIG_FILE)
    if os.path.exists(ENCRYPTION_KEY_FILE):
        os.remove(ENCRYPTION_KEY_FILE)
        generate_key()  # Ensure encryption key is regenerated

    print("\n< Git Manager configuration has been reset. >\n")

def check_gitignore(file_name):
    """Checks if a file is in .gitignore."""
    if os.path.exists(".gitignore"):
        with open(".gitignore", "r") as f:
            ignored = f.read().splitlines()
            # Check direct matches and patterns
            for pattern in ignored:
                if pattern and not pattern.startswith("#"):
                    if file_name == pattern or fnmatch.fnmatch(file_name, pattern):
                        return True
    return False

def verify_authentication():
    """Verifies user authentication and permissions for the repository."""
    config = load_config()
    repo_url = config.get("repo_url", "")
    if repo_url:
        try:
            subprocess.run(f"git ls-remote {repo_url}", shell=True, check=True, capture_output=True)
            print("Authentication verified.")
        except subprocess.CalledProcessError as e:
            print(f"Authentication failed: {e.stderr.decode()}")
            log_operation("Authentication", "ERROR", f"Authentication failed: {e.stderr.decode()}")

def track_files():
    """Enhanced file tracking with pattern support and status feedback."""
    config = load_config()
    files_added = []
    
    while True:
        print("\nCurrent tracking mode:", "All files" if config["tracked_files"] == "all" else "Selected files")
        if isinstance(config["tracked_files"], list):
            print("Currently tracked files:", ", ".join(config["tracked_files"]) or "None")
        
        print("\nTracking options:")
        print("1. Track specific file")
        print("2. Track by pattern (e.g., *.py)")
        print("3. Track all files")
        print("4. Return to main menu")
        
        choice = input("\nSelect option: ")
        
        if choice == "1":
            file_name = input("Enter file name (or 'b' to go back): ").strip()
            if file_name.lower() == 'b':
                continue
                
            if os.path.exists(file_name):
                if check_gitignore(file_name):
                    print(f"\nWarning: {file_name} is in .gitignore")
                    confirm = input("Do you still want to track this file? (y/n): ")
                    if confirm.lower() != 'y':
                        continue
                        
                if isinstance(config["tracked_files"], list):
                    if file_name not in config["tracked_files"]:
                        try:
                            # Stage the file
                            run_command_silently(f"git add {file_name}")
                            
                            # Update tracking list and save immediately
                            config["tracked_files"].append(file_name)
                            files_added.append(file_name)
                            if save_config(config):
                                print(f"\nAdded {file_name} to tracking")
                                log_operation("Tracking", "SUCCESS", f"Added {file_name}")
                            else:
                                print("\nFailed to save configuration")
                                log_operation("Tracking", "ERROR", "Failed to save configuration")
                                print("Ensure the configuration file is accessible and writable.")
                        except subprocess.CalledProcessError as e:
                            error_msg = e.stderr.decode() if e.stderr else str(e)
                            print(f"\nError adding {file_name}: {error_msg}")
                            log_operation("Tracking", "ERROR", f"Failed to add {file_name}: {error_msg}")
                    else:
                        print(f"\n{file_name} is already being tracked")
                else:
                    print("\nAll files are currently being tracked")
            else:
                print("\nFile not found")
                
        elif choice == "2":
            pattern = input("Enter file pattern (e.g., *.py) or 'b' to go back: ").strip()
            if pattern.lower() == 'b':
                continue
                
            matched_files = glob.glob(pattern)
            if matched_files:
                print(f"\nFound {len(matched_files)} matching files:")
                for file in matched_files[:5]:
                    print(f"- {file}")
                if len(matched_files) > 5:
                    print(f"... and {len(matched_files)-5} more")
                    
                confirm = input("\nAdd these files to tracking? (y/n): ")
                if confirm.lower() == 'y':
                    for file in matched_files:
                        if file not in config["tracked_files"]:
                            try:
                                run_command_silently(f"git add {file}")
                                config["tracked_files"].append(file)
                                files_added.append(file)
                            except subprocess.CalledProcessError as e:
                                error_msg = e.stderr.decode() if e.stderr else str(e)
                                print(f"\nError adding {file}: {error_msg}")
                                log_operation("Tracking", "ERROR", f"Failed to add {file}: {error_msg}")
                    if save_config(config):
                        print(f"\nAdded {len(files_added)} files to tracking")
                        log_operation("Tracking", "SUCCESS", f"Added {len(files_added)} files")
                    else:
                        print("\nFailed to save configuration")
                        log_operation("Tracking", "ERROR", "Failed to save configuration")
                        print("Ensure the configuration file is accessible and writable.")
            else:
                print("\nNo files match the pattern")
                
        elif choice == "3":
            confirm = input("\nTrack all files in repository? (y/n): ")
            if confirm.lower() == 'y':
                try:
                    run_command_silently("git add .")
                    config["tracked_files"] = "all"
                    if save_config(config):
                        print("\nNow tracking all files")
                        log_operation("Tracking", "SUCCESS", "Switched to tracking all files")
                    else:
                        print("\nFailed to save configuration")
                        log_operation("Tracking", "ERROR", "Failed to save configuration")
                        print("Ensure the configuration file is accessible and writable.")
                except subprocess.CalledProcessError as e:
                    error_msg = e.stderr.decode() if e.stderr else str(e)
                    print(f"\nError adding files: {error_msg}")
                    log_operation("Tracking", "ERROR", f"Failed to add files: {error_msg}")
                    
        elif choice == "4":
            break
            
        else:
            print("\nInvalid choice")
            
    # Commit and push changes if files were added
    if files_added:
        try:
            files_list = ", ".join(files_added)
            add_comment = input("Do you want to add a comment to this commit? (y/n): ").strip().lower()
            user_comment = ""
            if add_comment == 'y':
                user_comment = input("Enter your comment: ")
            commit_message = f"Added to tracking: {files_list} - {user_comment}"
            run_command_silently(f'git commit -m "{commit_message}"')
            
            # Try to pull first to avoid conflicts
            try:
                run_command_silently("git pull origin main --allow-unrelated-histories")
            except subprocess.CalledProcessError as e:
                error_msg = e.stderr.decode() if e.stderr else str(e)
                print(f"\nWarning: Could not pull from remote: {error_msg}")
                print("Proceeding with push anyway...")
            
            try:
                run_command_silently("git push origin main")
                print("\nChanges committed and pushed to remote successfully")
            except subprocess.CalledProcessError as e:
                error_msg = e.stderr.decode() if e.stderr else str(e)
                print(f"\nError pushing to remote: {error_msg}")
                print("\nYour changes are committed locally but couldn't be pushed.")
                print("You may need to pull remote changes first using option 12 (Sync with Remote)")
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            print(f"\nError during commit: {error_msg}")
            log_operation("Tracking", "ERROR", f"Failed to commit: {error_msg}")

def edit_config():
    """Allows user to modify the encrypted JSON configuration."""
    config = load_config()
    print("\nEdit Configuration:")
    print(f"1. Auto-Commit: {'Enabled' if config['auto_commit'] else 'Disabled'}")
    print(f"2. Daemon Mode: {'Enabled' if config['daemon_mode'] else 'Disabled'}")
    print(f"3. Commit Interval: {config.get('commit_interval', 30)} minutes")
    choice = input("\nEnter the number of the setting to edit (or 'q' to quit): ")
    
    try:
        if choice == "1":
            # Toggle auto-commit
            new_auto_commit = not config["auto_commit"]
            config["auto_commit"] = new_auto_commit
            
            if new_auto_commit:  # If enabling auto-commit
                interval = input("\nEnter commit interval in minutes (default: 30): ") or "30"
                try:
                    config["commit_interval"] = int(interval)
                except ValueError:
                    print("\nInvalid interval. Using default 30 minutes")
                    config["commit_interval"] = 30
                
                # Save configuration first
                if save_config(config):
                    print(f"\nAuto-Commit enabled with {config['commit_interval']} minute intervals")
                    
                    # Start auto-commit daemon
                    if DAEMON_MANAGER.start_auto_commit(config['commit_interval']):
                        print("Auto-commit daemon started successfully")
                        log_operation("Configuration", "SUCCESS", "Auto-commit enabled and daemon started")
                    else:
                        print("Auto-commit daemon already running")
                else:
                    config["auto_commit"] = False
                    print("\nFailed to save configuration. Auto-commit not enabled.")
                    log_operation("Configuration", "ERROR", "Failed to save auto-commit settings")
            else:  # If disabling auto-commit
                if DAEMON_MANAGER.stop_auto_commit():
                    print("\nAuto-commit daemon stopped")
                if save_config(config):
                    print("\nAuto-Commit disabled")
                    log_operation("Configuration", "SUCCESS", "Auto-commit disabled")
                else:
                    config["auto_commit"] = True
                    print("\nFailed to save configuration")
                    log_operation("Configuration", "ERROR", "Failed to save auto-commit settings")
            
        elif choice == "2":
            try:
                old_value = config.get("daemon_mode", False)
                config["daemon_mode"] = not old_value
                
                if save_config(config):
                    new_state = "Enabled" if config["daemon_mode"] else "Disabled"
                    print(f"\nDaemon Mode {new_state}")
                    
                    # Start or stop auto-commit based on daemon mode
                    if config["daemon_mode"] and config.get("auto_commit", False):
                        if DAEMON_MANAGER.start_auto_commit(config.get("commit_interval", 30)):
                            print("Auto-commit daemon started with daemon mode")
                    elif not config["daemon_mode"]:
                        if DAEMON_MANAGER.stop_auto_commit():
                            print("Auto-commit daemon stopped with daemon mode")
                            
                    log_operation("Configuration", "SUCCESS", f"Daemon mode {new_state.lower()}")
                else:
                    config["daemon_mode"] = old_value
                    print("\nFailed to save daemon mode configuration")
                    log_operation("Configuration", "ERROR", "Failed to save daemon mode settings")
            except Exception as e:
                print(f"\nError updating daemon mode: {str(e)}")
                log_operation("Configuration", "ERROR", f"Daemon mode error: {str(e)}")
            
        elif choice == "3" and config["auto_commit"]:
            old_interval = config.get("commit_interval", 30)
            try:
                interval = input("\nEnter new commit interval in minutes: ")
                new_interval = int(interval)
                if new_interval > 0:
                    config["commit_interval"] = new_interval
                    if save_config(config):
                        # Restart auto-commit daemon with new interval
                        DAEMON_MANAGER.stop_auto_commit()
                        if DAEMON_MANAGER.start_auto_commit(new_interval):
                            print(f"\nCommit interval updated to {new_interval} minutes")
                            log_operation("Configuration", "SUCCESS", f"Commit interval set to {new_interval} minutes")
                        else:
                            print("\nFailed to restart auto-commit daemon")
                    else:
                        config["commit_interval"] = old_interval
                        print("\nFailed to save configuration")
                        log_operation("Configuration", "ERROR", "Failed to save commit interval")
                else:
                    print("\nInterval must be greater than 0")
                    log_operation("Configuration", "ERROR", "Invalid commit interval value")
            except ValueError:
                print("\nInvalid interval. Keeping current setting.")
                log_operation("Configuration", "ERROR", "Invalid commit interval format")

        elif choice == "q":
            return
            
        else:
            print("\nInvalid choice.")
            return
            
    except Exception as e:
        print(f"\nError updating configuration: {str(e)}")
        log_operation("Configuration", "ERROR", f"Configuration update error: {str(e)}")

def show_git_config():
    """Displays local Git configuration."""
    config_data = subprocess.run("git config --list", shell=True, capture_output=True, text=True).stdout.strip()
    print("\nCurrent Git Configuration:")
    print(config_data)
    print("\n")

def edit_git_config():
    """Allows user to edit Git configuration settings with a cancel option."""
    while True:
        key = input("\nEnter the Git config key you want to modify \n(e.g., user.name, user.email) \nor type 'cancel' to exit: ")
        if key.lower() == "cancel":
            print("\nEdit Git Configuration canceled.\n")
            return
        value = input(f"\nEnter the new value for {key}: ")
        run_command_silently(f"\ngit config --global {key} \"{value}\"")
        print(f"\nUpdated {key} to {value}\n")

def remove_from_tracking():
    """Allows user to remove files from Git tracking."""
    config = load_config()
    removed_files = []  # Track which files were removed
    
    while True:
        file_name = input("\nEnter file to remove from tracking (or type 'done' to finish): ")
        if file_name.lower() == "done":
            break
            
        if file_name in config["tracked_files"]:
            try:
                # Remove from Git tracking but keep the file locally
                run_command_silently(f"git rm --cached {file_name}")
                
                # Remove from our tracking list
                config["tracked_files"].remove(file_name)
                removed_files.append(file_name)
                
                print(f" - Removed {file_name} from tracking.")
                log_operation("Tracking", "SUCCESS", f"Removed {file_name} from tracking")
                
            except subprocess.CalledProcessError as e:
                print(f" - Error removing {file_name}: {e.stderr.decode()}")
                log_operation("Tracking", "ERROR", f"Failed to remove {file_name}: {e.stderr.decode()}")
                print(f"Standard error: {e.stderr.decode()}")  # Log standard error for more details
        else:
            print(f" - {file_name} is not in tracking list.")
    
    if removed_files:
        try:
            # Save configuration first
            if save_config(config):
                # Add .gitignore if it exists to ensure it's updated
                if os.path.exists(".gitignore"):
                    run_command_silently("git add .gitignore")
                
                # Commit the changes with list of removed files
                files_list = ", ".join(removed_files)
                add_comment = input("Do you want to add a comment to this commit? (y/n): ").strip().lower()
                user_comment = ""
                if add_comment == 'y':
                    user_comment = input("Enter your comment: ")
                commit_message = f"Removed from tracking: {files_list} - {user_comment}"
                run_command_silently(f'git commit -m "{commit_message}"')
                
                # Push changes to remote
                push_result = subprocess.run("git push origin main", shell=True, capture_output=True, text=True)
                if push_result.returncode == 0:
                    print("\nChanges saved and pushed to remote successfully")
                    log_operation("Tracking", "SUCCESS", f"Pushed removal of {len(removed_files)} files")
                else:
                    print(f"\nError during push: {push_result.stderr}")
                    log_operation("Tracking", "ERROR", f"Failed to push: {push_result.stderr}")
            else:
                print("\nFailed to save tracking changes")
                log_operation("Tracking", "ERROR", "Failed to save tracking configuration")
                print("Ensure the configuration file is accessible and writable.")
        except subprocess.CalledProcessError as e:
            print(f"\nError syncing changes with remote: {e.stderr.decode()}")
            log_operation("Tracking", "ERROR", f"Failed to sync changes: {e.stderr.decode()}")
            print(f"Standard error: {e.stderr.decode()}")  # Log standard error for more details

def unset_git_config(setting):
    """Unsets a Git configuration setting only if it exists."""
    try:
        result = subprocess.run(f"git config --global --get {setting}", shell=True, capture_output=True, text=True)
        if result.stdout.strip():
            run_command_silently(f"git config --global --unset {setting}")
    except subprocess.CalledProcessError:
        # Silently ignore if the config doesn't exist
        pass

def remove_git_config():
    """Completely removes Git configurations, including repository, remote origin, and tracked settings."""
    confirm = input("\n\tAre you sure you want to remove all Git configurations, including repository settings? (y/n): ")
    if confirm.lower() != "y":
        print("\n!! Removal cancelled. No changes made. !!")
        return

    try:
        print("\n>> Removing Git configurations...")
        
        # Step 0: Ensure Git allows modifying the repository
        run_command_silently("git config --global --add safe.directory /Applications/XAMPP/xamppfiles/htdocs")

        # Step 1: Remove the .git directory (Local repository)
        if os.path.exists(".git"):
            run_command_silently("rm -rf .git")

        # Step 2: Remove tracked configuration files
        if os.path.exists(CONFIG_FILE):
            os.remove(CONFIG_FILE)
        if os.path.exists(ENCRYPTION_KEY_FILE):
            os.remove(ENCRYPTION_KEY_FILE)

        # Step 3: Unset all Git global settings that exist
        unset_git_config("credential.helper")
        unset_git_config("user.name")
        unset_git_config("user.email")
        unset_git_config("http.postbuffer")
        unset_git_config("remote.origin.url")

        # Step 4: Remove safe directory settings if they exist
        try:
            safe_dirs = subprocess.run("git config --global --list | grep safe.directory", 
                                     shell=True, capture_output=True, text=True).stdout.strip()
            if safe_dirs:
                for line in safe_dirs.split("\n"):
                    safe_dir = line.split("=")[-1].strip()
                    unset_git_config(f"safe.directory {safe_dir}")
        except subprocess.CalledProcessError:
            pass  # No safe directories configured

        # Step 5: Remove LFS settings if they exist
        try:
            lfs_check = subprocess.run("git config --global --list | grep filter.lfs", 
                                     shell=True, capture_output=True, text=True).stdout.strip()
            if lfs_check:
                run_command_silently("git config --global --remove-section filter.lfs")
        except subprocess.CalledProcessError:
            pass  # No LFS settings configured

        print("\n < Git configuration, repository settings, and remote origin have been fully removed. >\n")

    except Exception as e:
        print(f"\n Error removing Git configuration: {str(e)}\n")

def create_github_repo():
    """Allows the user to create a new repository on GitHub with a proper name."""
    config = load_config()
    github_token = config.get("github_token")
    if not github_token:
        github_token = input("\nEnter your GitHub personal access token: ")
        config["github_token"] = github_token
        save_config(config)
    headers = {"Authorization": f"token {github_token}", "Accept": "application/vnd.github.v3+json"}
    username_response = requests.get("https://api.github.com/user", headers=headers)
    if username_response.status_code == 200:
        username = username_response.json().get("login")
    else:
        print("\n\tFailed to retrieve GitHub username. Check your token.\n")
        return
    repo_name = input("\nEnter a name for your new GitHub repository: ")
    description = input("\nEnter a description for the repository: ")
    private = input("\nShould the repository be private? (y/n): ").strip().lower() == 'y'
    data = {"name": repo_name, "description": description, "private": private}
    response = requests.post(GITHUB_API_URL, json=data, headers=headers)
    if response.status_code == 201:
        repo_url = f"https://github.com/{username}/{repo_name}.git"
        print(f"Repository created successfully: {repo_url}")
        config["repo_url"] = repo_url
        save_config(config)
    else:
        print(f"\n\tFailed to create repository: {response.json()}\nCheck your GitHub token permissions.\n")

def show_tracked_files():
    """Displays all files currently being tracked."""
    config = load_config()
    print("\nCurrently tracked files:")
    if config["tracked_files"] == "all":
        print("All files in repository (except those in .gitignore)")
        # Show actual tracked files from git, excluding those in .gitignore
        result = subprocess.run(
            "git ls-files",
            shell=True,
            capture_output=True,
            text=True
        )
        if result.stdout:
            ignored_files = set()
            if os.path.exists(".gitignore"):
                with open(".gitignore", "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            ignored_files.add(line)
            
            for file in result.stdout.splitlines():
                if not any(fnmatch.fnmatch(file, pattern) for pattern in ignored_files):
                    print(f"- {file}")
    else:
        if not config["tracked_files"]:
            print("No files are currently being tracked")
        else:
            for file in config["tracked_files"]:
                if os.path.exists(file):
                    status = "✓" if verify_tracked_file(file) else "!"
                    print(f"- {file} {status}")
                else:
                    print(f"- {file} (missing)")
    print()

def show_repo_status():
    """Displays the current Git repository status."""
    repo_status = subprocess.run("git status", shell=True, capture_output=True, text=True).stdout.strip()
    print("\nRepository Status:")
    print(repo_status)
    print("\n")

def verify_git_email():
    """Verifies git email is configured and returns it. If not configured, prompts user to set it."""
    try:
        email = subprocess.run("git config user.email", shell=True, capture_output=True, text=True).stdout.strip()
        if not email or email == 'your.email@example.com':
            print("\nGit email not properly configured.")
            email = input("Enter your Git email: ")
            run_command_silently(f"git config --global user.email '{email}'")
            log_operation("Config", "INFO", f"Updated git email to {email}")
        return email
    except subprocess.CalledProcessError as e:
        print(f"Error verifying git email: {e.stderr.decode()}")
        log_operation("Config", "ERROR", f"Failed to verify git email: {e.stderr.decode()}")
        return None

def commit_tracked_files():
    """Commits only files listed in the tracked files configuration with an optional user comment."""
    # Verify email before proceeding
    if not verify_git_email():
        print("Cannot commit without configured email.")
        return

    config = load_config()
    tracked_files = config.get("tracked_files", [])
    if not tracked_files:
        print("No files are currently being tracked.")
        return

    for file in tracked_files:
        if os.path.exists(file):
            try:
                run_command_silently(f"git add {file}")
            except subprocess.CalledProcessError as e:
                print(f"Error adding {file}: {e.stderr.decode()}")
                log_operation("Tracking", "ERROR", f"Failed to add {file}: {e.stderr.decode()}")
        else:
            print(f"Tracked file not found: {file}")

    # Ask user if they want to add a comment
    add_comment = input("Do you want to add a comment to this commit? (y/n): ").strip().lower()
    user_comment = ""
    if add_comment == 'y':
        user_comment = input("Enter your comment: ")

    try:
        # Ensure email is used in commit
        email = subprocess.run("git config user.email", shell=True, capture_output=True, text=True).stdout.strip()
        commit_message = f"Auto-commit tracked files: {user_comment}"
        run_command_silently(f'git -c user.email="{email}" commit -m "{commit_message}"')
        
        # Also ensure email is used in push
        push_result = subprocess.run(f'git -c user.email="{email}" push origin main', 
                                   shell=True, capture_output=True, text=True)
        if push_result.returncode == 0:
            print("Changes committed and pushed to remote successfully")
            log_operation("Commit", "SUCCESS", f"Changes pushed to remote using email: {email}")
        else:
            print(f"Error during push: {push_result.stderr}")
            log_operation("Commit", "ERROR", f"Failed to push: {push_result.stderr}")
    except subprocess.CalledProcessError as e:
        print(f"Error during commit: {e.stderr.decode()}")
        log_operation("Commit", "ERROR", f"Failed to commit: {e.stderr.decode()}")

def auto_commit_process():
    """Auto-commit process that only commits tracked files."""
    config = load_config()
    while True:
        try:
            # Verify email before each auto-commit
            if verify_git_email():
                commit_tracked_files()
            else:
                log_operation("Auto-commit", "ERROR", "Failed to auto-commit: Email not configured")
                print("Auto-commit skipped: Email not configured")
        except Exception as e:
            print(f"Error during auto-commit: {str(e)}")
            log_operation("Auto-commit", "ERROR", f"Error during auto-commit: {str(e)}")
        time.sleep(config.get("commit_interval", 30) * 60)

def check_large_files():
    """Checks for large files in the tracked files list and suggests using Git LFS."""
    config = load_config()
    tracked_files = config.get("tracked_files", [])
    large_files = []

    for file in tracked_files:
        if os.path.exists(file) and os.path.getsize(file) > 100 * 1024 * 1024:  # 100 MB limit
            large_files.append(file)

    if large_files:
        print("The following tracked files exceed 100 MB and may require Git LFS:")
        for file in large_files:
            print(f"- {file}")
        print("Consider using Git Large File Storage (LFS) for these files.")

def configure_pull_strategy():
    """Configures the pull strategy for the repository."""
    print("\nHow would you like to handle divergent branches?")
    print("1. Merge (recommended for most cases)")
    print("2. Rebase (for clean history)")
    print("3. Fast-forward only (strict)")
    
    choice = input("\nSelect option (1-3): ")
    
    if choice == "1":
        run_command_silently("git config pull.rebase false")
        print("Pull strategy set to merge")
    elif choice == "2":
        run_command_silently("git config pull.rebase true")
        print("Pull strategy set to rebase")
    elif choice == "3":
        run_command_silently("git config pull.ff only")
        print("Pull strategy set to fast-forward only")
    else:
        print("Invalid choice. Using merge as default")
        run_command_silently("git config pull.rebase false")

def get_available_branches():
    """Gets list of local and remote branches."""
    try:
        # Get local branches
        local_branches = subprocess.run(
            "git branch",
            shell=True,
            capture_output=True,
            text=True
        ).stdout.strip().split('\n')
        local_branches = [b.strip('* ') for b in local_branches if b.strip()]

        # Get remote branches
        remote_branches = subprocess.run(
            "git branch -r",
            shell=True,
            capture_output=True,
            text=True
        ).stdout.strip().split('\n')
        remote_branches = [b.strip().replace('origin/', '') for b in remote_branches if b.strip()]

        # Combine and remove duplicates while preserving order
        all_branches = []
        seen = set()
        for branch in local_branches + remote_branches:
            if branch not in seen:
                all_branches.append(branch)
                seen.add(branch)

        return all_branches
    except subprocess.CalledProcessError:
        return []

def select_branch():
    """Allows user to select a branch to work with."""
    branches = get_available_branches()
    
    if not branches:
        print("\nNo branches found.")
        print("Options:")
        print("1. Create 'main' branch")
        print("2. Create custom branch")
        print("3. Cancel")
        
        choice = input("\nSelect option (1-3): ")
        if choice == "1":
            run_command_silently("git checkout -b main")
            return "main"
        elif choice == "2":
            while True:
                branch_name = input("Enter branch name: ").strip()
                if branch_name:
                    run_command_silently(f"git checkout -b {branch_name}")
                    return branch_name
        else:
            return None
        
    print("\nAvailable branches:")
    for idx, branch in enumerate(branches, 1):
        print(f"{idx}. {branch}")
    print(f"{len(branches) + 1}. Create new branch")
    print(f"{len(branches) + 2}. Cancel")
    
    while True:
        try:
            choice = input("\nSelect branch number: ")
            choice_idx = int(choice)
            
            if 1 <= choice_idx <= len(branches):
                selected_branch = branches[choice_idx - 1]
                # Check if branch exists locally
                if selected_branch not in subprocess.run(
                    "git branch",
                    shell=True,
                    capture_output=True,
                    text=True
                ).stdout:
                    # Create local branch tracking remote branch
                    run_command_silently(f"git checkout -b {selected_branch} origin/{selected_branch}")
                else:
                    run_command_silently(f"git checkout {selected_branch}")
                return selected_branch
            elif choice_idx == len(branches) + 1:
                new_branch = input("Enter new branch name: ").strip()
                if new_branch:
                    run_command_silently(f"git checkout -b {new_branch}")
                    return new_branch
            elif choice_idx == len(branches) + 2:
                return None
            else:
                print("Invalid choice")
        except ValueError:
            print("Please enter a number")
        except subprocess.CalledProcessError as e:
            print(f"Error switching branch: {e.stderr.decode()}")

def sync_with_remote():
    """Synchronizes local repository with remote, checking for large files."""
    # Verify email before proceeding
    if not verify_git_email():
        print("Cannot sync without configured email.")
        return

    check_large_files()
    try:
        print("\nSyncing with remote repository...")
        
        # Try to fetch first
        run_command_silently("git fetch origin")
        
        # Let user select branch
        selected_branch = select_branch()
        if not selected_branch:
            print("Sync cancelled")
            return
            
        print(f"\nUsing branch: {selected_branch}")
        
        # Check if we need to configure pull strategy
        pull_config = subprocess.run(
            "git config pull.rebase",
            shell=True,
            capture_output=True,
            text=True
        ).stdout.strip()
        
        if not pull_config:
            print("\nPull strategy not configured.")
            configure_pull_strategy()
        
        # Now try to pull
        try:
            run_command_silently(f"git pull origin {selected_branch}")
            print("\nPulled latest changes from remote.")
        except subprocess.CalledProcessError as e:
            if "divergent branches" in str(e):
                print("\nDivergent branches detected. Reconfiguring pull strategy...")
                configure_pull_strategy()
                try:
                    run_command_silently(f"git pull origin {selected_branch}")
                except subprocess.CalledProcessError:
                    print("\nStill having issues. Would you like to:")
                    print("1. Force pull from remote (will lose local changes)")
                    print("2. Force push to remote (will overwrite remote changes)")
                    print("3. Cancel")
                    
                    choice = input("\nSelect option (1-3): ")
                    if choice == "1":
                        run_command_silently("git fetch origin")
                        run_command_silently(f"git reset --hard origin/{selected_branch}")
                        print("Successfully reset to remote state")
                        return
                    elif choice == "2":
                        force_push = True
                    else:
                        print("Sync cancelled")
                        return

        # Ask user if they want to add a comment
        add_comment = input("\nDo you want to add a comment to this push? (y/n): ").strip().lower()
        user_comment = ""
        if add_comment == 'y':
            user_comment = input("Enter your comment: ")

        # Check if we need to commit any changes
        status = subprocess.run("git status --porcelain", shell=True, capture_output=True, text=True).stdout
        if status.strip():
            commit_message = f"Sync changes: {user_comment}"
            run_command_silently(f'git add .')
            run_command_silently(f'git commit -m "{commit_message}"')

        # Initialize force_push variable
        force_push = input("\nDo you want to force push (if necessary)? (y/n): ").strip().lower() == "y"

        # Ensure email is used in push
        email = subprocess.run("git config user.email", shell=True, capture_output=True, text=True).stdout.strip()
        
        if force_push:
            print("\nConfirmation: Force push will overwrite remote changes. Proceeding...")
            push_command = f'git -c user.email="{email}" push origin {selected_branch} --force'
        else:
            push_command = f'git -c user.email="{email}" push origin {selected_branch}'

        push_result = subprocess.run(push_command, shell=True, capture_output=True, text=True)
        if push_result.returncode == 0:
            print("\nChanges successfully pushed to remote.")
            log_operation("Sync", "SUCCESS", f"Changes pushed to remote using email: {email}")
        else:
            error_msg = push_result.stderr.decode()
            if "src refspec" in error_msg:
                print(f"\nError: Branch '{selected_branch}' not found on remote. Would you like to:")
                print("1. Push branch to remote")
                print("2. Cancel")
                
                choice = input("\nSelect option (1-2): ")
                if choice == "1":
                    push_command = f'git -c user.email="{email}" push -u origin {selected_branch}'
                    push_result = subprocess.run(push_command, shell=True, capture_output=True, text=True)
                    if push_result.returncode == 0:
                        print(f"\nBranch '{selected_branch}' successfully pushed to remote")
                    else:
                        print(f"\nError pushing branch: {push_result.stderr}")
                        log_operation("Sync", "ERROR", f"Failed to push branch: {push_result.stderr}")
                else:
                    print("Push cancelled")
            else:
                print(f"\nError syncing with remote: {error_msg}")
                log_operation("Sync", "ERROR", f"Failed to sync changes: {error_msg}")
                
    except subprocess.CalledProcessError as e:
        print(f"\nError syncing with remote: {e.stderr.decode()}")
        log_operation("Sync", "ERROR", f"Failed to sync changes: {e.stderr.decode()}")

def initialize_repository():
    """Initializes the Git repository and ensures user details are set."""
    try:
        # Step 1: Verify Git installation
        if not verify_git_setup():
            print("\nPlease fix Git configuration issues before proceeding.")
            return

        # Step 2: Prompt user for Git URL
        git_url = input("Enter your Git repository URL: ").strip()
        if not git_url:
            print("\nGit URL is required to initialize the repository.")
            return

        # Validate Git URL
        if not validate_git_url(git_url):
            print("\nInvalid Git URL. Please provide a valid URL.")
            return

        # Step 3: Check if repository is already initialized
        if os.path.exists(".git"):
            print("\nA Git repository is already initialized in this directory.")
            return

        # Step 4: Initialize Local Repository
        success, _ = run_command_with_error_handling("git init")
        if not success:
            print("\nFailed to initialize local repository.")
            return
        print("- Local repository initialized")

        # Step 5: Configure Remote Repository
        success, _ = run_command_with_error_handling(f"git remote add origin {git_url}")
        if success:
            print("- Remote repository configured")
        else:
            print("\nFailed to configure remote repository. Please check the URL and try again.")
            return

        # Step 6: Set up default branch
        default_branch = "main"
        success, _ = run_command_with_error_handling(f"git checkout -b {default_branch}")
        if success:
            print(f"- Default branch '{default_branch}' set up")
        else:
            print("\nFailed to set up default branch. Please check your Git configuration.")
            return

        # Step 7: Fetch Repository Details
        print("\nFetching repository details...")
        repo_details = get_repo_details(git_url)
        if repo_details['success']:
            print("\nRepository details detected:")
            print(f"Owner: {repo_details['owner']}")
            print(f"Repository: {repo_details['repo_name']}")
            print(f"Default Branch: {repo_details['default_branch']}")
            print(f"Private: {'Yes' if repo_details['private'] else 'No'}")
        else:
            print("\nFailed to fetch repository details. Proceeding with manual configuration.")

        # Display Git user info
        user_name, user_email = get_git_user_info()
        if user_name and user_email:
            print(f"Git User: {user_name}, Email: {user_email}")
            confirm = input("Is this information correct? (y/n): ").strip().lower()
            if confirm != 'y':
                print("Please update your Git configuration with the correct username and email.")
        else:
            print("Git username or email is not configured. Please set them using 'git config'.")

        # Step 8: Confirm with user
        print("\n< Repository Setup Complete !>")

    except Exception as e:
        print(f"Error initializing repository: {str(e)}")
        log_operation("Init", "ERROR", f"Failed to initialize repository: {str(e)}")

    # Clean up multiple safe.directory entries
    run_command_silently("git config --global --unset-all safe.directory")
    run_command_silently("git config --global --add safe.directory /Applications/XAMPP/xamppfiles/htdocs")

def validate_git_url(url):
    """Validates the provided Git URL."""
    # Basic validation logic (can be expanded)
    return url.startswith("https://") or url.startswith("git@")

def menu():
    """Displays the interactive menu."""
    setup_logging()
    generate_key()
    verify_config_files()
    
    # Start auto-commit thread if either auto-commit or daemon mode is enabled
    config = load_config()
    if config.get("auto_commit", False) or config.get("daemon_mode", False):
        if DAEMON_MANAGER.start_auto_commit(config.get("commit_interval", 30)):
            log_operation("Daemon", "INFO", "Daemon started in background")
    
    show_welcome = True
    os.system('cls' if os.name == 'nt' else 'clear')
    
    # Verify repository status
    repo_valid, repo_message = verify_git_repo()
    if not repo_valid:
        print(f"\nWarning: {repo_message}")
        print("Use option 8 to initialize repository if needed.\n")
    
    if show_welcome:
        print("\n\t==  Welcome to Git Manager  ==\n")
        show_welcome = False
        
    while True:
        print("\nGit Manager Menu:")
        print("1. Add Tracked Files")
        print("2. Show Tracked Files")
        print("3. Remove Files from Tracking\n")
        print("4. Show Git Configuration")
        print("5. Edit Git Configuration\n")
        print("6. Edit Application Settings")
        print("7. Reset Git Manager Configuration\n")
        print("8. Initialize Git Repository")
        print("9. Remove Git Configuration\n")
        print("10. Create GitHub Repository")
        print("11. Show Repository Status")
        print("12. Sync with Remote\n")
        print("13. Show Recent Logs")
        print("14. Resolve Conflicts\n")
        print("15. Backup Management")
        print("16. Detailed Status")
        print("17. Exit")
        
        choice = input("\nEnter your choice: ")
        
        if choice == "1":
            track_files()
        elif choice == "2":
            show_tracked_files()
        elif choice == "3":
            remove_from_tracking()
        elif choice == "4":
            show_git_config()
        elif choice == "5":
            edit_git_config()
        elif choice == "6":
            edit_config()
        elif choice == "7":
            reset_config()
        elif choice == "8":
            initialize_repository()
        elif choice == "9":
            remove_git_config()
        elif choice == "10":
            create_github_repo()
        elif choice == "11":
            show_repo_status()
        elif choice == "12":
            sync_with_remote()
        elif choice == "13":
            show_recent_logs()
        elif choice == "14":
            resolve_conflicts()
        elif choice == "15":
            backup_menu()
        elif choice == "16":
            detailed_status()
        elif choice == "17":
            print("\n\t... Exiting Git Manager ...\n")
            break
        else:
            print("\nInvalid choice. Please select a valid option.\n")

def setup_logging():
    """Configures the logging system."""
    log_file = "git_manager.log"
    logging.basicConfig(
        filename=log_file,
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Add log file to gitignore if not already there
    if os.path.exists(".gitignore"):
        with open(".gitignore", "r") as f:
            content = f.read()
        if "git_manager.log" not in content:
            with open(".gitignore", "a") as f:
                f.write("\n# Git Manager logs\ngit_manager.log\n")
    else:
        with open(".gitignore", "w") as f:
            f.write("# Git Manager logs\ngit_manager.log\n")

def log_operation(operation, status, message=""):
    """Logs an operation and its outcome."""
    level = logging.INFO if status == "SUCCESS" else logging.ERROR
    log_msg = f"{operation}: {status}"
    if message:
        log_msg += f" - {message}"
    logging.log(level, log_msg)

def show_recent_logs():
    """Displays recent log entries to the user."""
    if not os.path.exists("git_manager.log"):
        print("\nNo logs available yet.")
        return
        
    print("\nRecent Operations:")
    has_errors = False
    with open("git_manager.log", "r") as f:
        # Get last 10 lines
        lines = f.readlines()[-10:]
        for line in lines:
            parts = line.split(" - ", 2)
            if len(parts) >= 3:
                timestamp = parts[0]
                level = parts[1]
                message = parts[2].strip()
                if "ERROR" in level:
                    has_errors = True
                print(f"{timestamp} | {level} | {message}")
    
    if has_errors:
        print("\nNote: There are errors in the log that may need attention.")
    print()

def detailed_status():
    """Provides detailed repository status with actionable insights."""
    start_time = time.time()
    
    print("\nRepository Health Check")
    print("======================")
    
    # Local changes
    local_changes = subprocess.run(
        "git status --porcelain",
        shell=True, capture_output=True, text=True
    ).stdout
    
    if local_changes:
        print("\nLocal Changes:")
        for line in local_changes.splitlines():
            status, file = line[:2], line[3:]
            if status == "M ":
                print(f"Modified: {file}")
            elif status == "A ":
                print(f"Added: {file}")
            elif status == "D ":
                print(f"Deleted: {file}")
    else:
        print("\nWorking directory clean")
    
    # Remote status
    try:
        run_command_silently("git fetch")
        ahead = subprocess.run(
            "git rev-list HEAD..origin/main --count",
            shell=True, capture_output=True, text=True
        ).stdout.strip()
        behind = subprocess.run(
            "git rev-list origin/main..HEAD --count",
            shell=True, capture_output=True, text=True
        ).stdout.strip()
        
        print("\nRemote Status:")
        if ahead != "0":
            print(f"- {ahead} commits ahead of remote")
        if behind != "0":
            print(f"- {behind} commits behind remote")
        if ahead == "0" and behind == "0":
            print("- In sync with remote")
    except:
        print("- Unable to check remote status")
    
    duration = time.time() - start_time
    log_operation("Status", "INFO", f"Status check completed in {duration:.2f} seconds")

def resolve_conflicts():
    """Interactive conflict resolution helper."""
    # Check for conflicts
    status = subprocess.run(
        "git status",
        shell=True,
        capture_output=True,
        text=True
    ).stdout
    
    if "You have unmerged paths" not in status:
        print("\nNo conflicts detected")
        log_operation("Conflicts", "INFO", "No conflicts found")
        return
        
    print("\nConflict Resolution Helper")
    print("==========================")
    log_operation("Conflicts", "INFO", "Starting conflict resolution")
    
    # Get conflicted files
    conflicts = subprocess.run(
        "git diff --name-only --diff-filter=U",
        shell=True,
        capture_output=True,
        text=True
    ).stdout.split()
    
    resolved_files = []
    for file in conflicts:
        print(f"\nResolving conflicts in {file}")
        print("Options:")
        print("1. Keep local version")
        print("2. Keep remote version")
        print("3. Show diff")
        print("4. Edit manually")
        print("5. Skip file")
        
        while True:
            choice = input("\nSelect option: ")
            
            try:
                if choice == "1":
                    run_command_silently(f"git checkout --ours {file}")
                    run_command_silently(f"git add {file}")
                    resolved_files.append(file)
                    log_operation("Conflicts", "SUCCESS", f"Kept local version of {file}")
                    break
                    
                elif choice == "2":
                    run_command_silently(f"git checkout --theirs {file}")
                    run_command_silently(f"git add {file}")
                    resolved_files.append(file)
                    log_operation("Conflicts", "SUCCESS", f"Kept remote version of {file}")
                    break
                    
                elif choice == "3":
                    # Show colored diff
                    subprocess.run(f"git diff --color {file}", shell=True)
                    continue
                    
                elif choice == "4":
                    print(f"\nPlease edit {file} manually.")
                    print("After editing, mark as resolved? (y/n): ")
                    if input().lower() == 'y':
                        run_command_silently(f"git add {file}")
                        resolved_files.append(file)
                        log_operation("Conflicts", "SUCCESS", f"Manually resolved {file}")
                        break
                    
                elif choice == "5":
                    log_operation("Conflicts", "INFO", f"Skipped {file}")
                    break
                    
                else:
                    print("Invalid choice")
                    
            except subprocess.CalledProcessError as e:
                print(f"\nError resolving conflict: {str(e)}")
                log_operation("Conflicts", "ERROR", f"Failed to resolve {file}: {str(e)}")
    
    if resolved_files:
        try:
            # Commit resolved conflicts
            add_comment = input("Do you want to add a comment to this commit? (y/n): ").strip().lower()
            user_comment = ""
            if add_comment == 'y':
                user_comment = input("Enter your comment: ")
            commit_message = f"Resolved conflicts in: {', '.join(resolved_files)} - {user_comment}"
            run_command_silently(f'git commit -m "{commit_message}"')
            print("\nConflicts resolved and committed successfully")
            log_operation("Conflicts", "SUCCESS", f"Committed resolutions for {len(resolved_files)} files")
        except subprocess.CalledProcessError as e:
            print(f"\nError committing resolved conflicts: {str(e)}")
            log_operation("Conflicts", "ERROR", f"Failed to commit resolutions: {str(e)}")
    else:
        print("\nNo conflicts were resolved")
        log_operation("Conflicts", "WARNING", "No conflicts resolved")

def backup_menu():
    """Displays backup management options."""
    while True:
        print("\nBackup Management:")
        print("1. Create backup")
        print("2. List backups")
        print("3. Restore backup")
        print("4. Return to main menu")
        
        choice = input("\nSelect option: ")
        
        if choice == "1":
            backup_name = BACKUP_MANAGER.create_backup()
            print(f"\nBackup created: {backup_name}")
            log_operation("Backup", "SUCCESS", f"Created backup {backup_name}")
            
        elif choice == "2":
            backups = BACKUP_MANAGER.list_backups()
            if not backups:
                print("\nNo backups found")
            else:
                print("\nAvailable backups:")
                for timestamp, files in backups.items():
                    print(f"\n{timestamp}:")
                    for file in files:
                        print(f"  - {file}")
                        
        elif choice == "3":
            backups = BACKUP_MANAGER.list_backups()
            if not backups:
                print("\nNo backups available to restore")
                continue
                
            print("\nAvailable backups:")
            timestamps = list(backups.keys())
            for i, timestamp in enumerate(timestamps, 1):
                print(f"{i}. {timestamp}")
                
            try:
                idx = int(input("\nSelect backup to restore (or 0 to cancel): ")) - 1
                if idx == -1:
                    continue
                if 0 <= idx < len(timestamps):
                    BACKUP_MANAGER.restore_backup(timestamps[idx])
                    print("\nBackup restored successfully")
                    log_operation("Backup", "SUCCESS", f"Restored backup {timestamps[idx]}")
                else:
                    print("\nInvalid selection")
            except ValueError:
                print("\nInvalid input")
                
        elif choice == "4":
            break

def verify_tracked_file(file_name):
    """Verifies that a file is actually being tracked."""
    config = load_config()
    if config["tracked_files"] == "all":
        return True
    return file_name in config["tracked_files"]

def verify_git_repo():
    """Verifies the Git repository is properly initialized and configured."""
    try:
        # Check if .git directory exists
        if not os.path.exists(".git"):
            return False, "No Git repository found"

        # Check if git commands work
        status_result = subprocess.run("git status", shell=True, capture_output=True, text=True)
        if status_result.returncode != 0:
            return False, "Invalid Git repository"

        # Check remote configuration
        config = load_config()
        if config.get("repo_url"):
            remote_result = subprocess.run("git remote -v", shell=True, capture_output=True, text=True)
            if config["repo_url"] not in remote_result.stdout:
                return False, "Remote configuration mismatch"

        return True, "Repository properly configured"

    except Exception as e:
        return False, f"Error verifying repository: {str(e)}"

def verify_config_files():
    """Verifies configuration files exist and are accessible."""
    print("\nChecking configuration files:")
    
    # Check encryption key
    if os.path.exists(ENCRYPTION_KEY_FILE):
        print("- encryption.key: Found")
    else:
        print("- encryption.key: Missing (will be created)")
        generate_key()
    
    # Check configuration file
    if os.path.exists(CONFIG_FILE):
        print("- tracked_files.json: Found")
        try:
            config = load_config()
            print("  Status: Readable")
        except Exception as e:
            print(f"  Status: Error reading ({str(e)})")
    else:
        print("- tracked_files.json: Not created yet")
        print("  (File will be created when saving settings)")

def run_command_silently(command):
    """Runs a shell command silently with error handling."""
    success, output = run_command_with_error_handling(command, silent=True)
    if not success:
        raise subprocess.CalledProcessError(1, command, output)

def verify_git_setup():
    """Verifies that Git is installed."""
    try:
        # Check if Git is installed
        git_version = subprocess.run("git --version", shell=True, capture_output=True, text=True)
        if git_version.returncode != 0:
            print("Git is not installed. Please install Git to proceed.")
            return False

        # Skip checking for username and email
        return True
    except Exception as e:
        print(f"Error verifying Git setup: {str(e)}")
        return False

def run_command_with_error_handling(command, silent=False):
    """Runs a shell command with error handling and optional silent mode."""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            if not silent:
                print(f"Error executing command: {command}")
                print(result.stderr)
            return False, result.stderr
        return True, result.stdout
    except Exception as e:
        if not silent:
            print(f"Exception occurred while executing command: {command}")
            print(str(e))
        return False, str(e)

def get_repo_details(git_url):
    """Fetches and returns details about a Git repository using its URL via GitHub API."""
    try:
        # Extract the owner and repo name from the URL
        parts = git_url.split('/')
        owner = parts[-2]
        repo_name = parts[-1].replace('.git', '')

        # Use environment variable for GitHub token
        github_token = os.getenv('GITHUB_TOKEN')
        if not github_token:
            github_token = input("GitHub token not found. Please enter your GitHub personal access token: ").strip()
            if not github_token:
                print("GitHub token is required to fetch repository details.")
                return {'success': False}

        # Set up headers for the API request
        headers = {
            'Authorization': f'token {github_token}',
            'Accept': 'application/vnd.github.v3+json'
        }

        # Make the API request
        response = requests.get(f'https://api.github.com/repos/{owner}/{repo_name}', headers=headers)
        if response.status_code == 200:
            repo_data = response.json()
            return {
                'success': True,
                'owner': repo_data['owner']['login'],
                'repo_name': repo_data['name'],
                'default_branch': repo_data['default_branch'],
                'private': repo_data['private']
            }
        else:
            print(f"Failed to fetch repository details: {response.json()}")
            return {'success': False}
    except Exception as e:
        print(f"Error fetching repository details: {str(e)}")
        return {'success': False}

def get_git_user_info():
    """Retrieves the Git username and email from the repository configuration, checking both local and global scopes."""
    try:
        # Get the Git username (local first, then global)
        user_name_result = subprocess.run("git config --get user.name", shell=True, capture_output=True, text=True)
        user_name = user_name_result.stdout.strip()
        if not user_name:
            user_name_result = subprocess.run("git config --global --get user.name", shell=True, capture_output=True, text=True)
            user_name = user_name_result.stdout.strip()

        # Get the Git email (local first, then global)
        user_email_result = subprocess.run("git config --get user.email", shell=True, capture_output=True, text=True)
        user_email = user_email_result.stdout.strip()
        if not user_email:
            user_email_result = subprocess.run("git config --global --get user.email", shell=True, capture_output=True, text=True)
            user_email = user_email_result.stdout.strip()

        if not user_name or not user_email:
            print("Git username or email is not configured.")
            return None, None

        return user_name, user_email
    except Exception as e:
        print(f"Error retrieving Git user info: {str(e)}")
        return None, None

if __name__ == "__main__":
    verify_authentication()
    menu()