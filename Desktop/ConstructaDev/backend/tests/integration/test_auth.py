"""I01 — Tests de integración: autenticación

Verifica el endpoint POST /auth/login y que las rutas protegidas
rechacen requests sin token o con tokens inválidos.
"""
import pytest
from httpx import AsyncClient

from tests.integration.conftest import USER_EMAIL, USER_NAME, USER_PASSWORD


# ── Registro ───────────────────────────────────────────────────────────────────

# Verifica que el registro crea el usuario y devuelve sus datos correctamente.
async def test_registro_exitoso(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/auth/register", json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD,
        "full_name": USER_NAME,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == USER_EMAIL
    assert data["full_name"] == USER_NAME
    assert "hashed_password" not in data  # no se expone nunca


# Verifica que no se pueda registrar el mismo email dos veces.
async def test_registro_email_duplicado(client: AsyncClient, usuario_registrado: dict) -> None:
    resp = await client.post("/api/v1/auth/register", json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD,
        "full_name": "Otro Nombre",
    })
    assert resp.status_code in (400, 409)


# ── Login ──────────────────────────────────────────────────────────────────────

# Verifica que el login con credenciales correctas devuelva un JWT válido.
async def test_login_exitoso(client: AsyncClient, usuario_registrado: dict) -> None:
    resp = await client.post("/api/v1/auth/login", json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 20  # es un JWT real


# Verifica que un email que no existe devuelva 401, no 500.
async def test_login_email_inexistente(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/auth/login", json={
        "email": "noexiste@constructa.com",
        "password": USER_PASSWORD,
    })
    assert resp.status_code == 401


# Verifica que una contraseña incorrecta devuelva 401.
async def test_login_contraseña_incorrecta(client: AsyncClient, usuario_registrado: dict) -> None:
    resp = await client.post("/api/v1/auth/login", json={
        "email": USER_EMAIL,
        "password": "contraseña_mal",
    })
    assert resp.status_code == 401


# ── Rutas protegidas ───────────────────────────────────────────────────────────

# Verifica que una ruta protegida rechace requests sin ningún token.
async def test_ruta_protegida_sin_token(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/obras")
    assert resp.status_code == 403


# Verifica que un token inventado (no firmado por el sistema) devuelva 401.
# HTTPBearer acepta el formato "Bearer <token>", pero decode_access_token falla
# y get_current_user lanza 401 (no 403, que es para "sin token").
async def test_ruta_protegida_token_invalido(client: AsyncClient) -> None:
    resp = await client.get(
        "/api/v1/obras",
        headers={"Authorization": "Bearer esto.no.es.un.jwt"},
    )
    assert resp.status_code == 401


# Verifica que con un token válido se pueda acceder a la ruta protegida.
async def test_ruta_protegida_con_token_valido(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.get("/api/v1/obras", headers=auth_headers)
    assert resp.status_code == 200
