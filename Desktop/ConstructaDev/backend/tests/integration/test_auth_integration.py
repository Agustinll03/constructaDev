import uuid


BASE = "/api/v1/auth"


def _unique_email() -> str:
    return f"test_{uuid.uuid4().hex[:8]}@integration.test"


async def test_register_returns_user(client):
    email = _unique_email()
    resp = await client.post(f"{BASE}/register", json={
        "email": email,
        "password": "securepass1",
        "full_name": "Integration User",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == email
    assert body["role"] == "collaborator"
    assert "hashed_password" not in body


async def test_register_duplicate_email_returns_409(client):
    email = _unique_email()
    payload = {"email": email, "password": "securepass1", "full_name": "Dup User"}
    await client.post(f"{BASE}/register", json=payload)
    resp = await client.post(f"{BASE}/register", json=payload)
    assert resp.status_code == 409


async def test_login_returns_token(client):
    email = _unique_email()
    await client.post(f"{BASE}/register", json={
        "email": email,
        "password": "securepass1",
        "full_name": "Login User",
    })
    resp = await client.post(f"{BASE}/login", json={"email": email, "password": "securepass1"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_login_wrong_password_returns_401(client):
    email = _unique_email()
    await client.post(f"{BASE}/register", json={
        "email": email,
        "password": "securepass1",
        "full_name": "Bad Login User",
    })
    resp = await client.post(f"{BASE}/login", json={"email": email, "password": "wrongpass"})
    assert resp.status_code == 401


async def test_login_unknown_email_returns_401(client):
    resp = await client.post(f"{BASE}/login", json={
        "email": "nobody@nowhere.test",
        "password": "doesntmatter",
    })
    assert resp.status_code == 401
