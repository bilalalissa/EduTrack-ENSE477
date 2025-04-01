# EduTrack - ENSE 477 Capstone Project

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Security Considerations](#security-considerations)
- [License](#license)

## Project Overview

EduTrack is a comprehensive academic management application developed as part of the ENSE 477 Capstone Project. It is designed to help students and educators manage academic tasks, schedules, and resources efficiently. The application leverages XAMPP, which includes Apache and MySQL servers, to provide a robust and scalable backend.

## Features

- User authentication and authorization
- Task and schedule management
- Resource tracking and management
- Secure data storage and retrieval
- Interactive user interface

## Installation

1. **Prerequisites**:
   - Download and install [XAMPP](https://www.apachefriends.org/index.html), which includes Apache and MySQL.
   - Ensure PHP is installed and configured with XAMPP.

2. **Set Up XAMPP**:
   - Start the Apache and MySQL services from the XAMPP control panel.
   - Create a new database in MySQL for EduTrack.

3. **Clone the Repository**:

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

4. **Configure the Application**:
   - Update the database configuration in `db.php` with your MySQL credentials.

5. **Run the Application**:
   - Place the application files in the `htdocs` directory of XAMPP.
   - Access the application via `http://localhost/EduTrack` in your web browser.

## Usage

- **User Registration and Login**: Users can register and log in to access personalized features.
- **Task Management**: Create, update, and track academic tasks and schedules.
- **Resource Management**: Manage academic resources and materials.

## Security Considerations

- **Data Encryption**: Sensitive data is encrypted to ensure privacy and security.
- **Access Control**: Implement role-based access control to protect resources.
- **Regular Updates**: Keep the application and its dependencies updated to mitigate vulnerabilities.

## License

This project is licensed under the MIT License.
