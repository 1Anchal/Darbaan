# Requirements Document

## Introduction

Darbaan is a smart attendance management and crowd management system that uses Bluetooth Low Energy (BLE) technology to automatically track student and faculty presence. The system serves three user types (students, faculty, and admin) and provides comprehensive attendance tracking, reporting, and crowd management capabilities through a web-based interface.

## Glossary

- **Darbaan_System**: The complete smart attendance and crowd management application
- **BLE_Scanner**: Bluetooth Low Energy scanning component that detects user devices
- **User_Dashboard**: Main interface displaying attendance statistics and notifications
- **Student_Registry**: Database and interface for managing student information
- **Class_Manager**: Component for creating and managing class definitions
- **Report_Generator**: System component that creates attendance and crowd reports
- **Crowd_Monitor**: Real-time crowd density tracking and management system
- **Notification_Center**: System for displaying updates and alerts to users
- **CSV_Exporter**: Component that exports student data in spreadsheet format
- **Filter_Engine**: System for filtering and searching student records by class enrollment

## Requirements

### Requirement 1

**User Story:** As an admin user, I want to access a comprehensive dashboard, so that I can monitor overall attendance metrics and system status at a glance.

#### Acceptance Criteria

1. WHEN an admin user logs into the system, THE Darbaan_System SHALL display a dashboard with total students count
2. THE User_Dashboard SHALL display the number of students present today
3. THE User_Dashboard SHALL display the count of late arrivals for the current day
4. THE User_Dashboard SHALL calculate and display the current attendance rate as a percentage
5. THE User_Dashboard SHALL include a notification center in the top right corner for system updates and alerts

### Requirement 2

**User Story:** As an admin user, I want to manage student information comprehensively, so that I can maintain accurate records and easily access student data.

#### Acceptance Criteria

1. WHEN an admin accesses the students section, THE Student_Registry SHALL display details of all registered students
2. THE Student_Registry SHALL provide a filter option to filter students by their enrolled classes
3. THE Student_Registry SHALL include an option to add new students to the system
4. THE Student_Registry SHALL provide functionality to export student data in CSV format
5. THE Student_Registry SHALL provide functionality to export student data in spreadsheet format

### Requirement 3

**User Story:** As an admin user, I want to manage class information, so that I can organize students into appropriate groups and maintain class structures.

#### Acceptance Criteria

1. WHEN an admin accesses the classes section, THE Class_Manager SHALL provide an option to add new classes
2. THE Class_Manager SHALL display details of each existing class
3. FOR each class displayed, THE Class_Manager SHALL provide an edit option
4. FOR each class displayed, THE Class_Manager SHALL provide a delete option
5. THE Class_Manager SHALL maintain class enrollment information linked to students

### Requirement 4

**User Story:** As an admin or faculty user, I want to access comprehensive reports with detailed filtering options, so that I can analyze attendance patterns and make informed decisions.

#### Acceptance Criteria

1. WHEN a user accesses the reports section, THE Report_Generator SHALL provide report type selection (daily, weekly, monthly, custom range)
2. THE Report_Generator SHALL provide start date and end date selection fields
3. THE Report_Generator SHALL include an apply filters button to generate filtered reports
4. THE Report_Generator SHALL display analytics including total students, average attendance, total classes, and punctuality rate
5. THE Report_Generator SHALL show attendance trends according to the selected date range
6. THE Report_Generator SHALL display attendance distribution as a pie chart showing present, late, and absent categories

### Requirement 5

**User Story:** As an admin user, I want to monitor crowd density across specific campus locations in real-time, so that I can manage space utilization and ensure safety compliance.

#### Acceptance Criteria

1. WHEN crowd management is accessed, THE Crowd_Monitor SHALL display real-time occupancy data for Food Street, Rock Plaza, Central Library, and Main Auditorium
2. THE Crowd_Monitor SHALL provide a campus overview showing total locations, total occupancy, total capacity, and active alerts
3. THE Crowd_Monitor SHALL track entry and exit patterns using BLE technology for each location
4. THE Crowd_Monitor SHALL provide alerts when crowd density exceeds safe limits at any location
5. THE Crowd_Monitor SHALL maintain historical crowd data for analysis across all monitored locations

### Requirement 6

**User Story:** As any user type, I want to access comprehensive system settings organized by category, so that I can configure the system according to my preferences and requirements.

#### Acceptance Criteria

1. WHEN a user accesses settings, THE Darbaan_System SHALL provide five setting categories: General, Attendance, Notifications, Security, and System
2. THE Darbaan_System SHALL provide General settings including system name, timezone, language, date format, and backup enablement
3. THE Darbaan_System SHALL provide Attendance settings including late threshold (minutes), absent threshold (minutes), cooldown period (seconds), and manual attendance entry enablement
4. THE Darbaan_System SHALL provide Notification settings with boolean options for email notifications, SMS notifications, push notifications, daily reports, and security alerts
5. THE Darbaan_System SHALL provide Security settings including session timeout (minutes), password expiry (days), and boolean options for two-factor authentication, data encryption, and audit logs
6. THE Darbaan_System SHALL provide System settings including sync interval (minutes), log level dropdown (debug, info, warning, error), and boolean options for auto sync, offline mode, and debug mode

### Requirement 7

**User Story:** As a student or faculty member, I want my attendance to be automatically tracked via BLE, so that I don't need to manually check in or out.

#### Acceptance Criteria

1. WHEN a registered user enters the monitored area, THE BLE_Scanner SHALL detect their device automatically
2. WHEN a registered user exits the monitored area, THE BLE_Scanner SHALL record their departure time
3. THE BLE_Scanner SHALL distinguish between different user types (student, faculty, admin)
4. THE BLE_Scanner SHALL maintain accurate timestamps for all entry and exit events
5. IF a user's device is not detected for a configured time period, THEN THE Darbaan_System SHALL mark them as absent

### Requirement 8

**User Story:** As a system user, I want secure authentication and role-based access control, so that different user types can access appropriate system features securely.

#### Acceptance Criteria

1. WHEN any user accesses the system, THE Darbaan_System SHALL display a login page for authorized authentication
2. WHEN a student user logs in, THE Darbaan_System SHALL restrict access to view-only dashboard and personal attendance
3. WHEN a faculty user logs in, THE Darbaan_System SHALL provide access to class management and student reports
4. WHEN an admin user logs in, THE Darbaan_System SHALL provide full system access including user management
5. THE Darbaan_System SHALL maintain audit logs of user actions based on their role

### Requirement 9

**User Story:** As a system administrator, I want the system to utilize Raspberry Pi hardware with BLE tags efficiently, so that attendance tracking is reliable and cost-effective.

#### Acceptance Criteria

1. THE Darbaan_System SHALL operate efficiently on Raspberry Pi Model B with 4GB RAM
2. THE BLE_Scanner SHALL utilize Bluetooth Low Energy tags for device identification
3. THE Darbaan_System SHALL optimize resource usage for the Raspberry Pi hardware constraints
4. THE BLE_Scanner SHALL maintain stable connections with multiple BLE tags simultaneously
5. THE Darbaan_System SHALL provide hardware status monitoring for Raspberry Pi components