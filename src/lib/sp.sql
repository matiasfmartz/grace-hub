-- Grace Hub Stored Procedures for MySQL

DELIMITER //

-- Helper Procedure to Generate UUIDs (MySQL doesn't have a built-in easy way like some other DBs)
-- DROP PROCEDURE IF EXISTS sp_GenerateId;
-- CREATE PROCEDURE sp_GenerateId(OUT newId VARCHAR(255))
-- BEGIN
--    SET newId = UUID();
-- END //

-- Note: For IDs, this script assumes VARCHAR(255) and that IDs are generated application-side or passed in.
-- If you use AUTO_INCREMENT INTEGER IDs, adjust SP parameters and table definitions.

-- -----------------------------------------------------------------------------
-- Members Stored Procedures
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_GetAllMembers;
CREATE PROCEDURE sp_GetAllMembers(
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_SearchTerm VARCHAR(255),
    IN p_StatusFilters VARCHAR(255), -- Comma-separated list of statuses
    IN p_RoleFilters VARCHAR(255),   -- Comma-separated list of role names
    IN p_GuideIdFilters VARCHAR(1024), -- Comma-separated list of GDI Guide IDs or 'NO_GDI_ASSIGNED'
    IN p_AreaIdFilters VARCHAR(1024)   -- Comma-separated list of Area IDs or 'NO_AREA_ASSIGNED'
)
BEGIN
    DECLARE offset_val INT;
    SET offset_val = (p_PageNumber - 1) * p_PageSize;

    SELECT
        m.id, m.firstName, m.lastName, m.email, m.phone, m.birthDate, m.churchJoinDate,
        m.baptismDate, m.attendsLifeSchool, m.attendsBibleInstitute, m.fromAnotherChurch,
        m.status, m.avatarUrl, m.assignedGDIId, m.createdAt, m.updatedAt,
        (SELECT GROUP_CONCAT(r.name SEPARATOR ',') FROM MemberRoles mr JOIN Roles r ON mr.roleId = r.id WHERE mr.memberId = m.id) as roles,
        (SELECT GROUP_CONCAT(ma.areaId SEPARATOR ',') FROM MemberMinistryAreas ma WHERE ma.memberId = m.id) as assignedAreaIds
    FROM Members m
    -- Filtering logic (this can get complex with comma-separated lists and needs careful implementation or temporary tables)
    -- For simplicity, basic search term and status filter are shown. Full filter implementation in SP is extensive.
    WHERE
        (p_SearchTerm IS NULL OR p_SearchTerm = '' OR
         CONCAT_WS(' ', m.firstName, m.lastName) LIKE CONCAT('%', p_SearchTerm, '%') OR
         m.email LIKE CONCAT('%', p_SearchTerm, '%')) AND
        (p_StatusFilters IS NULL OR p_StatusFilters = '' OR FIND_IN_SET(m.status, p_StatusFilters))
    -- Additional filtering for roles, guide IDs, area IDs would go here, potentially requiring more complex FIND_IN_SET or subqueries
    ORDER BY m.lastName, m.firstName
    LIMIT offset_val, p_PageSize;

    -- To get total count for pagination (simplified here, real version needs to match WHERE clause)
    SELECT COUNT(*) as totalMembers
    FROM Members m
     WHERE
        (p_SearchTerm IS NULL OR p_SearchTerm = '' OR
         CONCAT_WS(' ', m.firstName, m.lastName) LIKE CONCAT('%', p_SearchTerm, '%') OR
         m.email LIKE CONCAT('%', p_SearchTerm, '%')) AND
        (p_StatusFilters IS NULL OR p_StatusFilters = '' OR FIND_IN_SET(m.status, p_StatusFilters));
END //


DROP PROCEDURE IF EXISTS sp_GetMemberById;
CREATE PROCEDURE sp_GetMemberById(IN p_MemberId VARCHAR(255))
BEGIN
    SELECT
        m.id, m.firstName, m.lastName, m.email, m.phone, m.birthDate, m.churchJoinDate,
        m.baptismDate, m.attendsLifeSchool, m.attendsBibleInstitute, m.fromAnotherChurch,
        m.status, m.avatarUrl, m.assignedGDIId, m.createdAt, m.updatedAt,
        (SELECT GROUP_CONCAT(r.name SEPARATOR ',') FROM MemberRoles mr JOIN Roles r ON mr.roleId = r.id WHERE mr.memberId = m.id) as roles,
        (SELECT GROUP_CONCAT(ma.areaId SEPARATOR ',') FROM MemberMinistryAreas ma WHERE ma.memberId = m.id) as assignedAreaIds
    FROM Members m
    WHERE m.id = p_MemberId;
END //

DROP PROCEDURE IF EXISTS sp_AddMember;
CREATE PROCEDURE sp_AddMember(
    IN p_Id VARCHAR(255),
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Email VARCHAR(100),
    IN p_Phone VARCHAR(50),
    IN p_BirthDate DATE,
    IN p_ChurchJoinDate DATE,
    IN p_BaptismDate VARCHAR(100),
    IN p_AttendsLifeSchool BOOLEAN,
    IN p_AttendsBibleInstitute BOOLEAN,
    IN p_FromAnotherChurch BOOLEAN,
    IN p_Status ENUM('Active', 'Inactive', 'New'),
    IN p_AvatarUrl VARCHAR(255),
    IN p_AssignedGDIId VARCHAR(255)
)
BEGIN
    INSERT INTO Members (
        id, firstName, lastName, email, phone, birthDate, churchJoinDate, baptismDate,
        attendsLifeSchool, attendsBibleInstitute, fromAnotherChurch, status, avatarUrl, assignedGDIId
    ) VALUES (
        p_Id, p_FirstName, p_LastName, p_Email, p_Phone, p_BirthDate, p_ChurchJoinDate, p_BaptismDate,
        p_AttendsLifeSchool, p_AttendsBibleInstitute, p_FromAnotherChurch, p_Status, p_AvatarUrl, p_AssignedGDIId
    );
    -- Note: Role and Area assignments would be handled by separate SP calls to MemberRoles and MemberMinistryAreas
END //

DROP PROCEDURE IF EXISTS sp_UpdateMember;
CREATE PROCEDURE sp_UpdateMember(
    IN p_MemberId VARCHAR(255),
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Email VARCHAR(100),
    IN p_Phone VARCHAR(50),
    IN p_BirthDate DATE,
    IN p_ChurchJoinDate DATE,
    IN p_BaptismDate VARCHAR(100),
    IN p_AttendsLifeSchool BOOLEAN,
    IN p_AttendsBibleInstitute BOOLEAN,
    IN p_FromAnotherChurch BOOLEAN,
    IN p_Status ENUM('Active', 'Inactive', 'New'),
    IN p_AvatarUrl VARCHAR(255),
    IN p_AssignedGDIId VARCHAR(255)
)
BEGIN
    UPDATE Members
    SET
        firstName = p_FirstName,
        lastName = p_LastName,
        email = p_Email,
        phone = p_Phone,
        birthDate = p_BirthDate,
        churchJoinDate = p_ChurchJoinDate,
        baptismDate = p_BaptismDate,
        attendsLifeSchool = p_AttendsLifeSchool,
        attendsBibleInstitute = p_AttendsBibleInstitute,
        fromAnotherChurch = p_FromAnotherChurch,
        status = p_Status,
        avatarUrl = p_AvatarUrl,
        assignedGDIId = p_AssignedGDIId,
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = p_MemberId;
    -- Note: Role and Area assignment changes would be handled by separate SP calls
END //

DROP PROCEDURE IF EXISTS sp_DeleteMember;
CREATE PROCEDURE sp_DeleteMember(IN p_MemberId VARCHAR(255))
BEGIN
    -- This is a simplified delete. In a real system, you'd need to handle:
    -- 1. Unassigning as GDI Guide, Area Leader, Coordinator, Mentor
    -- 2. Removing from GDI/Area member lists
    -- 3. Deleting from MemberRoles, MemberMinistryAreas
    -- 4. Deleting AttendanceRecords
    -- This might involve cascading deletes in the table schema or more logic here.
    START TRANSACTION;
        DELETE FROM AttendanceRecords WHERE memberId = p_MemberId;
        DELETE FROM MemberRoles WHERE memberId = p_MemberId;
        DELETE FROM MemberMinistryAreas WHERE memberId = p_MemberId;
        -- If member is a guide, nullify guideId in GDIs or reassign
        UPDATE GDIs SET guideId = NULL WHERE guideId = p_MemberId;
        UPDATE GDIs SET coordinatorId = NULL WHERE coordinatorId = p_MemberId;
        UPDATE GDIs SET mentorId = NULL WHERE mentorId = p_MemberId;
        -- If member is a leader, nullify leaderId in MinistryAreas or reassign
        UPDATE MinistryAreas SET leaderId = NULL WHERE leaderId = p_MemberId;
        UPDATE MinistryAreas SET coordinatorId = NULL WHERE coordinatorId = p_MemberId;
        UPDATE MinistryAreas SET mentorId = NULL WHERE mentorId = p_MemberId;

        DELETE FROM Members WHERE id = p_MemberId;
    COMMIT;
END //


-- -----------------------------------------------------------------------------
-- MemberRoles Stored Procedures
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_SetMemberRoles;
CREATE PROCEDURE sp_SetMemberRoles(IN p_MemberId VARCHAR(255), IN p_RoleNamesCsv TEXT) -- CSV of role names e.g. "Leader,Worker"
BEGIN
    DECLARE role_name_single VARCHAR(100);
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur CURSOR FOR SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_RoleNamesCsv, ',', numbers.n), ',', -1))
                           FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) numbers -- Adjust if more roles possible
                           WHERE CHAR_LENGTH(p_RoleNamesCsv) - CHAR_LENGTH(REPLACE(p_RoleNamesCsv, ',', '')) >= numbers.n - 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    START TRANSACTION;
        -- Clear existing roles for the member
        DELETE FROM MemberRoles WHERE memberId = p_MemberId;

        -- Add new roles
        OPEN cur;
        read_loop: LOOP
            FETCH cur INTO role_name_single;
            IF done THEN
                LEAVE read_loop;
            END IF;

            IF role_name_single IS NOT NULL AND role_name_single != '' THEN
                INSERT INTO MemberRoles (memberId, roleId)
                SELECT p_MemberId, r.id
                FROM Roles r
                WHERE r.name = role_name_single
                ON DUPLICATE KEY UPDATE memberId = p_MemberId; -- Should not happen if we delete first
            END IF;
        END LOOP;
        CLOSE cur;
    COMMIT;
END //;

-- -----------------------------------------------------------------------------
-- MemberMinistryAreas Stored Procedures
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_SetMemberMinistryAreas;
CREATE PROCEDURE sp_SetMemberMinistryAreas(IN p_MemberId VARCHAR(255), IN p_AreaIdsCsv TEXT) -- CSV of area IDs
BEGIN
    DECLARE area_id_single VARCHAR(255);
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur_areas CURSOR FOR SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_AreaIdsCsv, ',', numbers.n), ',', -1))
                           FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) numbers -- Adjust if more areas possible
                           WHERE CHAR_LENGTH(p_AreaIdsCsv) - CHAR_LENGTH(REPLACE(p_AreaIdsCsv, ',', '')) >= numbers.n - 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    START TRANSACTION;
        DELETE FROM MemberMinistryAreas WHERE memberId = p_MemberId;

        OPEN cur_areas;
        read_loop_areas: LOOP
            FETCH cur_areas INTO area_id_single;
            IF done THEN
                LEAVE read_loop_areas;
            END IF;
            IF area_id_single IS NOT NULL AND area_id_single != '' THEN
                INSERT INTO MemberMinistryAreas (memberId, areaId) VALUES (p_MemberId, area_id_single)
                ON DUPLICATE KEY UPDATE memberId = p_MemberId;
            END IF;
        END LOOP;
        CLOSE cur_areas;
    COMMIT;
END //

-- -----------------------------------------------------------------------------
-- GDIs Stored Procedures
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_GetAllGdis;
CREATE PROCEDURE sp_GetAllGdis()
BEGIN
    SELECT id, name, guideId, coordinatorId, mentorId, createdAt, updatedAt,
           (SELECT GROUP_CONCAT(memberId SEPARATOR ',') FROM MemberGDIs mg WHERE mg.gdiId = g.id) as memberIds
    FROM GDIs g;
END //

DROP PROCEDURE IF EXISTS sp_GetGdiById;
CREATE PROCEDURE sp_GetGdiById(IN p_GdiId VARCHAR(255))
BEGIN
    SELECT id, name, guideId, coordinatorId, mentorId, createdAt, updatedAt,
           (SELECT GROUP_CONCAT(memberId SEPARATOR ',') FROM MemberGDIs mg WHERE mg.gdiId = g.id) as memberIds
    FROM GDIs g
    WHERE g.id = p_GdiId;
END //

DROP PROCEDURE IF EXISTS sp_AddGdi;
CREATE PROCEDURE sp_AddGdi(
    IN p_Id VARCHAR(255),
    IN p_Name VARCHAR(100),
    IN p_GuideId VARCHAR(255),
    IN p_CoordinatorId VARCHAR(255),
    IN p_MentorId VARCHAR(255),
    IN p_MemberIdsCsv TEXT -- Comma-separated list of member IDs
)
BEGIN
    DECLARE member_id_single VARCHAR(255);
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur_gdi_members CURSOR FOR SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_MemberIdsCsv, ',', numbers.n), ',', -1))
                           FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) numbers -- Adjust if more members possible
                           WHERE p_MemberIdsCsv IS NOT NULL AND p_MemberIdsCsv != '' AND CHAR_LENGTH(p_MemberIdsCsv) - CHAR_LENGTH(REPLACE(p_MemberIdsCsv, ',', '')) >= numbers.n - 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    START TRANSACTION;
        INSERT INTO GDIs (id, name, guideId, coordinatorId, mentorId)
        VALUES (p_Id, p_Name, p_GuideId, p_CoordinatorId, p_MentorId);

        -- Update member's assignedGDIId for the guide
        UPDATE Members SET assignedGDIId = p_Id WHERE id = p_GuideId;

        IF p_MemberIdsCsv IS NOT NULL AND p_MemberIdsCsv != '' THEN
            OPEN cur_gdi_members;
            read_loop_gdi_members: LOOP
                FETCH cur_gdi_members INTO member_id_single;
                IF done THEN
                    LEAVE read_loop_gdi_members;
                END IF;
                IF member_id_single IS NOT NULL AND member_id_single != '' AND member_id_single != p_GuideId THEN
                    INSERT INTO MemberGDIs (gdiId, memberId) VALUES (p_Id, member_id_single);
                    -- Also update the Member's primary GDI assignment
                    UPDATE Members SET assignedGDIId = p_Id WHERE id = member_id_single;
                END IF;
            END LOOP;
            CLOSE cur_gdi_members;
        END IF;
    COMMIT;
END //

DROP PROCEDURE IF EXISTS sp_UpdateGdi;
CREATE PROCEDURE sp_UpdateGdi(
    IN p_GdiId VARCHAR(255),
    IN p_Name VARCHAR(100),
    IN p_GuideId VARCHAR(255),
    IN p_CoordinatorId VARCHAR(255),
    IN p_MentorId VARCHAR(255),
    IN p_MemberIdsCsv TEXT -- Comma-separated list of new member IDs
)
BEGIN
    DECLARE old_guide_id VARCHAR(255);
    DECLARE member_id_single VARCHAR(255);
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur_gdi_members_update CURSOR FOR SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_MemberIdsCsv, ',', numbers.n), ',', -1))
                           FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) numbers
                           WHERE p_MemberIdsCsv IS NOT NULL AND p_MemberIdsCsv != '' AND CHAR_LENGTH(p_MemberIdsCsv) - CHAR_LENGTH(REPLACE(p_MemberIdsCsv, ',', '')) >= numbers.n - 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    SELECT guideId INTO old_guide_id FROM GDIs WHERE id = p_GdiId;

    START TRANSACTION;
        UPDATE GDIs
        SET
            name = p_Name,
            guideId = p_GuideId,
            coordinatorId = p_CoordinatorId,
            mentorId = p_MentorId,
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = p_GdiId;

        -- Handle guide change
        IF old_guide_id IS NOT NULL AND old_guide_id != p_GuideId THEN
            UPDATE Members SET assignedGDIId = NULL WHERE id = old_guide_id AND assignedGDIId = p_GdiId;
        END IF;
        IF p_GuideId IS NOT NULL THEN
             UPDATE Members SET assignedGDIId = p_GdiId WHERE id = p_GuideId;
        END IF;

        -- Update GDI members
        -- First, remove all existing non-guide members for this GDI
        DELETE FROM MemberGDIs WHERE gdiId = p_GdiId;
        -- Then, unassign GDI from members who were previously in this GDI (excluding new guide and new members)
        UPDATE Members m
        LEFT JOIN (
            SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_MemberIdsCsv, ',', numbers.n), ',', -1)) AS member_id
            FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) numbers
            WHERE p_MemberIdsCsv IS NOT NULL AND p_MemberIdsCsv != '' AND CHAR_LENGTH(p_MemberIdsCsv) - CHAR_LENGTH(REPLACE(p_MemberIdsCsv, ',', '')) >= numbers.n - 1
        ) AS new_members ON m.id = new_members.member_id
        SET m.assignedGDIId = NULL
        WHERE m.assignedGDIId = p_GdiId AND m.id != p_GuideId AND new_members.member_id IS NULL;


        -- Add new members
        IF p_MemberIdsCsv IS NOT NULL AND p_MemberIdsCsv != '' THEN
            SET done = FALSE; -- Reset done flag for new cursor
            OPEN cur_gdi_members_update;
            read_loop_gdi_members_update: LOOP
                FETCH cur_gdi_members_update INTO member_id_single;
                IF done THEN
                    LEAVE read_loop_gdi_members_update;
                END IF;
                IF member_id_single IS NOT NULL AND member_id_single != '' AND member_id_single != p_GuideId THEN
                    INSERT INTO MemberGDIs (gdiId, memberId) VALUES (p_GdiId, member_id_single);
                    UPDATE Members SET assignedGDIId = p_GdiId WHERE id = member_id_single;
                END IF;
            END LOOP;
            CLOSE cur_gdi_members_update;
        END IF;
    COMMIT;
END //


DROP PROCEDURE IF EXISTS sp_DeleteGdi;
CREATE PROCEDURE sp_DeleteGdi(IN p_GdiId VARCHAR(255))
BEGIN
    START TRANSACTION;
        -- Remove GDI assignment from members
        UPDATE Members SET assignedGDIId = NULL WHERE assignedGDIId = p_GdiId;
        DELETE FROM MemberGDIs WHERE gdiId = p_GdiId;

        -- Delete associated meeting series, instances, and attendance
        -- This requires finding series, then meetings, then attendance.
        -- For simplicity, assuming a cascade delete is set up at DB level or handled by app logic calling SPs for those.
        -- Here's a placeholder for what might be needed if not cascaded:
        -- DELETE FROM AttendanceRecords WHERE meetingId IN (SELECT id FROM Meetings WHERE seriesId IN (SELECT id FROM MeetingSeries WHERE seriesType = 'gdi' AND ownerGdiId = p_GdiId));
        -- DELETE FROM Meetings WHERE seriesId IN (SELECT id FROM MeetingSeries WHERE seriesType = 'gdi' AND ownerGdiId = p_GdiId);
        -- DELETE FROM MeetingSeriesTargetAttendeeGroups WHERE seriesId IN (SELECT id FROM MeetingSeries WHERE seriesType = 'gdi' AND ownerGdiId = p_GdiId);
        -- DELETE FROM MeetingSeriesWeeklyDays WHERE seriesId IN (SELECT id FROM MeetingSeries WHERE seriesType = 'gdi' AND ownerGdiId = p_GdiId);
        -- DELETE FROM MeetingSeries WHERE seriesType = 'gdi' AND ownerGdiId = p_GdiId;

        DELETE FROM GDIs WHERE id = p_GdiId;
    COMMIT;
END //


-- -----------------------------------------------------------------------------
-- MinistryAreas Stored Procedures
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_GetAllMinistryAreas;
CREATE PROCEDURE sp_GetAllMinistryAreas()
BEGIN
    SELECT ma.id, ma.name, ma.description, ma.leaderId, ma.coordinatorId, ma.mentorId, ma.createdAt, ma.updatedAt,
           (SELECT GROUP_CONCAT(mma.memberId SEPARATOR ',') FROM MemberMinistryAreas mma WHERE mma.areaId = ma.id) as memberIds
    FROM MinistryAreas ma;
END //

DROP PROCEDURE IF EXISTS sp_GetMinistryAreaById;
CREATE PROCEDURE sp_GetMinistryAreaById(IN p_AreaId VARCHAR(255))
BEGIN
    SELECT ma.id, ma.name, ma.description, ma.leaderId, ma.coordinatorId, ma.mentorId, ma.createdAt, ma.updatedAt,
           (SELECT GROUP_CONCAT(mma.memberId SEPARATOR ',') FROM MemberMinistryAreas mma WHERE mma.areaId = ma.id) as memberIds
    FROM MinistryAreas ma
    WHERE ma.id = p_AreaId;
END //

DROP PROCEDURE IF EXISTS sp_AddMinistryArea;
CREATE PROCEDURE sp_AddMinistryArea(
    IN p_Id VARCHAR(255),
    IN p_Name VARCHAR(100),
    IN p_Description TEXT,
    IN p_LeaderId VARCHAR(255),
    IN p_CoordinatorId VARCHAR(255),
    IN p_MentorId VARCHAR(255),
    IN p_MemberIdsCsv TEXT -- Comma-separated list of member IDs
)
BEGIN
    DECLARE member_id_single VARCHAR(255);
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur_area_members CURSOR FOR SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_MemberIdsCsv, ',', numbers.n), ',', -1))
                           FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) numbers
                           WHERE p_MemberIdsCsv IS NOT NULL AND p_MemberIdsCsv != '' AND CHAR_LENGTH(p_MemberIdsCsv) - CHAR_LENGTH(REPLACE(p_MemberIdsCsv, ',', '')) >= numbers.n - 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    START TRANSACTION;
        INSERT INTO MinistryAreas (id, name, description, leaderId, coordinatorId, mentorId)
        VALUES (p_Id, p_Name, p_Description, p_LeaderId, p_CoordinatorId, p_MentorId);

        -- Add leader to MemberMinistryAreas if not already (they are implicitly part of it)
        -- or handle this at application level. For this SP, we focus on explicit members.

        IF p_MemberIdsCsv IS NOT NULL AND p_MemberIdsCsv != '' THEN
            OPEN cur_area_members;
            read_loop_area_members: LOOP
                FETCH cur_area_members INTO member_id_single;
                IF done THEN
                    LEAVE read_loop_area_members;
                END IF;
                IF member_id_single IS NOT NULL AND member_id_single != '' AND member_id_single != p_LeaderId THEN
                    INSERT INTO MemberMinistryAreas (areaId, memberId) VALUES (p_Id, member_id_single);
                END IF;
            END LOOP;
            CLOSE cur_area_members;
        END IF;
    COMMIT;
END //

DROP PROCEDURE IF EXISTS sp_UpdateMinistryArea;
CREATE PROCEDURE sp_UpdateMinistryArea(
    IN p_AreaId VARCHAR(255),
    IN p_Name VARCHAR(100),
    IN p_Description TEXT,
    IN p_LeaderId VARCHAR(255),
    IN p_CoordinatorId VARCHAR(255),
    IN p_MentorId VARCHAR(255),
    IN p_MemberIdsCsv TEXT
)
BEGIN
    DECLARE member_id_single VARCHAR(255);
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur_area_members_update CURSOR FOR SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_MemberIdsCsv, ',', numbers.n), ',', -1))
                           FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) numbers
                           WHERE p_MemberIdsCsv IS NOT NULL AND p_MemberIdsCsv != '' AND CHAR_LENGTH(p_MemberIdsCsv) - CHAR_LENGTH(REPLACE(p_MemberIdsCsv, ',', '')) >= numbers.n - 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    START TRANSACTION;
        UPDATE MinistryAreas
        SET
            name = p_Name,
            description = p_Description,
            leaderId = p_LeaderId,
            coordinatorId = p_CoordinatorId,
            mentorId = p_MentorId,
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = p_AreaId;

        -- Update area members
        DELETE FROM MemberMinistryAreas WHERE areaId = p_AreaId;
        IF p_MemberIdsCsv IS NOT NULL AND p_MemberIdsCsv != '' THEN
            OPEN cur_area_members_update;
            read_loop_area_members_update: LOOP
                FETCH cur_area_members_update INTO member_id_single;
                IF done THEN
                    LEAVE read_loop_area_members_update;
                END IF;
                 IF member_id_single IS NOT NULL AND member_id_single != '' AND member_id_single != p_LeaderId THEN
                    INSERT INTO MemberMinistryAreas (areaId, memberId) VALUES (p_AreaId, member_id_single);
                END IF;
            END LOOP;
            CLOSE cur_area_members_update;
        END IF;
    COMMIT;
END //

DROP PROCEDURE IF EXISTS sp_DeleteMinistryArea;
CREATE PROCEDURE sp_DeleteMinistryArea(IN p_AreaId VARCHAR(255))
BEGIN
    START TRANSACTION;
        DELETE FROM MemberMinistryAreas WHERE areaId = p_AreaId;
        -- Cascade delete logic for MeetingSeries, Meetings, Attendance (similar to sp_DeleteGdi)
        -- DELETE FROM AttendanceRecords WHERE meetingId IN (SELECT id FROM Meetings WHERE seriesId IN (SELECT id FROM MeetingSeries WHERE seriesType = 'ministryArea' AND ownerMinistryAreaId = p_AreaId));
        -- DELETE FROM Meetings WHERE seriesId IN (SELECT id FROM MeetingSeries WHERE seriesType = 'ministryArea' AND ownerMinistryAreaId = p_AreaId);
        -- DELETE FROM MeetingSeriesTargetAttendeeGroups WHERE seriesId IN (SELECT id FROM MeetingSeries WHERE seriesType = 'ministryArea' AND ownerMinistryAreaId = p_AreaId);
        -- DELETE FROM MeetingSeriesWeeklyDays WHERE seriesId IN (SELECT id FROM MeetingSeries WHERE seriesType = 'ministryArea' AND ownerMinistryAreaId = p_AreaId);
        -- DELETE FROM MeetingSeries WHERE seriesType = 'ministryArea' AND ownerMinistryAreaId = p_AreaId;

        DELETE FROM MinistryAreas WHERE id = p_AreaId;
    COMMIT;
END //


-- -----------------------------------------------------------------------------
-- MeetingSeries Stored Procedures
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_GetAllMeetingSeries;
CREATE PROCEDURE sp_GetAllMeetingSeries()
BEGIN
    SELECT
        ms.id, ms.name, ms.description, ms.defaultTime, ms.defaultLocation,
        ms.seriesType, ms.ownerGdiId, ms.ownerMinistryAreaId, ms.frequency, ms.oneTimeDate,
        ms.monthlyRuleType, ms.monthlyDayOfMonth, ms.monthlyWeekOrdinal, ms.monthlyDayOfWeek,
        ms.createdAt, ms.updatedAt,
        (SELECT GROUP_CONCAT(tag.attendeeGroup SEPARATOR ',') FROM MeetingSeriesTargetAttendeeGroups tag WHERE tag.seriesId = ms.id) as targetAttendeeGroups,
        (SELECT GROUP_CONCAT(wd.dayOfWeek SEPARATOR ',') FROM MeetingSeriesWeeklyDays wd WHERE wd.seriesId = ms.id) as weeklyDays,
        (SELECT GROUP_CONCAT(cd.cancelledDate SEPARATOR ',') FROM MeetingSeriesCancelledDates cd WHERE cd.seriesId = ms.id) as cancelledDates
    FROM MeetingSeries ms;
END //

DROP PROCEDURE IF EXISTS sp_GetMeetingSeriesById;
CREATE PROCEDURE sp_GetMeetingSeriesById(IN p_SeriesId VARCHAR(255))
BEGIN
    SELECT
        ms.id, ms.name, ms.description, ms.defaultTime, ms.defaultLocation,
        ms.seriesType, ms.ownerGdiId, ms.ownerMinistryAreaId, ms.frequency, ms.oneTimeDate,
        ms.monthlyRuleType, ms.monthlyDayOfMonth, ms.monthlyWeekOrdinal, ms.monthlyDayOfWeek,
        ms.createdAt, ms.updatedAt,
        (SELECT GROUP_CONCAT(tag.attendeeGroup SEPARATOR ',') FROM MeetingSeriesTargetAttendeeGroups tag WHERE tag.seriesId = ms.id) as targetAttendeeGroups,
        (SELECT GROUP_CONCAT(wd.dayOfWeek SEPARATOR ',') FROM MeetingSeriesWeeklyDays wd WHERE wd.seriesId = ms.id) as weeklyDays,
        (SELECT GROUP_CONCAT(cd.cancelledDate SEPARATOR ',') FROM MeetingSeriesCancelledDates cd WHERE cd.seriesId = ms.id) as cancelledDates
    FROM MeetingSeries ms
    WHERE ms.id = p_SeriesId;
END //

DROP PROCEDURE IF EXISTS sp_AddMeetingSeries;
CREATE PROCEDURE sp_AddMeetingSeries(
    IN p_Id VARCHAR(255),
    IN p_Name VARCHAR(100),
    IN p_Description TEXT,
    IN p_DefaultTime TIME,
    IN p_DefaultLocation VARCHAR(255),
    IN p_SeriesType ENUM('general', 'gdi', 'ministryArea'),
    IN p_OwnerGdiId VARCHAR(255),
    IN p_OwnerMinistryAreaId VARCHAR(255),
    IN p_Frequency ENUM('OneTime', 'Weekly', 'Monthly'),
    IN p_OneTimeDate DATE,
    IN p_MonthlyRuleType ENUM('DayOfMonth', 'DayOfWeekOfMonth'),
    IN p_MonthlyDayOfMonth INT,
    IN p_MonthlyWeekOrdinal ENUM('First', 'Second', 'Third', 'Fourth', 'Last'),
    IN p_MonthlyDayOfWeek ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
    IN p_TargetAttendeeGroupsCsv TEXT, -- Comma-separated, e.g., "allMembers,leaders"
    IN p_WeeklyDaysCsv TEXT -- Comma-separated, e.g., "Sunday,Wednesday"
)
BEGIN
    DECLARE group_name_single VARCHAR(100);
    DECLARE day_name_single VARCHAR(20);
    DECLARE done_groups, done_days INT DEFAULT FALSE;

    DECLARE cur_groups CURSOR FOR SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_TargetAttendeeGroupsCsv, ',', numbers.n), ',', -1))
                           FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3) numbers
                           WHERE p_TargetAttendeeGroupsCsv IS NOT NULL AND p_TargetAttendeeGroupsCsv != '' AND CHAR_LENGTH(p_TargetAttendeeGroupsCsv) - CHAR_LENGTH(REPLACE(p_TargetAttendeeGroupsCsv, ',', '')) >= numbers.n - 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done_groups = TRUE;

    DECLARE cur_days CURSOR FOR SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_WeeklyDaysCsv, ',', numbers.n), ',', -1))
                           FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7) numbers
                           WHERE p_WeeklyDaysCsv IS NOT NULL AND p_WeeklyDaysCsv != '' AND CHAR_LENGTH(p_WeeklyDaysCsv) - CHAR_LENGTH(REPLACE(p_WeeklyDaysCsv, ',', '')) >= numbers.n - 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done_days = TRUE;


    START TRANSACTION;
        INSERT INTO MeetingSeries (
            id, name, description, defaultTime, defaultLocation, seriesType, ownerGdiId, ownerMinistryAreaId,
            frequency, oneTimeDate, monthlyRuleType, monthlyDayOfMonth, monthlyWeekOrdinal, monthlyDayOfWeek
        ) VALUES (
            p_Id, p_Name, p_Description, p_DefaultTime, p_DefaultLocation, p_SeriesType, p_OwnerGdiId, p_OwnerMinistryAreaId,
            p_Frequency, p_OneTimeDate, p_MonthlyRuleType, p_MonthlyDayOfMonth, p_MonthlyWeekOrdinal, p_MonthlyDayOfWeek
        );

        IF p_TargetAttendeeGroupsCsv IS NOT NULL AND p_TargetAttendeeGroupsCsv != '' THEN
            OPEN cur_groups;
            read_loop_groups: LOOP
                FETCH cur_groups INTO group_name_single;
                IF done_groups THEN
                    LEAVE read_loop_groups;
                END IF;
                IF group_name_single IS NOT NULL AND group_name_single != '' THEN
                    INSERT INTO MeetingSeriesTargetAttendeeGroups (seriesId, attendeeGroup)
                    SELECT p_Id, tag.id
                    FROM TargetAttendeeGroups tag
                    WHERE tag.name = group_name_single;
                END IF;
            END LOOP;
            CLOSE cur_groups;
        END IF;

        IF p_Frequency = 'Weekly' AND p_WeeklyDaysCsv IS NOT NULL AND p_WeeklyDaysCsv != '' THEN
            SET done_days = FALSE; -- Reset for new cursor
            OPEN cur_days;
            read_loop_days: LOOP
                FETCH cur_days INTO day_name_single;
                IF done_days THEN
                    LEAVE read_loop_days;
                END IF;
                IF day_name_single IS NOT NULL AND day_name_single != '' THEN
                    INSERT INTO MeetingSeriesWeeklyDays (seriesId, dayOfWeek) VALUES (p_Id, day_name_single);
                END IF;
            END LOOP;
            CLOSE cur_days;
        END IF;
    COMMIT;
END //

DROP PROCEDURE IF EXISTS sp_UpdateMeetingSeries;
CREATE PROCEDURE sp_UpdateMeetingSeries(
    IN p_SeriesId VARCHAR(255),
    IN p_Name VARCHAR(100),
    IN p_Description TEXT,
    IN p_DefaultTime TIME,
    IN p_DefaultLocation VARCHAR(255),
    -- p_SeriesType, p_OwnerGdiId, p_OwnerMinistryAreaId typically don't change, or handled carefully
    IN p_Frequency ENUM('OneTime', 'Weekly', 'Monthly'),
    IN p_OneTimeDate DATE,
    IN p_MonthlyRuleType ENUM('DayOfMonth', 'DayOfWeekOfMonth'),
    IN p_MonthlyDayOfMonth INT,
    IN p_MonthlyWeekOrdinal ENUM('First', 'Second', 'Third', 'Fourth', 'Last'),
    IN p_MonthlyDayOfWeek ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
    IN p_TargetAttendeeGroupsCsv TEXT,
    IN p_WeeklyDaysCsv TEXT,
    IN p_CancelledDatesCsv TEXT
)
BEGIN
    DECLARE group_name_single VARCHAR(100);
    DECLARE day_name_single VARCHAR(20);
    DECLARE date_single DATE;
    DECLARE done_groups, done_days, done_cancelled_dates INT DEFAULT FALSE;

    DECLARE cur_groups_update CURSOR FOR SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_TargetAttendeeGroupsCsv, ',', numbers.n), ',', -1))
                           FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3) numbers
                           WHERE p_TargetAttendeeGroupsCsv IS NOT NULL AND p_TargetAttendeeGroupsCsv != '' AND CHAR_LENGTH(p_TargetAttendeeGroupsCsv) - CHAR_LENGTH(REPLACE(p_TargetAttendeeGroupsCsv, ',', '')) >= numbers.n - 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done_groups = TRUE;

    DECLARE cur_days_update CURSOR FOR SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_WeeklyDaysCsv, ',', numbers.n), ',', -1))
                           FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7) numbers
                           WHERE p_WeeklyDaysCsv IS NOT NULL AND p_WeeklyDaysCsv != '' AND CHAR_LENGTH(p_WeeklyDaysCsv) - CHAR_LENGTH(REPLACE(p_WeeklyDaysCsv, ',', '')) >= numbers.n - 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done_days = TRUE;

    DECLARE cur_cancelled_dates CURSOR FOR SELECT DISTINCT STR_TO_DATE(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_CancelledDatesCsv, ',', numbers.n), ',', -1)), '%Y-%m-%d')
                           FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) numbers -- Max 5 cancelled dates in one go, adjust if needed
                           WHERE p_CancelledDatesCsv IS NOT NULL AND p_CancelledDatesCsv != '' AND CHAR_LENGTH(p_CancelledDatesCsv) - CHAR_LENGTH(REPLACE(p_CancelledDatesCsv, ',', '')) >= numbers.n - 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done_cancelled_dates = TRUE;


    START TRANSACTION;
        UPDATE MeetingSeries
        SET
            name = p_Name,
            description = p_Description,
            defaultTime = p_DefaultTime,
            defaultLocation = p_DefaultLocation,
            frequency = p_Frequency,
            oneTimeDate = CASE WHEN p_Frequency = 'OneTime' THEN p_OneTimeDate ELSE NULL END,
            monthlyRuleType = CASE WHEN p_Frequency = 'Monthly' THEN p_MonthlyRuleType ELSE NULL END,
            monthlyDayOfMonth = CASE WHEN p_Frequency = 'Monthly' AND p_MonthlyRuleType = 'DayOfMonth' THEN p_MonthlyDayOfMonth ELSE NULL END,
            monthlyWeekOrdinal = CASE WHEN p_Frequency = 'Monthly' AND p_MonthlyRuleType = 'DayOfWeekOfMonth' THEN p_MonthlyWeekOrdinal ELSE NULL END,
            monthlyDayOfWeek = CASE WHEN p_Frequency = 'Monthly' AND p_MonthlyRuleType = 'DayOfWeekOfMonth' THEN p_MonthlyDayOfWeek ELSE NULL END,
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = p_SeriesId;

        DELETE FROM MeetingSeriesTargetAttendeeGroups WHERE seriesId = p_SeriesId;
        IF p_TargetAttendeeGroupsCsv IS NOT NULL AND p_TargetAttendeeGroupsCsv != '' THEN
            OPEN cur_groups_update;
            read_loop_groups_update: LOOP
                FETCH cur_groups_update INTO group_name_single;
                IF done_groups THEN
                    LEAVE read_loop_groups_update;
                END IF;
                IF group_name_single IS NOT NULL AND group_name_single != '' THEN
                    INSERT INTO MeetingSeriesTargetAttendeeGroups (seriesId, attendeeGroup)
                    SELECT p_SeriesId, tag.id
                    FROM TargetAttendeeGroups tag
                    WHERE tag.name = group_name_single;
                END IF;
            END LOOP;
            CLOSE cur_groups_update;
        END IF;

        DELETE FROM MeetingSeriesWeeklyDays WHERE seriesId = p_SeriesId;
        IF p_Frequency = 'Weekly' AND p_WeeklyDaysCsv IS NOT NULL AND p_WeeklyDaysCsv != '' THEN
            SET done_days = FALSE; -- Reset for new cursor
            OPEN cur_days_update;
            read_loop_days_update: LOOP
                FETCH cur_days_update INTO day_name_single;
                IF done_days THEN
                    LEAVE read_loop_days_update;
                END IF;
                 IF day_name_single IS NOT NULL AND day_name_single != '' THEN
                    INSERT INTO MeetingSeriesWeeklyDays (seriesId, dayOfWeek) VALUES (p_SeriesId, day_name_single);
                END IF;
            END LOOP;
            CLOSE cur_days_update;
        END IF;

        DELETE FROM MeetingSeriesCancelledDates WHERE seriesId = p_SeriesId;
        IF p_CancelledDatesCsv IS NOT NULL AND p_CancelledDatesCsv != '' THEN
            SET done_cancelled_dates = FALSE; -- Reset
            OPEN cur_cancelled_dates;
            read_loop_cancelled_dates: LOOP
                FETCH cur_cancelled_dates INTO date_single;
                IF done_cancelled_dates THEN
                    LEAVE read_loop_cancelled_dates;
                END IF;
                IF date_single IS NOT NULL THEN
                    INSERT INTO MeetingSeriesCancelledDates (seriesId, cancelledDate) VALUES (p_SeriesId, date_single);
                END IF;
            END LOOP;
            CLOSE cur_cancelled_dates;
        END IF;

    COMMIT;
END //

DROP PROCEDURE IF EXISTS sp_DeleteMeetingSeries;
CREATE PROCEDURE sp_DeleteMeetingSeries(IN p_SeriesId VARCHAR(255))
BEGIN
    START TRANSACTION;
        -- Delete attendance records for meetings in this series
        DELETE FROM AttendanceRecords WHERE meetingId IN (SELECT id FROM Meetings WHERE seriesId = p_SeriesId);
        -- Delete meetings (instances) of this series
        DELETE FROM Meetings WHERE seriesId = p_SeriesId;
        -- Delete from junction tables
        DELETE FROM MeetingSeriesTargetAttendeeGroups WHERE seriesId = p_SeriesId;
        DELETE FROM MeetingSeriesWeeklyDays WHERE seriesId = p_SeriesId;
        DELETE FROM MeetingSeriesCancelledDates WHERE seriesId = p_SeriesId;
        -- Delete the series itself
        DELETE FROM MeetingSeries WHERE id = p_SeriesId;
    COMMIT;
END //

-- -----------------------------------------------------------------------------
-- Meetings (Instances) Stored Procedures
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_GetMeetingsBySeriesId;
CREATE PROCEDURE sp_GetMeetingsBySeriesId(IN p_SeriesId VARCHAR(255))
BEGIN
    SELECT m.id, m.seriesId, m.name, m.date, m.time, m.location, m.description, m.minute,
           (SELECT GROUP_CONCAT(mu.memberId SEPARATOR ',') FROM MeetingAttendees mu WHERE mu.meetingId = m.id) as attendeeUids
    FROM Meetings m
    WHERE m.seriesId = p_SeriesId
    ORDER BY m.date DESC, m.time DESC;
END //

DROP PROCEDURE IF EXISTS sp_GetMeetingById;
CREATE PROCEDURE sp_GetMeetingById(IN p_MeetingId VARCHAR(255))
BEGIN
    SELECT m.id, m.seriesId, m.name, m.date, m.time, m.location, m.description, m.minute,
           (SELECT GROUP_CONCAT(mu.memberId SEPARATOR ',') FROM MeetingAttendees mu WHERE mu.meetingId = m.id) as attendeeUids
    FROM Meetings m
    WHERE m.id = p_MeetingId;
END //

DROP PROCEDURE IF EXISTS sp_AddMeetingInstance;
CREATE PROCEDURE sp_AddMeetingInstance(
    IN p_Id VARCHAR(255),
    IN p_SeriesId VARCHAR(255),
    IN p_Name VARCHAR(255),
    IN p_Date DATE,
    IN p_Time TIME,
    IN p_Location VARCHAR(255),
    IN p_Description TEXT,
    IN p_AttendeeUidsCsv TEXT -- Comma-separated member IDs
)
BEGIN
    DECLARE member_id_single VARCHAR(255);
    DECLARE done_attendees INT DEFAULT FALSE;
    DECLARE cur_attendees CURSOR FOR SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_AttendeeUidsCsv, ',', numbers.n), ',', -1))
                           FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) numbers -- Adjust as needed
                           WHERE p_AttendeeUidsCsv IS NOT NULL AND p_AttendeeUidsCsv != '' AND CHAR_LENGTH(p_AttendeeUidsCsv) - CHAR_LENGTH(REPLACE(p_AttendeeUidsCsv, ',', '')) >= numbers.n - 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done_attendees = TRUE;

    START TRANSACTION;
        INSERT INTO Meetings (id, seriesId, name, date, time, location, description, minute)
        VALUES (p_Id, p_SeriesId, p_Name, p_Date, p_Time, p_Location, p_Description, NULL);

        IF p_AttendeeUidsCsv IS NOT NULL AND p_AttendeeUidsCsv != '' THEN
            OPEN cur_attendees;
            read_loop_attendees: LOOP
                FETCH cur_attendees INTO member_id_single;
                IF done_attendees THEN
                    LEAVE read_loop_attendees;
                END IF;
                IF member_id_single IS NOT NULL AND member_id_single != '' THEN
                    INSERT INTO MeetingAttendees (meetingId, memberId) VALUES (p_Id, member_id_single);
                END IF;
            END LOOP;
            CLOSE cur_attendees;
        END IF;
    COMMIT;
END //

DROP PROCEDURE IF EXISTS sp_UpdateMeetingInstance;
CREATE PROCEDURE sp_UpdateMeetingInstance(
    IN p_MeetingId VARCHAR(255),
    IN p_Name VARCHAR(255),
    IN p_Date DATE,
    IN p_Time TIME,
    IN p_Location VARCHAR(255),
    IN p_Description TEXT,
    IN p_AttendeeUidsCsv TEXT -- Pass NULL if attendees are not changing
)
BEGIN
    DECLARE member_id_single VARCHAR(255);
    DECLARE done_attendees_update INT DEFAULT FALSE;
    DECLARE cur_attendees_update CURSOR FOR SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_AttendeeUidsCsv, ',', numbers.n), ',', -1))
                           FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) numbers
                           WHERE p_AttendeeUidsCsv IS NOT NULL AND p_AttendeeUidsCsv != '' AND CHAR_LENGTH(p_AttendeeUidsCsv) - CHAR_LENGTH(REPLACE(p_AttendeeUidsCsv, ',', '')) >= numbers.n - 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done_attendees_update = TRUE;

    START TRANSACTION;
        UPDATE Meetings
        SET
            name = p_Name,
            date = p_Date,
            time = p_Time,
            location = p_Location,
            description = p_Description,
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = p_MeetingId;

        IF p_AttendeeUidsCsv IS NOT NULL THEN
            DELETE FROM MeetingAttendees WHERE meetingId = p_MeetingId;
            IF p_AttendeeUidsCsv != '' THEN
                OPEN cur_attendees_update;
                read_loop_attendees_update: LOOP
                    FETCH cur_attendees_update INTO member_id_single;
                    IF done_attendees_update THEN
                        LEAVE read_loop_attendees_update;
                    END IF;
                    IF member_id_single IS NOT NULL AND member_id_single != '' THEN
                        INSERT INTO MeetingAttendees (meetingId, memberId) VALUES (p_MeetingId, member_id_single);
                    END IF;
                END LOOP;
                CLOSE cur_attendees_update;
            END IF;
        END IF;
    COMMIT;
END //

DROP PROCEDURE IF EXISTS sp_UpdateMeetingMinute;
CREATE PROCEDURE sp_UpdateMeetingMinute(
    IN p_MeetingId VARCHAR(255),
    IN p_Minute TEXT
)
BEGIN
    UPDATE Meetings
    SET minute = p_Minute, updatedAt = CURRENT_TIMESTAMP
    WHERE id = p_MeetingId;
END //

DROP PROCEDURE IF EXISTS sp_DeleteMeetingInstance;
CREATE PROCEDURE sp_DeleteMeetingInstance(IN p_MeetingId VARCHAR(255))
BEGIN
    START TRANSACTION;
        DELETE FROM AttendanceRecords WHERE meetingId = p_MeetingId;
        DELETE FROM MeetingAttendees WHERE meetingId = p_MeetingId;
        DELETE FROM Meetings WHERE id = p_MeetingId;
    COMMIT;
END //

-- -----------------------------------------------------------------------------
-- AttendanceRecords Stored Procedures
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_GetAttendanceForMeeting;
CREATE PROCEDURE sp_GetAttendanceForMeeting(IN p_MeetingId VARCHAR(255))
BEGIN
    SELECT id, meetingId, memberId, attended, notes, createdAt, updatedAt
    FROM AttendanceRecords
    WHERE meetingId = p_MeetingId;
END //

DROP PROCEDURE IF EXISTS sp_SaveMeetingAttendanceBatch;
CREATE PROCEDURE sp_SaveMeetingAttendanceBatch(
    IN p_MeetingId VARCHAR(255),
    IN p_AttendanceData TEXT -- JSON array string: '[{"memberId":"id1","attended":true,"notes":"some note"}, ...]'
)
BEGIN
    -- MySQL's JSON capabilities can be used here if version is 5.7+
    -- For broader compatibility or simpler approach, you might pass CSV and parse,
    -- or call individual save SP for each record from app layer.
    -- This SP assumes you'll call an individual insert/update SP per record from the app,
    -- or you'll adapt it to parse JSON or another format.
    -- Placeholder for batch logic (typically done by iterating in app and calling a single save SP)

    -- Example for single record (you'd loop this in your app or adapt this SP)
    -- CALL sp_SaveSingleAttendanceRecord(p_MeetingId, memberId_val, attended_val, notes_val);
    SELECT 'Batch save logic needs to be implemented by parsing p_AttendanceData and calling individual saves, or by application-side iteration.' AS Message;
END //

DROP PROCEDURE IF EXISTS sp_SaveSingleAttendanceRecord;
CREATE PROCEDURE sp_SaveSingleAttendanceRecord(
    IN p_MeetingId VARCHAR(255),
    IN p_MemberId VARCHAR(255),
    IN p_Attended BOOLEAN,
    IN p_Notes TEXT
)
BEGIN
    DECLARE record_id VARCHAR(255);
    SET record_id = CONCAT(p_MeetingId, '-', p_MemberId); -- Simple ID generation

    INSERT INTO AttendanceRecords (id, meetingId, memberId, attended, notes)
    VALUES (record_id, p_MeetingId, p_MemberId, p_Attended, p_Notes)
    ON DUPLICATE KEY UPDATE
        attended = p_Attended,
        notes = p_Notes,
        updatedAt = CURRENT_TIMESTAMP;
END //

DELIMITER ;

-- Initialize fixed Roles
INSERT INTO Roles (id, name, description) VALUES
(1, 'Leader', 'Líder de GDI o Área Ministerial'),
(2, 'Worker', 'Obrero, miembro activo de GDI o Área, o Guía/Líder'),
(3, 'GeneralAttendee', 'Asistente general a reuniones de GDI o generales');

-- Initialize fixed TargetAttendeeGroups for MeetingSeries
INSERT INTO TargetAttendeeGroups (id, name, description) VALUES
(1, 'allMembers', 'Todos los miembros registrados en la iglesia'),
(2, 'workers', 'Obreros (Guías de GDI, Líderes de Área, Miembros de Área)'),
(3, 'leaders', 'Líderes (Guías de GDI, Líderes de Área)');

    