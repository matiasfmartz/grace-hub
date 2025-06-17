-- SQL Schema for Grace Hub App

-- -----------------------------------------------------
-- Table `members`
-- Stores information about church members.
-- -----------------------------------------------------
CREATE TABLE members (
  id SERIAL PRIMARY KEY,                      -- Or: INT AUTO_INCREMENT PRIMARY KEY (MySQL), UUID PRIMARY KEY (if preferred)
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50) NOT NULL,
  birth_date DATE NULL,
  church_join_date DATE NULL,
  baptism_date VARCHAR(100) NULL,             -- Free text as per current spec (e.g., "June 2023", "2023-06-15")
  attends_life_school BOOLEAN DEFAULT FALSE,
  attends_bible_institute BOOLEAN DEFAULT FALSE,
  from_another_church BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('Active', 'Inactive', 'New')), -- Consider an ENUM type if DB supports
  avatar_url VARCHAR(2048) NULL,
  assigned_gdi_id INT NULL,                   -- Foreign key to gdis.id, can be NULL if not assigned to a GDI as a participant
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  -- Foreign key for assigned_gdi_id will be added after gdis table is created to avoid circular dependency issues if guide_id is also linked here
);

-- -----------------------------------------------------
-- Table `gdis` (Grupos de Integración)
-- Stores GDI information.
-- -----------------------------------------------------
CREATE TABLE gdis (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  guide_id INT NOT NULL,                      -- Foreign key to members.id, a GDI must have a guide
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gdi_guide FOREIGN KEY (guide_id) REFERENCES members(id) ON DELETE RESTRICT, -- Prevent deleting a member who is a guide
  CONSTRAINT uq_gdi_guide_id UNIQUE (guide_id) -- Assuming a member can only guide one GDI
);

-- Add the foreign key constraint from members.assigned_gdi_id to gdis.id
ALTER TABLE members
ADD CONSTRAINT fk_member_assigned_gdi FOREIGN KEY (assigned_gdi_id) REFERENCES gdis(id) ON DELETE SET NULL;

-- -----------------------------------------------------
-- Table `ministry_areas`
-- Stores ministry area information.
-- -----------------------------------------------------
CREATE TABLE ministry_areas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  leader_id INT NOT NULL,                     -- Foreign key to members.id, an area must have a leader
  image_url VARCHAR(2048) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ministry_area_leader FOREIGN KEY (leader_id) REFERENCES members(id) ON DELETE RESTRICT -- Prevent deleting a member who is a leader
);

-- -----------------------------------------------------
-- Table `member_ministry_area_participation` (Join Table)
-- Manages the M:N relationship between members and ministry areas (for participants).
-- The leader is directly linked in the `ministry_areas` table.
-- -----------------------------------------------------
CREATE TABLE member_ministry_area_participation (
  member_id INT NOT NULL,
  ministry_area_id INT NOT NULL,
  PRIMARY KEY (member_id, ministry_area_id),
  CONSTRAINT fk_participation_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_participation_ministry_area FOREIGN KEY (ministry_area_id) REFERENCES ministry_areas(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table `meeting_series`
-- Defines types or series of meetings.
-- -----------------------------------------------------
CREATE TABLE meeting_series (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  default_time TIME NOT NULL,
  default_location VARCHAR(255) NOT NULL,
  default_image_url VARCHAR(2048) NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('OneTime', 'Weekly', 'Monthly')),
  one_time_date DATE NULL, -- For 'OneTime' frequency
  -- For 'Weekly' frequency, store as JSON array of strings or use a separate join table. Using JSONB for PostgreSQL example.
  -- For other SQL DBs, a TEXT field storing JSON, or a join table `meeting_series_weekly_days(series_id, day_of_week_enum)` would be better.
  weekly_days_json JSONB NULL, -- Example: '["Sunday", "Tuesday"]'
  monthly_rule_type VARCHAR(20) NULL CHECK (monthly_rule_type IN ('DayOfMonth', 'DayOfWeekOfMonth')),
  monthly_day_of_month INT NULL CHECK (monthly_day_of_month >= 1 AND monthly_day_of_month <= 31),
  monthly_week_ordinal VARCHAR(10) NULL CHECK (monthly_week_ordinal IN ('First', 'Second', 'Third', 'Fourth', 'Last')),
  monthly_day_of_week VARCHAR(10) NULL CHECK (monthly_day_of_week IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Table `meeting_series_target_attendee_groups` (Join Table)
-- Manages M:N relationship for which groups are targeted by a meeting series.
-- -----------------------------------------------------
CREATE TABLE meeting_series_target_attendee_groups (
  meeting_series_id INT NOT NULL,
  target_attendee_group VARCHAR(50) NOT NULL CHECK (target_attendee_group IN ('generalAttendees', 'workers', 'leaders')),
  PRIMARY KEY (meeting_series_id, target_attendee_group),
  CONSTRAINT fk_target_meeting_series FOREIGN KEY (meeting_series_id) REFERENCES meeting_series(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table `meetings` (Meeting Instances)
-- Stores specific instances of meetings.
-- -----------------------------------------------------
CREATE TABLE meetings (
  id SERIAL PRIMARY KEY,
  series_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,             -- Can be pre-filled from series or customized
  date DATE NOT NULL,
  time TIME NOT NULL,
  location VARCHAR(255) NOT NULL,
  description TEXT NULL,
  image_url VARCHAR(2048) NULL,
  minute TEXT NULL,                         -- Meeting minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_meeting_series FOREIGN KEY (series_id) REFERENCES meeting_series(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table `meeting_expected_attendees` (Join Table)
-- Stores which members are expected for a specific meeting instance.
-- This is typically derived by application logic based on meeting_series_target_attendee_groups
-- and member roles at the time of meeting instance creation/update.
-- -----------------------------------------------------
CREATE TABLE meeting_expected_attendees (
  meeting_id INT NOT NULL,
  member_id INT NOT NULL,
  PRIMARY KEY (meeting_id, member_id),
  CONSTRAINT fk_expected_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  CONSTRAINT fk_expected_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table `attendance_records`
-- Records attendance for each member at each meeting.
-- -----------------------------------------------------
CREATE TABLE attendance_records (
  id SERIAL PRIMARY KEY,
  meeting_id INT NOT NULL,
  member_id INT NOT NULL,
  attended BOOLEAN NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE (meeting_id, member_id) -- Ensures one attendance record per member per meeting
);

-- -----------------------------------------------------
-- Table `resources`
-- Stores resources like articles, devotionals, etc.
-- -----------------------------------------------------
CREATE TABLE resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('Article', 'Devotional', 'Announcement', 'Sermon Notes')),
  snippet TEXT NOT NULL,
  image_url VARCHAR(2048) NULL,
  link_url VARCHAR(2048) NULL,               -- Link to external resource or detailed view
  content TEXT NULL,                        -- Full content if stored in DB
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --- NOTES ON THE SCHEMA ---

-- Roles (Leader, Worker, GeneralAttendee):
-- These are not stored directly as a persisted field in the `members` table in this DDL.
-- Instead, they are DERIVED roles based on relationships:
-- - A member is a 'Leader' if:
--   - They are `gdis.guide_id` for any GDI.
--   - OR They are `ministry_areas.leader_id` for any Ministry Area.
-- - A member is a 'Worker' if:
--   - They are a 'Leader' (as defined above).
--   - OR They are listed in `member_ministry_area_participation` for any Ministry Area.
-- - A member is a 'GeneralAttendee' if:
--   - `members.assigned_gdi_id` is NOT NULL (meaning they are a participant in a GDI).
-- This logic would typically reside in your application layer or could be implemented
-- using Database Views or Functions for more complex querying if needed.

-- Timestamps:
-- `created_at` and `updated_at` columns are good practice for tracking changes.
-- Most databases can auto-populate `created_at` and have triggers for `updated_at`.

-- `weekly_days_json` in `meeting_series`:
-- Storing multiple selections like weekly days:
-- - JSON/JSONB (as shown for PostgreSQL): Flexible. Example: '["Sunday", "Tuesday"]'.
-- - Separate Join Table (e.g., `meeting_series_weekly_days(series_id INT, day_name VARCHAR(10))`): More normalized, potentially better for complex day-based queries in some SQL databases. This DDL uses JSONB for conciseness in definition.

-- Indexing:
-- For performance on a large scale, add indexes to frequently queried columns,
-- especially foreign keys and columns used in WHERE clauses or JOIN conditions.
-- Example indexes:
-- CREATE INDEX idx_members_name ON members(last_name, first_name);
-- CREATE INDEX idx_members_email ON members(email);
-- CREATE INDEX idx_meetings_date ON meetings(date);
-- CREATE INDEX idx_attendance_meeting_member ON attendance_records(meeting_id, member_id);
-- (Add more as needed based on common query patterns)

-- CASCADE vs RESTRICT vs SET NULL for ON DELETE:
-- - `ON DELETE CASCADE`: If a parent record is deleted, related child records are also deleted. Used for join tables.
-- - `ON DELETE RESTRICT`: Prevents deleting a parent record if child records reference it. Used for guides/leaders to prevent accidental deletion if they are still assigned.
-- - `ON DELETE SET NULL`: If a parent record is deleted, the foreign key in child records is set to NULL. Used for `members.assigned_gdi_id` if a GDI is deleted.
-- Choose these carefully based on your application's data integrity requirements.

