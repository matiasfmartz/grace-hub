-- Grace Hub - Database Schema
-- Dialect: MySQL

-- =================================================================
-- Section 1: Members & Roles
-- Corresponds to data in members-db.json
-- =================================================================

-- A static table to define the available roles.
CREATE TABLE IF NOT EXISTS Roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL COMMENT 'e.g., Leader, Worker, GeneralAttendee'
);

-- The main table for all church members.
CREATE TABLE IF NOT EXISTS Members (
    id VARCHAR(255) PRIMARY KEY,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    birthDate DATE,
    churchJoinDate DATE,
    baptismDate VARCHAR(100),
    attendsLifeSchool BOOLEAN DEFAULT FALSE,
    attendsBibleInstitute BOOLEAN DEFAULT FALSE,
    fromAnotherChurch BOOLEAN DEFAULT FALSE,
    status ENUM('Active', 'Inactive', 'New') NOT NULL DEFAULT 'New',
    avatarUrl VARCHAR(512),
    assignedGDIId VARCHAR(255), -- Foreign key added after GDIs table is created
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Junction table for the many-to-many relationship between Members and Roles.
CREATE TABLE IF NOT EXISTS MemberRoles (
    memberId VARCHAR(255) NOT NULL,
    roleId INT NOT NULL,
    PRIMARY KEY (memberId, roleId),
    FOREIGN KEY (memberId) REFERENCES Members(id) ON DELETE CASCADE,
    FOREIGN KEY (roleId) REFERENCES Roles(id) ON DELETE CASCADE
);


-- =================================================================
-- Section 2: Groups (GDIs and Ministry Areas)
-- Corresponds to gdis-db.json and ministry-areas-db.json
-- =================================================================

CREATE TABLE IF NOT EXISTS GDIs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    guideId VARCHAR(255) NOT NULL,
    FOREIGN KEY (guideId) REFERENCES Members(id) ON DELETE CASCADE
);

-- Now that GDIs table exists, we can add the foreign key to Members.
ALTER TABLE Members
ADD CONSTRAINT fk_member_gdi
FOREIGN KEY (assignedGDIId) REFERENCES GDIs(id) ON DELETE SET NULL;


CREATE TABLE IF NOT EXISTS MinistryAreas (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    leaderId VARCHAR(255) NOT NULL,
    FOREIGN KEY (leaderId) REFERENCES Members(id) ON DELETE CASCADE
);

-- Junction table for the many-to-many relationship between Members and MinistryAreas.
CREATE TABLE IF NOT EXISTS MemberMinistryAreas (
    memberId VARCHAR(255) NOT NULL,
    areaId VARCHAR(255) NOT NULL,
    PRIMARY KEY (memberId, areaId),
    FOREIGN KEY (memberId) REFERENCES Members(id) ON DELETE CASCADE,
    FOREIGN KEY (areaId) REFERENCES MinistryAreas(id) ON DELETE CASCADE
);


-- =================================================================
-- Section 3: Meetings & Attendance
-- Corresponds to meeting-series-db.json, meetings-db.json, and attendance-db.json
-- =================================================================

CREATE TABLE IF NOT EXISTS MeetingSeries (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    defaultTime TIME,
    defaultLocation VARCHAR(255),
    seriesType ENUM('general', 'gdi', 'ministryArea') NOT NULL,
    ownerGroupId VARCHAR(255) COMMENT 'FK to GDIs.id or MinistryAreas.id',
    frequency ENUM('OneTime', 'Weekly', 'Monthly') NOT NULL,
    oneTimeDate DATE,
    monthlyRuleType ENUM('DayOfMonth', 'DayOfWeekOfMonth'),
    monthlyDayOfMonth INT,
    monthlyWeekOrdinal ENUM('First', 'Second', 'Third', 'Fourth', 'Last'),
    monthlyDayOfWeek ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Junction table for target attendee groups of a general series.
CREATE TABLE IF NOT EXISTS MeetingSeriesTargetGroups (
    seriesId VARCHAR(255) NOT NULL,
    targetGroup ENUM('allMembers', 'workers', 'leaders') NOT NULL,
    PRIMARY KEY (seriesId, targetGroup),
    FOREIGN KEY (seriesId) REFERENCES MeetingSeries(id) ON DELETE CASCADE
);

-- Junction table for the days of the week for a weekly recurring series.
CREATE TABLE IF NOT EXISTS MeetingSeriesWeeklyDays (
    seriesId VARCHAR(255) NOT NULL,
    dayOfWeek ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
    PRIMARY KEY (seriesId, dayOfWeek),
    FOREIGN KEY (seriesId) REFERENCES MeetingSeries(id) ON DELETE CASCADE
);

-- Table to store explicitly cancelled dates for a recurring series.
CREATE TABLE IF NOT EXISTS MeetingSeriesCancelledDates (
    seriesId VARCHAR(255) NOT NULL,
    cancelledDate DATE NOT NULL,
    PRIMARY KEY (seriesId, cancelledDate),
    FOREIGN KEY (seriesId) REFERENCES MeetingSeries(id) ON DELETE CASCADE
);

-- Table for specific meeting instances.
CREATE TABLE IF NOT EXISTS Meetings (
    id VARCHAR(255) PRIMARY KEY,
    seriesId VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT,
    minute TEXT,
    FOREIGN KEY (seriesId) REFERENCES MeetingSeries(id) ON DELETE CASCADE
);

-- Junction table for pre-resolved attendees of specific meetings.
CREATE TABLE IF NOT EXISTS MeetingAttendees (
    meetingId VARCHAR(255) NOT NULL,
    memberId VARCHAR(255) NOT NULL,
    PRIMARY KEY (meetingId, memberId),
    FOREIGN KEY (meetingId) REFERENCES Meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (memberId) REFERENCES Members(id) ON DELETE CASCADE
);

-- Table for attendance records of members at meetings.
CREATE TABLE IF NOT EXISTS AttendanceRecords (
    id VARCHAR(255) PRIMARY KEY,
    meetingId VARCHAR(255) NOT NULL,
    memberId VARCHAR(255) NOT NULL,
    attended BOOLEAN NOT NULL,
    notes TEXT,
    UNIQUE KEY (meetingId, memberId),
    FOREIGN KEY (meetingId) REFERENCES Meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (memberId) REFERENCES Members(id) ON DELETE CASCADE
);
