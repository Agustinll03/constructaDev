"""U04 — Tests unitarios para la máquina de estados de tareas

Verifica el diccionario VALID_TRANSITIONS que controla qué cambios de estado
son permitidos. Una tarea no puede saltar a cualquier estado: debe seguir el
flujo definido (ej: PENDIENTE no puede ir directo a BLOQUEADA).
"""
import pytest

from app.models.task import TaskStatus
from app.services.task_service import VALID_TRANSITIONS


TODOS_LOS_ESTADOS = list(TaskStatus)


# Verifica que el diccionario tenga una entrada para cada estado posible.
# Si se agrega un estado nuevo al modelo y no se actualiza VALID_TRANSITIONS, este test falla.
def test_el_diccionario_cubre_todos_los_estados() -> None:
    for estado in TODOS_LOS_ESTADOS:
        assert estado in VALID_TRANSITIONS, f"{estado} no está en VALID_TRANSITIONS"


# ── Transiciones permitidas ────────────────────────────────────────────────────

@pytest.mark.parametrize("desde,hacia", [
    (TaskStatus.PENDIENTE,   TaskStatus.EN_PROGRESO),   # flujo normal de inicio
    (TaskStatus.PENDIENTE,   TaskStatus.CANCELADA),     # cancelar antes de empezar
    (TaskStatus.EN_PROGRESO, TaskStatus.BLOQUEADA),     # reportar demora
    (TaskStatus.EN_PROGRESO, TaskStatus.COMPLETADA),    # terminar la tarea
    (TaskStatus.EN_PROGRESO, TaskStatus.CANCELADA),     # cancelar en curso
    (TaskStatus.BLOQUEADA,   TaskStatus.EN_PROGRESO),   # desbloquear y retomar
    (TaskStatus.BLOQUEADA,   TaskStatus.CANCELADA),     # cancelar tarea bloqueada
])
# Verifica que cada transición del flujo normal esté permitida.
def test_transicion_permitida(desde: TaskStatus, hacia: TaskStatus) -> None:
    assert hacia in VALID_TRANSITIONS[desde]


# ── Transiciones prohibidas ────────────────────────────────────────────────────

@pytest.mark.parametrize("desde,hacia", [
    (TaskStatus.PENDIENTE,   TaskStatus.BLOQUEADA),     # debe pasar por EN_PROGRESO primero
    (TaskStatus.PENDIENTE,   TaskStatus.COMPLETADA),    # no puede completarse sin empezar
    (TaskStatus.COMPLETADA,  TaskStatus.EN_PROGRESO),   # estado terminal, no tiene vuelta
    (TaskStatus.COMPLETADA,  TaskStatus.PENDIENTE),     # no se puede "descompletar"
    (TaskStatus.CANCELADA,   TaskStatus.PENDIENTE),     # estado terminal, no tiene vuelta
    (TaskStatus.CANCELADA,   TaskStatus.EN_PROGRESO),   # no se puede retomar una cancelada
])
# Verifica que transiciones inválidas no estén permitidas.
# Esto evita que el chatbot o la UI cambien un estado de forma incorrecta.
def test_transicion_prohibida(desde: TaskStatus, hacia: TaskStatus) -> None:
    assert hacia not in VALID_TRANSITIONS[desde]


# ── Estados terminales ─────────────────────────────────────────────────────────

# Verifica que COMPLETADA no tenga ninguna transición saliente.
# Una tarea completada no puede cambiar de estado bajo ninguna circunstancia.
def test_completada_es_estado_terminal() -> None:
    assert VALID_TRANSITIONS[TaskStatus.COMPLETADA] == set()


# Verifica que CANCELADA no tenga ninguna transición saliente.
# Una tarea cancelada tampoco puede cambiar de estado.
def test_cancelada_es_estado_terminal() -> None:
    assert VALID_TRANSITIONS[TaskStatus.CANCELADA] == set()
