-- ============================================================
--  SEED DEMO — RODE — 5 obras completas con todos los estados
-- ============================================================

-- 1. Limpiar datos existentes (cascada limpia tasks, alerts, historial)
DELETE FROM alerts;
DELETE FROM historial_eventos;
DELETE FROM tasks;
DELETE FROM obras;

-- ============================================================
--  OBRAS
-- ============================================================
INSERT INTO obras (id, name, description, location, status, manager_id, start_date, expected_end_date, created_at, updated_at)
VALUES
  (1, 'Torre Corporativa RODE',
   'Edificio de oficinas de 18 pisos con certificación LEED. Incluye planta baja comercial, 3 subsuelos de estacionamiento y terraza verde.',
   'Av. Colón 1200, Córdoba Centro',
   'en_progreso', 1,
   '2026-01-15', '2026-12-20',
   NOW(), NOW()),

  (2, 'Residencial Los Álamos II',
   'Complejo de 4 torres residenciales de 10 pisos cada una, con amenities completos: pileta, sum, gimnasio y seguridad 24hs.',
   'Bv. Los Álamos 450, Nueva Córdoba',
   'planificada', 1,
   '2026-07-01', '2028-03-31',
   NOW(), NOW()),

  (3, 'Complejo Industrial Ferreyra',
   'Nave industrial de 8.000 m² para planta de manufactura. Incluye oficinas administrativas, depósito y playa de maniobras.',
   'Parque Industrial Ferreyra, Lote 28',
   'pausada', 1,
   '2025-09-01', '2026-10-31',
   NOW(), NOW()),

  (4, 'Centro Comercial Villa Cabrera',
   'Shopping de 3 niveles con 120 locales comerciales, patio de comidas y cine. Proyecto finalizado exitosamente.',
   'Av. Rafael Núñez 4500, Villa Cabrera',
   'completada', 1,
   '2024-06-01', '2025-12-15',
   NOW(), NOW()),

  (5, 'Planta Procesadora Villa María',
   'Planta de procesamiento agroindustrial. Proyecto cancelado por cambio de normativa municipal en zona de uso del suelo.',
   'Ruta 9 Km 642, Villa María',
   'cancelada', 1,
   '2025-04-01', '2026-06-30',
   NOW(), NOW());

-- Resetear secuencia
SELECT setval('obras_id_seq', 10);


-- ============================================================
--  TASKS — Obra 1: Torre Corporativa (en_progreso) ~65% avance
-- ============================================================
INSERT INTO tasks (obra_id, responsible_id, title, description, status, estimated_progress, start_date, due_date, completed_date, order_index, created_at, updated_at)
VALUES
  (1, 1, 'Excavación y movimiento de suelos',      'Extracción de tierra y preparación del terreno para cimientos', 'completada',  100, '2026-01-15', '2026-02-10', '2026-02-08', 1, NOW(), NOW()),
  (1, 2, 'Fundaciones y pilotes',                  'Hormigón armado para bases estructurales profundas',            'completada',  100, '2026-02-10', '2026-03-15', '2026-03-12', 2, NOW(), NOW()),
  (1, 3, 'Estructura de hormigón — pisos 1 a 6',   'Encofrado, armado y colada de losas por nivel',                 'completada',  100, '2026-03-15', '2026-05-01', '2026-04-28', 3, NOW(), NOW()),
  (1, 4, 'Estructura de hormigón — pisos 7 a 12',  'Continuación de estructura superior',                           'completada',  100, '2026-05-01', '2026-06-20', '2026-06-18', 4, NOW(), NOW()),
  (1, 1, 'Estructura de hormigón — pisos 13 a 18', 'Cierre de estructura principal y terraza',                      'en_progreso',  72, '2026-06-20', '2026-08-10', NULL,          5, NOW(), NOW()),
  (1, 2, 'Instalaciones eléctricas — subsuelos',   'Cableado de media y baja tensión, tableros seccionales',        'en_progreso',  45, '2026-06-01', '2026-09-30', NULL,          6, NOW(), NOW()),
  (1, 5, 'Instalaciones sanitarias y pluviales',   'Red de agua potable, cloacas y pluviales',                      'pendiente',     0, '2026-08-01', '2026-10-15', NULL,          7, NOW(), NOW()),
  (1, 3, 'Cerramiento de fachada — vidrio DVH',    'Montaje de cortina de vidrio y perfilería de aluminio',         'pendiente',     0, '2026-09-01', '2026-11-30', NULL,          8, NOW(), NOW()),
  (1, 4, 'Acabados interiores y pintura',          'Revestimientos, pisos flotantes y pintura de interiores',       'pendiente',     0, '2026-10-01', '2026-12-05', NULL,          9, NOW(), NOW()),
  (1, 1, 'Habilitación municipal y entrega',       'Gestión de planos conforme a obra y certificado final',         'bloqueada',     0, '2026-12-05', '2026-12-20', NULL,         10, NOW(), NOW());


-- ============================================================
--  TASKS — Obra 2: Residencial Los Álamos (planificada)
-- ============================================================
INSERT INTO tasks (obra_id, responsible_id, title, description, status, estimated_progress, start_date, due_date, completed_date, order_index, created_at, updated_at)
VALUES
  (2, 1, 'Relevamiento topográfico y nivelación',  'Medición del terreno y ajuste de cotas de referencia',          'pendiente', 0, '2026-07-01', '2026-07-20', NULL, 1, NOW(), NOW()),
  (2, 2, 'Proyecto ejecutivo estructural',         'Planos de cómputo, cálculo sísmico y memoria descriptiva',      'pendiente', 0, '2026-07-01', '2026-08-31', NULL, 2, NOW(), NOW()),
  (2, 3, 'Aprobación y visado municipal',          'Gestión de planos ante la Municipalidad de Córdoba',            'pendiente', 0, '2026-08-01', '2026-09-30', NULL, 3, NOW(), NOW()),
  (2, 4, 'Licitación de contratistas',             'Proceso de cotización y adjudicación de subcontratos',          'pendiente', 0, '2026-09-01', '2026-10-15', NULL, 4, NOW(), NOW()),
  (2, 5, 'Excavación y fundaciones — Torre A',     'Movimiento de suelos e inicio de cimientos Torre A',            'pendiente', 0, '2026-10-15', '2027-01-31', NULL, 5, NOW(), NOW()),
  (2, 1, 'Excavación y fundaciones — Torre B',     'Movimiento de suelos e inicio de cimientos Torre B',            'pendiente', 0, '2026-11-01', '2027-02-28', NULL, 6, NOW(), NOW()),
  (2, 2, 'Estructura — Torres A y B',              'Hormigón armado pisos 1 al 10 en ambas torres',                 'pendiente', 0, '2027-01-15', '2027-08-31', NULL, 7, NOW(), NOW());


-- ============================================================
--  TASKS — Obra 3: Complejo Industrial (pausada)
-- ============================================================
INSERT INTO tasks (obra_id, responsible_id, title, description, status, estimated_progress, start_date, due_date, completed_date, order_index, created_at, updated_at)
VALUES
  (3, 1, 'Limpieza y preparación del terreno',     'Desmonte, nivelación y retiro de materiales existentes',        'completada', 100, '2025-09-01', '2025-09-20', '2025-09-18', 1, NOW(), NOW()),
  (3, 2, 'Fundaciones y plateas',                  'Losa de fundación sobre suelo compactado',                      'completada', 100, '2025-09-20', '2025-11-01', '2025-10-28', 2, NOW(), NOW()),
  (3, 3, 'Estructura metálica — nave principal',   'Montaje de columnas y vigas de acero galvanizado',              'en_progreso', 55, '2025-11-01', '2026-02-28', NULL,          3, NOW(), NOW()),
  (3, 4, 'Cubierta y cerramiento lateral',         'Chapas termopanel y carpintería industrial',                    'bloqueada',   0, '2026-01-15', '2026-04-30', NULL,          4, NOW(), NOW()),
  (3, 5, 'Instalación eléctrica industrial',       'Alta tensión, transformador, tableros y alumbrado',             'pendiente',   0, '2026-03-01', '2026-07-31', NULL,          5, NOW(), NOW()),
  (3, 1, 'Solado y piso industrial',               'Hormigón alisado endurecido de alta resistencia',               'bloqueada',   0, '2026-04-01', '2026-06-30', NULL,          6, NOW(), NOW());


-- ============================================================
--  TASKS — Obra 4: Centro Comercial (completada)
-- ============================================================
INSERT INTO tasks (obra_id, responsible_id, title, description, status, estimated_progress, start_date, due_date, completed_date, order_index, created_at, updated_at)
VALUES
  (4, 1, 'Demolición y excavación',                'Demolición de estructura preexistente y excavación de 3 niveles','completada', 100, '2024-06-01', '2024-08-15', '2024-08-10', 1, NOW(), NOW()),
  (4, 2, 'Estructura de hormigón',                 'Estructura completa de 3 plantas + subsuelo',                   'completada', 100, '2024-08-15', '2025-02-28', '2025-02-20', 2, NOW(), NOW()),
  (4, 3, 'Instalaciones MEP completas',            'Mecánicas, eléctricas y sanitarias de todo el edificio',        'completada', 100, '2024-12-01', '2025-06-30', '2025-06-25', 3, NOW(), NOW()),
  (4, 4, 'Fachada y locales comerciales',          'Revestimiento exterior, vidriera y separación de locales',      'completada', 100, '2025-04-01', '2025-09-30', '2025-09-20', 4, NOW(), NOW()),
  (4, 5, 'Acabados premium y señalética',          'Pisos de mármol, cielo raso tensado y cartelería LED',          'completada', 100, '2025-08-01', '2025-11-30', '2025-11-28', 5, NOW(), NOW()),
  (4, 1, 'Habilitación y apertura al público',     'Inspecciones finales, habilitación comercial y apertura',       'completada', 100, '2025-11-01', '2025-12-15', '2025-12-12', 6, NOW(), NOW());


-- ============================================================
--  TASKS — Obra 5: Planta Procesadora (cancelada)
-- ============================================================
INSERT INTO tasks (obra_id, responsible_id, title, description, status, estimated_progress, start_date, due_date, completed_date, order_index, created_at, updated_at)
VALUES
  (5, 1, 'Relevamiento y proyecto ejecutivo',      'Planos aprobados y memoria técnica completa',                   'completada', 100, '2025-04-01', '2025-05-31', '2025-05-28', 1, NOW(), NOW()),
  (5, 2, 'Gestión de permisos municipales',        'Tramitación ante municipio — BLOQUEADO por cambio de zonificación', 'cancelada', 30, '2025-06-01', '2025-08-31', NULL, 2, NOW(), NOW()),
  (5, 3, 'Movimiento de suelos',                   'Cancelada — no se inició por falta de habilitación',            'cancelada',  0, '2025-09-01', '2025-11-30', NULL,          3, NOW(), NOW()),
  (5, 4, 'Estructura y obra gruesa',               'Cancelada antes de iniciar',                                    'cancelada',  0, '2025-12-01', '2026-03-31', NULL,          4, NOW(), NOW());


-- ============================================================
--  ALERTAS de muestra
-- ============================================================
INSERT INTO alerts (obra_id, task_id, type, message, is_read, created_at)
SELECT 1, id, 'delay_risk',
  'La tarea "' || title || '" tiene riesgo de demora según el avance actual.',
  false, NOW()
FROM tasks WHERE obra_id = 1 AND status = 'en_progreso' LIMIT 1;

INSERT INTO alerts (obra_id, task_id, type, message, is_read, created_at)
SELECT 1, id, 'task_blocked',
  'La tarea "' || title || '" está bloqueada y requiere atención.',
  false, NOW()
FROM tasks WHERE obra_id = 1 AND status = 'bloqueada' LIMIT 1;

INSERT INTO alerts (obra_id, task_id, type, message, is_read, created_at)
SELECT 3, id, 'task_blocked',
  'La tarea "' || title || '" está bloqueada. La obra se encuentra pausada.',
  true, NOW()
FROM tasks WHERE obra_id = 3 AND status = 'bloqueada' LIMIT 1;


-- ============================================================
--  HISTORIAL de muestra — Obra 1
-- ============================================================
INSERT INTO historial_eventos (obra_id, task_id, event_type, description, triggered_by, created_at)
SELECT 1, id, 'task_completed',
  'Tarea completada: ' || title,
  'FacundoAdminn', NOW() - INTERVAL '5 days'
FROM tasks WHERE obra_id = 1 AND status = 'completada';

INSERT INTO historial_eventos (obra_id, task_id, event_type, description, triggered_by, created_at)
VALUES (1, NULL, 'obra_created', 'Obra Torre Corporativa RODE creada en el sistema.', 'FacundoAdminn', '2026-01-15 09:00:00+00');

INSERT INTO historial_eventos (obra_id, task_id, event_type, description, triggered_by, created_at)
VALUES (4, NULL, 'obra_completed', 'Obra Centro Comercial Villa Cabrera marcada como completada.', 'FacundoAdminn', '2025-12-12 17:30:00+00');

COMMIT;
