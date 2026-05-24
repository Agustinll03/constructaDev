"""I04 — Tests de integración: alertas

Verifica listar alertas y marcarlas como leídas.
Las alertas se crean cambiando tareas a estado BLOQUEADA, que dispara
la creación de una alerta de tipo task_blocked.
"""
from httpx import AsyncClient


async def _crear_tarea(client: AsyncClient, headers: dict, obra_id: int, title: str = "Tarea") -> dict:
    resp = await client.post("/api/v1/tasks", json={
        "obra_id": obra_id,
        "title": title,
    }, headers=headers)
    assert resp.status_code == 201
    return resp.json()


async def _avanzar_a_en_progreso(client: AsyncClient, headers: dict, task_id: int) -> None:
    r = await client.post(f"/api/v1/tasks/{task_id}/status", json={
        "status": "en_progreso", "triggered_by": "web"
    }, headers=headers)
    assert r.status_code == 200


# ── Listar alertas ─────────────────────────────────────────────────────────────

# Verifica que el endpoint de alertas devuelva una lista (puede estar vacía).
async def test_listar_alertas_vacio(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.get("/api/v1/alerts", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# Verifica que bloquear una tarea genere una alerta de tipo task_blocked.
async def test_bloquear_tarea_genera_alerta(
    client: AsyncClient, auth_headers: dict, obra_base: dict
) -> None:
    tarea = await _crear_tarea(client, auth_headers, obra_base["id"], "Tarea Bloqueada")
    await _avanzar_a_en_progreso(client, auth_headers, tarea["id"])

    await client.post(f"/api/v1/tasks/{tarea['id']}/status", json={
        "status": "bloqueada", "triggered_by": "web"
    }, headers=auth_headers)

    resp = await client.get("/api/v1/alerts", headers=auth_headers)
    assert resp.status_code == 200
    tipos = [a["type"] for a in resp.json()]
    assert "task_blocked" in tipos


# Verifica que el filtro unread_only devuelva solo alertas no leídas.
async def test_filtro_unread_only(
    client: AsyncClient, auth_headers: dict, obra_base: dict
) -> None:
    tarea = await _crear_tarea(client, auth_headers, obra_base["id"], "Tarea Para Filtro")
    await _avanzar_a_en_progreso(client, auth_headers, tarea["id"])
    await client.post(f"/api/v1/tasks/{tarea['id']}/status", json={
        "status": "bloqueada", "triggered_by": "web"
    }, headers=auth_headers)

    resp = await client.get("/api/v1/alerts?unread_only=true", headers=auth_headers)
    assert resp.status_code == 200
    alertas = resp.json()
    assert all(not a["is_read"] for a in alertas)


# ── Marcar como leída ──────────────────────────────────────────────────────────

# Verifica que marcar una alerta como leída actualice su estado correctamente.
async def test_marcar_alerta_como_leida(
    client: AsyncClient, auth_headers: dict, obra_base: dict
) -> None:
    tarea = await _crear_tarea(client, auth_headers, obra_base["id"], "Tarea Para Leer")
    await _avanzar_a_en_progreso(client, auth_headers, tarea["id"])
    await client.post(f"/api/v1/tasks/{tarea['id']}/status", json={
        "status": "bloqueada", "triggered_by": "web"
    }, headers=auth_headers)

    alertas = (await client.get("/api/v1/alerts", headers=auth_headers)).json()
    alerta_id = alertas[0]["id"]

    resp = await client.patch(f"/api/v1/alerts/{alerta_id}/read", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True


# Verifica que marcar como leída una alerta inexistente devuelva 404.
async def test_marcar_alerta_inexistente(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.patch("/api/v1/alerts/99999/read", headers=auth_headers)
    assert resp.status_code == 404
