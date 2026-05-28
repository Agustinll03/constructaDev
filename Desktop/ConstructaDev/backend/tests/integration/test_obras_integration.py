import uuid


BASE_AUTH = "/api/v1/auth"
BASE_OBRAS = "/api/v1/obras"


def _unique_email() -> str:
    return f"obras_{uuid.uuid4().hex[:8]}@integration.test"


async def _register_and_login(client) -> str:
    """Register a fresh user and return its JWT."""
    email = _unique_email()
    await client.post(f"{BASE_AUTH}/register", json={
        "email": email,
        "password": "securepass1",
        "full_name": "Obras User",
    })
    resp = await client.post(f"{BASE_AUTH}/login", json={
        "email": email,
        "password": "securepass1",
    })
    return resp.json()["access_token"]


async def test_list_obras_requires_auth(client):
    resp = await client.get(BASE_OBRAS)
    assert resp.status_code == 403


async def test_list_obras_returns_list(client):
    token = await _register_and_login(client)
    resp = await client.get(BASE_OBRAS, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_create_obra_returns_201(client):
    token = await _register_and_login(client)
    resp = await client.post(
        BASE_OBRAS,
        json={"name": "Obra de integración"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Obra de integración"
    assert "id" in body


async def test_create_obra_appears_in_list(client):
    token = await _register_and_login(client)
    name = f"Obra-{uuid.uuid4().hex[:6]}"
    await client.post(
        BASE_OBRAS,
        json={"name": name},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.get(BASE_OBRAS, headers={"Authorization": f"Bearer {token}"})
    names = [o["name"] for o in resp.json()]
    assert name in names


async def test_get_obra_by_id(client):
    token = await _register_and_login(client)
    create_resp = await client.post(
        BASE_OBRAS,
        json={"name": "Obra detalle"},
        headers={"Authorization": f"Bearer {token}"},
    )
    obra_id = create_resp.json()["id"]
    resp = await client.get(
        f"{BASE_OBRAS}/{obra_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == obra_id


async def test_get_nonexistent_obra_returns_404(client):
    token = await _register_and_login(client)
    resp = await client.get(
        f"{BASE_OBRAS}/999999",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404
