"""U01 — Tests unitarios para message_interpreter.interpret()

Función pura: sin base de datos, sin red. Verifica que el intérprete de
mensajes de WhatsApp detecte correctamente palabras de completado, frases
de bloqueo, y devuelva "none" cuando no hay coincidencia.
"""
import pytest

from app.services.message_interpreter import interpret
from app.models.task import TaskStatus


# ── Palabras de completado ─────────────────────────────────────────────────────

@pytest.mark.parametrize("mensaje", [
    "terminado",
    "ya terminado el trabajo",
    "Todo TERMINADO jefe",
    "finalizado",
    "está listo",
    "completado el día de hoy",
])
# Verifica que palabras clave de completado (terminado, finalizado, listo, completado)
# sean detectadas sin importar mayúsculas ni texto alrededor.
def test_detecta_palabras_de_completado(mensaje: str) -> None:
    resultado = interpret(mensaje)
    assert resultado.action == "complete"
    assert resultado.status == TaskStatus.COMPLETADA
    assert resultado.progress == 100
    assert resultado.matched_rule == "completion_keyword"


# Verifica que "terminar" (infinitivo) no se confunda con "terminado".
# La detección es por límite de palabra exacta, no por subcadena.
def test_infinitivo_no_dispara_completado() -> None:
    resultado = interpret("hay que terminar esto")
    assert resultado.action == "none"


# ── Frases de bloqueo / demora ─────────────────────────────────────────────────

@pytest.mark.parametrize("mensaje", [
    "no podemos avanzar",
    "falta material en la obra",
    "está demorado",
    "hay una demora",
    "el trabajo está bloqueado",
])
# Verifica que frases que indican demora o bloqueo marquen la tarea como BLOQUEADA.
def test_detecta_frases_de_bloqueo(mensaje: str) -> None:
    resultado = interpret(mensaje)
    assert resultado.action == "block"
    assert resultado.status == TaskStatus.BLOQUEADA
    assert resultado.progress is None
    assert resultado.matched_rule == "block_keyword"


# ── Mensajes sin coincidencia ──────────────────────────────────────────────────

@pytest.mark.parametrize("mensaje", [
    None,
    "",
    "   ",
    "bien gracias",
    "mañana seguimos",
])
# Verifica que mensajes vacíos, nulos, o sin palabras clave devuelvan acción "none".
# Estos mensajes no deben cambiar el estado de ninguna tarea.
def test_sin_coincidencia_devuelve_none(mensaje: str | None) -> None:
    resultado = interpret(mensaje)
    assert resultado.action == "none"
    assert resultado.status is None
    assert resultado.progress is None
    assert resultado.matched_rule is None


# ── Conversión a diccionario ───────────────────────────────────────────────────

# Verifica que to_dict() devuelva el formato correcto cuando se detecta completado.
# Este formato es el que usa MessageService para llamar a TaskService.
def test_to_dict_cuando_completado() -> None:
    resultado = interpret("terminado")
    d = resultado.to_dict()
    assert d["action"] == "complete"
    assert d["status"] == "completada"
    assert d["progress"] == 100


# Verifica que to_dict() devuelva todos los campos en None cuando no hay coincidencia.
def test_to_dict_cuando_sin_coincidencia() -> None:
    resultado = interpret(None)
    d = resultado.to_dict()
    assert d["action"] == "none"
    assert d["status"] is None
