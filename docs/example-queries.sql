-- Grace Hub - Example SQL Queries & Sample Data
--
-- This file contains:
-- 1. Example SELECT queries based on the schema.
-- 2. Sample INSERT statements to populate the database with test data.
--
-- Notes:
-- - Assumes the schema from 'database-schema.sql' has been applied.
-- - IDs are integers.
-- - Dates are in 'YYYY-MM-DD' format.
-- - For SERIAL primary keys, we are providing explicit IDs in these INSERTs
--   for deterministic referencing in subsequent foreign key constraints.
--   In a live application, you would typically let the SERIAL type auto-generate IDs.

-- ==========================================
-- Example SELECT Queries
-- ==========================================

-- Get all members
SELECT * FROM Members ORDER BY last_name, first_name;

-- Get all members with their GDI name and GDI guide's name
SELECT
    m.id AS member_id,
    m.first_name AS member_first_name,
    m.last_name AS member_last_name,
    m.email AS member_email,
    m.status AS member_status,
    g.id AS gdi_id,
    g.name AS gdi_name,
    guide.id AS guide_id,
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

-- Get all ministry areas with their leaders
SELECT
    ma.id AS area_id,
    ma.name AS area_name,
    ma.description AS area_description,
    l.id AS leader_id,
    l.first_name AS leader_first_name,
    l.last_name AS leader_last_name
FROM
    MinistryAreas ma
LEFT JOIN
    Members l ON ma.leader_id = l.id
ORDER BY
    ma.name;

-- Get all meeting instances for a specific series (e.g., series_id = 1)
SELECT
    mi.id AS instance_id,
    mi.name AS instance_name,
    mi.date,
    mi.time,
    mi.location,
    ms.name AS series_name
FROM
    MeetingInstances mi
JOIN
    MeetingSeries ms ON mi.series_id = ms.id
WHERE
    ms.id = 1
ORDER BY
    mi.date, mi.time;

-- Get attendance for a specific meeting instance (e.g., meeting_instance_id = 1)
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
    ar.meeting_instance_id = 1
ORDER BY
    m.last_name, m.first_name;


-- ==========================================
-- Sample Data INSERT Statements
-- ==========================================

-- Optional: Clear existing data from tables (use with caution!)
-- DELETE FROM AttendanceRecords;
-- DELETE FROM MeetingInstances;
-- DELETE FROM MeetingSeriesTargetRoles;
-- DELETE FROM MeetingSeriesWeeklyDays;
-- DELETE FROM MeetingSeries;
-- DELETE FROM MinistryAreaMembers;
-- DELETE FROM MinistryAreas;
-- DELETE FROM Gdis;
-- DELETE FROM Members;
-- ALTER SEQUENCE members_id_seq RESTART WITH 1;
-- ALTER SEQUENCE gdis_id_seq RESTART WITH 1;
-- ALTER SEQUENCE ministryareas_id_seq RESTART WITH 1;
-- ALTER SEQUENCE meetingseries_id_seq RESTART WITH 1;
-- ALTER SEQUENCE meetinginstances_id_seq RESTART WITH 1;
-- ALTER SEQUENCE attendancerecords_id_seq RESTART WITH 1;
-- ALTER SEQUENCE resources_id_seq RESTART WITH 1;


-- 1. Insert Members (20 members)
-- Initial members who can be leaders/guides
INSERT INTO Members (id, first_name, last_name, email, phone, birth_date, church_join_date, baptism_date, attends_life_school, attends_bible_institute, from_another_church, status, avatar_url) VALUES
(1, 'Ana', 'Pérez', 'ana.perez@example.com', '555-0001', '1985-03-15', '2010-01-20', '2010-06-01', TRUE, FALSE, FALSE, 'Active', 'https://placehold.co/100x100'),
(2, 'Luis', 'Gómez', 'luis.gomez@example.com', '555-0002', '1990-07-22', '2012-05-10', '2012-11-15', TRUE, TRUE, FALSE, 'Active', 'https://placehold.co/100x100'),
(3, 'Carmen', 'Rodríguez', 'carmen.rodriguez@example.com', '555-0003', '1988-11-05', '2015-02-01', '2015-07-20', FALSE, TRUE, TRUE, 'Active', 'https://placehold.co/100x100'),
(4, 'Jorge', 'Martínez', 'jorge.martinez@example.com', '555-0004', '1992-01-30', '2018-09-05', NULL, TRUE, FALSE, FALSE, 'Active', 'https://placehold.co/100x100'),
(5, 'Sofía', 'Hernández', 'sofia.hernandez@example.com', '555-0005', '1995-06-10', '2019-03-15', '2019-09-01', TRUE, TRUE, TRUE, 'Active', 'https://placehold.co/100x100');

-- Additional members
INSERT INTO Members (id, first_name, last_name, email, phone, birth_date, church_join_date, baptism_date, attends_life_school, attends_bible_institute, from_another_church, status, avatar_url, assigned_gdi_id) VALUES
(6, 'Carlos', 'López', 'carlos.lopez@example.com', '555-0006', '1993-04-20', '2020-01-10', '2020-06-15', TRUE, FALSE, FALSE, 'Active', 'https://placehold.co/100x100', NULL),
(7, 'Laura', 'Díaz', 'laura.diaz@example.com', '555-0007', '1989-09-12', '2011-07-01', '2011-12-01', FALSE, FALSE, TRUE, 'Active', 'https://placehold.co/100x100', NULL),
(8, 'Miguel', 'Sánchez', 'miguel.sanchez@example.com', '555-0008', '1998-02-25', '2021-05-20', NULL, TRUE, TRUE, FALSE, 'New', 'https://placehold.co/100x100', NULL),
(9, 'Elena', 'Ramírez', 'elena.ramirez@example.com', '555-0009', '1980-12-01', '2005-10-10', '2006-04-05', TRUE, FALSE, FALSE, 'Inactive', 'https://placehold.co/100x100', NULL),
(10, 'David', 'Torres', 'david.torres@example.com', '555-0010', '1991-08-18', '2016-11-30', '2017-05-10', FALSE, TRUE, TRUE, 'Active', 'https://placehold.co/100x100', NULL),
(11, 'Paula', 'Flores', 'paula.flores@example.com', '555-0011', '2000-05-03', '2022-02-15', '2022-07-01', TRUE, FALSE, FALSE, 'Active', 'https://placehold.co/100x100', NULL),
(12, 'Roberto', 'Vargas', 'roberto.vargas@example.com', '555-0012', '1987-10-28', '2014-08-01', '2015-01-20', FALSE, FALSE, TRUE, 'Active', 'https://placehold.co/100x100', NULL),
(13, 'Isabel', 'Reyes', 'isabel.reyes@example.com', '555-0013', '1996-03-11', '2019-07-22', NULL, TRUE, TRUE, FALSE, 'New', 'https://placehold.co/100x100', NULL),
(14, 'Fernando', 'Castillo', 'fernando.castillo@example.com', '555-0014', '1975-06-09', '2000-01-01', '2000-06-01', TRUE, FALSE, FALSE, 'Active', 'https://placehold.co/100x100', NULL),
(15, 'Gabriela', 'Mendoza', 'gabriela.mendoza@example.com', '555-0015', '1994-01-07', '2017-04-12', '2017-09-25', FALSE, TRUE, TRUE, 'Active', 'https://placehold.co/100x100', NULL),
(16, 'Ricardo', 'Ortega', 'ricardo.ortega@example.com', '555-0016', '1999-11-16', '2023-01-05', NULL, TRUE, FALSE, FALSE, 'New', 'https://placehold.co/100x100', NULL),
(17, 'Verónica', 'Cruz', 'veronica.cruz@example.com', '555-0017', '1983-07-21', '2008-03-17', '2008-08-30', FALSE, FALSE, TRUE, 'Active', 'https://placehold.co/100x100', NULL),
(18, 'Adrián', 'Guerrero', 'adrian.guerrero@example.com', '555-0018', '1997-04-02', '2020-09-10', '2021-02-20', TRUE, TRUE, FALSE, 'Active', 'https://placehold.co/100x100', NULL),
(19, 'Natalia', 'Jiménez', 'natalia.jimenez@example.com', '555-0019', '1986-08-27', '2013-06-05', '2013-11-11', FALSE, TRUE, TRUE, 'Inactive', 'https://placehold.co/100x100', NULL),
(20, 'Sergio', 'Morales', 'sergio.morales@example.com', '555-0020', '2001-10-14', '2022-08-01', NULL, TRUE, FALSE, FALSE, 'New', 'https://placehold.co/100x100', NULL);

-- 2. Insert GDIs (Grupos de Integración)
INSERT INTO Gdis (id, name, guide_id) VALUES
(1, 'GDI Alfa (Jóvenes)', 1), -- Ana Pérez
(2, 'GDI Beta (Adultos)', 2); -- Luis Gómez

-- Update Members to assign them to GDIs (assigned_gdi_id)
UPDATE Members SET assigned_gdi_id = 1 WHERE id IN (6, 8, 11, 13, 16, 18, 20); -- GDI Alfa
UPDATE Members SET assigned_gdi_id = 2 WHERE id IN (7, 9, 10, 12, 14, 15, 17, 19); -- GDI Beta

-- 3. Insert Ministry Areas
INSERT INTO MinistryAreas (id, name, description, leader_id, image_url) VALUES
(1, 'Alabanza y Adoración', 'Dirige la congregación en la adoración musical.', 3, 'https://placehold.co/600x400'), -- Carmen Rodríguez
(2, 'Ministerio Infantil', 'Enseña y cuida a los niños durante los servicios.', 4, 'https://placehold.co/600x400'), -- Jorge Martínez
(3, 'Proyección y Sonido', 'Maneja el equipo audiovisual durante los servicios.', 5, 'https://placehold.co/600x400'); -- Sofía Hernández

-- 4. Insert Ministry Area Members (Junction Table)
-- Area 1: Alabanza y Adoración (Leader: 3)
INSERT INTO MinistryAreaMembers (ministry_area_id, member_id) VALUES
(1, 10), -- David Torres
(1, 11), -- Paula Flores
(1, 15); -- Gabriela Mendoza

-- Area 2: Ministerio Infantil (Leader: 4)
INSERT INTO MinistryAreaMembers (ministry_area_id, member_id) VALUES
(2, 6),  -- Carlos López
(2, 7),  -- Laura Díaz
(2, 12); -- Roberto Vargas

-- Area 3: Proyección y Sonido (Leader: 5)
INSERT INTO MinistryAreaMembers (ministry_area_id, member_id) VALUES
(3, 1),  -- Ana Pérez
(3, 18), -- Adrián Guerrero
(3, 20); -- Sergio Morales

-- 5. Insert Meeting Series
INSERT INTO MeetingSeries (id, name, description, default_time, default_location, default_image_url, frequency) VALUES
(1, 'Servicio Dominical', 'Reunión principal de adoración y enseñanza.', '10:00:00', 'Santuario Principal', 'https://placehold.co/600x400', 'Weekly'),
(2, 'Estudio Bíblico Semanal', 'Estudio profundo de las escrituras.', '19:00:00', 'Salón Multiusos', 'https://placehold.co/600x400', 'Weekly'),
(3, 'Reunión de Líderes GDI', 'Planificación y capacitación para guías de GDI.', '20:00:00', 'Oficina Pastoral', 'https://placehold.co/600x400', 'Monthly'),
(4, 'Noche de Oración', 'Tiempo dedicado a la oración comunitaria.', '19:30:00', 'Capilla', 'https://placehold.co/600x400', 'OneTime');

-- 6. Insert Meeting Series Target Roles (Junction Table)
-- Servicio Dominical (Series 1): General, Obreros, Líderes
INSERT INTO MeetingSeriesTargetRoles (meeting_series_id, target_role) VALUES
(1, 'GeneralAttendee'), (1, 'Worker'), (1, 'Leader');
-- Estudio Bíblico Semanal (Series 2): General, Obreros
INSERT INTO MeetingSeriesTargetRoles (meeting_series_id, target_role) VALUES
(2, 'GeneralAttendee'), (2, 'Worker');
-- Reunión de Líderes GDI (Series 3): Líderes
INSERT INTO MeetingSeriesTargetRoles (meeting_series_id, target_role) VALUES
(3, 'Leader');
-- Noche de Oración (Series 4): General
INSERT INTO MeetingSeriesTargetRoles (meeting_series_id, target_role) VALUES
(4, 'GeneralAttendee');

-- 7. Insert Meeting Series Weekly Days (for Weekly series)
-- Servicio Dominical (Series 1): Domingos
INSERT INTO MeetingSeriesWeeklyDays (meeting_series_id, day_of_week) VALUES (1, 'Sunday');
-- Estudio Bíblico Semanal (Series 2): Miércoles
INSERT INTO MeetingSeriesWeeklyDays (meeting_series_id, day_of_week) VALUES (2, 'Wednesday');

-- 8. Insert Meeting Series Monthly Rules (for Monthly series)
-- Reunión de Líderes GDI (Series 3): Primer Lunes del mes
INSERT INTO MeetingSeriesMonthlyRules (meeting_series_id, rule_type, day_of_month, week_ordinal, day_of_week) VALUES
(3, 'DayOfWeekOfMonth', NULL, 'First', 'Monday');

-- 9. Insert Meeting Instances
-- For Servicio Dominical (Series 1) - Next 2 Sundays
INSERT INTO MeetingInstances (id, series_id, name, date, time, location, description, image_url, attendee_uids, minute_content) VALUES
(1, 1, 'Servicio Dominical', (current_date + ( (0 - EXTRACT(DOW FROM current_date) + 7) % 7) * INTERVAL '1 day'), '10:00:00', 'Santuario Principal', 'Adoración y predicación.', 'https://placehold.co/600x400', '[1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,20]'::jsonb, 'Se habló sobre la gracia.'),
(2, 1, 'Servicio Dominical', (current_date + ( (0 - EXTRACT(DOW FROM current_date) + 7) % 7 + 7) * INTERVAL '1 day'), '10:00:00', 'Santuario Principal', NULL, 'https://placehold.co/600x400', '[1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,20]'::jsonb, NULL);

-- For Estudio Bíblico (Series 2) - Next 2 Wednesdays
INSERT INTO MeetingInstances (id, series_id, name, date, time, location, description, image_url, attendee_uids) VALUES
(3, 2, 'Estudio Bíblico', (current_date + ( (3 - EXTRACT(DOW FROM current_date) + 7) % 7) * INTERVAL '1 day'), '19:00:00', 'Salón Multiusos', 'Estudio del libro de Romanos.', 'https://placehold.co/600x400', '[1,2,6,7,10,11,12,15,18]'::jsonb),
(4, 2, 'Estudio Bíblico', (current_date + ( (3 - EXTRACT(DOW FROM current_date) + 7) % 7 + 7) * INTERVAL '1 day'), '19:00:00', 'Salón Multiusos', NULL, 'https://placehold.co/600x400', '[1,2,6,7,10,11,12,15,18]'::jsonb);

-- For Reunión de Líderes GDI (Series 3) - First Monday of next month
-- (This date calculation is a bit more complex for a simple script, using a fixed offset for simplicity)
INSERT INTO MeetingInstances (id, series_id, name, date, time, location, description, image_url, attendee_uids) VALUES
(5, 3, 'Reunión Guías GDI', (date_trunc('month', current_date) + interval '1 month' + interval '6 days' - (EXTRACT(DOW FROM date_trunc('month', current_date) + interval '1 month' + interval '6 days')-1 || ' days')::interval ), '20:00:00', 'Oficina Pastoral', 'Planificación mensual.', 'https://placehold.co/600x400', '[1,2]'::jsonb);

-- For Noche de Oración (Series 4) - OneTime specific date
INSERT INTO MeetingInstances (id, series_id, name, date, time, location, description, image_url, attendee_uids) VALUES
(6, 4, 'Noche Especial de Oración', (current_date + INTERVAL '10 day'), '19:30:00', 'Capilla', 'Tiempo de oración y clamor.', 'https://placehold.co/600x400', '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]'::jsonb);

-- 10. Insert Attendance Records
-- Attendance for Servicio Dominical (Instance 1)
INSERT INTO AttendanceRecords (id, meeting_instance_id, member_id, attended, notes) VALUES
(1, 1, 1, TRUE, NULL),
(2, 1, 2, TRUE, NULL),
(3, 1, 3, FALSE, 'Enfermo'),
(4, 1, 6, TRUE, NULL),
(5, 1, 7, TRUE, NULL),
(6, 1, 11, TRUE, 'Llegó tarde'),
(7, 1, 14, FALSE, 'Viaje'),
(8, 1, 18, TRUE, NULL);

-- Attendance for Estudio Bíblico (Instance 3)
INSERT INTO AttendanceRecords (id, meeting_instance_id, member_id, attended, notes) VALUES
(9, 3, 1, TRUE, NULL),
(10, 3, 2, FALSE, 'Trabajo'),
(11, 3, 10, TRUE, NULL),
(12, 3, 15, TRUE, NULL);

-- 11. Insert Resources
INSERT INTO Resources (id, title, type, snippet, image_url, link_url, content) VALUES
(1, 'Entendiendo la Gracia', 'Article', 'Una mirada profunda al concepto de la gracia en la teología cristiana.', 'https://placehold.co/600x400', 'https://example.com/articulo-gracia', 'Texto completo del artículo sobre la gracia...'),
(2, 'Devocional Diario: Fortaleza para Hoy', 'Devotional', 'Un breve devocional para inspirarte y animarte diariamente.', 'https://placehold.co/600x400', NULL, 'Contenido del devocional... Salmo 23...'),
(3, 'Anuncio: Próximo Viaje Misionero', 'Announcement', 'Información sobre nuestro próximo viaje misionero y cómo participar.', 'https://placehold.co/600x400', 'https://example.com/viaje-misionero', NULL),
(4, 'Notas del Sermón: Las Bienaventuranzas', 'SermonNotes', 'Puntos clave y escrituras del sermón del domingo pasado sobre las Bienaventuranzas.', 'https://placehold.co/600x400', NULL, 'Mateo 5:1-12...');

-- Reset sequences to prevent issues if you run this multiple times after manual inserts
-- This is highly PostgreSQL specific. Other DBs have different ways to handle sequences.
-- SELECT setval('members_id_seq', (SELECT MAX(id) FROM Members));
-- SELECT setval('gdis_id_seq', (SELECT MAX(id) FROM Gdis));
-- SELECT setval('ministryareas_id_seq', (SELECT MAX(id) FROM MinistryAreas));
-- SELECT setval('meetingseries_id_seq', (SELECT MAX(id) FROM MeetingSeries));
-- SELECT setval('meetinginstances_id_seq', (SELECT MAX(id) FROM MeetingInstances));
-- SELECT setval('attendancerecords_id_seq', (SELECT MAX(id) FROM AttendanceRecords));
-- SELECT setval('resources_id_seq', (SELECT MAX(id) FROM Resources));

-- Note on Roles: The 'roles' field in the Members table (if it existed as a direct column)
-- would typically be calculated based on GDI guide status and Ministry Area leader/member status.
-- In this SQL schema, roles are derived, not stored directly in the Members table.
-- The `database-schema.sql` defines a `MemberRoles` table for explicit role assignment if needed,
-- or roles can be computed via queries on Gdis and MinistryAreas.
-- For simplicity in this sample data, we are not populating a separate MemberRoles table,
-- assuming roles are derived as per the app's logic.
