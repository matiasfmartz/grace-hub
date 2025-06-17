-- Consulta para obtener todos los miembros
SELECT * FROM Members;

-- Consulta para obtener todos los miembros con el nombre de su GDI y el nombre del guía del GDI
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

-- ====================================================================================
-- INSERCIÓN DE DATOS DE PRUEBA (20 MIEMBROS Y RELACIONES)
-- ====================================================================================

-- Limpiar tablas en orden inverso de dependencias (¡PRECAUCIÓN! SOLO PARA PRUEBAS)
-- DELETE FROM AttendanceRecords;
-- DELETE FROM MeetingInstanceExpectedAttendees; -- Si se usa esta tabla
-- DELETE FROM MeetingInstances;
-- DELETE FROM MeetingSeriesTargetAttendeeGroups;
-- DELETE FROM MeetingSeries;
-- DELETE FROM MemberMinistryAreaAssignments;
-- DELETE FROM MinistryAreas;
-- DELETE FROM Gdis;
-- DELETE FROM Members;
-- DELETE FROM AttendeeGroupTypes; -- Si es una tabla y no un ENUM

-- 1. Insertar Tipos de Grupos de Asistentes (si es una tabla, si es ENUM no es necesario)
-- Para este esquema, AttendeeGroupType es un ENUM, así que no se inserta aquí.

-- 2. Insertar Miembros (Algunos serán líderes/guías)
INSERT INTO Members (id, first_name, last_name, email, phone, birth_date, church_join_date, baptism_date, attends_life_school, attends_bible_institute, from_another_church, status, avatar_url) VALUES
('member_1', 'Ana', 'Pérez', 'ana.perez@example.com', '555-0101', '1985-03-15', '2010-01-20', '2010-06-01', TRUE, FALSE, FALSE, 'Active', 'https://placehold.co/100x100.png'),
('member_2', 'Luis', 'Gómez', 'luis.gomez@example.com', '555-0102', '1990-07-22', '2012-05-10', '2012-11-15', FALSE, TRUE, TRUE, 'Active', 'https://placehold.co/100x100.png'),
('member_3', 'Sofía', 'Martínez', 'sofia.martinez@example.com', '555-0103', '1982-11-30', '2008-02-01', '2008-07-20', TRUE, TRUE, FALSE, 'Active', 'https://placehold.co/100x100.png'),
('member_4', 'Carlos', 'Rodríguez', 'carlos.rodriguez@example.com', '555-0104', '1995-01-10', '2018-09-05', '2019-03-10', FALSE, FALSE, TRUE, 'Active', 'https://placehold.co/100x100.png'),
('member_5', 'Laura', 'Fernández', 'laura.fernandez@example.com', '555-0105', '1988-09-03', '2015-07-15', '2016-01-25', TRUE, FALSE, FALSE, 'Active', 'https://placehold.co/100x100.png');

-- 3. Insertar GDIs
INSERT INTO Gdis (id, name, guide_id) VALUES
('gdi_1', 'GDI Discípulos', 'member_1'), -- Ana Pérez es guía
('gdi_2', 'GDI Crecimiento', 'member_2'); -- Luis Gómez es guía

-- 4. Insertar Áreas de Ministerio
INSERT INTO MinistryAreas (id, name, description, leader_id, image_url) VALUES
('area_1', 'Ministerio de Alabanza', 'Dirigir la adoración y alabanza en los servicios.', 'member_3', 'https://placehold.co/600x400.png'), -- Sofía Martínez es líder
('area_2', 'Ministerio Infantil', 'Enseñar y cuidar a los niños de la iglesia.', 'member_4', 'https://placehold.co/600x400.png'), -- Carlos Rodríguez es líder
('area_3', 'Ministerio de Misiones', 'Coordinar esfuerzos misioneros locales y globales.', 'member_5', 'https://placehold.co/600x400.png'); -- Laura Fernández es líder

-- 5. Insertar más Miembros (y asignarles GDI)
INSERT INTO Members (id, first_name, last_name, email, phone, birth_date, church_join_date, status, avatar_url, assigned_gdi_id) VALUES
('member_6', 'Pedro', 'Sánchez', 'pedro.sanchez@example.com', '555-0106', '1992-04-18', '2019-01-15', 'Active', 'https://placehold.co/100x100.png', 'gdi_1'),
('member_7', 'Carmen', 'López', 'carmen.lopez@example.com', '555-0107', '1980-12-05', '2005-03-20', 'Active', 'https://placehold.co/100x100.png', 'gdi_1'),
('member_8', 'Javier', 'Díaz', 'javier.diaz@example.com', '555-0108', '1998-06-25', '2020-07-01', 'New', 'https://placehold.co/100x100.png', 'gdi_2'),
('member_9', 'Isabel', 'Torres', 'isabel.torres@example.com', '555-0109', '1975-08-12', '2000-10-10', 'Active', 'https://placehold.co/100x100.png', 'gdi_2'),
('member_10', 'Miguel', 'Ramírez', 'miguel.ramirez@example.com', '555-0110', '1993-02-28', '2017-04-05', 'Active', 'https://placehold.co/100x100.png', NULL), -- No asignado a GDI
('member_11', 'Elena', 'Flores', 'elena.flores@example.com', '555-0111', '1986-10-10', '2011-08-15', 'Inactive', 'https://placehold.co/100x100.png', 'gdi_1'),
('member_12', 'Ricardo', 'Jiménez', 'ricardo.jimenez@example.com', '555-0112', '1991-05-01', '2016-02-20', 'Active', 'https://placehold.co/100x100.png', NULL),
('member_13', 'Patricia', 'Ruiz', 'patricia.ruiz@example.com', '555-0113', '1978-03-08', '2003-06-01', 'Active', 'https://placehold.co/100x100.png', 'gdi_1'),
('member_14', 'Fernando', 'Vargas', 'fernando.vargas@example.com', '555-0114', '1999-11-11', '2021-01-10', 'New', 'https://placehold.co/100x100.png', 'gdi_2'),
('member_15', 'Verónica', 'Castro', 'veronica.castro@example.com', '555-0115', '1983-07-07', '2009-09-09', 'Active', 'https://placehold.co/100x100.png', NULL),
('member_16', 'Alejandro', 'Molina', 'alejandro.molina@example.com', '555-0116', '1996-04-20', '2019-07-20', 'Active', 'https://placehold.co/100x100.png', 'gdi_1'),
('member_17', 'Gabriela', 'Ortega', 'gabriela.ortega@example.com', '555-0117', '1989-01-30', '2014-05-05', 'Active', 'https://placehold.co/100x100.png', 'gdi_2'),
('member_18', 'Roberto', 'Silva', 'roberto.silva@example.com', '555-0118', '1970-09-19', '1998-11-22', 'Inactive', 'https://placehold.co/100x100.png', NULL),
('member_19', 'Daniela', 'Reyes', 'daniela.reyes@example.com', '555-0119', '2000-02-02', '2022-03-03', 'New', 'https://placehold.co/100x100.png', 'gdi_1'),
('member_20', 'Hugo', 'Mendoza', 'hugo.mendoza@example.com', '555-0120', '1987-06-06', '2013-10-13', 'Active', 'https://placehold.co/100x100.png', 'gdi_2');

-- 6. Asignar Miembros a Áreas de Ministerio (participantes)
INSERT INTO MemberMinistryAreaAssignments (member_id, ministry_area_id) VALUES
-- Miembros en Ministerio de Alabanza (area_1, líder: member_3)
('member_1', 'area_1'), -- Ana (guía GDI) también participa
('member_6', 'area_1'), -- Pedro
('member_10', 'area_1'), -- Miguel
-- Miembros en Ministerio Infantil (area_2, líder: member_4)
('member_2', 'area_2'), -- Luis (guía GDI) también participa
('member_7', 'area_2'), -- Carmen
('member_12', 'area_2'), -- Ricardo
-- Miembros en Ministerio de Misiones (area_3, líder: member_5)
('member_8', 'area_3'), -- Javier
('member_15', 'area_3'); -- Verónica

-- 7. Insertar Series de Reuniones
INSERT INTO MeetingSeries (id, name, description, default_time, default_location, default_image_url, frequency, one_time_date, weekly_days, monthly_rule_type, monthly_day_of_month, monthly_week_ordinal, monthly_day_of_week) VALUES
('series_1', 'Servicio Dominical General', 'Servicio semanal para toda la congregación.', '10:00:00', 'Santuario Principal', 'https://placehold.co/600x400.png', 'Weekly', NULL, ARRAY['Sunday']::DayOfWeekType[], NULL, NULL, NULL, NULL),
('series_2', 'Reunión de Líderes Mensual', 'Reunión para guías de GDI y líderes de ministerio.', '19:30:00', 'Salón de Conferencias', 'https://placehold.co/600x400.png', 'Monthly', NULL, NULL, 'DayOfWeekOfMonth', NULL, 'First', 'Tuesday'),
('series_3', 'Taller Especial de Oración', 'Un taller único sobre la oración.', '09:00:00', 'Capilla', 'https://placehold.co/600x400.png', 'OneTime', (current_date + interval '1 month')::date, NULL, NULL, NULL, NULL, NULL);

-- 8. Asignar Grupos Objetivo a Series de Reuniones
INSERT INTO MeetingSeriesTargetAttendeeGroups (meeting_series_id, attendee_group) VALUES
('series_1', 'GeneralAttendee'),
('series_1', 'Worker'), -- Obreros también son bienvenidos
('series_1', 'Leader'), -- Líderes también son bienvenidos
('series_2', 'Leader'),
('series_3', 'GeneralAttendee'),
('series_3', 'Worker'),
('series_3', 'Leader');

-- 9. Crear Instancias de Reunión
-- Para Servicio Dominical (series_1) - Próximos 2 domingos
INSERT INTO MeetingInstances (id, series_id, name, date, time, location, description, image_url, attendee_uids, minute) VALUES
('instance_1', 'series_1', 'Servicio Dominical', (date_trunc('week', current_date) + interval '6 days')::date, '10:00:00', 'Santuario Principal', 'Servicio de adoración y prédica.', 'https://placehold.co/600x400.png', ARRAY['member_1','member_2','member_3','member_4','member_5','member_6','member_7','member_8','member_9','member_10','member_11','member_12','member_13','member_14','member_15','member_16','member_17','member_19','member_20'], NULL),
('instance_2', 'series_1', 'Servicio Dominical', (date_trunc('week', current_date) + interval '13 days')::date, '10:00:00', 'Santuario Principal', 'Servicio de adoración y prédica.', 'https://placehold.co/600x400.png', ARRAY['member_1','member_2','member_3','member_4','member_5','member_6','member_7','member_8','member_9','member_10','member_11','member_12','member_13','member_14','member_15','member_16','member_17','member_19','member_20'], 'Se discutieron los próximos eventos.');

-- Para Reunión de Líderes (series_2) - Próximo primer martes del mes siguiente (o actual si aplica)
-- Esta lógica de fecha es un poco más compleja para un simple INSERT, asumiremos una fecha fija para el ejemplo:
INSERT INTO MeetingInstances (id, series_id, name, date, time, location, description, image_url, attendee_uids, minute) VALUES
('instance_3', 'series_2', 'Reunión de Líderes', (date_trunc('month', current_date + interval '1 month') + interval '1 day' + ( (1 - extract(dow from date_trunc('month', current_date + interval '1 month') + interval '1 day') + 7) % 7 ) * interval '1 day' + case when extract(dow from date_trunc('month', current_date + interval '1 month') + interval '1 day') > 2 then interval '1 week' else interval '0 week' end)::date , '19:30:00', 'Salón de Conferencias', 'Planificación mensual y capacitación.', 'https://placehold.co/600x400.png', ARRAY['member_1','member_2','member_3','member_4','member_5'], NULL);
-- Nota: La consulta para la fecha de instance_3 es para el primer martes del mes siguiente. Podrías necesitar ajustarla o usar una fecha fija.
-- Una fecha más simple sería: (current_date + interval '1 month' - (extract(day from current_date + interval '1 month')-1)*interval '1 day' + interval '7 days')::date  (para el primer martes del siguiente mes, approx)

-- Para Taller Especial (series_3)
INSERT INTO MeetingInstances (id, series_id, name, date, time, location, description, image_url, attendee_uids, minute) VALUES
('instance_4', 'series_3', 'Taller Especial de Oración', (current_date + interval '1 month')::date, '09:00:00', 'Capilla', 'Profundizando en la oración.', 'https://placehold.co/600x400.png', ARRAY['member_1','member_2','member_3','member_4','member_5','member_6','member_7','member_8','member_9','member_10', 'member_12', 'member_13', 'member_14', 'member_15', 'member_16', 'member_17', 'member_19', 'member_20'], NULL);

-- 10. Crear Registros de Asistencia (para instance_1)
INSERT INTO AttendanceRecords (meeting_instance_id, member_id, attended, notes) VALUES
('instance_1', 'member_1', TRUE, NULL),
('instance_1', 'member_2', TRUE, NULL),
('instance_1', 'member_3', FALSE, 'Enferma'),
('instance_1', 'member_6', TRUE, NULL),
('instance_1', 'member_7', TRUE, NULL),
('instance_1', 'member_8', FALSE, 'Viaje'),
('instance_1', 'member_9', TRUE, NULL),
('instance_1', 'member_13', TRUE, NULL),
('instance_1', 'member_14', TRUE, NULL),
('instance_1', 'member_16', TRUE, NULL),
('instance_1', 'member_17', TRUE, NULL),
('instance_1', 'member_19', TRUE, NULL),
('instance_1', 'member_20', TRUE, NULL),
-- Asistencia para instance_3 (Reunión de Líderes)
('instance_3', 'member_1', TRUE, NULL),
('instance_3', 'member_2', FALSE, 'Compromiso previo'),
('instance_3', 'member_3', TRUE, NULL),
('instance_3', 'member_4', TRUE, NULL),
('instance_3', 'member_5', TRUE, NULL);

-- Nota: El cálculo de roles (Worker, Leader, GeneralAttendee) se haría dinámicamente
-- en la aplicación mediante consultas, no se almacena directamente en la tabla Members
-- según el schema proporcionado anteriormente (a menos que decidas añadir una columna 'roles' y poblarla).
-- Si la tabla Members tiene una columna 'roles' TEXT[], entonces deberías actualizarla después de estas inserciones
-- con una lógica similar a la de la aplicación. Por simplicidad, este script no actualiza una columna 'roles'.

SELECT 'Datos de prueba insertados.';
