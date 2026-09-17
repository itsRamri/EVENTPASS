-- ============================================================================
-- EVENTPASS RELATIONAL DATABASE SCHEMA (SQL DDL)
-- Project: EventPass Pro (com.EVENTPASS.RSK)
-- Database Engine: MySQL 8.0+ / PostgreSQL 14+ Compatible
-- Description: Complete Relational Schema mirroring Firebase Firestore collections
-- ============================================================================

CREATE DATABASE IF NOT EXISTS eventpass_db;
USE eventpass_db;

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE (Accounts, Authentication, Roles & Profiles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(32),
    role ENUM('manager', 'guest', 'scanner') NOT NULL DEFAULT 'guest',
    status ENUM('active', 'disabled', 'suspended') NOT NULL DEFAULT 'active',
    avatar VARCHAR(1024),
    college VARCHAR(255) DEFAULT 'National Institute of Technology',
    branch VARCHAR(255) DEFAULT 'Computer Science & Engineering',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
);

-- ----------------------------------------------------------------------------
-- 2. EVENTS TABLE (Events, Venues, Configurations & Pass Token Rules)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tagline VARCHAR(512),
    status ENUM('active', 'draft', 'concluded', 'cancelled') NOT NULL DEFAULT 'active',
    cover_image VARCHAR(1024),
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    venue VARCHAR(512) NOT NULL,
    location VARCHAR(512),
    organizer VARCHAR(255) NOT NULL,
    total_token_limit INT DEFAULT 500,
    token_type VARCHAR(64) DEFAULT 'ALPHANUMERIC',
    token_prefix VARCHAR(64) DEFAULT 'EP-PASS',
    validity_datetime DATETIME,
    qr_enabled BOOLEAN DEFAULT TRUE,
    auto_generate BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_event_date (event_date),
    INDEX idx_event_status (status)
);

-- ----------------------------------------------------------------------------
-- 3. GUESTS / PASSES TABLE (Registrations, QR Tokens, Check-in Status)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guests (
    id VARCHAR(128) PRIMARY KEY,
    event_id VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(32),
    avatar VARCHAR(1024),
    college VARCHAR(255),
    branch VARCHAR(255),
    roll_no VARCHAR(128),
    status ENUM('pending', 'approved', 'checkedin', 'rejected') NOT NULL DEFAULT 'pending',
    token VARCHAR(128) UNIQUE,
    pass_id VARCHAR(128) UNIQUE,
    registration_date VARCHAR(128),
    check_in_time VARCHAR(128),
    scan_timestamp VARCHAR(128),
    scanned_by VARCHAR(255),
    answers_json JSON,
    documents_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_guest_event (event_id),
    INDEX idx_guest_status (status),
    INDEX idx_guest_token (token),
    INDEX idx_guest_pass (pass_id)
);

-- ----------------------------------------------------------------------------
-- 4. STAFF & PERMISSIONS TABLE (Scanner & Coordinator Assignments)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('scanner', 'manager', 'coordinator') NOT NULL DEFAULT 'scanner',
    status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    assigned_event_id VARCHAR(128),
    can_scan BOOLEAN DEFAULT TRUE,
    can_check_in BOOLEAN DEFAULT TRUE,
    can_view_details BOOLEAN DEFAULT TRUE,
    can_approve BOOLEAN DEFAULT FALSE,
    can_reject BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_event_id) REFERENCES events(id) ON DELETE SET NULL,
    INDEX idx_staff_assigned (assigned_event_id)
);

-- ----------------------------------------------------------------------------
-- 5. SCAN_LOGS TABLE (Real-Time Gate Check-In & Security Audit Logs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_logs (
    id VARCHAR(128) PRIMARY KEY,
    guest_name VARCHAR(255) NOT NULL,
    token VARCHAR(128) NOT NULL,
    pass_id VARCHAR(128),
    event_name VARCHAR(255),
    status ENUM('checkedin', 'rejected', 'duplicate', 'invalid') NOT NULL DEFAULT 'checkedin',
    timestamp VARCHAR(128) NOT NULL,
    scanner_staff VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_scan_token (token),
    INDEX idx_scan_status (status)
);

-- ----------------------------------------------------------------------------
-- 6. NOTIFICATIONS TABLE (System & Pass Status Alerts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('success', 'info', 'warning', 'error') DEFAULT 'info',
    timestamp VARCHAR(128) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_user (user_id),
    INDEX idx_notif_read (is_read)
);

-- ============================================================================
-- SAMPLE SEED DATA INSERTION
-- ============================================================================

INSERT INTO users (id, name, email, mobile, role, status, avatar, college, branch) VALUES
('usr_manager_01', 'Aarav Sharma', 'aarav.sharma@eventpass.io', '+91 98765 43210', 'manager', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'National Institute of Technology', 'Computer Science & Engineering'),
('usr_guest_01', 'Shubham Kumar', 'shubham.k@gmail.com', '+91 91234 56789', 'guest', 'active', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', 'National Institute of Technology', 'Computer Science & Engineering'),
('usr_scanner_01', 'Karan Mehra', 'karan.scanner@eventpass.io', '+91 94567 89012', 'scanner', 'active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'National Institute of Technology', 'Computer Science & Engineering')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO events (id, name, tagline, status, cover_image, description, event_date, start_time, end_time, venue, location, organizer, total_token_limit, token_prefix) VALUES
('evt_fresher_2026', 'Mega Tech Fresher Gala 2026', 'Annual Flagship Induction & DJ Night', 'active', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80', 'Welcome to the biggest celebration of the academic year with live DJ night and tech showcase.', '2026-09-28', '18:00:00', '23:30:00', 'Grand Central Auditorium, Campus East', 'Building 4, Sector 12, Tech City', 'Student Council & Tech Club', 500, 'EP-GALA'),
('evt_hackathon_x', 'HackVision 36-Hour Hackathon', 'Code, Innovate, Win Big', 'active', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80', 'National level hackathon bringing together 300+ developers.', '2026-10-15', '09:00:00', '21:00:00', 'Innovation Hub, Cyber Wing', 'Tech Park, Block B', 'Developer Student Club', 300, 'HACK-X')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO guests (id, event_id, name, email, mobile, college, branch, roll_no, status, token, pass_id, registration_date, check_in_time) VALUES
('gst_101', 'evt_fresher_2026', 'Shubham Kumar', 'shubham.k@gmail.com', '+91 91234 56789', 'National Institute of Technology', 'Computer Science & Eng.', '2023CSB1042', 'approved', 'EP-GALA-10284', 'PASS-892147', '15 Sep 2026, 02:20:15 PM', NULL),
('gst_103', 'evt_fresher_2026', 'Rohan Deshmukh', 'rohan.desh@bits.edu', '+91 94567 89012', 'BITS Pilani', 'Mechanical Eng.', '2022MECH09', 'checkedin', 'EP-GALA-10190', 'PASS-771923', '14 Sep 2026, 11:15:00 AM', '16 Sep 2026, 04:30:22 PM')
ON DUPLICATE KEY UPDATE status=VALUES(status);
