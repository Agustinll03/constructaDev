# Análisis de Requisitos y Alcance — Sistema Constructa

> Verificación técnica realizada sobre el código fuente del proyecto.
> Branch: `feature/document-management`

---

## 1. Requerimientos Funcionales

| Código | Requerimiento | Estado | Observación técnica |
|--------|---------------|--------|---------------------|
| RF01 | Inicio de sesión con usuario y contraseña | ✅ Cumple | `LoginPage.tsx`, `auth_service.py`, JWT con `security.py`. Rutas protegidas con `CurrentUser` |
| RF02 | Gestión de obras/proyectos | ✅ Cumple | Modelo `Obra` con nombre, descripción, fechas inicio/fin, responsable. `ObraSetupWizard` |
| RF03 | Visualización general de obras | ✅ Cumple | `ObrasPage.tsx` muestra todas las obras con % de avance calculado desde `completed_tasks / total_tasks` |
| RF04 | Gestión de proveedores | ⚠️ Parcial | Implementado como "Responsables" con `full_name`, `whatsapp_number`, `role`, `is_active`. Falta campo `rubro` explícito (`role` lo cubre parcialmente). Solo WhatsApp como medio de contacto |
| RF05 | Gestión de tareas vinculadas a una obra | ✅ Cumple | Modelo `Task` con título, descripción, estado, fechas, `responsible_id`. `TaskFormModal` completo |
| RF06 | Visualización tipo Gantt | ✅ Cumple | `GanttTimeline.tsx` con barras, fechas, dependencias visuales, drag-and-drop, modales de reprogramación |
| RF07 | Dependencias entre tareas | ✅ Cumple | Campo `depends_on_id` en modelo `Task`. Reflejado visualmente en el Gantt |
| RF08 | Alertas por retrasos | ✅ Cumple | `AlertType`: `task_blocked`, `delay_risk`, `task_overdue`, `no_response`, `reschedule_requested`. Scheduler automático en `alert_service.py` |
| RF09 | Comunicación con responsables por chatbot/WhatsApp | ✅ Cumple | Integración Twilio completa en `app/integrations/twilio/`. `NotificationService.send_reminders()` envía mensajes proactivos |
| RF10 | Respuesta de responsables por chatbot | ✅ Cumple | `webhooks.py` recibe mensajes entrantes de Twilio. `ConversationService` maneja el flujo de menús interactivos |
| RF11 | Registro automático de respuestas | ✅ Cumple | Modelo `Message` con dirección y estado de procesamiento. `message_service.py` guarda y asocia respuestas a obra/tarea/responsable |
| RF12 | Carga manual de información | ⚠️ Parcial | Actualización manual de estado de tareas y carga de documentos disponible. No existe formulario dedicado para registrar comunicaciones externas (llamadas, correos, mensajes de otros canales) |
| RF13 | Actualización de estado de tareas | ✅ Cumple | `TaskService.apply_status_update()` con máquina de estados. Actualizable desde el Gantt, la tabla de tareas y automáticamente desde el chatbot |
| RF14 | Consulta de alertas y notificaciones | ✅ Cumple | `AlertasTab`, `AlertsPanel`, WebSocket en tiempo real (`useAlertSocket`). Ruta `/notifications` en backend |
| RF15 | Dashboard de seguimiento | ✅ Cumple | `DashboardPage` con `StatCard` (tareas, avance), `AlertsPanel`, `HistorialPanel`, `TaskTable` para tareas críticas |

**Resultado: 13/15 cumplen — 2 parciales (RF04, RF12)**

---

## 2. Requerimientos No Funcionales

| Código | Requerimiento | Estado | Observación técnica |
|--------|---------------|--------|---------------------|
| RNF01 | Usabilidad — interfaz simple y clara | ✅ Cumple | UI moderna con tipografía "Plus Jakarta Sans", componentes bien estructurados, navegación lateral clara |
| RNF02 | Accesibilidad desde computadora | ✅ Cumple | Aplicación web accesible desde cualquier navegador de escritorio |
| RNF03 | Seguridad — autenticación y control de acceso | ✅ Cumple | JWT en todas las rutas protegidas, `CurrentUser` como dependencia de FastAPI, tokens almacenados en `tokenStorage.ts` |
| RNF04 | Trazabilidad — historial de cambios | ✅ Cumple | Modelo `HistorialEvento`, `HistorialPanel`, `historial.ts` API, `HistorialRepository`. Registra cambios de estado, asignaciones y respuestas |
| RNF05 | Disponibilidad durante jornada laboral | ⚠️ Depende del deploy | El código no determina esto. Depende de la infraestructura donde se ejecute el sistema |
| RNF06 | Escalabilidad básica — múltiples obras, tareas y responsables | ✅ Cumple | Patrón repositorio, relaciones correctamente modeladas en PostgreSQL con FK y cascade |
| RNF07 | Integración con WhatsApp (Twilio) | ✅ Cumple | `app/integrations/twilio/` con `client.py` (envío), `parser.py` (parseo), `security.py` (validación de firma Twilio) |
| RNF08 | Bajo costo de implementación | ✅ Cumple | FastAPI (gratuito), PostgreSQL (gratuito), React (gratuito), Twilio (bajo costo para MVP) |
| RNF09 | Mantenibilidad — arquitectura modular | ✅ Cumple | Capas separadas: `models/`, `repositories/`, `services/`, `api/routes/`, `schemas/`. Frontend: `pages/`, `components/`, `api/`, `hooks/` |
| RNF10 | Confiabilidad de datos | ✅ Cumple | PostgreSQL + SQLAlchemy + migraciones Alembic (15 migraciones numeradas). Relaciones con FK y `ondelete` configurado |

**Resultado: 9/10 cumplen — 1 depende de infraestructura (RNF05)**

---

## 3. Alcance del MVP

### Lo que incluye el MVP — verificado en código

| Item definido | Estado | Evidencia |
|---------------|--------|-----------|
| Crear y gestionar obras | ✅ | `ObrasPage`, `ObraSetupWizard`, modelo `Obra` completo |
| Definir tareas y asignar responsables | ✅ | `TaskFormModal`, `Task.responsible_id`, `ObraResponsablesTab` |
| Enviar consultas automáticas por chatbot | ✅ | `NotificationService.send_reminders()` — envío proactivo programado por scheduler |
| Registrar respuestas de los responsables | ✅ | `webhooks.py` + `MessageService` — mensajes guardados en modelo `Message` |
| Actualizar el estado de las tareas | ✅ | `TaskService.apply_status_update()` — automático desde chatbot y manual desde UI |
| Visualizar estado general en dashboard | ✅ | `DashboardPage` con estadísticas, alertas e historial en tiempo real |
| Detectar demoras y generar alertas básicas | ✅ | `AlertType.DELAY_RISK`, `TASK_OVERDUE`, `TASK_BLOCKED`, `NO_RESPONSE` |

### Lo que NO incluye el MVP — límites respetados

| Item excluido | Estado | Verificación |
|---------------|--------|--------------|
| Automatización avanzada de planificación | ✅ No implementado | Solo alerta al jefe; la reprogramación de dependencias es manual |
| Inteligencia artificial compleja | ✅ No implementado | `message_interpreter.py` usa rule-based (keywords), no IA |
| Integraciones externas adicionales | ✅ No implementado | Solo Twilio/WhatsApp |
| Aplicación móvil nativa | ✅ No implementado | Solo web |

---

## 4. Objetivos Específicos

| Objetivo | Estado | Observación |
|----------|--------|-------------|
| 1. Plataforma web para crear y gestionar obras | ✅ | Implementado completamente |
| 2. Tareas con responsables y fechas | ✅ | `Task` con `responsible_id`, `start_date`, `due_date`, `order_index` |
| 3. Responsables internos y externos | ✅ | Modelo `Responsible` unificado. No hay distinción formal interno/externo en el esquema |
| 4. Chatbot WhatsApp — consultas y registro de respuestas | ✅ | Flujo completo: envío proactivo → respuesta inbound → procesamiento → persistencia |
| 5. Sistema de estados de tareas | ✅ | Máquina de estados: `pendiente → en_progreso → completada / bloqueada / cancelada` |
| 6. Módulo de alertas ante demoras o falta de respuesta | ✅ | 5 tipos de alerta con scheduler automático y WebSocket en tiempo real |
| 7. Dashboard con estado general de la obra | ✅ | `DashboardPage` con stats, tareas críticas, alertas, historial |
| 8. Historial de interacciones | ✅ | `HistorialEvento` con tipo, descripción, payload y actor. Visible en `HistorialPanel` |

---

## 5. Procesos Críticos

| Proceso | Estado | Implementación |
|---------|--------|----------------|
| Creación y gestión de obras | ✅ | `obras.py` route, `ObraService`, `ObraSetupWizard` |
| Definición de tareas | ✅ | `tasks.py` route, `TaskService`, `TaskFormModal` |
| Asignación de responsables a cada tarea | ✅ | `Task.responsible_id` FK, `ResponsableTab`, historial de cambios |
| Envío automático de consultas por chatbot WhatsApp | ✅ | `NotificationService.send_reminders()` — scheduler cada hora con ventana ±30 min |
| Recepción y registro de respuestas | ✅ | `webhooks.py` (Twilio inbound) → `MessageService` → `ConversationService` |
| Actualización del estado de las tareas | ✅ | `TaskService.apply_status_update()` con cascade de estados para completar |
| Generación de alertas ante demoras o falta de respuesta | ✅ | `_job_send_reminders`, `_job_mark_overdue`, `_job_check_no_response` en scheduler |
| Visualización del estado del proyecto en el dashboard | ✅ | `DashboardPage`, `StatCard`, WebSocket para actualizaciones en tiempo real |

---

## 6. Flujo Crítico Definido en el Documento

> *"Cuando un responsable informe mediante el chatbot una demora o nueva estimación, el sistema actualizará automáticamente su estado y fecha estimada. Estas modificaciones se reflejarán en el dashboard y generarán una alerta para el usuario interno. No se implementará reprogramación automática de dependencias."*

### Verificación en código

| Paso del flujo | Implementado | Archivo |
|----------------|-------------|---------|
| Sistema envía consulta proactiva por WhatsApp | ✅ | `notification_service.py → send_reminders()` |
| Responsable responde por WhatsApp | ✅ | `webhooks.py → twilio_inbound()` |
| Sistema interpreta la respuesta (keywords) | ✅ | `message_interpreter.py` — detecta: completada, en progreso, bloqueada/demora |
| Sistema actualiza estado de la tarea | ✅ | `task_service.py → apply_status_update()` |
| Sistema actualiza fecha estimada si hay reprogramación | ✅ | `conversation_service.py` estado `await_date` — parsea DD/MM/AAAA y actualiza `due_date` |
| Dashboard se actualiza en tiempo real | ✅ | `emit_task_updated()` via WebSocket → `useTaskSocket` en frontend |
| Se genera alerta para el jefe | ✅ | `AlertType.RESCHEDULE_REQUESTED`, `TASK_BLOCKED` — visibles en `AlertasTab` |
| Sin reprogramación automática de dependencias | ✅ | Solo alertas generadas; el jefe evalúa manualmente el impacto |

---

## Resumen Ejecutivo

| Categoría | Resultado |
|-----------|-----------|
| Requerimientos funcionales | 13/15 cumplen, 2 parciales (RF04 rubro, RF12 carga manual) |
| Requerimientos no funcionales | 9/10 cumplen, 1 depende de deploy (RNF05) |
| Alcance del MVP | 7/7 ítems del "incluye" implementados, 4/4 del "no incluye" respetados |
| Objetivos específicos | 8/8 cumplidos |
| Procesos críticos | 8/8 implementados |
| Flujo crítico chatbot → tarea → alerta | ✅ Completamente implementado |

El sistema cubre el alcance del MVP de forma **completa**. Los únicos puntos observados son:
- **RF04**: el campo `rubro` no existe como campo independiente (usar `role` como workaround)
- **RF12**: no hay formulario para registrar comunicaciones manuales externas (llamadas, emails)
- **RNF05**: la disponibilidad depende del entorno de deploy, no del código

---

## 7. Análisis del Diagrama de Flujo (Swimlane)

El diagrama presenta tres carriles: **Jefe de obra**, **Responsable** y **Sistema Constructa**.

### Pasos que coinciden exactamente con el código

| Paso del diagrama | Lane | Implementación en código |
|---|---|---|
| Login → ¿Autenticación correcta? | Jefe | `LoginPage.tsx` + JWT. Redirige al login si falla |
| Dashboard / visualización de obras | Jefe | `ObrasPage.tsx` con % de avance por obra |
| Crear obra | Jefe | `ObraSetupWizard` — nombre, fechas, descripción |
| Definir tareas | Jefe | `TaskFormModal` — título, fecha, responsable |
| Asignar responsables | Jefe | `ObraResponsablesTab`, FK `Task.responsible_id` |
| Sistema envía consulta por WhatsApp | Sistema | `NotificationService.send_reminders()` vía Twilio |
| Responsable recibe mensaje WhatsApp | Responsable | Twilio entrega el mensaje al número configurado |
| ¿Responde a tiempo? | Responsable | `_job_check_no_response` del scheduler detecta silencio |
| Informa estado de tarea mediante chatbot | Responsable | Menú interactivo en `ConversationService` (1=en curso, 2=finalizada, 3=demorada, 4=reprogramar) |
| Sistema guarda e interpreta respuesta | Sistema | `message_interpreter.py` (rule-based) + `ConversationService` |
| Sistema actualiza estado de la tarea | Sistema | `TaskService.apply_status_update()` con máquina de estados |
| ¿Genera alerta automática? | Sistema | Condicional en `task_service.py` según el nuevo estado |
| Genera alerta con demora y detalle | Sistema | `AlertType.RESCHEDULE_REQUESTED` / `TASK_BLOCKED` en `alert_repo` |
| Genera alerta por falta de respuesta | Sistema | `AlertType.NO_RESPONSE` generada por el scheduler |
| Jefe revisa alertas y actualiza planificación | Jefe | `AlertasTab`, `AlertsPanel`, WebSocket en tiempo real (`useAlertSocket`) |
| Jefe evalúa manualmente el impacto | Jefe | Control manual sin reprogramación automática — límite del MVP respetado |

### Discrepancia detectada

**Paso: "Asignar responsables por WhatsApp"** — el nombre del paso en el carril del Jefe puede generar confusión sobre cuándo y cómo se envía el WhatsApp.

**Lo que sugiere el diagrama:** que la asignación del responsable dispara inmediatamente un mensaje WhatsApp, o que el Jefe lo envía directamente.

**Lo que hace el código:**

```python
# notification_service.py — el envío es por scheduler, no inmediato al asignar
async def send_reminders(self, hours_ahead: int = 24) -> int:
    target = now + timedelta(hours=hours_ahead)
    window_start = target - timedelta(minutes=30)
    window_end   = target + timedelta(minutes=30)
    tasks = await self.task_repo.list_due_in_window(window_start, window_end)
```

1. El Jefe asigna el responsable **en la plataforma web** (no vía WhatsApp)
2. El scheduler corre periódicamente y envía el WhatsApp **según la proximidad de la fecha de vencimiento** de la tarea (ventana de ±30 min antes del `due_date`), no de forma inmediata al asignar

**Corrección sugerida en el diagrama:** separar el paso en dos:
- `[Jefe: Asigna responsable en la plataforma]` (carril Jefe)
- `[Sistema: Envía WhatsApp automáticamente según fecha de tarea]` (carril Sistema, conectado por scheduler)

### Conclusión del diagrama

El flujo es **conceptualmente correcto** y todas las funciones representadas están implementadas en el código. La única imprecisión es la inmediatez implícita del envío WhatsApp al asignar un responsable — en la implementación real, el disparo es por scheduler basado en fechas, no por evento de asignación.
