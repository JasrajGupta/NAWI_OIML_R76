-- ============================================================
-- NAWI OIML R-76 Test Report Generator - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS nawi_oiml_r76
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nawi_oiml_r76;

-- Users with role-based access control
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  role          ENUM('admin','officer','reviewer','viewer') NOT NULL DEFAULT 'officer',
  lab_code      VARCHAR(20) DEFAULT 'NML-IND-001',
  status        ENUM('active','inactive') DEFAULT 'active',
  last_login    DATETIME NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Main applications table
CREATE TABLE IF NOT EXISTS applications (
  id              VARCHAR(30) PRIMARY KEY,
  manufacturer    VARCHAR(200),
  manufacturer_agent VARCHAR(200),
  model           VARCHAR(100),
  serial_no       VARCHAR(100),
  software_ver    VARCHAR(100),
  category        VARCHAR(50) DEFAULT 'complete',
  indication_type VARCHAR(50) DEFAULT 'self-indicating',
  accuracy_class  ENUM('I','II','III','IIII') NOT NULL DEFAULT 'III',
  max_cap         DECIMAL(15,6),
  min_cap         DECIMAL(15,6),
  e               DECIMAL(15,8) NOT NULL COMMENT 'Verification scale interval',
  d               DECIMAL(15,8) COMMENT 'Actual scale interval',
  n_intervals     INT COMMENT 'Max/e calculated',
  multi_interval  TINYINT(1) DEFAULT 0,
  e1              DECIMAL(15,8),
  max1            DECIMAL(15,6),
  d1              DECIMAL(15,8),
  n1              INT,
  e2              DECIMAL(15,8),
  max2            DECIMAL(15,6),
  d2              DECIMAL(15,8),
  n2              INT,
  tare_device     VARCHAR(30) DEFAULT 'none',
  tare_type       VARCHAR(20) DEFAULT 'subtractive',
  max_tare        DECIMAL(15,6),
  zero_device     VARCHAR(30) DEFAULT 'semi-automatic',
  zero_tracking   TINYINT(1) DEFAULT 0,
  initial_zero_range DECIMAL(5,2),
  power_type      VARCHAR(20) DEFAULT 'mains',
  nominal_voltage DECIMAL(10,2) DEFAULT 230,
  frequency       DECIMAL(5,1) DEFAULT 50,
  temp_range      VARCHAR(30) DEFAULT '-10 to 40',
  printer         VARCHAR(30) DEFAULT 'not_present',

  -- Test setup
  lab_name        VARCHAR(200),
  lab_code        VARCHAR(20),
  observer        VARCHAR(100),
  evaluator       VARCHAR(100),
  temp_start      DECIMAL(5,1),
  temp_end        DECIMAL(5,1),
  humidity        DECIMAL(5,1),
  bar_pressure    DECIMAL(7,1),

  -- Status & workflow
  status          ENUM('draft','submitted','under_review','approved','rejected') DEFAULT 'draft',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME ON UPDATE CURRENT_TIMESTAMP,
  submitted_at    DATETIME NULL,
  reviewed_by     VARCHAR(50) NULL,
  reviewed_at     DATETIME NULL,
  created_by      VARCHAR(50),

  -- JSON data fields
  equipment       JSON COMMENT 'Array of test equipment used',
  test_selection  JSON COMMENT 'Which tests are selected',
  performance_data  JSON COMMENT 'Weighing performance test rows',
  eccentricity_data JSON COMMENT 'Eccentricity test rows',
  repeatability_data JSON COMMENT 'Repeatability test series',
  discrimination_data JSON COMMENT 'Discrimination test rows',
  tare_data       JSON COMMENT 'Tare test data',
  additional_data JSON COMMENT 'Zero return, creep, tilt etc.',
  compliance      JSON COMMENT 'Compliance summary per test',

  -- Remarks
  remarks         TEXT,
  reviewer_remarks TEXT,
  report_pdf_path VARCHAR(500) NULL
) ENGINE=InnoDB;

-- Indexes for fast search
CREATE INDEX idx_app_status ON applications(status);
CREATE INDEX idx_app_mfg ON applications(manufacturer);
CREATE INDEX idx_app_date ON applications(created_at);
CREATE INDEX idx_app_cls ON applications(accuracy_class);
CREATE INDEX idx_app_model ON applications(model);

-- Audit trail for all actions
CREATE TABLE IF NOT EXISTS audit_log (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  username    VARCHAR(50),
  action      VARCHAR(10) NOT NULL COMMENT 'GET/POST/PUT/DELETE',
  endpoint    VARCHAR(200) NOT NULL,
  payload     TEXT COMMENT 'Request body (truncated)',
  ip_address  VARCHAR(45),
  timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_time ON audit_log(timestamp);

-- Test equipment registry
CREATE TABLE IF NOT EXISTS test_equipment (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(200) NOT NULL,
  manufacturer      VARCHAR(200),
  type_no           VARCHAR(100),
  serial_no         VARCHAR(100),
  calibration_date  DATE,
  next_calibration  DATE,
  accuracy_class    VARCHAR(20),
  lab_code          VARCHAR(20),
  status            ENUM('active','expired','out_of_service') DEFAULT 'active',
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- INSERT DEFAULT USERS
-- Passwords are all: admin123
-- Generated with: bcryptjs.hash('admin123', 10)
-- ============================================================
INSERT INTO users (username, password_hash, full_name, role, lab_code) VALUES
('admin',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Rajesh Kumar',   'admin',    'NML-IND-001'),
('officer1',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Priya Sharma',   'officer',  'NML-IND-001'),
('officer2',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Vikram Singh',   'officer',  'NML-IND-002'),
('reviewer1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Amit Verma',     'reviewer', 'NML-IND-002'),
('viewer1',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Sunita Devi',    'viewer',   'NML-IND-001');

-- Insert sample test equipment
INSERT INTO test_equipment (name, manufacturer, type_no, serial_no, calibration_date, next_calibration, accuracy_class, lab_code) VALUES
('Standard Weights Set', 'OIML Certified', 'E2-10kg', 'WT-2025-001', '2025-06-01', '2027-06-01', 'E2', 'NML-IND-001'),
('Standard Weights Set', 'OIML Certified', 'M1-20kg', 'WT-2025-002', '2025-06-01', '2027-06-01', 'M1', 'NML-IND-001'),
('Calibrated Rack 20kg', 'Shimadzu', 'CR-20', 'CR-2025-010', '2025-03-15', '2027-03-15', 'M1', 'NML-IND-001'),
('Digital Thermometer', 'Fluke', '1524', 'TH-2025-003', '2025-01-10', '2026-01-10', 'Class A', 'NML-IND-001'),
('Barometer', 'Thies Clima', 'DP-1.1', 'BR-2025-007', '2025-04-20', '2026-04-20', '—', 'NML-IND-001'),
('Hygrometer', 'Rotronic', 'HygroFlex HF5', 'HY-2025-011', '2025-02-01', '2026-02-01', '—', 'NML-IND-001');