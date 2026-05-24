# Plan de Tests — Sistema Constructa

> **Estado actual:** Fases 1, 2 y 3 completadas — 112 tests unitarios/integración + 17 tests E2E con Cypress.

---

## Cómo correr los tests

**Backend — solo unitarios** (desde `backend/`):
```bash
.venv/bin/python -m pytest tests/unit/ -v
```

**Backend — solo integración** (desde `backend/`):
```bash
.venv/bin/python -m pytest tests/integration/ -v
```

**Backend — todos juntos** (desde `backend/`):
```bash
.venv/bin/python -m pytest tests/ -v
```

**Frontend — unitarios** (desde `frontend/`):
```bash
npm test
```

**E2E — Cypress modo interactivo** (desde `frontend/`; requiere backend y frontend corriendo):
```bash
npm run cypress
```

**E2E — Cypress modo headless** (CI, sin interfaz gráfica):
```bash
npm run cypress:run
```

> ⚠️ Antes de correr Cypress: asegurate de tener `cypress.env.json` con las credenciales de tu admin (copiar de `cypress.env.json.example`).

---

## Stack de Testing

### Backend (Python)

| Herramienta | Rol |
|---|---|
| `pytest` | Framework de tests |
| `pytest-asyncio` | Soporte para funciones `async def` en tests |
| `httpx` + `ASGITransport` | Cliente HTTP que habla con FastAPI en memoria (sin abrir puerto) |
| `psycopg2-binary` | Driver sincrónico para que Alembic pueda migrar la BD de test |
| `NullPool` (SQLAlchemy) | Evita reutilización de conexiones sucias entre tests |

### Frontend (TypeScript)

| Herramienta | Rol |
|---|---|
| `Vitest` | Framework de tests (nativo con Vite, sin config extra) |

### E2E — Cypress ✅

| Herramienta | Rol |
|---|---|
| `Cypress` | Tests end-to-end en navegador real |
| `cypress.env.json` | Credenciales del admin (gitignoreado, no va al repo) |
| `cypress/support/commands.ts` | Comandos personalizados (`cy.loginAdmin`, `cy.crearObra`, etc.) |

---

## Criterios de Priorización

```
P1 — Crítico: lógica de negocio central, fácil de romper silenciosamente
P2 — Importante: flujos de usuario principales
P3 — Deseable: casos borde, cobertura extra
```

---

# PARTE 1 — Tests Unitarios ✅ COMPLETADA

Los tests unitarios prueban funciones puras o módulos pequeños **sin base de datos, sin red, sin servidor corriendo**. Son los más rápidos (menos de 2 segundos para 82 tests) y los primeros que se deben correr.

## Cómo funciona la infraestructura unitaria

### `backend/pytest.ini`
Le dice a pytest dónde buscar los tests y que use asyncio automáticamente:
```ini
[pytest]
testpaths = tests
asyncio_mode = auto
```

### `backend/tests/conftest.py`
El problema: cualquier import de la app (`from app.services...`) dispara la carga de `database.py`, que intenta leer `DATABASE_URL` del entorno. Si no está seteada, Pydantic Settings lanza un error antes de correr un solo test.

La solución: setear las variables de entorno **antes** de cualquier import:
```python
import os
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-only")
```
Se usa `setdefault` (no `=`) para no pisar el valor real si ya está seteado desde el sistema operativo.

---

## Archivos de tests unitarios

---

### U01 — `backend/tests/unit/test_message_interpreter.py` ✅ P1

**Destino:** Probar la función `interpret()` de `app/services/message_interpreter.py`.

**Por qué es importante:** Esta función es el "cerebro" del chatbot. Cuando un responsable responde por WhatsApp ("terminado", "hay demora"), `interpret()` decide qué acción tomar. Si falla silenciosamente, el chatbot deja de actualizar estados de tareas sin dar error visible.

**Lógica de implementación:**
La función es completamente pura: recibe un string y devuelve un `InterpretationResult`. No toca nada externo. Eso la hace trivial de testear.

Internamente usa dos mecanismos:
1. **Palabras de completado** (`terminado`, `finalizado`, `listo`, `completado`): busca coincidencia por límite de palabra (`\b\w+\b`), por eso "terminar" no matchea "terminado"
2. **Frases de bloqueo** (`falta material`, `demora`, etc.): busca subcadena exacta en el texto

Los tests más importantes:
```python
# Verifica que "terminar" (infinitivo) no se confunda con "terminado"
def test_infinitivo_no_dispara_completado():
    resultado = interpret("hay que terminar esto")
    assert resultado.action == "none"  # word boundary funciona
```

**Tests reales:** 19 (por parametrización de casos) | **Mocks:** ninguno

---

### U02 — `backend/tests/unit/test_security.py` ✅ P1

**Destino:** Probar `hash_password`, `verify_password`, `create_access_token` y `decode_access_token` de `app/core/security.py`.

**Por qué es importante:** La autenticación es el punto de entrada de todo el sistema. Si `verify_password` tiene un bug, cualquiera puede entrar. Si `decode_access_token` no valida correctamente, tokens falsos pasarían sin error.

**Lógica de implementación:**
Las funciones de seguridad son puras (reciben datos, devuelven datos). No necesitan BD.

Casos clave:
- `hash_password` usa bcrypt con sal aleatoria → dos llamadas con el mismo texto dan hashes distintos. El test verifica eso explícitamente para confirmar que la sal funciona.
- `decode_access_token` con un token inventado debe lanzar `jwt.PyJWTError`. Si no lo hace, cualquier string podría pasar como token válido.

```python
# Verifica que dos hashes del mismo texto sean distintos (sal aleatoria bcrypt)
def test_dos_hashes_del_mismo_texto_son_distintos():
    h1 = hash_password("mismo")
    h2 = hash_password("mismo")
    assert h1 != h2  # si fallara, bcrypt no estaría usando sal

# Verifica que un token inventado lance excepción
def test_token_invalido_lanza_excepcion():
    with pytest.raises(pyjwt.PyJWTError):
        decode_access_token("esto.no.es.un.token")
```

**Tests reales:** 8 | **Mocks:** ninguno

---

### U03 — `backend/tests/unit/test_conversation_helpers.py` ✅ P1

**Destino:** Probar los helpers internos de `app/services/conversation_service.py`: `_is_cancel`, `_is_back`, `_is_menu`, `_parse_option` y `_parse_date`.

**Por qué es importante:** Estas funciones controlan la navegación del chatbot. Si `_parse_date` acepta fechas inválidas, se guardaría basura en `due_date`. Si `_is_cancel` no reconoce "X", el responsable no puede salir del flujo.

**Lógica de implementación:**
Son funciones privadas (con `_`) definidas a nivel de módulo, no dentro de ninguna clase. Eso permite importarlas directamente en los tests sin instanciar el `ConversationService` (que sí requiere BD).

El caso más importante a entender es `_parse_date`:
```python
# La función acepta DD/MM/AAAA o DD/MM (sin año)
# Si no tiene año, usa el año actual. Si la fecha ya pasó más de 7 días, 
# asume que es del año próximo. Eso lo hace no determinista con date.today()
# → En los tests siempre usamos el formato con año explícito:
def test_parse_date_formato_completo():
    resultado = _parse_date("15/06/2025")
    assert resultado == date(2025, 6, 15)  # determinista siempre
```

**Tests reales:** 39 (por parametrización exhaustiva) | **Mocks:** ninguno

---

### U04 — `backend/tests/unit/test_task_state_machine.py` ✅ P1

**Destino:** Probar el diccionario `VALID_TRANSITIONS` de `app/services/task_service.py`.

**Por qué es importante:** Este diccionario define qué cambios de estado son permitidos. Si alguien agrega un estado nuevo al modelo y olvida actualizar el diccionario, el sistema empieza a rechazar transiciones válidas sin mensaje claro. El test detecta eso.

**Lógica de implementación:**
`VALID_TRANSITIONS` es simplemente un `dict` a nivel de módulo. Se puede importar y testear directamente sin instanciar nada ni tocar la BD.

```python
from app.services.task_service import VALID_TRANSITIONS

# Verifica que el dict cubra TODOS los estados del enum
def test_el_diccionario_cubre_todos_los_estados():
    for estado in list(TaskStatus):
        assert estado in VALID_TRANSITIONS  # si se agrega un estado nuevo, este test falla

# Verifica la regla más importante: PENDIENTE no puede ir directo a BLOQUEADA
def test_transicion_prohibida[pendiente-bloqueada]():
    assert TaskStatus.BLOQUEADA not in VALID_TRANSITIONS[TaskStatus.PENDIENTE]
    # La tarea debe pasar por EN_PROGRESO primero
```

La máquina de estados real es:
```
PENDIENTE → EN_PROGRESO, CANCELADA
EN_PROGRESO → BLOQUEADA, COMPLETADA, CANCELADA
BLOQUEADA → EN_PROGRESO, CANCELADA
COMPLETADA → (nada — estado terminal)
CANCELADA  → (nada — estado terminal)
```

**Tests reales:** 16 | **Mocks:** ninguno

---

### U05 — `frontend/src/__tests__/buildGroups.test.ts` ✅ P2

**Destino:** Probar `buildGroups()` de `src/lib/documentUtils.ts`.

**Por qué es importante:** Esta función agrupa los documentos por categoría y nombre para mostrar las versiones. Si agrupa mal, dos planos distintos aparecerían juntos o las versiones no estarían ordenadas.

**Lógica de implementación:**
La función fue extraída de `DocumentosTab.tsx` a un archivo separado (`documentUtils.ts`) para poder importarla en los tests. Si hubiera quedado dentro del componente, no se podría testear sin renderizar React.

La clave es la agrupación por `categoria + nombre`:
```typescript
const key = `${doc.category}||${doc.original_name}`
// "plano||plano.pdf" y "contrato||plano.pdf" son grupos distintos
// aunque tengan el mismo nombre de archivo
```

**Tests reales:** 6 | **Mocks:** ninguno

---

### U06 — `frontend/src/__tests__/formatUtils.test.ts` ✅ P2

**Destino:** Probar `getInitials`, `avatarColor`, `fmtDateShort` y `relativeTime` de `src/lib/formatUtils.ts`.

**Por qué es importante:** Estas funciones se usan en casi todos los componentes. `getInitials` aparece en 4+ lugares. Si una falla, el problema se ve en toda la UI a la vez.

**Lógica de implementación:**
Fueron extraídas de los componentes donde estaban duplicadas a un archivo compartido. Ahora todos los componentes importan desde `formatUtils.ts`.

El caso más tricky es `relativeTime`: depende de `Date.now()` que cambia con el tiempo. La solución: crear fechas relativas al momento de correr el test:
```typescript
// No hardcodear "2025-01-01T10:00:00Z" porque en el futuro
// la diferencia ya no sería de "hace 5 min"
const iso = new Date(Date.now() - 5 * 60_000).toISOString() // hace 5 min AHORA
expect(relativeTime(iso)).toBe("hace 5 min")                 // siempre correcto
```

**Tests reales:** 15 | **Mocks:** ninguno

---

### U07 — `frontend/src/__tests__/taskUtils.test.ts` ✅ P2

**Destino:** Probar `isOverdue` y `diffDays` de `src/lib/taskUtils.ts`.

**Por qué es importante:** `isOverdue` determina qué tareas se muestran con el indicador de vencida en rojo. Si tiene un bug, el jefe de obra no ve las alertas visuales correctamente. `diffDays` calcula el impacto en días cuando se reprograma una tarea.

**Lógica de implementación:**
`isOverdue` también depende de la fecha actual (compara `due_date` con hoy). La solución: usar fechas claramente en el pasado o futuro que nunca van a cambiar de categoría:
```typescript
// "2000-01-01" siempre es pasado, "2099-12-31" siempre es futuro
const pasada = crearTarea({ due_date: "2000-01-01", status: "pendiente" })
expect(isOverdue(pasada)).toBe(true)  // siempre correcto, sin importar cuándo corra

const futura = crearTarea({ due_date: "2099-12-31", status: "pendiente" })
expect(isOverdue(futura)).toBe(false)
```

**Tests reales:** 10 | **Mocks:** ninguno

---

### U08 — `frontend/src/__tests__/alertUtils.test.ts` ✅ P2

**Destino:** Probar `getAlertLabel` de `src/lib/alertUtils.ts`.

**Por qué es importante:** Mapea los tipos internos de alerta (`task_blocked`, `no_response`, etc.) a texto legible en español para el jefe de obra. Si falla, las alertas muestran texto técnico o incorrecto.

**Lógica de implementación:**
La función tiene dos caminos:
1. Tipos con etiqueta fija (`task_blocked` → siempre "Tarea bloqueada")
2. Fallback por contenido del mensaje (`delay_risk` + mensaje que contiene "responsable" → "Sin responsable")

Los tests cubren ambos caminos:
```typescript
// Camino 1: tipo fijo — no importa el mensaje
expect(getAlertLabel({ type: "task_blocked", message: "cualquier cosa" }))
  .toBe("Tarea bloqueada")

// Camino 2: fallback — depende del contenido del mensaje
expect(getAlertLabel({ type: "delay_risk", message: "La tarea no tiene responsable" }))
  .toBe("Sin responsable")
```

**Tests reales:** 7 | **Mocks:** ninguno

---

# PARTE 2 — Tests de Integración ✅ COMPLETADA

Los tests de integración prueban **endpoints HTTP completos**: el request entra por el router de FastAPI, pasa por el servicio, toca la base de datos real, y devuelve una respuesta. Verifican que todas las capas funcionen juntas.

## Cómo funciona la infraestructura de integración

### La base de datos `constructa_test`
Se creó una base de datos PostgreSQL separada solo para tests. La de producción (`constructa`) nunca se toca.

```
PostgreSQL local
├── constructa       ← producción (jamás tocada por tests)
└── constructa_test  ← exclusiva para tests (se llena y vacía en cada corrida)
```

### `backend/tests/integration/conftest.py`

Este archivo define todas las "piezas" que los tests comparten. Se carga automáticamente por pytest.

**Fixture `crear_tablas` (se corre UNA vez por sesión):**
Aplica las migraciones de Alembic en `constructa_test` antes de que corra cualquier test, y las deshace al final:
```python
@pytest.fixture(scope="session", autouse=True)
def crear_tablas():
    _run_alembic("downgrade", "base")  # borra todo por si había restos
    _run_alembic("upgrade", "head")    # aplica las 15 migraciones
    yield
    _run_alembic("downgrade", "base")  # limpia al terminar
```
Se usa subprocess (proceso separado) porque el `env.py` de Alembic llama `asyncio.run()` internamente. Si lo llamáramos directo, choca con el event loop de pytest-asyncio (no se pueden tener dos event loops en el mismo thread).

**Fixture `limpiar_tablas` (se corre después de CADA test):**
Trunca todas las tablas para que el próximo test empiece con la BD vacía:
```python
@pytest_asyncio.fixture(autouse=True)
async def limpiar_tablas():
    yield  # el test corre
    async with engine_test.begin() as conn:
        await conn.execute(text("TRUNCATE users, obras, tasks, ... RESTART IDENTITY CASCADE"))
```
`RESTART IDENTITY` reinicia los contadores de id (el próximo usuario siempre tendrá id=1, no id=47). `CASCADE` borra en orden correcto respetando las foreign keys.

**Fixture `override_db` (se corre en CADA test):**
Le dice a FastAPI que use `constructa_test` en lugar de `constructa`:
```python
@pytest_asyncio.fixture(autouse=True)
async def override_db():
    fastapi_app.dependency_overrides[get_db] = mi_sesion_de_test
    yield
    fastapi_app.dependency_overrides.clear()
```
`dependency_overrides` es un dict de FastAPI. Cuando el endpoint pide `get_db`, FastAPI mira ese dict y en lugar de conectarse a producción, usa la sesión de test. El endpoint no sabe nada del cambio.

**`NullPool` — por qué es importante:**
```python
engine_test = create_async_engine(TEST_DB_URL, poolclass=NullPool)
```
SQLAlchemy normalmente mantiene un "pool" de conexiones abiertas para reutilizarlas. Si una conexión queda en estado sucio (por ejemplo, con una transacción a medias), el próximo test la recibe en ese estado y falla. `NullPool` hace que cada `connect()` cree una conexión nueva y cada `close()` la descarte. Más lento pero completamente limpio.

**Fixtures de usuario (`usuario_registrado`, `auth_headers`):**
Cada test que necesita autenticación usa `auth_headers`. Esta fixture registra un usuario, hace login, y devuelve el header listo:
```python
{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."}
```
Como `limpiar_tablas` borra todo entre tests, el usuario se recrea fresco en cada test. No hay estado compartido entre tests.

**Fixture `obra_base`:**
Crea una obra de prueba para los tests que necesitan una obra existente. En lugar de repetir el `POST /obras` en cada test, se llama `obra_base` como dependencia y pytest ya la tiene lista.

---

## Archivos de tests de integración

---

### I01 — `backend/tests/integration/test_auth.py` ✅ P1

**Destino:** Probar los endpoints de autenticación (`/auth/register` y `/auth/login`) y verificar que las rutas protegidas rechacen accesos no autorizados.

**Por qué es importante:** Si el login devuelve un token aunque la contraseña sea incorrecta, cualquiera entra al sistema. Si las rutas protegidas no verifican el token, los datos de cualquier obra son accesibles sin autenticarse.

**Lógica de implementación:**

Cada test llama al endpoint real con `httpx`. FastAPI procesa el request completo (validación de schema, servicio, BD):

```python
async def test_login_exitoso(client, usuario_registrado):
    # usuario_registrado ya creó el usuario en la BD de test
    resp = await client.post("/api/v1/auth/login", json={
        "email": "test@constructa.com",
        "password": "testpass123",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert len(resp.json()["access_token"]) > 20  # es un JWT real, no un string vacío
```

Casos importantes:
- **Sin token → 403**: `HTTPBearer` de FastAPI rechaza automáticamente si no hay header `Authorization`
- **Token inválido → 401**: el formato "Bearer xxx" pasa la verificación de HTTPBearer, pero `decode_access_token` lanza `PyJWTError` → `get_current_user` lanza 401
- **Email duplicado → 400/409**: `AuthService.register` lanza `ConflictError` si el email ya existe

**Tests reales:** 8

---

### I02 — `backend/tests/integration/test_obras.py` ✅ P1

**Destino:** Probar el CRUD completo de obras (`POST`, `GET`, `PATCH`, `DELETE` en `/obras`).

**Por qué es importante:** Las obras son la entidad principal del sistema. Un bug en crear o listar obras rompe toda la funcionalidad.

**Lógica de implementación:**

Los tests que necesitan una obra existente usan la fixture `obra_base` en lugar de crearla manualmente en cada test:

```python
async def test_obtener_obra_por_id(client, auth_headers, obra_base):
    # obra_base ya existe en la BD de test, creada por la fixture
    resp = await client.get(f"/api/v1/obras/{obra_base['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == obra_base["id"]
```

El test de validación de fechas verifica que el backend rechace datos inválidos:
```python
async def test_crear_obra_fechas_invalidas(client, auth_headers):
    # La fecha de fin no puede ser anterior a la de inicio
    resp = await client.post("/api/v1/obras", json={
        "name": "Obra Fechas Mal",
        "start_date": "2025-12-01",
        "expected_end_date": "2025-01-01",  # antes que start_date
    }, headers=auth_headers)
    assert resp.status_code == 422  # FastAPI valida con Pydantic
```

**Tests reales:** 8

---

### I03 — `backend/tests/integration/test_tasks.py` ✅ P1

**Destino:** Probar el CRUD de tareas y las transiciones de estado a través de la API.

**Por qué es importante:** Las transiciones de estado son el corazón del sistema. Los tests unitarios (U04) verifican el diccionario en abstracto. Los tests de integración verifican que el endpoint real aplique esas reglas correctamente con datos en la BD.

**Lógica de implementación:**

El test más complejo verifica el flujo completo de estados:
```python
async def test_flujo_completo_de_estados(client, auth_headers, obra_base):
    # Crear tarea (estado inicial: pendiente)
    tarea = (await client.post("/api/v1/tasks", json={
        "obra_id": obra_base["id"], "title": "Tarea"
    }, headers=auth_headers)).json()

    # pendiente → en_progreso (válido)
    r1 = await client.post(f"/api/v1/tasks/{tarea['id']}/status",
        json={"status": "en_progreso", "triggered_by": "web"}, headers=auth_headers)
    assert r1.status_code == 200

    # en_progreso → completada (válido)
    r2 = await client.post(f"/api/v1/tasks/{tarea['id']}/status",
        json={"status": "completada", "triggered_by": "web"}, headers=auth_headers)
    assert r2.json()["status"] == "completada"
```

El test de transición inválida verifica que el backend rechace:
```python
async def test_actualizar_estado_invalido(client, auth_headers, obra_base):
    # pendiente → completada directo (inválido, falta pasar por en_progreso)
    resp = await client.post(f"/api/v1/tasks/{tarea_id}/status",
        json={"status": "completada", "triggered_by": "web"}, headers=auth_headers)
    assert resp.status_code in (400, 422)  # debe rechazarse
```

**Tests reales:** 8

---

### I04 — `backend/tests/integration/test_alerts.py` ✅ P1

**Destino:** Probar el listado de alertas y marcarlas como leídas. Las alertas se generan como efecto secundario de cambios de estado en tareas.

**Por qué es importante:** Las alertas son la forma en que el jefe de obra se entera de problemas. Si `task_blocked` no genera su alerta correspondiente, el jefe trabaja a ciegas.

**Lógica de implementación:**

Las alertas no se crean directamente — son un efecto secundario. Para tener una alerta en la BD hay que crear una tarea, avanzarla a `en_progreso`, y luego bloquearla:

```python
async def test_bloquear_tarea_genera_alerta(client, auth_headers, obra_base):
    # 1. Crear tarea
    tarea = await _crear_tarea(client, auth_headers, obra_base["id"])
    # 2. Avanzar a en_progreso (pendiente → en_progreso)
    await _avanzar_a_en_progreso(client, auth_headers, tarea["id"])
    # 3. Bloquear (en_progreso → bloqueada) → esto genera la alerta
    await client.post(f"/api/v1/tasks/{tarea['id']}/status",
        json={"status": "bloqueada", "triggered_by": "web"}, headers=auth_headers)

    # 4. Verificar que la alerta existe
    resp = await client.get("/api/v1/alerts", headers=auth_headers)
    tipos = [a["type"] for a in resp.json()]
    assert "task_blocked" in tipos
```

El helper `_crear_tarea` y `_avanzar_a_en_progreso` son funciones auxiliares dentro del archivo de test para evitar repetir código. No son fixtures de pytest, son funciones Python normales.

**Tests reales:** 5

---

## Flujo completo de un test de integración

```
pytest ejecuta test_crear_obra(client, auth_headers, obra_base)
│
├── pytest arma las dependencias en orden:
│   ├── limpiar_tablas: "voy a limpiar cuando termine"
│   ├── override_db: FastAPI apunta a constructa_test
│   ├── client: crea el cliente HTTP en memoria (sin puerto real)
│   ├── usuario_registrado: POST /auth/register → usuario en BD
│   ├── auth_headers: POST /auth/login → JWT listo
│   └── obra_base: POST /obras → obra en BD
│
├── EL TEST CORRE:
│   └── client.post("/api/v1/obras", json={"name": "Edificio Central"})
│       └── FastAPI procesa el request
│           └── ObraService.create() → BD de test
│               └── devuelve 201 con el id creado
│
└── pytest limpia en orden inverso:
    ├── override_db: dependency_overrides.clear()
    └── limpiar_tablas: TRUNCATE todas las tablas (BD vacía para el próximo test)
```

---

# Estructura de Carpetas — Estado Actual

```
backend/
├── pytest.ini                                 ✅
└── tests/
    ├── conftest.py                            ✅ env vars para unitarios
    ├── unit/
    │   ├── __init__.py
    │   ├── test_message_interpreter.py        ✅ 19 tests
    │   ├── test_security.py                   ✅ 8 tests
    │   ├── test_conversation_helpers.py       ✅ 39 tests
    │   └── test_task_state_machine.py         ✅ 16 tests
    └── integration/
        ├── __init__.py
        ├── conftest.py                        ✅ infraestructura (BD, fixtures, cliente)
        ├── test_auth.py                       ✅ 8 tests
        ├── test_obras.py                      ✅ 8 tests
        ├── test_tasks.py                      ✅ 8 tests
        └── test_alerts.py                     ✅ 5 tests (BD: constructa_test)

frontend/
└── src/
    ├── lib/
    │   ├── documentUtils.ts                   ✅ extraído para testear (buildGroups)
    │   ├── formatUtils.ts                     ✅ extraído (getInitials, avatarColor, etc.)
    │   ├── taskUtils.ts                       ✅ extraído (isOverdue, diffDays)
    │   └── alertUtils.ts                      ✅ extraído (getAlertLabel)
    └── __tests__/
        ├── buildGroups.test.ts                ✅ 6 tests
        ├── formatUtils.test.ts                ✅ 15 tests
        ├── taskUtils.test.ts                  ✅ 10 tests
        └── alertUtils.test.ts                 ✅ 7 tests
```

---

# Resumen de Tests Implementados

| ID | Archivo | Tipo | Tests | Qué verifica |
|---|---|---|---|---|
| U01 | `test_message_interpreter.py` | Unitario backend | 19 | Detección de keywords del chatbot |
| U02 | `test_security.py` | Unitario backend | 8 | JWT y bcrypt |
| U03 | `test_conversation_helpers.py` | Unitario backend | 39 | Helpers de navegación del chatbot |
| U04 | `test_task_state_machine.py` | Unitario backend | 16 | Transiciones de estado válidas/inválidas |
| U05 | `buildGroups.test.ts` | Unitario frontend | 6 | Agrupación de documentos por versión |
| U06 | `formatUtils.test.ts` | Unitario frontend | 15 | Iniciales, colores, fechas, tiempo relativo |
| U07 | `taskUtils.test.ts` | Unitario frontend | 10 | Vencimiento de tareas, diferencia de días |
| U08 | `alertUtils.test.ts` | Unitario frontend | 7 | Etiquetas de alertas |
| I01 | `test_auth.py` | Integración | 8 | Login, registro, rutas protegidas |
| I02 | `test_obras.py` | Integración | 8 | CRUD de obras vía API |
| I03 | `test_tasks.py` | Integración | 8 | CRUD de tareas y máquina de estados vía API |
| I04 | `test_alerts.py` | Integración | 5 | Generación y lectura de alertas vía API |
| **Total implementado** | | | **149 tests** | |

> Los 112 del backend se corren con `.venv/bin/python -m pytest tests/ -v`
> Los 38 del frontend se corren con `npm test`

---

# PARTE 3 — Tests E2E con Cypress ✅ COMPLETADA

Los tests E2E (End-to-End) corren contra la aplicación completa en un navegador real. Simulan exactamente lo que haría un usuario: abrir el navegador, escribir en campos, hacer clic en botones, verificar que el texto correcto aparece en pantalla. No mockean nada — el frontend habla con el backend real que habla con la base de datos real.

---

## Cómo funciona Cypress por dentro

### El modelo mental fundamental

Cypress NO es como pytest ni como Vitest. No ejecuta el código de prueba directamente. En cambio:

1. **Cypress abre un navegador real** (Chromium por defecto)
2. **Cypress corre el test en un iframe** dentro de ese navegador, en el mismo proceso que la app
3. **Cada `cy.algo()` agrega un comando a una cola**, no lo ejecuta inmediatamente
4. **Cypress ejecuta la cola de a uno**, esperando a que cada comando termine antes de pasar al siguiente

Esto es crítico para entender por qué los tests se ven así:

```typescript
// ESTO SE VE SINCRÓNICO PERO ES ASINCRÓNICO
cy.get("[data-cy=email-input]").type("admin@ejemplo.com")
cy.get("[data-cy=password-input]").type("contraseña")
cy.get("[data-cy=submit-btn]").click()
cy.contains("Mis obras").should("be.visible")
```

Lo que realmente pasa:
1. `cy.get(...)` → agrega "buscar ese elemento" a la cola → espera hasta 8 segundos si no lo encuentra
2. `.type(...)` → cuando el elemento existe, escribe el texto carácter por carácter
3. `cy.get(...)` → busca el segundo elemento
4. `.click()` → hace clic en el botón
5. `cy.contains(...)` → busca texto en la página, reintentando cada 50ms hasta encontrarlo o agotar el timeout

**No hay `await` porque la cola se ejecuta sola.** Cypress ya sabe que cada comando depende del anterior.

---

### Retryability — la característica más importante de Cypress

Cuando hacés `.should("be.visible")`, Cypress no verifica una sola vez. **Reintenta la aserción cada 50ms** hasta que pase o hasta que expire el timeout (8 segundos por defecto).

Esto resuelve el problema clásico de los tests E2E: los elementos que tardan en aparecer (por una petición HTTP, una animación, etc.) no requieren `sleep()` o `waitForElement()` explícitos. Cypress simplemente reintenta.

```typescript
// Esto NO necesita esperar explícitamente
cy.get("[data-cy=submit-btn]").click()
cy.contains("Mis obras").should("be.visible")
// Cypress va a reintentar cy.contains("Mis obras") cada 50ms hasta que aparezca
// (máximo 8 segundos, configurable en cypress.config.ts con defaultCommandTimeout)
```

Si la asserción no se cumple en el tiempo límite, el test falla con el mensaje "Expected to find element: 'Mis obras' but never found it."

---

### Requisito previo: dos servidores corriendo

A diferencia de los tests unitarios e integración (sin servidores), Cypress necesita todo corriendo:

```
Terminal 1:  cd backend  →  .venv/bin/uvicorn app.main:app --reload
Terminal 2:  cd frontend →  npm run dev
Terminal 3:  cd frontend →  npm run cypress
```

Cypress se configura en `cypress.config.ts`:
```typescript
export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",  // URL del frontend
    defaultCommandTimeout: 8000,       // cuánto espera Cypress antes de fallar (ms)
    requestTimeout: 10000,             // cuánto espera cy.request() al backend (ms)
  },
})
```

Cuando el test hace `cy.visit("/")`, Cypress abre `http://localhost:5173/` en el navegador. Cuando el frontend llama a `http://localhost:8000/api/v1/...`, esa petición va al backend real.

---

## Los archivos de infraestructura

---

### `cypress.config.ts` — configuración central

```typescript
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",   // cy.visit("/") abre esta URL
    supportFile: "cypress/support/e2e.ts", // archivo que Cypress carga antes de cada test
    specPattern: "cypress/e2e/**/*.cy.ts", // dónde buscar los archivos de test
    viewportWidth: 1280,               // tamaño de la ventana del navegador
    viewportHeight: 800,
    defaultCommandTimeout: 8000,       // timeout para cy.get(), cy.contains(), .should()
    requestTimeout: 10000,             // timeout para cy.request()
    video: false,                      // no grabar video (ocupa espacio, útil en CI)
    screenshotOnRunFailure: true,      // captura pantalla cuando un test falla
  },
});
```

**Por qué `video: false`:** El video de cada corrida ocupa mucho espacio. Se desactiva para desarrollo. En CI se puede activar temporalmente para depurar tests que fallan solo en el servidor de CI.

---

### `cypress/support/e2e.ts` — punto de entrada

```typescript
import "./commands";
```

Este archivo se ejecuta **antes de cada archivo de test**. Su única función es importar los comandos personalizados. Si en el futuro hubiera código de inicialización global (limpiar cookies, configurar interceptors), iría acá.

---

### `cypress/support/commands.ts` — comandos personalizados

Este archivo extiende Cypress con comandos propios del proyecto. Los comandos personalizados son funciones que se llaman igual que los comandos nativos (`cy.loginAdmin()`, `cy.crearObra()`, etc.).

#### `cy.loginAs(email, password)` — el comando más importante

```typescript
Cypress.Commands.add("loginAs", (email: string, password: string) => {
  cy.request("POST", `${API}/auth/login`, { email, password })
    .then(({ body }) => {
      cy.visit("/", {
        onBeforeLoad(win) {
          win.localStorage.setItem("access_token", body.access_token);
          win.sessionStorage.setItem("access_token", body.access_token);
        },
      });
    });
});
```

**Por qué `onBeforeLoad` y no simplemente `cy.visit()` seguido de `localStorage.setItem()`?**

La app de Constructa al cargar ejecuta este código en `tokenStorage.ts`:
```typescript
// Se ejecuta cuando el módulo carga (antes de cualquier componente React)
if (!sessionStorage.getItem(KEY)) {
  const stored = localStorage.getItem(KEY);
  if (stored) sessionStorage.setItem(KEY, stored);
}
```

Y en `App.tsx`:
```typescript
const [authed, setAuthed] = useState(() => !!getToken());
```

El `useState()` con función inicializadora corre **una sola vez cuando React se monta**. Si hacemos `cy.visit("/")` y después seteamos el token en localStorage, React ya se montó y ya evaluó `getToken()` → encontró `null` → `authed = false` → muestra el login.

`onBeforeLoad` corre **antes de que JavaScript de la página se ejecute**, así que cuando React se monta, ya encuentra el token en localStorage/sessionStorage y muestra la app autenticada directamente.

#### `cy.getAdminToken()` — obtener el JWT para peticiones API

```typescript
Cypress.Commands.add("getAdminToken", () => {
  return cy.request("POST", `${API}/auth/login`, {
    email: Cypress.env("ADMIN_EMAIL"),
    password: Cypress.env("ADMIN_PASSWORD"),
  }).its("body.access_token");
});
```

`cy.request()` es el equivalente de `axios.post()` en Cypress: hace una petición HTTP real pero sin abrir el navegador. Es síncrono dentro de la cola de comandos de Cypress.

`.its("body.access_token")` es un shortcut para `.then(response => response.body.access_token)`. Extrae una propiedad anidada del objeto.

El token se usa para hacer otras peticiones API de precondición:
```typescript
cy.getAdminToken().then((token) => {
  cy.crearObra(token, "Mi Obra").then((obra) => {
    // ahora `obra.id` tiene el ID de la obra recién creada
  });
});
```

#### `cy.crearObra()` y `cy.crearTarea()` — precondiciones via API

```typescript
Cypress.Commands.add("crearObra", (token: string, name: string) => {
  return cy.request({
    method: "POST",
    url: `${API}/obras`,
    headers: { Authorization: `Bearer ${token}` },
    body: { name },
  }).its("body");
});
```

**Por qué crear datos via API en lugar de via UI:**
- El wizard de obras tiene 4 pasos → mínimo 8 clics + 1 escritura → lento
- Si el test E03 (tareas) empieza creando una obra por UI, y el wizard tiene un bug, E03 falla por un motivo que no es el que está testeando
- Crear la obra via API aísla el test: E03 solo puede fallar por bugs en la UI de tareas
- Es 10x más rápido (no hay animaciones, esperas de DOM, etc.)

**Regla general:** La UI se testea cuando es lo que el test intenta verificar. Todo lo demás (precondiciones) va por API.

---

### `cypress.env.json` — credenciales del admin

```json
{
  "ADMIN_EMAIL": "Facu@admin.com",
  "ADMIN_PASSWORD": "Admin123"
}
```

Este archivo **no va al repositorio** (está en `.gitignore`). En los tests se accede con `Cypress.env("ADMIN_EMAIL")`.

**Por qué no hardcodear las credenciales en el código de test:** Si las credenciales van en el código y el repo es público, cualquiera las ve. Con `cypress.env.json` gitignoreado, cada desarrollador pone sus propias credenciales localmente.

**Por qué el admin:** La primera cuenta registrada en el sistema recibe `role = "admin"` automáticamente (lógica en `auth_service.py`). Los admins tienen el permiso `obra.create` que muestra el botón "Nueva obra". Un colaborador no vería ese botón, así que los tests de obras requieren el rol admin.

---

### `data-cy` — selectores estables

Cypress puede buscar elementos de muchas formas:
- `cy.get("button")` → demasiado genérico, hay decenas de botones
- `cy.get(".bg-orange-500")` → frágil, si cambia el estilo el test falla
- `cy.contains("Nueva tarea")` → ok si el texto no cambia de idioma
- `cy.get("[data-cy=nueva-tarea-btn]")` → estable, independiente de estilos y textos

El atributo `data-cy` no tiene efecto en el comportamiento de la app. Es solo para que Cypress lo encuentre. Se agregó a los elementos más importantes:

```tsx
// LoginPage.tsx
<input data-cy="email-input" type="email" ... />
<input data-cy="password-input" type="password" ... />
<button data-cy="submit-btn" type="submit" ... />
<div data-cy="error-message" ...>{error}</div>

// PortfolioPage.tsx
<button data-cy="nueva-obra-btn" onClick={onNewObra} ...>Nueva obra</button>

// ObraSetupWizard.tsx
<input data-cy="obra-name-input" placeholder="Ej: Edificio Palermo III" ... />

// Sidebar.tsx
<button data-cy="logout-btn" onClick={onLogout} ...>

// ObraDetailPage.tsx
<button data-cy="nueva-tarea-btn" onClick={() => setShowCreateTask(true)} ...>

// TaskFormModal.tsx
<input data-cy="task-title-input" ... />
<button data-cy="task-submit-btn" type="submit" ... />

// TaskTable.tsx — el botón que abre el dropdown de estado
<button data-cy="status-toggle" ...>{estadoActual}</button>

// AlertasTab.tsx
<li data-cy="alerta-item" data-unread={!isRead ? "true" : undefined} ...>
<button data-cy="marcar-leida-btn" onClick={() => onMarkRead(alert.id)} ...>
```

---

### `before()` vs `beforeEach()` en Cypress

Cypress tiene dos hooks de setup que se confunden fácilmente:

| Hook | Cuándo corre | Cuándo usarlo |
|---|---|---|
| `before()` | Una sola vez antes de TODOS los tests del archivo | Crear datos que se comparten entre tests (una obra, un token) |
| `beforeEach()` | Antes de CADA test individual | Login, navegación — cosas que se necesitan frescas en cada test |

En E03 (tareas):
```typescript
// La obra se crea una sola vez (son 4 tests, no necesitamos 4 obras diferentes)
before(() => {
  cy.getAdminToken().then((t) => {
    token = t
    cy.crearObra(token, "Obra Tareas").then((obra) => {
      obraId = obra.id  // guardamos el ID para usarlo en cy.crearTarea()
    })
  })
})

// El login se hace fresco en cada test (el token puede expirar, la sesión se cierra)
beforeEach(() => {
  cy.loginAdmin()
  cy.contains(obraName).click()  // navegar a la obra
})
```

**Por qué `let token` y `let obraId` afuera:** Las variables declaradas con `let` fuera de los hooks retienen su valor entre hooks porque son closures. La asignación dentro de `.then()` (que es asíncrono) se resuelve antes de que el test corra porque Cypress serializa la ejecución.

---

### `cy.contains()` vs `cy.get()` — cuándo usar cada uno

```typescript
// cy.get() — busca por selector CSS
cy.get("[data-cy=nueva-obra-btn]")   // por atributo data-cy (recomendado)
cy.get("button[type=submit]")        // por tag + atributo
cy.get(".bg-red-500")                // por clase CSS (frágil)

// cy.contains() — busca por texto visible
cy.contains("Mis obras")                    // cualquier elemento con ese texto
cy.contains("button", "Siguiente")          // un <button> que contenga ese texto
cy.contains("tr", "Tarea Cypress").find("td") // una <tr> con ese texto, luego busca <td> dentro
```

La combinación más poderosa es `cy.contains()` para encontrar la fila correcta y `.find()` para buscar un elemento dentro de ella:

```typescript
// Busca la fila que contiene el título de la tarea, y dentro de esa fila
// busca el botón de status toggle
cy.contains("tr", titulo).find("[data-cy=status-toggle]").click()
```

Esto es más robusto que buscar por posición (`.eq(0)`) porque aunque haya múltiples tareas en la tabla, siempre encuentra la correcta por nombre.

---

## Archivos de tests E2E

---

### E01 — `cypress/e2e/E01_login.cy.ts` ✅ P1

**Destino:** Verificar el flujo completo de login y logout desde el navegador.

**Por qué es importante:** Los tests de integración (I01) ya verifican que el endpoint `/auth/login` funciona. Pero NO verifican que el componente React `LoginPage` llame correctamente a la API, que el token se guarde bien en el storage, que el estado de React cambie de "no autenticado" a "autenticado", y que el mensaje de error sea visible cuando las credenciales son incorrectas. Eso solo se puede ver en el navegador real.

**Lógica de implementación:**

Los tests de este archivo deliberadamente NO usan `cy.loginAdmin()` para los tests que verifican el formulario — porque el formulario ES lo que se está testeando. Solo el último test (logout) usa `cy.loginAdmin()` para empezar desde un estado ya logueado.

```typescript
describe("E01 — Login y autenticación", () => {

  // Sin token en localStorage, la app debe mostrar el formulario de login
  it("sin sesión activa muestra la pantalla de login", () => {
    cy.visit("/")
    // Estos tres elementos deben existir y ser visibles
    cy.get("[data-cy=email-input]").should("be.visible")
    cy.get("[data-cy=password-input]").should("be.visible")
    cy.get("[data-cy=submit-btn]").should("be.visible")
  })

  // Flujo feliz: credenciales correctas → app cargada
  it("login exitoso con credenciales correctas navega al portfolio", () => {
    cy.visit("/")
    cy.get("[data-cy=email-input]").type(Cypress.env("ADMIN_EMAIL"))
    cy.get("[data-cy=password-input]").type(Cypress.env("ADMIN_PASSWORD"))
    cy.get("[data-cy=submit-btn]").click()
    // "Mis obras" es el título del portfolio — aparece solo si el login fue exitoso
    // Cypress reintenta este check hasta 10 segundos (defaultCommandTimeout en config)
    cy.contains("Mis obras", { timeout: 10000 }).should("be.visible")
  })

  // Credenciales incorrectas → el backend devuelve 401 → LoginPage muestra el error
  it("credenciales incorrectas muestran el mensaje de error", () => {
    cy.visit("/")
    cy.get("[data-cy=email-input]").type(Cypress.env("ADMIN_EMAIL"))
    cy.get("[data-cy=password-input]").type("contraseña_totalmente_incorrecta")
    cy.get("[data-cy=submit-btn]").click()
    cy.get("[data-cy=error-message]").should("be.visible")
    cy.get("[data-cy=error-message]").should("contain", "Credenciales inválidas")
  })

  // Logout limpia el storage y vuelve al login
  it("logout cierra la sesión y regresa al login", () => {
    cy.loginAdmin()  // aquí sí usamos el comando rápido, porque el login ya fue testeado
    cy.contains("Mis obras", { timeout: 10000 }).should("be.visible")
    cy.get("[data-cy=logout-btn]").click()
    // Después del logout, el formulario de login debe aparecer
    cy.get("[data-cy=email-input]").should("be.visible")
  })
})
```

**Tests:** 5 | **Precondiciones:** ninguna (credenciales de `cypress.env.json`)

---

### E02 — `cypress/e2e/E02_obras.cy.ts` ✅ P1

**Destino:** Verificar que el wizard de 4 pasos crea una obra y que la navegación al detalle funciona.

**Por qué es importante:** El wizard tiene validaciones en el paso 1 (nombre obligatorio), comunicación con el backend en el paso 4, y actualización del estado de React después de crear. Ninguno de esos tres momentos está cubierto por tests unitarios o de integración.

**Lógica de implementación:**

```typescript
describe("E02 — Gestión de obras", () => {

  beforeEach(() => {
    cy.loginAdmin()
    cy.contains("Mis obras", { timeout: 10000 }).should("be.visible")
  })

  // El botón "Nueva obra" solo aparece para usuarios con permiso obra.create (admins)
  it("el botón de nueva obra está visible en el portfolio", () => {
    cy.get("[data-cy=nueva-obra-btn]").should("be.visible")
  })

  // Flujo completo del wizard de 4 pasos
  it("crear una obra nueva via el wizard de configuración", () => {
    const obraName = `Cypress E2E ${Date.now()}`  // nombre único por timestamp
    
    cy.get("[data-cy=nueva-obra-btn]").click()
    
    // PASO 1: datos básicos — el nombre es obligatorio
    cy.get("[data-cy=obra-name-input]").should("be.visible").type(obraName)
    cy.contains("button", "Siguiente").click()
    
    // PASO 2: responsables — opcional, hacemos skip
    cy.contains("button", "Siguiente").click()
    
    // PASO 3: tareas iniciales — opcional, hacemos skip
    cy.contains("button", "Revisar y confirmar").click()
    
    // PASO 4: confirmación — acá el frontend llama a POST /obras
    cy.contains("button", "Crear obra y comenzar seguimiento").click()
    
    // La obra nueva debe aparecer en el portfolio
    cy.contains(obraName, { timeout: 12000 }).should("be.visible")
  })

  // Clic en una obra card navega al detalle
  it("seleccionar una obra existente navega a su detalle", () => {
    let token: string
    const obraName = `Obra Detalle ${Date.now()}`
    
    // Crear obra via API para no depender del wizard
    cy.getAdminToken().then((t) => {
      token = t
      cy.crearObra(token, obraName).then(() => {
        cy.reload()  // recargar para que la nueva obra aparezca en el portfolio
        cy.contains(obraName, { timeout: 10000 }).click()
        cy.contains(obraName, { timeout: 8000 }).should("be.visible")  // header de la obra
        cy.contains("Resumen").should("be.visible")  // tab activa por defecto
      })
    })
  })
})
```

**Por qué `Date.now()` en el nombre:** Si corremos el test dos veces, la primera obra ya existe. Usar un timestamp en el nombre asegura que cada corrida crea una obra con nombre único. No limpiamos las obras de test porque no hay un endpoint de eliminación de obras en la API.

**Tests:** 3 | **Precondición:** usuario admin con permiso `obra.create`

---

### E03 — `cypress/e2e/E03_tareas.cy.ts` ✅ P1

**Destino:** Verificar la creación de tareas via UI y el cambio de estado usando el dropdown de la tabla.

**Por qué es importante:** La tabla de tareas con el dropdown de estado es el núcleo del sistema. Si hay un bug en el handler `onStatusChange` de React, o el backend rechaza la transición con un 400, el usuario no puede gestionar el trabajo — y eso no lo detectaría ningún test unitario o de integración del frontend.

**Lógica de implementación:**

```typescript
describe("E03 — Gestión de tareas", () => {
  let token: string
  let obraId: number
  const obraName = `Obra Tareas ${Date.now()}`

  // before() = una sola vez antes de todos los tests de este archivo
  // Crea el token y la obra de prueba compartida
  before(() => {
    cy.getAdminToken().then((t) => {
      token = t
      cy.crearObra(token, obraName).then((obra) => {
        obraId = obra.id  // guardamos el ID para cy.crearTarea()
      })
    })
  })

  // beforeEach() = antes de cada test individual
  // Login + navegar al detalle de la obra (se hace fresco por test)
  beforeEach(() => {
    cy.loginAdmin()
    cy.contains(obraName, { timeout: 10000 }).click()
    cy.contains(obraName, { timeout: 8000 }).should("be.visible")
  })

  // Crear tarea: botón → modal → formulario → submit → tarea aparece
  it("crear una tarea nueva desde el botón de la obra", () => {
    cy.get("[data-cy=nueva-tarea-btn]").click()
    cy.get("[data-cy=task-title-input]").should("be.visible").type("Tarea E2E Cypress")
    cy.get("[data-cy=task-submit-btn]").click()
    cy.contains("Tarea E2E Cypress", { timeout: 8000 }).should("be.visible")
  })

  // Validación: submit sin título no cierra el modal (la validación lo impide)
  it("intentar crear una tarea sin título muestra error de validación", () => {
    cy.get("[data-cy=nueva-tarea-btn]").click()
    cy.get("[data-cy=task-submit-btn]").click()
    // El modal sigue abierto (no se cerró) porque el título es obligatorio
    cy.get("[data-cy=task-title-input]").should("be.visible")
  })

  // Cambiar estado via dropdown
  it("cambiar el estado de una tarea a en progreso via el dropdown", () => {
    const titulo = `Estado ${Date.now()}`
    
    // Crear tarea via API (precondición)
    cy.crearTarea(token, obraId, titulo).then(() => {
      cy.contains("Tareas").click()  // navegar a la tab Tareas del sidebar
      cy.contains(titulo, { timeout: 8000 }).should("be.visible")
      
      // cy.contains("tr", titulo) → busca la fila <tr> que contiene ese texto
      // .find("[data-cy=status-toggle]") → dentro de esa fila, busca el botón de estado
      cy.contains("tr", titulo).find("[data-cy=status-toggle]").click()
      
      // El dropdown abre → hacemos clic en la opción "En progreso"
      cy.contains("En progreso").click()
      
      // Verificar que el botón de estado ahora dice "En progreso"
      cy.contains("tr", titulo)
        .find("[data-cy=status-toggle]")
        .should("contain", "En progreso")
    })
  })

  // Flujo completo de estados (la máquina de estados vista desde el usuario)
  it("flujo completo de estados: pendiente → en progreso → completada", () => {
    const titulo = `Flujo ${Date.now()}`
    
    cy.crearTarea(token, obraId, titulo).then(() => {
      cy.contains("Tareas").click()
      cy.contains(titulo, { timeout: 8000 }).should("be.visible")
      
      // pendiente → en progreso
      cy.contains("tr", titulo).find("[data-cy=status-toggle]").click()
      cy.contains("En progreso").click()
      cy.contains("tr", titulo).find("[data-cy=status-toggle]").should("contain", "En progreso")
      
      // en progreso → completada
      cy.contains("tr", titulo).find("[data-cy=status-toggle]").click()
      cy.contains("Completada").click()
      cy.contains("tr", titulo).find("[data-cy=status-toggle]").should("contain", "Completada")
    })
  })
})
```

**Detalle: por qué `before()` y no `beforeEach()` para la obra**

Si usáramos `beforeEach()` para crear la obra, crearíamos una obra nueva por cada test (4 obras en total). No es necesario: la obra es solo el contenedor. Lo que importa son las tareas que se crean dentro de ella, y cada test crea sus propias tareas con nombres únicos por timestamp.

**Tests:** 4 | **Precondición:** obra creada via API en `before()`

---

### E04 — `cypress/e2e/E04_alertas.cy.ts` ✅ P2

**Destino:** Verificar que bloquear una tarea genera una alerta visible en la UI, y que el botón "marcar como leída" funciona.

**Por qué es importante:** Las alertas son el mecanismo de notificación del sistema. El backend las crea automáticamente cuando una tarea pasa a `bloqueada`. Si hay un bug en la cadena backend→frontend (la alerta se crea pero no se muestra, o el frontend no la carga correctamente), ningún otro test lo detectaría.

**Lógica de implementación:**

```typescript
describe("E04 — Alertas", () => {
  let token: string
  let obraId: number
  const obraName = `Obra Alertas ${Date.now()}`

  before(() => {
    cy.getAdminToken().then((t) => {
      token = t
      cy.crearObra(token, obraName).then((obra) => {
        obraId = obra.id
      })
    })
  })

  beforeEach(() => {
    cy.loginAdmin()
    cy.contains(obraName, { timeout: 10000 }).click()
    cy.contains(obraName, { timeout: 8000 }).should("be.visible")
  })

  // La tab Alertas existe y se puede abrir (aunque no haya alertas)
  it("la tab de Alertas se puede abrir y muestra su contenido", () => {
    cy.contains("Alertas").click()
    cy.contains("Alertas", { timeout: 6000 }).should("be.visible")
  })

  // El camino para generar una alerta:
  // 1. Crear tarea (estado: pendiente)
  // 2. Avanzar a en_progreso (requerido por la máquina de estados)
  // 3. Bloquear → el backend crea la alerta de tipo task_blocked
  it("bloquear una tarea genera una alerta visible en la tab Alertas", () => {
    const titulo = `Tarea Bloqueada ${Date.now()}`
    
    cy.crearTarea(token, obraId, titulo).then((tarea) => {
      cy.avanzarEstadoTarea(token, tarea.id, "en_progreso")
      cy.avanzarEstadoTarea(token, tarea.id, "bloqueada")  // esto dispara la alerta
      
      cy.contains("Alertas").click()
      // La alerta tiene el mensaje que incluye el título de la tarea
      cy.contains(titulo, { timeout: 8000 }).should("be.visible")
    })
  })

  // Marcar como leída cambia el estado de la alerta
  it("marcar una alerta como leída la quita de la lista de no leídas", () => {
    const titulo = `Tarea Para Leer ${Date.now()}`
    
    cy.crearTarea(token, obraId, titulo).then((tarea) => {
      cy.avanzarEstadoTarea(token, tarea.id, "en_progreso")
      cy.avanzarEstadoTarea(token, tarea.id, "bloqueada")
      
      cy.contains("Alertas").click()
      cy.contains(titulo, { timeout: 8000 }).should("be.visible")
      
      // Busca el <li> (alerta-item) que contiene el título de la tarea
      // y dentro de él busca el botón de marcar como leída
      cy.contains(titulo)
        .closest("[data-cy=alerta-item]")
        .find("[data-cy=marcar-leida-btn]")
        .click()
      
      // La alerta ya no tiene el atributo data-unread (fue marcada como leída)
      cy.contains(titulo)
        .closest("[data-cy=alerta-item]")
        .should("not.have.attr", "data-unread")
    })
  })
})
```

**Detalle: `cy.avanzarEstadoTarea` consecutivos**

```typescript
cy.avanzarEstadoTarea(token, tarea.id, "en_progreso")
cy.avanzarEstadoTarea(token, tarea.id, "bloqueada")
```

Aunque se ven sincrónicas, estas dos líneas son comandos en la cola de Cypress. El segundo no corre hasta que el primero (la petición HTTP al backend) haya completado. No se necesita `await` porque Cypress serializa automáticamente la cola.

**Detalle: `.closest("[data-cy=alerta-item]")`**

`.closest()` es el inverso de `.find()`: en lugar de buscar hacia abajo (hijos), busca hacia arriba (ancestros). Partimos del elemento que contiene el texto del título y subimos hasta encontrar el `<li>` con `data-cy="alerta-item"`. Desde ahí bajamos de nuevo con `.find("[data-cy=marcar-leida-btn]")` para encontrar el botón específico de esa alerta.

**Tests:** 3 | **Precondición:** obra creada via API en `before()`

---

# Lo que NO se testea (límites del plan)

- **Socket.IO events**: requieren setup muy complejo para poco valor en MVP
- **Scheduler jobs end-to-end**: se testea la lógica interna llamando al service directamente
- **Integración real con Twilio**: siempre mockeado — no se envían WhatsApps reales en tests
- **Migrations de Alembic**: se validan al aplicarlas en constructa_test, no tienen tests propios
- **Chatbot E2E con WhatsApp real**: requiere Twilio sandbox — fuera del alcance
