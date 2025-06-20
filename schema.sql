
--Grace Hub Relational Database Schema
-- Members Table
CREATE TABLE Members (
    id VARCHAR(255) PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    birthDate DATE,
    churchJoinDate DATE,
    baptismDate VARCHAR(255),
    -- User input, e.g., "June 2023" or "2023-06-15"
    attendsLifeSchool BOOLEAN DEFAULT FALSE,
    attendsBibleInstitute BOOLEAN DEFAULT FALSE,
    fromAnotherChurch BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Inactive', 'New')),
    avatarUrl VARCHAR(1024),
    assignedGDIId VARCHAR(255),
    -- This FK will be added after GDIs table is created
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles Table (for MemberRoleType)
CREATE TABLE Roles (
    roleName VARCHAR(50) PRIMARY KEY CHECK (roleName IN ('Leader', 'Worker', 'GeneralAttendee'))
);

-- MemberRoles Junction Table (Many-to-Many between Members and Roles)
CREATE TABLE MemberRoles (
    memberId VARCHAR(255) NOT NULL,
    roleName VARCHAR(50) NOT NULL,
    PRIMARY KEY (memberId, roleName),
    FOREIGN KEY (memberId) REFERENCES Members(id) ON DELETE CASCADE,
    FOREIGN KEY (roleName) REFERENCES Roles(roleName) ON DELETE CASCADE
);

-- GDIs (Grupos de Integración) Table
CREATE TABLE GDIs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    guideId VARCHAR(255),
    coordinatorId VARCHAR(255),
    mentorId VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guideId) REFERENCES Members(id) ON DELETE SET NULL,
    FOREIGN KEY (coordinatorId) REFERENCES Members(id) ON DELETE SET NULL,
    FOREIGN KEY (mentorId) REFERENCES Members(id) ON DELETE SET NULL
);

-- Add FK constraint from Members to GDIs after GDIs table is created
ALTER TABLE Members
ADD CONSTRAINT fk_member_gdi FOREIGN KEY (assignedGDIId) REFERENCES GDIs(id) ON DELETE SET NULL;

-- MinistryAreas Table
CREATE TABLE MinistryAreas (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    leaderId VARCHAR(255),
    coordinatorId VARCHAR(255),
    mentorId VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leaderId) REFERENCES Members(id) ON DELETE SET NULL,
    FOREIGN KEY (coordinatorId) REFERENCES Members(id) ON DELETE SET NULL,
    FOREIGN KEY (mentorId) REFERENCES Members(id) ON DELETE SET NULL
);

-- MemberMinistryAreas Junction Table (Many-to-Many between Members and MinistryAreas)
CREATE TABLE MemberMinistryAreas (
    memberId VARCHAR(255) NOT NULL,
    ministryAreaId VARCHAR(255) NOT NULL,
    PRIMARY KEY (memberId, ministryAreaId),
    FOREIGN KEY (memberId) REFERENCES Members(id) ON DELETE CASCADE,
    FOREIGN KEY (ministryAreaId) REFERENCES MinistryAreas(id) ON DELETE CASCADE
);

-- MeetingSeries Table
CREATE TABLE MeetingSeries (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    defaultTime TIME NOT NULL,
    defaultLocation VARCHAR(255) NOT NULL,
    seriesType VARCHAR(50) NOT NULL CHECK (seriesType IN ('general', 'gdi', 'ministryArea')),
    ownerGdiId VARCHAR(255),
    ownerMinistryAreaId VARCHAR(255),
    frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('OneTime', 'Weekly', 'Monthly')),
    oneTimeDate DATE,
    -- Recurrence rules
    monthlyRuleType VARCHAR(50) CHECK (monthlyRuleType IN ('DayOfMonth', 'DayOfWeekOfMonth')),
    monthlyDayOfMonth INTEGER CHECK (monthlyDayOfMonth BETWEEN 1 AND 31),
    monthlyWeekOrdinal VARCHAR(50) CHECK (monthlyWeekOrdinal IN ('First', 'Second', 'Third', 'Fourth', 'Last')),
    monthlyDayOfWeek VARCHAR(50) CHECK (monthlyDayOfWeek IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ownerGdiId) REFERENCES GDIs(id) ON DELETE CASCADE,
    FOREIGN KEY (ownerMinistryAreaId) REFERENCES MinistryAreas(id) ON DELETE CASCADE,
    CONSTRAINT chk_owner_group CHECK (
        (seriesType = 'general' AND ownerGdiId IS NULL AND ownerMinistryAreaId IS NULL) OR
        (seriesType = 'gdi' AND ownerGdiId IS NOT NULL AND ownerMinistryAreaId IS NULL) OR
        (seriesType = 'ministryArea' AND ownerGdiId IS NULL AND ownerMinistryAreaId IS NOT NULL)
    ),
    CONSTRAINT chk_onetime_date CHECK (
        (frequency = 'OneTime' AND oneTimeDate IS NOT NULL) OR (frequency <> 'OneTime')
    ),
    CONSTRAINT chk_monthly_rules CHECK (
        (frequency = 'Monthly' AND monthlyRuleType IS NOT NULL) OR (frequency <> 'Monthly')
    )
);

-- TargetAttendeeGroups Table (for MeetingSeries target roles like 'allMembers', 'workers', 'leaders')
CREATE TABLE TargetAttendeeGroups (
    groupName VARCHAR(50) PRIMARY KEY CHECK (groupName IN ('allMembers', 'workers', 'leaders'))
);

-- MeetingSeriesTargetAttendeeGroups Junction Table
CREATE TABLE MeetingSeriesTargetAttendeeGroups (
    seriesId VARCHAR(255) NOT NULL,
    targetGroupName VARCHAR(50) NOT NULL,
    PRIMARY KEY (seriesId, targetGroupName),
    FOREIGN KEY (seriesId) REFERENCES MeetingSeries(id) ON DELETE CASCADE,
    FOREIGN KEY (targetGroupName) REFERENCES TargetAttendeeGroups(groupName) ON DELETE CASCADE
);

-- MeetingSeriesWeeklyDays Table (for weekly recurrence)
CREATE TABLE MeetingSeriesWeeklyDays (
    seriesId VARCHAR(255) NOT NULL,
    dayOfWeek VARCHAR(50) NOT NULL CHECK (dayOfWeek IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    PRIMARY KEY (seriesId, dayOfWeek),
    FOREIGN KEY (seriesId) REFERENCES MeetingSeries(id) ON DELETE CASCADE
);

-- MeetingSeriesCancelledDates Table
CREATE TABLE MeetingSeriesCancelledDates (
    seriesId VARCHAR(255) NOT NULL,
    cancelledDate DATE NOT NULL,
    PRIMARY KEY (seriesId, cancelledDate),
    FOREIGN KEY (seriesId) REFERENCES MeetingSeries(id) ON DELETE CASCADE
);

-- Meetings (Instances) Table
CREATE TABLE Meetings (
    id VARCHAR(255) PRIMARY KEY,
    seriesId VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT,
    minute TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seriesId) REFERENCES MeetingSeries(id) ON DELETE CASCADE
);

-- MeetingInstanceExpectedAttendees (Junction for expected attendees per instance, if overriding series targets)
-- This table represents the `attendeeUids` field in the current Meeting type.
CREATE TABLE MeetingInstanceExpectedAttendees (
    meetingId VARCHAR(255) NOT NULL,
    memberId VARCHAR(255) NOT NULL,
    PRIMARY KEY (meetingId, memberId),
    FOREIGN KEY (meetingId) REFERENCES Meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (memberId) REFERENCES Members(id) ON DELETE CASCADE
);

-- AttendanceRecords Table
CREATE TABLE AttendanceRecords (
    id VARCHAR(255) PRIMARY KEY,
    meetingId VARCHAR(255) NOT NULL,
    memberId VARCHAR(255) NOT NULL,
    attended BOOLEAN NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meetingId) REFERENCES Meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (memberId) REFERENCES Members(id) ON DELETE CASCADE
);

-- Insert fixed roles
INSERT INTO Roles (roleName) VALUES ('Leader'), ('Worker'), ('GeneralAttendee');

-- Insert fixed target attendee groups
INSERT INTO TargetAttendeeGroups (groupName) VALUES ('allMembers'), ('workers'), ('leaders');

-- Note on Timestamps:
-- For 'updatedAt', you might want to use database triggers to automatically update this field on row modification.
-- The specific syntax for triggers varies between SQL databases (e.g., PostgreSQL, MySQL).
-- Example for PostgreSQL:
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--    NEW.updatedAt = now();
--    RETURN NEW;
-- END;
-- $$ language 'plpgsql';
--
-- CREATE TRIGGER update_members_updated_at
-- BEFORE UPDATE ON Members
-- FOR EACH ROW
-- EXECUTE FUNCTION update_updated_at_column();
-- (Repeat for other tables)

-- Note on Indexes:
-- Consider adding indexes on foreign key columns and frequently queried columns for performance.
-- Example:
-- CREATE INDEX idx_members_status ON Members(status);
-- CREATE INDEX idx_meetings_date ON Meetings(date);
-- CREATE INDEX idx_attendancerecords_meeting_member ON AttendanceRecords(meetingId, memberId);

