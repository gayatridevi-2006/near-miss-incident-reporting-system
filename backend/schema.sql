-- MySQL Schema for Near Miss Incident Reporting & Management System

CREATE DATABASE IF NOT EXISTS near_miss_db;
USE near_miss_db;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    mobile_number VARCHAR(20) DEFAULT NULL,
    department_id INT DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'Active' NOT NULL,
    first_login BOOLEAN DEFAULT 1 NOT NULL,
    temporary_password BOOLEAN DEFAULT 1 NOT NULL,
    password_reset_required BOOLEAN DEFAULT 1 NOT NULL,
    created_by INT DEFAULT NULL,
    password_changed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    incident_date DATETIME NOT NULL,
    reporter_id INT NOT NULL,
    department_id INT NOT NULL,
    location VARCHAR(150) NOT NULL,
    equipment_involved VARCHAR(100) DEFAULT NULL,
    unsafe_act_or_condition ENUM('Unsafe Act', 'Unsafe Condition', 'Both') NOT NULL,
    potential_severity ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL,
    status ENUM('Pending', 'Under_Investigation', 'Action_Proposed', 'Resolved', 'Closed') DEFAULT 'Pending' NOT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Action Items (CAPA) Table
CREATE TABLE IF NOT EXISTS action_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    description TEXT NOT NULL,
    action_type ENUM('Corrective', 'Preventive') NOT NULL,
    assigned_to_id INT DEFAULT NULL,
    target_date DATE NOT NULL,
    status ENUM('Pending', 'In_Progress', 'Completed', 'Approved') DEFAULT 'Pending' NOT NULL,
    proposed_by_id INT NOT NULL,
    approved_by_id INT DEFAULT NULL,
    closure_remarks TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (proposed_by_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
