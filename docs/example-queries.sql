-- Example SQL Queries for Grace Hub

-- 1. Get all data for all members
-- This query retrieves all columns from the Members table.
SELECT * FROM Members;

-- 2. Get all members with their assigned GDI name and GDI guide's name
-- This query demonstrates how to join the Members table with the Gdis table
-- and then back to the Members table (for the guide's details).
-- It uses LEFT JOIN to ensure all members are listed, even if they
-- are not assigned to a GDI or if their GDI doesn't have a guide assigned.
SELECT
    m.id AS member_id,
    m.first_name AS member_first_name,
    m.last_name AS member_last_name,
    m.email AS member_email,
    m.phone AS member_phone,
    m.birth_date,
    m.church_join_date,
    m.baptism_date,
    m.attends_life_school,
    m.attends_bible_institute,
    m.from_another_church,
    m.status AS member_status,
    m.avatar_url AS member_avatar_url,
    m.assigned_gdi_id,
    g.name AS gdi_name,
    g.guide_id AS gdi_guide_id,
    guide.first_name AS gdi_guide_first_name,
    guide.last_name AS gdi_guide_last_name
FROM
    Members m
LEFT JOIN
    Gdis g ON m.assigned_gdi_id = g.id
LEFT JOIN
    Members guide ON g.guide_id = guide.id
ORDER BY
    m.last_name, m.first_name;

-- 3. Get all ministry areas with their leader's name
SELECT
    ma.id AS area_id,
    ma.name AS area_name,
    ma.description AS area_description,
    ma.image_url AS area_image_url,
    l.first_name AS leader_first_name,
    l.last_name AS leader_last_name
FROM
    MinistryAreas ma
LEFT JOIN
    Members l ON ma.leader_id = l.id
ORDER BY
    ma.name;

-- 4. Get all members participating in a specific ministry area (e.g., area_id = 'ma1')
SELECT
    m.id AS member_id,
    m.first_name,
    m.last_name,
    m.email
FROM
    Members m
JOIN
    MinistryAreaMembers mam ON m.id = mam.member_id
WHERE
    mam.area_id = 'ma1' -- Replace 'ma1' with the actual ID of the ministry area
ORDER BY
    m.last_name, m.first_name;

-- 5. Get all meeting series
SELECT * FROM MeetingSeries;

-- 6. Get all instances for a specific meeting series (e.g., series_id = 'series1')
SELECT * FROM MeetingInstances WHERE series_id = 'series1'; -- Replace 'series1' with actual ID

-- 7. Get attendance for a specific meeting instance (e.g., instance_id = 'instanceA')
SELECT
    m.first_name,
    m.last_name,
    ar.attended,
    ar.notes
FROM
    AttendanceRecords ar
JOIN
    Members m ON ar.member_id = m.id
WHERE
    ar.meeting_instance_id = 'instanceA' -- Replace 'instanceA' with actual ID
ORDER BY
    m.last_name, m.first_name;

-- More complex queries can be built by joining these tables as needed.
-- For example, to calculate roles, you would query Gdis (for guides) and MinistryAreas (for leaders)
-- and MinistryAreaMembers (for participants) associated with a member's ID.
