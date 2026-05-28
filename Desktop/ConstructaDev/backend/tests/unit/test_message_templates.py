"""Unit tests for WhatsApp message template helpers (pure string functions)."""
from datetime import date

from app.services.message_templates import (
    _n,
    _status_line,
    fmt_date,
    fmt_date_full,
    build_no_tasks_message,
    build_obra_list_message,
)


# ── _status_line ──────────────────────────────────────────────────────────────

def test_status_line_known_status():
    line = _status_line("en_progreso")
    assert "🟡" in line
    assert "En progreso" in line


def test_status_line_completada():
    line = _status_line("completada")
    assert "🟢" in line
    assert "Completada" in line


def test_status_line_unknown_returns_fallback_emoji():
    line = _status_line("desconocido")
    assert "⚪" in line
    assert "desconocido" in line


# ── _n ────────────────────────────────────────────────────────────────────────

def test_n_returns_keycap_for_1():
    assert _n(1) == "1️⃣"


def test_n_returns_keycap_for_5():
    assert _n(5) == "5️⃣"


def test_n_fallback_for_out_of_range():
    result = _n(99)
    assert "99" in result


# ── fmt_date ──────────────────────────────────────────────────────────────────

def test_fmt_date_none_returns_sin_fecha():
    assert fmt_date(None) == "sin fecha"


def test_fmt_date_iso_string():
    assert fmt_date("2024-03-15") == "15/03"


def test_fmt_date_date_object():
    assert fmt_date(date(2024, 3, 15)) == "15/03"


def test_fmt_date_non_iso_passthrough():
    assert fmt_date("15/03/2024") == "15/03/2024"


# ── fmt_date_full ─────────────────────────────────────────────────────────────

def test_fmt_date_full_none_returns_sin_fecha():
    assert fmt_date_full(None) == "sin fecha"


def test_fmt_date_full_iso_string():
    assert fmt_date_full("2024-03-15") == "15/03/2024"


def test_fmt_date_full_date_object():
    assert fmt_date_full(date(2024, 3, 15)) == "15/03/2024"


# ── build_no_tasks_message ────────────────────────────────────────────────────

def test_build_no_tasks_message_contains_name():
    msg = build_no_tasks_message("Carlos")
    assert "Carlos" in msg


# ── build_obra_list_message ───────────────────────────────────────────────────

def test_build_obra_list_message_contains_obra_names():
    obras = [
        {"obra_name": "Torre Norte", "task_count": 3, "urgent_count": 0},
        {"obra_name": "Complejo Sur", "task_count": 1, "urgent_count": 1},
    ]
    msg = build_obra_list_message("Ana", obras)
    assert "Torre Norte" in msg
    assert "Complejo Sur" in msg
    assert "Ana" in msg


def test_build_obra_list_message_is_numbered():
    obras = [
        {"obra_name": "Obra A", "task_count": 0, "urgent_count": 0},
        {"obra_name": "Obra B", "task_count": 0, "urgent_count": 0},
    ]
    msg = build_obra_list_message("Test", obras)
    assert "1" in msg
    assert "2" in msg
