-- Consultas SQL de Ejemplo y Datos de Prueba para Grace Hub
-- Basado en el esquema definido en database-schema.sql

-- -----------------------------------------------------------------------------
-- I. CONSULTAS DE EJEMPLO ÚTILES
-- -----------------------------------------------------------------------------

-- 1. Obtener todos los miembros con el nombre de su GDI y el nombre de su guía de GDI
SELECT
    m.id AS member_id,
    m.first_name,
    m.last_name,
    m.email,
    m.status,
    g.name AS gdi_name,
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

-- 2. Obtener todas las áreas de ministerio con sus líderes
SELECT
    ma.id AS ministry_area_id,
    ma.name AS ministry_area_name,
    ma.description,
    l.first_name AS leader_first_name,
    l.last_name AS leader_last_name,
    l.email AS leader_email
FROM
    Ministry_Areas ma
LEFT JOIN
    Members l ON ma.leader_id = l.id
ORDER BY
    ma.name;

-- 3. Obtener los miembros de un área de ministerio específica (ej: Área ID 1)
SELECT
    m.first_name,
    m.last_name,
    m.email
FROM
    Members m
JOIN
    Member_Ministry_Area_Assignments mmaa ON m.id = mmaa.member_id
WHERE
    mmaa.ministry_area_id = 1;

-- 4. Obtener todas las instancias de reunión para una serie específica (ej: Serie ID 1) con el nombre de la serie
SELECT
    mi.id AS meeting_instance_id,
    ms.name AS series_name,
    mi.name AS instance_name,
    mi.meeting_date,
    mi.meeting_time,
    mi.location
FROM
    Meeting_Instances mi
JOIN
    Meeting_Series ms ON mi.series_id = ms.id
WHERE
    mi.series_id = 1
ORDER BY
    mi.meeting_date, mi.meeting_time;

-- 5. Obtener la asistencia para una instancia de reunión específica (ej: Instancia ID 1)
SELECT
    m.first_name,
    m.last_name,
    ar.attended,
    ar.notes
FROM
    Attendance_Records ar
JOIN
    Members m ON ar.member_id = m.id
WHERE
    ar.meeting_instance_id = 1;

-- 6. Calcular roles para un miembro (ej: Miembro ID 1) - Esto sería más complejo en una sola query,
--    a menudo se hace en la lógica de la aplicación o con funciones/vistas de BD.
--    Aquí un ejemplo conceptual para 'Líder':
SELECT EXISTS (
    SELECT 1 FROM Gdis WHERE guide_id = 1
    UNION
    SELECT 1 FROM Ministry_Areas WHERE leader_id = 1
) AS is_leader;


-- -----------------------------------------------------------------------------
-- II. SCRIPT DE INSERCIÓN DE DATOS DE PRUEBA (ORDENADO POR DEPENDENCIAS)
-- -----------------------------------------------------------------------------

-- Descomentar para limpiar tablas antes de insertar (¡USAR CON PRECAUCIÓN!)
/*
DELETE FROM Attendance_Records;
DELETE FROM Meeting_Instances;
DELETE FROM Meeting_Series_Target_Attendee_Groups;
DELETE FROM Meeting_Series;
DELETE FROM Member_Ministry_Area_Assignments;
DELETE FROM Ministry_Areas;
DELETE FROM Gdis;
DELETE FROM Members;
DELETE FROM Resources;

-- Resetear secuencias para IDs (específico de PostgreSQL, adaptar para otros SGBD)
ALTER SEQUENCE members_id_seq RESTART WITH 1;
ALTER SEQUENCE gdis_id_seq RESTART WITH 1;
ALTER SEQUENCE ministry_areas_id_seq RESTART WITH 1;
ALTER SEQUENCE meeting_series_id_seq RESTART WITH 1;
ALTER SEQUENCE meeting_instances_id_seq RESTART WITH 1;
ALTER SEQUENCE attendance_records_id_seq RESTART WITH 1;
ALTER SEQUENCE resources_id_seq RESTART WITH 1;
*/

-- 1. Miembros (Algunos serán Guías/Líderes)
INSERT INTO Members (id, first_name, last_name, email, phone, status, birth_date, church_join_date, avatar_url) VALUES
(1, 'Ana', 'Pérez', 'ana.perez@example.com', '555-0001', 'Active', '1985-03-15', '2010-01-20', 'https://placehold.co/100x100'),
(2, 'Luis', 'Gómez', 'luis.gomez@example.com', '555-0002', 'Active', '1990-07-22', '2012-05-10', 'https://placehold.co/100x100'),
(3, 'Sofía', 'Martínez', 'sofia.martinez@example.com', '555-0003', 'Active', '1988-11-05', '2015-09-01', 'https://placehold.co/100x100'),
(4, 'Carlos', 'Rodríguez', 'carlos.rodriguez@example.com', '555-0004', 'Active', '1992-01-30', '2018-02-15', 'https://placehold.co/100x100'),
(5, 'Laura', 'Fernández', 'laura.fernandez@example.com', '555-0005', 'New', '1995-06-10', '2023-07-01', 'https://placehold.co/100x100');

-- 2. GDIs
INSERT INTO Gdis (id, name, guide_id) VALUES
(1, 'GDI Los Valientes', 1), -- Ana Pérez es guía
(2, 'GDI Discípulos', 2);    -- Luis Gómez es guía

-- Asignar los guías a sus GDIs en la tabla Members
UPDATE Members SET assigned_gdi_id = 1 WHERE id = 1;
UPDATE Members SET assigned_gdi_id = 2 WHERE id = 2;

-- 3. Áreas de Ministerio
INSERT INTO Ministry_Areas (id, name, description, leader_id, image_url) VALUES
(1, 'Alabanza y Adoración', 'Equipo encargado de dirigir la alabanza en los servicios.', 3, 'https://placehold.co/600x400'), -- Sofía Martínez es líder
(2, 'Jóvenes Con Propósito', 'Ministerio enfocado en jóvenes de 13 a 18 años.', 4, 'https://placehold.co/600x400'),      -- Carlos Rodríguez es líder
(3, 'Misiones Globales', 'Coordinación de esfuerzos misioneros locales e internacionales.', 1, 'https://placehold.co/600x400'); -- Ana Pérez también lidera Misiones

-- 4. Insertar más miembros (15 adicionales)
INSERT INTO Members (id, first_name, last_name, email, phone, status, birth_date, church_join_date, assigned_gdi_id, avatar_url) VALUES
(6, 'Elena', 'Sánchez', 'elena.sanchez@example.com', '555-0006', 'Active', '1993-04-12', '2019-03-01', 1, 'https://placehold.co/100x100'),
(7, 'Javier', 'Ramírez', 'javier.ramirez@example.com', '555-0007', 'Active', '1980-09-25', '2011-06-10', 1, 'https://placehold.co/100x100'),
(8, 'Paula', 'Torres', 'paula.torres@example.com', '555-0008', 'Inactive', '1991-12-03', '2017-08-05', 2, 'https://placehold.co/100x100'),
(9, 'David', 'Flores', 'david.flores@example.com', '555-0009', 'Active', '1987-02-18', '2014-11-20', 2, 'https://placehold.co/100x100'),
(10, 'Carmen', 'Vargas', 'carmen.vargas@example.com', '555-0010', 'Active', '1996-05-29', '2022-01-15', 1, 'https://placehold.co/100x100'),
(11, 'Ricardo', 'Molina', 'ricardo.molina@example.com', '555-0011', 'New', '1998-08-01', '2023-05-01', NULL, 'https://placehold.co/100x100'),
(12, 'Isabel', 'Castro', 'isabel.castro@example.com', '555-0012', 'Active', '1983-06-14', '2013-02-20', 2, 'https://placehold.co/100x100'),
(13, 'Fernando', 'Ortiz', 'fernando.ortiz@example.com', '555-0013', 'Active', '1979-10-07', '2009-07-10', NULL, 'https://placehold.co/100x100'),
(14, 'Gabriela', 'Silva', 'gabriela.silva@example.com', '555-0014', 'New', '2000-03-22', '2023-06-01', 1, 'https://placehold.co/100x100'),
(15, 'Hugo', 'Rojas', 'hugo.rojas@example.com', '555-0015', 'Active', '1994-07-11', '2020-04-05', NULL, 'https://placehold.co/100x100'),
(16, 'Natalia', 'Herrera', 'natalia.herrera@example.com', '555-0016', 'Active', '1986-04-02', '2016-10-10', 2, 'https://placehold.co/100x100'),
(17, 'Sergio', 'Jiménez', 'sergio.jimenez@example.com', '555-0017', 'Active', '1997-09-08', '2021-12-01', 1, 'https://placehold.co/100x100'),
(18, 'Mónica', 'Navarro', 'monica.navarro@example.com', '555-0018', 'Inactive', '1989-01-17', '2015-03-25', NULL, 'https://placehold.co/100x100'),
(19, 'Adrián', 'Fuentes', 'adrian.fuentes@example.com', '555-0019', 'Active', '1990-11-23', '2018-09-15', 2, 'https://placehold.co/100x100'),
(20, 'Verónica', 'Iglesias', 'veronica.iglesias@example.com', '555-0020', 'New', '1999-02-10', '2023-04-01', NULL, 'https://placehold.co/100x100');

-- 5. Asignaciones de Miembros a Áreas de Ministerio (Tabla de Unión)
INSERT INTO Member_Ministry_Area_Assignments (member_id, ministry_area_id) VALUES
(6, 1), (7, 1), (10, 1), -- Elena, Javier, Carmen en Alabanza
(5, 2), (9, 2), (14, 2), -- Laura, David, Gabriela en Jóvenes
(2, 3), (12, 3), (17, 3); -- Luis, Isabel, Sergio en Misiones (Ana ya es líder)

-- 6. Series de Reuniones
INSERT INTO Meeting_Series (id, name, description, default_time, default_location, frequency) VALUES
(1, 'Servicio Dominical General', 'Servicio de adoración y enseñanza para toda la congregación.', '10:00:00', 'Santuario Principal', 'Weekly'),
(2, 'Reunión de Líderes GDI', 'Planificación y capacitación para guías de GDI.', '19:30:00', 'Salón de Conferencias', 'Monthly'),
(3, 'Vigilia de Oración', 'Tiempo especial de oración congregacional.', '20:00:00', 'Capilla', 'OneTime');

-- Asignar días para series semanales/mensuales (si aplica)
UPDATE Meeting_Series SET weekly_days = '["Sunday"]'::jsonb WHERE id = 1; -- Servicio Dominical los Domingos
UPDATE Meeting_Series SET monthly_rule_type = 'DayOfWeekOfMonth', monthly_week_ordinal = 'First', monthly_day_of_week = 'Monday' WHERE id = 2; -- Reunión Líderes GDI el primer Lunes de cada mes
UPDATE Meeting_Series SET one_time_date = (current_date + interval '14 day') WHERE id = 3; -- Vigilia en 2 semanas

-- 7. Grupos Objetivo para Series de Reuniones (Tabla de Unión)
INSERT INTO Meeting_Series_Target_Attendee_Groups (meeting_series_id, target_attendee_group) VALUES
(1, 'GeneralAttendee'), (1, 'Worker'), (1, 'Leader'), -- Servicio Dominical para todos
(2, 'Leader'), -- Reunión de Líderes GDI solo para Líderes
(3, 'GeneralAttendee'), (3, 'Worker'); -- Vigilia para todos excepto solo líderes, por ejemplo

-- 8. Instancias de Reunión
-- (Simulando algunas instancias basadas en las series)
-- Para el Servicio Dominical (Serie 1), próximas 2 semanas
INSERT INTO Meeting_Instances (id, series_id, name, meeting_date, meeting_time, location, attendee_uids)
SELECT 
    1, 1, 'Servicio Dominical', (SELECT date_trunc('week', current_date)::date + '6 day'::interval), '10:00:00', 'Santuario Principal', '[1,2,3,4,5,6,7,9,10,12,14,16,17,19]'::jsonb -- Próximo Domingo
UNION ALL
SELECT
    2, 1, 'Servicio Dominical', (SELECT date_trunc('week', current_date)::date + '13 day'::interval), '10:00:00', 'Santuario Principal', '[1,2,3,4,5,6,7,9,10,12,14,16,17,19]'::jsonb; -- Domingo siguiente

-- Para Reunión de Líderes GDI (Serie 2), próximo primer Lunes
INSERT INTO Meeting_Instances (id, series_id, name, meeting_date, meeting_time, location, attendee_uids)
SELECT
    3, 2, 'Reunión de Líderes GDI', 
    (SELECT date_trunc('month', current_date + interval '1 month')::date + mod(8 - extract(dow FROM date_trunc('month', current_date + interval '1 month'))::integer, 7) * interval '1 day'), 
    '19:30:00', 'Salón de Conferencias', '[1,2,3,4]'::jsonb; -- Próximo primer Lunes (Líderes 1,2,3,4)

-- Para Vigilia de Oración (Serie 3), la fecha one_time_date
INSERT INTO Meeting_Instances (id, series_id, name, meeting_date, meeting_time, location, attendee_uids)
SELECT 
    4, 3, 'Vigilia de Oración', (SELECT one_time_date FROM Meeting_Series WHERE id = 3), '20:00:00', 'Capilla', '[1,2,5,6,7,9,10,11,12,13,14,15,16,17,19,20]'::jsonb;

-- 9. Registros de Asistencia (para la primera instancia del Servicio Dominical - Instancia ID 1)
INSERT INTO Attendance_Records (meeting_instance_id, member_id, attended) VALUES
(1, 1, TRUE),
(1, 2, TRUE),
(1, 3, FALSE), -- Sofía no asistió
(1, 6, TRUE),
(1, 7, TRUE),
(1, 10, TRUE),
(1, 14, FALSE); -- Gabriela no asistió

-- Para la Vigilia (Instancia ID 4)
INSERT INTO Attendance_Records (meeting_instance_id, member_id, attended, notes) VALUES
(4, 1, TRUE, NULL),
(4, 2, TRUE, 'Llegó tarde'),
(4, 5, TRUE, NULL),
(4, 11, FALSE, 'Enfermo'),
(4, 15, TRUE, NULL);

-- 10. Recursos (Ejemplos)
INSERT INTO Resources (id, title, type, snippet, image_url, link_url, created_at) VALUES
(1, 'Entendiendo la Gracia', 'Article', 'Un estudio profundo sobre el concepto de la gracia en la teología cristiana.', 'https://placehold.co/600x400', 'https://example.com/articulo-gracia', current_timestamp),
(2, 'Devocional Diario: Fortaleza para Hoy', 'Devotional', 'Una corta reflexión para inspirarte y animarte cada día.', 'https://placehold.co/600x400', NULL, current_timestamp - interval '1 day'),
(3, 'Anuncio Viaje Misionero', 'Announcement', 'Información sobre nuestro próximo viaje misionero y cómo participar.', 'https://placehold.co/600x400', 'https://example.com/viaje-misionero', current_timestamp - interval '2 day');

-- Fin del script de datos de prueba
SELECT 'Script de datos de prueba ejecutado.';
