"""I03 — Tests de integración: CRUD de tareas

Verifica crear, listar, actualizar estado y eliminar tareas
dentro de una obra existente.
"""
from httpx import AsyncClient


# ── Crear tarea ────────────────────────────────────────────────────────────────

# Verifica que se pueda crear una tarea con título válido dentro de una obra.
async def test_crear_tarea(client: AsyncClient, auth_headers: dict, obra_base: dict) -> None:
    resp = await client.post("/api/v1/tasks", json={
        "obra_id": obra_base["id"],
        "title": "Cimentación",
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Cimentación"
    assert data["obra_id"] == obra_base["id"]
    assert data["status"] == "pendiente"


# Verifica que crear una tarea sin título devuelva error de validación.
async def test_crear_tarea_sin_titulo(client: AsyncClient, auth_headers: dict, obra_base: dict) -> None:
    resp = await client.post("/api/v1/tasks", json={
        "obra_id": obra_base["id"],
    }, headers=auth_headers)
    assert resp.status_code == 422


# Verifica que crear una tarea con fecha de fin antes que inicio devuelva error.
async def test_crear_tarea_fechas_invalidas(client: AsyncClient, auth_headers: dict, obra_base: dict) -> None:
    resp = await client.post("/api/v1/tasks", json={
        "obra_id": obra_base["id"],
        "title": "Tarea Mala",
        "start_date": "2025-12-01",
        "due_date": "2025-01-01",
    }, headers=auth_headers)
    assert resp.status_code == 422


# ── Listar tareas ──────────────────────────────────────────────────────────────

# Verifica que listar tareas de una obra devuelva una lista.
async def test_listar_tareas_de_obra(client: AsyncClient, auth_headers: dict, obra_base: dict) -> None:
    await client.post("/api/v1/tasks", json={
        "obra_id": obra_base["id"],
        "title": "Tarea Listado",
    }, headers=auth_headers)
    resp = await client.get(f"/api/v1/tasks/obra/{obra_base['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert any(t["title"] == "Tarea Listado" for t in resp.json())


# ── Actualizar estado ──────────────────────────────────────────────────────────

# Verifica que una transición válida (pendiente → en_progreso) se aplique correctamente.
async def test_actualizar_estado_valido(client: AsyncClient, auth_headers: dict, obra_base: dict) -> None:
    tarea = (await client.post("/api/v1/tasks", json={
        "obra_id": obra_base["id"],
        "title": "Tarea Estado",
    }, headers=auth_headers)).json()

    resp = await client.post(f"/api/v1/tasks/{tarea['id']}/status", json={
        "status": "en_progreso",
        "triggered_by": "web",
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "en_progreso"


# Verifica que una transición inválida (pendiente → completada) sea rechazada.
async def test_actualizar_estado_invalido(client: AsyncClient, auth_headers: dict, obra_base: dict) -> None:
    tarea = (await client.post("/api/v1/tasks", json={
        "obra_id": obra_base["id"],
        "title": "Tarea Estado Invalido",
    }, headers=auth_headers)).json()

    resp = await client.post(f"/api/v1/tasks/{tarea['id']}/status", json={
        "status": "completada",
        "triggered_by": "web",
    }, headers=auth_headers)
    assert resp.status_code in (400, 422)


# Verifica la secuencia completa: pendiente → en_progreso → completada.
async def test_flujo_completo_de_estados(client: AsyncClient, auth_headers: dict, obra_base: dict) -> None:
    tarea = (await client.post("/api/v1/tasks", json={
        "obra_id": obra_base["id"],
        "title": "Tarea Flujo Completo",
    }, headers=auth_headers)).json()

    r1 = await client.post(f"/api/v1/tasks/{tarea['id']}/status", json={
        "status": "en_progreso", "triggered_by": "web"
    }, headers=auth_headers)
    assert r1.status_code == 200

    r2 = await client.post(f"/api/v1/tasks/{tarea['id']}/status", json={
        "status": "completada", "triggered_by": "web"
    }, headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["status"] == "completada"


# ── Eliminar tarea ─────────────────────────────────────────────────────────────

# Verifica que eliminar una tarea devuelva 204 y que ya no sea accesible.
async def test_eliminar_tarea(client: AsyncClient, auth_headers: dict, obra_base: dict) -> None:
    tarea = (await client.post("/api/v1/tasks", json={
        "obra_id": obra_base["id"],
        "title": "Tarea A Eliminar",
    }, headers=auth_headers)).json()

    resp = await client.delete(f"/api/v1/tasks/{tarea['id']}", headers=auth_headers)
    assert resp.status_code == 204

    resp_get = await client.get(f"/api/v1/tasks/{tarea['id']}", headers=auth_headers)
    assert resp_get.status_code == 404
