"""I02 — Tests de integración: CRUD de obras

Verifica crear, listar, obtener, actualizar y eliminar obras
a través de la API REST.
"""
from httpx import AsyncClient


# ── Crear obra ─────────────────────────────────────────────────────────────────

# Verifica que crear una obra con nombre válido devuelva 201 y el id asignado.
async def test_crear_obra(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.post("/api/v1/obras", json={"name": "Edificio Central"}, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Edificio Central"
    assert "id" in data


# Verifica que crear una obra sin nombre devuelva error de validación.
async def test_crear_obra_sin_nombre(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.post("/api/v1/obras", json={}, headers=auth_headers)
    assert resp.status_code == 422


# Verifica que crear una obra con fecha de fin antes que inicio devuelva error.
async def test_crear_obra_fechas_invalidas(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.post("/api/v1/obras", json={
        "name": "Obra Fechas Mal",
        "start_date": "2025-12-01",
        "expected_end_date": "2025-01-01",
    }, headers=auth_headers)
    assert resp.status_code == 422


# ── Listar obras ───────────────────────────────────────────────────────────────

# Verifica que listar obras devuelva una lista (vacía o con datos).
async def test_listar_obras(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.get("/api/v1/obras", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# Verifica que una obra creada aparezca en el listado.
async def test_obra_creada_aparece_en_lista(client: AsyncClient, auth_headers: dict) -> None:
    await client.post("/api/v1/obras", json={"name": "Torre Norte"}, headers=auth_headers)
    resp = await client.get("/api/v1/obras", headers=auth_headers)
    nombres = [o["name"] for o in resp.json()]
    assert "Torre Norte" in nombres


# ── Obtener obra por id ────────────────────────────────────────────────────────

# Verifica que se pueda obtener una obra existente por su id.
async def test_obtener_obra_por_id(client: AsyncClient, auth_headers: dict, obra_base: dict) -> None:
    resp = await client.get(f"/api/v1/obras/{obra_base['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == obra_base["id"]


# Verifica que buscar una obra con id inexistente devuelva 404.
async def test_obtener_obra_inexistente(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.get("/api/v1/obras/99999", headers=auth_headers)
    assert resp.status_code == 404


# ── Actualizar obra ────────────────────────────────────────────────────────────

# Verifica que actualizar el nombre de una obra se refleje en la respuesta.
async def test_actualizar_nombre_obra(client: AsyncClient, auth_headers: dict, obra_base: dict) -> None:
    resp = await client.patch(
        f"/api/v1/obras/{obra_base['id']}",
        json={"name": "Nombre Actualizado"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Nombre Actualizado"


# ── Eliminar obra ──────────────────────────────────────────────────────────────

# Verifica que eliminar una obra devuelva 204 y que ya no exista.
async def test_eliminar_obra(client: AsyncClient, auth_headers: dict, obra_base: dict) -> None:
    resp = await client.delete(f"/api/v1/obras/{obra_base['id']}", headers=auth_headers)
    assert resp.status_code == 204

    resp_get = await client.get(f"/api/v1/obras/{obra_base['id']}", headers=auth_headers)
    assert resp_get.status_code == 404
