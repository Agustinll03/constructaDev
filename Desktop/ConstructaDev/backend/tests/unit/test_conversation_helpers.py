"""U03 — Tests unitarios para los helpers del ConversationService

Verifica las funciones puras que el chatbot de WhatsApp usa para interpretar
los mensajes del responsable: detectar cancelaciones, navegación al menú,
selección de opción numérica, y parseo de fechas.
"""
from datetime import date

import pytest

from app.services.conversation_service import (
    _is_back,
    _is_cancel,
    _is_menu,
    _parse_date,
    _parse_option,
)


# ── _is_cancel ─────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("mensaje", ["x", "X", "cancelar", "CANCELAR", "salir"])
# Verifica que los mensajes que cancelan el flujo del chatbot sean reconocidos.
# El responsable puede escribir "x", "cancelar" o "salir" para interrumpir.
def test_is_cancel_reconoce_cancelacion(mensaje: str) -> None:
    assert _is_cancel(mensaje) is True


@pytest.mark.parametrize("mensaje", [None, "", "0", "menu", "hola"])
# Verifica que mensajes que NO son cancelaciones no sean mal interpretados.
def test_is_cancel_ignora_otros_mensajes(mensaje: str | None) -> None:
    assert _is_cancel(mensaje) is False


# ── _is_back ───────────────────────────────────────────────────────────────────

# Verifica que "0" sea reconocido como el comando para volver al menú anterior.
def test_is_back_reconoce_cero() -> None:
    assert _is_back("0") is True


@pytest.mark.parametrize("mensaje", [None, "", "1", "x", "atrás"])
# Verifica que cualquier cosa que no sea "0" no se interprete como "volver".
def test_is_back_ignora_otros_mensajes(mensaje: str | None) -> None:
    assert _is_back(mensaje) is False


# ── _is_menu ───────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("mensaje", ["menu", "MENU", "menú", "inicio", "hola", "start"])
# Verifica que las palabras que reinician el chatbot al menú principal sean detectadas.
# El responsable puede escribir "hola" o "menu" en cualquier momento para reiniciar.
def test_is_menu_reconoce_palabras_de_inicio(mensaje: str) -> None:
    assert _is_menu(mensaje) is True


@pytest.mark.parametrize("mensaje", [None, "", "0", "x", "tareas"])
# Verifica que mensajes normales no activen el reinicio al menú.
def test_is_menu_ignora_otros_mensajes(mensaje: str | None) -> None:
    assert _is_menu(mensaje) is False


# ── _parse_option ──────────────────────────────────────────────────────────────

# Verifica que un número válido dentro del rango sea devuelto como entero.
def test_parse_option_numero_valido() -> None:
    assert _parse_option("2", max_val=4) == 2


# Verifica que el número máximo permitido sea aceptado (límite inclusive).
def test_parse_option_en_el_limite() -> None:
    assert _parse_option("4", max_val=4) == 4


# Verifica que un número mayor al máximo devuelva None (opción inexistente en el menú).
def test_parse_option_supera_el_maximo() -> None:
    assert _parse_option("5", max_val=4) is None


# Verifica que "0" devuelva None porque las opciones del menú empiezan en 1.
def test_parse_option_cero_no_es_valido() -> None:
    assert _parse_option("0", max_val=4) is None


# Verifica que texto no numérico devuelva None.
def test_parse_option_texto_devuelve_none() -> None:
    assert _parse_option("abc", max_val=4) is None


# Verifica que None como entrada devuelva None sin lanzar excepción.
def test_parse_option_entrada_nula() -> None:
    assert _parse_option(None, max_val=4) is None


# ── _parse_date ────────────────────────────────────────────────────────────────

# Verifica el formato completo DD/MM/AAAA, que es el que el chatbot le pide al responsable.
def test_parse_date_formato_completo() -> None:
    resultado = _parse_date("15/06/2025")
    assert resultado == date(2025, 6, 15)


# Verifica que año corto (2 dígitos) sea interpretado como 2000+.
# Ej: "26" → 2026.
def test_parse_date_año_corto() -> None:
    resultado = _parse_date("10/03/26")
    assert resultado == date(2026, 3, 10)


# Verifica que una fecha imposible (31 de febrero) devuelva None en lugar de lanzar excepción.
def test_parse_date_fecha_imposible() -> None:
    assert _parse_date("31/02/2025") is None


# Verifica que el formato con guiones no sea aceptado.
# El chatbot solo acepta barras como separador.
def test_parse_date_formato_incorrecto() -> None:
    assert _parse_date("2025-06-15") is None


# Verifica que None como entrada devuelva None sin lanzar excepción.
def test_parse_date_entrada_nula() -> None:
    assert _parse_date(None) is None


# Verifica que una cadena vacía devuelva None.
def test_parse_date_cadena_vacia() -> None:
    assert _parse_date("") is None
