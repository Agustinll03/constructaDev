from datetime import date
from app.services.task_service import _to_json, _format_field_value, VALID_TRANSITIONS
from app.models.task import TaskStatus


# ── _to_json ──────────────────────────────────────────────────────────────────

def test_to_json_date_returns_string():
    assert _to_json(date(2024, 1, 15)) == "2024-01-15"


def test_to_json_int_passthrough():
    assert _to_json(42) == 42


def test_to_json_none_passthrough():
    assert _to_json(None) is None


# ── _format_field_value ───────────────────────────────────────────────────────

def test_format_date_field():
    assert _format_field_value("start_date", "2024-03-20") == "20/03/2024"


def test_format_date_null():
    assert _format_field_value("start_date", None) == "Sin fecha"


def test_format_progress():
    assert _format_field_value("estimated_progress", 75) == "75%"


def test_format_progress_null():
    assert _format_field_value("estimated_progress", None) == "Sin definir"


def test_format_depends_on():
    assert _format_field_value("depends_on_id", 5) == "Tarea #5"


def test_format_unknown_field():
    assert _format_field_value("title", "Mi tarea") == "Mi tarea"


# ── VALID_TRANSITIONS ─────────────────────────────────────────────────────────

def test_pendiente_can_start():
    assert TaskStatus.EN_PROGRESO in VALID_TRANSITIONS[TaskStatus.PENDIENTE]


def test_pendiente_cannot_complete_directly():
    assert TaskStatus.COMPLETADA not in VALID_TRANSITIONS[TaskStatus.PENDIENTE]


def test_en_progreso_can_complete():
    assert TaskStatus.COMPLETADA in VALID_TRANSITIONS[TaskStatus.EN_PROGRESO]


def test_completada_has_no_transitions():
    assert len(VALID_TRANSITIONS[TaskStatus.COMPLETADA]) == 0


def test_cancelada_has_no_transitions():
    assert len(VALID_TRANSITIONS[TaskStatus.CANCELADA]) == 0
