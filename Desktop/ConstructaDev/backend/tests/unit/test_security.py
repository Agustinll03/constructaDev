"""U02 — Tests unitarios para app.core.security

Verifica las funciones de seguridad: hasheo de contraseñas con bcrypt
y creación/decodificación de tokens JWT. Sin acceso a base de datos.
"""
from datetime import timedelta

import pytest

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


# ── Hasheo de contraseñas ──────────────────────────────────────────────────────

# Verifica que hash_password devuelva una cadena larga (el hash bcrypt real).
def test_hash_devuelve_string() -> None:
    h = hash_password("micontraseña")
    assert isinstance(h, str)
    assert len(h) > 20


# Verifica que el hash no sea igual al texto original.
# Si alguien obtiene la base de datos, no puede leer la contraseña.
def test_hash_no_es_igual_al_original() -> None:
    texto = "secreto123"
    assert hash_password(texto) != texto


# Verifica que dos hashes del mismo texto sean diferentes entre sí.
# bcrypt usa sal aleatoria, por eso cada llamada produce un hash distinto.
def test_dos_hashes_del_mismo_texto_son_distintos() -> None:
    h1 = hash_password("mismo")
    h2 = hash_password("mismo")
    assert h1 != h2


# Verifica que la contraseña correcta pase la verificación contra su hash.
def test_verificacion_contraseña_correcta() -> None:
    texto = "micontraseña"
    hashed = hash_password(texto)
    assert verify_password(texto, hashed) is True


# Verifica que una contraseña incorrecta no pase la verificación.
# Esto impide el acceso con una contraseña equivocada.
def test_verificacion_contraseña_incorrecta() -> None:
    hashed = hash_password("correcta")
    assert verify_password("incorrecta", hashed) is False


# ── Tokens JWT ─────────────────────────────────────────────────────────────────

# Verifica el ciclo completo: crear un token y luego decodificarlo.
# El campo "sub" debe contener el ID del usuario como string.
def test_crear_y_decodificar_token() -> None:
    token = create_access_token(subject=42)
    payload = decode_access_token(token)
    assert payload["sub"] == "42"


# Verifica que un token con expiración personalizada también se pueda decodificar
# y que contenga el campo "exp" con la fecha de vencimiento.
def test_token_con_expiracion_personalizada() -> None:
    token = create_access_token(subject="usuario@ejemplo.com", expires_delta=timedelta(hours=1))
    payload = decode_access_token(token)
    assert payload["sub"] == "usuario@ejemplo.com"
    assert "exp" in payload


# Verifica que decodificar un token inválido lance una excepción.
# Esto protege las rutas autenticadas de tokens falsos o manipulados.
def test_token_invalido_lanza_excepcion() -> None:
    import jwt as pyjwt
    with pytest.raises(pyjwt.PyJWTError):
        decode_access_token("esto.no.es.un.token")
