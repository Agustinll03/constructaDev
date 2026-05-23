# Guía Técnica del Sistema Constructa

> Documento de referencia técnica completo para entender el código, la arquitectura y los flujos del sistema. Orientado a presentación académica.

---

## 1. Stack Tecnológico

### Backend
| Tecnología | Versión/Uso |
|---|---|
| **Python** | 3.11+ |
| **FastAPI** | Framework HTTP asíncrono |
| **SQLAlchemy** | ORM asíncrono con `AsyncSession` |
| **PostgreSQL** | Base de datos relacional |
| **Alembic** | Migraciones de base de datos (15 migraciones) |
| **Socket.IO** | WebSockets para tiempo real (presence + actualizaciones) |
| **APScheduler** | Scheduler de tareas automáticas (reminders, alertas) |
| **Twilio** | API de WhatsApp para chatbot |
| **PyJWT** | Generación y validación de tokens JWT |
| **bcrypt** | Hash de contraseñas |
| **Pydantic v2** | Validación de datos y schemas |
| **Brevo (Sendinblue)** | Envío de emails transaccionales (invitaciones) |

### Frontend
| Tecnología | Uso |
|---|---|
| **React 18** | UI library con hooks |
| **TypeScript** | Tipado estático |
| **Vite** | Build tool y dev server |
| **Axios** | Cliente HTTP con interceptores |
| **Socket.IO client** | Conexión WebSocket con el backend |
| CSS en línea | Estilos inline (sin CSS framework externo) |

---

## 2. Estructura de Directorios

```
ConstructaDev/
├── backend/
│   ├── app/
│   │   ├── main.py                 ← Entry point: FastAPI + Socket.IO ASGI
│   │   ├── api/
│   │   │   └── routes/             ← Endpoints HTTP organizados por dominio
│   │   │       ├── auth.py         ← Login, registro, invitaciones
│   │   │       ├── obras.py        ← CRUD de obras
│   │   │       ├── tasks.py        ← CRUD de tareas
│   │   │       ├── responsibles.py ← CRUD de responsables
│   │   │       ├── alerts.py       ← Alertas
│   │   │       ├── documents.py    ← Gestión de documentos con versioning
│   │   │       ├── webhooks.py     ← Recibe mensajes entrantes de Twilio
│   │   │       ├── notifications.py← Endpoints de notificaciones manuales
│   │   │       ├── events.py       ← SSE (Server-Sent Events)
│   │   │       ├── presence.py     ← Presencia de usuarios
│   │   │       ├── settings.py     ← Configuración por usuario
│   │   │       ├── uploads.py      ← Subida de imágenes
│   │   │       └── users.py        ← Gestión de usuarios
│   │   ├── core/
│   │   │   ├── config.py           ← Variables de entorno (Pydantic Settings)
│   │   │   ├── database.py         ← Engine + SessionLocal asíncrono
│   │   │   ├── security.py         ← JWT + bcrypt
│   │   │   ├── deps.py             ← Dependencias FastAPI (CurrentUser, DbSession...)
│   │   │   ├── scheduler.py        ← APScheduler: reminders + alertas automáticas
│   │   │   ├── socket_manager.py   ← Socket.IO server + eventos en tiempo real
│   │   │   ├── sse_manager.py      ← Server-Sent Events manager
│   │   │   └── presence.py        ← Lógica de usuarios en línea
│   │   ├── models/                 ← Modelos SQLAlchemy (tablas de BD)
│   │   ├── repositories/           ← Capa de acceso a datos (queries)
│   │   ├── schemas/                ← Pydantic schemas (request/response)
│   │   ├── services/               ← Lógica de negocio
│   │   └── integrations/
│   │       └── twilio/             ← Cliente WhatsApp, parser, validación de firma
│   ├── alembic/
│   │   └── versions/               ← 15 migraciones numeradas
│   └── uploads/                    ← Archivos subidos (PDFs, imágenes, etc.)
│
└── frontend/
    └── src/
        ├── App.tsx                 ← Router principal (estado global + páginas)
        ├── pages/                  ← Páginas completas
        │   ├── LoginPage.tsx
        │   ├── PortfolioPage.tsx    ← Vista de todas las obras
        │   ├── ObraDetailPage.tsx  ← Tabs de detalle de obra
        │   ├── DashboardPage.tsx   ← Panel por obra
        │   ├── EquipoPage.tsx      ← Gestión del workspace
        │   ├── ConfiguracionPage.tsx
        │   ├── BitacoraPage.tsx    ← (Preview de feature futura)
        │   └── PresupuestosPage.tsx← (Preview de feature futura)
        ├── components/             ← Componentes reutilizables
        │   ├── GanttTimeline.tsx   ← Gantt interactivo
        │   ├── DocumentosTab.tsx   ← Gestión de documentos con versioning
        │   ├── AlertasTab.tsx      ← Panel de alertas por obra
        │   ├── ResumenTab.tsx      ← Resumen de obra
        │   ├── ObraResponsablesTab.tsx
        │   ├── TaskFormModal.tsx
        │   └── layout/
        │       ├── AppLayout.tsx   ← Layout general con sidebar
        │       └── Sidebar.tsx     ← Navegación lateral
        ├── api/                    ← Funciones de llamadas HTTP (por dominio)
        ├── hooks/                  ← Custom hooks (socket, alertas, presencia)
        ├── lib/
        │   ├── socket.ts           ← Singleton Socket.IO client
        │   └── tokenStorage.ts     ← JWT en sessionStorage + localStorage
        ├── context/
        │   └── UserContext.tsx     ← Contexto global del usuario autenticado
        └── types/
            └── index.ts            ← Tipos TypeScript de todos los modelos
```

---

## 3. Arquitectura del Backend

### Patrón de capas

```
Request HTTP
     ↓
  Route (api/routes/)       ← valida input con Pydantic, llama al Service
     ↓
  Service (services/)       ← lógica de negocio, orquesta repositorios
     ↓
  Repository (repositories/)← queries SQL puras a través del ORM
     ↓
  Model (models/)           ← definición de tablas SQLAlchemy
     ↓
  PostgreSQL
```

**Por qué este patrón:**
- Las routes no contienen lógica de negocio
- Los repositorios no saben nada de HTTP
- Los servicios son testeables de forma aislada
- Cada capa tiene una responsabilidad única (principio SRP)

### Entry point: `main.py`

El archivo de entrada combina dos aplicaciones ASGI:

```python
# FastAPI maneja HTTP
fastapi_app = FastAPI(...)

# Socket.IO envuelve a FastAPI para manejar WebSockets
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
```

Uvicorn corre `app.main:app` — el objeto ASGI de Socket.IO que delega requests HTTP a FastAPI y WebSocket a Socket.IO.

### Lifespan: arranque y apagado

```python
@asynccontextmanager
async def lifespan(_: FastAPI):
    start_scheduler()   # arranca APScheduler al iniciar el servidor
    yield
    stop_scheduler()    # lo apaga al cerrar
```

---

## 4. Modelos de Base de Datos

### Diagrama de entidades

```
User ──────────── Obra ──────── Task ──────── Responsible
 │                 │               │
 │                 ├── HistorialEvento
 │                 ├── Alert
 │                 └── Document

Task ──── Alert
Task ──── Message ──── Responsible
Task ──── Document
Task ──── ConversationSession (vía Responsible)
Task ──── HistorialEvento
Task ──── Task (depends_on_id, auto-relación)
```

### Modelos principales

#### `User`
```
id | email (unique) | hashed_password | full_name | role (admin/collaborator)
is_active | invitation_token | invitation_expires_at | avatar_url | created_at
```
- `role = "admin"` puede gestionar el workspace
- El sistema de invitaciones usa `invitation_token` generado y enviado por email

#### `Obra`
```
id | name | description | location | status | image_url
start_date | expected_end_date | actual_end_date | manager_id | created_at | updated_at
```
- `status`: planificada / en_progreso / pausada / completada / cancelada
- `manager_id` → FK a `User`
- Propiedades calculadas en API: `completed_tasks`, `total_tasks`

#### `Task`
```
id | obra_id | responsible_id | title | description | status | estimated_progress
start_date | start_time | due_date | due_time | completed_date
order_index | depends_on_id | created_at | updated_at
```
- `status`: pendiente / en_progreso / bloqueada / completada / cancelada
- `depends_on_id` → FK a sí misma (auto-relación para dependencias)
- `order_index` determina el orden en el Gantt
- `estimated_progress` (0-100) se actualiza vía chatbot

#### `Responsible`
```
id | full_name | whatsapp_number | role | is_active
```
- Se identifica por número de WhatsApp para el chatbot
- `is_active` permite desactivar sin borrar (historial preservado)

#### `Alert`
```
id | obra_id | task_id | type | message | is_read | created_at
```
- `type`: task_blocked / delay_risk / task_overdue / no_response / reschedule_requested

#### `Message`
```
id | responsible_id | task_id | direction | channel | message_type
processing_status | from_number | to_number | body | media_url
transcription | ai_interpretation | external_message_id | raw_payload | created_at
```
- `direction`: inbound / outbound
- `processing_status`: pending / processed / failed / ignored
- `ai_interpretation` (JSON): resultado del interpretador de mensajes
- `transcription`: reservado para audio (feature futura)

#### `ConversationSession`
```
id | responsible_id | step | selected_task_id | task_options | expires_at | created_at | updated_at
```
- Persiste el estado del chatbot por responsable
- `step`: idle / obra_select / task_select / status_menu / await_date
- Expira a los 30 minutos de inactividad

#### `Document`
```
id | obra_id | task_id | uploaded_by | category | status | original_name
display_name | stored_name | file_url | notes | version | created_at
```
- `original_name`: clave de agrupación para versioning
- `display_name`: nombre del archivo real subido en esa versión
- `version`: número autoincrementado por grupo (category + original_name)
- `category`: plano / contrato / certificado / presupuesto / foto / otro

### Migraciones Alembic

Las 15 migraciones reflejan la evolución del sistema:
```
0001 → Tablas base (users, obras, tasks, responsibles, historial)
0002 → Mensajes (WhatsApp)
0003 → Alertas
0004 → Nuevos tipos de alerta
0005 → Sesiones de conversación (chatbot)
0006 → Settings por usuario
0007 → Hora en tareas (start_time, due_time)
0008 → Imagen de obra
0009 → Roles de usuario
0010 → Avatar de usuario
0011 → Eliminación de estado "en_revision"
0012 → Paso obra_select en conversación
0013 → AlertType reschedule_requested
0014 → Documentos con versioning
0015 → Campo display_name en documentos
```

---

## 5. Autenticación y Seguridad

### Flujo de autenticación

```
1. POST /api/v1/auth/login  {email, password}
2. Backend: bcrypt.verify(password, hashed_password)
3. Backend: jwt.encode({sub: user_id, exp: now + 24h}, SECRET_KEY)
4. Frontend: guarda token en sessionStorage + localStorage
5. Todas las requests siguientes: Authorization: Bearer <token>
6. Backend: decode_access_token() → user_id → carga User de BD
```

### Almacenamiento del token (frontend)

```typescript
// tokenStorage.ts — estrategia doble:
// sessionStorage: aislamiento por pestaña
// localStorage: persistencia para nuevas pestañas
setToken(token: string): void {
  sessionStorage.setItem(KEY, token);  // esta pestaña
  localStorage.setItem(KEY, token);    // nuevas pestañas heredan
}
```

### Dependencias FastAPI

```python
# deps.py — aliases tipados para uso en routes
DbSession     = Annotated[AsyncSession, Depends(get_db)]
CurrentUser   = Annotated[User, Depends(get_current_user)]
CurrentUserId = Annotated[int, Depends(get_current_user_id)]
AdminUser     = Annotated[User, Depends(require_admin)]
InternalAuth  = Annotated[None, Depends(verify_api_key)]  # para llamadas internas
```

**Cómo se usa en una route:**
```python
@router.get("/obras")
async def list_obras(db: DbSession, user: CurrentUser):
    # FastAPI inyecta automáticamente el usuario autenticado
```

### Roles de usuario
- `admin`: puede invitar usuarios, gestionar equipo, acceso total
- `collaborator`: acceso a obras asignadas

### Invitaciones
- El admin genera un `invitation_token` (UUID de 64 chars)
- Se envía por email vía Brevo con link `{FRONTEND_URL}/invite/{token}`
- El invitado visita el link → acepta → setea contraseña → token se borra

### Seguridad Twilio (webhooks)
```python
# integrations/twilio/security.py
# Valida la firma X-Twilio-Signature en cada webhook entrante
# Evita que cualquiera pueda enviar mensajes falsos al sistema
```

---

## 6. Comunicación en Tiempo Real (Socket.IO)

### Arquitectura

```
Frontend (socket.io-client)  ←→  Backend (socket.io AsyncServer)
                                        ↓
                                 Wraps FastAPI (ASGI)
```

### Rooms (salas)

Cada obra tiene su propia sala: `"obra_{id}"`

Al conectarse, el usuario entra automáticamente a **todas** las salas de obras (organización compartida).

### Eventos: Cliente → Servidor

| Evento | Datos | Qué hace |
|---|---|---|
| `join_obra` | `{obra_id}` | Registra al usuario como viewer de esa obra |
| `leave_obra` | `{obra_id}` | Lo remueve de viewers |
| `start_editing_task` | `{task_id, obra_id}` | Marca la tarea como "siendo editada" |
| `stop_editing_task` | `{task_id, obra_id}` | Libera el bloqueo de edición |
| `request_online_users` | — | Solicita lista de usuarios conectados |

### Eventos: Servidor → Cliente

| Evento | Datos | Cuándo se emite |
|---|---|---|
| `online_users` | `{users: [...]}` | Al conectar/desconectar cualquier usuario |
| `presence_update` | `{obra_id, viewers, editing}` | Cuando cambia la presencia en una obra |
| `task_updated` | `{taskId, obraId, status, ...}` | Cuando el chatbot actualiza una tarea |
| `task_created` | `{taskId, obraId, ...}` | Al crear una tarea |
| `task_deleted` | `{taskId, obraId}` | Al eliminar una tarea |
| `alert_created` | `{id, type, message, ...}` | Al generar una nueva alerta |

### Autenticación del socket

```typescript
// El token JWT se pasa en el handshake de conexión
const socket = io("http://localhost:8000", {
  auth: (cb) => { cb({ token: getToken() }); }
});
```
El servidor valida el token antes de aceptar la conexión. Sin token válido: `ConnectionRefusedError`.

---

## 7. Chatbot WhatsApp — Flujo Completo

### Tecnología
- **Twilio**: proveedor de WhatsApp Business API
- **ngrok** (desarrollo): expone el localhost al internet para que Twilio pueda enviar webhooks
- **message_interpreter.py**: intérprete de mensajes basado en reglas (no IA)
- **conversation_service.py**: máquina de estados del chatbot

### Flujo completo de una conversación

```
1. SCHEDULER dispara (cada hora, ±30 min antes del due_date de la tarea)
        ↓
2. NotificationService.send_reminders()
   → Busca tareas próximas a vencer
   → Llama a send_whatsapp_message(responsible.whatsapp_number, mensaje)
   → Twilio envía el WhatsApp al responsable
   → Guarda el mensaje en tabla `messages` (direction=outbound)
        ↓
3. RESPONSABLE recibe el mensaje y responde por WhatsApp
        ↓
4. Twilio recibe la respuesta y hace POST a /api/v1/webhooks/twilio/inbound
        ↓
5. webhooks.py → MessageService.handle_inbound()
   → Valida firma Twilio
   → Guarda mensaje entrante en `messages` (direction=inbound)
   → Llama a ConversationService.handle()
        ↓
6. ConversationService — Máquina de estados:

   Estado IDLE:
   → Busca tareas asignadas al responsable
   → Si 0 tareas: responde "sin tareas asignadas"
   → Si 1 tarea: muestra menú de estado directamente
   → Si N tareas: muestra lista paginada (5 por página)

   Estado TASK_SELECT:
   → "1"-"5": selecciona tarea → pasa a STATUS_MENU
   → "6": siguiente página
   → "X": cancela → IDLE

   Estado STATUS_MENU:
   → "1" En curso → actualiza status a EN_PROGRESO
   → "2" Finalizada → actualiza status a COMPLETADA
   → "3" Demorada → actualiza status a BLOQUEADA + crea alerta
   → "4" Reprogramar → pasa a AWAIT_DATE
   → "0": vuelve atrás

   Estado AWAIT_DATE:
   → Espera DD/MM o DD/MM/AAAA
   → Actualiza due_date de la tarea
   → Crea alerta RESCHEDULE_REQUESTED para el jefe
   → Vuelve a IDLE

   Palabras clave globales: "MENU", "INICIO", "HOLA" → reinician el flujo
        ↓
7. Después de actualizar la tarea:
   → emit_task_updated() → WebSocket → frontend se actualiza en tiempo real
   → Historial registra el cambio con actor="chatbot"
   → Si demora/bloqueo: alerta visible en AlertasTab del jefe
```

### Intérprete de mensajes (texto libre)

`message_interpreter.py` detecta intención en texto libre (no solo números del menú):

```python
# Palabras que indican COMPLETADA:
_COMPLETION_WORDS = {"terminado", "finalizado", "listo", "completado"}

# Frases que indican BLOQUEADA:
_BLOCKED_PHRASES = ["no podemos avanzar", "falta material", "demorado", "demora", "bloqueado"]
```

Si el mensaje libre coincide → aplica la acción sin necesidad de navegar el menú.

### Scheduler de notificaciones

```
Cada hora (minuto 0):    send_reminders(24h)  — tareas que vencen mañana
Cada hora (minuto 0):    send_reminders(72h)  — tareas que vencen en 3 días
Cada hora (minuto 5):    mark_overdue()       — marca vencidas, genera alertas TASK_OVERDUE
Cada 2 horas (minuto 0): check_no_response()  — genera alertas NO_RESPONSE si no hubo reply
```

---

## 8. Gestión de Documentos con Versioning

### Concepto de agrupación

Los documentos se agrupan por `category + original_name`. Cada subida del mismo archivo (misma categoría y nombre base) crea una nueva versión incrementada automáticamente.

```
Grupo: plano || "plano_estructural.pdf"
  ├── v1: display_name="plano_estructural.pdf", status=aprobado
  ├── v2: display_name="plano_estructural_rev2.pdf", status=aprobado
  └── v3: display_name="plano_estructural_final.pdf", status=pendiente ← ACTUAL
```

### Flujo de subida

```
1. Frontend: FormData con {obra_id, category, [original_name], file}
2. Backend: extrae file.filename como display_name
3. Si se pasa original_name → agrupa con versiones existentes
4. Si no → usa el filename como original_name (primer upload)
5. repo.next_version() → MAX(version) + 1 para ese grupo
6. Guarda archivo en /uploads/{uuid}.{ext}
7. Retorna DocumentRead con display_name, version, file_url
```

### Campos clave

- `original_name`: clave de agrupación (igual para todas las versiones del mismo documento)
- `display_name`: nombre real del archivo subido en esa versión (puede diferir)
- `stored_name`: nombre único en disco (`{uuid}.{ext}`) — evita colisiones

---

## 9. Flujos de la Aplicación Frontend

### Routing (sin React Router)

El sistema NO usa React Router. El routing es manual con estado en `App.tsx`:

```typescript
const [activePage, setActivePage] = useState<Page>("panel");
const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
const [activeTab, setActiveTab] = useState<ObraTab>("resumen");
```

**Páginas:** panel | configuracion | equipo | bitacora | presupuestos

**Tabs de obra:** resumen | tareas | responsables | alertas | historial | documentos

### Estado global

No hay Redux ni Context complejo. El estado vive en `App.tsx` y se pasa por props. Excepción: `UserContext` para el usuario autenticado.

### Flujo de login

```
1. LoginPage: POST /api/v1/auth/login
2. Recibe {access_token}
3. setToken(token) → sessionStorage + localStorage
4. App.tsx: setAuthed(true) → renderiza la app
5. Socket.IO conecta enviando el token en el handshake
```

### Cliente HTTP (Axios)

```typescript
// api/client.ts
const apiClient = axios.create({ baseURL: "http://localhost:8000/api/v1" });

// Interceptor request: agrega Authorization header
// Interceptor response: si 401 → clearToken() + redirect a login
```

### Gantt (GanttTimeline.tsx)

- Celdas por día, scrollable horizontalmente
- Barras de tareas coloreadas por estado
- Drag-and-drop para reprogramar (actualiza `start_date` y `due_date`)
- Indicador de hoy con línea vertical roja
- Modales de programación y reprogramación
- Muestra dependencias entre tareas
- Indicador de usuario editando en tiempo real (Socket.IO presence)

---

## 10. Variables de Entorno

El backend usa un archivo `.env` con las siguientes variables:

```env
# Obligatorias
SECRET_KEY=...                    # Clave para firmar JWTs
DATABASE_URL=postgresql+asyncpg://... # URL de PostgreSQL con driver async

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
PUBLIC_BASE_URL=https://xyz.ngrok.io  # URL pública para validar firma Twilio

# Email (invitaciones)
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=noreply@constructa.com

# Opcional
INTERNAL_API_KEY=...              # Para llamadas service-to-service
FRONTEND_URL=http://localhost:5173
REMINDER_HOURS_AHEAD=24,72        # Ventanas del scheduler de reminders

# Fase 3 (no activo aún)
ANTHROPIC_API_KEY=...             # Para IA futura
CLAUDE_MODEL=claude-sonnet-4-6
```

---

## 11. Cómo Ejecutar Localmente

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head          # aplica las 15 migraciones
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                   # corre en http://localhost:5173
```

### Para el chatbot de WhatsApp (desarrollo)
```bash
ngrok http 8000               # expone localhost al internet
# Copiar la URL ngrok a PUBLIC_BASE_URL en .env
# Configurar esa URL en Twilio como webhook endpoint
```

---

## 12. Decisiones de Diseño Importantes

### ¿Por qué FastAPI y no Django?
FastAPI es asíncrono nativo, más liviano, y tiene integración directa con Pydantic para validación automática. Ideal para un MVP con tiempo limitado.

### ¿Por qué SQLAlchemy async y no un ORM más simple?
Permite ejecutar queries sin bloquear el event loop de Python, crítico cuando se manejan WebSockets y tareas programadas en el mismo proceso.

### ¿Por qué Socket.IO y no WebSockets puros?
Socket.IO maneja automáticamente reconexión, fallback a long-polling, y el sistema de rooms (salas por obra) que simplifica enormemente el broadcast dirigido.

### ¿Por qué el chatbot es rule-based y no IA?
El MVP prioriza confiabilidad sobre inteligencia. Un interpretador con keywords es determinístico, fácil de testear, y no tiene costo por uso. La variable `ANTHROPIC_API_KEY` en config anticipa una futura integración con Claude.

### ¿Por qué no React Router?
El sistema es una SPA con pocas "páginas". El estado manual en App.tsx es suficiente y evita una dependencia extra. Si el sistema crece, sería lo primero a cambiar.

### ¿Por qué el token en sessionStorage y localStorage?
- `sessionStorage`: cada pestaña tiene su propia sesión (aislamiento)
- `localStorage`: cuando se abre una nueva pestaña, hereda el login existente sin tener que volver a loguearse

---

## 13. Lo que Falta / Podría Mejorarse

### Funcionalidades no implementadas

| Item | Prioridad | Descripción |
|---|---|---|
| **RF12: Registro manual de comunicaciones externas** | Media | No hay formulario para loguear llamadas, emails u otros contactos offline |
| **RF04: Campo `rubro` en responsable** | Baja | Hoy se usa `role` como workaround pero no es semánticamente correcto |
| **Reprogramación automática de dependencias** | Fuera de MVP | Cuando una tarea se demora, las dependientes podrían ajustarse automáticamente |
| **Bitácora de obra** | Fuera de MVP | `BitacoraPage.tsx` es solo un preview — no hay funcionalidad implementada |
| **Presupuestos** | Fuera de MVP | `PresupuestosPage.tsx` igual que Bitácora |
| **Recepción de audios por WhatsApp** | Fuera de MVP | El modelo `Message` tiene campo `transcription` y `media_url` preparados |
| **Distinción interno/externo en responsables** | Baja | El modelo no distingue formalmente; solo hay un tipo |

### Deuda técnica

| Item | Descripción |
|---|---|
| **Tests** | No hay tests unitarios ni de integración. Con el patrón repositorio actual sería fácil agregar pytest |
| **Manejo de errores en frontend** | Errores de API se silencian con `/* silent */` en varios lugares |
| **URLs hardcodeadas** | `"http://localhost:8000"` está hardcodeado en el frontend y en `documents.py`. Debería venir de variables de entorno |
| **`Sidebar 2.tsx`** | Archivo duplicado accidental en el repo — debería eliminarse |
| **Sin paginación en API** | La mayoría de los endpoints devuelven todos los registros sin paginar. Con muchas obras/tareas esto podría ser lento |
| **CORS permisivo** | Solo permite `localhost:5173` y `5174`. En producción debe restringirse al dominio real |
| **Sin rate limiting** | El webhook de Twilio no tiene rate limiting más allá de la validación de firma |
| **Contraseñas sin política** | No hay validación de longitud mínima o complejidad de contraseña |

### Mejoras arquitecturales para producción

| Item | Descripción |
|---|---|
| **Variables de entorno en frontend** | Usar `VITE_API_URL` en lugar de URLs hardcodeadas |
| **Deploy con Docker** | No hay Dockerfile ni docker-compose — necesario para deploy reproducible |
| **CI/CD** | No hay pipeline de integración continua |
| **Backup de BD** | No hay estrategia de backup de PostgreSQL |
| **HTTPS** | En producción, SSL obligatorio (especialmente para el webhook de Twilio) |
| **Logging estructurado** | Hay logs con `logging` pero no hay centralización (ELK, Datadog, etc.) |
| **Monitoreo** | No hay health checks más allá del endpoint `/health` básico |

---

## 14. Preguntas Técnicas Frecuentes

**¿Por qué se usa `asynccontextmanager` para el lifespan?**
Es la forma moderna de FastAPI (v0.93+) para manejar código de arranque/apagado. Reemplaza los eventos `on_startup`/`on_shutdown` deprecated.

**¿Cómo funciona la inyección de dependencias de FastAPI?**
FastAPI resuelve automáticamente el árbol de dependencias. `CurrentUser` internamente llama a `get_db()` para obtener la sesión, valida el token JWT y carga el usuario de la BD — todo antes de que el handler vea el request.

**¿Qué pasa si el scheduler pierde un job?**
`misfire_grace_time=600` (10 minutos) — si el servidor estaba caído y el job debía correr, APScheduler lo ejecuta al reiniciar si no pasaron más de 10 minutos.

**¿Cómo se evitan duplicados de mensajes de Twilio?**
`external_message_id` (SID de Twilio) es único por mensaje. Si Twilio reintenta el webhook, el sistema lo detecta como duplicado y lo ignora (idempotency guard).

**¿Por qué la sesión de conversación expira en 30 minutos?**
Para no mantener contexto stale. Si el responsable abandona la conversación a mitad, la próxima interacción empieza limpia en lugar de continuar un flujo corrupto.

**¿Qué es `emit_task_updated` y para qué sirve?**
Es una función en `socket_manager.py` que emite un evento WebSocket a todos los usuarios conectados a la obra correspondiente. Cuando el chatbot actualiza una tarea, el Gantt y el Dashboard del jefe se actualizan en tiempo real sin necesidad de recargar la página.

**¿Cómo funciona el versioning de documentos?**
El repositorio tiene `next_version()` que hace `SELECT MAX(version) FROM documents WHERE obra_id=X AND category=Y AND original_name=Z` y retorna `MAX + 1`. Si no existe, retorna 1.

**¿Por qué `socketio.ASGIApp` envuelve a FastAPI?**
Socket.IO necesita manejar la conexión WebSocket antes de que FastAPI la vea. Al envolver FastAPI como `other_asgi_app`, las peticiones WebSocket van a Socket.IO y el resto de HTTP va a FastAPI normalmente.
