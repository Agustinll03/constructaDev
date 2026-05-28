import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
import jwt


def test_hash_password_returns_bcrypt_hash():
    h = hash_password("secreto123")
    assert h.startswith("$2b$")
    assert len(h) == 60


def test_verify_password_correct():
    h = hash_password("secreto123")
    assert verify_password("secreto123", h) is True


def test_verify_password_wrong():
    h = hash_password("secreto123")
    assert verify_password("incorrecto", h) is False


def test_hash_is_unique_each_call():
    h1 = hash_password("mismo")
    h2 = hash_password("mismo")
    assert h1 != h2


def test_create_and_decode_token():
    token = create_access_token(subject=42)
    payload = decode_access_token(token)
    assert payload["sub"] == "42"


def test_decode_invalid_token_raises():
    with pytest.raises(jwt.PyJWTError):
        decode_access_token("token.invalido.xxx")
