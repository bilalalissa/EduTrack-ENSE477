import os
import json
import subprocess
import time
import base64
from cryptography.fernet import Fernet

CONFIG_FILE = "tracked_files.json"
ENCRYPTION_KEY_FILE = "encryption.key"

def generate_key():
    """Generates and saves an encryption key if it doesn't exist."""
    if not os.path.exists(ENCRYPTION_KEY_FILE):
        key = Fernet.generate_key()
        with open(ENCRYPTION_KEY_FILE, "wb") as key_file:
            key_file.write(key)

def load_key():
    """Loads the encryption key from file."""
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
    """Loads and decrypts configuration from the JSON file."""
    if not os.path.exists(CONFIG_FILE):
        return {"repo_url": "", "tracked_files": [], "auto_commit": False}
    try:
        with open(CONFIG_FILE, "r") as file:
            encrypted_data = file.read()
            return decrypt_data(encrypted_data)
    except (json.JSONDecodeError, ValueError):
        print("Error reading configuration file. Resetting to default.")
        return {"repo_url": "", "tracked_files": [], "auto_commit": False}

def save_config(config):
    """Encrypts and saves configuration securely."""
    try:
        with open(CONFIG_FILE, "w") as file:
            file.write(encrypt_data(config))
    except Exception as e:
        print(f"Error saving configuration: {e}")

def edit_config():
    """Allows user to edit the encrypted JSON configuration."""
    config = load_config()
    print("\nEdit Configuration:")
    print(f"1. Repo URL: {config['repo_url']}")
    print(f"2. Auto-Commit: {'Enabled' if config['auto_commit'] else 'Disabled'}")
    choice = input("Enter the number of the setting to edit (or 'q' to quit): ")
    if choice == "1":
        new_url = input("Enter new repository URL: ")
        config["repo_url"] = new_url
    elif choice == "2":
        config["auto_commit"] = not config["auto_commit"]
        print(f"Auto-Commit {'Enabled' if config['auto_commit'] else 'Disabled'}")
    else:
        print("Invalid choice.")
    save_config(config)

def setup_repo():
    """Asks for repository details and sets up Git."""
    config = load_config()
    repo_url = input("Enter the remote repository URL: ")
    config["repo_url"] = repo_url
    subprocess.run(f"git remote add origin {repo_url}", shell=True)
    save_config(config)
    print("Remote repository set up successfully!")

def menu():
    """Displays the interactive menu."""
    generate_key()
    while True:
        print("\nGit Manager Menu:")
        print("1. Set up repository")
        print("2. Edit Configuration")
        print("3. Exit")
        
        choice = input("Enter your choice: ")
        
        if choice == "1":
            setup_repo()
        elif choice == "2":
            edit_config()
        elif choice == "3":
            print("Exiting Git Manager.")
            break
        else:
            print("Invalid choice. Please select a valid option.")

if __name__ == "__main__":
    menu()

