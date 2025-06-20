
-- Grace Hub MySQL Schema

SET FOREIGN_KEY_CHECKS=0; -- Disable FK checks temporarily for table creation order

-- -----------------------------------------------------
-- Table `Members`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `Members`;
CREATE TABLE `Members` (
  `id` VARCHAR(255) NOT NULL,
  `firstName` VARCHAR(255) NOT NULL,
  `lastName` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NULL DEFAULT NULL UNIQUE,
  `phone` VARCHAR(50) NOT NULL,
  `birthDate` DATE NULL DEFAULT NULL,
  `churchJoinDate` DATE NULL DEFAULT NULL,
  `baptismDate` VARCHAR(255) NULL DEFAULT NULL,
  `attendsLifeSchool` BOOLEAN NULL DEFAULT FALSE,
  `attendsBibleInstitute` BOOLEAN NULL DEFAULT FALSE,
  `fromAnotherChurch` BOOLEAN NULL DEFAULT FALSE,
  `assignedGDIId` VARCHAR(255) NULL DEFAULT NULL, -- Direct FK for simplicity, assuming one GDI per member
  `status` ENUM('Active', 'Inactive', 'New') NOT NULL DEFAULT 'New',
  `avatarUrl` VARCHAR(2048) NULL DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_member_status` (`status`),
  INDEX `idx_member_assignedGDIId` (`assignedGDIId`)
  -- Foreign key for assignedGDIId will be added after GDIs table is created
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `MinistryAreas`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `MinistryAreas`;
CREATE TABLE `MinistryAreas` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `leaderId` VARCHAR(255) NULL DEFAULT NULL, -- Can be NULL if area is temporarily without leader
  `coordinatorId` VARCHAR(255) NULL DEFAULT NULL,
  `mentorId` VARCHAR(255) NULL DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_MinistryAreas_leaderId_idx` (`leaderId` ASC),
  INDEX `fk_MinistryAreas_coordinatorId_idx` (`coordinatorId` ASC),
  INDEX `fk_MinistryAreas_mentorId_idx` (`mentorId` ASC),
  CONSTRAINT `fk_MinistryAreas_leaderId`
    FOREIGN KEY (`leaderId`)
    REFERENCES `Members` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_MinistryAreas_coordinatorId`
    FOREIGN KEY (`coordinatorId`)
    REFERENCES `Members` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_MinistryAreas_mentorId`
    FOREIGN KEY (`mentorId`)
    REFERENCES `Members` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `GDIs` (Grupos de Integración)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `GDIs`;
CREATE TABLE `GDIs` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `guideId` VARCHAR(255) NULL DEFAULT NULL, -- Can be NULL if GDI is temporarily without guide
  `coordinatorId` VARCHAR(255) NULL DEFAULT NULL,
  `mentorId` VARCHAR(255) NULL DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_GDIs_guideId_idx` (`guideId` ASC),
  INDEX `fk_GDIs_coordinatorId_idx` (`coordinatorId` ASC),
  INDEX `fk_GDIs_mentorId_idx` (`mentorId` ASC),
  CONSTRAINT `fk_GDIs_guideId`
    FOREIGN KEY (`guideId`)
    REFERENCES `Members` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_GDIs_coordinatorId`
    FOREIGN KEY (`coordinatorId`)
    REFERENCES `Members` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_GDIs_mentorId`
    FOREIGN KEY (`mentorId`)
    REFERENCES `Members` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FK constraint from Members to GDIs now that GDIs table exists
ALTER TABLE `Members`
ADD CONSTRAINT `fk_Members_assignedGDIId`
  FOREIGN KEY (`assignedGDIId`)
  REFERENCES `GDIs` (`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------
-- Table `Roles` (Lookup for Member Roles)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `Roles`;
CREATE TABLE `Roles` (
  `name` ENUM('Leader', 'Worker', 'GeneralAttendee') NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `Roles` (`name`) VALUES ('Leader'), ('Worker'), ('GeneralAttendee');

-- -----------------------------------------------------
-- Table `MemberRoles` (Junction table for Members and Roles)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `MemberRoles`;
CREATE TABLE `MemberRoles` (
  `memberId` VARCHAR(255) NOT NULL,
  `roleName` ENUM('Leader', 'Worker', 'GeneralAttendee') NOT NULL,
  PRIMARY KEY (`memberId`, `roleName`),
  INDEX `fk_MemberRoles_roleName_idx` (`roleName` ASC),
  INDEX `fk_MemberRoles_memberId_idx` (`memberId` ASC),
  CONSTRAINT `fk_MemberRoles_memberId`
    FOREIGN KEY (`memberId`)
    REFERENCES `Members` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_MemberRoles_roleName`
    FOREIGN KEY (`roleName`)
    REFERENCES `Roles` (`name`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `MemberMinistryAreas` (Junction table for Members and MinistryAreas)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `MemberMinistryAreas`;
CREATE TABLE `MemberMinistryAreas` (
  `memberId` VARCHAR(255) NOT NULL,
  `ministryAreaId` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`memberId`, `ministryAreaId`),
  INDEX `fk_MemberMinistryAreas_ministryAreaId_idx` (`ministryAreaId` ASC),
  INDEX `fk_MemberMinistryAreas_memberId_idx` (`memberId` ASC),
  CONSTRAINT `fk_MemberMinistryAreas_memberId`
    FOREIGN KEY (`memberId`)
    REFERENCES `Members` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_MemberMinistryAreas_ministryAreaId`
    FOREIGN KEY (`ministryAreaId`)
    REFERENCES `MinistryAreas` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `MemberGDIs` (Junction table for Members (non-guides) and GDIs)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `MemberGDIs`;
CREATE TABLE `MemberGDIs` (
  `memberId` VARCHAR(255) NOT NULL,
  `gdiId` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`memberId`, `gdiId`),
  INDEX `fk_MemberGDIs_gdiId_idx` (`gdiId` ASC),
  INDEX `fk_MemberGDIs_memberId_idx` (`memberId` ASC),
  CONSTRAINT `fk_MemberGDIs_memberId`
    FOREIGN KEY (`memberId`)
    REFERENCES `Members` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_MemberGDIs_gdiId`
    FOREIGN KEY (`gdiId`)
    REFERENCES `GDIs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `MeetingSeries`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `MeetingSeries`;
CREATE TABLE `MeetingSeries` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `defaultTime` TIME NOT NULL,
  `defaultLocation` VARCHAR(255) NOT NULL,
  `seriesType` ENUM('general', 'gdi', 'ministryArea') NOT NULL,
  `ownerGdiId` VARCHAR(255) NULL DEFAULT NULL,
  `ownerMinistryAreaId` VARCHAR(255) NULL DEFAULT NULL,
  `frequency` ENUM('OneTime', 'Weekly', 'Monthly') NOT NULL,
  `oneTimeDate` DATE NULL DEFAULT NULL,
  `monthlyRuleType` ENUM('DayOfMonth', 'DayOfWeekOfMonth') NULL DEFAULT NULL,
  `monthlyDayOfMonth` INT NULL DEFAULT NULL,
  `monthlyWeekOrdinal` ENUM('First', 'Second', 'Third', 'Fourth', 'Last') NULL DEFAULT NULL,
  `monthlyDayOfWeek` ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NULL DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_MeetingSeries_ownerGdiId_idx` (`ownerGdiId` ASC),
  INDEX `fk_MeetingSeries_ownerMinistryAreaId_idx` (`ownerMinistryAreaId` ASC),
  CONSTRAINT `fk_MeetingSeries_ownerGdiId`
    FOREIGN KEY (`ownerGdiId`)
    REFERENCES `GDIs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_MeetingSeries_ownerMinistryAreaId`
    FOREIGN KEY (`ownerMinistryAreaId`)
    REFERENCES `MinistryAreas` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
  -- MySQL does not support complex CHECK constraints like (seriesType = 'general' AND ownerGdiId IS NULL ...) directly.
  -- This logic should be handled at the application layer or via triggers if essential.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `TargetAttendeeGroupLookup` (Lookup table for target attendee groups)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `TargetAttendeeGroupLookup`;
CREATE TABLE `TargetAttendeeGroupLookup` (
  `groupName` ENUM('allMembers', 'workers', 'leaders') NOT NULL,
  PRIMARY KEY (`groupName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `TargetAttendeeGroupLookup` (`groupName`) VALUES ('allMembers'), ('workers'), ('leaders');

-- -----------------------------------------------------
-- Table `MeetingSeriesTargetAttendeeGroups` (Junction for MeetingSeries and TargetAttendeeGroupLookup)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `MeetingSeriesTargetAttendeeGroups`;
CREATE TABLE `MeetingSeriesTargetAttendeeGroups` (
  `meetingSeriesId` VARCHAR(255) NOT NULL,
  `targetGroupName` ENUM('allMembers', 'workers', 'leaders') NOT NULL,
  PRIMARY KEY (`meetingSeriesId`, `targetGroupName`),
  INDEX `fk_MSTAG_targetGroupName_idx` (`targetGroupName` ASC),
  INDEX `fk_MSTAG_meetingSeriesId_idx` (`meetingSeriesId` ASC),
  CONSTRAINT `fk_MSTAG_meetingSeriesId`
    FOREIGN KEY (`meetingSeriesId`)
    REFERENCES `MeetingSeries` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_MSTAG_targetGroupName`
    FOREIGN KEY (`targetGroupName`)
    REFERENCES `TargetAttendeeGroupLookup` (`groupName`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `DayOfWeekLookup` (Lookup table for days of the week)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `DayOfWeekLookup`;
CREATE TABLE `DayOfWeekLookup` (
  `dayName` ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
  PRIMARY KEY (`dayName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `DayOfWeekLookup` (`dayName`) VALUES
('Sunday'), ('Monday'), ('Tuesday'), ('Wednesday'), ('Thursday'), ('Friday'), ('Saturday');

-- -----------------------------------------------------
-- Table `MeetingSeriesWeeklyDays` (Junction for MeetingSeries weekly recurrence)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `MeetingSeriesWeeklyDays`;
CREATE TABLE `MeetingSeriesWeeklyDays` (
  `meetingSeriesId` VARCHAR(255) NOT NULL,
  `dayName` ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
  PRIMARY KEY (`meetingSeriesId`, `dayName`),
  INDEX `fk_MSWD_dayName_idx` (`dayName` ASC),
  INDEX `fk_MSWD_meetingSeriesId_idx` (`meetingSeriesId` ASC),
  CONSTRAINT `fk_MSWD_meetingSeriesId`
    FOREIGN KEY (`meetingSeriesId`)
    REFERENCES `MeetingSeries` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_MSWD_dayName`
    FOREIGN KEY (`dayName`)
    REFERENCES `DayOfWeekLookup` (`dayName`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `MeetingSeriesCancelledDates`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `MeetingSeriesCancelledDates`;
CREATE TABLE `MeetingSeriesCancelledDates` (
  `meetingSeriesId` VARCHAR(255) NOT NULL,
  `cancelledDate` DATE NOT NULL,
  PRIMARY KEY (`meetingSeriesId`, `cancelledDate`),
  INDEX `fk_MSCD_meetingSeriesId_idx` (`meetingSeriesId` ASC),
  CONSTRAINT `fk_MSCD_meetingSeriesId`
    FOREIGN KEY (`meetingSeriesId`)
    REFERENCES `MeetingSeries` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `Meetings` (Meeting Instances)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `Meetings`;
CREATE TABLE `Meetings` (
  `id` VARCHAR(255) NOT NULL,
  `seriesId` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `time` TIME NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `minute` TEXT NULL DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_Meetings_seriesId_idx` (`seriesId` ASC),
  INDEX `idx_meetings_date_time` (`date`, `time`),
  CONSTRAINT `fk_Meetings_seriesId`
    FOREIGN KEY (`seriesId`)
    REFERENCES `MeetingSeries` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `MeetingInstanceExpectedAttendees`
-- This table stores the *explicitly* set list of expected attendees for a specific meeting instance,
-- which might override or supplement the series-level targeting.
-- This addresses the `attendeeUids` field from the JSON structure.
-- -----------------------------------------------------
DROP TABLE IF EXISTS `MeetingInstanceExpectedAttendees`;
CREATE TABLE `MeetingInstanceExpectedAttendees` (
  `meetingId` VARCHAR(255) NOT NULL,
  `memberId` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`meetingId`, `memberId`),
  INDEX `fk_MIEA_memberId_idx` (`memberId` ASC),
  INDEX `fk_MIEA_meetingId_idx` (`meetingId` ASC),
  CONSTRAINT `fk_MIEA_meetingId`
    FOREIGN KEY (`meetingId`)
    REFERENCES `Meetings` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_MIEA_memberId`
    FOREIGN KEY (`memberId`)
    REFERENCES `Members` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `AttendanceRecords`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `AttendanceRecords`;
CREATE TABLE `AttendanceRecords` (
  `id` VARCHAR(255) NOT NULL,
  `meetingId` VARCHAR(255) NOT NULL,
  `memberId` VARCHAR(255) NOT NULL,
  `attended` BOOLEAN NOT NULL DEFAULT FALSE,
  `notes` TEXT NULL DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_attendance_meeting_member` (`meetingId`, `memberId`), -- Ensure one record per member per meeting
  INDEX `fk_AttendanceRecords_memberId_idx` (`memberId` ASC),
  INDEX `fk_AttendanceRecords_meetingId_idx` (`meetingId` ASC),
  CONSTRAINT `fk_AttendanceRecords_meetingId`
    FOREIGN KEY (`meetingId`)
    REFERENCES `Meetings` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_AttendanceRecords_memberId`
    FOREIGN KEY (`memberId`)
    REFERENCES `Members` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1; -- Re-enable FK checks

-- Note on IDs:
-- If you plan to generate UUIDs for your IDs in the application (e.g., using a library),
-- you might consider using `CHAR(36)` for ID columns instead of `VARCHAR(255)`.
-- For numerical auto-incrementing IDs, use `INT AUTO_INCREMENT` as PK and update FKs accordingly.

-- Note on Denormalization (attendeeUids on MeetingSeries/Meeting):
-- The `attendeeUids` array from the JSON structure for `MeetingSeries` (if targeting specific roles)
-- and `Meeting` (if specific instances have overrides) has been handled as follows:
-- 1. `MeetingSeriesTargetAttendeeGroups` handles the role-based targeting for a series.
-- 2. `MeetingInstanceExpectedAttendees` handles specific member lists for individual meeting instances.
-- The actual "expected" list for an instance would be a combination of these, resolved by application logic.

-- Note on calculated `Member.roles`:
-- The `MemberRoles` table stores assigned roles. The actual calculation logic
-- (e.g., a GDI guide is a 'Worker' and 'Leader') should be handled by your application
-- when querying or displaying member roles, or potentially through database views/stored procedures
-- if you want the database to derive them. This script focuses on storing the base assignments.
-- Alternatively, the `calculateMemberRoles` logic from your `roleUtils.ts` would populate `MemberRoles` table.

-- Example of how to populate MemberRoles based on assignments:
-- If member 'X' is guide of GDI 'gdi1', you would INSERT ('X', 'Leader') and ('X', 'Worker') into MemberRoles.
-- If member 'Y' is leader of Area 'ma1', you would INSERT ('Y', 'Leader') and ('Y', 'Worker').
-- If member 'Z' is only a member of GDI 'gdi1' (not guide), INSERT ('Z', 'GeneralAttendee').
-- If member 'W' is only a member of Area 'ma1' (not leader), INSERT ('W', 'Worker').
-- This process would typically happen in your application logic after a member's assignments change.

